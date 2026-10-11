use super::*;
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Barrier};

fn keys() -> Vec<String> {
    vec![
        "harness".into(),
        "pnpmStore".into(),
        "node".into(),
        "harbor".into(),
    ]
}

fn open(root: &Path) -> ComponentMetrics {
    ComponentMetrics::open(root, "0.4.9", &keys()).unwrap()
}

fn network(bytes: u64, retransferred_bytes: u64) -> MetricEvent {
    MetricEvent::DownloadBytes {
        component: "harness".into(),
        bytes,
        retransferred_bytes,
    }
}

fn write_snapshot(root: &Path, snapshot: &MetricsSnapshot) {
    fs::write(
        root.join(METRICS_FILE),
        serde_json::to_vec(snapshot).unwrap(),
    )
    .unwrap();
}

#[test]
fn aggregates_only_declared_release_counters_and_preserves_window_on_reopen() {
    let root = tempfile::tempdir().unwrap();
    let metrics = open(root.path());
    let started = metrics.snapshot().unwrap().window_started_at_unix_ms;
    for event in [
        MetricEvent::BootStarted,
        MetricEvent::BootStarted,
        MetricEvent::WorkbenchReady { elapsed_ms: 17 },
        MetricEvent::WorkbenchReady { elapsed_ms: 31 },
        MetricEvent::ReadinessFailed,
        network(20, 4),
        network(8, 8),
        MetricEvent::ResumeAttempted {
            component: "harness".into(),
        },
        MetricEvent::ResumeSucceeded {
            component: "harness".into(),
        },
        MetricEvent::ComponentInstalled {
            component: "harness".into(),
        },
        MetricEvent::ArchiveReused {
            component: "harness".into(),
            source: ArchiveSource::Cache,
            bytes: 25,
        },
        MetricEvent::ArchiveReused {
            component: "harness".into(),
            source: ArchiveSource::OfflineSeed,
            bytes: 30,
        },
        MetricEvent::CapabilityInvoked {
            component: "harness".into(),
            succeeded: true,
        },
        MetricEvent::CapabilityInvoked {
            component: "harness".into(),
            succeeded: false,
        },
    ] {
        metrics.record(event).unwrap();
    }
    let snapshot = open(root.path()).snapshot().unwrap();
    assert_eq!(snapshot.window_started_at_unix_ms, started);
    assert!(started > 0);
    assert_eq!(snapshot.boot_attempts, 2);
    assert_eq!(snapshot.workbench_ready_count, 2);
    assert_eq!(snapshot.workbench_ready_total_ms, 48);
    assert_eq!(snapshot.workbench_ready_max_ms, 31);
    assert_eq!(snapshot.readiness_failures, 1);
    assert_eq!(
        snapshot.components["harness"],
        ComponentCounters {
            network_bytes: 28,
            retransferred_bytes: 12,
            cache_archive_bytes: 25,
            offline_seed_archive_bytes: 30,
            resume_attempts: 1,
            resume_successes: 1,
            installs: 1,
            invocations: 2,
            successful_invocations: 1,
        }
    );
    assert_eq!(snapshot.components["node"], ComponentCounters::default());
    let json: serde_json::Value =
        serde_json::from_slice(&fs::read(root.path().join(METRICS_FILE)).unwrap()).unwrap();
    assert_eq!(
        json.as_object()
            .unwrap()
            .keys()
            .cloned()
            .collect::<BTreeSet<_>>(),
        BTreeSet::from(
            [
                "formatVersion",
                "appVersion",
                "windowStartedAtUnixMs",
                "bootAttempts",
                "workbenchReadyCount",
                "workbenchReadyTotalMs",
                "workbenchReadyMaxMs",
                "readinessFailures",
                "components",
            ]
            .map(String::from)
        )
    );
    assert_eq!(
        json["components"]["harness"]
            .as_object()
            .unwrap()
            .keys()
            .cloned()
            .collect::<BTreeSet<_>>(),
        BTreeSet::from(
            [
                "networkBytes",
                "retransferredBytes",
                "cacheArchiveBytes",
                "offlineSeedArchiveBytes",
                "resumeAttempts",
                "resumeSuccesses",
                "installs",
                "invocations",
                "successfulInvocations",
            ]
            .map(String::from)
        )
    );
    assert_eq!(
        fs::read(root.path().join(LOCK_FILE)).unwrap(),
        Vec::<u8>::new()
    );
    assert_eq!(fs::read_dir(root.path()).unwrap().count(), 2);
}

#[test]
fn rejects_unknown_components_invalid_observations_and_catalog_changes_without_writing() {
    let root = tempfile::tempdir().unwrap();
    let metrics = open(root.path());
    let before = fs::read(root.path().join(METRICS_FILE)).unwrap();
    for event in [
        MetricEvent::DownloadBytes {
            component: "unknown".into(),
            bytes: 1,
            retransferred_bytes: 0,
        },
        MetricEvent::ResumeAttempted {
            component: "unknown".into(),
        },
        MetricEvent::ResumeSucceeded {
            component: "unknown".into(),
        },
        MetricEvent::ComponentInstalled {
            component: "unknown".into(),
        },
        MetricEvent::ArchiveReused {
            component: "unknown".into(),
            source: ArchiveSource::Cache,
            bytes: 1,
        },
        MetricEvent::CapabilityInvoked {
            component: "unknown".into(),
            succeeded: true,
        },
        MetricEvent::ResumeSucceeded {
            component: "harness".into(),
        },
        network(1, 2),
    ] {
        assert!(metrics.record(event).is_err());
        assert_eq!(fs::read(root.path().join(METRICS_FILE)).unwrap(), before);
    }
    assert!(ComponentMetrics::open(root.path(), "0.4.9", &["different".into()]).is_err());
    assert_eq!(fs::read(root.path().join(METRICS_FILE)).unwrap(), before);
}

#[test]
fn bounds_the_catalog_and_rejects_duplicate_or_nonstatic_keys_before_creating_storage() {
    let base = tempfile::tempdir().unwrap();
    let root = base.path().join("metrics");
    for catalog in [
        vec!["harness".into(), "harness".into()],
        vec!["".into()],
        vec!["a".repeat(65)],
        vec!["path/key".into()],
        vec!["account@example.org".into()],
        vec!["输入".into()],
        (0..65).map(|index| format!("component{index}")).collect(),
    ] {
        assert!(ComponentMetrics::open(&root, "0.4.9", &catalog).is_err());
        assert!(!root.exists());
    }
    let catalog = (0..64)
        .map(|index| format!("{index:02}{}", "x".repeat(62)))
        .collect::<Vec<_>>();
    let metrics = ComponentMetrics::open(&root, "0.4.9", &catalog).unwrap();
    assert_eq!(metrics.snapshot().unwrap().components.len(), 64);
    assert!(fs::metadata(root.join(METRICS_FILE)).unwrap().len() <= MAX_FILE_BYTES);
}

#[test]
fn advances_only_to_newer_semver_releases_and_rejects_superseded_handles() {
    let root = tempfile::tempdir().unwrap();
    let old = ComponentMetrics::open(root.path(), "0.4.9-rc.2", &keys()).unwrap();
    old.record(MetricEvent::BootStarted).unwrap();
    let next = ComponentMetrics::open(root.path(), "0.4.9-rc.10", &keys()).unwrap();
    next.record(network(27, 0)).unwrap();
    let before = fs::read(root.path().join(METRICS_FILE)).unwrap();
    assert!(old.record(MetricEvent::BootStarted).is_err());
    assert!(old.snapshot().is_err());
    assert!(ComponentMetrics::open(root.path(), "0.4.9-rc.2", &keys()).is_err());
    assert_eq!(fs::read(root.path().join(METRICS_FILE)).unwrap(), before);
    let stable = ComponentMetrics::open(root.path(), "0.4.9", &keys()).unwrap();
    assert_eq!(stable.snapshot().unwrap().boot_attempts, 0);
    assert_eq!(
        stable.snapshot().unwrap().components["harness"].network_bytes,
        0
    );
    stable.record(MetricEvent::BootStarted).unwrap();
    let before = fs::read(root.path().join(METRICS_FILE)).unwrap();
    for version in ["0.4.8", "0.4.9-rc.99", "0.4.9+other"] {
        assert!(ComponentMetrics::open(root.path(), version, &keys()).is_err());
        assert_eq!(fs::read(root.path().join(METRICS_FILE)).unwrap(), before);
    }
    assert!(next.record(network(1, 0)).is_err());
    let same = ComponentMetrics::open(root.path(), "0.4.9", &keys()).unwrap();
    assert_eq!(same.snapshot().unwrap().boot_attempts, 1);
    assert_eq!(
        ComponentMetrics::open(root.path(), "0.4.10", &keys())
            .unwrap()
            .snapshot()
            .unwrap()
            .app_version,
        "0.4.10"
    );
}

#[test]
fn rejects_malformed_app_versions_without_creating_storage() {
    let base = tempfile::tempdir().unwrap();
    let root = base.path().join("metrics");
    for version in [
        "",
        "v0.4.9",
        "0.4",
        "0.04.9",
        "0.4.9-01",
        "0.4.9/path",
        "0.4.9\n",
        &format!("0.4.9+{}", "x".repeat(64)),
    ] {
        assert!(ComponentMetrics::open(&root, version, &keys()).is_err());
        assert!(!root.exists());
    }
}

#[test]
fn preserves_malformed_truncated_oversized_or_inconsistent_files_even_on_upgrade() {
    let root = tempfile::tempdir().unwrap();
    let metrics = open(root.path());
    let good = metrics.snapshot().unwrap();
    let json = serde_json::to_string(&good).unwrap();
    let mut cases = vec![
        b"{".to_vec(),
        b"".to_vec(),
        vec![b' '; MAX_FILE_BYTES as usize + 1],
        json.replacen("\"formatVersion\":1", "\"formatVersion\":2", 1)
            .into_bytes(),
        json.replacen(
            "\"formatVersion\":1",
            "\"formatVersion\":1,\"userId\":\"private\"",
            1,
        )
        .into_bytes(),
        json.replacen(
            "\"networkBytes\":0",
            "\"networkBytes\":0,\"payload\":\"private\"",
            1,
        )
        .into_bytes(),
        json.replacen("\"bootAttempts\":0", "\"bootAttempts\":-1", 1)
            .into_bytes(),
        json.replacen(
            "\"bootAttempts\":0",
            "\"bootAttempts\":18446744073709551616",
            1,
        )
        .into_bytes(),
        json.replacen(
            "\"bootAttempts\":0",
            "\"bootAttempts\":0,\"bootAttempts\":1",
            1,
        )
        .into_bytes(),
        json.replacen("\"appVersion\":\"0.4.9\"", "\"appVersion\":\"broken\"", 1)
            .into_bytes(),
        json.replacen(
            "\"components\":{",
            &format!(
                "\"components\":{{\"harness\":{},",
                serde_json::to_string(&ComponentCounters::default()).unwrap()
            ),
            1,
        )
        .into_bytes(),
    ];
    for mutate in [
        |snapshot: &mut MetricsSnapshot| {
            snapshot
                .components
                .get_mut("harness")
                .unwrap()
                .retransferred_bytes = 1
        },
        |snapshot: &mut MetricsSnapshot| {
            snapshot
                .components
                .get_mut("harness")
                .unwrap()
                .resume_successes = 1
        },
        |snapshot: &mut MetricsSnapshot| {
            snapshot
                .components
                .get_mut("harness")
                .unwrap()
                .successful_invocations = 1
        },
        |snapshot: &mut MetricsSnapshot| snapshot.workbench_ready_total_ms = 1,
        |snapshot: &mut MetricsSnapshot| snapshot.workbench_ready_max_ms = 1,
        |snapshot: &mut MetricsSnapshot| {
            snapshot
                .components
                .insert("path/key".into(), ComponentCounters::default());
        },
        |snapshot: &mut MetricsSnapshot| {
            for index in 0..65 {
                snapshot
                    .components
                    .insert(format!("component{index}"), ComponentCounters::default());
            }
        },
    ] {
        let mut snapshot = good.clone();
        mutate(&mut snapshot);
        cases.push(serde_json::to_vec(&snapshot).unwrap());
    }
    for bytes in cases {
        fs::write(root.path().join(METRICS_FILE), &bytes).unwrap();
        assert!(metrics.snapshot().is_err());
        assert!(metrics.record(MetricEvent::BootStarted).is_err());
        assert!(ComponentMetrics::open(root.path(), "0.5.0", &keys()).is_err());
        assert_eq!(fs::read(root.path().join(METRICS_FILE)).unwrap(), bytes);
    }
}

#[test]
fn accepts_exact_file_limit_and_does_not_recreate_a_missing_active_aggregate() {
    let root = tempfile::tempdir().unwrap();
    let metrics = open(root.path());
    let mut bytes = fs::read(root.path().join(METRICS_FILE)).unwrap();
    bytes.resize(MAX_FILE_BYTES as usize, b' ');
    fs::write(root.path().join(METRICS_FILE), bytes).unwrap();
    assert_eq!(metrics.snapshot().unwrap().boot_attempts, 0);
    fs::remove_file(root.path().join(METRICS_FILE)).unwrap();
    assert!(metrics.record(MetricEvent::BootStarted).is_err());
    assert!(metrics.snapshot().is_err());
    assert!(!root.path().join(METRICS_FILE).exists());
}

#[test]
fn rejects_counter_overflow_without_committing_partial_event_fields() {
    let root = tempfile::tempdir().unwrap();
    let metrics = open(root.path());
    let good = metrics.snapshot().unwrap();
    let cases: Vec<(fn(&mut MetricsSnapshot), MetricEvent)> = vec![
        (|s| s.boot_attempts = u64::MAX, MetricEvent::BootStarted),
        (
            |s| s.readiness_failures = u64::MAX,
            MetricEvent::ReadinessFailed,
        ),
        (
            |s| s.workbench_ready_count = u64::MAX,
            MetricEvent::WorkbenchReady { elapsed_ms: 1 },
        ),
        (
            |s| {
                s.workbench_ready_count = 1;
                s.workbench_ready_total_ms = u64::MAX;
                s.workbench_ready_max_ms = u64::MAX;
            },
            MetricEvent::WorkbenchReady { elapsed_ms: 1 },
        ),
        (
            |s| s.components.get_mut("harness").unwrap().network_bytes = u64::MAX,
            network(1, 0),
        ),
        (
            |s| s.components.get_mut("harness").unwrap().resume_attempts = u64::MAX,
            MetricEvent::ResumeAttempted {
                component: "harness".into(),
            },
        ),
        (
            |s| s.components.get_mut("harness").unwrap().installs = u64::MAX,
            MetricEvent::ComponentInstalled {
                component: "harness".into(),
            },
        ),
        (
            |s| s.components.get_mut("harness").unwrap().invocations = u64::MAX,
            MetricEvent::CapabilityInvoked {
                component: "harness".into(),
                succeeded: true,
            },
        ),
        (
            |s| s.components.get_mut("harness").unwrap().cache_archive_bytes = u64::MAX,
            MetricEvent::ArchiveReused {
                component: "harness".into(),
                source: ArchiveSource::Cache,
                bytes: 1,
            },
        ),
        (
            |s| {
                s.components
                    .get_mut("harness")
                    .unwrap()
                    .offline_seed_archive_bytes = u64::MAX
            },
            MetricEvent::ArchiveReused {
                component: "harness".into(),
                source: ArchiveSource::OfflineSeed,
                bytes: 1,
            },
        ),
    ];
    for (mutate, event) in cases {
        let mut snapshot = good.clone();
        mutate(&mut snapshot);
        write_snapshot(root.path(), &snapshot);
        let before = fs::read(root.path().join(METRICS_FILE)).unwrap();
        assert_eq!(
            metrics.record(event).unwrap_err(),
            "metrics counter overflow"
        );
        assert_eq!(fs::read(root.path().join(METRICS_FILE)).unwrap(), before);
    }
    write_snapshot(root.path(), &good);
    metrics.record(network(u64::MAX, u64::MAX)).unwrap();
    assert_eq!(
        metrics.snapshot().unwrap().components["harness"].network_bytes,
        u64::MAX
    );
}

#[test]
fn same_release_handles_add_concurrently_and_raw_readers_never_observe_partial_json() {
    let root = tempfile::tempdir().unwrap();
    let metrics = Arc::new(open(root.path()));
    let ready = Arc::new(Barrier::new(5));
    let writers = (0..4)
        .map(|_| {
            let metrics = Arc::clone(&metrics);
            let ready = Arc::clone(&ready);
            std::thread::spawn(move || {
                ready.wait();
                for _ in 0..30 {
                    metrics.record(network(3, 1)).unwrap();
                }
            })
        })
        .collect::<Vec<_>>();
    ready.wait();
    let deadline = Instant::now() + Duration::from_secs(10);
    while writers.iter().any(|writer| !writer.is_finished()) {
        assert!(Instant::now() < deadline, "metrics writers did not finish");
        let bytes = fs::read(root.path().join(METRICS_FILE)).unwrap();
        let snapshot: MetricsSnapshot = serde_json::from_slice(&bytes).unwrap();
        assert_eq!(
            snapshot.components["harness"].network_bytes,
            snapshot.components["harness"].retransferred_bytes * 3
        );
    }
    for writer in writers {
        writer.join().unwrap();
    }
    assert_eq!(
        metrics.snapshot().unwrap().components["harness"].network_bytes,
        360
    );
    assert_eq!(
        metrics.snapshot().unwrap().components["harness"].retransferred_bytes,
        120
    );
    assert_eq!(fs::read_dir(root.path()).unwrap().count(), 2);
}

struct TestChild(Child);

impl Drop for TestChild {
    fn drop(&mut self) {
        let _ = self.0.kill();
        let _ = self.0.wait();
    }
}

fn child(root: &Path, mode: &str) -> TestChild {
    let mut command = Command::new(std::env::current_exe().unwrap());
    command
        .args([
            "--exact",
            "runtime::component_metrics::tests::subprocess_metrics_worker",
            "--ignored",
            "--nocapture",
        ])
        .env_clear()
        .env("METRICS_TEST_ROOT", root)
        .env("METRICS_TEST_MODE", mode)
        .stdin(Stdio::null())
        .stdout(Stdio::null());
    #[cfg(windows)]
    for name in ["SystemRoot", "PATH", "TEMP", "TMP"] {
        if let Some(value) = std::env::var_os(name) {
            command.env(name, value);
        }
    }
    TestChild(command.spawn().unwrap())
}

fn wait_for(path: &Path) {
    let deadline = Instant::now() + Duration::from_secs(10);
    while !path.exists() {
        assert!(Instant::now() < deadline, "child did not signal completion");
        std::thread::sleep(Duration::from_millis(5));
    }
}

#[test]
#[ignore = "invoked by multi-process metrics tests"]
fn subprocess_metrics_worker() {
    let root = PathBuf::from(std::env::var_os("METRICS_TEST_ROOT").unwrap());
    match std::env::var("METRICS_TEST_MODE").unwrap().as_str() {
        "add" => {
            let metrics = open(&root);
            for _ in 0..25 {
                metrics.record(network(7, 2)).unwrap();
            }
        }
        "upgrade" => {
            fs::write(root.join("upgrade-ready"), b"").unwrap();
            let metrics = ComponentMetrics::open(&root, "0.5.0", &keys()).unwrap();
            metrics.record(MetricEvent::BootStarted).unwrap();
        }
        "hold" => {
            let metrics = open(&root);
            let _lock = metrics.lock().unwrap();
            fs::write(root.join("child-ready"), b"").unwrap();
            loop {
                std::thread::sleep(Duration::from_secs(60));
            }
        }
        _ => panic!("unsupported metrics worker mode"),
    }
}

#[test]
fn separate_processes_add_without_lost_updates() {
    let root = tempfile::tempdir().unwrap();
    let metrics = open(root.path());
    let mut children = (0..4)
        .map(|_| child(root.path(), "add"))
        .collect::<Vec<_>>();
    for child in &mut children {
        assert!(child.0.wait().unwrap().success());
    }
    let snapshot = metrics.snapshot().unwrap();
    assert_eq!(snapshot.components["harness"].network_bytes, 700);
    assert_eq!(snapshot.components["harness"].retransferred_bytes, 200);
}

#[test]
fn another_process_upgrade_prevents_old_handle_writes_and_old_open() {
    let root = tempfile::tempdir().unwrap();
    let old = open(root.path());
    let lock = old.lock().unwrap();
    let mut upgrader = child(root.path(), "upgrade");
    wait_for(&root.path().join("upgrade-ready"));
    drop(lock);
    for _ in 0..20 {
        match old.record(MetricEvent::BootStarted) {
            Ok(()) => {}
            Err(error) => {
                assert_eq!(error, "metrics handle belongs to a superseded release");
                break;
            }
        }
    }
    assert!(upgrader.0.wait().unwrap().success());
    let bytes = fs::read(root.path().join(METRICS_FILE)).unwrap();
    assert!(old.record(MetricEvent::BootStarted).is_err());
    assert!(ComponentMetrics::open(root.path(), "0.4.9", &keys()).is_err());
    assert_eq!(fs::read(root.path().join(METRICS_FILE)).unwrap(), bytes);
    assert_eq!(
        ComponentMetrics::open(root.path(), "0.5.0", &keys())
            .unwrap()
            .snapshot()
            .unwrap()
            .boot_attempts,
        1
    );
}

#[test]
fn contention_returns_an_error_and_process_termination_releases_the_os_lock() {
    let root = tempfile::tempdir().unwrap();
    let metrics = open(root.path());
    let mut holder = child(root.path(), "hold");
    wait_for(&root.path().join("child-ready"));
    let before = fs::read(root.path().join(METRICS_FILE)).unwrap();
    let result = metrics.record(MetricEvent::BootStarted);
    holder.0.kill().unwrap();
    holder.0.wait().unwrap();
    assert_eq!(result.unwrap_err(), "metrics lock is busy");
    assert_eq!(fs::read(root.path().join(METRICS_FILE)).unwrap(), before);
    metrics.record(MetricEvent::BootStarted).unwrap();
    assert_eq!(metrics.snapshot().unwrap().boot_attempts, 1);
}

#[cfg(unix)]
#[test]
fn refuses_symlink_roots_lock_files_and_data_files_without_touching_targets() {
    use std::os::unix::fs::symlink;
    let base = tempfile::tempdir().unwrap();
    let outside = tempfile::tempdir().unwrap();
    let link = base.path().join("linked-root");
    symlink(outside.path(), &link).unwrap();
    assert!(ComponentMetrics::open(&link, "0.4.9", &keys()).is_err());
    assert_eq!(fs::read_dir(outside.path()).unwrap().count(), 0);
    for name in [METRICS_FILE, LOCK_FILE] {
        let root = tempfile::tempdir().unwrap();
        let metrics = open(root.path());
        let target = outside.path().join(name);
        fs::write(&target, b"untouched").unwrap();
        fs::remove_file(root.path().join(name)).unwrap();
        symlink(&target, root.path().join(name)).unwrap();
        assert!(metrics.snapshot().is_err());
        assert!(metrics.record(MetricEvent::BootStarted).is_err());
        assert!(ComponentMetrics::open(root.path(), "0.5.0", &keys()).is_err());
        assert_eq!(fs::read(&target).unwrap(), b"untouched");
        assert!(fs::symlink_metadata(root.path().join(name))
            .unwrap()
            .file_type()
            .is_symlink());
    }
    let root = tempfile::tempdir().unwrap();
    symlink(outside.path().join("missing"), root.path().join(LOCK_FILE)).unwrap();
    assert!(ComponentMetrics::open(root.path(), "0.4.9", &keys()).is_err());
    assert!(!outside.path().join("missing").exists());
}

#[test]
fn refuses_directories_at_file_paths() {
    for name in [METRICS_FILE, LOCK_FILE] {
        let root = tempfile::tempdir().unwrap();
        fs::create_dir(root.path().join(name)).unwrap();
        assert!(ComponentMetrics::open(root.path(), "0.4.9", &keys()).is_err());
        assert!(root.path().join(name).is_dir());
    }
}
