//! Frozen installs fetch the signed Store only for pnpm's terminal cache-content errors.

use super::*;
use std::cell::Cell;

fn fixtures() -> serde_json::Value {
    serde_json::from_str(include_str!("tests/fixtures/pnpm-11.7.0-errors.json")).unwrap()
}

fn unsuccessful_status() -> std::process::ExitStatus {
    #[cfg(unix)]
    {
        use std::os::unix::process::ExitStatusExt;
        std::process::ExitStatus::from_raw(1 << 8)
    }
    #[cfg(windows)]
    {
        use std::os::windows::process::ExitStatusExt;
        std::process::ExitStatus::from_raw(1)
    }
}

fn fixture_failure(case: &serde_json::Value) -> PnpmInstallError {
    PnpmInstallError::Exit {
        status: unsuccessful_status(),
        code: pnpm_terminal_error_code(case["stdout"].as_str().unwrap(), 42),
    }
}

#[test]
fn reads_pinned_pnpm_fatal_codes_without_promoting_script_output_or_progress() {
    let fixtures = fixtures();
    assert_eq!(fixtures["pnpmVersion"], DEFAULT_PNPM_VERSION);
    assert_eq!(
        pnpm_terminal_error_code(fixtures["warmStdout"].as_str().unwrap(), 42),
        None
    );
    for case in fixtures["cases"].as_array().unwrap() {
        let stdout = case["stdout"].as_str().unwrap();
        assert_eq!(
            pnpm_terminal_error_code(stdout, 42).as_deref(),
            case["code"].as_str()
        );
        assert_eq!(pnpm_terminal_error_code(stdout, 41), None);
        let progress = stdout.lines().next().unwrap();
        assert_eq!(pnpm_terminal_error_code(progress, 42), None);
        assert_eq!(
            pnpm_terminal_error_code(&format!("{stdout}unfinished output\n"), 42),
            None
        );
    }
    let unrelated = [
        "ERR_PNPM_NO_OFFLINE_TARBALL",
        r#"{"level":"error","name":"pnpm","code":"ERR_PNPM_NO_OFFLINE_META"}"#,
        r#"{"pid":42,"level":"error","name":"pnpm:lifecycle","code":"ERR_PNPM_NO_OFFLINE_META","err":{"name":"pnpm","code":"ERR_PNPM_NO_OFFLINE_META"}}"#,
        r#"{"pid":42,"level":"error","name":"pnpm","code":"ERR_PNPM_NO_OFFLINE_META","err":{"name":"pnpm","code":"ELIFECYCLE"}}"#,
    ];
    for stdout in unrelated {
        assert_eq!(pnpm_terminal_error_code(stdout, 42), None);
    }
}

#[tokio::test]
async fn warm_user_store_installs_once_without_activating_or_moving_anything() {
    let root = tempfile::tempdir().unwrap();
    fs::create_dir(root.path().join("node_modules")).unwrap();
    fs::write(root.path().join("node_modules/keep.txt"), "warm").unwrap();
    let installs = Cell::new(0);
    install_with_store_fallback(
        root.path(),
        |store| {
            assert!(store.is_none());
            installs.set(installs.get() + 1);
            Ok(())
        },
        || async { panic!("warm Store must not activate a component") },
    )
    .await
    .unwrap();
    assert_eq!(installs.get(), 1);
    assert_eq!(
        fs::read_to_string(root.path().join("node_modules/keep.txt")).unwrap(),
        "warm"
    );
}

#[tokio::test]
async fn only_missing_content_activates_the_store_once_and_retains_partial_dependencies() {
    for case in fixtures()["cases"].as_array().unwrap() {
        let root = tempfile::tempdir().unwrap();
        fs::create_dir(root.path().join("node_modules")).unwrap();
        fs::write(root.path().join("node_modules/keep.txt"), "partial").unwrap();
        let store = root.path().join("signed-store");
        let installs = Cell::new(0);
        let activations = Cell::new(0);
        let result = install_with_store_fallback(
            root.path(),
            |selected_store| {
                installs.set(installs.get() + 1);
                if installs.get() == 1 {
                    assert!(selected_store.is_none());
                    Err(fixture_failure(case))
                } else {
                    assert_eq!(selected_store, Some(store.as_path()));
                    assert!(!root.path().join("node_modules").exists());
                    Ok(())
                }
            },
            || async {
                activations.set(activations.get() + 1);
                Ok(store.clone())
            },
        )
        .await;
        let missing = matches!(case["scenario"].as_str(), Some("tarball" | "metadata"));
        assert_eq!(result.is_ok(), missing, "{}: {result:?}", case["scenario"]);
        assert_eq!(activations.get(), usize::from(missing));
        assert_eq!(installs.get(), if missing { 2 } else { 1 });
        let modules = if missing {
            fs::read_dir(root.path())
                .unwrap()
                .flatten()
                .map(|entry| entry.path())
                .find(|path| {
                    path.file_name()
                        .unwrap()
                        .to_string_lossy()
                        .starts_with(".bootstrap-dependencies-")
                })
                .unwrap()
                .join("node_modules")
        } else {
            root.path().join("node_modules")
        };
        assert_eq!(
            fs::read_to_string(modules.join("keep.txt")).unwrap(),
            "partial"
        );
    }
}

#[tokio::test]
async fn store_retry_failure_stops_after_one_activation_and_reports_the_second_error() {
    let root = tempfile::tempdir().unwrap();
    let fixture = fixtures();
    let missing = &fixture["cases"][0];
    let installs = Cell::new(0);
    let activations = Cell::new(0);
    let error = install_with_store_fallback(
        root.path(),
        |_| {
            installs.set(installs.get() + 1);
            Err(fixture_failure(missing))
        },
        || async {
            activations.set(activations.get() + 1);
            Ok(root.path().join("store"))
        },
    )
    .await
    .unwrap_err();
    assert_eq!(installs.get(), 2);
    assert_eq!(activations.get(), 1);
    assert!(error.contains(i18n::t(Msg::PnpmStoreRetryFailed)));
    assert!(error.contains("ERR_PNPM_NO_OFFLINE_TARBALL"));
}

#[tokio::test]
async fn failed_component_activation_never_reinstalls_or_hides_the_component_error() {
    let root = tempfile::tempdir().unwrap();
    let fixture = fixtures();
    let installs = Cell::new(0);
    let error = install_with_store_fallback(
        root.path(),
        |_| {
            installs.set(installs.get() + 1);
            Err(fixture_failure(&fixture["cases"][0]))
        },
        || async { Err("signed Store checksum mismatch".into()) },
    )
    .await
    .unwrap_err();
    assert_eq!(error, "signed Store checksum mismatch");
    assert_eq!(installs.get(), 1);
}

#[tokio::test]
async fn process_failures_and_unknown_codes_do_not_activate_the_store() {
    let root = tempfile::tempdir().unwrap();
    for error in [
        PnpmInstallError::Process("pnpm install timed out".into()),
        PnpmInstallError::Process("pnpm failed to spawn".into()),
        PnpmInstallError::Exit {
            status: unsuccessful_status(),
            code: None,
        },
        PnpmInstallError::Exit {
            status: unsuccessful_status(),
            code: Some("ERR_PNPM_TARBALL_INTEGRITY".into()),
        },
        PnpmInstallError::Exit {
            status: unsuccessful_status(),
            code: Some("ERR_PNPM_UNKNOWN".into()),
        },
    ] {
        let mut error = Some(error);
        assert!(install_with_store_fallback(
            root.path(),
            |_| Err(error.take().unwrap()),
            || async { panic!("non-content error must not activate Store") }
        )
        .await
        .is_err());
    }
}

#[test]
fn diagnostics_keep_only_status_code_and_recovery_without_raw_secrets() {
    let raw = r#"{"pid":42,"level":"error","name":"pnpm","code":"ELIFECYCLE","err":{"name":"pnpm","code":"ELIFECYCLE","message":"https://user:private@registry.example/package?token=secret","stack":"Bearer secret"},"config":{"_authToken":"secret"}}"#;
    let error = PnpmInstallError::Exit {
        status: unsuccessful_status(),
        code: pnpm_terminal_error_code(raw, 42),
    };
    let message = error.to_string();
    assert!(message.contains("ELIFECYCLE"));
    assert!(message.contains(i18n::t(Msg::PnpmLifecycle)));
    for private in [
        "secret",
        "registry.example",
        "private",
        "Bearer",
        "_authToken",
    ] {
        assert!(!message.contains(private));
    }
}

#[cfg(unix)]
#[test]
fn real_process_success_and_timeout_cannot_become_content_misses() {
    let mut success = Command::new("sh");
    success.args(["-c", "printf '{\"pid\":%s,\"level\":\"error\",\"name\":\"pnpm\",\"code\":\"ERR_PNPM_NO_OFFLINE_META\",\"err\":{\"name\":\"pnpm\",\"code\":\"ERR_PNPM_NO_OFFLINE_META\"}}\\n' $$; exit 0"])
        .stdout(Stdio::piped()).stderr(Stdio::piped());
    run_pnpm_install(&mut success, Duration::from_secs(10)).unwrap();
    let mut timeout = Command::new("sh");
    timeout.args(["-c", "printf '{\"pid\":%s,\"level\":\"error\",\"name\":\"pnpm\",\"code\":\"ERR_PNPM_NO_OFFLINE_META\",\"err\":{\"name\":\"pnpm\",\"code\":\"ERR_PNPM_NO_OFFLINE_META\"}}\\n' $$; sleep 30"])
        .stdout(Stdio::piped()).stderr(Stdio::piped());
    let started = Instant::now();
    let error = run_pnpm_install(&mut timeout, Duration::from_millis(100)).unwrap_err();
    assert!(!error.missing_offline_content());
    assert!(error.to_string().contains("超时"));
    assert!(started.elapsed() < Duration::from_secs(10));
}
