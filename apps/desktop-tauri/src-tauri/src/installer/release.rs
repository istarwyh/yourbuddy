//! Official signed desktop archives, with resumable immutable-release downloads.

use std::collections::BTreeMap;
use std::fs::{self, File, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::Duration;

use base64::Engine;
use futures_util::StreamExt;
use minisign_verify::{PublicKey, Signature};
use serde::{Deserialize, Serialize};

use super::store::{Operation, Phase, Store};
use crate::network_proxy::{self, NetworkProxyMode};

const RELEASES: &str = "https://github.com/istarwyh/yourbuddy/releases/download";
const PUBLIC_KEY: &str = "untrusted comment: minisign public key: DBDFC5E28EF581EB\nRWTrgfWO4sXf22TrOC2n0Rq69j7oq0Xt3bZRYfWwrow/ndjkqnxuLKAM\n";

#[derive(Debug, Deserialize, Serialize)]
pub struct Release {
    pub version: String,
    pub platforms: BTreeMap<String, Artifact>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct Artifact {
    pub url: String,
    pub signature: String,
}

pub fn client() -> Result<reqwest::Client, String> {
    let mut settings = crate::desktop_settings::load().network_proxy;
    if let Ok(proxy) = std::env::var("YOURBUDDY_INSTALL_PROXY") {
        settings.mode = NetworkProxyMode::Custom;
        settings.http_proxy = proxy.clone();
        settings.https_proxy = proxy;
    }
    network_proxy::apply_to_client(
        reqwest::Client::builder()
            .connect_timeout(Duration::from_secs(30))
            .read_timeout(Duration::from_secs(30))
            .timeout(Duration::from_secs(30 * 60)),
        &network_proxy::resolve(&settings)?,
    )?
    .build()
    .map_err(|e| e.to_string())
}

pub async fn resolve(version: &str) -> Result<Release, String> {
    let tag = if version == "latest" {
        "yourbuddy-updater".to_string()
    } else {
        semver::Version::parse(version).map_err(|e| format!("invalid version: {e}"))?;
        format!("yourbuddy-v{version}")
    };
    let release: Release = client()?
        .get(format!("{RELEASES}/{tag}/latest.json"))
        .send()
        .await
        .map_err(|e| e.to_string())?
        .error_for_status()
        .map_err(|e| e.to_string())?
        .bytes()
        .await
        .map_err(|e| e.to_string())
        .and_then(|bytes| serde_json::from_slice(&bytes).map_err(|e| e.to_string()))?;
    semver::Version::parse(&release.version).map_err(|e| e.to_string())?;
    if version != "latest" && release.version != version {
        return Err("release metadata does not match the requested version".into());
    }
    Ok(release)
}

pub async fn stage(store: &Store, operation: &mut Operation) -> Result<PathBuf, String> {
    let directory = store.directory(&operation.id)?;
    let package = directory.join("package.tar.gz");
    let signature = directory.join("package.tar.gz.sig");
    if operation.request.package.is_none() {
        store.transition(operation, Phase::Downloading)?;
        let release = resolve(&operation.request.requested_version).await?;
        operation.target_version = Some(release.version);
        store.save(operation)?;
        let version = operation
            .target_version
            .as_deref()
            .ok_or("release version missing")?;
        let url = format!(
            "{RELEASES}/yourbuddy-v{version}/yourbuddy-{version}-bootstrap-macos-arm64.app.tar.gz"
        );
        let client = client()?;
        let signature_text = client
            .get(format!("{url}.sig"))
            .send()
            .await
            .map_err(|e| e.to_string())?
            .error_for_status()
            .map_err(|e| e.to_string())?
            .text()
            .await
            .map_err(|e| e.to_string())?;
        fs::write(&signature, &signature_text).map_err(|e| e.to_string())?;
        let downloads = store.root.join("downloads");
        fs::create_dir_all(&downloads).map_err(|e| e.to_string())?;
        let cached = downloads.join(format!("{version}-bootstrap.tar.gz"));
        let cache_lock = OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .truncate(false)
            .open(downloads.join(format!("{version}.lock")))
            .map_err(|e| e.to_string())?;
        cache_lock.lock().map_err(|e| e.to_string())?;
        operation.app_network_bytes = Some(0);
        ensure_download(&client, &url, &cached, store, operation, |path| {
            verify(path, &signature_text)
        })
        .await?;
        operation.app_archive_bytes = Some(fs::metadata(&cached).map_err(|e| e.to_string())?.len());
        store.save(operation)?;
        fs::copy(&cached, &package).map_err(|e| e.to_string())?;
    }
    verify(
        &package,
        &fs::read_to_string(&signature).map_err(|e| e.to_string())?,
    )?;
    operation.app_archive_bytes = Some(fs::metadata(&package).map_err(|e| e.to_string())?.len());
    if operation.request.package.is_some() {
        operation.app_network_bytes = Some(0);
    }
    store.transition(operation, Phase::Preparing)?;
    let staging = directory.join("candidate");
    fs::create_dir_all(&staging).map_err(|e| e.to_string())?;
    tar::Archive::new(flate2::read::GzDecoder::new(
        File::open(&package).map_err(|e| e.to_string())?,
    ))
    .unpack(&staging)
    .map_err(|e| format!("cannot extract desktop package: {e}"))?;
    let app = staging.join("YourBuddy.app");
    if !app.join("Contents/MacOS/yourbuddy").is_file() {
        return Err("desktop package does not contain YourBuddy.app".into());
    }
    Ok(app)
}

async fn ensure_download(
    client: &reqwest::Client,
    url: &str,
    cached: &Path,
    store: &Store,
    operation: &mut Operation,
    verify_file: impl Fn(&Path) -> Result<(), String>,
) -> Result<(), String> {
    if verify_file(cached).is_ok() {
        return Ok(());
    }
    let mut last = String::new();
    for attempt in 0..3 {
        match download(client, url, cached, store, operation).await {
            Ok(()) => match verify_file(cached) {
                Ok(()) => return Ok(()),
                Err(error) => {
                    last = error;
                    fs::remove_file(cached).map_err(|e| {
                        format!("cannot discard invalid cached desktop archive: {e}")
                    })?;
                }
            },
            Err(error) => last = error,
        }
        if store.read(&operation.id)?.phase.terminal() {
            return Err("installation ended during download".into());
        }
        if attempt < 2 {
            tokio::time::sleep(Duration::from_secs(1)).await;
        }
    }
    Err(last)
}

async fn download(
    client: &reqwest::Client,
    url: &str,
    path: &Path,
    store: &Store,
    operation: &mut Operation,
) -> Result<(), String> {
    let offset = fs::metadata(path).map(|m| m.len()).unwrap_or(0);
    let mut request = client.get(url);
    if offset > 0 {
        request = request.header(reqwest::header::RANGE, format!("bytes={offset}-"));
    }
    let response = request.send().await.map_err(|e| e.to_string())?;
    // A fully downloaded file may have survived a crash before signature verification.
    if response.status() == reqwest::StatusCode::RANGE_NOT_SATISFIABLE && offset > 0 {
        return Ok(());
    }
    let response = response.error_for_status().map_err(|e| e.to_string())?;
    let append = offset > 0 && response.status() == reqwest::StatusCode::PARTIAL_CONTENT;
    if append {
        let expected = format!("bytes {offset}-");
        if !response
            .headers()
            .get(reqwest::header::CONTENT_RANGE)
            .and_then(|h| h.to_str().ok())
            .is_some_and(|h| h.starts_with(&expected))
        {
            return Err("desktop download returned an unexpected resume offset".into());
        }
    }
    let mut file = OpenOptions::new()
        .write(true)
        .create(true)
        .append(append)
        .truncate(!append)
        .open(path)
        .map_err(|e| e.to_string())?;
    operation.app_archive_bytes = response
        .content_length()
        .map(|length| length + if append { offset } else { 0 });
    store.save(operation)?;
    let mut stream = response.bytes_stream();
    let mut report_at = std::time::Instant::now();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| e.to_string())?;
        file.write_all(&chunk).map_err(|e| e.to_string())?;
        operation.app_network_bytes = Some(
            operation
                .app_network_bytes
                .unwrap_or(0)
                .saturating_add(chunk.len() as u64),
        );
        if report_at.elapsed() > Duration::from_millis(250) {
            operation.updated_at = super::store::now();
            store.save(operation)?;
            report_at = std::time::Instant::now();
        }
    }
    store.save(operation)?;
    file.sync_all().map_err(|e| e.to_string())
}

fn verify(path: &Path, encoded: &str) -> Result<(), String> {
    let raw = base64::engine::general_purpose::STANDARD
        .decode(encoded.trim())
        .map_err(|e| format!("invalid desktop signature encoding: {e}"))?;
    let text = std::str::from_utf8(&raw).map_err(|e| e.to_string())?;
    let signature = Signature::decode(text).map_err(|e| e.to_string())?;
    let key = PublicKey::decode(PUBLIC_KEY).map_err(|e| e.to_string())?;
    key.verify(
        &fs::read(path).map_err(|e| e.to_string())?,
        &signature,
        true,
    )
    .map_err(|e| format!("desktop package signature failed: {e}"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Read;
    use std::net::TcpListener;
    use std::sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    };

    #[tokio::test]
    async fn corrupt_completed_cache_recovers_from_416_with_one_fresh_download() {
        let root = tempfile::tempdir().unwrap();
        let store = Store::new(root.path().join("installer")).unwrap();
        let (mut operation, _) = store
            .create(super::super::store::Request {
                request_id: "cache-repair".into(),
                session_id: None,
                app_path: root.path().join("YourBuddy.app"),
                requested_version: "1.2.3".into(),
                package: None,
                package_identity: None,
                signature: None,
                offline: false,
                defer_stop: false,
            })
            .unwrap();
        let cached = root.path().join("archive");
        fs::write(&cached, b"bad").unwrap();
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        listener.set_nonblocking(true).unwrap();
        let url = format!("http://{}/archive", listener.local_addr().unwrap());
        struct Server {
            stopping: Arc<AtomicBool>,
            worker: Option<std::thread::JoinHandle<Vec<String>>>,
        }
        impl Drop for Server {
            fn drop(&mut self) {
                self.stopping.store(true, Ordering::SeqCst);
                if let Some(worker) = self.worker.take() {
                    worker.join().unwrap();
                }
            }
        }
        let stopping = Arc::new(AtomicBool::new(false));
        let stop = Arc::clone(&stopping);
        let mut server = Server {
            stopping,
            worker: Some(std::thread::spawn(move || {
                let mut requests = Vec::new();
                while !stop.load(Ordering::SeqCst) {
                    match listener.accept() {
                        Ok((mut stream, _)) => {
                            stream.set_nonblocking(false).unwrap();
                            stream
                                .set_read_timeout(Some(Duration::from_secs(5)))
                                .unwrap();
                            let mut bytes = Vec::new();
                            let mut chunk = [0; 1024];
                            while !bytes.windows(4).any(|window| window == b"\r\n\r\n") {
                                let count = stream.read(&mut chunk).unwrap();
                                assert!(count > 0);
                                bytes.extend_from_slice(&chunk[..count]);
                            }
                            let request = String::from_utf8_lossy(&bytes).to_ascii_lowercase();
                            if request.contains("range: bytes=3-") {
                                stream.write_all(b"HTTP/1.1 416 Range Not Satisfiable\r\nContent-Length: 0\r\nConnection: close\r\n\r\n").unwrap();
                            } else {
                                stream.write_all(b"HTTP/1.1 200 OK\r\nContent-Length: 4\r\nConnection: close\r\n\r\ngood").unwrap();
                            }
                            requests.push(request);
                        }
                        Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                            std::thread::sleep(Duration::from_millis(2))
                        }
                        Err(error) => panic!("{error}"),
                    }
                }
                requests
            })),
        };
        let verify = |path: &Path| {
            if fs::read(path).ok().as_deref() == Some(b"good") {
                Ok(())
            } else {
                Err("invalid fixture digest".into())
            }
        };
        ensure_download(
            &reqwest::Client::builder().no_proxy().build().unwrap(),
            &url,
            &cached,
            &store,
            &mut operation,
            verify,
        )
        .await
        .unwrap();
        assert_eq!(fs::read(&cached).unwrap(), b"good");
        server.stopping.store(true, Ordering::SeqCst);
        let requests = server.worker.take().unwrap().join().unwrap();
        assert_eq!(requests.len(), 2);
        assert!(requests[0].contains("range: bytes=3-"));
        assert!(!requests[1].contains("range:"));
        assert_eq!(operation.app_network_bytes, Some(4));
        assert_eq!(operation.app_archive_bytes, Some(4));
    }
}
