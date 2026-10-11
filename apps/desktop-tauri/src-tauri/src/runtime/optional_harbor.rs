//! Recognize legacy application-owned Harbor links without changing Profile files.

use std::fs;
use std::path::{Component, Path, PathBuf};

use super::env_path::path_eq;

/// The sole product package whose absence does not require a core startup install.
pub const HARBOR_PACKAGE: &str = "dsh-harbor-evolution";

/// Availability of an unchanged link into a legacy YourBuddy Harness tree.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum LegacyHarborState {
    Intact,
    Missing,
}

/// Classify the fixed Harbor dependency and raw link supplied by a Profile snapshot.
/// Only the application's exact legacy namespace is recognized. Existing path
/// components must not redirect through links or reparse points; a missing
/// package means its entire root is absent, not just its manifest. This is a
/// read-only observation: installation must still compare the original snapshot
/// under the Profile writer lock before replacing anything.
pub fn classify_legacy_link(
    dsh_home: &Path,
    profile: &Path,
    dependency: Option<&str>,
    raw_link: Option<&str>,
) -> Option<LegacyHarborState> {
    if profile.parent()? != dsh_home.join("profiles") || !plain_chain(dsh_home, profile) {
        return None;
    }
    let dependency = dependency?.strip_prefix("link:")?;
    let target = Path::new(dependency);
    if !target.is_absolute() || has_dots(dependency) {
        return None;
    }
    let versions = dsh_home.parent()?.join("harness-versions");
    let relative = target.strip_prefix(&versions).ok()?;
    let parts: Vec<_> = relative.components().collect();
    let version = parts.first()?.as_os_str().to_str()?;
    if parts.len() != 4
        || version.len() != 16
        || !version.bytes().all(|byte| byte.is_ascii_hexdigit())
        || parts[1].as_os_str() != "packages"
        || parts[2].as_os_str() != "product"
        || parts[3].as_os_str() != "harbor-evolution"
        || !plain_chain(&versions, target)
    {
        return None;
    }
    let modules = profile.join("node_modules");
    if !plain_chain(profile, &modules) {
        return None;
    }
    let entry = modules.join(HARBOR_PACKAGE);
    match (fs::symlink_metadata(&entry), raw_link) {
        (Err(error), None) if error.kind() == std::io::ErrorKind::NotFound => {}
        (Ok(meta), Some(raw)) if is_link(&meta) => {
            if fs::read_link(&entry).ok()?.as_os_str() != raw
                || !path_eq(&resolve_raw_link(&modules, raw)?, target)
            {
                return None;
            }
        }
        _ => return None,
    }
    match fs::symlink_metadata(target) {
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            Some(LegacyHarborState::Missing)
        }
        Ok(meta) if meta.is_dir() && !is_link(&meta) => {
            let metadata = fs::symlink_metadata(target.join("package.json")).ok()?;
            if !metadata.is_file() || is_link(&metadata) {
                return None;
            }
            let manifest: serde_json::Value =
                serde_json::from_str(&fs::read_to_string(target.join("package.json")).ok()?)
                    .ok()?;
            (manifest.get("name")?.as_str()? == HARBOR_PACKAGE).then_some(LegacyHarborState::Intact)
        }
        _ => None,
    }
}

/// Read the current fixed dependency and link for startup's optional-repair decision.
pub fn profile_legacy_harbor(profile: &Path) -> Option<LegacyHarborState> {
    let home = profile.parent()?.parent()?;
    let manifest: serde_json::Value =
        serde_json::from_str(&fs::read_to_string(profile.join("package.json")).ok()?).ok()?;
    let dependency = manifest
        .get("dependencies")?
        .get(HARBOR_PACKAGE)?
        .as_str()?;
    let link = profile.join("node_modules").join(HARBOR_PACKAGE);
    let raw = match fs::read_link(&link) {
        Ok(raw) => Some(raw.into_os_string().into_string().ok()?),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => None,
        Err(_) => return None,
    };
    classify_legacy_link(home, profile, Some(dependency), raw.as_deref())
}

fn has_dots(raw: &str) -> bool {
    raw.split(['/', '\\'])
        .any(|part| matches!(part, "." | ".."))
}

/// Pnpm may emit leading parents in relative links, but no named segment may
/// precede a parent traversal: that could traverse a link before normalization.
fn resolve_raw_link(parent: &Path, raw: &str) -> Option<PathBuf> {
    let path = Path::new(raw);
    if path.is_absolute() {
        return (!has_dots(raw)).then(|| path.to_path_buf());
    }
    let mut target = parent.to_path_buf();
    let mut named = false;
    for part in path.components() {
        match part {
            Component::ParentDir if !named => {
                if !target.pop() {
                    return None;
                }
            }
            Component::Normal(name) => {
                named = true;
                target.push(name);
            }
            _ => return None,
        }
    }
    Some(target)
}

fn is_link(meta: &fs::Metadata) -> bool {
    if meta.file_type().is_symlink() {
        return true;
    }
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        return meta.file_attributes() & 0x0400 != 0;
    }
    #[cfg(not(windows))]
    {
        false
    }
}

fn plain_chain(root: &Path, path: &Path) -> bool {
    let Ok(relative) = path.strip_prefix(root) else {
        return false;
    };
    let mut current = root.to_path_buf();
    for part in std::iter::once(None).chain(relative.components().map(Some)) {
        if let Some(part) = part {
            current.push(part);
        }
        match fs::symlink_metadata(&current) {
            Ok(meta) if meta.is_dir() && !is_link(&meta) => {}
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
            _ => return false,
        }
    }
    true
}

#[cfg(test)]
mod tests {
    use super::*;

    struct Fixture {
        _root: tempfile::TempDir,
        home: PathBuf,
        profile: PathBuf,
        target: PathBuf,
    }

    impl Fixture {
        fn new() -> Self {
            let root = tempfile::tempdir().unwrap();
            let home = root.path().join("home");
            let profile = home.join("profiles/web");
            fs::create_dir_all(profile.join("node_modules")).unwrap();
            let target = root
                .path()
                .join("harness-versions/0123456789abcdef/packages/product/harbor-evolution");
            let fixture = Self {
                _root: root,
                home,
                profile,
                target,
            };
            fixture.manifest();
            fixture
        }

        fn manifest(&self) {
            fs::write(
                self.profile.join("package.json"),
                serde_json::to_vec(&serde_json::json!({
                    "dependencies": {HARBOR_PACKAGE: format!("link:{}", self.target.display())},
                    "dsh": {"profile": {"bundles": [HARBOR_PACKAGE]}}
                }))
                .unwrap(),
            )
            .unwrap();
        }

        fn classify(&self, raw: Option<&str>) -> Option<LegacyHarborState> {
            classify_legacy_link(
                &self.home,
                &self.profile,
                Some(&format!("link:{}", self.target.display())),
                raw,
            )
        }

        fn package(&self, name: &str) {
            fs::create_dir_all(&self.target).unwrap();
            fs::write(
                self.target.join("package.json"),
                serde_json::to_vec(&serde_json::json!({"name":name,"version":"1.0.0"})).unwrap(),
            )
            .unwrap();
        }
    }

    #[test]
    fn recognizes_only_whole_missing_root_or_valid_intact_package() {
        let f = Fixture::new();
        assert_eq!(f.classify(None), Some(LegacyHarborState::Missing));
        fs::create_dir_all(&f.target).unwrap();
        assert_eq!(
            f.classify(None),
            None,
            "missing manifest does not mean missing package root"
        );
        f.package("user-package");
        assert_eq!(f.classify(None), None);
        f.package(HARBOR_PACKAGE);
        assert_eq!(f.classify(None), Some(LegacyHarborState::Intact));
    }

    #[test]
    fn refuses_unrecognized_dependencies_and_real_node_modules_entries() {
        let f = Fixture::new();
        for spec in [
            None,
            Some("1.0.0"),
            Some("link:/tmp/arbitrary/harbor-evolution"),
            Some(
                "link:../../../harness-versions/0123456789abcdef/packages/product/harbor-evolution",
            ),
        ] {
            assert_eq!(classify_legacy_link(&f.home, &f.profile, spec, None), None);
        }
        for suffix in [
            "old/packages/product/harbor-evolution",
            "0123456789abcdeg/packages/product/harbor-evolution",
            "0123456789abcdef/packages/product/pomodoro",
            "0123456789abcdef/packages/product/../product/harbor-evolution",
        ] {
            let spec = format!(
                "link:{}",
                f._root
                    .path()
                    .join("harness-versions")
                    .join(suffix)
                    .display()
            );
            assert_eq!(
                classify_legacy_link(&f.home, &f.profile, Some(&spec), None),
                None
            );
        }
        let entry = f.profile.join("node_modules").join(HARBOR_PACKAGE);
        fs::create_dir(&entry).unwrap();
        assert_eq!(f.classify(None), None);
        fs::remove_dir(&entry).unwrap();
        fs::write(entry, "user data").unwrap();
        assert_eq!(f.classify(None), None);
    }

    #[cfg(unix)]
    #[test]
    fn matches_exact_raw_link_and_accepts_pnpm_leading_parent_paths() {
        let f = Fixture::new();
        let entry = f.profile.join("node_modules").join(HARBOR_PACKAGE);
        let raw = "../../../../harness-versions/0123456789abcdef/packages/product/harbor-evolution";
        std::os::unix::fs::symlink(raw, &entry).unwrap();
        assert_eq!(f.classify(Some(raw)), Some(LegacyHarborState::Missing));
        assert_eq!(f.classify(None), None);
        assert_eq!(
            f.classify(f.target.to_str()),
            None,
            "equivalent target is not the raw snapshot"
        );
        fs::remove_file(&entry).unwrap();
        std::os::unix::fs::symlink("/tmp/user-harbor", &entry).unwrap();
        assert_eq!(
            f.classify(Some(raw)),
            None,
            "later user link is not recognized"
        );
        assert_eq!(
            f.classify(Some("/tmp/user-harbor")),
            None,
            "external links are not managed"
        );
    }

    #[cfg(unix)]
    #[test]
    fn refuses_symlink_ancestors_and_named_parent_traversal() {
        let f = Fixture::new();
        let outside = f._root.path().join("outside");
        fs::create_dir(&outside).unwrap();
        std::os::unix::fs::symlink(&outside, f._root.path().join("harness-versions")).unwrap();
        assert_eq!(f.classify(None), None);
        fs::remove_file(f._root.path().join("harness-versions")).unwrap();
        let entry = f.profile.join("node_modules").join(HARBOR_PACKAGE);
        let raw = "userlink/../../../../../harness-versions/0123456789abcdef/packages/product/harbor-evolution";
        std::os::unix::fs::symlink(raw, &entry).unwrap();
        assert_eq!(f.classify(Some(raw)), None);
        fs::remove_file(entry).unwrap();
        fs::remove_dir(f.profile.join("node_modules")).unwrap();
        std::os::unix::fs::symlink(&outside, f.profile.join("node_modules")).unwrap();
        assert_eq!(f.classify(None), None);
    }

    #[cfg(unix)]
    #[test]
    fn refuses_linked_manifest_and_profile_directory() {
        let f = Fixture::new();
        f.package(HARBOR_PACKAGE);
        let manifest = f.target.join("package.json");
        let external = f._root.path().join("external-manifest.json");
        fs::rename(&manifest, &external).unwrap();
        std::os::unix::fs::symlink(external, &manifest).unwrap();
        assert_eq!(f.classify(None), None);
        fs::remove_file(manifest).unwrap();
        f.package(HARBOR_PACKAGE);
        let external = f._root.path().join("external-profile");
        fs::rename(&f.profile, &external).unwrap();
        std::os::unix::fs::symlink(external, &f.profile).unwrap();
        assert_eq!(f.classify(None), None);
    }

    #[test]
    #[ignore = "requires the prepared Node and pnpm artifact paths; never downloads dependencies"]
    fn real_pnpm_raw_link_remains_recognized_after_legacy_root_disappears() {
        let f = Fixture::new();
        f.package(HARBOR_PACKAGE);
        let node = std::env::var_os("YOURBUDDY_TEST_NODE").expect("Node artifact path");
        let pnpm = std::env::var_os("YOURBUDDY_TEST_PNPM_JS").expect("pnpm artifact path");
        let output = std::process::Command::new(node)
            .arg(pnpm)
            .args([
                "install",
                "--offline",
                "--ignore-scripts",
                "--ignore-workspace",
                "--store-dir",
            ])
            .arg(f._root.path().join("store"))
            .current_dir(&f.profile)
            .env_clear()
            .env("PATH", std::env::var_os("PATH").unwrap_or_default())
            .env("HOME", f._root.path())
            .env("USERPROFILE", f._root.path())
            .env("XDG_DATA_HOME", f._root.path().join("data"))
            .env("XDG_CACHE_HOME", f._root.path().join("cache"))
            .env("PNPM_HOME", f._root.path().join("pnpm"))
            .output()
            .unwrap();
        assert!(
            output.status.success(),
            "{}",
            String::from_utf8_lossy(&output.stderr)
        );
        let entry = f.profile.join("node_modules").join(HARBOR_PACKAGE);
        let raw = fs::read_link(&entry).unwrap();
        println!("real pnpm raw link: {}", raw.display());
        assert_eq!(
            profile_legacy_harbor(&f.profile),
            Some(LegacyHarborState::Intact)
        );
        let manifest = fs::read(f.profile.join("package.json")).unwrap();
        fs::remove_dir_all(&f.target).unwrap();
        assert_eq!(
            profile_legacy_harbor(&f.profile),
            Some(LegacyHarborState::Missing)
        );
        assert_eq!(fs::read_link(entry).unwrap(), raw);
        assert_eq!(fs::read(f.profile.join("package.json")).unwrap(), manifest);
    }
}
