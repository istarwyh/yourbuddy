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
                    // The client read deadline closes the connection; no test-side sleep decides it.
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
            .obtain_archive("harness", manager.spec("harness").unwrap())
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
        assert_eq!(fs::read(&partial).unwrap(), b"abc");
        assert!(partial.with_extension("partial.json").is_file());
        assert_eq!(
            fs::read(root.path().join("active.json")).unwrap(),
            b"previous activation"
        );
        assert!(!root.path().join("component.lock").exists());
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
        .obtain_archive("harness", manager.spec("harness").unwrap())
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
    let destination = manager.ensure_startup().await.unwrap();
    assert!(destination.join(".complete").is_file());
    assert_eq!(server.requests().len(), 2);
    assert!(!server.requests()[1].contains("range:"));
}

#[tokio::test]
async fn permanent_http_error_does_not_retry() {
    let server = Server::new(vec![Reply::new(404, "\"v1\"", b"")]);
    let root = tempfile::tempdir().unwrap();
    let manager = manager(root.path(), &server.url, b"abcdef");
    let error = manager.ensure_startup().await.unwrap_err();
    assert!(
        error.contains("404"),
        "expected HTTP 404, received: {error}"
    );
    assert_eq!(server.requests().len(), 1);
}

#[tokio::test]
async fn complete_partial_is_prepared_and_reused_without_a_range_request() {
    let body = harness_archive();
    let server = Server::new(vec![]);
    let root = tempfile::tempdir().unwrap();
    let manager = manager(root.path(), &server.url, &body);
    seed_partial(&manager, &server.url, &body, "\"v1\"");
    assert!(manager
        .ensure_startup()
        .await
        .unwrap()
        .join(".complete")
        .is_file());
    let first = manager.installed("harness").unwrap().unwrap();
    assert_eq!(manager.ensure_startup().await.unwrap(), first);
    assert!(!root.path().join("active.json").exists());
    assert!(server.requests().is_empty());
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
