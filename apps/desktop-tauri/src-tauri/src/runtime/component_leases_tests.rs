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
        fs::create_dir_all(signals).unwrap();
        let identities: Vec<_> = identities
            .iter()
            .map(|identity| (&identity.component, &identity.id))
            .collect();
        let test_name = format!(
            "{}::lease_process_worker",
            module_path!().split_once("::").unwrap().1
        );
        let child = Command::new(std::env::current_exe().unwrap())
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
            .stderr(Stdio::inherit())
            .spawn()
            .unwrap();
        Self {
            child,
            signals: signals.into(),
        }
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
