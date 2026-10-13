//! Loopback HTTP regressions for resumed component startup downloads.

use super::*;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::thread::{self, JoinHandle};

struct Reply {
    status: u16,
    etag: &'static str,
    body: Vec<u8>,
    declared_bytes: usize,
    stall: bool,
}

impl Reply {
    fn new(status: u16, etag: &'static str, body: &[u8]) -> Self {
        Self {
            status,
            etag,
            body: body.into(),
            declared_bytes: body.len(),
            stall: false,
        }
    }
}

/// The listener owns its ephemeral port until Drop signals and joins the worker.
struct Server {
    url: String,
    requests: Arc<Mutex<Vec<String>>>,
    stopped: Arc<AtomicBool>,
    worker: Option<JoinHandle<()>>,
}

impl Server {
    fn new(replies: Vec<Reply>) -> Self {
        let listener = TcpListener::bind("127.0.0.1:0").expect("bind fixture");
        listener.set_nonblocking(true).expect("nonblocking fixture");
        let url = format!("http://{}/component", listener.local_addr().unwrap());
        let requests = Arc::new(Mutex::new(Vec::new()));
        let stopped = Arc::new(AtomicBool::new(false));
        let worker_requests = Arc::clone(&requests);
        let worker_stopped = Arc::clone(&stopped);
        let worker = thread::spawn(move || {
            let mut replies = replies.into_iter();
            while !worker_stopped.load(Ordering::Acquire) {
                let (mut stream, _) = match listener.accept() {
                    Ok(connection) => connection,
                    Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                        thread::sleep(Duration::from_millis(2));
                        continue;
                    }
                    Err(error) => panic!("fixture accept: {error}"),
                };
                // BSD sockets inherit the listener's nonblocking flag; fixture I/O is blocking.
                stream
                    .set_nonblocking(false)
                    .expect("blocking fixture stream");
                stream
                    .set_read_timeout(Some(Duration::from_secs(5)))
                    .unwrap();
                stream
                    .set_write_timeout(Some(Duration::from_secs(5)))
                    .unwrap();
                let request = read_request(&mut stream);
                worker_requests.lock().unwrap().push(request);
                let Some(reply) = replies.next() else {
                    continue;
                };
                if reply.status == 0 {
                    continue;
                }
                let range = if reply.status == 206 {
                    format!(
                        "Content-Range: bytes {}-{}/{}\r\n",
                        3,
                        reply.declared_bytes + 2,
                        reply.declared_bytes + 3
                    )
                } else {
                    String::new()
                };
                write!(stream, "HTTP/1.1 {} Fixture\r\nContent-Length: {}\r\nETag: {}\r\n{}Connection: close\r\n\r\n", reply.status, reply.declared_bytes, reply.etag, range).unwrap();
                stream.write_all(&reply.body).unwrap();
                stream.flush().unwrap();
                if reply.stall {
                    // The client deadline or terminated owner closes this connection. This outer
                    // guard exceeds the cross-process fixture's 15-second observation deadline.
                    stream
                        .set_read_timeout(Some(Duration::from_secs(30)))
                        .unwrap();
                    let _ = stream.read(&mut [0_u8; 1]);
                }
            }
        });
        Self {
            url,
            requests,
            stopped,
            worker: Some(worker),
        }
    }

    fn requests(&self) -> Vec<String> {
        self.requests.lock().unwrap().clone()
    }
}

impl Drop for Server {
    fn drop(&mut self) {
        self.stopped.store(true, Ordering::Release);
        if let Some(worker) = self.worker.take() {
            worker.join().expect("fixture worker");
        }
    }
}

fn read_request(stream: &mut TcpStream) -> String {
    let mut bytes = Vec::new();
    while !bytes.ends_with(b"\r\n\r\n") {
        assert!(
            bytes.len() < 16 * 1024,
            "fixture request headers exceed 16 KiB"
        );
        let mut byte = [0_u8];
        stream.read_exact(&mut byte).unwrap_or_else(|error| {
            panic!(
                "cannot read complete fixture request after {} bytes: {error}",
                bytes.len()
            )
        });
        bytes.push(byte[0]);
    }
    String::from_utf8(bytes).unwrap().to_ascii_lowercase()
}

fn manager(root: &Path, url: &str, bytes: &[u8]) -> ComponentManager {
    let mut manifest = tests::manifest();
    let spec = manifest.components.get_mut("harness").unwrap();
    spec.bytes = bytes.len() as u64;
    spec.sha256 = hex::encode(Sha256::digest(bytes));
    ComponentManager {
        root: root.into(),
        resource_dir: root.join("resources"),
        manifest,
        client: Client::builder()
            .no_proxy()
            .timeout(Duration::from_secs(5))
            .build()
            .unwrap(),
        progress: None,
        download_url: Some(url.into()),
    }
}

fn metrics(manager: &ComponentManager) -> super::super::component_metrics::MetricsSnapshot {
    let keys = manager
        .catalog()
        .components
        .keys()
        .cloned()
        .collect::<Vec<_>>();
    ComponentMetrics::open(
        &manager.cache_root().join("statistics"),
        &manager.catalog().app_version,
        &keys,
    )
    .unwrap()
    .snapshot()
    .unwrap()
}

fn seed_partial(manager: &ComponentManager, url: &str, bytes: &[u8], etag: &str) -> PathBuf {
    let spec = manager.spec("harness").unwrap();
    let downloads = manager.root.join("downloads");
    fs::create_dir_all(&downloads).unwrap();
    let partial = downloads.join(format!("{}.partial", spec.archive));
    fs::write(&partial, bytes).unwrap();
    fs::write(
        downloads.join(format!("{}.partial.json", spec.archive)),
        serde_json::to_vec(&PartialMetadata {
            url: url.into(),
            sha256: spec.sha256.clone(),
            bytes: spec.bytes,
            etag: Some(etag.into()),
        })
        .unwrap(),
    )
    .unwrap();
    partial
}

fn harness_archive() -> Vec<u8> {
    let mut archive = tar::Builder::new(Vec::new());
    let body = b"startup harness";
    let mut header = tar::Header::new_gnu();
    header.set_size(body.len() as u64);
    header.set_mode(0o644);
    header.set_cksum();
    archive
        .append_data(&mut header, "harness.txt", body.as_slice())
        .unwrap();
    let tar = archive.into_inner().unwrap();
    zstd::stream::encode_all(tar.as_slice(), 1).unwrap()
}

#[tokio::test]
async fn interrupted_download_resumes_without_activating_prepared_components() {
    let body = harness_archive();
    let mut first = Reply::new(200, "\"v1\"", &body[..3]);
    first.declared_bytes = body.len();
    let server = Server::new(vec![first, Reply::new(206, "\"v1\"", &body[3..])]);
    let root = tempfile::tempdir().unwrap();
    let events = Arc::new(Mutex::new(Vec::new()));
    let observer_events = Arc::clone(&events);
    let active_path = root.path().join("active.json");
    let manager = manager(root.path(), &server.url, &body).with_progress(Arc::new(move |event| {
        if matches!(event, ComponentProgress::Retry { .. }) {
            let active: serde_json::Value =
                serde_json::from_slice(&fs::read(&active_path).unwrap()).unwrap();
            assert_eq!(active["components"]["harness"]["id"], "old");
        }
        observer_events.lock().unwrap().push(event);
    }));
    fs::write(
        root.path().join("active.json"),
        r#"{"schemaVersion":1,"components":{"harness":{"id":"old"}}}"#,
    )
    .unwrap();
    let destination = manager.ensure_startup().await.unwrap();
    assert_eq!(
        fs::read(destination.join("harness.txt")).unwrap(),
        b"startup harness"
    );
    assert!(destination.join(".complete").is_file());
    let partial = root.path().join("downloads").join(format!(
        "{}.partial",
        manager.spec("harness").unwrap().archive
    ));
    assert!(!partial.exists());
    assert!(!partial.with_extension("partial.json").exists());
    let counters = &metrics(&manager).components["harness"];
    assert_eq!(counters.network_bytes, body.len() as u64);
    assert_eq!(counters.retransferred_bytes, 0);
    assert_eq!(counters.resume_attempts, 1);
    assert_eq!(counters.resume_successes, 1);
    assert_eq!(counters.installs, 1);
    assert_eq!(counters.cache_archive_bytes, 0);
    assert_eq!(counters.offline_seed_archive_bytes, 0);
    let requests = server.requests();
    assert_eq!(requests.len(), 2);
    assert!(!requests[0].contains("range:"));
    assert!(requests[1].contains("range: bytes=3-\r\n"));
    assert!(requests[1].contains("if-range: \"v1\"\r\n"));
    let events = events.lock().unwrap();
    assert!(events.contains(&ComponentProgress::Retry {
        component: "harness".into(),
        attempt: 2,
        max_attempts: 3
    }));
    assert!(events.contains(&ComponentProgress::Download {
        component: "harness".into(),
        transferred: body.len() as u64,
        total: body.len() as u64
    }));
    let active: serde_json::Value =
        serde_json::from_slice(&fs::read(root.path().join("active.json")).unwrap()).unwrap();
    assert_eq!(active["components"]["harness"]["id"], "old");
}

#[tokio::test]
async fn ignored_range_and_changed_etag_restart_instead_of_appending() {
    for etag in ["\"v1\"", "\"v2\""] {
        let server = Server::new(vec![Reply::new(200, etag, b"abcdef")]);
        let root = tempfile::tempdir().unwrap();
        let manager = manager(root.path(), &server.url, b"abcdef");
        seed_partial(&manager, &server.url, b"old", "\"v1\"");
        let path = manager
            .obtain_archive(
                "harness",
                manager.spec("harness").unwrap(),
                &mut PreparationMetrics::default(),
            )
            .await
            .unwrap();
        assert_eq!(fs::read(&path).unwrap(), b"abcdef");
        let requests = server.requests();
        assert_eq!(requests.len(), 1);
        assert!(requests[0].contains("range: bytes=3-\r\n"));
        assert!(requests[0].contains("if-range: \"v1\"\r\n"));
        let metadata: PartialMetadata =
            serde_json::from_slice(&fs::read(path.with_extension("partial.json")).unwrap())
                .unwrap();
        assert_eq!(metadata.etag.as_deref(), Some(etag));
    }
}

#[tokio::test]
async fn exhausted_transport_and_http_retries_keep_partial_and_previous_active() {
    for status in [0, 503] {
        let server = Server::new(
            (0..DOWNLOAD_ATTEMPTS)
                .map(|_| Reply::new(status, "\"v1\"", b""))
                .collect(),
        );
        let root = tempfile::tempdir().unwrap();
        let manager = manager(root.path(), &server.url, b"abcdef");
        let partial = seed_partial(&manager, &server.url, b"abc", "\"v1\"");
        fs::write(root.path().join("active.json"), b"previous activation").unwrap();
        let old_harness = root.path().join("harness/old");
        fs::create_dir_all(&old_harness).unwrap();
        fs::write(old_harness.join(".complete"), b"previous digest").unwrap();
        fs::write(old_harness.join("harness.txt"), b"previous harness").unwrap();
        assert!(manager.ensure_startup().await.is_err());
        assert_eq!(
            fs::read(old_harness.join(".complete")).unwrap(),
            b"previous digest"
        );
        assert_eq!(
            fs::read(old_harness.join("harness.txt")).unwrap(),
            b"previous harness"
        );
        assert_eq!(server.requests().len(), DOWNLOAD_ATTEMPTS);
        let counters = &metrics(&manager).components["harness"];
        assert_eq!(counters.network_bytes, 0);
        assert_eq!(counters.resume_attempts, DOWNLOAD_ATTEMPTS as u64);
        assert_eq!(counters.resume_successes, 0);
        assert_eq!(counters.installs, 0);
        assert_eq!(fs::read(&partial).unwrap(), b"abc");
        assert!(partial.with_extension("partial.json").is_file());
        assert_eq!(
            fs::read(root.path().join("active.json")).unwrap(),
            b"previous activation"
        );
        assert!(root.path().join("component.lock").is_file());
        assert!(manager.lock().is_ok());
    }
}

#[tokio::test]
async fn slow_body_times_out_and_resumes_saved_bytes() {
    let mut first = Reply::new(200, "\"v1\"", b"abc");
    first.declared_bytes = 6;
    first.stall = true;
    let server = Server::new(vec![first, Reply::new(206, "\"v1\"", b"def")]);
    let root = tempfile::tempdir().unwrap();
    let mut manager = manager(root.path(), &server.url, b"abcdef");
    manager.client = Client::builder()
        .no_proxy()
        .read_timeout(Duration::from_millis(100))
        .timeout(Duration::from_secs(5))
        .build()
        .unwrap();
    let path = manager
        .obtain_archive(
            "harness",
            manager.spec("harness").unwrap(),
            &mut PreparationMetrics::default(),
        )
        .await
        .unwrap();
    assert_eq!(fs::read(path).unwrap(), b"abcdef");
    assert_eq!(server.requests().len(), 2);
    assert!(server.requests()[1].contains("range: bytes=3-\r\n"));
}

#[tokio::test]
async fn corrupt_download_is_not_retried_or_activated_and_manual_retry_can_recover() {
    let body = harness_archive();
    let corrupted = vec![b'x'; body.len()];
    let server = Server::new(vec![
        Reply::new(200, "\"bad\"", &corrupted),
        Reply::new(200, "\"good\"", &body),
    ]);
    let root = tempfile::tempdir().unwrap();
    let manager = manager(root.path(), &server.url, &body);
    let old = r#"{"schemaVersion":1,"components":{"harness":{"id":"old"}}}"#;
    fs::write(root.path().join("active.json"), old).unwrap();
    assert!(manager
        .ensure_startup()
        .await
        .unwrap_err()
        .contains("digest mismatch"));
    assert_eq!(server.requests().len(), 1);
    assert_eq!(
        fs::read_to_string(root.path().join("active.json")).unwrap(),
        old
    );
    let spec = manager.spec("harness").unwrap();
    assert!(!root
        .path()
        .join("downloads")
        .join(format!("{}.partial", spec.archive))
        .exists());
    let failed = metrics(&manager);
    assert_eq!(
        failed.components["harness"].network_bytes,
        body.len() as u64
    );
    assert_eq!(failed.components["harness"].installs, 0);
    let destination = manager.ensure_startup().await.unwrap();
    assert!(destination.join(".complete").is_file());
    let recovered = metrics(&manager);
    assert_eq!(
        recovered.components["harness"].network_bytes,
        body.len() as u64 * 2
    );
    assert_eq!(recovered.components["harness"].retransferred_bytes, 0);
    assert_eq!(recovered.components["harness"].installs, 1);
    assert_eq!(server.requests().len(), 2);
    assert!(!server.requests()[1].contains("range:"));
}

#[tokio::test]
async fn permanent_http_error_does_not_retry() {
    let server = Server::new(vec![Reply::new(404, "\"v1\"", b"unconsumed error payload")]);
    let root = tempfile::tempdir().unwrap();
    let manager = manager(root.path(), &server.url, b"abcdef");
    let error = manager.ensure_startup().await.unwrap_err();
    assert!(
        error.contains("404"),
        "expected HTTP 404, received: {error}"
    );
    assert_eq!(server.requests().len(), 1);
    assert_eq!(metrics(&manager).components["harness"].network_bytes, 0);
}

#[tokio::test]
async fn complete_partial_is_prepared_and_reused_without_a_range_request() {
    let body = harness_archive();
    let server = Server::new(vec![]);
    let root = tempfile::tempdir().unwrap();
    let manager = manager(root.path(), &server.url, &body);
    let partial = seed_partial(&manager, &server.url, &body, "\"v1\"");
    let unrelated = root.path().join("downloads/previous-release.partial");
    fs::write(&unrelated, b"retain previous download").unwrap();
    assert!(manager
        .ensure_startup()
        .await
        .unwrap()
        .join(".complete")
        .is_file());
    assert!(!partial.exists());
    assert!(!partial.with_extension("partial.json").exists());
    assert_eq!(fs::read(unrelated).unwrap(), b"retain previous download");
    let first = manager.installed("harness").unwrap().unwrap();
    let observed = metrics(&manager);
    assert_eq!(
        observed.components["harness"].cache_archive_bytes,
        body.len() as u64
    );
    assert_eq!(observed.components["harness"].network_bytes, 0);
    assert_eq!(observed.components["harness"].installs, 1);
    assert_eq!(manager.ensure_startup().await.unwrap(), first);
    assert_eq!(metrics(&manager), observed);
    assert!(!root.path().join("active.json").exists());
    assert!(server.requests().is_empty());
}

#[tokio::test]
async fn failed_preparation_keeps_verified_download_until_successful_retry() {
    let body = harness_archive();
    let server = Server::new(vec![Reply::new(200, "\"v1\"", &body)]);
    let root = tempfile::tempdir().unwrap();
    let manager = manager(root.path(), &server.url, &body);
    let spec = manager.spec("harness").unwrap();
    let destination = component_path(root.path(), "harness", &spec.id).unwrap();
    let parent = destination.parent().unwrap();
    fs::write(parent, b"block destination creation").unwrap();
    fs::write(root.path().join("active.json"), b"previous activation").unwrap();
    assert!(manager
        .ensure_startup()
        .await
        .unwrap_err()
        .contains("cannot create component destination"));
    let partial = root
        .path()
        .join("downloads")
        .join(format!("{}.partial", spec.archive));
    assert_eq!(fs::read(&partial).unwrap(), body);
    let metadata = partial.with_extension("partial.json");
    assert!(metadata.is_file());
    fs::remove_file(parent).unwrap();
    assert_eq!(manager.ensure_startup().await.unwrap(), destination);
    assert!(destination.join(".complete").is_file());
    assert!(!partial.exists());
    assert!(!metadata.exists());
    assert_eq!(server.requests().len(), 1);
    assert_eq!(
        fs::read(root.path().join("active.json")).unwrap(),
        b"previous activation"
    );
}

#[tokio::test]
async fn offline_seed_and_installed_fast_path_leave_other_downloads_untouched() {
    let body = harness_archive();
    let server = Server::new(vec![]);
    let root = tempfile::tempdir().unwrap();
    let manager = manager(root.path(), &server.url, &body);
    let partial = seed_partial(&manager, &server.url, &body[..3], "\"v1\"");
    let metadata = fs::read(partial.with_extension("partial.json")).unwrap();
    let seeds = manager.resource_dir.join("component-seeds");
    fs::create_dir_all(&seeds).unwrap();
    let seed = seeds.join(&manager.spec("harness").unwrap().archive);
    fs::write(&seed, &body).unwrap();
    for _ in 0..2 {
        assert!(manager
            .ensure_startup()
            .await
            .unwrap()
            .join(".complete")
            .is_file());
        assert_eq!(fs::read(&seed).unwrap(), body);
        assert_eq!(fs::read(&partial).unwrap(), body[..3]);
        assert_eq!(
            fs::read(partial.with_extension("partial.json")).unwrap(),
            metadata
        );
    }
    assert!(server.requests().is_empty());
}

#[tokio::test]
async fn cleanup_failure_keeps_installation_and_does_not_remove_directories() {
    let body = harness_archive();
    let server = Server::new(vec![Reply::new(200, "\"v1\"", &body)]);
    let root = tempfile::tempdir().unwrap();
    let manager = manager(root.path(), &server.url, &body);
    let partial = root.path().join("downloads").join(format!(
        "{}.partial",
        manager.spec("harness").unwrap().archive
    ));
    let metadata = partial.with_extension("partial.json");
    let replaced_metadata = metadata.clone();
    let manager = manager.with_progress(Arc::new(move |event| {
        if matches!(
            event,
            ComponentProgress::Phase {
                phase: "unpack",
                ..
            }
        ) {
            fs::remove_file(&replaced_metadata).unwrap();
            fs::create_dir(&replaced_metadata).unwrap();
            fs::write(replaced_metadata.join("user-file"), b"retain exactly").unwrap();
        }
    }));
    let destination = manager.ensure_startup().await.unwrap();
    assert!(destination.join(".complete").is_file());
    assert!(!partial.exists());
    assert_eq!(
        fs::read(metadata.join("user-file")).unwrap(),
        b"retain exactly"
    );
    assert_eq!(metrics(&manager).components["harness"].installs, 1);
}

#[test]
fn retries_only_selected_transient_http_statuses() {
    for status in [408, 429, 500, 502, 503, 504] {
        assert!(retryable_status(StatusCode::from_u16(status).unwrap()));
    }
    for status in [400, 401, 403, 404, 416, 501] {
        assert!(!retryable_status(StatusCode::from_u16(status).unwrap()));
    }
}

#[tokio::test]
async fn readiness_failure_and_commit_failure_preserve_active_until_successful_retry() {
    let body = harness_archive();
    let server = Server::new(vec![Reply::new(200, "\"v1\"", &body)]);
    let root = tempfile::tempdir().unwrap();
    let mut manager = manager(root.path(), &server.url, &body);
    let mut node = manager.spec("harness").unwrap().clone();
    node.id = "node:current".into();
    node.kind = super::super::component_plan::ComponentKind::RuntimeFallback;
    manager.manifest.components.insert("node".into(), node);
    let original = r#"{"schemaVersion":1,"appVersion":"previous","components":{"harness":{"id":"old"},"harbor":{"id":"old-harbor"}}}"#;
    let active_path = root.path().join("active.json");
    fs::write(&active_path, original).unwrap();
    let old_tree = root.path().join("harness/old");
    fs::create_dir_all(&old_tree).unwrap();
    fs::write(old_tree.join("user-data"), b"retain exactly").unwrap();
    let prepared = manager.ensure_startup().await.unwrap();
    let seed = manager.resource_dir.join("component-seeds");
    fs::create_dir_all(&seed).unwrap();
    fs::write(seed.join(&manager.spec("node").unwrap().archive), &body).unwrap();
    manager.ensure("node").await.unwrap();
    assert_eq!(fs::read_to_string(&active_path).unwrap(), original);
    let manager = Arc::new(manager);
    let (entered_tx, entered_rx) = tokio::sync::oneshot::channel();
    let (ready_tx, ready_rx) = tokio::sync::oneshot::channel::<Result<(), String>>();
    let waiting_manager = Arc::clone(&manager);
    let pending = tokio::spawn(async move {
        waiting_manager
            .activate_after_ready(async {
                entered_tx.send(()).unwrap();
                ready_rx.await.unwrap()
            })
            .await
    });
    entered_rx.await.unwrap();
    assert_eq!(fs::read_to_string(&active_path).unwrap(), original);
    ready_tx
        .send(Err("authenticated readiness failed".into()))
        .unwrap();
    assert_eq!(
        pending.await.unwrap().unwrap_err(),
        "authenticated readiness failed"
    );
    assert_eq!(fs::read_to_string(&active_path).unwrap(), original);
    assert_eq!(manager.ensure_startup().await.unwrap(), prepared);
    let lock = manager.lock().unwrap();
    assert!(manager
        .activate_after_ready(async { Ok(()) })
        .await
        .unwrap_err()
        .contains("another component operation"));
    drop(lock);
    assert_eq!(fs::read_to_string(&active_path).unwrap(), original);
    let blocked_commit = root.path().join("active.json.next");
    fs::create_dir(&blocked_commit).unwrap();
    assert!(manager
        .activate_after_ready(async { Ok(()) })
        .await
        .unwrap_err()
        .contains("cannot write active component state"));
    assert_eq!(fs::read_to_string(&active_path).unwrap(), original);
    fs::remove_dir(blocked_commit).unwrap();
    assert_eq!(
        manager
            .activate_after_ready(async { Ok("runtime ready") })
            .await
            .unwrap(),
        "runtime ready"
    );
    let active: serde_json::Value =
        serde_json::from_slice(&fs::read(&active_path).unwrap()).unwrap();
    assert_eq!(active["appVersion"], manager.manifest.app_version);
    assert_eq!(active["components"].as_object().unwrap().len(), 2);
    assert_eq!(
        active["components"]["harness"]["id"],
        manager.spec("harness").unwrap().id
    );
    assert_eq!(active["components"]["node"]["id"], "node:current");
    assert_eq!(
        fs::read(old_tree.join("user-data")).unwrap(),
        b"retain exactly"
    );
    assert_eq!(server.requests().len(), 1);
}

#[tokio::test]
async fn incomplete_or_mismatched_targets_are_preserved_when_replaced() {
    for marker in [None, Some("different digest\n")] {
        let body = harness_archive();
        let corrupt = vec![b'x'; body.len()];
        let server = Server::new(vec![
            Reply::new(200, "\"bad\"", &corrupt),
            Reply::new(200, "\"good\"", &body),
        ]);
        let root = tempfile::tempdir().unwrap();
        let manager = manager(root.path(), &server.url, &body);
        let destination =
            component_path(root.path(), "harness", &manager.spec("harness").unwrap().id).unwrap();
        fs::create_dir_all(&destination).unwrap();
        fs::write(destination.join("user-data"), b"keep this target").unwrap();
        if let Some(marker) = marker {
            fs::write(destination.join(".complete"), marker).unwrap();
        }
        fs::write(root.path().join("active.json"), b"unchanged activation").unwrap();
        assert!(manager.installed("harness").unwrap().is_none());
        assert!(manager
            .ensure_startup()
            .await
            .unwrap_err()
            .contains("digest mismatch"));
        assert_eq!(
            fs::read(destination.join("user-data")).unwrap(),
            b"keep this target"
        );
        assert!(!root.path().join("quarantine").exists());
        assert_eq!(manager.ensure_startup().await.unwrap(), destination);
        assert_eq!(
            fs::read(destination.join("harness.txt")).unwrap(),
            b"startup harness"
        );
        let retained: Vec<_> = fs::read_dir(root.path().join("quarantine"))
            .unwrap()
            .map(|entry| entry.unwrap().path().join("component"))
            .collect();
        assert_eq!(retained.len(), 1);
        assert_eq!(
            fs::read(retained[0].join("user-data")).unwrap(),
            b"keep this target"
        );
        assert_eq!(
            fs::read_to_string(retained[0].join(".complete"))
                .ok()
                .as_deref(),
            marker
        );
        assert_eq!(
            fs::read(root.path().join("active.json")).unwrap(),
            b"unchanged activation"
        );
        assert_eq!(manager.ensure_startup().await.unwrap(), destination);
        assert_eq!(server.requests().len(), 2);
    }
}

#[test]
fn activation_without_current_prepared_harness_preserves_previous_record() {
    let root = tempfile::tempdir().unwrap();
    let manager = manager(root.path(), "http://127.0.0.1:1/not-requested", b"archive");
    fs::write(root.path().join("active.json"), b"previous activation").unwrap();
    assert_eq!(
        manager.activate_prepared().unwrap_err(),
        "current startup harness is not prepared"
    );
    assert_eq!(
        fs::read(root.path().join("active.json")).unwrap(),
        b"previous activation"
    );
}

/// Spawn only this fixture in an owned process; the ordinary suite has no child inputs.
#[tokio::test]
async fn resumed_download_child_fixture() {
    let Some(root) = std::env::var_os("YOURBUDDY_RESUME_TEST_ROOT") else {
        return;
    };
    let url = std::env::var("YOURBUDDY_RESUME_TEST_URL").unwrap();
    let root = PathBuf::from(root);
    let body = harness_archive();
    let mut manager = manager(&root, &url, &body);
    manager.client = Client::builder()
        .no_proxy()
        .timeout(Duration::from_secs(30))
        .build()
        .unwrap();
    let destination = manager.ensure_startup().await.unwrap();
    assert_eq!(
        fs::read(destination.join("harness.txt")).unwrap(),
        b"startup harness"
    );
    assert!(destination.join(".complete").is_file());
}

/// Own the child until its exit is observed, including when a parent assertion fails.
struct DownloadChild(std::process::Child);

impl DownloadChild {
    fn spawn(root: &Path, url: &str) -> Self {
        Self(
            std::process::Command::new(std::env::current_exe().unwrap())
                .args([
                    "--exact",
                    "runtime::components::download_tests::resumed_download_child_fixture",
                    "--nocapture",
                ])
                .env("YOURBUDDY_RESUME_TEST_ROOT", root)
                .env("YOURBUDDY_RESUME_TEST_URL", url)
                .stdin(std::process::Stdio::null())
                .spawn()
                .unwrap(),
        )
    }

    fn wait(&mut self) -> std::process::ExitStatus {
        let deadline = Instant::now() + Duration::from_secs(20);
        loop {
            if let Some(status) = self.0.try_wait().unwrap() {
                return status;
            }
            assert!(Instant::now() < deadline, "component child did not exit");
            thread::sleep(Duration::from_millis(5));
        }
    }
}

impl Drop for DownloadChild {
    fn drop(&mut self) {
        let _ = self.0.kill();
        let _ = self.0.wait();
    }
}

#[test]
fn terminated_process_releases_its_os_lock_and_a_new_process_resumes_the_partial() {
    let body = harness_archive();
    let mut first = Reply::new(200, "\"v1\"", &body[..3]);
    first.declared_bytes = body.len();
    first.stall = true;
    let server = Server::new(vec![first, Reply::new(206, "\"v1\"", &body[3..])]);
    let root = tempfile::tempdir().unwrap();
    let expected = manager(root.path(), &server.url, &body);
    let spec = expected.spec("harness").unwrap();
    let partial = root
        .path()
        .join("downloads")
        .join(format!("{}.partial", spec.archive));
    let active = root.path().join("active.json");
    fs::write(&active, b"previous activation remains unchanged").unwrap();
    let mut first = DownloadChild::spawn(root.path(), &server.url);
    let deadline = Instant::now() + Duration::from_secs(15);
    loop {
        let bytes_saved = fs::metadata(&partial).is_ok_and(|value| value.len() == 3);
        let metadata_saved = fs::read(partial.with_extension("partial.json"))
            .ok()
            .and_then(|bytes| serde_json::from_slice::<PartialMetadata>(&bytes).ok())
            .is_some_and(|value| value.etag.as_deref() == Some("\"v1\""));
        if bytes_saved && metadata_saved {
            break;
        }
        assert!(
            first.0.try_wait().unwrap().is_none(),
            "first child exited before interruption"
        );
        assert!(
            Instant::now() < deadline,
            "first child did not persist partial bytes and ETag"
        );
        thread::sleep(Duration::from_millis(5));
    }
    let lock = root.path().join("component.lock");
    assert!(lock.is_file());
    assert_eq!(
        expected.lock().unwrap_err(),
        "another component operation is active"
    );
    first.0.kill().unwrap();
    assert!(
        !first.wait().success(),
        "the interrupted child must not finish normally"
    );
    assert!(
        lock.is_file(),
        "termination must preserve the permanent lock file"
    );
    assert_eq!(fs::read(&partial).unwrap(), body[..3]);
    drop(
        expected
            .lock()
            .expect("OS releases the terminated owner's lock"),
    );
    let mut second = DownloadChild::spawn(root.path(), &server.url);
    assert!(
        second.wait().success(),
        "the replacement process must finish normally"
    );
    assert!(lock.is_file());
    drop(
        expected
            .lock()
            .expect("completed download releases transaction ownership"),
    );
    let requests = server.requests();
    assert_eq!(requests.len(), 2);
    assert!(!requests[0].contains("range:"));
    assert!(requests[1].contains("range: bytes=3-\r\n"));
    assert!(requests[1].contains("if-range: \"v1\"\r\n"));
    assert!(!partial.exists());
    assert!(!partial.with_extension("partial.json").exists());
    assert!(expected.installed("harness").unwrap().is_some());
    assert_eq!(
        fs::read(active).unwrap(),
        b"previous activation remains unchanged"
    );
}

#[test]
fn installation_preview_requires_a_matching_completion_marker_and_has_no_activation_effect() {
    let root = tempfile::tempdir().unwrap();
    let manager = manager(root.path(), "http://127.0.0.1:1/unused", b"fixture");
    let spec = manager.spec("harness").unwrap();
    let path = component_path(root.path(), "harness", &spec.id).unwrap();
    fs::create_dir_all(&path).unwrap();
    for marker in [
        None,
        Some("wrong digest\n".to_string()),
        Some(format!("{}\n", spec.sha256)),
    ] {
        if let Some(value) = &marker {
            fs::write(path.join(".complete"), value).unwrap();
        }
        let plan = manager.installation_plan(&PlanRequest::Startup).unwrap();
        let expected = if marker
            .as_ref()
            .is_some_and(|value| value == &format!("{}\n", spec.sha256))
        {
            super::super::component_plan::PlanAction::Reuse
        } else {
            super::super::component_plan::PlanAction::Prepare
        };
        assert_eq!(plan.components[0].action, expected);
        assert!(!root.path().join("active.json").exists());
        assert!(!root.path().join("downloads").exists());
    }
}

#[tokio::test]
async fn executes_dependency_first_capability_plan_without_activating_a_prepared_pack() {
    let body = harness_archive();
    let root = tempfile::tempdir().unwrap();
    let mut manager = manager(root.path(), "http://127.0.0.1:1/not-requested", &body);
    let mut capability = manager.spec("harness").unwrap().clone();
    capability.id = "sha256:pomodoro".into();
    capability.archive = "yourbuddy-pomodoro-fixture.tar.zst".into();
    capability.kind = super::super::component_plan::ComponentKind::CapabilityOnDemand;
    capability.depends_on.insert(
        "harness".into(),
        manager.spec("harness").unwrap().id.clone(),
    );
    manager
        .manifest
        .components
        .insert("pomodoro".into(), capability);
    let seeds = manager.resource_dir.join("component-seeds");
    fs::create_dir_all(&seeds).unwrap();
    for key in ["harness", "pomodoro"] {
        fs::write(seeds.join(&manager.spec(key).unwrap().archive), &body).unwrap();
    }
    manager.ensure("pomodoro").await.unwrap();
    assert!(manager.installed("harness").unwrap().is_some());
    assert!(manager.installed("pomodoro").unwrap().is_some());
    assert!(manager.installed("node").unwrap().is_none());
    assert!(manager.installed("pnpmStore").unwrap().is_none());
    assert!(manager.installed("harbor").unwrap().is_none());
    assert!(!root.path().join("active.json").exists());
    manager.activate_prepared().unwrap();
    let active = || {
        serde_json::from_slice::<serde_json::Value>(
            &fs::read(root.path().join("active.json")).unwrap(),
        )
        .unwrap()
    };
    assert!(active()["components"].get("pomodoro").is_none());
    manager.activate_observed("pomodoro").unwrap();
    assert_eq!(active()["components"]["pomodoro"]["id"], "sha256:pomodoro");
    assert!(manager.activate_observed("node").is_err());
}

#[tokio::test]
async fn counts_same_ensure_retransmission_when_a_retry_ignores_range() {
    let body = harness_archive();
    let mut truncated = Reply::new(200, "\"v1\"", &body[..3]);
    truncated.declared_bytes = body.len();
    let server = Server::new(vec![truncated, Reply::new(200, "\"v2\"", &body)]);
    let root = tempfile::tempdir().unwrap();
    let manager = manager(root.path(), &server.url, &body);
    manager.ensure_startup().await.unwrap();
    let counters = &metrics(&manager).components["harness"];
    assert_eq!(counters.network_bytes, body.len() as u64 + 3);
    assert_eq!(counters.retransferred_bytes, 3);
    assert_eq!(counters.resume_attempts, 1);
    assert_eq!(counters.resume_successes, 0);
    assert_eq!(counters.installs, 1);
    assert!(server.requests()[1].contains("range: bytes=3-\r\n"));
}

#[tokio::test]
async fn prior_ensure_partial_bytes_are_not_counted_as_retransmission() {
    let body = harness_archive();
    let server = Server::new(vec![Reply::new(200, "\"v2\"", &body)]);
    let root = tempfile::tempdir().unwrap();
    let manager = manager(root.path(), &server.url, &body);
    seed_partial(&manager, &server.url, &body[..3], "\"v1\"");
    manager.ensure_startup().await.unwrap();
    let counters = &metrics(&manager).components["harness"];
    assert_eq!(counters.network_bytes, body.len() as u64);
    assert_eq!(counters.retransferred_bytes, 0);
    assert_eq!(counters.resume_attempts, 1);
    assert_eq!(counters.resume_successes, 0);
}

#[tokio::test]
async fn failed_stream_retries_count_every_delivered_chunk_and_repeated_interval() {
    let body = harness_archive();
    let server = Server::new(
        (0..DOWNLOAD_ATTEMPTS)
            .map(|_| {
                let mut reply = Reply::new(200, "\"v1\"", &body[..3]);
                reply.declared_bytes = body.len();
                reply
            })
            .collect(),
    );
    let root = tempfile::tempdir().unwrap();
    let manager = manager(root.path(), &server.url, &body);
    assert!(manager
        .ensure_startup()
        .await
        .unwrap_err()
        .contains("download failed"));
    let counters = &metrics(&manager).components["harness"];
    assert_eq!(counters.network_bytes, 9);
    assert_eq!(counters.retransferred_bytes, 6);
    assert_eq!(counters.resume_attempts, 2);
    assert_eq!(counters.resume_successes, 0);
    assert_eq!(counters.installs, 0);
}

#[tokio::test]
async fn resumed_hash_failure_counts_received_bytes_without_resume_success() {
    let body = harness_archive();
    let corrupted = vec![b'x'; body.len() - 3];
    let server = Server::new(vec![Reply::new(206, "\"v1\"", &corrupted)]);
    let root = tempfile::tempdir().unwrap();
    let manager = manager(root.path(), &server.url, &body);
    seed_partial(&manager, &server.url, &body[..3], "\"v1\"");
    assert!(manager
        .ensure_startup()
        .await
        .unwrap_err()
        .contains("digest mismatch"));
    let counters = &metrics(&manager).components["harness"];
    assert_eq!(counters.network_bytes, body.len() as u64 - 3);
    assert_eq!(counters.resume_attempts, 1);
    assert_eq!(counters.resume_successes, 0);
    assert_eq!(counters.installs, 0);
}

#[tokio::test]
async fn oversized_chunk_is_counted_before_the_archive_size_error() {
    let server = Server::new(vec![Reply::new(200, "\"v1\"", b"abcdefgh")]);
    let root = tempfile::tempdir().unwrap();
    let manager = manager(root.path(), &server.url, b"abcdef");
    assert!(manager
        .ensure_startup()
        .await
        .unwrap_err()
        .contains("exceeded declared size"));
    let counters = &metrics(&manager).components["harness"];
    assert_eq!(counters.network_bytes, 8);
    assert_eq!(counters.installs, 0);
}

#[tokio::test]
async fn tampered_complete_cache_is_replaced_without_crediting_archive_reuse() {
    let body = harness_archive();
    let server = Server::new(vec![Reply::new(200, "\"v1\"", &body)]);
    let root = tempfile::tempdir().unwrap();
    let manager = manager(root.path(), &server.url, &body);
    seed_partial(&manager, &server.url, &vec![b'x'; body.len()], "\"v1\"");
    manager.ensure_startup().await.unwrap();
    let counters = &metrics(&manager).components["harness"];
    assert_eq!(counters.cache_archive_bytes, 0);
    assert_eq!(counters.network_bytes, body.len() as u64);
    assert_eq!(counters.resume_attempts, 0);
    assert_eq!(counters.installs, 1);
}

#[tokio::test]
async fn offline_archive_credit_requires_hash_verification_and_install_credit_requires_unpacking() {
    let body = harness_archive();
    for (payload, expected_bytes, installs) in [
        (body.clone(), body.clone(), 1),
        (vec![b'x'; body.len()], body.clone(), 0),
        (
            b"not a zstd archive".to_vec(),
            b"not a zstd archive".to_vec(),
            0,
        ),
    ] {
        let server = Server::new(vec![]);
        let root = tempfile::tempdir().unwrap();
        let manager = manager(root.path(), &server.url, &expected_bytes);
        let seeds = manager.resource_dir.join("component-seeds");
        fs::create_dir_all(&seeds).unwrap();
        fs::write(
            seeds.join(&manager.spec("harness").unwrap().archive),
            &payload,
        )
        .unwrap();
        let result = manager.ensure_startup().await;
        assert_eq!(result.is_ok(), installs == 1);
        let counters = &metrics(&manager).components["harness"];
        assert_eq!(counters.network_bytes, 0);
        assert_eq!(counters.cache_archive_bytes, 0);
        assert_eq!(
            counters.offline_seed_archive_bytes,
            if payload == expected_bytes {
                payload.len() as u64
            } else {
                0
            }
        );
        assert_eq!(counters.installs, installs);
        assert!(server.requests().is_empty());
    }
}

#[tokio::test]
async fn metrics_corruption_does_not_change_download_success_or_original_failure() {
    let body = harness_archive();
    for corrupt_download in [false, true] {
        let payload = if corrupt_download {
            vec![b'x'; body.len()]
        } else {
            body.clone()
        };
        let server = Server::new(vec![Reply::new(200, "\"v1\"", &payload)]);
        let root = tempfile::tempdir().unwrap();
        let manager = manager(root.path(), &server.url, &body);
        let statistics = manager.cache_root().join("statistics");
        fs::create_dir_all(&statistics).unwrap();
        fs::write(
            statistics.join("component-metrics.json"),
            b"broken aggregate",
        )
        .unwrap();
        let result = manager.ensure_startup().await;
        if corrupt_download {
            assert!(result.unwrap_err().contains("digest mismatch"));
        } else {
            assert!(result.unwrap().join(".complete").exists());
        }
        assert_eq!(
            fs::read(statistics.join("component-metrics.json")).unwrap(),
            b"broken aggregate"
        );
    }
}

#[tokio::test]
async fn metrics_lock_contention_does_not_block_async_timers_or_fail_installation() {
    let body = harness_archive();
    let server = Server::new(vec![Reply::new(200, "\"v1\"", &body)]);
    let root = tempfile::tempdir().unwrap();
    let manager = manager(root.path(), &server.url, &body);
    let initial = metrics(&manager);
    let lock = OpenOptions::new()
        .read(true)
        .write(true)
        .open(
            manager
                .cache_root()
                .join("statistics/component-metrics.lock"),
        )
        .unwrap();
    lock.lock().unwrap();
    let installation = manager.ensure_startup();
    tokio::pin!(installation);
    tokio::select! {
        _ = tokio::time::sleep(Duration::from_millis(30)) => {},
        result = &mut installation => panic!("metrics wait should yield the runtime, got {result:?}"),
    }
    assert!(installation.await.unwrap().join(".complete").is_file());
    drop(lock);
    assert_eq!(metrics(&manager), initial);
}

#[test]
fn chunk_interval_accounting_stays_bounded_and_refuses_overflow() {
    let mut observations = PreparationMetrics::default();
    observations.received(5, 3);
    observations.received(8, 2);
    observations.received(0, 7);
    observations.received(7, 3);
    assert_eq!(observations.network_bytes, 15);
    assert_eq!(observations.retransferred_bytes, 5);
    assert_eq!(observations.received_ranges, vec![(0, 10)]);
    for offset in 10..10000 {
        observations.received(offset, 1);
    }
    assert_eq!(observations.received_ranges.len(), 1);
    observations.network_bytes = u64::MAX;
    observations.received(10000, 1);
    assert!(observations.events("harness", 1).is_err());
}

#[tokio::test]
async fn aggregate_window_is_initialized_before_the_first_download_observation() {
    let body = harness_archive();
    let server = Server::new(vec![Reply::new(200, "\"v1\"", &body)]);
    let root = tempfile::tempdir().unwrap();
    let statistics = root.path().join("statistics/component-metrics.json");
    let observed = Arc::new(AtomicBool::new(false));
    let signal = Arc::clone(&observed);
    let manager = manager(root.path(), &server.url, &body).with_progress(Arc::new(move |event| {
        if matches!(event, ComponentProgress::Download { .. }) {
            let snapshot: super::super::component_metrics::MetricsSnapshot =
                serde_json::from_slice(&fs::read(&statistics).unwrap()).unwrap();
            assert!(snapshot.window_started_at_unix_ms > 0);
            assert_eq!(snapshot.components["harness"].network_bytes, 0);
            signal.store(true, Ordering::Release);
        }
    }));
    manager.ensure_startup().await.unwrap();
    assert!(observed.load(Ordering::Acquire));
    assert_eq!(
        metrics(&manager).components["harness"].network_bytes,
        body.len() as u64
    );
}

#[tokio::test]
async fn a_new_release_aggregate_during_download_is_not_replaced_by_the_old_flush() {
    let body = harness_archive();
    let server = Server::new(vec![Reply::new(200, "\"v1\"", &body)]);
    let root = tempfile::tempdir().unwrap();
    let manager = manager(root.path(), &server.url, &body);
    let statistics = manager.cache_root().join("statistics");
    let keys = manager
        .catalog()
        .components
        .keys()
        .cloned()
        .collect::<Vec<_>>();
    let observer_root = statistics.clone();
    let observer_keys = keys.clone();
    let manager = manager.with_progress(Arc::new(move |event| {
        if matches!(
            event,
            ComponentProgress::Phase {
                phase: "verify",
                ..
            }
        ) {
            let newer = ComponentMetrics::open(&observer_root, "0.5.0", &observer_keys).unwrap();
            newer.record(MetricEvent::BootStarted).unwrap();
        }
    }));
    assert!(manager
        .ensure_startup()
        .await
        .unwrap()
        .join(".complete")
        .is_file());
    let snapshot = ComponentMetrics::open(&statistics, "0.5.0", &keys)
        .unwrap()
        .snapshot()
        .unwrap();
    assert_eq!(snapshot.app_version, "0.5.0");
    assert_eq!(snapshot.boot_attempts, 1);
    assert_eq!(
        snapshot.components["harness"],
        super::super::component_metrics::ComponentCounters::default()
    );
}

fn await_fixture_signal(path: &Path) {
    let deadline = Instant::now() + Duration::from_secs(10);
    while !path.exists() {
        assert!(
            Instant::now() < deadline,
            "transaction fixture did not signal"
        );
        thread::sleep(Duration::from_millis(5));
    }
}

#[test]
fn transaction_lock_child_fixture() {
    let Some(root) = std::env::var_os("YOURBUDDY_TRANSACTION_TEST_ROOT") else {
        return;
    };
    let root = PathBuf::from(root);
    let name = std::env::var("YOURBUDDY_TRANSACTION_TEST_NAME").unwrap();
    let path = root.join("component.lock");
    assert_eq!(
        ComponentLock::acquire(path.clone()).unwrap_err(),
        "another component operation is active"
    );
    fs::write(root.join(format!("blocked-{name}")), b"").unwrap();
    await_fixture_signal(&root.join("contend"));
    let deadline = Instant::now() + Duration::from_secs(10);
    let lock = loop {
        match ComponentLock::acquire(path.clone()) {
            Ok(lock) => break lock,
            Err(error) => {
                assert_eq!(error, "another component operation is active");
                assert!(
                    Instant::now() < deadline,
                    "transaction contender never acquired ownership"
                );
                thread::sleep(Duration::from_millis(5));
            }
        }
    };
    let critical_path = root.join("critical-section");
    let critical = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&critical_path)
        .expect("only one OS transaction owner may enter the critical section");
    fs::write(root.join(format!("acquired-{name}")), b"").unwrap();
    await_fixture_signal(&root.join(format!("release-{name}")));
    drop(critical);
    fs::remove_file(critical_path).unwrap();
    drop(lock);
}

fn spawn_transaction_contender(root: &Path, name: &str) -> DownloadChild {
    let mut command = std::process::Command::new(std::env::current_exe().unwrap());
    command
        .args([
            "--exact",
            "runtime::components::download_tests::transaction_lock_child_fixture",
            "--nocapture",
        ])
        .env_clear()
        .env("YOURBUDDY_TRANSACTION_TEST_ROOT", root)
        .env("YOURBUDDY_TRANSACTION_TEST_NAME", name)
        .stdin(std::process::Stdio::null());
    #[cfg(windows)]
    for name in ["SystemRoot", "PATH", "TEMP", "TMP"] {
        if let Some(value) = std::env::var_os(name) {
            command.env(name, value);
        }
    }
    DownloadChild(command.spawn().unwrap())
}

#[test]
fn one_owner_and_two_process_contenders_share_one_permanent_lock_inode() {
    let root = tempfile::tempdir().unwrap();
    let path = root.path().join("component.lock");
    let legacy = b"\xffmalformed legacy owner record";
    fs::write(&path, legacy).unwrap();
    let owner = ComponentLock::acquire(path.clone()).unwrap();
    #[cfg(unix)]
    let inode = {
        use std::os::unix::fs::MetadataExt;
        fs::metadata(&path).unwrap().ino()
    };
    let mut first = spawn_transaction_contender(root.path(), "a");
    let mut second = spawn_transaction_contender(root.path(), "b");
    await_fixture_signal(&root.path().join("blocked-a"));
    await_fixture_signal(&root.path().join("blocked-b"));
    assert_eq!(fs::read(&path).unwrap(), legacy);
    drop(owner);
    fs::write(root.path().join("contend"), b"").unwrap();
    let deadline = Instant::now() + Duration::from_secs(10);
    let (winner, waiter) = loop {
        let a = root.path().join("acquired-a").exists();
        let b = root.path().join("acquired-b").exists();
        assert!(!(a && b), "two contenders entered the same transaction");
        if a {
            break ("a", "b");
        }
        if b {
            break ("b", "a");
        }
        assert!(
            Instant::now() < deadline,
            "neither contender acquired the released lock"
        );
        thread::sleep(Duration::from_millis(5));
    };
    assert_eq!(
        ComponentLock::acquire(path.clone()).unwrap_err(),
        "another component operation is active"
    );
    fs::write(root.path().join(format!("release-{winner}")), b"").unwrap();
    await_fixture_signal(&root.path().join(format!("acquired-{waiter}")));
    assert_eq!(
        ComponentLock::acquire(path.clone()).unwrap_err(),
        "another component operation is active"
    );
    fs::write(root.path().join(format!("release-{waiter}")), b"").unwrap();
    assert!(first.wait().success());
    assert!(second.wait().success());
    drop(ComponentLock::acquire(path.clone()).unwrap());
    assert_eq!(fs::read(&path).unwrap(), legacy);
    #[cfg(unix)]
    {
        use std::os::unix::fs::MetadataExt;
        assert_eq!(fs::metadata(&path).unwrap().ino(), inode);
    }
}

#[test]
fn cache_path_aliases_contend_and_unwinding_releases_only_owned_handles() {
    let root = tempfile::tempdir().unwrap();
    fs::create_dir(root.path().join("child")).unwrap();
    let canonical = fs::canonicalize(root.path())
        .unwrap()
        .join("component.lock");
    let alias = root.path().join("child/../component.lock");
    let owner = ComponentLock::acquire(alias.clone()).unwrap();
    assert_eq!(
        ComponentLock::acquire(canonical.clone()).unwrap_err(),
        "another component operation is active"
    );
    assert_eq!(
        ComponentLock::acquire(root.path().join("./component.lock")).unwrap_err(),
        "another component operation is active"
    );
    drop(owner);
    let unwind = std::panic::catch_unwind(|| {
        let _owner = ComponentLock::acquire(canonical.clone()).unwrap();
        panic!("fixture operation failed");
    });
    assert!(unwind.is_err());
    drop(ComponentLock::acquire(alias).unwrap());
    assert!(canonical.is_file());
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        assert_eq!(
            fs::metadata(canonical).unwrap().permissions().mode() & 0o777,
            0o600
        );
    }
}

#[tokio::test]
async fn busy_transaction_returns_without_network_work_or_runtime_waiting() {
    let body = harness_archive();
    let server = Server::new(vec![]);
    let root = tempfile::tempdir().unwrap();
    let manager = manager(root.path(), &server.url, &body);
    let owner = manager.lock().unwrap();
    assert_eq!(
        tokio::time::timeout(Duration::from_millis(100), manager.ensure_startup())
            .await
            .unwrap()
            .unwrap_err(),
        "another component operation is active"
    );
    assert!(server.requests().is_empty());
    assert!(!manager.cache_root().join("downloads").exists());
    assert!(manager.lock().is_err());
    drop(owner);
    assert!(manager.lock().is_ok());
}

#[test]
fn transaction_lock_refuses_directory_entries_and_missing_parents() {
    let root = tempfile::tempdir().unwrap();
    let path = root.path().join("component.lock");
    fs::create_dir(&path).unwrap();
    assert!(ComponentLock::acquire(path.clone()).is_err());
    assert!(path.is_dir());
    let missing = root.path().join("missing/component.lock");
    assert!(ComponentLock::acquire(missing.clone()).is_err());
    assert!(!missing.exists());
}

#[cfg(unix)]
#[test]
fn transaction_lock_refuses_symlinks_hardlinks_and_fifos_without_modifying_targets() {
    use std::os::unix::ffi::OsStrExt;
    use std::os::unix::fs::{symlink, MetadataExt};
    let outside = tempfile::tempdir().unwrap();
    let target = outside.path().join("target");
    fs::write(&target, b"untouched").unwrap();
    for kind in ["symlink", "dangling", "hardlink", "fifo"] {
        let root = tempfile::tempdir().unwrap();
        let path = root.path().join("component.lock");
        match kind {
            "symlink" => symlink(&target, &path).unwrap(),
            "dangling" => symlink(outside.path().join("missing"), &path).unwrap(),
            "hardlink" => fs::hard_link(&target, &path).unwrap(),
            "fifo" => {
                let path = std::ffi::CString::new(path.as_os_str().as_bytes()).unwrap();
                // SAFETY: the fixture passes a live NUL-terminated local path and POSIX mode.
                assert_eq!(unsafe { libc::mkfifo(path.as_ptr(), 0o600) }, 0);
            }
            _ => unreachable!(),
        }
        let inode = fs::symlink_metadata(&path).unwrap().ino();
        assert!(
            ComponentLock::acquire(path.clone()).is_err(),
            "accepted {kind}"
        );
        assert_eq!(fs::symlink_metadata(&path).unwrap().ino(), inode);
        assert_eq!(fs::read(&target).unwrap(), b"untouched");
        assert!(!outside.path().join("missing").exists());
    }
    let root = tempfile::tempdir().unwrap();
    symlink(outside.path(), root.path().join("linked-root")).unwrap();
    assert!(ComponentLock::acquire(root.path().join("linked-root/component.lock")).is_err());
    assert!(!outside.path().join("component.lock").exists());
}

#[cfg(unix)]
#[test]
fn inaccessible_lock_file_fails_closed_without_reclaim_or_truncation() {
    use std::os::unix::fs::PermissionsExt;
    // Root bypasses these fixture DAC permissions; ordinary supported app users do not.
    if unsafe { libc::geteuid() } == 0 {
        return;
    }
    let root = tempfile::tempdir().unwrap();
    let path = root.path().join("component.lock");
    fs::write(&path, b"keep unreadable legacy contents").unwrap();
    let permissions = fs::metadata(&path).unwrap().permissions();
    fs::set_permissions(&path, fs::Permissions::from_mode(0)).unwrap();
    let result = ComponentLock::acquire(path.clone());
    fs::set_permissions(&path, permissions).unwrap();
    assert!(result
        .unwrap_err()
        .starts_with("component transaction lock is unavailable"));
    assert_eq!(fs::read(&path).unwrap(), b"keep unreadable legacy contents");
    drop(ComponentLock::acquire(path).unwrap());
}
