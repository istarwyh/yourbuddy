use super::*;

fn request(root: &Path, id: &str) -> Request {
    Request {
        request_id: id.into(),
        session_id: Some("session-1".into()),
        app_path: root.join("YourBuddy.app"),
        requested_version: "1.2.3".into(),
        package: None,
        package_identity: None,
        signature: None,
        offline: false,
        defer_stop: true,
    }
}

#[test]
fn persistent_receipt_deduplicates_requests_and_rejects_a_second_target_writer() {
    let root = tempfile::tempdir().unwrap();
    let store = Store::new(root.path().join("installer")).unwrap();
    let (first, created) = store.create(request(root.path(), "same-request")).unwrap();
    assert!(created);
    let (duplicate, created) = store.create(request(root.path(), "same-request")).unwrap();
    assert!(!created);
    assert_eq!(first.id, duplicate.id);
    assert!(store
        .create(request(root.path(), "other-request"))
        .unwrap_err()
        .contains("already active"));
    let reopened = Store::new(store.root.clone()).unwrap();
    assert_eq!(
        reopened
            .read(&first.id)
            .unwrap()
            .request
            .session_id
            .as_deref(),
        Some("session-1")
    );
    let _target = store.target_lock(&first.request.app_path).unwrap().unwrap();
    assert!(reopened
        .target_lock(&first.request.app_path)
        .unwrap()
        .is_none());
}

#[test]
fn duplicate_local_package_uses_signature_identity_not_temporary_source_paths() {
    let root = tempfile::tempdir().unwrap();
    let store = Store::new(root.path().join("installer")).unwrap();
    let mut first = request(root.path(), "same-request");
    first.package = Some(root.path().join("temporary-a/app.tar.gz"));
    first.signature = Some(root.path().join("temporary-a/app.tar.gz.sig"));
    first.package_identity = Some("official-signature".into());
    let (operation, _) = store.create(first.clone()).unwrap();
    first.package = Some(root.path().join("temporary-b/app.tar.gz"));
    first.signature = Some(root.path().join("temporary-b/app.tar.gz.sig"));
    assert_eq!(store.create(first.clone()).unwrap().0.id, operation.id);
    first.package_identity = Some("different-release-signature".into());
    assert!(store.create(first).is_err());
}

#[test]
fn executor_exit_and_duplicate_request_converge_without_a_stale_success() {
    let root = tempfile::tempdir().unwrap();
    let store = Store::new(root.path().join("installer")).unwrap();
    let request = request(root.path(), "crashed-request");
    let (mut operation, _) = store.create(request.clone()).unwrap();
    operation.executor_pid = Some(123);
    store.transition(&mut operation, Phase::Preparing).unwrap();
    let (retried, created) = store.create(request).unwrap();
    assert!(!created);
    assert_eq!(retried.phase, Phase::NeedsUserAction);
    assert!(retried.error.unwrap().contains("executor stopped"));
    assert_eq!(
        store.read(&operation.id).unwrap().phase,
        Phase::NeedsUserAction
    );
}

#[test]
fn cancellation_is_durable_and_cannot_be_overwritten_by_executor_progress() {
    let root = tempfile::tempdir().unwrap();
    let store = Store::new(root.path().join("installer")).unwrap();
    let (mut operation, _) = store
        .create(request(root.path(), "cancel-request"))
        .unwrap();
    let cancelled = store
        .cancel(&operation.id, "session flush failed".into())
        .unwrap();
    assert_eq!(cancelled.phase, Phase::NeedsUserAction);
    assert!(store.transition(&mut operation, Phase::Stopping).is_err());
    assert_eq!(
        store.read(&operation.id).unwrap().error.as_deref(),
        Some("session flush failed")
    );
    let (mut committed, _) = store
        .create(request(root.path(), "committed-request"))
        .unwrap();
    store.transition(&mut committed, Phase::Stopping).unwrap();
    assert!(store.cancel(&committed.id, "too late".into()).is_err());
}

#[test]
fn success_requires_the_target_version_operation_and_spawned_desktop() {
    let root = tempfile::tempdir().unwrap();
    let store = Store::new(root.path().join("installer")).unwrap();
    let (mut operation, _) = store.create(request(root.path(), "ready-request")).unwrap();
    operation.target_version = Some("1.2.3".into());
    let mut live = LiveDesktop {
        app_path: operation.request.app_path.clone(),
        pid: 100,
        launch_id: "launch-1".into(),
        version: "1.2.3".into(),
        operation_id: Some(operation.id.clone()),
        host_ready: true,
        frontend_ready: true,
        failure: None,
    };
    assert!(matches_ready(&live, &operation, 100));
    assert!(!matches_ready(&live, &operation, 101));
    live.version = "1.2.4".into();
    assert!(!matches_ready(&live, &operation, 100));
    live.version = "1.2.3".into();
    live.app_path = root.path().join("Other.app");
    assert!(!matches_ready(&live, &operation, 100));
    live.app_path = operation.request.app_path.clone();
    live.operation_id = Some("previous-operation".into());
    assert!(!matches_ready(&live, &operation, 100));
}

#[test]
fn internal_executor_refuses_to_reexecute_a_terminal_receipt() {
    let root = tempfile::tempdir().unwrap();
    let store = Store::new(root.path().join("installer")).unwrap();
    let (operation, _) = store
        .create(request(root.path(), "terminal-request"))
        .unwrap();
    store.cancel(&operation.id, "cancelled".into()).unwrap();
    assert!(execute(&store, &operation.id)
        .unwrap_err()
        .contains("already executed"));
    assert_eq!(
        store.read(&operation.id).unwrap().phase,
        Phase::NeedsUserAction
    );
}

#[cfg(unix)]
#[test]
fn detached_executor_survives_host_group_kill_and_reaches_quiescence() {
    use std::io::Read;
    use std::os::unix::process::{CommandExt, ExitStatusExt};
    struct Cleanup {
        launcher: std::process::Child,
        root: PathBuf,
    }
    impl Drop for Cleanup {
        fn drop(&mut self) {
            if let Ok(pid) = fs::read_to_string(self.root.join("ready"))
                .and_then(|text| text.parse::<i32>().map_err(std::io::Error::other))
            {
                unsafe {
                    libc::kill(pid, libc::SIGKILL);
                }
            }
            stop_child(&mut self.launcher);
        }
    }
    let root = tempfile::tempdir().unwrap();
    let mut launcher = Command::new(std::env::current_exe().unwrap());
    launcher
        .args([
            "--exact",
            "installer::tests::launcher_fixture",
            "--nocapture",
        ])
        .env("YOURBUDDY_INSTALLER_FIXTURE", root.path())
        .process_group(0)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::null());
    let mut cleanup = Cleanup {
        launcher: launcher.spawn().unwrap(),
        root: root.path().to_path_buf(),
    };
    let mut stdout = cleanup.launcher.stdout.take().unwrap();
    let (sender, receiver) = std::sync::mpsc::channel();
    let drain = std::thread::spawn(move || {
        let mut bytes = Vec::new();
        let result = stdout.read_to_end(&mut bytes);
        let _ = sender.send(result);
    });
    let ready = root.path().join("ready");
    assert!(wait_until(Duration::from_secs(10), || Ok(ready.is_file())).unwrap());
    let pid: i32 = fs::read_to_string(&ready).unwrap().parse().unwrap();
    unsafe {
        assert_eq!(
            libc::kill(-(cleanup.launcher.id() as i32), libc::SIGKILL),
            0
        );
    }
    assert_eq!(
        cleanup.launcher.wait().unwrap().signal(),
        Some(libc::SIGKILL)
    );
    let store = Store::new(root.path().join("installer")).unwrap();
    assert!(store
        .target_lock(&root.path().join("YourBuddy.app"))
        .unwrap()
        .is_none());
    unsafe {
        assert_eq!(libc::kill(pid, 0), 0);
    }
    fs::write(root.path().join("finish"), "finish").unwrap();
    let exited = receiver.recv_timeout(Duration::from_secs(10));
    if exited.is_err() {
        unsafe {
            libc::kill(pid, libc::SIGKILL);
        }
    }
    drain.join().unwrap();
    exited.unwrap().unwrap();
    assert!(root.path().join("finished").is_file());
    fs::remove_file(&ready).unwrap();
    assert!(store
        .target_lock(&root.path().join("YourBuddy.app"))
        .unwrap()
        .is_some());
}

#[test]
fn launcher_fixture() {
    let Some(root) = std::env::var_os("YOURBUDDY_INSTALLER_FIXTURE") else {
        return;
    };
    let mut command = Command::new(std::env::current_exe().unwrap());
    command
        .args([
            "--exact",
            "installer::tests::executor_fixture",
            "--nocapture",
        ])
        .env("YOURBUDDY_INSTALLER_FIXTURE", &root)
        .stdin(Stdio::null())
        .stdout(Stdio::inherit())
        .stderr(Stdio::null());
    detach(&mut command);
    command.spawn().unwrap();
    assert!(
        wait_until(Duration::from_secs(20), || Ok(PathBuf::from(&root)
            .join("finish")
            .is_file()))
        .unwrap()
    );
}

#[test]
fn executor_fixture() {
    let Some(root) = std::env::var_os("YOURBUDDY_INSTALLER_FIXTURE") else {
        return;
    };
    let root = PathBuf::from(root);
    let store = Store::new(root.join("installer")).unwrap();
    let lock = store
        .target_lock(&root.join("YourBuddy.app"))
        .unwrap()
        .unwrap();
    fs::write(root.join("ready"), std::process::id().to_string()).unwrap();
    assert!(wait_until(Duration::from_secs(20), || Ok(root
        .join("finish")
        .is_file()))
    .unwrap());
    drop(lock);
    fs::write(root.join("finished"), "finished").unwrap();
}

#[test]
fn notification_discovery_handles_later_failures_once_without_disabling_future_shutdowns() {
    let root = tempfile::tempdir().unwrap();
    let store = Store::new(root.path().join("installer")).unwrap();
    let app = root.path().join("YourBuddy.app");
    assert!(pending_notification(&store, &app).unwrap().is_none());
    let (first, _) = store.create(request(root.path(), "first")).unwrap();
    store
        .cancel(&first.id, "preparation failed".into())
        .unwrap();
    assert_eq!(
        pending_notification(&store, &app).unwrap().unwrap().id,
        first.id
    );
    write_json(
        &store.directory(&first.id).unwrap().join("notified.json"),
        &json!({"at": now()}),
    )
    .unwrap();
    assert!(pending_notification(&store, &app).unwrap().is_none());
    let (second, _) = store.create(request(root.path(), "second")).unwrap();
    store
        .cancel(&second.id, "second preparation failed".into())
        .unwrap();
    assert_eq!(
        pending_notification(&store, &app).unwrap().unwrap().id,
        second.id
    );
}

#[test]
fn local_version_needs_neither_application_data_nor_network() {
    let options = parse(&[OsString::from("version")]).unwrap();
    assert_eq!(
        run(options).unwrap(),
        json!({"version": env!("CARGO_PKG_VERSION")})
    );
}

#[test]
fn stale_requested_observation_cannot_replay_a_progressed_executor_after_its_lock_releases() {
    let root = tempfile::tempdir().unwrap();
    let store = Store::new(root.path().join("installer")).unwrap();
    let (observed, _) = store
        .create(request(root.path(), "racing-executor"))
        .unwrap();
    let first_lock = store
        .target_lock(&observed.request.app_path)
        .unwrap()
        .unwrap();
    let mut progressed = observed.clone();
    progressed.executor_pid = Some(123);
    store.transition(&mut progressed, Phase::Preparing).unwrap();
    drop(first_lock);
    assert!(claim_execution(&store, &observed)
        .unwrap_err()
        .contains("already executed"));
    assert_eq!(store.read(&observed.id).unwrap().phase, Phase::Preparing);
    assert_eq!(
        store
            .converge(store.read(&observed.id).unwrap())
            .unwrap()
            .phase,
        Phase::NeedsUserAction
    );
}

#[test]
fn wrong_or_unreadable_existing_application_is_rejected_without_changing_its_files() {
    let root = tempfile::tempdir().unwrap();
    let other = root.path().join("Other.app");
    fs::create_dir_all(other.join("Contents")).unwrap();
    let marker = other.join("Contents/keep.txt");
    fs::write(&marker, "another application's data").unwrap();
    assert!(
        validate_target_with(&other, |_| Ok("com.example.other".into()))
            .unwrap_err()
            .contains("different application")
    );
    assert!(validate_target_with(&other, |_| Err("unreadable identifier".into())).is_err());
    assert_eq!(
        fs::read_to_string(&marker).unwrap(),
        "another application's data"
    );
    assert!(validate_target_with(&other, |_| Ok("io.github.istarwyh.yourbuddy".into())).is_ok());
    assert!(
        validate_target_with(&root.path().join("New.app"), |_| panic!(
            "new target has no identifier"
        ))
        .is_ok()
    );
    let config: Value = serde_json::from_str(include_str!("../../tauri.conf.json")).unwrap();
    assert_eq!(config["identifier"], "io.github.istarwyh.yourbuddy");
}

#[test]
fn same_version_new_requests_end_without_handoff_or_application_replacement() {
    let root = tempfile::tempdir().unwrap();
    let store = Store::new(root.path().join("installer")).unwrap();
    let app = root.path().join("YourBuddy.app");
    fs::create_dir_all(&app).unwrap();
    let marker = app.join("keep.txt");
    fs::write(&marker, "installed application").unwrap();
    let current = semver::Version::parse("1.2.3").unwrap();
    for id in ["first-request", "new-request"] {
        let (mut operation, created) = store.create(request(root.path(), id)).unwrap();
        assert!(created);
        assert!(settle_installed_version(&store, &mut operation, "1.2.3", &current).unwrap());
        let saved = store.converge(store.read(&operation.id).unwrap()).unwrap();
        assert_eq!(saved.phase, Phase::Unchanged);
        assert_eq!(saved.target_version.as_deref(), Some("1.2.3"));
        assert!(saved.phase.terminal());
        assert!(!store
            .directory(&operation.id)
            .unwrap()
            .join("handoff.json")
            .exists());
    }
    assert_eq!(
        fs::read_to_string(&marker).unwrap(),
        "installed application"
    );
    assert!(!store.root.join("shutdown.json").exists());
}

#[test]
fn cancellation_remains_terminal_when_same_version_settlement_races_it() {
    let root = tempfile::tempdir().unwrap();
    let store = Store::new(root.path().join("installer")).unwrap();
    let (mut operation, _) = store.create(request(root.path(), "cancel-no-op")).unwrap();
    store
        .cancel(&operation.id, "cancelled by caller".into())
        .unwrap();
    assert!(settle_installed_version(
        &store,
        &mut operation,
        "1.2.3",
        &semver::Version::parse("1.2.3").unwrap(),
    )
    .is_err());
    let saved = store.read(&operation.id).unwrap();
    assert_eq!(saved.phase, Phase::NeedsUserAction);
    assert_eq!(saved.error.as_deref(), Some("cancelled by caller"));
}
