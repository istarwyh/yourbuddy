//! Desktop-owned component preparation and current-Host activation observations.

use std::collections::{BTreeMap, BTreeSet};
use std::fs::{self, File, OpenOptions};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use super::boot_log;
use super::component_cache_cleanup::{CacheCleanup, CacheCleanupPreview, CacheCleanupResult};
use super::component_leases::{ComponentIdentity, ComponentLeaseSet, ComponentLeases};
use super::component_metrics::{ComponentMetrics, MetricEvent, MetricsSnapshot};
use super::component_plan::{ComponentKind, InstallPlan, PlanRequest};
use super::components::ComponentManager;
use super::optional_harbor::{classify_legacy_link, LegacyHarborState};
use super::process::{hide_console, isolate_host_group, kill_process_tree};
use super::provision::RuntimePaths;
use crate::network_proxy::{apply_to_command, ResolvedNetworkProxy};

const MAX_SAFE_INTEGER: u64 = 9_007_199_254_740_991;
const POMODORO_PACKAGE: &str = "@xiaohui-wang/dsh-pomodoro";
const HARBOR_PACKAGE: &str = "dsh-harbor-evolution";
const MAX_PROFILE_BYTES: u64 = 256 * 1024;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ComponentView {
    key: String,
    kind: ComponentKind,
    version: String,
    purpose: String,
    archive_bytes: u64,
    installed_bytes: Option<u64>,
    state: &'static str,
    policy: &'static str,
    can_install: bool,
    can_change_policy: bool,
    can_clean: bool,
    error: Option<String>,
    runtime_token: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ComponentOverview {
    app_version: String,
    components: Vec<ComponentView>,
    metrics: Option<MetricsSnapshot>,
    metrics_error: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallResult {
    pub restart_required: bool,
}

#[derive(Serialize)]
pub struct MetricResult {
    recorded: bool,
}

/// A current Host observation, never an instruction to release storage leases.
#[derive(Clone, Copy, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum RuntimeObservation {
    Active,
    Failed,
    Inactive,
}

#[derive(Clone)]
struct RuntimeState {
    token: String,
    eligible: bool,
    first_install_allowed: bool,
    phase: RuntimeObservation,
    installing: bool,
    error: Option<String>,
}

#[derive(Clone)]
struct ServiceState {
    sequence: u64,
    host_ready: bool,
    frontend_ready: bool,
    readiness_failed: bool,
    host_profile: Option<ProfileSnapshot>,
    core_profile: Option<ProfileSnapshot>,
    in_use: BTreeSet<String>,
    components: BTreeMap<String, RuntimeState>,
}

#[derive(Default)]
struct CacheConfirmation {
    sequence: u64,
    pending: Option<(String, String)>,
}

/// One application's authenticated catalog, serialized installs, and Host generation.
/// Runtime observations only affect display state. Leases remain until the owner exits.
pub struct ComponentService {
    manager: Arc<ComponentManager>,
    cache_cleanup: CacheCleanup,
    cache_confirmation: Mutex<CacheConfirmation>,
    leases: Arc<ComponentLeases>,
    held: Mutex<BTreeMap<String, ComponentLeaseSet>>,
    metrics: Option<ComponentMetrics>,
    metrics_error: Option<String>,
    generation: String,
    started: Instant,
    state: Mutex<ServiceState>,
}

impl ComponentService {
    /// Construct on a blocking thread; metric initialization failure is diagnostic only.
    pub fn new(manager: Arc<ComponentManager>) -> Result<Self, String> {
        Self::new_at(manager, Instant::now())
    }

    pub fn new_at(manager: Arc<ComponentManager>, started: Instant) -> Result<Self, String> {
        let leases = Arc::new(ComponentLeases::new(manager.cache_root())?);
        let nonce = tempfile::Builder::new()
            .prefix("runtime-")
            .tempfile_in(manager.cache_root())
            .map_err(|error| format!("cannot reserve component runtime generation: {error}"))?;
        let generation = hex::encode(Sha256::digest(
            nonce.path().file_name().unwrap().as_encoded_bytes(),
        ));
        let keys: Vec<_> = manager.catalog().components.keys().cloned().collect();
        let (metrics, metrics_error) = match ComponentMetrics::open(
            &manager.cache_root().join("statistics"),
            &manager.catalog().app_version,
            &keys,
        ) {
            Ok(metrics) => (Some(metrics), None),
            Err(error) => {
                boot_log::info(&format!("component metrics unavailable: {error}"));
                (None, Some(error))
            }
        };
        let service = Self {
            cache_cleanup: CacheCleanup::new(Arc::clone(&manager)),
            cache_confirmation: Mutex::new(CacheConfirmation::default()),
            manager,
            leases,
            held: Mutex::new(BTreeMap::new()),
            metrics,
            metrics_error,
            generation,
            started,
            state: Mutex::new(ServiceState {
                sequence: 0,
                host_ready: false,
                frontend_ready: false,
                readiness_failed: false,
                host_profile: None,
                core_profile: None,
                in_use: BTreeSet::new(),
                components: BTreeMap::new(),
            }),
        };
        service.record_metric(MetricEvent::BootStarted);
        Ok(service)
    }

    /// Preview only re-downloadable archive files. Run on a blocking thread.
    pub fn preview_cache_cleanup(&self) -> Result<CacheCleanupPreview, String> {
        let sequence = {
            let mut confirmation = self
                .cache_confirmation
                .lock()
                .map_err(|error| error.to_string())?;
            confirmation.pending = None;
            confirmation.sequence = confirmation
                .sequence
                .checked_add(1)
                .ok_or("CACHE_CLEANUP_UNSAFE: confirmation sequence exhausted")?;
            confirmation.sequence
        };
        self.require_cache_cleanup_layout()?;
        let mut preview = self.cache_cleanup.preview()?;
        let mut confirmation = self
            .cache_confirmation
            .lock()
            .map_err(|error| error.to_string())?;
        if confirmation.sequence != sequence {
            return Err("CACHE_CLEANUP_STALE: a newer preview superseded this request".into());
        }
        let wire_token = hex::encode(Sha256::digest(
            format!(
                "{}:{}:{}",
                self.generation, confirmation.sequence, preview.token
            )
            .as_bytes(),
        ));
        confirmation.pending = Some((wire_token.clone(), preview.token));
        preview.token = wire_token;
        Ok(preview)
    }

    /// Recheck the layout and confirmed file identities before removing download files.
    pub fn clean_cache(&self, token: &str) -> Result<CacheCleanupResult, String> {
        let snapshot_token = {
            let mut confirmation = self
                .cache_confirmation
                .lock()
                .map_err(|error| error.to_string())?;
            if !confirmation
                .pending
                .as_ref()
                .is_some_and(|(current, _)| current == token)
            {
                return Err(
                    "CACHE_CLEANUP_STALE: preview confirmation is absent or superseded".into(),
                );
            }
            confirmation.pending.take().unwrap().1
        };
        self.require_cache_cleanup_layout()?;
        self.cache_cleanup.execute(&snapshot_token)
    }

    fn require_cache_cleanup_layout(&self) -> Result<(), String> {
        #[cfg(not(unix))]
        return Err(
            "CACHE_CLEANUP_UNSUPPORTED: download cache cleanup is unavailable on this platform"
                .into(),
        );
        #[cfg(unix)]
        {
            let app_root = self
                .manager
                .cache_root()
                .parent()
                .ok_or("CACHE_CLEANUP_UNSAFE: component cache has no application root")?;
            crate::cli_shim::require_cli_cleanup_coverage(app_root)
                .map_err(|error| format!("CACHE_CLEANUP_UNSAFE: {error}"))
        }
    }

    fn record_metric(&self, event: MetricEvent) -> bool {
        let Some(metrics) = &self.metrics else {
            return false;
        };
        match metrics.record(event) {
            Ok(()) => true,
            Err(error) => {
                boot_log::info(&format!("component metric was not recorded: {error}"));
                false
            }
        }
    }

    /// Record a committed Client workbench once. Run on a blocking thread.
    pub fn workbench_ready(&self) -> Result<MetricResult, String> {
        let mut state = self.state.lock().map_err(|error| error.to_string())?;
        if !state.host_ready || state.readiness_failed {
            return Err("component Host is not ready".into());
        }
        if state.frontend_ready {
            return Ok(MetricResult { recorded: false });
        }
        state.frontend_ready = true;
        drop(state);
        let elapsed_ms = u64::try_from(self.started.elapsed().as_millis()).unwrap_or(u64::MAX);
        Ok(MetricResult {
            recorded: self.record_metric(MetricEvent::WorkbenchReady { elapsed_ms }),
        })
    }

    /// Record one failed boot, independently of presenting its failure. Run on a blocking thread.
    pub fn readiness_failed(&self) {
        let Ok(mut state) = self.state.lock() else {
            return;
        };
        if state.frontend_ready || state.readiness_failed {
            return;
        }
        state.readiness_failed = true;
        drop(state);
        self.record_metric(MetricEvent::ReadinessFailed);
    }

    /// Count an actual timer action without treating it as a Host mount observation.
    pub fn invocation(
        &self,
        key: &str,
        token: &str,
        succeeded: bool,
    ) -> Result<MetricResult, String> {
        let state = self.state.lock().map_err(|error| error.to_string())?;
        if key != "pomodoro" || !state.host_ready || state.readiness_failed {
            return Err("component invocation is unavailable".into());
        }
        let eligible = state
            .components
            .get("harness")
            .is_some_and(|entry| entry.eligible && !entry.installing && entry.token == token);
        if !eligible {
            return Err("component invocation identity is stale or ineligible".into());
        }
        drop(state);
        Ok(MetricResult {
            recorded: self.record_metric(MetricEvent::CapabilityInvoked {
                component: "harness".into(),
                succeeded,
            }),
        })
    }

    /// Hold every exact plan dependency before preparation or a child can use it.
    pub async fn hold(&self, key: &str, request: &PlanRequest) -> Result<(), String> {
        if !self.manager.catalog().components.contains_key(key) {
            return Err("component lease key is unavailable in this release".into());
        }
        if self
            .held
            .lock()
            .map_err(|error| error.to_string())?
            .contains_key(key)
        {
            return Ok(());
        }
        let identities = self
            .manager
            .installation_plan(request)?
            .components
            .into_iter()
            .map(|entry| ComponentIdentity {
                component: entry.component,
                id: entry.id,
            })
            .collect::<Vec<_>>();
        let leases = Arc::clone(&self.leases);
        let acquired = tokio::task::spawn_blocking(move || leases.acquire_shared(&identities))
            .await
            .map_err(|error| format!("component lease task failed: {error}"))??;
        self.held
            .lock()
            .map_err(|error| error.to_string())?
            .entry(key.into())
            .or_insert(acquired);
        Ok(())
    }

    /// Pass shared leases to a direct Unix consumer; Windows cleanup remains unavailable.
    pub fn inherit_into(&self, command: &mut Command) -> Result<(), String> {
        #[cfg(unix)]
        for lease in self
            .held
            .lock()
            .map_err(|error| error.to_string())?
            .values()
        {
            lease.inherit_shared_into(command)?;
        }
        #[cfg(not(unix))]
        let _ = command;
        Ok(())
    }

    /// Capture Profile references immediately before spawning this Host.
    pub fn before_host_start(&self, paths: &RuntimePaths) -> Result<(), String> {
        let snapshot = inspect_startup_profile(paths, HARBOR_PACKAGE);
        self.state
            .lock()
            .map_err(|error| error.to_string())?
            .host_profile = snapshot;
        self.state
            .lock()
            .map_err(|error| error.to_string())?
            .core_profile = inspect_startup_profile(paths, POMODORO_PACKAGE);
        Ok(())
    }

    /// Bind observed mounts only to references unchanged throughout this Host's startup.
    pub fn bind_host(&self, paths: &RuntimePaths) -> Result<(), String> {
        self.state
            .lock()
            .map_err(|error| error.to_string())?
            .host_ready = true;
        let snapshot = inspect_startup_profile(paths, HARBOR_PACKAGE);
        let before = self
            .state
            .lock()
            .map_err(|error| error.to_string())?
            .host_profile
            .take();
        let same = before
            .as_ref()
            .zip(snapshot.as_ref())
            .is_some_and(|(before, snapshot)| {
                before.dependency == snapshot.dependency && before.link == snapshot.link
            });
        if self
            .manager
            .catalog()
            .components
            .contains_key("harborPlugin")
        {
            let current = self.manager.installed("harborPlugin")?;
            let eligible = same
                && current.as_ref().is_some_and(|path| {
                    snapshot
                        .as_ref()
                        .is_some_and(|snapshot| snapshot.points_to(path))
                });
            self.begin_observation("harborPlugin", eligible, false)?;
            let mut state = self.state.lock().map_err(|error| error.to_string())?;
            let entry = state.components.get_mut("harborPlugin").unwrap();
            entry.first_install_allowed =
                same && snapshot.as_ref().is_some_and(ProfileSnapshot::absent);
            if snapshot.as_ref().is_some_and(|snapshot| {
                snapshot.legacy_harbor_state(&paths.dsh_home) == Some(LegacyHarborState::Missing)
            }) {
                entry.error = Some("Previously installed Harbor is unavailable; install Harbor again, then restart YourBuddy to verify its current identity.".into());
            }
        }
        let core_snapshot = inspect_startup_profile(paths, POMODORO_PACKAGE);
        let before_core = self
            .state
            .lock()
            .map_err(|error| error.to_string())?
            .core_profile
            .take();
        let core_root = paths.harness_root.join("packages/product/pomodoro");
        let core_eligible = before_core
            .as_ref()
            .zip(core_snapshot.as_ref())
            .is_some_and(|(before, after)| {
                before.dependency == after.dependency
                    && before.link == after.link
                    && (after.absent() || after.points_to(&core_root))
            })
            && self.manager.installed("harness")?.is_some()
            && core_package_matches(&core_root, POMODORO_PACKAGE);
        self.begin_observation("harness", core_eligible, false)?;
        let mut state = self.state.lock().map_err(|error| error.to_string())?;
        state.in_use.insert("harness".into());
        if let Some(root) = self.manager.installed("node")? {
            if fs::canonicalize(&paths.node_binary)
                .ok()
                .is_some_and(|path| path.starts_with(&root))
            {
                state.in_use.insert("node".into());
            }
        }
        Ok(())
    }

    /// Observe one eligible current identity using a token unique to this Host and install round.
    pub fn report(
        &self,
        key: &str,
        token: &str,
        observation: RuntimeObservation,
    ) -> Result<InstallResult, String> {
        if key != "harborPlugin" {
            return Err("component does not accept a managed plugin mount observation".into());
        }
        let mut state = self.state.lock().map_err(|error| error.to_string())?;
        let entry = state
            .components
            .get_mut(key)
            .ok_or("component runtime observation is unavailable")?;
        if !entry.eligible || entry.installing || entry.token != token {
            return Err("component runtime observation is stale or ineligible".into());
        }
        if observation == RuntimeObservation::Active {
            self.manager.activate_observed(key)?;
        }
        entry.phase = observation;
        entry.error = (observation == RuntimeObservation::Failed)
            .then(|| "component Host mount failed".into());
        Ok(InstallResult {
            restart_required: observation != RuntimeObservation::Active,
        })
    }

    /// Read inventory without preparing components. Call on a blocking thread.
    pub fn overview(&self) -> Result<ComponentOverview, String> {
        let state = self
            .state
            .lock()
            .map_err(|error| error.to_string())?
            .clone();
        let mut components = Vec::new();
        for (key, spec) in &self.manager.catalog().components {
            let installed = self.manager.installed(key)?;
            let observation = state.components.get(key);
            let phase = match observation {
                Some(entry) if entry.installing => "installing",
                Some(entry) if entry.error.is_some() => "failed",
                Some(entry) if entry.eligible && entry.phase == RuntimeObservation::Active => {
                    "active"
                }
                _ if state.in_use.contains(key) && installed.is_some() => "in-use",
                _ if installed.is_some() => "prepared",
                _ => "absent",
            };
            let policy = match spec.kind {
                ComponentKind::CoreRuntime => "required",
                ComponentKind::RuntimeFallback => "fallback",
                ComponentKind::CapabilityOnDemand => "on-demand",
                ComponentKind::Optional => "manual",
            };
            components.push(ComponentView {
                key: key.clone(),
                kind: spec.kind,
                version: spec.version.clone(),
                purpose: spec.purpose.clone(),
                archive_bytes: spec.bytes,
                installed_bytes: None,
                state: phase,
                policy,
                can_install: matches!(key.as_str(), "harborPlugin" | "harbor")
                    && phase != "installing"
                    && phase != "active",
                can_change_policy: false,
                can_clean: false,
                error: observation.and_then(|entry| entry.error.clone()),
                runtime_token: observation
                    .filter(|entry| entry.eligible && !entry.installing)
                    .map(|entry| entry.token.clone()),
            });
        }
        let (metrics, metrics_error) = match &self.metrics {
            Some(metrics) => match metrics.snapshot().and_then(js_safe_metrics) {
                Ok(snapshot) => (Some(snapshot), None),
                Err(error) => (None, Some(error)),
            },
            None => (None, self.metrics_error.clone()),
        };
        Ok(ComponentOverview {
            app_version: self.manager.catalog().app_version.clone(),
            components,
            metrics,
            metrics_error,
        })
    }

    /// Preview only fixed application capabilities; paths and package names are not caller inputs.
    pub fn plan(&self, key: &str) -> Result<InstallPlan, String> {
        self.manager
            .installation_plan(&self.capability_request(key)?)
    }

    /// Prepare one reviewed archive closure, then use the Profile owner's guarded link operation.
    pub async fn install(
        self: &Arc<Self>,
        key: &str,
        paths: &RuntimePaths,
        host_path: &str,
        proxy: &ResolvedNetworkProxy,
    ) -> Result<InstallResult, String> {
        self.capability_request(key)?;
        let service = Arc::clone(self);
        let key = key.to_string();
        let paths = paths.clone();
        let host_path = host_path.to_string();
        let proxy = proxy.clone();
        // A cancelled WebView wait must not abandon an accepted Profile operation.
        tokio::spawn(async move {
            service
                .install_owned(&key, &paths, &host_path, &proxy)
                .await
        })
        .await
        .map_err(|error| format!("component installation task failed: {error}"))?
    }

    async fn install_owned(
        &self,
        key: &str,
        paths: &RuntimePaths,
        host_path: &str,
        proxy: &ResolvedNetworkProxy,
    ) -> Result<InstallResult, String> {
        let request = self.capability_request(key)?;
        let lock_path = self.manager.cache_root().join("capability-install.lock");
        let lock = tokio::task::spawn_blocking(move || install_lock(&lock_path))
            .await
            .map_err(|error| format!("component install lock task failed: {error}"))??;
        let lock = Arc::new(lock);
        let previous = self
            .state
            .lock()
            .map_err(|error| error.to_string())?
            .components
            .get(key)
            .map(|entry| (entry.eligible, entry.first_install_allowed))
            .unwrap_or((false, false));
        self.begin_observation(key, false, true)?;
        let result = self
            .install_inner(
                key,
                &request,
                paths,
                host_path,
                proxy,
                previous,
                Arc::clone(&lock),
            )
            .await;
        if let Err(error) = &result {
            if let Some(entry) = self
                .state
                .lock()
                .map_err(|error| error.to_string())?
                .components
                .get_mut(key)
            {
                entry.installing = false;
                entry.first_install_allowed = previous.1;
                entry.error = Some(error.clone());
            }
        }
        result
    }

    async fn install_inner(
        &self,
        key: &str,
        request: &PlanRequest,
        paths: &RuntimePaths,
        host_path: &str,
        proxy: &ResolvedNetworkProxy,
        previous: (bool, bool),
        lock: Arc<File>,
    ) -> Result<InstallResult, String> {
        self.hold(key, request).await?;
        let snapshot = if key == "harborPlugin" {
            let snapshot = read_profile_snapshot(paths, HARBOR_PACKAGE)?;
            snapshot.require_application_owned(self.manager.cache_root(), &paths.dsh_home)?;
            Some(snapshot)
        } else {
            None
        };
        self.manager.prepare(request).await?;
        let root = self
            .manager
            .installed(key)?
            .ok_or("component preparation did not produce a verified root")?;
        let mut eligible = false;
        if let Some(snapshot) = snapshot {
            eligible =
                (previous.1 && snapshot.absent()) || (previous.0 && snapshot.points_to(&root));
            let mut command = managed_install_command(paths, host_path, &root, &snapshot)?;
            apply_to_command(&mut command, proxy);
            self.inherit_into(&mut command)?;
            let result = tokio::task::spawn_blocking(move || {
                let _operation_lock = lock;
                run_managed_install(command)
            })
            .await
            .map_err(|error| format!("component Profile task failed: {error}"))?;
            result?;
            if !read_profile_snapshot(paths, HARBOR_PACKAGE)?.points_to(&root) {
                return Err(
                    "component Profile changed before its installation could be confirmed".into(),
                );
            }
        }
        let mut state = self.state.lock().map_err(|error| error.to_string())?;
        let entry = state
            .components
            .get_mut(key)
            .ok_or("component install state is missing")?;
        entry.installing = false;
        entry.eligible = eligible;
        entry.error = None;
        Ok(InstallResult {
            restart_required: key == "harborPlugin",
        })
    }

    fn capability_request(&self, key: &str) -> Result<PlanRequest, String> {
        if !matches!(key, "harborPlugin" | "harbor") {
            return Err("component is not an installable capability".into());
        }
        let spec = self
            .manager
            .catalog()
            .components
            .get(key)
            .ok_or("component is unavailable in this release")?;
        if spec.kind != ComponentKind::CapabilityOnDemand {
            return Err("capability has an unexpected release category".into());
        }
        Ok(PlanRequest::Capability(key.into()))
    }

    fn begin_observation(&self, key: &str, eligible: bool, installing: bool) -> Result<(), String> {
        let mut state = self.state.lock().map_err(|error| error.to_string())?;
        state.sequence = state
            .sequence
            .checked_add(1)
            .ok_or("component runtime sequence exhausted")?;
        let token = format!("{}_{}", self.generation, state.sequence);
        state.components.insert(
            key.into(),
            RuntimeState {
                token,
                eligible,
                first_install_allowed: false,
                phase: RuntimeObservation::Inactive,
                installing,
                error: None,
            },
        );
        Ok(())
    }
}

#[derive(Clone, Serialize)]
struct ProfileSnapshot {
    dependency: Option<String>,
    link: Option<String>,
    #[serde(skip)]
    profile: PathBuf,
    #[serde(skip)]
    link_parent: PathBuf,
}

impl ProfileSnapshot {
    fn absent(&self) -> bool {
        self.dependency.is_none() && self.link.is_none()
    }

    fn targets(&self) -> Option<(PathBuf, PathBuf)> {
        let dependency = self.dependency.as_ref()?.strip_prefix("link:")?;
        let link = self.link.as_ref()?;
        Some((self.profile.join(dependency), self.link_parent.join(link)))
    }

    fn points_to(&self, root: &Path) -> bool {
        let Ok(root) = fs::canonicalize(root) else {
            return false;
        };
        self.targets().is_some_and(|(dependency, link)| {
            fs::canonicalize(dependency).ok().as_ref() == Some(&root)
                && fs::canonicalize(link).ok().as_ref() == Some(&root)
        })
    }

    fn legacy_harbor_state(&self, home: &Path) -> Option<LegacyHarborState> {
        classify_legacy_link(
            home,
            &self.profile,
            self.dependency.as_deref(),
            self.link.as_deref(),
        )
    }

    fn require_application_owned(&self, components: &Path, home: &Path) -> Result<(), String> {
        if self.absent() || self.legacy_harbor_state(home).is_some() {
            return Ok(());
        }
        let components = fs::canonicalize(components).map_err(|error| error.to_string())?;
        let (dependency, link) = self
            .targets()
            .ok_or("component conflicts with a user-managed Profile dependency")?;
        for path in [dependency, link] {
            let canonical = fs::canonicalize(path).map_err(|_| {
                "existing component link is unresolved; repair the Profile before retrying"
            })?;
            if !canonical.starts_with(components.join("packs/harborPlugin")) {
                return Err("component conflicts with a user-managed Profile dependency".into());
            }
        }
        Ok(())
    }
}

fn core_package_matches(root: &Path, expected: &str) -> bool {
    let manifest = root.join("package.json");
    let Ok(metadata) = fs::metadata(&manifest) else {
        return false;
    };
    if !metadata.is_file() || metadata.len() > MAX_PROFILE_BYTES {
        return false;
    }
    let Ok(raw) = fs::read(&manifest) else {
        return false;
    };
    let Ok(value) = serde_json::from_slice::<serde_json::Value>(&raw) else {
        return false;
    };
    value.get("name").and_then(serde_json::Value::as_str) == Some(expected)
}

fn inspect_startup_profile(paths: &RuntimePaths, package: &str) -> Option<ProfileSnapshot> {
    match read_profile_snapshot(paths, package) {
        Ok(snapshot) => Some(snapshot),
        Err(error) => {
            boot_log::info(&format!(
                "component startup identity is unavailable: {error}"
            ));
            None
        }
    }
}

fn read_profile_snapshot(paths: &RuntimePaths, package: &str) -> Result<ProfileSnapshot, String> {
    let profile = paths.dsh_home.join("profiles/web");
    let manifest = profile.join("package.json");
    let dependency = match fs::metadata(&manifest) {
        Ok(metadata) if metadata.len() <= MAX_PROFILE_BYTES => {
            let value: serde_json::Value =
                serde_json::from_slice(&fs::read(&manifest).map_err(|error| error.to_string())?)
                    .map_err(|error| format!("Profile manifest is invalid: {error}"))?;
            match value.get("dependencies").and_then(|deps| deps.get(package)) {
                None => None,
                Some(value) => Some(
                    value
                        .as_str()
                        .ok_or("Profile dependency is not a string")?
                        .to_string(),
                ),
            }
        }
        Ok(_) => return Err("Profile manifest exceeds component inspection limit".into()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => None,
        Err(error) => return Err(format!("cannot read Profile manifest: {error}")),
    };
    let path = profile.join("node_modules").join(package);
    let link = match fs::symlink_metadata(&path) {
        Ok(metadata) if metadata.file_type().is_symlink() => Some(
            fs::read_link(&path)
                .map_err(|error| error.to_string())?
                .to_str()
                .ok_or("Profile link is not valid UTF-8")?
                .to_string(),
        ),
        Ok(_) => return Err("component cannot replace a real Profile package directory".into()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => None,
        Err(error) => return Err(format!("cannot inspect Profile package link: {error}")),
    };
    if dependency
        .as_ref()
        .is_some_and(|s| s.is_empty() || s.len() > 4096)
        || link
            .as_ref()
            .is_some_and(|s| s.is_empty() || s.len() > 4096)
    {
        return Err("Profile component reference exceeds supported bounds".into());
    }
    Ok(ProfileSnapshot {
        dependency,
        link,
        profile,
        link_parent: path.parent().unwrap().to_path_buf(),
    })
}

fn install_lock(path: &Path) -> Result<File, String> {
    let mut options = OpenOptions::new();
    options.read(true).write(true).create(true).truncate(false);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.custom_flags(libc::O_NOFOLLOW).mode(0o600);
    }
    #[cfg(windows)]
    {
        use std::os::windows::fs::OpenOptionsExt;
        options.custom_flags(0x0020_0000);
    }
    let file = options
        .open(path)
        .map_err(|error| format!("cannot open component installation lock: {error}"))?;
    let metadata = file.metadata().map_err(|error| error.to_string())?;
    if !metadata.is_file() || metadata.file_type().is_symlink() {
        return Err("component installation lock must be a regular file".into());
    }
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        if metadata.file_attributes() & 0x400 != 0 {
            return Err("component installation lock must not be a reparse point".into());
        }
    }
    file.try_lock()
        .map_err(|_| "another component installation is active".to_string())?;
    Ok(file)
}

fn managed_install_command(
    paths: &RuntimePaths,
    host_path: &str,
    root: &Path,
    snapshot: &ProfileSnapshot,
) -> Result<Command, String> {
    let mut command = Command::new(&paths.node_binary);
    command
        .arg(&paths.cli_entry)
        .args(["plugin", "--profile", "web"])
        .arg(format!("--rollback-package={HARBOR_PACKAGE}"))
        .arg(format!(
            "--rollback-expected={}",
            serde_json::to_string(snapshot).map_err(|error| error.to_string())?
        ))
        .args(["add", "--offline", "--ignore-scripts"])
        .arg(format!(
            "link:{}",
            root.to_str().ok_or("component path is not valid UTF-8")?
        ))
        .current_dir(&paths.harness_root)
        .env("DSH_HOME", &paths.dsh_home)
        .env("PATH", host_path)
        .env("NODE_ENV", "production")
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    hide_console(&mut command);
    isolate_host_group(&mut command);
    Ok(command)
}

fn run_managed_install(mut command: Command) -> Result<(), String> {
    let mut child = command
        .spawn()
        .map_err(|error| format!("cannot start component Profile installation: {error}"))?;
    drop(command);
    let deadline = Instant::now() + Duration::from_secs(15 * 60);
    loop {
        match child.try_wait() {
            Ok(Some(status)) if status.success() => return Ok(()),
            Ok(Some(_)) => return Err("component Profile installation failed; inspect the Profile operation diagnostics before retrying".into()),
            Ok(None) if Instant::now() < deadline => std::thread::sleep(Duration::from_millis(100)),
            result => {
                kill_process_tree(child.id());
                let _ = child.kill();
                let _ = child.wait();
                return Err(format!("component Profile installation did not settle; restoration is unconfirmed: {result:?}"));
            }
        }
    }
}

fn js_safe_metrics(snapshot: MetricsSnapshot) -> Result<MetricsSnapshot, String> {
    let value = serde_json::to_value(&snapshot).map_err(|error| error.to_string())?;
    fn safe(value: &serde_json::Value) -> bool {
        match value {
            serde_json::Value::Number(number) => number
                .as_u64()
                .is_some_and(|number| number <= MAX_SAFE_INTEGER),
            serde_json::Value::Object(object) => object.values().all(safe),
            serde_json::Value::Array(array) => array.iter().all(safe),
            _ => true,
        }
    }
    if !safe(&value) {
        return Err("local component counters exceed JavaScript's exact integer range".into());
    }
    Ok(snapshot)
}

#[cfg(test)]
#[path = "component_service_tests.rs"]
mod tests;
