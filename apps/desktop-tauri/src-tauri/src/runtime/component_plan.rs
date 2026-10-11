//! Exact current-release component contracts and side-effect-free installation planning.

use std::collections::{BTreeMap, BTreeSet};

use serde::{Deserialize, Serialize};

pub const COMPONENT_SCHEMA_VERSION: u32 = 2;
const MAX_COMPONENTS: usize = 64;
const MAX_DEPENDENCIES: usize = 16;
const MAX_DEPENDENCY_DEPTH: usize = 16;
const MAX_SAFE_BYTES: u64 = 9_007_199_254_740_991;

/// A component's release-owned installation category, separate from its current local state.
#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum ComponentKind {
    CoreRuntime,
    RuntimeFallback,
    CapabilityOnDemand,
    Optional,
}

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

/// Immutable archive and exact dependency metadata; no version ranges or prior-release fallbacks.
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ComponentSpec {
    pub id: String,
    pub archive: String,
    pub sha256: String,
    pub bytes: u64,
    pub kind: ComponentKind,
    pub version: String,
    pub purpose: String,
    pub depends_on: BTreeMap<String, String>,
}

/// An explicit request: fallback runtime installation requires its own caller decision.
#[derive(Clone, Debug)]
pub enum PlanRequest {
    Startup,
    Fallback(String),
    Capability(String),
    Optional(String),
}

/// Current installation identities established by the verified component manager.
///
/// The owner inserts an identity only after checking its signed spec and the completion marker
/// written after archive digest verification. A directory's existence is insufficient.
#[derive(Default)]
pub struct VerifiedInstallations {
    ids: BTreeMap<String, String>,
}

impl VerifiedInstallations {
    /// Record an installation only after the manager's existing verification chain succeeds.
    pub(super) fn insert_verified(&mut self, name: String, id: String) {
        self.ids.insert(name, id);
    }
}

/// Whether the manager must prepare a component or can use its verified current installation.
#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum PlanAction {
    Prepare,
    Reuse,
}

/// One dependency-first step in an installation plan.
#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlanEntry {
    pub component: String,
    pub id: String,
    pub action: PlanAction,
    pub archive_bytes: u64,
}

/// A deterministic plan, with no filesystem, network, activation, or settings side effects.
#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallPlan {
    pub components: Vec<PlanEntry>,
    /// Sum of archives needing preparation; seeds/cache can make actual network transfer lower.
    /// Failed attempts and retransmission can make it higher. This is not a network-byte budget.
    pub prepare_archive_bytes: u64,
}

/// Parse only the current schema, after the caller authenticates the original bytes.
///
/// Inspect the schema envelope first so an authentic old manifest is reported as unsupported,
/// rather than accidentally entering a partially deserialized current contract.
pub(super) fn parse_manifest(bytes: &[u8]) -> Result<ComponentManifest, String> {
    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct Schema {
        schema_version: u32,
    }
    let schema: Schema = serde_json::from_slice(bytes)
        .map_err(|error| format!("component manifest is invalid: {error}"))?;
    if schema.schema_version != COMPONENT_SCHEMA_VERSION {
        return Err(format!(
            "unsupported component manifest schema {}",
            schema.schema_version
        ));
    }
    let manifest: ComponentManifest = serde_json::from_slice(bytes)
        .map_err(|error| format!("component manifest is invalid: {error}"))?;
    validate_manifest(&manifest)?;
    Ok(manifest)
}

/// Validate the bounded exact dependency graph shared with the release producer.
pub(super) fn validate_manifest(manifest: &ComponentManifest) -> Result<(), String> {
    if manifest.schema_version != COMPONENT_SCHEMA_VERSION {
        return Err(format!(
            "unsupported component manifest schema {}",
            manifest.schema_version
        ));
    }
    let parts: Vec<_> = manifest.app_version.split('.').collect();
    if manifest.app_version.len() > 128
        || parts.len() != 3
        || parts
            .iter()
            .any(|part| part.is_empty() || !part.bytes().all(|b| b.is_ascii_digit()))
    {
        return Err("component manifest appVersion is invalid".into());
    }
    if manifest.platform != "darwin" || manifest.arch != "arm64" {
        return Err("component manifest does not target darwin-arm64".into());
    }
    if manifest.release_tag.len() > 160
        || manifest.release_tag != format!("yourbuddy-v{}", manifest.app_version)
    {
        return Err("component release tag does not match application version".into());
    }
    if manifest.components.is_empty() || manifest.components.len() > MAX_COMPONENTS {
        return Err("component count must be between 1 and 64".into());
    }
    for (name, expected_kind) in [
        ("harness", ComponentKind::CoreRuntime),
        ("node", ComponentKind::RuntimeFallback),
        ("pnpmStore", ComponentKind::RuntimeFallback),
        ("harbor", ComponentKind::CapabilityOnDemand),
    ] {
        let spec = manifest
            .components
            .get(name)
            .ok_or_else(|| format!("component manifest is missing {name}"))?;
        if spec.kind != expected_kind {
            return Err(format!("component {name} has the wrong installation kind"));
        }
    }
    let mut total = 0_u64;
    for (name, spec) in &manifest.components {
        validate_component_name(name)?;
        validate_spec(spec)?;
        total = checked_archive_sum(total, spec.bytes)?;
        for (dependency, expected_id) in &spec.depends_on {
            validate_component_name(dependency)?;
            let required = manifest.components.get(dependency).ok_or_else(|| {
                format!("component {name} requires missing component {dependency}")
            })?;
            if expected_id != &required.id {
                return Err(format!(
                    "component {name} requires a different identity of {dependency}"
                ));
            }
            if required.kind == ComponentKind::RuntimeFallback {
                return Err(format!(
                    "component {name} cannot automatically install fallback {dependency}"
                ));
            }
            if spec.kind == ComponentKind::CoreRuntime
                && required.kind != ComponentKind::CoreRuntime
            {
                return Err(format!(
                    "core component {name} cannot require non-core {dependency}"
                ));
            }
        }
    }
    let harness_id = &manifest.components["harness"].id;
    if manifest.components["harbor"].depends_on.get("harness") != Some(harness_id) {
        return Err("Harbor must depend on the current Harness identity".into());
    }
    let mut visiting = BTreeSet::new();
    let mut depths = BTreeMap::new();
    for name in manifest.components.keys() {
        dependency_depth(name, manifest, &mut visiting, &mut depths)?;
    }
    Ok(())
}

fn dependency_depth(
    name: &str,
    manifest: &ComponentManifest,
    visiting: &mut BTreeSet<String>,
    depths: &mut BTreeMap<String, usize>,
) -> Result<usize, String> {
    if let Some(depth) = depths.get(name) {
        return Ok(*depth);
    }
    if !visiting.insert(name.into()) {
        return Err(format!("component dependency cycle includes {name}"));
    }
    let mut depth = 1;
    for dependency in manifest.components[name].depends_on.keys() {
        depth = depth.max(1 + dependency_depth(dependency, manifest, visiting, depths)?);
        if depth > MAX_DEPENDENCY_DEPTH {
            return Err("component dependency depth exceeds 16".into());
        }
    }
    visiting.remove(name);
    depths.insert(name.into(), depth);
    Ok(depth)
}

pub(super) fn validate_component_name(name: &str) -> Result<(), String> {
    if name.is_empty()
        || name.len() > 64
        || !name.as_bytes()[0].is_ascii_alphanumeric()
        || !name
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'.' | b'_' | b'-'))
    {
        return Err(format!("component name is invalid: {name}"));
    }
    Ok(())
}

pub(super) fn validate_spec(spec: &ComponentSpec) -> Result<(), String> {
    if spec.id.len() > 160 || spec.id.is_empty() || !spec.id.as_bytes()[0].is_ascii_alphanumeric() {
        return Err("component id is invalid".into());
    }
    component_key(&spec.id)?;
    if spec.bytes == 0 || spec.bytes > MAX_SAFE_BYTES {
        return Err("component archive byte count is invalid".into());
    }
    if spec.sha256.len() != 64
        || !spec
            .sha256
            .bytes()
            .all(|b| b.is_ascii_digit() || matches!(b, b'a'..=b'f'))
        || spec.archive.len() > 240
        || !spec.archive.to_ascii_lowercase().starts_with("yourbuddy-")
        || !spec.archive.to_ascii_lowercase().ends_with(".tar.zst")
        || spec.archive.len() <= "yourbuddy-.tar.zst".len()
        || spec.archive.contains("..")
        || !spec
            .archive
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'.' | b'_' | b'-'))
    {
        return Err(format!(
            "component archive metadata is invalid: {}",
            spec.archive
        ));
    }
    if spec.version.is_empty()
        || spec.version.len() > 128
        || spec.purpose.is_empty()
        || spec.purpose.len() > 512
    {
        return Err("component version or purpose is invalid".into());
    }
    if spec.depends_on.len() > MAX_DEPENDENCIES {
        return Err("component dependency count exceeds 16".into());
    }
    Ok(())
}

pub(super) fn component_key(id: &str) -> Result<&str, String> {
    let key = id
        .strip_prefix("sha256:")
        .or_else(|| id.strip_prefix("node:"))
        .unwrap_or(id);
    if key.is_empty()
        || matches!(key, "." | "..")
        || !key
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'.' | b'-' | b'_' | b':'))
    {
        return Err(format!("component id is invalid: {id}"));
    }
    Ok(key)
}

fn checked_archive_sum(total: u64, bytes: u64) -> Result<u64, String> {
    total
        .checked_add(bytes)
        .filter(|sum| *sum <= MAX_SAFE_BYTES)
        .ok_or_else(|| "component archive byte total exceeds the safe integer limit".into())
}

/// Plan an exact request against an authenticated manifest and verified installation facts.
///
/// Invalid or stale identities are never reused. The plan does not install fallback components
/// unless explicitly requested, and never activates a component or changes user preferences.
pub fn plan_installation(
    manifest: &ComponentManifest,
    request: &PlanRequest,
    installed: &VerifiedInstallations,
) -> Result<InstallPlan, String> {
    validate_manifest(manifest)?;
    let roots: Vec<String> = match request {
        PlanRequest::Startup => manifest
            .components
            .iter()
            .filter(|(_, spec)| spec.kind == ComponentKind::CoreRuntime)
            .map(|(name, _)| name.clone())
            .collect(),
        PlanRequest::Fallback(name)
        | PlanRequest::Capability(name)
        | PlanRequest::Optional(name) => {
            let kind = match request {
                PlanRequest::Fallback(_) => ComponentKind::RuntimeFallback,
                PlanRequest::Capability(_) => ComponentKind::CapabilityOnDemand,
                PlanRequest::Optional(_) => ComponentKind::Optional,
                PlanRequest::Startup => unreachable!(),
            };
            let spec = manifest
                .components
                .get(name)
                .ok_or_else(|| format!("unknown component request: {name}"))?;
            if spec.kind != kind {
                return Err(format!("component {name} does not match the request kind"));
            }
            vec![name.clone()]
        }
    };
    let mut order = Vec::new();
    let mut selected = BTreeSet::new();
    fn visit(
        name: &str,
        manifest: &ComponentManifest,
        selected: &mut BTreeSet<String>,
        order: &mut Vec<String>,
    ) {
        if !selected.insert(name.into()) {
            return;
        }
        for dependency in manifest.components[name].depends_on.keys() {
            visit(dependency, manifest, selected, order);
        }
        order.push(name.into());
    }
    for root in roots {
        visit(&root, manifest, &mut selected, &mut order);
    }
    let mut components = Vec::with_capacity(order.len());
    let mut prepare_archive_bytes = 0;
    for name in order {
        let spec = &manifest.components[&name];
        let action = if installed.ids.get(&name) == Some(&spec.id) {
            PlanAction::Reuse
        } else {
            PlanAction::Prepare
        };
        if action == PlanAction::Prepare {
            prepare_archive_bytes = checked_archive_sum(prepare_archive_bytes, spec.bytes)?;
        }
        components.push(PlanEntry {
            component: name,
            id: spec.id.clone(),
            action,
            archive_bytes: spec.bytes,
        });
    }
    Ok(InstallPlan {
        components,
        prepare_archive_bytes,
    })
}

#[cfg(test)]
#[path = "component_plan_tests.rs"]
mod tests;
