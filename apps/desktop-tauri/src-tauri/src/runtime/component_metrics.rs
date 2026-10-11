//! Bounded, device-local component counters for the current application release.
//!
//! Files contain only release/catalog identifiers, the aggregate start time, and counters.
//! Callers report failures locally and keep metrics outside workbench readiness decisions.

use std::cmp::Ordering;
use std::collections::{BTreeMap, BTreeSet};
use std::fs::{self, File, Metadata, OpenOptions, TryLockError};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use semver::Version;
use serde::{Deserialize, Serialize};

const FORMAT_VERSION: u32 = 1;
const MAX_COMPONENTS: usize = 64;
const MAX_IDENTIFIER_BYTES: usize = 64;
const MAX_FILE_BYTES: u64 = 64 * 1024;
const METRICS_FILE: &str = "component-metrics.json";
const LOCK_FILE: &str = "component-metrics.lock";
const LOCK_WAIT: Duration = Duration::from_millis(250);
const LOCK_POLL: Duration = Duration::from_millis(5);

/// Observations accepted from the release's component and capability owners.
#[derive(Clone, Debug)]
pub enum MetricEvent {
    BootStarted,
    WorkbenchReady {
        elapsed_ms: u64,
    },
    ReadinessFailed,
    /// Actual HTTP body bytes; retransferred bytes overlap this ensure operation's earlier reads.
    DownloadBytes {
        component: String,
        bytes: u64,
        retransferred_bytes: u64,
    },
    ResumeAttempted {
        component: String,
    },
    ResumeSucceeded {
        component: String,
    },
    ComponentInstalled {
        component: String,
    },
    /// Logical archive bytes reused after verification, rather than measured disk I/O.
    ArchiveReused {
        component: String,
        source: ArchiveSource,
        bytes: u64,
    },
    CapabilityInvoked {
        component: String,
        succeeded: bool,
    },
}

/// Local archive sources, kept separate from network traffic.
#[derive(Clone, Copy, Debug)]
pub enum ArchiveSource {
    Cache,
    OfflineSeed,
}

/// Aggregate counters for one member of the application's static component catalog.
#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ComponentCounters {
    pub network_bytes: u64,
    pub retransferred_bytes: u64,
    pub cache_archive_bytes: u64,
    pub offline_seed_archive_bytes: u64,
    pub resume_attempts: u64,
    pub resume_successes: u64,
    pub installs: u64,
    pub invocations: u64,
    pub successful_invocations: u64,
}

/// One release's local aggregate. Opening the same release preserves its start time.
#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct MetricsSnapshot {
    pub format_version: u32,
    pub app_version: String,
    pub window_started_at_unix_ms: u64,
    pub boot_attempts: u64,
    pub workbench_ready_count: u64,
    pub workbench_ready_total_ms: u64,
    pub workbench_ready_max_ms: u64,
    pub readiness_failures: u64,
    #[serde(deserialize_with = "deserialize_components")]
    pub components: BTreeMap<String, ComponentCounters>,
}

/// A release-scoped handle. Operations reload under an OS lock and never cache counters.
#[derive(Clone, Debug)]
pub struct ComponentMetrics {
    root: PathBuf,
    app_version: String,
    component_keys: BTreeSet<String>,
}

impl ComponentMetrics {
    /// Open or initialize the aggregate in `root` for a valid SemVer and exact static catalog.
    ///
    /// A newer release replaces the prior aggregate under the same lock. Older releases,
    /// equal-precedence versions with different build metadata, and catalog drift fail closed.
    /// Corrupt files are left untouched. Lock contention is bounded to 250 ms per operation.
    pub fn open(root: &Path, app_version: &str, component_keys: &[String]) -> Result<Self, String> {
        let version = parse_version(app_version)?;
        let keys = validate_catalog(component_keys)?;
        if let Ok(metadata) = fs::symlink_metadata(root) {
            validate_directory(&metadata)?;
        }
        fs::create_dir_all(root)
            .map_err(|error| format!("cannot create metrics directory: {error}"))?;
        validate_directory(&fs::symlink_metadata(root).map_err(io_error)?)?;
        let metrics = Self {
            root: fs::canonicalize(root).map_err(io_error)?,
            app_version: app_version.to_owned(),
            component_keys: keys,
        };
        let _lock = metrics.lock()?;
        if let Some(snapshot) = metrics.read()? {
            if snapshot.app_version == app_version {
                metrics.validate_current(&snapshot)?;
                return Ok(metrics);
            }
            if version.cmp_precedence(&parse_version(&snapshot.app_version)?) != Ordering::Greater {
                return Err("metrics already belong to a newer or equal-precedence release".into());
            }
        }
        metrics.write(&metrics.empty_snapshot()?)?;
        Ok(metrics)
    }

    /// Add one observation atomically. Unknown components, invalid observations, and overflow
    /// reject the entire event without changing the file. Superseded handles cannot write.
    pub fn record(&self, event: MetricEvent) -> Result<(), String> {
        let _lock = self.lock()?;
        let mut snapshot = self.current()?;
        match event {
            MetricEvent::BootStarted => increment(&mut snapshot.boot_attempts, 1)?,
            MetricEvent::WorkbenchReady { elapsed_ms } => {
                increment(&mut snapshot.workbench_ready_count, 1)?;
                increment(&mut snapshot.workbench_ready_total_ms, elapsed_ms)?;
                snapshot.workbench_ready_max_ms = snapshot.workbench_ready_max_ms.max(elapsed_ms);
            }
            MetricEvent::ReadinessFailed => increment(&mut snapshot.readiness_failures, 1)?,
            MetricEvent::DownloadBytes {
                component,
                bytes,
                retransferred_bytes,
            } => {
                if retransferred_bytes > bytes {
                    return Err("retransferred bytes exceed received network bytes".into());
                }
                let counters = counters(&mut snapshot, &component)?;
                increment(&mut counters.network_bytes, bytes)?;
                increment(&mut counters.retransferred_bytes, retransferred_bytes)?;
            }
            MetricEvent::ResumeAttempted { component } => {
                increment(&mut counters(&mut snapshot, &component)?.resume_attempts, 1)?;
            }
            MetricEvent::ResumeSucceeded { component } => {
                let counters = counters(&mut snapshot, &component)?;
                if counters.resume_successes >= counters.resume_attempts {
                    return Err("resume success has no recorded attempt".into());
                }
                increment(&mut counters.resume_successes, 1)?;
            }
            MetricEvent::ComponentInstalled { component } => {
                increment(&mut counters(&mut snapshot, &component)?.installs, 1)?;
            }
            MetricEvent::ArchiveReused {
                component,
                source,
                bytes,
            } => {
                let counters = counters(&mut snapshot, &component)?;
                match source {
                    ArchiveSource::Cache => increment(&mut counters.cache_archive_bytes, bytes)?,
                    ArchiveSource::OfflineSeed => {
                        increment(&mut counters.offline_seed_archive_bytes, bytes)?
                    }
                }
            }
            MetricEvent::CapabilityInvoked {
                component,
                succeeded,
            } => {
                let counters = counters(&mut snapshot, &component)?;
                increment(&mut counters.invocations, 1)?;
                if succeeded {
                    increment(&mut counters.successful_invocations, 1)?;
                }
            }
        }
        self.write(&snapshot)
    }

    /// Read the current release under the same lock as writers; superseded handles return an error.
    pub fn snapshot(&self) -> Result<MetricsSnapshot, String> {
        let _lock = self.lock()?;
        self.current()
    }

    fn empty_snapshot(&self) -> Result<MetricsSnapshot, String> {
        let window_started_at_unix_ms = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|_| "metrics clock is before the Unix epoch")?
            .as_millis()
            .try_into()
            .map_err(|_| "metrics clock exceeds the supported range")?;
        Ok(MetricsSnapshot {
            format_version: FORMAT_VERSION,
            app_version: self.app_version.clone(),
            window_started_at_unix_ms,
            boot_attempts: 0,
            workbench_ready_count: 0,
            workbench_ready_total_ms: 0,
            workbench_ready_max_ms: 0,
            readiness_failures: 0,
            components: self
                .component_keys
                .iter()
                .map(|key| (key.clone(), ComponentCounters::default()))
                .collect(),
        })
    }

    fn validate_current(&self, snapshot: &MetricsSnapshot) -> Result<(), String> {
        if snapshot.app_version != self.app_version {
            return Err("metrics handle belongs to a superseded release".into());
        }
        if !snapshot.components.keys().eq(self.component_keys.iter()) {
            return Err("metrics catalog differs from this release's catalog".into());
        }
        Ok(())
    }

    fn current(&self) -> Result<MetricsSnapshot, String> {
        let snapshot = self.read()?.ok_or("metrics aggregate is missing")?;
        self.validate_current(&snapshot)?;
        Ok(snapshot)
    }

    fn lock(&self) -> Result<File, String> {
        validate_directory(&fs::symlink_metadata(&self.root).map_err(io_error)?)?;
        let path = self.root.join(LOCK_FILE);
        validate_existing_file(&path)?;
        let mut options = regular_file_options();
        options.read(true).write(true).create(true).truncate(false);
        #[cfg(unix)]
        {
            use std::os::unix::fs::OpenOptionsExt;
            options.mode(0o600);
        }
        let file = options.open(path).map_err(io_error)?;
        validate_file(&file.metadata().map_err(io_error)?)?;
        let started = Instant::now();
        loop {
            match file.try_lock() {
                Ok(()) => return Ok(file),
                Err(TryLockError::WouldBlock) if started.elapsed() < LOCK_WAIT => {
                    std::thread::sleep(LOCK_POLL);
                }
                Err(TryLockError::WouldBlock) => return Err("metrics lock is busy".into()),
                Err(TryLockError::Error(error)) => return Err(io_error(error)),
            }
        }
    }

    fn read(&self) -> Result<Option<MetricsSnapshot>, String> {
        let path = self.root.join(METRICS_FILE);
        if !validate_existing_file(&path)? {
            return Ok(None);
        }
        let file = regular_file_options()
            .read(true)
            .open(path)
            .map_err(io_error)?;
        let metadata = file.metadata().map_err(io_error)?;
        validate_file(&metadata)?;
        if metadata.len() > MAX_FILE_BYTES {
            return Err("metrics file exceeds 64 KiB".into());
        }
        let mut bytes = Vec::new();
        file.take(MAX_FILE_BYTES + 1)
            .read_to_end(&mut bytes)
            .map_err(io_error)?;
        if bytes.len() as u64 > MAX_FILE_BYTES {
            return Err("metrics file exceeds 64 KiB".into());
        }
        let snapshot: MetricsSnapshot = serde_json::from_slice(&bytes)
            .map_err(|_| "metrics file does not match the aggregate schema")?;
        validate_snapshot(&snapshot)?;
        Ok(Some(snapshot))
    }

    fn write(&self, snapshot: &MetricsSnapshot) -> Result<(), String> {
        let bytes =
            serde_json::to_vec(snapshot).map_err(|_| "cannot serialize metrics aggregate")?;
        if bytes.len() as u64 > MAX_FILE_BYTES {
            return Err("metrics file exceeds 64 KiB".into());
        }
        let path = self.root.join(METRICS_FILE);
        validate_existing_file(&path)?;
        let mut temporary = tempfile::NamedTempFile::new_in(&self.root).map_err(io_error)?;
        temporary.write_all(&bytes).map_err(io_error)?;
        temporary.as_file().sync_all().map_err(io_error)?;
        temporary
            .persist(path)
            .map_err(|error| io_error(error.error))?;
        Ok(())
    }
}

fn counters<'a>(
    snapshot: &'a mut MetricsSnapshot,
    component: &str,
) -> Result<&'a mut ComponentCounters, String> {
    snapshot
        .components
        .get_mut(component)
        .ok_or_else(|| "metrics component is not in this release's catalog".into())
}

fn increment(counter: &mut u64, amount: u64) -> Result<(), String> {
    *counter = counter
        .checked_add(amount)
        .ok_or("metrics counter overflow")?;
    Ok(())
}

fn parse_version(value: &str) -> Result<Version, String> {
    if value.len() > MAX_IDENTIFIER_BYTES {
        return Err("metrics app version exceeds 64 bytes".into());
    }
    Version::parse(value).map_err(|_| "metrics app version is not valid SemVer".into())
}

fn valid_key(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= MAX_IDENTIFIER_BYTES
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'.' | b'_' | b'-'))
}

fn validate_catalog(keys: &[String]) -> Result<BTreeSet<String>, String> {
    if keys.len() > MAX_COMPONENTS || keys.iter().any(|key| !valid_key(key)) {
        return Err("metrics catalog has invalid or too many component keys".into());
    }
    let unique: BTreeSet<_> = keys.iter().cloned().collect();
    if unique.len() != keys.len() {
        return Err("metrics catalog contains duplicate component keys".into());
    }
    Ok(unique)
}

fn validate_snapshot(snapshot: &MetricsSnapshot) -> Result<(), String> {
    if snapshot.format_version != FORMAT_VERSION {
        return Err("metrics format version is unsupported".into());
    }
    parse_version(&snapshot.app_version)?;
    if snapshot.workbench_ready_max_ms > snapshot.workbench_ready_total_ms
        || u128::from(snapshot.workbench_ready_total_ms)
            > u128::from(snapshot.workbench_ready_count)
                * u128::from(snapshot.workbench_ready_max_ms)
        || snapshot.components.values().any(|counters| {
            counters.retransferred_bytes > counters.network_bytes
                || counters.resume_successes > counters.resume_attempts
                || counters.successful_invocations > counters.invocations
        })
    {
        return Err("metrics aggregate has inconsistent counters".into());
    }
    Ok(())
}

fn deserialize_components<'de, D>(
    deserializer: D,
) -> Result<BTreeMap<String, ComponentCounters>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    struct ComponentsVisitor;
    impl<'de> serde::de::Visitor<'de> for ComponentsVisitor {
        type Value = BTreeMap<String, ComponentCounters>;

        fn expecting(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
            formatter.write_str("at most 64 unique static component keys")
        }

        fn visit_map<M>(self, mut map: M) -> Result<Self::Value, M::Error>
        where
            M: serde::de::MapAccess<'de>,
        {
            let mut values = BTreeMap::new();
            while let Some(key) = map.next_key::<String>()? {
                if !valid_key(&key) || values.len() == MAX_COMPONENTS || values.contains_key(&key) {
                    return Err(serde::de::Error::custom(
                        "invalid or duplicate component key",
                    ));
                }
                values.insert(key, map.next_value()?);
            }
            Ok(values)
        }
    }
    deserializer.deserialize_map(ComponentsVisitor)
}

fn io_error(error: std::io::Error) -> String {
    format!("metrics storage is unavailable: {error}")
}

fn is_link(metadata: &Metadata) -> bool {
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        const FILE_ATTRIBUTE_REPARSE_POINT: u32 = 0x400;
        metadata.file_attributes() & FILE_ATTRIBUTE_REPARSE_POINT != 0
    }
    #[cfg(not(windows))]
    {
        metadata.file_type().is_symlink()
    }
}

fn validate_directory(metadata: &Metadata) -> Result<(), String> {
    if !metadata.is_dir() || is_link(metadata) {
        return Err("metrics root must be a real directory".into());
    }
    Ok(())
}

fn validate_file(metadata: &Metadata) -> Result<(), String> {
    if !metadata.is_file() || is_link(metadata) {
        return Err("metrics storage must use regular files".into());
    }
    Ok(())
}

fn validate_existing_file(path: &Path) -> Result<bool, String> {
    match fs::symlink_metadata(path) {
        Ok(metadata) => {
            validate_file(&metadata)?;
            Ok(true)
        }
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(false),
        Err(error) => Err(io_error(error)),
    }
}

fn regular_file_options() -> OpenOptions {
    let mut options = OpenOptions::new();
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.custom_flags(libc::O_NOFOLLOW | libc::O_NONBLOCK);
    }
    #[cfg(windows)]
    {
        use std::os::windows::fs::OpenOptionsExt;
        const FILE_FLAG_OPEN_REPARSE_POINT: u32 = 0x00200000;
        options.custom_flags(FILE_FLAG_OPEN_REPARSE_POINT);
    }
    options
}

#[cfg(test)]
#[path = "component_metrics_tests.rs"]
mod tests;
