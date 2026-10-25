//! Durable one-shot installer receipts; process locks, not PID files, own installation.

use std::fs::{self, File, OpenOptions, TryLockError};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum Phase {
    Requested,
    Accepted,
    Downloading,
    Preparing,
    AwaitingHandoff,
    Stopping,
    Installing,
    Starting,
    Verifying,
    Succeeded,
    Unchanged,
    Failed,
    NeedsUserAction,
}

impl Phase {
    pub fn terminal(&self) -> bool {
        matches!(
            self,
            Self::Succeeded | Self::Unchanged | Self::Failed | Self::NeedsUserAction
        )
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Request {
    pub request_id: String,
    pub session_id: Option<String>,
    pub app_path: PathBuf,
    pub requested_version: String,
    pub package: Option<PathBuf>,
    pub package_identity: Option<String>,
    pub signature: Option<PathBuf>,
    pub offline: bool,
    pub defer_stop: bool,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Operation {
    pub schema_version: u32,
    pub id: String,
    #[serde(flatten)]
    pub request: Request,
    pub target_version: Option<String>,
    pub phase: Phase,
    pub executor_pid: Option<u32>,
    pub created_at: u64,
    pub updated_at: u64,
    pub error: Option<String>,
    pub user_action: Option<String>,
    pub app_network_bytes: Option<u64>,
    pub app_archive_bytes: Option<u64>,
    pub component_plan: Option<serde_json::Value>,
    pub component_progress: Option<serde_json::Value>,
}

pub struct Store {
    pub root: PathBuf,
}

impl Store {
    pub fn new(root: PathBuf) -> Result<Self, String> {
        fs::create_dir_all(root.join("operations")).map_err(|e| e.to_string())?;
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            fs::set_permissions(&root, fs::Permissions::from_mode(0o700))
                .map_err(|e| e.to_string())?;
        }
        Ok(Self { root })
    }

    pub fn lock(&self) -> Result<File, String> {
        let file = open_lock(&self.root.join("requests.lock"))?;
        file.lock().map_err(|e| e.to_string())?;
        Ok(file)
    }

    pub fn target_lock(&self, app: &Path) -> Result<Option<File>, String> {
        let file = open_lock(&self.root.join(format!(
            "target-{}.lock",
            digest(app.as_os_str().as_encoded_bytes())
        )))?;
        match file.try_lock() {
            Ok(()) => Ok(Some(file)),
            Err(TryLockError::WouldBlock) => Ok(None),
            Err(TryLockError::Error(e)) => Err(e.to_string()),
        }
    }

    pub fn create(&self, request: Request) -> Result<(Operation, bool), String> {
        let id =
            digest(format!("{}\0{}", request.app_path.display(), request.request_id).as_bytes());
        if self.path(&id)?.exists() {
            let operation = self.converge(self.read(&id)?)?;
            let mut prior = operation.request.clone();
            prior.package = request.package.clone();
            prior.signature = request.signature.clone();
            if prior != request {
                return Err("request ID already belongs to different install options".into());
            }
            return Ok((operation, false));
        }
        for operation in self.all()? {
            if operation.request.app_path == request.app_path {
                let operation = self.converge(operation)?;
                if !operation.phase.terminal() {
                    return Err(format!("installation already active: {}", operation.id));
                }
            }
        }
        let _target = self
            .target_lock(&request.app_path)?
            .ok_or("another updater owns this application")?;
        let now = now();
        let operation = Operation {
            schema_version: 1,
            id,
            request,
            target_version: None,
            phase: Phase::Requested,
            executor_pid: None,
            created_at: now,
            updated_at: now,
            error: None,
            user_action: None,
            app_network_bytes: None,
            app_archive_bytes: None,
            component_plan: None,
            component_progress: None,
        };
        self.save(&operation)?;
        Ok((operation, true))
    }

    pub fn read(&self, id: &str) -> Result<Operation, String> {
        let operation: Operation = read_json(&self.path(id)?)?;
        if operation.schema_version != 1 || operation.id != id {
            return Err("installer operation has an unsupported version or mismatched ID".into());
        }
        Ok(operation)
    }

    pub fn all(&self) -> Result<Vec<Operation>, String> {
        let mut operations = Vec::new();
        for entry in fs::read_dir(self.root.join("operations")).map_err(|e| e.to_string())? {
            let path = entry.map_err(|e| e.to_string())?.path();
            if path.extension().is_some_and(|ext| ext == "json") {
                operations.push(read_json(&path)?);
            }
        }
        Ok(operations)
    }

    pub fn save(&self, operation: &Operation) -> Result<(), String> {
        let _lock = self.record_lock(&operation.id)?;
        if self.path(&operation.id)?.exists() {
            let current = self.read(&operation.id)?;
            if current.phase.terminal() && current.phase != operation.phase {
                return Err("installation already ended; its terminal receipt is preserved".into());
            }
        }
        write_json(&self.path(&operation.id)?, operation)
    }

    fn record_lock(&self, id: &str) -> Result<File, String> {
        validate_id(id)?;
        let lock = open_lock(&self.root.join(format!("record-{id}.lock")))?;
        lock.lock().map_err(|e| e.to_string())?;
        Ok(lock)
    }

    pub fn cancel(&self, id: &str, reason: String) -> Result<Operation, String> {
        let _lock = self.record_lock(id)?;
        let mut operation = self.read(id)?;
        if operation.phase.terminal() {
            return Ok(operation);
        }
        if matches!(
            operation.phase,
            Phase::Stopping | Phase::Installing | Phase::Starting | Phase::Verifying
        ) {
            return Err(
                "installation has committed its shutdown; inspect status instead of cancelling"
                    .into(),
            );
        }
        operation.phase = Phase::NeedsUserAction;
        operation.error = Some(reason);
        operation.user_action = Some("The upgrade handoff was cancelled. The application was not replaced; retry with a new request ID when ready.".into());
        operation.updated_at = now();
        write_json(&self.path(id)?, &operation)?;
        Ok(operation)
    }

    pub fn transition(&self, operation: &mut Operation, phase: Phase) -> Result<(), String> {
        operation.phase = phase;
        operation.updated_at = now();
        self.save(operation)
    }

    pub fn finish_error(
        &self,
        operation: &mut Operation,
        error: String,
        action: Option<String>,
    ) -> Result<(), String> {
        operation.error = Some(error);
        operation.user_action = action;
        let phase = if operation.user_action.is_some() {
            Phase::NeedsUserAction
        } else {
            Phase::Failed
        };
        self.transition(operation, phase)
    }

    /// A released process lock makes interrupted work terminal, including after a reboot.
    pub fn converge(&self, mut operation: Operation) -> Result<Operation, String> {
        if operation.phase.terminal()
            || (operation.executor_pid.is_none()
                && now().saturating_sub(operation.created_at) < 60_000)
        {
            return Ok(operation);
        }
        if let Some(_lock) = self.target_lock(&operation.request.app_path)? {
            // The final receipt may have been written between the first read and lock acquisition.
            operation = self.read(&operation.id)?;
            if !operation.phase.terminal() {
                self.finish_error(&mut operation, "installer executor stopped before readiness was confirmed".into(), Some("Inspect the installed application and retry with a new request ID. YourBuddy user data was not removed.".into()))?;
            }
        }
        Ok(operation)
    }

    pub fn directory(&self, id: &str) -> Result<PathBuf, String> {
        validate_id(id)?;
        let path = self.root.join(id);
        fs::create_dir_all(&path).map_err(|e| e.to_string())?;
        Ok(path)
    }

    fn path(&self, id: &str) -> Result<PathBuf, String> {
        validate_id(id)?;
        Ok(self.root.join("operations").join(format!("{id}.json")))
    }
}

fn validate_id(id: &str) -> Result<(), String> {
    if id.len() != 64 || !id.bytes().all(|byte| byte.is_ascii_hexdigit()) {
        return Err("invalid installer operation ID".into());
    }
    Ok(())
}

fn open_lock(path: &Path) -> Result<File, String> {
    let mut options = OpenOptions::new();
    options.read(true).write(true).create(true).truncate(false);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.mode(0o600);
    }
    options.open(path).map_err(|e| e.to_string())
}

pub fn digest(bytes: &[u8]) -> String {
    hex::encode(Sha256::digest(bytes))
}

pub fn now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

pub fn read_json<T: serde::de::DeserializeOwned>(path: &Path) -> Result<T, String> {
    serde_json::from_slice(
        &fs::read(path).map_err(|e| format!("cannot read {}: {e}", path.display()))?,
    )
    .map_err(|e| format!("invalid {}: {e}", path.display()))
}

pub fn write_json<T: Serialize>(path: &Path, value: &T) -> Result<(), String> {
    let parent = path.parent().ok_or("installer record has no directory")?;
    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    let mut file = tempfile::NamedTempFile::new_in(parent).map_err(|e| e.to_string())?;
    serde_json::to_writer(&mut file, value).map_err(|e| e.to_string())?;
    file.write_all(b"\n").map_err(|e| e.to_string())?;
    file.as_file().sync_all().map_err(|e| e.to_string())?;
    file.persist(path).map_err(|e| e.to_string())?;
    #[cfg(unix)]
    File::open(parent)
        .and_then(|file| file.sync_all())
        .map_err(|e| e.to_string())?;
    Ok(())
}
