//! Signed release-component preparation and readiness-gated activation.

use std::collections::BTreeMap;
use std::fs::{self, File, OpenOptions};
use std::io::{Read, Write};
use std::path::{Component as PathComponent, Path, PathBuf};
use std::sync::Arc;
use std::time::{Duration, Instant};

use futures_util::StreamExt;
use minisign_verify::{PublicKey, Signature};
use reqwest::header::{ETAG, IF_RANGE, RANGE};
use reqwest::{Client, ClientBuilder, StatusCode};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tar::EntryType;

use crate::network_proxy::{apply_to_client, ResolvedNetworkProxy};

use super::app_data_root;

const COMPONENT_PUBLIC_KEY: &str = "untrusted comment: minisign public key: DBDFC5E28EF581EB\nRWTrgfWO4sXf22TrOC2n0Rq69j7oq0Xt3bZRYfWwrow/ndjkqnxuLKAM\n";
const RELEASE_BASE: &str = "https://github.com/istarwyh/yourbuddy/releases/download";
const DOWNLOAD_ATTEMPTS: usize = 3;
#[cfg(not(test))]
const DOWNLOAD_RETRY_DELAY: Duration = Duration::from_secs(1);
#[cfg(test)]
const DOWNLOAD_RETRY_DELAY: Duration = Duration::ZERO;
const DOWNLOAD_PROGRESS_INTERVAL: Duration = Duration::from_millis(100);
const MAX_ARCHIVE_ENTRIES: usize = 250_000;
const MAX_EXPANDED_BYTES: u64 = 4 * 1024 * 1024 * 1024;

/// Exact components selected by one signed YourBuddy application release.
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ComponentManifest {
    pub schema_version: u32,
    pub app_version: String,
    pub release_tag: String,
    pub platform: String,
    pub arch: String,
    pub components: BTreeMap<String, ComponentSpec>,
}

/// Immutable archive metadata for one runtime component.
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ComponentSpec {
    pub id: String,
    pub archive: String,
    pub sha256: String,
    pub bytes: u64,
    pub activation: String,
}

/// Download updates for the startup splash; byte counts include any resumed partial.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum ComponentProgress {
    Download {
        component: String,
        transferred: u64,
        total: u64,
    },
    Retry {
        component: String,
        attempt: usize,
        max_attempts: usize,
    },
    Phase {
        component: String,
        phase: &'static str,
    },
}

#[derive(Debug)]
struct DownloadError {
    message: String,
    retryable: bool,
}

impl From<String> for DownloadError {
    fn from(message: String) -> Self {
        Self {
            message,
            retryable: false,
        }
    }
}

impl DownloadError {
    fn transient(message: String) -> Self {
        Self {
            message,
            retryable: true,
        }
    }
}

/// Native owner for the signed component channel and content-addressed cache.
pub struct ComponentManager {
    root: PathBuf,
    resource_dir: PathBuf,
    manifest: ComponentManifest,
    client: Client,
    progress: Option<Arc<dyn Fn(ComponentProgress) + Send + Sync>>,
    #[cfg(test)]
    download_url: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct PartialMetadata {
    url: String,
    sha256: String,
    bytes: u64,
    etag: Option<String>,
}

/// Cross-process component owner whose PID record permits recovery after termination.
struct ComponentLock {
    path: PathBuf,
    owner: String,
}

impl ComponentLock {
    fn acquire(path: PathBuf) -> Result<Self, String> {
        let nonce = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|duration| duration.as_nanos())
            .unwrap_or(0);
        let owner = format!("{}:{nonce}", std::process::id());
        let claim = path.with_extension(format!("claim-{}-{nonce}", std::process::id()));
        fs::write(&claim, &owner)
            .map_err(|error| format!("cannot prepare component lock: {error}"))?;
        for _ in 0..2 {
            match fs::hard_link(&claim, &path) {
                Ok(()) => {
                    let _ = fs::remove_file(&claim);
                    return Ok(Self { path, owner });
                }
                Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => {
                    if component_lock_owner_active(&path) {
                        let _ = fs::remove_file(&claim);
                        return Err("another component operation is active".into());
                    }
                    match fs::remove_file(&path) {
                        Ok(()) => {}
                        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
                        Err(error) => {
                            let _ = fs::remove_file(&claim);
                            return Err(format!("cannot reclaim stale component lock: {error}"));
                        }
                    }
                }
                Err(error) => {
                    let _ = fs::remove_file(&claim);
                    return Err(format!("cannot acquire component lock: {error}"));
                }
            }
        }
        let _ = fs::remove_file(&claim);
        Err("another component operation is active".into())
    }
}

impl Drop for ComponentLock {
    fn drop(&mut self) {
        if fs::read_to_string(&self.path).is_ok_and(|owner| owner == self.owner) {
            let _ = fs::remove_file(&self.path);
        }
    }
}

fn component_lock_owner_active(path: &Path) -> bool {
    let Ok(owner) = fs::read_to_string(path) else {
        return false;
    };
    let Some(pid) = owner
        .split(':')
        .next()
        .and_then(|value| value.parse::<u32>().ok())
    else {
        return false;
    };
    process_is_running(pid)
}

#[cfg(unix)]
fn process_is_running(pid: u32) -> bool {
    let Ok(pid) = i32::try_from(pid) else {
        return false;
    };
    let result = unsafe { libc::kill(pid, 0) };
    result == 0 || std::io::Error::last_os_error().raw_os_error() == Some(libc::EPERM)
}

#[cfg(windows)]
fn process_is_running(pid: u32) -> bool {
    use windows::Win32::Foundation::CloseHandle;
    use windows::Win32::System::Threading::{OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION};

    let Ok(handle) = (unsafe { OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) }) else {
        return false;
    };
    let _ = unsafe { CloseHandle(handle) };
    true
}

#[cfg(not(any(unix, windows)))]
fn process_is_running(_pid: u32) -> bool {
    false
}

impl ComponentManager {
    /// Load and verify the manifest embedded in the signed application bundle.
    pub fn load(resource_dir: &Path, proxy: &ResolvedNetworkProxy) -> Result<Self, String> {
        let manifest = verify_component_channel(resource_dir)?;
        let root = app_data_root()?.join("components");
        let client = apply_to_client(
            ClientBuilder::new()
                .connect_timeout(Duration::from_secs(30))
                .read_timeout(Duration::from_secs(30))
                .timeout(Duration::from_secs(30 * 60)),
            proxy,
        )?
        .build()
        .map_err(|error| format!("component HTTP client failed: {error}"))?;
        Ok(Self {
            root,
            resource_dir: resource_dir.to_path_buf(),
            manifest,
            client,
            progress: None,
            #[cfg(test)]
            download_url: None,
        })
    }

    /// Attach an observer for resumed byte progress and bounded network retries.
    pub fn with_progress(mut self, progress: Arc<dyn Fn(ComponentProgress) + Send + Sync>) -> Self {
        self.progress = Some(progress);
        self
    }

    fn report(&self, progress: ComponentProgress) {
        if let Some(observer) = &self.progress {
            observer(progress);
        }
    }

    /// Prepare the current startup Harness without changing the active release.
    pub async fn ensure_startup(&self) -> Result<PathBuf, String> {
        fs::create_dir_all(&self.root)
            .map_err(|error| format!("cannot create component cache: {error}"))?;
        let _lock = self.lock()?;
        self.persist_manifest()?;
        self.ensure_locked("harness").await
    }

    /// Prepare a current component from an Offline seed or Release URL without activating it.
    pub async fn ensure(&self, name: &str) -> Result<PathBuf, String> {
        fs::create_dir_all(&self.root)
            .map_err(|error| format!("cannot create component cache: {error}"))?;
        let _lock = self.lock()?;
        self.ensure_locked(name).await
    }

    /// Return the fixed pnpm package embedded in every Bootstrap application.
    pub fn pnpm_archive(&self) -> PathBuf {
        self.resource_dir
            .join("component-channel")
            .join("pnpm-11.7.0.tgz")
    }

    /// Resolve a complete current component without starting network work or activating it.
    pub fn installed(&self, name: &str) -> Result<Option<PathBuf>, String> {
        let spec = self.spec(name)?;
        let path = component_path(&self.root, name, &spec.id)?;
        Ok(component_is_complete(&path, spec).then_some(path))
    }

    fn spec(&self, name: &str) -> Result<&ComponentSpec, String> {
        self.manifest
            .components
            .get(name)
            .ok_or_else(|| format!("component manifest is missing {name}"))
    }

    async fn ensure_locked(&self, name: &str) -> Result<PathBuf, String> {
        let spec = self.spec(name)?;
        let destination = component_path(&self.root, name, &spec.id)?;
        if component_is_complete(&destination, spec) {
            return Ok(destination);
        }
        let archive = self.obtain_archive(name, spec).await?;
        self.report(ComponentProgress::Phase {
            component: name.into(),
            phase: "verify",
        });
        if let Err(error) = verify_archive(&archive, spec) {
            let downloads = self.root.join("downloads");
            if archive == downloads.join(format!("{}.partial", spec.archive)) {
                remove_partial(
                    &archive,
                    &downloads.join(format!("{}.partial.json", spec.archive)),
                );
            }
            return Err(error);
        }
        self.report(ComponentProgress::Phase {
            component: name.into(),
            phase: "unpack",
        });
        self.extract_and_prepare(name, spec, &archive, &destination)?;
        Ok(destination)
    }

    async fn obtain_archive(&self, name: &str, spec: &ComponentSpec) -> Result<PathBuf, String> {
        let seed = self
            .resource_dir
            .join("component-seeds")
            .join(&spec.archive);
        if seed.is_file() {
            return Ok(seed);
        }
        let url = asset_url(&self.manifest, spec)?;
        #[cfg(test)]
        let url = self.download_url.clone().unwrap_or(url);
        self.download_archive(name, spec, &url, DOWNLOAD_RETRY_DELAY)
            .await
    }

    async fn download_archive(
        &self,
        name: &str,
        spec: &ComponentSpec,
        url: &str,
        retry_delay: Duration,
    ) -> Result<PathBuf, String> {
        let downloads = self.root.join("downloads");
        fs::create_dir_all(&downloads)
            .map_err(|error| format!("cannot create component downloads: {error}"))?;
        let partial = downloads.join(format!("{}.partial", spec.archive));
        let metadata_path = downloads.join(format!("{}.partial.json", spec.archive));
        for attempt in 1..=DOWNLOAD_ATTEMPTS {
            match self
                .download_attempt(name, spec, url, &partial, &metadata_path)
                .await
            {
                Ok(()) => return Ok(partial),
                Err(error) if error.retryable && attempt < DOWNLOAD_ATTEMPTS => {
                    self.report(ComponentProgress::Retry {
                        component: name.into(),
                        attempt: attempt + 1,
                        max_attempts: DOWNLOAD_ATTEMPTS,
                    });
                    tokio::time::sleep(retry_delay * attempt as u32).await;
                }
                Err(error) => return Err(error.message),
            }
        }
        unreachable!("the final download attempt returns its result")
    }

    async fn download_attempt(
        &self,
        name: &str,
        spec: &ComponentSpec,
        url: &str,
        partial: &Path,
        metadata_path: &Path,
    ) -> Result<(), DownloadError> {
        let mut offset = fs::metadata(partial).map(|value| value.len()).unwrap_or(0);
        let previous = fs::read(metadata_path)
            .ok()
            .and_then(|bytes| serde_json::from_slice::<PartialMetadata>(&bytes).ok())
            .filter(|value| {
                value.url == url
                    && value.sha256 == spec.sha256
                    && value.bytes == spec.bytes
                    && offset <= spec.bytes
            });
        if offset > 0 && previous.is_none() {
            remove_partial(partial, metadata_path);
            offset = 0;
        }
        if offset == spec.bytes {
            if verify_archive(partial, spec).is_ok() {
                self.report(ComponentProgress::Download {
                    component: name.into(),
                    transferred: offset,
                    total: spec.bytes,
                });
                return Ok(());
            }
            remove_partial(partial, metadata_path);
            offset = 0;
        }
        self.report(ComponentProgress::Download {
            component: name.into(),
            transferred: offset,
            total: spec.bytes,
        });
        let mut request = self.client.get(url);
        if offset > 0 {
            request = request.header(RANGE, format!("bytes={offset}-"));
            if let Some(etag) = previous.as_ref().and_then(|value| value.etag.as_deref()) {
                request = request.header(IF_RANGE, etag);
            }
        }
        let response = request.send().await.map_err(|error| DownloadError {
            retryable: error.is_timeout()
                || error.is_connect()
                || error.is_request()
                || error.is_body(),
            message: format!("component download failed: {error}"),
        })?;
        let resumed = offset > 0 && response.status() == StatusCode::PARTIAL_CONTENT;
        if !response.status().is_success() {
            return Err(DownloadError {
                retryable: retryable_status(response.status()),
                message: format!("component download returned HTTP {}", response.status()),
            });
        }
        if offset > 0 && !resumed {
            remove_partial(partial, metadata_path);
            offset = 0;
            self.report(ComponentProgress::Download {
                component: name.into(),
                transferred: 0,
                total: spec.bytes,
            });
        }
        let etag = response
            .headers()
            .get(ETAG)
            .and_then(|value| value.to_str().ok())
            .map(str::to_owned);
        let metadata = PartialMetadata {
            url: url.to_owned(),
            sha256: spec.sha256.clone(),
            bytes: spec.bytes,
            etag,
        };
        fs::write(
            metadata_path,
            serde_json::to_vec_pretty(&metadata).map_err(|error| error.to_string())?,
        )
        .map_err(|error| format!("cannot write component download metadata: {error}"))?;
        let mut output = OpenOptions::new()
            .create(true)
            .write(true)
            .append(resumed)
            .truncate(!resumed)
            .open(partial)
            .map_err(|error| format!("cannot write component download: {error}"))?;
        let mut transferred = offset;
        let mut last_progress = Instant::now();
        let mut stream = response.bytes_stream();
        while let Some(chunk) = stream.next().await {
            let chunk = chunk.map_err(|error| {
                self.report(ComponentProgress::Download {
                    component: name.into(),
                    transferred,
                    total: spec.bytes,
                });
                DownloadError::transient(format!("component download failed: {error}"))
            })?;
            transferred = transferred
                .checked_add(chunk.len() as u64)
                .ok_or_else(|| "component byte count overflow".to_string())?;
            if transferred > spec.bytes {
                drop(output);
                remove_partial(partial, metadata_path);
                return Err("component download exceeded declared size"
                    .to_string()
                    .into());
            }
            output
                .write_all(&chunk)
                .map_err(|error| format!("cannot write component download: {error}"))?;
            if last_progress.elapsed() >= DOWNLOAD_PROGRESS_INTERVAL || transferred == spec.bytes {
                self.report(ComponentProgress::Download {
                    component: name.into(),
                    transferred,
                    total: spec.bytes,
                });
                last_progress = Instant::now();
            }
        }
        output
            .sync_all()
            .map_err(|error| format!("cannot sync component download: {error}"))?;
        if transferred != spec.bytes {
            return Err(DownloadError::transient(format!(
                "component download is incomplete: expected {} bytes, received {transferred}",
                spec.bytes
            )));
        }
        Ok(())
    }

    fn extract_and_prepare(
        &self,
        name: &str,
        spec: &ComponentSpec,
        archive_path: &Path,
        destination: &Path,
    ) -> Result<(), String> {
        let staging_parent = self.root.join("staging");
        fs::create_dir_all(&staging_parent)
            .map_err(|error| format!("cannot create component staging: {error}"))?;
        let staging = staging_parent.join(format!("{}-{}", name, component_key(&spec.id)?));
        let _ = fs::remove_dir_all(&staging);
        fs::create_dir_all(&staging)
            .map_err(|error| format!("cannot create component staging: {error}"))?;
        let result = extract_zstd_archive(archive_path, &staging).and_then(|()| {
            fs::write(staging.join(".complete"), format!("{}\n", spec.sha256))
                .map_err(|error| format!("cannot mark component complete: {error}"))?;
            if let Some(parent) = destination.parent() {
                fs::create_dir_all(parent)
                    .map_err(|error| format!("cannot create component destination: {error}"))?;
            }
            let preserved = if fs::symlink_metadata(destination).is_ok() {
                let quarantine = self.root.join("quarantine");
                fs::create_dir_all(&quarantine)
                    .map_err(|error| format!("cannot create component quarantine: {error}"))?;
                let retained = tempfile::Builder::new()
                    .prefix(&format!("{name}-"))
                    .tempdir_in(&quarantine)
                    .map_err(|error| format!("cannot reserve component quarantine: {error}"))?
                    .keep()
                    .join("component");
                fs::rename(destination, &retained)
                    .map_err(|error| format!("cannot preserve incomplete component: {error}"))?;
                Some(retained)
            } else {
                None
            };
            fs::rename(&staging, destination).map_err(|error| match preserved {
                Some(path) => format!(
                    "cannot prepare component: {error}; previous target retained at {}",
                    path.display()
                ),
                None => format!("cannot prepare component: {error}"),
            })
        });
        if result.is_err() {
            let _ = fs::remove_dir_all(&staging);
        }
        result
    }

    fn persist_manifest(&self) -> Result<(), String> {
        let destination = self.root.join("manifests").join(&self.manifest.app_version);
        fs::create_dir_all(&destination)
            .map_err(|error| format!("cannot create component manifest cache: {error}"))?;
        fs::write(
            destination.join("components.json"),
            serde_json::to_vec_pretty(&self.manifest).map_err(|error| error.to_string())?,
        )
        .map_err(|error| format!("cannot cache component manifest: {error}"))
    }

    /// Await the caller's runtime readiness result before committing prepared components.
    pub async fn activate_after_ready<T>(
        &self,
        ready: impl std::future::Future<Output = Result<T, String>>,
    ) -> Result<T, String> {
        let runtime = ready.await?;
        self.activate_prepared()?;
        Ok(runtime)
    }

    /// Commit complete current-manifest components only after application readiness succeeds.
    /// Preparation and this commit share the component lock; a concurrent operation returns busy.
    pub fn activate_prepared(&self) -> Result<(), String> {
        fs::create_dir_all(&self.root)
            .map_err(|error| format!("cannot create component cache: {error}"))?;
        let _lock = self.lock()?;
        if self.installed("harness")?.is_none() {
            return Err("current startup harness is not prepared".into());
        }
        let mut components = BTreeMap::new();
        for name in ["harness", "pnpmStore", "node", "harbor"] {
            if let Some(path) = self.installed(name)? {
                let spec = self.spec(name)?;
                components.insert(
                    name,
                    serde_json::json!({
                        "id": spec.id,
                        "path": path.display().to_string(),
                    }),
                );
            }
        }
        let active = serde_json::json!({
            "schemaVersion": 1,
            "appVersion": self.manifest.app_version,
            "components": components,
        });
        let active_path = self.root.join("active.json");
        let temporary = self.root.join("active.json.next");
        fs::write(
            &temporary,
            format!(
                "{}\n",
                serde_json::to_string_pretty(&active).map_err(|error| error.to_string())?
            ),
        )
        .map_err(|error| format!("cannot write active component state: {error}"))?;
        fs::rename(&temporary, &active_path)
            .map_err(|error| format!("cannot activate component state: {error}"))
    }

    fn lock(&self) -> Result<ComponentLock, String> {
        ComponentLock::acquire(self.root.join("component.lock"))
    }
}

/// Verify and parse the component channel embedded in one application resource directory.
pub fn verify_component_channel(resource_dir: &Path) -> Result<ComponentManifest, String> {
    let channel = resource_dir.join("component-channel");
    let manifest_bytes = fs::read(channel.join("components.json"))
        .map_err(|error| format!("component manifest is unavailable: {error}"))?;
    let signature_text = fs::read_to_string(channel.join("components.json.sig"))
        .map_err(|error| format!("component manifest signature is unavailable: {error}"))?;
    verify_manifest_signature(&manifest_bytes, &signature_text)?;
    let manifest: ComponentManifest = serde_json::from_slice(&manifest_bytes)
        .map_err(|error| format!("component manifest is invalid: {error}"))?;
    validate_manifest(&manifest)?;
    Ok(manifest)
}

fn validate_manifest(manifest: &ComponentManifest) -> Result<(), String> {
    if manifest.schema_version != 1 {
        return Err(format!(
            "unsupported component manifest schema {}",
            manifest.schema_version
        ));
    }
    if manifest.platform != "darwin" || manifest.arch != "arm64" {
        return Err("component manifest does not target darwin-arm64".into());
    }
    if manifest.release_tag != format!("yourbuddy-v{}", manifest.app_version) {
        return Err("component release tag does not match application version".into());
    }
    for name in ["harness", "pnpmStore", "node", "harbor"] {
        let spec = manifest
            .components
            .get(name)
            .ok_or_else(|| format!("component manifest is missing {name}"))?;
        validate_spec(spec)?;
    }
    Ok(())
}

fn validate_spec(spec: &ComponentSpec) -> Result<(), String> {
    if component_key(&spec.id)?.is_empty() || spec.bytes == 0 {
        return Err("component id or byte count is invalid".into());
    }
    if spec.sha256.len() != 64
        || !spec.sha256.bytes().all(|value| value.is_ascii_hexdigit())
        || !spec.archive.starts_with("yourbuddy-")
        || !spec.archive.ends_with(".tar.zst")
        || spec.archive.contains('/')
        || spec.archive.contains("..")
    {
        return Err(format!(
            "component archive metadata is invalid: {}",
            spec.archive
        ));
    }
    Ok(())
}

fn component_key(id: &str) -> Result<&str, String> {
    let key = id
        .strip_prefix("sha256:")
        .or_else(|| id.strip_prefix("node:"))
        .unwrap_or(id);
    if key.is_empty()
        || !key.bytes().all(|value| {
            value.is_ascii_alphanumeric() || matches!(value, b'.' | b'-' | b'_' | b':')
        })
    {
        return Err(format!("component id is invalid: {id}"));
    }
    Ok(key)
}

fn component_path(root: &Path, name: &str, id: &str) -> Result<PathBuf, String> {
    let family = match name {
        "harness" => "harness",
        "pnpmStore" => "stores",
        "node" => "node",
        "harbor" => "harbor",
        _ => return Err(format!("unsupported component name: {name}")),
    };
    Ok(root.join(family).join(component_key(id)?))
}

fn asset_url(manifest: &ComponentManifest, spec: &ComponentSpec) -> Result<String, String> {
    validate_spec(spec)?;
    Ok(format!(
        "{RELEASE_BASE}/{}/{}",
        manifest.release_tag, spec.archive
    ))
}

fn verify_manifest_signature(bytes: &[u8], signature: &str) -> Result<(), String> {
    let public_key = PublicKey::decode(COMPONENT_PUBLIC_KEY)
        .map_err(|error| format!("component public key is invalid: {error}"))?;
    let signature = Signature::decode(signature)
        .map_err(|error| format!("component manifest signature is invalid: {error}"))?;
    public_key
        .verify(bytes, &signature, false)
        .map_err(|error| format!("component manifest signature failed: {error}"))
}

fn verify_archive(path: &Path, spec: &ComponentSpec) -> Result<(), String> {
    let metadata =
        fs::metadata(path).map_err(|error| format!("component archive is unavailable: {error}"))?;
    if metadata.len() != spec.bytes {
        return Err(format!(
            "component archive size mismatch: expected {}, got {}",
            spec.bytes,
            metadata.len()
        ));
    }
    let mut file =
        File::open(path).map_err(|error| format!("cannot read component archive: {error}"))?;
    let mut hash = Sha256::new();
    let mut buffer = [0_u8; 128 * 1024];
    loop {
        let count = file
            .read(&mut buffer)
            .map_err(|error| format!("cannot hash component archive: {error}"))?;
        if count == 0 {
            break;
        }
        hash.update(&buffer[..count]);
    }
    let actual = hex::encode(hash.finalize());
    if actual != spec.sha256 {
        return Err(format!(
            "component archive digest mismatch: expected {}, got {actual}",
            spec.sha256
        ));
    }
    Ok(())
}

fn extract_zstd_archive(path: &Path, destination: &Path) -> Result<(), String> {
    let file =
        File::open(path).map_err(|error| format!("cannot open component archive: {error}"))?;
    let decoder = zstd::stream::read::Decoder::new(file)
        .map_err(|error| format!("cannot decode component archive: {error}"))?;
    let mut archive = tar::Archive::new(decoder);
    let entries = archive
        .entries()
        .map_err(|error| format!("cannot enumerate component archive: {error}"))?;
    let mut entry_count = 0_usize;
    let mut expanded_bytes = 0_u64;
    for entry in entries {
        let mut entry = entry.map_err(|error| format!("cannot read component archive: {error}"))?;
        entry_count += 1;
        if entry_count > MAX_ARCHIVE_ENTRIES {
            return Err("component archive contains too many entries".into());
        }
        expanded_bytes = expanded_bytes
            .checked_add(entry.size())
            .ok_or_else(|| "component expanded byte count overflow".to_string())?;
        if expanded_bytes > MAX_EXPANDED_BYTES {
            return Err("component archive exceeds expanded-size limit".into());
        }
        let entry_type = entry.header().entry_type();
        let entry_path = entry
            .path()
            .map_err(|error| format!("component archive path is invalid: {error}"))?;
        if entry_path.is_absolute()
            || entry_path.components().any(|part| {
                matches!(
                    part,
                    PathComponent::ParentDir | PathComponent::RootDir | PathComponent::Prefix(_)
                )
            })
        {
            return Err("component archive path escapes staging".into());
        }
        if entry_type == EntryType::Link {
            return Err("component archive contains a hard link".into());
        }
        if entry_type == EntryType::Symlink {
            let target = entry
                .link_name()
                .map_err(|error| format!("component link target is invalid: {error}"))?
                .ok_or_else(|| "component link target is missing".to_string())?;
            if !relative_link_stays_inside(&entry_path, &target) {
                return Err("component link target escapes staging".into());
            }
        }
        if !entry
            .unpack_in(destination)
            .map_err(|error| format!("cannot extract component archive: {error}"))?
        {
            return Err("component archive path escapes staging".into());
        }
    }
    Ok(())
}

fn relative_link_stays_inside(path: &Path, target: &Path) -> bool {
    if target.is_absolute() {
        return false;
    }
    let mut depth = path.parent().map_or(0, |parent| {
        parent
            .components()
            .filter(|part| matches!(part, PathComponent::Normal(_)))
            .count()
    });
    for part in target.components() {
        match part {
            PathComponent::Normal(_) => depth += 1,
            PathComponent::ParentDir if depth > 0 => depth -= 1,
            PathComponent::ParentDir | PathComponent::RootDir | PathComponent::Prefix(_) => {
                return false;
            }
            PathComponent::CurDir => {}
        }
    }
    true
}

fn component_is_complete(path: &Path, spec: &ComponentSpec) -> bool {
    fs::read_to_string(path.join(".complete"))
        .is_ok_and(|marker| marker == format!("{}\n", spec.sha256))
}

fn retryable_status(status: StatusCode) -> bool {
    matches!(status.as_u16(), 408 | 429 | 500 | 502 | 503 | 504)
}

fn remove_partial(partial: &Path, metadata: &Path) {
    let _ = fs::remove_file(partial);
    let _ = fs::remove_file(metadata);
}

#[cfg(test)]
mod tests {
    use super::{
        asset_url, component_path, relative_link_stays_inside, validate_manifest, ComponentLock,
        ComponentManifest, ComponentSpec,
    };
    use std::collections::BTreeMap;
    use std::fs;
    use std::path::{Path, PathBuf};
    use std::sync::atomic::{AtomicU64, Ordering};

    static NEXT_TEMPORARY_ROOT: AtomicU64 = AtomicU64::new(0);

    struct TemporaryRoot(PathBuf);

    impl TemporaryRoot {
        fn new(label: &str) -> Self {
            loop {
                let serial = NEXT_TEMPORARY_ROOT.fetch_add(1, Ordering::Relaxed);
                let path = std::env::temp_dir().join(format!(
                    "yourbuddy-component-{label}-{}-{serial}",
                    std::process::id()
                ));
                match fs::create_dir(&path) {
                    Ok(()) => return Self(path),
                    Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => {}
                    Err(error) => panic!("cannot create temporary component root: {error}"),
                }
            }
        }
    }

    impl Drop for TemporaryRoot {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }

    pub(super) fn manifest() -> ComponentManifest {
        let spec = ComponentSpec {
            id: "sha256:abc123".into(),
            archive: "yourbuddy-harness-abc123-macos-arm64.tar.zst".into(),
            sha256: "a".repeat(64),
            bytes: 42,
            activation: "startup".into(),
        };
        ComponentManifest {
            schema_version: 1,
            app_version: "0.4.0".into(),
            release_tag: "yourbuddy-v0.4.0".into(),
            platform: "darwin".into(),
            arch: "arm64".into(),
            components: BTreeMap::from([
                ("harness".into(), spec.clone()),
                ("pnpmStore".into(), spec.clone()),
                ("node".into(), spec.clone()),
                ("harbor".into(), spec),
            ]),
        }
    }

    #[test]
    fn derives_only_the_release_asset_url() {
        let manifest = manifest();
        let spec = manifest.components.get("harness").expect("harness");
        assert_eq!(
            asset_url(&manifest, spec).expect("url"),
            "https://github.com/istarwyh/yourbuddy/releases/download/yourbuddy-v0.4.0/yourbuddy-harness-abc123-macos-arm64.tar.zst"
        );
    }

    #[test]
    fn rejects_archive_path_in_manifest() {
        let mut manifest = manifest();
        manifest
            .components
            .get_mut("harness")
            .expect("harness")
            .archive = "../escape.tar.zst".into();
        assert!(validate_manifest(&manifest).is_err());
    }

    #[test]
    fn maps_components_under_owned_cache() {
        assert_eq!(
            component_path(Path::new("/cache"), "harbor", "sha256:abc123").expect("path"),
            Path::new("/cache/harbor/abc123")
        );
    }

    #[test]
    fn permits_only_relative_links_that_stay_in_the_component() {
        assert!(relative_link_stays_inside(
            Path::new("venv/bin/python"),
            Path::new("../../python/bin/python3")
        ));
        assert!(!relative_link_stays_inside(
            Path::new("venv/bin/python"),
            Path::new("../../../outside")
        ));
        assert!(!relative_link_stays_inside(
            Path::new("venv/bin/python"),
            Path::new("/tmp/python")
        ));
    }

    #[test]
    fn reclaims_a_stale_component_lock() {
        let root = TemporaryRoot::new("stale-lock");
        let path = root.0.join("component.lock");
        fs::write(&path, "terminated-owner").expect("stale lock");

        let lock = ComponentLock::acquire(path.clone()).expect("reclaimed lock");
        assert!(path.is_file());
        drop(lock);
        assert!(!path.exists());
    }

    #[test]
    fn excludes_a_second_live_component_operation() {
        let root = TemporaryRoot::new("live-lock");
        let path = root.0.join("component.lock");
        let first = ComponentLock::acquire(path.clone()).expect("first lock");

        assert_eq!(
            ComponentLock::acquire(path.clone()).err().as_deref(),
            Some("another component operation is active")
        );
        drop(first);
        let second = ComponentLock::acquire(path).expect("lock after release");
        drop(second);
    }
}

#[cfg(test)]
#[path = "components_download_tests.rs"]
mod download_tests;
