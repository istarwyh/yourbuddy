//! The production downloader against the pinned updater SDK and an isolated HTTP server.

use super::{download_update, UpdateAttempt, UPDATE_CHECK_TIMEOUT, UPDATE_DOWNLOAD_TIMEOUT};
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread::{self, JoinHandle};
use std::time::{Duration, Instant};
use tauri_plugin_updater::UpdaterExt;

// Public fixture material generated with the Tauri signer; its private key is not retained.
const PUBLIC_KEY: &str = "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IDY3NjMyNzUzMTY4OTg1QTcKUldTbmhZa1dVeWRqWjFPNDFNSEFTN0dkeWRQTVFPNDdCOUFob2huT3lETTRMditDOE8vZ1hlOU0K";
const SIGNATURE: &str = "dW50cnVzdGVkIGNvbW1lbnQ6IHNpZ25hdHVyZSBmcm9tIHRhdXJpIHNlY3JldCBrZXkKUlVTbmhZa1dVeWRqWjFUbVRLaGlPR1hLU09tL290QndmTEUrZ2ZnVmJERTU5TlZUd21SZm9UVE1nQmlJUkNESTdWTUpxYnN5eVpaa20rN1hVKzRwMFY1R1FLMEE5UFg5QXdnPQp0cnVzdGVkIGNvbW1lbnQ6IHRpbWVzdGFtcDoxNzkyMTgxNDc1CWZpbGU6cGF5bG9hZApmZmx6WklLZkZFYy85NkNDSEhUTlFhbU9ZQW5RNmxWeU9OaXZHVnlOMGkxN1VERmFJWGJBNTkzYWZBN2lXazVqTURaWWdwbE5yZzZDdjRIOUYzenNCZz09Cg==";
const PAYLOAD: &[u8] = b"yourbuddy update fixture\n";

struct Server {
    endpoint: String,
    stalled: Option<tokio::sync::oneshot::Receiver<()>>,
    stopped: Arc<AtomicBool>,
    worker: Option<JoinHandle<()>>,
}

impl Server {
    fn new() -> Self {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        listener.set_nonblocking(true).unwrap();
        let origin = format!("http://{}", listener.local_addr().unwrap());
        let endpoint = format!("{origin}/manifest");
        let manifest = serde_json::to_vec(&serde_json::json!({
            "version": "0.2.0",
            "url": format!("{origin}/artifact"),
            "signature": SIGNATURE,
        }))
        .unwrap();
        let (stalled_sender, stalled) = tokio::sync::oneshot::channel();
        let stopped = Arc::new(AtomicBool::new(false));
        let worker_stopped = Arc::clone(&stopped);
        let worker = thread::spawn(move || {
            let mut stalled_sender = Some(stalled_sender);
            let mut artifact_requests = 0;
            while !worker_stopped.load(Ordering::Acquire) {
                let (mut stream, _) = match listener.accept() {
                    Ok(connection) => connection,
                    Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                        thread::sleep(Duration::from_millis(2));
                        continue;
                    }
                    Err(error) => panic!("updater fixture accept: {error}"),
                };
                stream.set_nonblocking(false).unwrap();
                stream
                    .set_read_timeout(Some(Duration::from_secs(10)))
                    .unwrap();
                stream
                    .set_write_timeout(Some(Duration::from_secs(10)))
                    .unwrap();
                let request = read_request(&mut stream);
                if request.starts_with("GET /manifest ") {
                    reply(&mut stream, &manifest, manifest.len());
                } else {
                    assert!(request.starts_with("GET /artifact "), "{request}");
                    artifact_requests += 1;
                    if let Some(sender) = stalled_sender.take() {
                        reply(&mut stream, &PAYLOAD[..1], PAYLOAD.len());
                        let _ = sender.send(());
                        // The deadline or an aborted test task must close the owned connection.
                        let mut byte = [0];
                        match stream.read(&mut byte) {
                            Ok(0) => {}
                            Err(error)
                                if matches!(
                                    error.kind(),
                                    std::io::ErrorKind::ConnectionReset
                                        | std::io::ErrorKind::BrokenPipe
                                ) => {}
                            result => panic!("stalled connection did not close: {result:?}"),
                        }
                    } else {
                        let mut body = PAYLOAD.to_vec();
                        if artifact_requests == 3 {
                            body[0] ^= 1;
                        }
                        reply(&mut stream, &body, body.len());
                    }
                }
            }
        });
        Self {
            endpoint,
            stalled: Some(stalled),
            stopped,
            worker: Some(worker),
        }
    }
}

impl Drop for Server {
    fn drop(&mut self) {
        self.stopped.store(true, Ordering::Release);
        if let Some(worker) = self.worker.take() {
            worker.join().expect("updater fixture worker");
        }
    }
}

fn read_request(stream: &mut TcpStream) -> String {
    let mut bytes = Vec::new();
    while !bytes.ends_with(b"\r\n\r\n") {
        assert!(bytes.len() < 16 * 1024);
        let mut byte = [0];
        stream.read_exact(&mut byte).unwrap();
        bytes.push(byte[0]);
    }
    String::from_utf8(bytes).unwrap()
}

fn reply(stream: &mut TcpStream, body: &[u8], declared_length: usize) {
    write!(
        stream,
        "HTTP/1.1 200 OK\r\nContent-Length: {declared_length}\r\nConnection: close\r\n\r\n"
    )
    .unwrap();
    stream.write_all(body).unwrap();
    stream.flush().unwrap();
}

struct DownloadChild(std::process::Child);

impl Drop for DownloadChild {
    fn drop(&mut self) {
        let _ = self.0.kill();
        let _ = self.0.wait();
    }
}

#[test]
fn stalled_signed_download_times_out_and_releases_the_attempt_for_a_verified_retry() {
    // The SDK initializes Linux TLS environment variables; contain those and the Busy flag.
    let mut child = DownloadChild(
        std::process::Command::new(std::env::current_exe().unwrap())
            .args([
                "--exact",
                "updater::download_tests::stalled_download_child_fixture",
                "--nocapture",
            ])
            .env("YOURBUDDY_UPDATER_TEST_CHILD", "1")
            .stdin(std::process::Stdio::null())
            .spawn()
            .unwrap(),
    );
    let deadline = Instant::now() + Duration::from_secs(60);
    loop {
        if let Some(status) = child.0.try_wait().unwrap() {
            assert!(status.success(), "updater fixture failed: {status}");
            break;
        }
        assert!(Instant::now() < deadline, "updater fixture did not exit");
        thread::sleep(Duration::from_millis(5));
    }
}

#[tokio::test(flavor = "current_thread")]
async fn stalled_download_child_fixture() {
    if std::env::var("YOURBUDDY_UPDATER_TEST_CHILD").as_deref() != Ok("1") {
        return;
    }
    let mut server = Server::new();
    let mut context = tauri::test::mock_context(tauri::test::noop_assets());
    context.config_mut().plugins.0.insert(
        "updater".into(),
        serde_json::json!({
            "dangerousInsecureTransportProtocol": true,
            "pubkey": PUBLIC_KEY,
            "endpoints": [server.endpoint],
        }),
    );
    let app = tauri::test::mock_builder()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .build(context)
        .unwrap();
    let update = app
        .updater_builder()
        .no_proxy()
        .timeout(UPDATE_CHECK_TIMEOUT)
        .build()
        .unwrap()
        .check()
        .await
        .unwrap()
        .unwrap();
    let mut retry = update.clone();
    let mut task = tokio::spawn(async move {
        let _attempt = UpdateAttempt::begin().expect("first update attempt");
        let mut update = update;
        download_update(&mut update).await
    });
    let observed =
        tokio::time::timeout(Duration::from_secs(10), server.stalled.take().unwrap()).await;
    if !matches!(observed, Ok(Ok(()))) {
        task.abort();
        let _ = task.await;
        panic!("updater did not receive the stalled fixture response");
    }
    let busy_during_download = UpdateAttempt::begin().is_none();
    tokio::time::pause();
    tokio::time::advance(UPDATE_DOWNLOAD_TIMEOUT + Duration::from_secs(1)).await;
    tokio::time::resume();
    let result = tokio::time::timeout(Duration::from_secs(5), &mut task).await;
    let result = match result {
        Ok(result) => result.unwrap(),
        Err(error) => {
            task.abort();
            let _ = task.await;
            panic!("download did not finish after its deadline: {error}");
        }
    };
    assert!(busy_during_download);
    assert!(
        matches!(result, Err(tauri_plugin_updater::Error::Reqwest(error)) if error.is_timeout())
    );
    let _retry_attempt = UpdateAttempt::begin().expect("timed-out attempt released");
    assert_eq!(download_update(&mut retry).await.unwrap(), PAYLOAD);
    assert!(
        matches!(
            download_update(&mut retry).await,
            Err(tauri_plugin_updater::Error::Minisign(_))
        ),
        "signature verification remains required"
    );
}
