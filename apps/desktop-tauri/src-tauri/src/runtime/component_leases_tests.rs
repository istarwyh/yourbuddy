use std::io;
use std::process::{Child, Command, ExitStatus, Stdio};
use std::thread;
use std::time::{Duration, Instant};

use super::*;

const CHILD_MODE: &str = "YOURBUDDY_LEASE_TEST_MODE";
const WAIT_LIMIT: Duration = Duration::from_secs(45);

fn identity(component: &str, id: &str) -> ComponentIdentity {
    ComponentIdentity {
        component: component.into(),
        id: id.into(),
    }
}

fn sample() -> ComponentIdentity {
    identity("harness", "sha256:release-a")
}

struct LeaseChild {
    child: Child,
    signals: PathBuf,
}

impl LeaseChild {
    fn spawn(root: &Path, signals: &Path, mode: &str, identities: &[ComponentIdentity]) -> Self {
        Self {
            child: Self::command(root, signals, mode, identities)
                .spawn()
                .unwrap(),
            signals: signals.into(),
        }
    }

    fn command(
        root: &Path,
        signals: &Path,
        mode: &str,
        identities: &[ComponentIdentity],
    ) -> Command {
        fs::create_dir_all(signals).unwrap();
        let identities: Vec<_> = identities
            .iter()
            .map(|identity| (&identity.component, &identity.id))
            .collect();
        let test_name = format!(
            "{}::lease_process_worker",
            module_path!().split_once("::").unwrap().1
        );
        let mut command = Command::new(std::env::current_exe().unwrap());
        command
            .args(["--exact", &test_name, "--nocapture"])
            .env(CHILD_MODE, mode)
            .env("YOURBUDDY_LEASE_TEST_ROOT", root)
            .env("YOURBUDDY_LEASE_TEST_SIGNALS", signals)
            .env(
                "YOURBUDDY_LEASE_TEST_IDENTITIES",
                serde_json::to_string(&identities).unwrap(),
            )
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::inherit());
        command
    }

    fn wait_for(&mut self, signal: &str) {
        let deadline = Instant::now() + WAIT_LIMIT;
        while !self.signals.join(signal).exists() {
            assert!(
                self.child.try_wait().unwrap().is_none(),
                "lease child exited before {signal}"
            );
            assert!(
                Instant::now() < deadline,
                "lease child did not reach {signal}"
            );
            thread::sleep(Duration::from_millis(5));
        }
    }

    fn signal(&self, signal: &str) {
        fs::write(self.signals.join(signal), []).unwrap();
    }

    fn finish(&mut self) -> ExitStatus {
        let deadline = Instant::now() + WAIT_LIMIT;
        loop {
            if let Some(status) = self.child.try_wait().unwrap() {
                return status;
            }
            assert!(Instant::now() < deadline, "lease child did not exit");
            thread::sleep(Duration::from_millis(5));
        }
    }

    fn release(&mut self) {
        self.signal("release");
        assert!(self.finish().success());
    }
}

impl Drop for LeaseChild {
    fn drop(&mut self) {
        // Assertion unwinding must not leave a holder process or inherited lease alive.
        if self.child.try_wait().ok().flatten().is_none() {
            let _ = self.child.kill();
        }
        let _ = self.child.wait();
    }
}

fn wait_for_signal(signals: &Path, name: &str) {
    let deadline = Instant::now() + WAIT_LIMIT;
    while !signals.join(name).exists() {
        assert!(Instant::now() < deadline, "parent did not signal {name}");
        thread::sleep(Duration::from_millis(5));
    }
}

#[test]
fn lease_process_worker() {
    let Some(mode) = std::env::var_os(CHILD_MODE) else {
        return;
    };
    let root = PathBuf::from(std::env::var_os("YOURBUDDY_LEASE_TEST_ROOT").unwrap());
    let signals = PathBuf::from(std::env::var_os("YOURBUDDY_LEASE_TEST_SIGNALS").unwrap());
    let identities: Vec<(String, String)> =
        serde_json::from_str(&std::env::var("YOURBUDDY_LEASE_TEST_IDENTITIES").unwrap()).unwrap();
    let identities: Vec<_> = identities
        .into_iter()
        .map(|(component, id)| ComponentIdentity { component, id })
        .collect();
    let leases = ComponentLeases::new(&root).unwrap();
    fs::write(signals.join("started"), []).unwrap();
    match mode.to_str().unwrap() {
        "shared" => {
            let _lease = leases.acquire_shared(&identities).unwrap();
            fs::write(signals.join("acquired"), []).unwrap();
            wait_for_signal(&signals, "release");
        }
        "exclusive" => {
            let _lease = leases.try_acquire_exclusive(&identities).unwrap().unwrap();
            fs::write(signals.join("acquired"), []).unwrap();
            wait_for_signal(&signals, "release");
        }
        "probe-exclusive" => {
            let lease = leases.try_acquire_exclusive(&identities).unwrap();
            let result = if lease.is_some() { "available" } else { "busy" };
            fs::write(signals.join(result), []).unwrap();
        }
        "cycles" => {
            wait_for_signal(&signals, "start");
            for _ in 0..32 {
                let deadline = Instant::now() + WAIT_LIMIT;
                loop {
                    if let Some(lease) = leases.try_acquire_exclusive(&identities).unwrap() {
                        drop(lease);
                        break;
                    }
                    assert!(Instant::now() < deadline, "exclusive lease cycle stalled");
                    thread::yield_now();
                }
                drop(leases.acquire_shared(&identities).unwrap());
            }
            fs::write(signals.join("finished"), []).unwrap();
        }
        #[cfg(unix)]
        "node-launcher" | "native-relay" | "dup-exhaustion" | "closed-stdio" => {
            inheritance::run_worker(mode.to_str().unwrap(), &root, &signals, &identities);
        }
        #[cfg(target_os = "linux")]
        "orphan-controller" | "orphan-parent-only" | "orphan-relay-controller" => {
            inheritance::run_orphan_controller(
                mode.to_str().unwrap(),
                &root,
                &signals,
                &identities,
            );
        }
        other => panic!("unknown lease worker mode: {other}"),
    }
}

fn assert_child_probe(
    root: &Path,
    signals: &Path,
    identities: &[ComponentIdentity],
    available: bool,
) {
    let mut probe = LeaseChild::spawn(root, signals, "probe-exclusive", identities);
    assert!(probe.finish().success());
    assert!(signals
        .join(if available { "available" } else { "busy" })
        .exists());
}

fn wait_for_exclusive(
    leases: &ComponentLeases,
    identities: &[ComponentIdentity],
) -> ComponentLeaseSet {
    // Windows can release process-owned locks after the process wait completes.
    let deadline = Instant::now() + WAIT_LIMIT;
    loop {
        if let Some(lease) = leases.try_acquire_exclusive(identities).unwrap() {
            return lease;
        }
        assert!(
            Instant::now() < deadline,
            "exited holder's lease was not released"
        );
        thread::sleep(Duration::from_millis(5));
    }
}

#[test]
fn storage_aliases_share_one_lock_across_processes_and_case_variants() {
    let temp = tempfile::tempdir().unwrap();
    let root = temp.path().join("cache");
    let leases = ComponentLeases::new(&root).unwrap();
    let aliases = [
        identity("extras", "sha256:AbC"),
        identity("extras", "node:AbC"),
        identity("extras", "AbC"),
        identity("EXTRAS", "abc"),
    ];
    let mut holder = LeaseChild::spawn(&root, &temp.path().join("holder"), "shared", &aliases[..1]);
    holder.wait_for("acquired");
    for alias in &aliases {
        assert!(leases
            .try_acquire_exclusive(std::slice::from_ref(alias))
            .unwrap()
            .is_none());
    }
    assert_child_probe(&root, &temp.path().join("alias-busy"), &aliases[1..], false);
    let shared = leases.acquire_shared(&aliases).unwrap();
    assert_eq!(shared._files.len(), 1);
    holder.release();
    assert!(leases.try_acquire_exclusive(&aliases).unwrap().is_none());
    drop(shared);
    let exclusive = wait_for_exclusive(&leases, &aliases);
    assert_eq!(exclusive._files.len(), 1);
}

#[test]
fn independent_processes_share_and_exclude_until_every_holder_exits() {
    let temp = tempfile::tempdir().unwrap();
    let root = temp.path().join("cache");
    let leases = ComponentLeases::new(&root).unwrap();
    let identities = [sample()];
    let mut first = LeaseChild::spawn(&root, &temp.path().join("first"), "shared", &identities);
    first.wait_for("acquired");
    let mut second = LeaseChild::spawn(&root, &temp.path().join("second"), "shared", &identities);
    second.wait_for("acquired");
    assert_child_probe(&root, &temp.path().join("both-busy"), &identities, false);
    assert!(leases.try_acquire_exclusive(&identities).unwrap().is_none());
    first.release();
    assert!(leases.try_acquire_exclusive(&identities).unwrap().is_none());
    second.release();
    let exclusive = wait_for_exclusive(&leases, &identities);
    assert_child_probe(
        &root,
        &temp.path().join("exclusive-busy"),
        &identities,
        false,
    );
    let name = lease_names(&identities).unwrap().pop_first().unwrap();
    let probe = leases.open(&name).unwrap();
    assert!(matches!(
        probe.try_lock_shared(),
        Err(TryLockError::WouldBlock)
    ));
    drop(exclusive);
    drop(wait_for_exclusive(&leases, &identities));
    assert_child_probe(&root, &temp.path().join("available"), &identities, true);
}

#[test]
fn same_process_handles_do_not_unlock_each_other_or_distinct_identities() {
    let temp = tempfile::tempdir().unwrap();
    let leases = ComponentLeases::new(temp.path()).unwrap();
    let identities = [sample()];
    let first = leases.acquire_shared(&identities).unwrap();
    let second = leases.clone().acquire_shared(&identities).unwrap();
    let other_id = leases
        .try_acquire_exclusive(&[identity("harness", "sha256:release-b")])
        .unwrap()
        .unwrap();
    let other_component = leases
        .try_acquire_exclusive(&[identity("harbor", "sha256:release-a")])
        .unwrap()
        .unwrap();
    drop(first);
    assert!(leases.try_acquire_exclusive(&identities).unwrap().is_none());
    drop(second);
    let exclusive = wait_for_exclusive(&leases, &identities);
    assert!(leases.try_acquire_exclusive(&identities).unwrap().is_none());
    drop((exclusive, other_id, other_component));
    drop(wait_for_exclusive(&leases, &identities));
}

#[test]
fn process_termination_releases_shared_and_exclusive_without_stale_recovery() {
    let temp = tempfile::tempdir().unwrap();
    let root = temp.path().join("cache");
    let leases = ComponentLeases::new(&root).unwrap();
    for mode in ["shared", "exclusive"] {
        let mut holder = LeaseChild::spawn(&root, &temp.path().join(mode), mode, &[sample()]);
        holder.wait_for("acquired");
        assert!(leases.try_acquire_exclusive(&[sample()]).unwrap().is_none());
        holder.child.kill().unwrap();
        assert!(!holder.child.wait().unwrap().success());
        assert!(!holder.signals.join("release").exists());
        drop(wait_for_exclusive(&leases, &[sample()]));
    }
}

#[test]
fn reversed_multi_identity_processes_finish_without_deadlock() {
    let temp = tempfile::tempdir().unwrap();
    let root = temp.path().join("cache");
    let forward = vec![sample(), identity("harbor", "sha256:harbor-a")];
    let mut reversed = forward.clone();
    reversed.reverse();
    assert_eq!(
        lease_names(&forward).unwrap(),
        lease_names(&reversed).unwrap()
    );
    let mut first = LeaseChild::spawn(&root, &temp.path().join("first"), "cycles", &forward);
    let mut second = LeaseChild::spawn(&root, &temp.path().join("second"), "cycles", &reversed);
    first.wait_for("started");
    second.wait_for("started");
    first.signal("start");
    second.signal("start");
    assert!(first.finish().success());
    assert!(second.finish().success());
    assert!(first.signals.join("finished").exists());
    assert!(second.signals.join("finished").exists());
}

fn sorted_identities() -> Vec<ComponentIdentity> {
    let mut identities = vec![sample(), identity("harbor", "sha256:harbor-a")];
    identities.sort_by_key(|identity| lease_names(std::slice::from_ref(identity)).unwrap());
    identities
}

#[test]
fn busy_later_identity_releases_partial_exclusive_set() {
    let temp = tempfile::tempdir().unwrap();
    let root = temp.path().join("cache");
    let leases = ComponentLeases::new(&root).unwrap();
    let identities = sorted_identities();
    let mut holder = LeaseChild::spawn(
        &root,
        &temp.path().join("holder"),
        "shared",
        &identities[1..],
    );
    holder.wait_for("acquired");
    assert!(leases.try_acquire_exclusive(&identities).unwrap().is_none());
    assert_child_probe(
        &root,
        &temp.path().join("first-free"),
        &identities[..1],
        true,
    );
    assert!(leases
        .try_acquire_exclusive(&identities[1..])
        .unwrap()
        .is_none());
    holder.release();
    drop(wait_for_exclusive(&leases, &identities));
}

#[test]
fn later_storage_error_releases_partial_shared_and_exclusive_sets() {
    let temp = tempfile::tempdir().unwrap();
    let root = temp.path().join("cache");
    let leases = ComponentLeases::new(&root).unwrap();
    let identities = sorted_identities();
    let name = lease_names(&identities[1..]).unwrap().pop_first().unwrap();
    fs::create_dir(root.join(LEASE_DIRECTORY).join(name)).unwrap();
    assert!(leases.acquire_shared(&identities).is_err());
    assert_child_probe(
        &root,
        &temp.path().join("shared-error-free"),
        &identities[..1],
        true,
    );
    assert!(leases.try_acquire_exclusive(&identities).is_err());
    assert_child_probe(
        &root,
        &temp.path().join("exclusive-error-free"),
        &identities[..1],
        true,
    );
}

#[test]
fn hashed_filenames_are_bounded_unambiguous_and_never_removed_on_drop() {
    let temp = tempfile::tempdir().unwrap();
    let leases = ComponentLeases::new(temp.path()).unwrap();
    let identities = [sample(), sample(), identity("harbor", "node:v22.14.0")];
    let shared = leases.acquire_shared(&identities).unwrap();
    assert_eq!(shared._files.len(), 2);
    let names = lease_names(&identities).unwrap();
    for name in &names {
        assert_eq!(name.len(), 69);
        assert!(name[..64].bytes().all(|b| b.is_ascii_hexdigit()));
        assert_eq!(&name[64..], ".lock");
    }
    assert_ne!(
        lease_names(&[identity("ab", "c")]).unwrap(),
        lease_names(&[identity("a", "bc")]).unwrap()
    );
    drop(shared);
    for name in &names {
        assert!(temp.path().join(LEASE_DIRECTORY).join(name).is_file());
    }
    assert_eq!(leases.acquire_shared(&[]).unwrap()._files.len(), 0);
    assert!(leases.try_acquire_exclusive(&[]).unwrap().is_some());
    assert_eq!(
        leases
            .acquire_shared(&vec![sample(); 64])
            .unwrap()
            ._files
            .len(),
        1
    );
    assert!(leases.acquire_shared(&vec![sample(); 65]).is_err());
    assert!(leases.try_acquire_exclusive(&vec![sample(); 65]).is_err());
}

#[test]
fn invalid_identifiers_fail_before_creating_lease_files() {
    let temp = tempfile::tempdir().unwrap();
    let leases = ComponentLeases::new(temp.path()).unwrap();
    for invalid in [
        identity("../outside", "id"),
        identity("harness", "../outside"),
        identity("harness", ""),
        identity("harness", "node:"),
        identity("harness", "sha256:.."),
        identity(&"a".repeat(65), "id"),
        identity("harness", &"a".repeat(161)),
    ] {
        assert!(leases.acquire_shared(&[sample(), invalid.clone()]).is_err());
        assert!(leases.try_acquire_exclusive(&[sample(), invalid]).is_err());
    }
    assert_eq!(
        fs::read_dir(temp.path().join(LEASE_DIRECTORY))
            .unwrap()
            .count(),
        0
    );
}

#[test]
fn cache_directory_errors_leave_unrelated_resources_unchanged() {
    let temp = tempfile::tempdir().unwrap();
    let root = temp.path().join("cache");
    fs::write(&root, b"user-data").unwrap();
    assert!(ComponentLeases::new(&root).is_err());
    assert_eq!(fs::read(&root).unwrap(), b"user-data");
    let real = temp.path().join("real");
    fs::create_dir(&real).unwrap();
    fs::write(real.join(LEASE_DIRECTORY), b"settings").unwrap();
    assert!(ComponentLeases::new(&real).is_err());
    assert_eq!(fs::read(real.join(LEASE_DIRECTORY)).unwrap(), b"settings");
}

#[cfg(unix)]
#[test]
fn symlink_hardlink_and_fifo_entries_cannot_redirect_lease_storage() {
    use std::os::unix::fs::{symlink, MetadataExt};

    let temp = tempfile::tempdir().unwrap();
    let outside = temp.path().join("outside");
    fs::create_dir(&outside).unwrap();
    fs::write(outside.join("user-data"), b"preserve").unwrap();
    let alias = temp.path().join("alias");
    symlink(&outside, &alias).unwrap();
    assert!(ComponentLeases::new(&alias).is_err());
    assert!(!outside.join(LEASE_DIRECTORY).exists());

    let root = temp.path().join("cache");
    let leases = ComponentLeases::new(&root).unwrap();
    let directory = root.join(LEASE_DIRECTORY);
    fs::remove_dir(&directory).unwrap();
    symlink(&outside, &directory).unwrap();
    assert!(leases.acquire_shared(&[sample()]).is_err());
    assert!(ComponentLeases::new(&root).is_err());
    fs::remove_file(&directory).unwrap();
    fs::create_dir(&directory).unwrap();
    let name = lease_names(&[sample()]).unwrap().pop_first().unwrap();
    let path = directory.join(name);
    symlink(outside.join("user-data"), &path).unwrap();
    assert!(leases.acquire_shared(&[sample()]).is_err());
    assert!(leases.try_acquire_exclusive(&[sample()]).is_err());
    fs::remove_file(&path).unwrap();
    fs::hard_link(outside.join("user-data"), &path).unwrap();
    assert!(leases.acquire_shared(&[sample()]).is_err());
    fs::remove_file(&path).unwrap();
    let fifo = std::ffi::CString::new(path.as_os_str().as_encoded_bytes()).unwrap();
    assert_eq!(unsafe { libc::mkfifo(fifo.as_ptr(), 0o600) }, 0);
    assert!(leases.acquire_shared(&[sample()]).is_err());
    assert!(leases.try_acquire_exclusive(&[sample()]).is_err());
    assert_eq!(fs::read(outside.join("user-data")).unwrap(), b"preserve");
    assert_eq!(fs::metadata(outside.join("user-data")).unwrap().nlink(), 1);
    assert_eq!(fs::read_dir(&outside).unwrap().count(), 1);
}

#[test]
fn assertion_unwinding_reaps_holder_and_releases_lease() {
    let temp = tempfile::tempdir().unwrap();
    let root = temp.path().join("cache");
    let leases = ComponentLeases::new(&root).unwrap();
    let result = std::panic::catch_unwind(|| {
        let mut holder =
            LeaseChild::spawn(&root, &temp.path().join("holder"), "shared", &[sample()]);
        holder.wait_for("acquired");
        assert!(leases.try_acquire_exclusive(&[sample()]).unwrap().is_none());
        panic!("negative control: fixture cleanup after an assertion failure");
    });
    let panic = result.unwrap_err();
    assert_eq!(
        panic.downcast_ref::<&str>().copied(),
        Some("negative control: fixture cleanup after an assertion failure")
    );
    drop(wait_for_exclusive(&leases, &[sample()]));
}

#[test]
fn missing_cache_after_construction_is_an_error_not_an_unprotected_success() {
    let temp = tempfile::tempdir().unwrap();
    let root = temp.path().join("cache");
    let leases = ComponentLeases::new(&root).unwrap();
    fs::remove_dir(root.join(LEASE_DIRECTORY)).unwrap();
    fs::remove_dir(&root).unwrap();
    assert!(leases.acquire_shared(&[sample()]).is_err());
    assert!(leases.try_acquire_exclusive(&[sample()]).is_err());
    assert_eq!(
        fs::metadata(&root).unwrap_err().kind(),
        io::ErrorKind::NotFound
    );
}

#[cfg(unix)]
mod inheritance {
    use std::os::fd::AsRawFd;

    use super::*;

    const NODE_SCRIPT: &str = r#"
const fs = require('node:fs');
const path = require('node:path');
const [defaultSignals, rawPaths] = process.argv.slice(1);
const signals = process.env.YOURBUDDY_NODE_SIGNAL_DIR || defaultSignals;
const paths = JSON.parse(rawPaths);
const same = (a, b) => a.dev === b.dev && a.ino === b.ino;
const names = fs.readdirSync(process.platform === 'linux' ? '/proc/self/fd' : '/dev/fd');
const descriptors = names.map(Number).filter(fd => fd > 2).flatMap(fd => {
  try { return [{fd, stat: fs.fstatSync(fd)}]; } catch { return []; }
});
const found = paths.map(p => descriptors.filter(d => same(d.stat, fs.statSync(p))).map(d => d.fd));
fs.writeFileSync(path.join(signals, 'node-fds'), JSON.stringify(found));
const childScript = `const fs = require('node:fs');
const paths = JSON.parse(process.argv[1]);
const names = fs.readdirSync(process.platform === 'linux' ? '/proc/self/fd' : '/dev/fd');
const stats = names.map(Number).filter(fd => fd > 2).flatMap(fd => {
  try { return [fs.fstatSync(fd)]; } catch { return []; }
});
process.stdout.write(JSON.stringify(paths.map(p => {
  const expected = fs.statSync(p);
  return stats.filter(s => s.dev === expected.dev && s.ino === expected.ino).length;
})));`;
const grandchild = require('node:child_process').spawnSync(process.execPath,
  ['-e', childScript, rawPaths], {encoding: 'utf8'});
if (grandchild.status !== 0) throw new Error('grandchild descriptor probe failed');
fs.writeFileSync(path.join(signals, 'grandchild-fds'), grandchild.stdout);
fs.writeFileSync(path.join(signals, 'node-pid'), String(process.pid));
fs.writeFileSync(path.join(signals, 'acquired'), '');
const timer = setInterval(() => {
  if (fs.existsSync(path.join(signals, 'probe'))) {
    for (const fds of found) for (const fd of fds) fs.fstatSync(fd);
    fs.writeFileSync(path.join(signals, 'alive'), '');
  }
  if (fs.existsSync(path.join(signals, 'release'))) {
    clearInterval(timer);
    process.exit(0);
  }
}, 5);
setTimeout(() => process.exit(91), 45000).unref();
"#;

    fn node_command(signals: &Path, root: &Path, identities: &[ComponentIdentity]) -> Command {
        fs::create_dir_all(signals).unwrap();
        let paths: Vec<_> = lease_names(identities)
            .unwrap()
            .into_iter()
            .map(|name| root.join(LEASE_DIRECTORY).join(name))
            .collect();
        let mut command = Command::new("node");
        command
            .args(["-e", NODE_SCRIPT])
            .arg(signals)
            .arg(serde_json::to_string(&paths).unwrap())
            .env_remove("NODE_OPTIONS")
            .env_remove("YOURBUDDY_NODE_SIGNAL_DIR")
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::inherit());
        command
    }

    fn assert_node_fds(signals: &Path, expected: usize) {
        let found: Vec<Vec<i32>> =
            serde_json::from_slice(&fs::read(signals.join("node-fds")).unwrap()).unwrap();
        assert!(!found.is_empty());
        assert!(
            found.iter().all(|fds| fds.len() == expected),
            "Node lease fds: {found:?}"
        );
        let grandchild: Vec<usize> =
            serde_json::from_slice(&fs::read(signals.join("grandchild-fds")).unwrap()).unwrap();
        // libuv always attempts CLOEXEC for descriptors 0..15, but higher descriptors
        // are best-effort. A busy test runner can allocate leases above that range.
        if found.iter().flatten().all(|fd| *fd <= 15) {
            assert!(grandchild.iter().all(|count| *count == 0));
        }
    }

    pub(super) fn run_worker(
        mode: &str,
        root: &Path,
        signals: &Path,
        identities: &[ComponentIdentity],
    ) {
        let leases = ComponentLeases::new(root).unwrap();
        let shared = leases.acquire_shared(identities).unwrap();
        match mode {
            "node-launcher" => {
                let node_signals = signals.join("node");
                let mut command = node_command(&node_signals, root, identities);
                if std::env::var_os("YOURBUDDY_TEST_PARENT_ONLY").is_none() {
                    shared.inherit_shared_into(&mut command).unwrap();
                }
                let mut node = LeaseChild {
                    child: command.spawn().unwrap(),
                    signals: node_signals,
                };
                drop(command);
                node.wait_for("acquired");
                fs::write(signals.join("launched"), []).unwrap();
                assert!(node.finish().success());
            }
            "native-relay" => {
                let relay_signals = signals.join("relay");
                let mut command =
                    LeaseChild::command(root, &relay_signals, "node-launcher", identities);
                shared.inherit_shared_into(&mut command).unwrap();
                let mut relay = LeaseChild {
                    child: command.spawn().unwrap(),
                    signals: relay_signals,
                };
                drop(command);
                fs::write(signals.join("relay-pid"), relay.child.id().to_string()).unwrap();
                relay.wait_for("launched");
                fs::write(signals.join("launched"), []).unwrap();
                assert!(relay.finish().success());
            }
            "dup-exhaustion" => duplicate_failure_releases_partial(&shared, signals),
            "closed-stdio" => {
                // Only this isolated worker loses its standard descriptors.
                for fd in 0..=2 {
                    unsafe {
                        libc::close(fd);
                    }
                }
                let duplicates = duplicate_for_child(&shared._files).unwrap();
                assert!(duplicates.iter().all(|file| file.as_raw_fd() > 2));
                drop(duplicates);
                fs::write(signals.join("finished"), []).unwrap();
            }
            _ => unreachable!(),
        }
    }

    fn duplicate_failure_releases_partial(shared: &ComponentLeaseSet, signals: &Path) {
        assert!(shared._files.len() >= 2);
        let mut old = libc::rlimit {
            rlim_cur: 0,
            rlim_max: 0,
        };
        assert_eq!(unsafe { libc::getrlimit(libc::RLIMIT_NOFILE, &mut old) }, 0);
        let limited = libc::rlimit {
            rlim_cur: old.rlim_cur.min(64),
            rlim_max: old.rlim_max,
        };
        assert_eq!(unsafe { libc::setrlimit(libc::RLIMIT_NOFILE, &limited) }, 0);
        let mut fillers = Vec::new();
        loop {
            match File::open("/dev/null") {
                Ok(file) => fillers.push(file),
                Err(error) => {
                    assert_eq!(error.raw_os_error(), Some(libc::EMFILE));
                    break;
                }
            }
        }
        drop(fillers.pop().unwrap());
        let error = duplicate_for_child(&shared._files).unwrap_err();
        assert_eq!(error.raw_os_error(), Some(libc::EMFILE));
        // Exactly one freed descriptor remains available after the first duplicate rolled back.
        let available = File::open("/dev/null").unwrap();
        assert_eq!(
            File::open("/dev/null").unwrap_err().raw_os_error(),
            Some(libc::EMFILE)
        );
        drop((available, fillers));
        assert_eq!(unsafe { libc::setrlimit(libc::RLIMIT_NOFILE, &old) }, 0);
        fs::write(signals.join("finished"), []).unwrap();
    }

    #[test]
    fn node_retains_every_inherited_lease_after_parent_handles_close() {
        let temp = tempfile::tempdir().unwrap();
        let root = temp.path().join("cache");
        let leases = ComponentLeases::new(&root).unwrap();
        let identities = sorted_identities();
        let shared = leases.acquire_shared(&identities).unwrap();
        let mut command = node_command(&temp.path().join("node"), &root, &identities);
        shared.inherit_shared_into(&mut command).unwrap();
        let mut node = LeaseChild {
            child: command.spawn().unwrap(),
            signals: temp.path().join("node"),
        };
        drop(command);
        drop(shared);
        node.wait_for("acquired");
        assert_node_fds(&node.signals, 1);
        for identity in &identities {
            assert!(leases
                .try_acquire_exclusive(std::slice::from_ref(identity))
                .unwrap()
                .is_none());
        }
        node.signal("probe");
        node.wait_for("alive");
        node.release();
        drop(wait_for_exclusive(&leases, &identities));
    }

    #[test]
    fn command_owns_duplicates_until_drop_and_can_spawn_multiple_consumers() {
        let temp = tempfile::tempdir().unwrap();
        let root = temp.path().join("cache");
        let leases = ComponentLeases::new(&root).unwrap();
        let shared = leases.acquire_shared(&[sample()]).unwrap();
        let mut command = node_command(&temp.path().join("first"), &root, &[sample()]);
        shared.inherit_shared_into(&mut command).unwrap();
        drop(shared);
        let mut first = LeaseChild {
            child: command.spawn().unwrap(),
            signals: temp.path().join("first"),
        };
        first.wait_for("acquired");
        let second_signals = temp.path().join("second");
        fs::create_dir(&second_signals).unwrap();
        command.env("YOURBUDDY_NODE_SIGNAL_DIR", &second_signals);
        let mut second = LeaseChild {
            child: command.spawn().unwrap(),
            signals: second_signals,
        };
        second.wait_for("acquired");
        first.release();
        assert!(leases.try_acquire_exclusive(&[sample()]).unwrap().is_none());
        second.release();
        assert!(leases.try_acquire_exclusive(&[sample()]).unwrap().is_none());
        let third_signals = temp.path().join("third");
        fs::create_dir(&third_signals).unwrap();
        command.env("YOURBUDDY_NODE_SIGNAL_DIR", &third_signals);
        let mut third = LeaseChild {
            child: command.spawn().unwrap(),
            signals: third_signals,
        };
        third.wait_for("acquired");
        drop(command);
        assert!(leases.try_acquire_exclusive(&[sample()]).unwrap().is_none());
        third.release();
        drop(wait_for_exclusive(&leases, &[sample()]));
    }

    #[test]
    fn failed_exec_and_rejected_exclusive_inheritance_leave_no_hidden_holder() {
        let temp = tempfile::tempdir().unwrap();
        let leases = ComponentLeases::new(temp.path()).unwrap();
        let shared = leases.acquire_shared(&[sample()]).unwrap();
        let original_flags: Vec<_> = shared
            ._files
            .iter()
            .map(|file| unsafe { libc::fcntl(file.as_raw_fd(), libc::F_GETFD) })
            .collect();
        assert!(original_flags
            .iter()
            .all(|flags| flags & libc::FD_CLOEXEC != 0));
        let mut command = Command::new(temp.path().join("does-not-exist"));
        shared.inherit_shared_into(&mut command).unwrap();
        assert!(command.spawn().is_err());
        for (file, flags) in shared._files.iter().zip(original_flags) {
            assert_eq!(
                unsafe { libc::fcntl(file.as_raw_fd(), libc::F_GETFD) },
                flags
            );
        }
        drop(shared);
        assert!(leases.try_acquire_exclusive(&[sample()]).unwrap().is_none());
        drop(command);
        let exclusive = wait_for_exclusive(&leases, &[sample()]);
        let mut command = Command::new("node");
        assert!(exclusive.inherit_shared_into(&mut command).is_err());
        drop(exclusive);
        drop(wait_for_exclusive(&leases, &[sample()]));
    }

    #[test]
    fn partial_duplicate_failure_and_closed_standard_streams_are_isolated() {
        let temp = tempfile::tempdir().unwrap();
        for mode in ["dup-exhaustion", "closed-stdio"] {
            let mut worker = LeaseChild::spawn(
                &temp.path().join(mode),
                &temp.path().join(format!("{mode}-signals")),
                mode,
                &sorted_identities(),
            );
            assert!(worker.finish().success());
            assert!(worker.signals.join("finished").exists());
        }
    }

    #[cfg(target_os = "linux")]
    struct OrphanFixture {
        launcher: LeaseChild,
        descendants: Vec<libc::pid_t>,
    }

    #[cfg(target_os = "linux")]
    impl Drop for OrphanFixture {
        fn drop(&mut self) {
            let group = self.launcher.child.id() as libc::pid_t;
            let _ = self.launcher.child.kill();
            let _ = self.launcher.child.wait();
            loop {
                let mut status = 0;
                let result = unsafe { libc::waitpid(-group, &mut status, libc::WNOHANG) };
                if result < 0 {
                    break;
                }
                if result == 0 {
                    // waitpid established a live child in this fixture's isolated group.
                    // Kill the group before reaping so failed assertions also clean up
                    // descendants whose PID handoff has not completed yet.
                    unsafe {
                        libc::kill(-group, libc::SIGKILL);
                        libc::waitpid(-group, &mut status, 0);
                    }
                }
            }
        }
    }

    #[cfg(target_os = "linux")]
    pub(super) fn run_orphan_controller(
        mode: &str,
        root: &Path,
        signals: &Path,
        identities: &[ComponentIdentity],
    ) {
        // This dedicated worker owns its reparented descendants, never the shared test process.
        assert_eq!(
            unsafe { libc::prctl(libc::PR_SET_CHILD_SUBREAPER, 1, 0, 0, 0) },
            0
        );
        let relay = mode == "orphan-relay-controller";
        let old_parent_only = mode == "orphan-parent-only";
        let launcher_signals = signals.join("launcher");
        let mut command = LeaseChild::command(
            root,
            &launcher_signals,
            if relay {
                "native-relay"
            } else {
                "node-launcher"
            },
            identities,
        );
        if old_parent_only {
            command.env("YOURBUDDY_TEST_PARENT_ONLY", "1");
        }
        use std::os::unix::process::CommandExt;
        command.process_group(0);
        let launcher = LeaseChild {
            child: command.spawn().unwrap(),
            signals: launcher_signals.clone(),
        };
        let mut fixture = OrphanFixture {
            launcher,
            descendants: Vec::new(),
        };
        fixture.launcher.wait_for("launched");
        let node_signals = if relay {
            launcher_signals.join("relay/node")
        } else {
            launcher_signals.join("node")
        };
        if relay {
            fixture.descendants.push(
                fs::read_to_string(launcher_signals.join("relay-pid"))
                    .unwrap()
                    .parse()
                    .unwrap(),
            );
        }
        let node_pid: libc::pid_t = fs::read_to_string(node_signals.join("node-pid"))
            .unwrap()
            .parse()
            .unwrap();
        fixture.descendants.push(node_pid);
        assert_node_fds(
            &node_signals,
            if relay {
                2
            } else {
                usize::from(!old_parent_only)
            },
        );
        fixture.launcher.child.kill().unwrap();
        assert!(!fixture.launcher.child.wait().unwrap().success());
        if relay {
            let relay_pid = fixture.descendants[0];
            let mut status = 0;
            assert_eq!(
                unsafe { libc::waitpid(relay_pid, &mut status, libc::WNOHANG) },
                0
            );
            assert_eq!(unsafe { libc::kill(relay_pid, libc::SIGKILL) }, 0);
            assert_eq!(
                unsafe { libc::waitpid(relay_pid, &mut status, 0) },
                relay_pid
            );
        }
        let mut status = 0;
        assert_eq!(
            unsafe { libc::waitpid(node_pid, &mut status, libc::WNOHANG) },
            0
        );
        fs::write(node_signals.join("probe"), []).unwrap();
        wait_for_signal(&node_signals, "alive");
        let leases = ComponentLeases::new(root).unwrap();
        if old_parent_only {
            drop(wait_for_exclusive(&leases, identities));
            fs::write(signals.join("leak-reproduced"), []).unwrap();
        } else {
            for identity in identities {
                assert!(leases
                    .try_acquire_exclusive(std::slice::from_ref(identity))
                    .unwrap()
                    .is_none());
            }
        }
        fs::write(node_signals.join("release"), []).unwrap();
        let deadline = Instant::now() + WAIT_LIMIT;
        loop {
            let result = unsafe { libc::waitpid(node_pid, &mut status, libc::WNOHANG) };
            if result == node_pid {
                assert!(libc::WIFEXITED(status));
                assert_eq!(libc::WEXITSTATUS(status), 0);
                break;
            }
            assert_eq!(result, 0);
            assert!(Instant::now() < deadline, "orphan Node did not exit");
            thread::sleep(Duration::from_millis(5));
        }
        drop(wait_for_exclusive(&leases, identities));
        fs::write(signals.join("finished"), []).unwrap();
    }

    #[cfg(target_os = "linux")]
    #[test]
    fn node_and_native_relay_keep_leases_after_launcher_sigkill() {
        let temp = tempfile::tempdir().unwrap();
        for mode in [
            "orphan-controller",
            "orphan-parent-only",
            "orphan-relay-controller",
        ] {
            let mut controller = LeaseChild::spawn(
                &temp.path().join(mode),
                &temp.path().join(format!("{mode}-signals")),
                mode,
                &sorted_identities(),
            );
            assert!(controller.finish().success());
            assert!(controller.signals.join("finished").exists());
            assert_eq!(
                controller.signals.join("leak-reproduced").exists(),
                mode == "orphan-parent-only"
            );
        }
    }
}
