use super::*;
#[cfg(target_os = "linux")]
use std::time::{Duration, Instant};

fn node() -> PathBuf {
    which::which("node").expect("these runtime tests require the supported real Node consumer")
}

fn identity() -> ComponentIdentity {
    ComponentIdentity {
        component: "harness".into(),
        id: "sha256:cli-runtime-test".into(),
    }
}

struct Fixture {
    temp: tempfile::TempDir,
    spec: DshLaunchSpec,
}
impl Fixture {
    fn new() -> Self {
        let temp = tempfile::tempdir().unwrap();
        let root = temp.path();
        let cli = root.join("harness-versions/0123456789abcdef/apps/cli/lib/bin.js");
        fs::create_dir_all(cli.parent().unwrap()).unwrap();
        fs::create_dir(root.join("dsh-home")).unwrap();
        fs::create_dir(root.join("bin")).unwrap();
        fs::create_dir_all(root.join("runtime/pnpm-global/bin")).unwrap();
        fs::write(&cli, b"process.exit(0);\n").unwrap();
        let mut spec = DshLaunchSpec {
            node: node().display().to_string(),
            cli: cli.display().to_string(),
            dsh_home: root.join("dsh-home").display().to_string(),
            path_prepend: vec![],
        };
        spec.path_prepend = component_cli_prepend(&spec, root).unwrap();
        Self { temp, spec }
    }
    fn root(&self) -> &Path {
        self.temp.path()
    }
    fn validate(&self, spec: &DshLaunchSpec) -> Result<(), String> {
        validate_component_launch(spec, self.root(), Path::new(&self.spec.cli), None)
    }
}

#[test]
fn current_harness_home_and_managed_path_are_required_before_node_runs() {
    let fixture = Fixture::new();
    fixture.validate(&fixture.spec).unwrap();
    let mut changed = fixture.spec.clone();
    changed.path_prepend = vec![fixture.root().join("attacker-bin").display().to_string()];
    assert!(fixture.validate(&changed).unwrap_err().contains("PATH"));
    changed = fixture.spec.clone();
    changed.cli = fixture.root().join("other.js").display().to_string();
    fs::write(&changed.cli, "process.exit(99)").unwrap();
    assert!(fixture.validate(&changed).unwrap_err().contains("Harness"));
    changed = fixture.spec.clone();
    changed.dsh_home = fixture.root().display().to_string();
    assert!(fixture.validate(&changed).unwrap_err().contains("home"));
    changed = fixture.spec.clone();
    changed.cli = "relative.js".into();
    assert!(fixture.validate(&changed).unwrap_err().contains("absolute"));
    changed = fixture.spec.clone();
    changed.cli = format!(
        "{}/../bin.js",
        Path::new(&changed.cli).parent().unwrap().display()
    );
    assert!(fixture
        .validate(&changed)
        .unwrap_err()
        .contains("traversal"));
    // Old sidecars without PATH metadata safely recompute, rather than trusting new directories.
    changed = fixture.spec.clone();
    changed.path_prepend.clear();
    fixture.validate(&changed).unwrap();
}

#[cfg(unix)]
#[test]
fn aliases_cannot_turn_old_or_escaped_component_node_into_a_host_node() {
    use std::os::unix::fs::symlink;
    let fixture = Fixture::new();
    let mut spec = fixture.spec.clone();
    let managed = fixture.root().join("components/node/old/bin/node");
    fs::create_dir_all(managed.parent().unwrap()).unwrap();
    symlink(node(), &managed).unwrap();
    spec.node = managed.display().to_string();
    spec.path_prepend = component_cli_prepend(&spec, fixture.root()).unwrap();
    assert!(fixture
        .validate(&spec)
        .unwrap_err()
        .contains("Node component"));
    let alias = fixture.root().join("cli-alias");
    symlink(&fixture.spec.cli, &alias).unwrap();
    spec = fixture.spec.clone();
    spec.cli = alias.display().to_string();
    fixture.validate(&spec).unwrap();
}

#[test]
fn unauthenticated_channel_fails_before_reading_or_executing_sidecar() {
    let temp = tempfile::tempdir().unwrap();
    let error = run_component_cli(temp.path(), &[OsString::from("/arbitrary/entry")]).unwrap_err();
    assert!(
        error.contains("component") || error.contains("manifest"),
        "{error}"
    );
}

#[test]
fn legacy_cli_coverage_gate_is_read_only_and_fails_closed() {
    let temp = tempfile::tempdir().unwrap();
    #[cfg(not(unix))]
    assert!(require_cli_cleanup_coverage(temp.path()).is_err());
    #[cfg(unix)]
    {
        assert!(require_cli_cleanup_coverage(temp.path()).is_ok());
        let bin = temp.path().join("bin");
        fs::create_dir(&bin).unwrap();
        let legacy = bin.join("dsh.exe");
        fs::write(&legacy, b"unknown old executable or user command").unwrap();
        assert!(require_cli_cleanup_coverage(temp.path())
            .unwrap_err()
            .contains("legacy CLI"));
        assert_eq!(
            fs::read(&legacy).unwrap(),
            b"unknown old executable or user command"
        );
        fs::remove_file(&legacy).unwrap();
        std::os::unix::fs::symlink(temp.path().join("missing-user-target"), &legacy).unwrap();
        assert!(require_cli_cleanup_coverage(temp.path()).is_err());
        assert!(fs::symlink_metadata(&legacy)
            .unwrap()
            .file_type()
            .is_symlink());
        fs::remove_file(&legacy).unwrap();
        fs::create_dir(&legacy).unwrap();
        assert!(require_cli_cleanup_coverage(temp.path()).is_err());
        fs::remove_dir(&legacy).unwrap();
        fs::remove_dir(&bin).unwrap();
        fs::write(&bin, b"non-directory blocks reliable coverage inspection").unwrap();
        assert!(require_cli_cleanup_coverage(temp.path()).is_err());
        assert_eq!(
            fs::read(&bin).unwrap(),
            b"non-directory blocks reliable coverage inspection"
        );
    }
}

#[test]
fn failed_spawn_releases_all_component_handles() {
    let temp = tempfile::tempdir().unwrap();
    let leases = ComponentLeases::new(temp.path()).unwrap();
    let held = leases.acquire_shared(&[identity()]).unwrap();
    let command = Command::new(temp.path().join("missing-executable"));
    assert!(run_leased_command(command, held, "test CLI").is_err());
    assert!(leases
        .try_acquire_exclusive(&[identity()])
        .unwrap()
        .is_some());
}

#[test]
fn real_cli_preserves_arguments_home_working_directory_and_managed_path() {
    let fixture = Fixture::new();
    fixture.validate(&fixture.spec).unwrap();
    fs::write(&fixture.spec.cli, "require('node:fs').writeFileSync(process.argv[2], JSON.stringify({argv:process.argv.slice(3),home:process.env.DSH_HOME,path:process.env.PATH,cwd:process.cwd()})); process.exit(23);").unwrap();
    let output = fixture.root().join("result.json");
    let args: Vec<OsString> = [
        output.as_os_str(),
        "a b".as_ref(),
        "$(touch should-not-exist)".as_ref(),
        "--node-options=evil".as_ref(),
    ]
    .into_iter()
    .map(OsString::from)
    .collect();
    let leases = ComponentLeases::new(&fixture.root().join("components")).unwrap();
    let shared = leases.acquire_shared(&[identity()]).unwrap();
    let mut command = component_cli_command(&fixture.spec, fixture.root(), &args).unwrap();
    command
        .current_dir(fixture.root())
        .env_remove("NODE_OPTIONS");
    assert_eq!(run_leased_command(command, shared, "test CLI").unwrap(), 23);
    let result: serde_json::Value = serde_json::from_slice(&fs::read(output).unwrap()).unwrap();
    assert_eq!(
        result["argv"],
        serde_json::json!(["a b", "$(touch should-not-exist)", "--node-options=evil"])
    );
    assert_eq!(result["home"], fixture.spec.dsh_home);
    assert_eq!(result["cwd"], fixture.root().display().to_string());
    let parts: Vec<_> = std::env::split_paths(result["path"].as_str().unwrap()).collect();
    assert_eq!(parts[0], fixture.root().join("bin"));
    assert_eq!(parts[1], Path::new(&fixture.spec.node).parent().unwrap());
    #[cfg(not(windows))]
    assert_eq!(parts[2], fixture.root().join("runtime/pnpm-global/bin"));
    #[cfg(windows)]
    assert_eq!(parts[2], fixture.root().join("runtime/pnpm-global"));
    assert!(!fixture.root().join("should-not-exist").exists());
    assert!(leases
        .try_acquire_exclusive(&[identity()])
        .unwrap()
        .is_some());
}

#[cfg(target_os = "linux")]
mod orphan {
    use super::*;
    use std::os::unix::process::CommandExt;
    use std::process::Child;
    const WORKER: &str = "cli_shim::component_tests::orphan::isolated_worker";
    const MODE: &str = "YOURBUDDY_TEST_CLI_WORKER";
    const ROOT: &str = "YOURBUDDY_TEST_CLI_ROOT";
    const SCRIPT: &str = r#"
const fs = require('node:fs'), path = require('node:path');
const root = process.argv[2];
fs.writeFileSync(path.join(root, 'pid'), String(process.pid));
fs.writeFileSync(path.join(root, 'ready'), '');
const timer = setInterval(() => {
  if (fs.existsSync(path.join(root, 'probe'))) fs.writeFileSync(path.join(root, 'alive'), '');
  if (fs.existsSync(path.join(root, 'release'))) { clearInterval(timer); process.exit(0); }
}, 5);
setTimeout(() => process.exit(91), 30000).unref();
"#;
    struct OwnedChild(Child);
    impl Drop for OwnedChild {
        fn drop(&mut self) {
            let _ = self.0.kill();
            let _ = self.0.wait();
        }
    }
    struct OwnedGroup(OwnedChild);
    impl Drop for OwnedGroup {
        fn drop(&mut self) {
            let group = self.0 .0.id() as i32;
            let _ = self.0 .0.kill();
            let _ = self.0 .0.wait();
            loop {
                let mut status = 0;
                let child = unsafe { libc::waitpid(-group, &mut status, libc::WNOHANG) };
                if child < 0 {
                    break;
                }
                if child == 0 {
                    // Only signal after the kernel confirms a live adopted fixture child.
                    unsafe {
                        libc::kill(-group, libc::SIGKILL);
                        libc::waitpid(-group, &mut status, 0);
                    }
                }
            }
        }
    }
    fn worker(root: &Path, mode: &str) -> Command {
        let mut command = Command::new(std::env::current_exe().unwrap());
        command
            .args(["--exact", WORKER, "--nocapture"])
            .env(MODE, mode)
            .env(ROOT, root)
            .env_remove("NODE_OPTIONS");
        command
    }
    fn signal(root: &Path, name: &str) {
        let deadline = Instant::now() + Duration::from_secs(10);
        while !root.join(name).exists() {
            assert!(Instant::now() < deadline, "missing {name}");
            std::thread::sleep(Duration::from_millis(5));
        }
    }
    fn wait(child: &mut Child) {
        let deadline = Instant::now() + Duration::from_secs(20);
        loop {
            if let Some(status) = child.try_wait().unwrap() {
                assert!(status.success());
                break;
            }
            assert!(Instant::now() < deadline, "CLI fixture timed out");
            std::thread::sleep(Duration::from_millis(5));
        }
    }
    #[test]
    fn isolated_worker() {
        let Ok(mode) = std::env::var(MODE) else {
            return;
        };
        let root = PathBuf::from(std::env::var_os(ROOT).unwrap());
        if mode == "consumer-parent" || mode == "old-parent-only" {
            let spec = read_launch_spec(&root.join(LAUNCH_FILE)).unwrap();
            validate_component_launch(&spec, &root, Path::new(&spec.cli), None).unwrap();
            let leases = ComponentLeases::new(&root.join("components"))
                .unwrap()
                .acquire_shared(&[identity()])
                .unwrap();
            let mut command =
                component_cli_command(&spec, &root, &[root.clone().into_os_string()]).unwrap();
            if mode == "old-parent-only" {
                let _ = command.status().unwrap();
                drop(leases);
            } else {
                assert_eq!(
                    run_leased_command(command, leases, "fixture CLI").unwrap(),
                    0
                );
            }
            return;
        }
        assert!(mode == "controller" || mode == "old-controller");
        assert_eq!(
            unsafe { libc::prctl(libc::PR_SET_CHILD_SUBREAPER, 1, 0, 0, 0) },
            0
        );
        let old = mode == "old-controller";
        let mut command = worker(
            &root,
            if old {
                "old-parent-only"
            } else {
                "consumer-parent"
            },
        );
        command.process_group(0);
        let mut fixture = OwnedGroup(OwnedChild(command.spawn().unwrap()));
        signal(&root, "ready");
        let leases = ComponentLeases::new(&root.join("components")).unwrap();
        assert!(leases
            .try_acquire_exclusive(&[identity()])
            .unwrap()
            .is_none());
        fixture.0 .0.kill().unwrap();
        fixture.0 .0.wait().unwrap();
        let pid: i32 = fs::read_to_string(root.join("pid"))
            .unwrap()
            .parse()
            .unwrap();
        let mut status = 0;
        assert_eq!(unsafe { libc::waitpid(pid, &mut status, libc::WNOHANG) }, 0);
        fs::write(root.join("probe"), []).unwrap();
        signal(&root, "alive");
        assert_eq!(
            leases
                .try_acquire_exclusive(&[identity()])
                .unwrap()
                .is_some(),
            old,
            "actual CLI must retain leases after native helper SIGKILL"
        );
        fs::write(root.join("release"), []).unwrap();
        let deadline = Instant::now() + Duration::from_secs(10);
        loop {
            let result = unsafe { libc::waitpid(pid, &mut status, libc::WNOHANG) };
            if result == pid {
                assert!(libc::WIFEXITED(status));
                assert_eq!(libc::WEXITSTATUS(status), 0);
                break;
            }
            assert_eq!(result, 0);
            assert!(Instant::now() < deadline);
            std::thread::sleep(Duration::from_millis(5));
        }
        assert!(leases
            .try_acquire_exclusive(&[identity()])
            .unwrap()
            .is_some());
    }
    #[test]
    fn actual_cli_stays_protected_after_helper_sigkill_and_old_parent_only_leaks() {
        for mode in ["controller", "old-controller"] {
            let fixture = Fixture::new();
            fs::write(&fixture.spec.cli, SCRIPT).unwrap();
            fs::write(
                fixture.root().join(LAUNCH_FILE),
                serde_json::to_vec(&fixture.spec).unwrap(),
            )
            .unwrap();
            let mut child = OwnedChild(worker(fixture.root(), mode).spawn().unwrap());
            wait(&mut child.0);
        }
    }
}
