use super::super::component_plan::component_storage_path;
use super::*;

fn fixture() -> (tempfile::TempDir, ComponentService, RuntimePaths) {
    let root = tempfile::tempdir().unwrap();
    let cache = root.path().join("components");
    let manager = Arc::new(super::super::components::service_fixture(&cache));
    let service = ComponentService::new(manager).unwrap();
    let paths = RuntimePaths {
        node_binary: root.path().join("node"),
        pnpm_binary: root.path().join("pnpm"),
        cli_entry: root.path().join("harness/apps/cli/lib/bin.js"),
        harness_root: root.path().join("harness"),
        runtime_root: root.path().join("runtime"),
        dsh_home: root.path().join("dsh-home"),
    };
    prepared(&service, "harness");
    prepared(&service, "harbor");
    let core = paths.harness_root.join("packages/product/pomodoro");
    fs::create_dir_all(&core).unwrap();
    fs::write(
        core.join("package.json"),
        serde_json::to_vec(&serde_json::json!({
            "name": POMODORO_PACKAGE, "version": "0.5.5"
        }))
        .unwrap(),
    )
    .unwrap();
    (root, service, paths)
}

fn prepared(service: &ComponentService, key: &str) -> PathBuf {
    let spec = &service.manager.catalog().components[key];
    let root = service
        .manager
        .cache_root()
        .join(component_storage_path(key, &spec.id).unwrap());
    fs::create_dir_all(&root).unwrap();
    fs::write(root.join(".complete"), format!("{}\n", spec.sha256)).unwrap();
    root
}

#[cfg(unix)]
fn link_profile(paths: &RuntimePaths, root: &Path) {
    let profile = paths.dsh_home.join("profiles/web");
    let link = profile.join("node_modules").join(HARBOR_PACKAGE);
    fs::create_dir_all(link.parent().unwrap()).unwrap();
    fs::write(
        profile.join("package.json"),
        serde_json::to_vec(&serde_json::json!({
            "dependencies": { HARBOR_PACKAGE: format!("link:{}", root.display()) }
        }))
        .unwrap(),
    )
    .unwrap();
    std::os::unix::fs::symlink(root, link).unwrap();
}

#[test]
fn preparation_is_not_runtime_activation_and_unknown_keys_cannot_be_planned() {
    let (_root, service, _paths) = fixture();
    let plan = service.plan("harborPlugin").unwrap();
    assert_eq!(
        plan.components
            .iter()
            .map(|entry| entry.component.as_str())
            .collect::<Vec<_>>(),
        ["harness", "harbor", "harborPlugin"]
    );
    assert!(service.plan("../../user-files").is_err());
    assert!(service.plan("node").is_err());
    assert!(service.plan("pomodoro").is_err());
    prepared(&service, "harborPlugin");
    let view = service.overview().unwrap();
    let row = view
        .components
        .iter()
        .find(|row| row.key == "harborPlugin")
        .unwrap();
    assert_eq!(row.state, "prepared");
    assert!(row.runtime_token.is_none());
    assert!(!row.can_clean);
    assert!(service
        .report("harborPlugin", "invented", RuntimeObservation::Active)
        .is_err());
}

#[cfg(unix)]
#[test]
fn host_generation_and_install_round_reject_stale_mount_observations() {
    let (_root, service, paths) = fixture();
    prepared(&service, "harness");
    service.manager.activate_prepared().unwrap();
    let current = prepared(&service, "harborPlugin");
    link_profile(&paths, &current);
    service.before_host_start(&paths).unwrap();
    service.bind_host(&paths).unwrap();
    let token = service
        .overview()
        .unwrap()
        .components
        .into_iter()
        .find(|row| row.key == "harborPlugin")
        .unwrap()
        .runtime_token
        .unwrap();
    assert!(
        !service
            .report("harborPlugin", &token, RuntimeObservation::Active)
            .unwrap()
            .restart_required
    );
    assert_eq!(
        service
            .overview()
            .unwrap()
            .components
            .into_iter()
            .find(|row| row.key == "harborPlugin")
            .unwrap()
            .state,
        "active"
    );
    let next_host = ComponentService::new(Arc::clone(&service.manager)).unwrap();
    next_host.before_host_start(&paths).unwrap();
    next_host.bind_host(&paths).unwrap();
    assert!(next_host
        .report("harborPlugin", &token, RuntimeObservation::Active)
        .is_err());
    service
        .begin_observation("harborPlugin", true, true)
        .unwrap();
    assert!(service
        .report("harborPlugin", &token, RuntimeObservation::Active)
        .is_err());
    let current = service.state.lock().unwrap().components["harborPlugin"]
        .token
        .clone();
    assert!(service
        .report("harborPlugin", &current, RuntimeObservation::Active)
        .is_err());
    service
        .begin_observation("harborPlugin", false, false)
        .unwrap();
    let current = service.state.lock().unwrap().components["harborPlugin"]
        .token
        .clone();
    assert!(service
        .report("harborPlugin", &current, RuntimeObservation::Active)
        .is_err());
}

#[cfg(unix)]
#[test]
fn managed_snapshots_preserve_raw_links_and_refuse_user_packages() {
    let (root, service, paths) = fixture();
    let absent = read_profile_snapshot(&paths, HARBOR_PACKAGE).unwrap();
    assert!(absent.absent());
    let current = prepared(&service, "harborPlugin");
    link_profile(&paths, &current);
    let snapshot = read_profile_snapshot(&paths, HARBOR_PACKAGE).unwrap();
    assert!(snapshot.points_to(&current));
    snapshot
        .require_application_owned(service.manager.cache_root(), &paths.dsh_home)
        .unwrap();
    let command = managed_install_command(&paths, "/managed/bin", &current, &snapshot).unwrap();
    let args = command
        .get_args()
        .map(|arg| arg.to_string_lossy().into_owned())
        .collect::<Vec<_>>();
    assert_eq!(&args[1..4], ["plugin", "--profile", "web"]);
    assert_eq!(args[4], format!("--rollback-package={HARBOR_PACKAGE}"));
    let expected: serde_json::Value =
        serde_json::from_str(args[5].strip_prefix("--rollback-expected=").unwrap()).unwrap();
    assert_eq!(
        expected,
        serde_json::json!({ "dependency": snapshot.dependency, "link": snapshot.link })
    );
    assert_eq!(&args[6..9], ["add", "--offline", "--ignore-scripts"]);
    let user = root.path().join("user-plugin");
    fs::create_dir(&user).unwrap();
    let link = paths
        .dsh_home
        .join("profiles/web/node_modules")
        .join(HARBOR_PACKAGE);
    fs::remove_file(&link).unwrap();
    std::os::unix::fs::symlink(&user, &link).unwrap();
    let snapshot = read_profile_snapshot(&paths, HARBOR_PACKAGE).unwrap();
    assert!(snapshot
        .require_application_owned(service.manager.cache_root(), &paths.dsh_home)
        .is_err());
    assert_eq!(fs::read_link(link).unwrap(), user);
}

#[test]
fn installer_lock_is_process_owned_and_never_unlinked() {
    let root = tempfile::tempdir().unwrap();
    let path = root.path().join("install.lock");
    let first = install_lock(&path).unwrap();
    assert!(install_lock(&path).is_err());
    drop(first);
    assert!(path.is_file());
    assert!(install_lock(&path).is_ok());
}

#[cfg(unix)]
#[test]
fn installer_lock_cannot_follow_a_symlink() {
    let root = tempfile::tempdir().unwrap();
    let target = root.path().join("user-data");
    fs::write(&target, "untouched").unwrap();
    let path = root.path().join("install.lock");
    std::os::unix::fs::symlink(&target, &path).unwrap();
    assert!(install_lock(&path).is_err());
    assert_eq!(fs::read_to_string(target).unwrap(), "untouched");
}

#[test]
fn ui_counter_overflow_does_not_round_or_damage_local_counters() {
    let (_root, service, _paths) = fixture();
    let metrics = service.metrics.as_ref().unwrap();
    metrics
        .record(
            super::super::component_metrics::MetricEvent::DownloadBytes {
                component: "harness".into(),
                bytes: MAX_SAFE_INTEGER + 1,
                retransferred_bytes: 0,
            },
        )
        .unwrap();
    let overview = service.overview().unwrap();
    assert!(overview.metrics.is_none());
    assert!(overview.metrics_error.unwrap().contains("exact integer"));
    assert_eq!(
        metrics.snapshot().unwrap().components["harness"].network_bytes,
        MAX_SAFE_INTEGER + 1
    );
    assert!(service.plan("harborPlugin").is_ok());
}

#[cfg(unix)]
#[tokio::test]
#[ignore = "requires a built Harness and materialized Harbor; run with the component smoke environment"]
async fn native_install_reaches_real_profile_cli_and_live_host() {
    live_host_install(LiveInstallProfile::Fresh).await;
    live_host_install(LiveInstallProfile::UserDirectory).await;
    live_host_install(LiveInstallProfile::MissingLegacy).await;
}

#[cfg(unix)]
#[derive(Clone, Copy)]
enum LiveInstallProfile {
    Fresh,
    UserDirectory,
    MissingLegacy,
}

#[cfg(unix)]
async fn live_host_install(profile_kind: LiveInstallProfile) {
    let built =
        PathBuf::from(std::env::var_os("YOURBUDDY_BUILT_HARNESS_ROOT").expect("built Harness"));
    let capability =
        PathBuf::from(std::env::var_os("YOURBUDDY_PREPARED_HARBOR").expect("prepared Harbor"));
    let node = PathBuf::from(std::env::var_os("YOURBUDDY_TEST_NODE").expect("Node executable"));
    let (root, service, mut paths) = fixture();
    let service = Arc::new(service);
    paths.node_binary = node.clone();
    paths.pnpm_binary = built.join("node_modules/.bin/pnpm");
    paths.cli_entry = built.join("apps/cli/lib/bin.js");
    paths.harness_root = built.clone();
    prepared(&service, "harness");
    service.manager.activate_prepared().unwrap();
    let package_root = prepared(&service, "harborPlugin");
    fn copy_tree(source: &Path, destination: &Path) {
        fs::create_dir_all(destination).unwrap();
        for entry in fs::read_dir(source).unwrap() {
            let entry = entry.unwrap();
            let target = destination.join(entry.file_name());
            assert!(!entry.file_type().unwrap().is_symlink());
            if entry.file_type().unwrap().is_dir() {
                copy_tree(&entry.path(), &target);
            } else {
                fs::copy(entry.path(), target).unwrap();
            }
        }
    }
    copy_tree(&capability, &package_root);
    fs::create_dir_all(&paths.dsh_home).unwrap();
    let profile = paths.dsh_home.join("profiles/web");
    let user_root = profile.join("node_modules").join(HARBOR_PACKAGE);
    let user_manifest = serde_json::to_vec(&serde_json::json!({
        "name": "user-profile", "private": true,
        "dependencies": { HARBOR_PACKAGE: "0.10.3" },
        "dsh": { "profile": { "bundles": [HARBOR_PACKAGE] } }
    }))
    .unwrap();
    if matches!(profile_kind, LiveInstallProfile::UserDirectory) {
        copy_tree(&capability, &user_root);
        fs::write(profile.join("package.json"), &user_manifest).unwrap();
    }
    if matches!(profile_kind, LiveInstallProfile::MissingLegacy) {
        let old = root
            .path()
            .join("harness-versions/0123456789abcdef/packages/product/harbor-evolution");
        link_profile(&paths, &old);
        let mut manifest: serde_json::Value =
            serde_json::from_slice(&fs::read(profile.join("package.json")).unwrap()).unwrap();
        manifest["dsh"] = serde_json::json!({ "profile": { "bundles": [HARBOR_PACKAGE] } });
        fs::write(
            profile.join("package.json"),
            serde_json::to_vec(&manifest).unwrap(),
        )
        .unwrap();
    }
    // This is the production startup boundary: inspection must not stop spawn.
    service.before_host_start(&paths).unwrap();
    let mut command = Command::new(&node);
    command
        .args(["--expose-internals"])
        .arg(built.join("apps/desktop-tauri/scripts/fixtures/component-live-host.mjs"))
        .arg(&built)
        .arg(&paths.dsh_home)
        .env("DSH_HOME", &paths.dsh_home)
        .stdout(File::create(root.path().join("host.log")).unwrap())
        .stderr(File::create(root.path().join("host-error.log")).unwrap());
    isolate_host_group(&mut command);
    struct Host(std::process::Child);
    impl Drop for Host {
        fn drop(&mut self) {
            if self.0.try_wait().ok().flatten().is_none() {
                kill_process_tree(self.0.id());
                let _ = self.0.kill();
                let _ = self.0.wait();
            }
        }
    }
    let mut host = Host(command.spawn().unwrap());
    drop(command);
    async fn wait_for(path: &Path, host: &mut Host, root: &Path) {
        let deadline = Instant::now() + Duration::from_secs(30);
        while !path.exists() {
            let status = host.0.try_wait().unwrap();
            assert!(
                status.is_none() && Instant::now() < deadline,
                "Host did not produce {}: {status:?}; {}",
                path.display(),
                format!(
                    "{}\n{}",
                    fs::read_to_string(root.join("host-error.log")).unwrap(),
                    fs::read_to_string(root.join("host.log")).unwrap()
                )
            );
            tokio::time::sleep(Duration::from_millis(10)).await;
        }
    }
    wait_for(&paths.dsh_home.join("host-ready"), &mut host, root.path()).await;
    service.bind_host(&paths).unwrap();
    let host_path = format!(
        "{}:{}",
        built.join("node_modules/.bin").display(),
        std::env::var("PATH").unwrap()
    );
    let proxy =
        crate::network_proxy::resolve(&crate::network_proxy::NetworkProxySettings::legacy_direct())
            .unwrap();
    if matches!(profile_kind, LiveInstallProfile::UserDirectory) {
        wait_for(&paths.dsh_home.join("host-mounted"), &mut host, root.path()).await;
        let row = service
            .overview()
            .unwrap()
            .components
            .into_iter()
            .find(|row| row.key == "harborPlugin")
            .unwrap();
        assert!(row.runtime_token.is_none());
        assert_ne!(row.state, "active");
        assert!(service
            .install("harborPlugin", &paths, &host_path, &proxy)
            .await
            .is_err());
        assert!(user_root.is_dir() && !user_root.is_symlink());
        assert_eq!(
            fs::read(profile.join("package.json")).unwrap(),
            user_manifest
        );
        fs::write(paths.dsh_home.join("host-stop"), "").unwrap();
        wait_for(
            &paths.dsh_home.join("host-disposed"),
            &mut host,
            root.path(),
        )
        .await;
        assert!(host.0.wait().unwrap().success());
        return;
    }
    assert!(
        service
            .install("harborPlugin", &paths, &host_path, &proxy)
            .await
            .unwrap()
            .restart_required
    );
    let snapshot = read_profile_snapshot(&paths, HARBOR_PACKAGE).unwrap();
    assert!(snapshot.points_to(&package_root));
    assert_eq!(
        service
            .overview()
            .unwrap()
            .components
            .into_iter()
            .find(|row| row.key == "harborPlugin")
            .unwrap()
            .state,
        "prepared"
    );
    if !matches!(profile_kind, LiveInstallProfile::MissingLegacy) {
        wait_for(&paths.dsh_home.join("host-mounted"), &mut host, root.path()).await;
    }
    if matches!(profile_kind, LiveInstallProfile::MissingLegacy) {
        assert!(!paths.dsh_home.join("host-mounted").exists());
        assert!(service
            .overview()
            .unwrap()
            .components
            .into_iter()
            .find(|row| row.key == "harborPlugin")
            .unwrap()
            .runtime_token
            .is_none());
        fs::write(paths.dsh_home.join("host-stop"), "").unwrap();
        wait_for(
            &paths.dsh_home.join("host-disposed"),
            &mut host,
            root.path(),
        )
        .await;
        assert!(host.0.wait().unwrap().success());
        for marker in ["host-stop", "host-ready", "host-disposed"] {
            fs::remove_file(paths.dsh_home.join(marker)).unwrap();
        }
        let next_host = ComponentService::new(Arc::clone(&service.manager)).unwrap();
        next_host.before_host_start(&paths).unwrap();
        let mut command = Command::new(&node);
        command
            .arg("--expose-internals")
            .arg(built.join("apps/desktop-tauri/scripts/fixtures/component-live-host.mjs"))
            .arg(&built)
            .arg(&paths.dsh_home)
            .env("DSH_HOME", &paths.dsh_home)
            .stdout(
                OpenOptions::new()
                    .append(true)
                    .open(root.path().join("host.log"))
                    .unwrap(),
            )
            .stderr(
                OpenOptions::new()
                    .append(true)
                    .open(root.path().join("host-error.log"))
                    .unwrap(),
            );
        isolate_host_group(&mut command);
        host = Host(command.spawn().unwrap());
        drop(command);
        wait_for(&paths.dsh_home.join("host-ready"), &mut host, root.path()).await;
        next_host.bind_host(&paths).unwrap();
        wait_for(&paths.dsh_home.join("host-mounted"), &mut host, root.path()).await;
        let token = next_host
            .overview()
            .unwrap()
            .components
            .into_iter()
            .find(|row| row.key == "harborPlugin")
            .unwrap()
            .runtime_token
            .unwrap();
        assert!(
            !next_host
                .report("harborPlugin", &token, RuntimeObservation::Active)
                .unwrap()
                .restart_required
        );
        fs::write(paths.dsh_home.join("host-stop"), "").unwrap();
        wait_for(
            &paths.dsh_home.join("host-disposed"),
            &mut host,
            root.path(),
        )
        .await;
        assert!(host.0.wait().unwrap().success());
        return;
    }
    let token = service
        .overview()
        .unwrap()
        .components
        .into_iter()
        .find(|row| row.key == "harborPlugin")
        .unwrap()
        .runtime_token
        .unwrap();
    assert!(
        !service
            .report("harborPlugin", &token, RuntimeObservation::Active)
            .unwrap()
            .restart_required
    );
    assert!(
        service
            .install("harborPlugin", &paths, &host_path, &proxy)
            .await
            .unwrap()
            .restart_required
    );
    assert!(service
        .report("harborPlugin", &token, RuntimeObservation::Active)
        .is_err());
    assert!(read_profile_snapshot(&paths, HARBOR_PACKAGE)
        .unwrap()
        .points_to(&package_root));
    fs::write(paths.dsh_home.join("host-stop"), "").unwrap();
    wait_for(
        &paths.dsh_home.join("host-disposed"),
        &mut host,
        root.path(),
    )
    .await;
    assert!(host.0.wait().unwrap().success());
}

#[cfg(unix)]
#[test]
fn frontend_readiness_and_actual_usage_are_distinct_local_events() {
    let (_root, service, paths) = fixture();
    assert!(service.workbench_ready().is_err());
    let current = prepared(&service, "harborPlugin");
    link_profile(&paths, &current);
    service.before_host_start(&paths).unwrap();
    service.bind_host(&paths).unwrap();
    let token = service
        .overview()
        .unwrap()
        .components
        .into_iter()
        .find(|row| row.key == "harness")
        .unwrap()
        .runtime_token
        .unwrap();
    assert!(service.workbench_ready().unwrap().recorded);
    assert!(!service.workbench_ready().unwrap().recorded);
    assert!(
        service
            .invocation("pomodoro", &token, true)
            .unwrap()
            .recorded
    );
    assert!(
        service
            .invocation("pomodoro", &token, false)
            .unwrap()
            .recorded
    );
    assert!(service.invocation("harbor", &token, true).is_err());
    assert!(service.invocation("pomodoro", "stale", true).is_err());
    service.readiness_failed();
    let counters = service.metrics.as_ref().unwrap().snapshot().unwrap();
    assert_eq!(counters.boot_attempts, 1);
    assert_eq!(counters.workbench_ready_count, 1);
    assert_eq!(counters.readiness_failures, 0);
    assert_eq!(counters.components["harness"].invocations, 2);
    assert_eq!(counters.components["harness"].successful_invocations, 1);
    assert_eq!(counters.components["harness"].installs, 0);
    assert_eq!(
        service
            .overview()
            .unwrap()
            .components
            .into_iter()
            .find(|row| row.key == "harness")
            .unwrap()
            .state,
        "in-use"
    );
    let (_root, failed, paths) = fixture();
    failed.before_host_start(&paths).unwrap();
    failed.bind_host(&paths).unwrap();
    failed.readiness_failed();
    failed.readiness_failed();
    assert!(failed.workbench_ready().is_err());
    assert_eq!(
        failed
            .metrics
            .as_ref()
            .unwrap()
            .snapshot()
            .unwrap()
            .readiness_failures,
        1
    );
}

#[cfg(unix)]
#[test]
fn startup_reference_changes_cannot_create_a_current_identity_token() {
    let (_root, service, paths) = fixture();
    service.before_host_start(&paths).unwrap();
    let current = prepared(&service, "harborPlugin");
    link_profile(&paths, &current);
    service.bind_host(&paths).unwrap();
    let view = service.overview().unwrap();
    assert!(view
        .components
        .into_iter()
        .find(|row| row.key == "harborPlugin")
        .unwrap()
        .runtime_token
        .is_none());
    assert!(!service.state.lock().unwrap().components["harborPlugin"].first_install_allowed);
}

#[cfg(unix)]
#[tokio::test]
async fn cancelling_the_caller_keeps_the_installation_owner_and_lock_until_completion() {
    let (_root, service, mut paths) = fixture();
    let service = Arc::new(service);
    prepared(&service, "harness");
    let package_root = prepared(&service, "harborPlugin");
    fs::create_dir_all(&paths.dsh_home).unwrap();
    fs::create_dir_all(&paths.harness_root).unwrap();
    paths.node_binary =
        which::which("node").expect("Node is required for the subprocess lifecycle test");
    paths.cli_entry = paths.harness_root.join("barrier.mjs");
    fs::write(&paths.cli_entry, r#"
import { mkdirSync, existsSync, writeFileSync, symlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
const home = process.env.DSH_HOME;
const root = process.argv.at(-1).slice('link:'.length);
writeFileSync(join(home, 'started'), '');
const deadline = Date.now() + 10000;
while (!existsSync(join(home, 'release'))) {
  if (Date.now() > deadline) process.exit(1);
  await sleep(10);
}
const profile = join(home, 'profiles/web');
const link = join(profile, 'node_modules/dsh-harbor-evolution');
mkdirSync(dirname(link), { recursive: true });
writeFileSync(join(profile, 'package.json'), JSON.stringify({ dependencies: { 'dsh-harbor-evolution': 'link:' + root } }));
symlinkSync(root, link);
"#).unwrap();
    service.before_host_start(&paths).unwrap();
    service.bind_host(&paths).unwrap();
    let operation = Arc::clone(&service);
    let operation_paths = paths.clone();
    let caller = tokio::spawn(async move {
        let proxy = crate::network_proxy::resolve(
            &crate::network_proxy::NetworkProxySettings::legacy_direct(),
        )
        .unwrap();
        operation
            .install(
                "harborPlugin",
                &operation_paths,
                &std::env::var("PATH").unwrap(),
                &proxy,
            )
            .await
    });
    let deadline = Instant::now() + Duration::from_secs(15);
    while !paths.dsh_home.join("started").exists() {
        assert!(!caller.is_finished() && Instant::now() < deadline);
        tokio::time::sleep(Duration::from_millis(10)).await;
    }
    caller.abort();
    assert!(matches!(caller.await, Err(error) if error.is_cancelled()));
    let lock = service.manager.cache_root().join("capability-install.lock");
    assert!(install_lock(&lock).is_err());
    fs::write(paths.dsh_home.join("release"), "").unwrap();
    while service.state.lock().unwrap().components["harborPlugin"].installing {
        assert!(Instant::now() < deadline);
        tokio::time::sleep(Duration::from_millis(10)).await;
    }
    assert!(read_profile_snapshot(&paths, HARBOR_PACKAGE)
        .unwrap()
        .points_to(&package_root));
    assert!(install_lock(&lock).is_ok());
    assert!(service.state.lock().unwrap().components["harborPlugin"]
        .error
        .is_none());
}

#[test]
fn startup_inspection_keeps_protected_or_unreadable_profile_references_ineligible() {
    let (_root, service, paths) = fixture();
    let package = paths
        .dsh_home
        .join("profiles/web/node_modules")
        .join(HARBOR_PACKAGE);
    fs::create_dir_all(&package).unwrap();
    fs::write(package.join("user-data"), "keep").unwrap();
    assert!(read_profile_snapshot(&paths, HARBOR_PACKAGE).is_err());
    service.before_host_start(&paths).unwrap();
    service.bind_host(&paths).unwrap();
    assert!(service.workbench_ready().unwrap().recorded);
    assert!(!service.state.lock().unwrap().components["harborPlugin"].eligible);
    assert!(!service.state.lock().unwrap().components["harborPlugin"].first_install_allowed);
    assert_eq!(
        fs::read_to_string(package.join("user-data")).unwrap(),
        "keep"
    );
    fs::write(
        paths.dsh_home.join("profiles/web/package.json"),
        "malformed",
    )
    .unwrap();
    service.before_host_start(&paths).unwrap();
    service.bind_host(&paths).unwrap();
    assert!(!service.state.lock().unwrap().components["harborPlugin"].eligible);
}

#[test]
fn default_core_timer_counts_use_only_current_core_identity_without_optional_installation() {
    let (_root, service, paths) = fixture();
    service.before_host_start(&paths).unwrap();
    service.bind_host(&paths).unwrap();
    let view = service.overview().unwrap();
    assert!(view.components.iter().all(|row| row.key != "pomodoro"));
    let core = view
        .components
        .iter()
        .find(|row| row.key == "harness")
        .unwrap();
    assert!(!core.can_install);
    let token = core.runtime_token.as_ref().unwrap();
    assert!(
        service
            .invocation("pomodoro", token, true)
            .unwrap()
            .recorded
    );
    assert!(service
        .report("harness", token, RuntimeObservation::Active)
        .is_err());
    assert_eq!(
        service
            .metrics
            .as_ref()
            .unwrap()
            .snapshot()
            .unwrap()
            .components["harness"]
            .invocations,
        1
    );
    let package = paths
        .dsh_home
        .join("profiles/web/node_modules")
        .join(POMODORO_PACKAGE);
    fs::create_dir_all(&package).unwrap();
    fs::write(package.join("user-owned"), "preserved").unwrap();
    let next = ComponentService::new(Arc::clone(&service.manager)).unwrap();
    next.before_host_start(&paths).unwrap();
    next.bind_host(&paths).unwrap();
    assert!(next
        .overview()
        .unwrap()
        .components
        .iter()
        .find(|row| row.key == "harness")
        .unwrap()
        .runtime_token
        .is_none());
    assert!(next.invocation("pomodoro", token, true).is_err());
    assert_eq!(
        fs::read_to_string(package.join("user-owned")).unwrap(),
        "preserved"
    );
}

#[cfg(unix)]
#[test]
fn download_cache_confirmation_is_single_use_and_checks_legacy_layout_again() {
    let (root, service, _paths) = fixture();
    let first = cache_preview_when_idle(&service);
    assert_eq!(first.total_bytes, 0);
    let second = cache_preview_when_idle(&service);
    assert_ne!(first.token, second.token);
    assert!(service
        .clean_cache(&first.token)
        .unwrap_err()
        .starts_with("CACHE_CLEANUP_STALE"));
    let next_host = ComponentService::new(Arc::clone(&service.manager)).unwrap();
    assert!(next_host
        .clean_cache(&second.token)
        .unwrap_err()
        .starts_with("CACHE_CLEANUP_STALE"));
    let second_token = second.token.clone();
    let done = cache_clean_when_idle(&service, second);
    assert_eq!(done.deleted_files, 0);
    assert!(done.complete);
    assert!(service
        .clean_cache(&second_token)
        .unwrap_err()
        .starts_with("CACHE_CLEANUP_STALE"));

    let preview = cache_preview_when_idle(&service);
    let legacy = root.path().join("bin/dsh.exe");
    fs::create_dir_all(legacy.parent().unwrap()).unwrap();
    fs::write(&legacy, "unknown-user-executable").unwrap();
    assert!(service
        .clean_cache(&preview.token)
        .unwrap_err()
        .starts_with("CACHE_CLEANUP_UNSAFE"));
    assert!(service
        .preview_cache_cleanup()
        .unwrap_err()
        .starts_with("CACHE_CLEANUP_UNSAFE"));
    assert_eq!(
        fs::read_to_string(&legacy).unwrap(),
        "unknown-user-executable"
    );
    fs::remove_file(&legacy).unwrap();
    assert!(service
        .clean_cache(&preview.token)
        .unwrap_err()
        .starts_with("CACHE_CLEANUP_STALE"));
}

#[cfg(unix)]
#[test]
fn download_cache_confirmation_preserves_runtime_and_requires_new_preview_after_busy() {
    let (_root, service, _paths) = fixture();
    let spec = &service.manager.catalog().components["harness"];
    let downloads = service.manager.cache_root().join("downloads");
    fs::create_dir_all(&downloads).unwrap();
    let archive = downloads.join(&spec.archive);
    fs::write(&archive, b"x").unwrap();
    let installed = prepared(&service, "harness");
    let preview = cache_preview_when_idle(&service);
    assert_eq!(preview.total_bytes, 1);
    let lock = service.manager.lock().unwrap();
    assert!(service
        .preview_cache_cleanup()
        .unwrap_err()
        .starts_with("CACHE_CLEANUP_BUSY"));
    drop(lock);
    assert!(service
        .clean_cache(&preview.token)
        .unwrap_err()
        .starts_with("CACHE_CLEANUP_STALE"));
    let preview = cache_preview_when_idle(&service);
    let lock = service.manager.lock().unwrap();
    assert!(service
        .clean_cache(&preview.token)
        .unwrap_err()
        .starts_with("CACHE_CLEANUP_BUSY"));
    drop(lock);
    assert!(archive.exists());
    assert!(service
        .clean_cache(&preview.token)
        .unwrap_err()
        .starts_with("CACHE_CLEANUP_STALE"));
    let preview = cache_preview_when_idle(&service);
    let done = cache_clean_when_idle(&service, preview);
    assert_eq!(done.deleted_bytes, 1);
    assert_eq!(done.deleted_files, 1);
    assert!(done.complete);
    assert!(!archive.exists());
    assert!(installed.join(".complete").exists());
    let result = serde_json::to_value(done).unwrap();
    assert_eq!(
        result["complete"],
        result["failures"].as_array().unwrap().is_empty()
    );
}

#[cfg(unix)]
fn cache_preview_when_idle(service: &ComponentService) -> CacheCleanupPreview {
    let deadline = Instant::now() + Duration::from_secs(2);
    loop {
        match service.preview_cache_cleanup() {
            Ok(preview) => return preview,
            Err(error) if error.starts_with("CACHE_CLEANUP_BUSY") && Instant::now() < deadline => {
                std::thread::sleep(Duration::from_millis(5));
            }
            Err(error) => panic!("cache preview: {error}"),
        }
    }
}

#[cfg(unix)]
fn cache_clean_when_idle(
    service: &ComponentService,
    mut preview: CacheCleanupPreview,
) -> CacheCleanupResult {
    let deadline = Instant::now() + Duration::from_secs(2);
    loop {
        match service.clean_cache(&preview.token) {
            Ok(result) => return result,
            Err(error) if error.starts_with("CACHE_CLEANUP_BUSY") && Instant::now() < deadline => {
                std::thread::sleep(Duration::from_millis(5));
                preview = cache_preview_when_idle(service);
            }
            Err(error) => panic!("cache clean: {error}"),
        }
    }
}

#[cfg(unix)]
#[test]
fn missing_legacy_harbor_can_be_repaired_without_authorizing_external_links_or_old_fibers() {
    let (root, service, paths) = fixture();
    let old = root
        .path()
        .join("harness-versions/0123456789abcdef/packages/product/harbor-evolution");
    link_profile(&paths, &old);
    let snapshot = read_profile_snapshot(&paths, HARBOR_PACKAGE).unwrap();
    snapshot
        .require_application_owned(service.manager.cache_root(), &paths.dsh_home)
        .unwrap();
    assert_eq!(
        snapshot.legacy_harbor_state(&paths.dsh_home),
        Some(LegacyHarborState::Missing)
    );
    service.before_host_start(&paths).unwrap();
    service.bind_host(&paths).unwrap();
    let row = service
        .overview()
        .unwrap()
        .components
        .into_iter()
        .find(|row| row.key == "harborPlugin")
        .unwrap();
    assert_eq!(row.state, "failed");
    assert!(row.can_install && row.runtime_token.is_none());
    assert!(row.error.unwrap().contains("install Harbor again"));
    assert!(!service.state.lock().unwrap().components["harborPlugin"].first_install_allowed);
    let current = prepared(&service, "harborPlugin");
    let command = managed_install_command(&paths, "/managed/bin", &current, &snapshot).unwrap();
    assert!(command
        .get_args()
        .any(|arg| arg.to_string_lossy().contains("--rollback-expected=")));
    let link = paths
        .dsh_home
        .join("profiles/web/node_modules")
        .join(HARBOR_PACKAGE);
    fs::remove_file(&link).unwrap();
    std::os::unix::fs::symlink(root.path().join("external/missing"), &link).unwrap();
    assert!(read_profile_snapshot(&paths, HARBOR_PACKAGE)
        .unwrap()
        .require_application_owned(service.manager.cache_root(), &paths.dsh_home)
        .is_err());
}
