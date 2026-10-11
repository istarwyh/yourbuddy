//! Reinstall broken or missing profile dependencies before the Host starts.

use std::fs;
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use super::boot_log;
use super::optional_harbor::{profile_legacy_harbor, LegacyHarborState};
use super::process::hide_console;
use super::provision::{pnpm_js_entry, RuntimePaths};
use super::user_home::{profile_dependencies_unresolved, profiles_needing_install};
use super::ProvisionEvent;
use crate::i18n::{self, Msg};
use crate::network_proxy::{apply_to_command, ResolvedNetworkProxy};

/// How long one `dsh plugin --profile <name> install` may run before it is killed.
const INSTALL_TIMEOUT: Duration = Duration::from_secs(600);

const MANAGED_PRODUCT_LINKS: &[(&str, &str)] = &[
    ("dsh-codex-auth", "packages/product/dsh-codex-auth"),
    ("dsh-better-sidebar", "packages/product/dsh-better-sidebar"),
    ("dsh-context-doctor", "packages/product/context-doctor"),
    (
        "dsh-plugin-marketplace",
        "packages/product/plugin-marketplace",
    ),
    (
        "dsh-personal-workbench",
        "packages/product/personal-workbench",
    ),
    ("@xiaohui-wang/dsh-pomodoro", "packages/product/pomodoro"),
    ("dsh-oil-creator", "packages/product/oil-creator"),
];

/// The profile `dsh web` boots; a profile whose install cannot be repaired is
/// a boot error only for this one, other profiles defer to a later `dsh plugin`.
pub const HOST_PROFILE: &str = "web";

const PROFILE_WORKSPACE_FILE: &str = "pnpm-workspace.yaml";
const YOURBUDDY_PROFILE_WORKSPACE: &str = r#"packages:
  - .

nodeLinker: hoisted
autoInstallPeers: false
dangerouslyAllowAllBuilds: true
"#;

/// Ensure every profile under `DSH_HOME` can resolve its declared dependencies
/// before the Host starts: profiles needing install run `node …/pnpm.cjs
/// install` in the profile directory when that entry exists, otherwise
/// `dsh plugin --profile <name> install` on the bridged PATH, and are
/// re-verified afterwards. A failed repair of a non-Host profile is logged
/// and deferred; a failed repair of {@link HOST_PROFILE} fails boot with the
/// manual command to run.
pub async fn ensure_profile_installs(
    paths: &RuntimePaths,
    host_path: &str,
    progress: &Arc<dyn Fn(ProvisionEvent) + Send + Sync>,
    network_proxy: &ResolvedNetworkProxy,
) -> Result<(), String> {
    let rebound = rebind_managed_product_links(paths)?;
    let mut pending = rebound.clone();
    if ensure_host_profile_build_policy(&paths.dsh_home)?
        && profile_dir(&paths.dsh_home, HOST_PROFILE)
            .join("package.json")
            .is_file()
        && !pending.iter().any(|name| name == HOST_PROFILE)
    {
        pending.push(HOST_PROFILE.into());
    }
    for name in profiles_needing_install(&paths.dsh_home) {
        if !pending.contains(&name) {
            pending.push(name);
        }
    }
    pending.sort();
    if pending.is_empty() {
        return Ok(());
    }
    boot_log::info(&format!("profile installs pending: {}", pending.join(", ")));
    for name in pending {
        let profile = profile_dir(&paths.dsh_home, &name);
        if !rebound.contains(&name) && only_missing_optional_harbor(&profile) {
            // There are no required dependencies whose lifecycle scripts need
            // the new policy. Leave the absent optional pack for explicit repair.
            boot_log::info(&format!(
                "profile {name}: optional Harbor requires explicit repair"
            ));
            continue;
        }
        progress(ProvisionEvent::Status(i18n::tf(
            Msg::ProfileInstalling,
            &name,
        )));
        let paths = paths.clone();
        let host_path = host_path.to_string();
        let name_for_task = name.clone();
        let network_proxy = network_proxy.clone();
        let result = tokio::task::spawn_blocking(move || {
            run_profile_install(&paths, &host_path, &name_for_task, &network_proxy)
        })
        .await
        .map_err(|e| format!("profile {name} 安装任务失败: {e}"))?;
        match result {
            Ok(()) => {
                progress(ProvisionEvent::Status(i18n::tf(Msg::ProfileReady, &name)));
                boot_log::info(&format!("profile {name} dependencies installed"));
            }
            Err(error) => {
                boot_log::error(&format!("profile {name} install failed: {error}"));
                if name == HOST_PROFILE {
                    return Err(i18n::tf2(Msg::ProfileInstallFailed, &name, &error));
                }
            }
        }
    }
    Ok(())
}

fn only_missing_optional_harbor(profile: &Path) -> bool {
    if profile_legacy_harbor(profile) != Some(LegacyHarborState::Missing) {
        return false;
    }
    fs::read(profile.join("package.json"))
        .ok()
        .and_then(|raw| serde_json::from_slice::<serde_json::Value>(&raw).ok())
        .and_then(|manifest| {
            let only_harbor = manifest
                .get("dependencies")?
                .as_object()
                .is_some_and(|deps| deps.len() == 1);
            let no_other_install_inputs = [
                "devDependencies",
                "optionalDependencies",
                "peerDependencies",
                "scripts",
            ]
            .iter()
            .all(|field| match manifest.get(field) {
                None => true,
                Some(value) => value.as_object().is_some_and(|values| values.is_empty()),
            });
            Some(only_harbor && no_other_install_inputs)
        })
        .unwrap_or(false)
}

/// Let packages explicitly installed into YourBuddy's isolated Web Profile run
/// their lifecycle scripts without a second pnpm approval. Generic DSH
/// Profiles retain their own build policies.
///
/// Returns `true` when startup changed the Profile policy. An existing Profile
/// then receives one install pass so a dependency left half-installed by
/// pnpm's previous approval error can finish before the Host starts.
fn ensure_host_profile_build_policy(dsh_home: &Path) -> Result<bool, String> {
    let profile = profile_dir(dsh_home, HOST_PROFILE);
    fs::create_dir_all(&profile)
        .map_err(|error| format!("cannot create {}: {error}", profile.display()))?;
    let workspace = profile.join(PROFILE_WORKSPACE_FILE);
    let raw = match fs::read_to_string(&workspace) {
        Ok(raw) => raw,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            fs::write(&workspace, YOURBUDDY_PROFILE_WORKSPACE)
                .map_err(|error| format!("cannot write {}: {error}", workspace.display()))?;
            boot_log::info("enabled dependency build scripts for the YourBuddy web profile");
            return Ok(true);
        }
        Err(error) => {
            return Err(format!("cannot read {}: {error}", workspace.display()));
        }
    };
    let (updated, changed) = enable_all_profile_builds(&raw);
    if !changed {
        return Ok(false);
    }
    fs::write(&workspace, updated)
        .map_err(|error| format!("cannot update {}: {error}", workspace.display()))?;
    boot_log::info("enabled dependency build scripts for the YourBuddy web profile");
    Ok(true)
}

/// Set pnpm's top-level `dangerouslyAllowAllBuilds` key while retaining every
/// other Profile setting, including a user's explicit `allowBuilds` entries.
fn enable_all_profile_builds(raw: &str) -> (String, bool) {
    let mut output = String::with_capacity(raw.len() + 40);
    let mut found = false;
    let mut changed = false;
    for line in raw.split_inclusive('\n') {
        let content = line.strip_suffix('\n').unwrap_or(line);
        if content.starts_with("dangerouslyAllowAllBuilds:") {
            found = true;
            if content.trim() == "dangerouslyAllowAllBuilds: true" {
                output.push_str(line);
            } else {
                output.push_str("dangerouslyAllowAllBuilds: true");
                if line.ends_with('\n') {
                    output.push('\n');
                }
                changed = true;
            }
        } else {
            output.push_str(line);
        }
    }
    if found {
        return (output, changed);
    }
    if !output.is_empty() && !output.ends_with('\n') {
        output.push('\n');
    }
    output.push_str("dangerouslyAllowAllBuilds: true\n");
    (output, true)
}

/// Move only YourBuddy-owned product `link:` dependencies from an older
/// content-addressed Harness tree to the active one. Harbor is delivered
/// separately and retains its existing link for explicit component repair. Registry packages and
/// links outside this application's `harness-versions` directory remain
/// user-owned and untouched.
fn rebind_managed_product_links(paths: &RuntimePaths) -> Result<Vec<String>, String> {
    let profiles_root = paths.dsh_home.join("profiles");
    let versions_root = paths
        .dsh_home
        .parent()
        .ok_or_else(|| {
            format!(
                "DSH home has no application-data parent: {}",
                paths.dsh_home.display()
            )
        })?
        .join("harness-versions");
    let Ok(entries) = fs::read_dir(&profiles_root) else {
        return Ok(Vec::new());
    };
    let mut rebound = Vec::new();
    for entry in entries.flatten() {
        let profile = entry.path();
        if !profile.is_dir() || profile.is_symlink() {
            continue;
        }
        let manifest_path = profile.join("package.json");
        let Ok(raw) = fs::read_to_string(&manifest_path) else {
            continue;
        };
        let Ok(mut manifest) = serde_json::from_str::<serde_json::Value>(&raw) else {
            continue;
        };
        let Some(dependencies) = manifest
            .get_mut("dependencies")
            .and_then(serde_json::Value::as_object_mut)
        else {
            continue;
        };
        let mut changed = false;
        for (package, relative) in MANAGED_PRODUCT_LINKS {
            let Some(spec) = dependencies.get_mut(*package) else {
                continue;
            };
            let Some(link) = spec.as_str().and_then(|value| value.strip_prefix("link:")) else {
                continue;
            };
            let linked = if Path::new(link).is_absolute() {
                PathBuf::from(link)
            } else {
                profile.join(link)
            };
            if !linked.starts_with(&versions_root) || !linked.ends_with(relative) {
                continue;
            }
            let current = paths.harness_root.join(relative);
            if linked == current {
                continue;
            }
            if !current.join("package.json").is_file() {
                return Err(format!(
                    "YourBuddy product dependency is missing from the active Harness tree: {}",
                    current.display()
                ));
            }
            *spec = serde_json::Value::String(format!("link:{}", current.display()));
            changed = true;
        }
        if !changed {
            continue;
        }
        let content = serde_json::to_string_pretty(&manifest)
            .map_err(|error| format!("无法序列化 {}: {error}", manifest_path.display()))?;
        fs::write(&manifest_path, format!("{content}\n"))
            .map_err(|error| format!("无法更新 {}: {error}", manifest_path.display()))?;
        let Some(name) = entry.file_name().into_string().ok() else {
            continue;
        };
        boot_log::info(&format!(
            "rebound YourBuddy product links in profile {name}"
        ));
        rebound.push(name);
    }
    Ok(rebound)
}

/// Run one install and re-verify the profile can resolve its dependencies.
fn run_profile_install(
    paths: &RuntimePaths,
    host_path: &str,
    name: &str,
    network_proxy: &ResolvedNetworkProxy,
) -> Result<(), String> {
    let profile_dir = profile_dir(&paths.dsh_home, name);
    let mut cmd = Command::new(&paths.node_binary);
    if let Some(entry) = pnpm_js_entry(&paths.pnpm_binary) {
        cmd.arg(entry).arg("install").current_dir(&profile_dir);
    } else {
        cmd.arg(&paths.cli_entry)
            .arg("plugin")
            .arg("--profile")
            .arg(name)
            .arg("install")
            .current_dir(&paths.harness_root);
    }
    cmd.env("DSH_HOME", &paths.dsh_home)
        .env("PATH", host_path)
        .env("NODE_ENV", "production")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    apply_to_command(&mut cmd, network_proxy);
    hide_console(&mut cmd);
    let mut child = cmd
        .spawn()
        .map_err(|e| format!("无法启动 dsh plugin: {e}"))?;

    let output_tail: Arc<Mutex<Vec<String>>> = Arc::new(Mutex::new(Vec::new()));
    if let Some(stdout) = child.stdout.take() {
        let tail = Arc::clone(&output_tail);
        std::thread::spawn(move || drain_lines(stdout, tail));
    }
    if let Some(stderr) = child.stderr.take() {
        let tail = Arc::clone(&output_tail);
        std::thread::spawn(move || drain_lines(stderr, tail));
    }

    let deadline = Instant::now() + INSTALL_TIMEOUT;
    let status = loop {
        match child.try_wait() {
            Ok(Some(status)) => break status,
            Ok(None) => {
                if Instant::now() >= deadline {
                    let _ = child.kill();
                    let _ = child.wait();
                    return Err(format!(
                        "安装超时（超过 {} 秒）{}",
                        INSTALL_TIMEOUT.as_secs(),
                        format_output_tail(&output_tail)
                    ));
                }
                std::thread::sleep(Duration::from_millis(250));
            }
            Err(error) => return Err(format!("等待安装进程失败: {error}")),
        }
    };

    if !status.success() {
        return Err(format!(
            "pnpm 退出码 {}{}",
            status.code().unwrap_or(-1),
            format_output_tail(&output_tail)
        ));
    }
    if profile_dependencies_unresolved(&profile_dir) {
        return Err(format!(
            "安装完成但依赖仍无法解析{}",
            format_output_tail(&output_tail)
        ));
    }
    Ok(())
}

fn profile_dir(dsh_home: &std::path::Path, name: &str) -> PathBuf {
    dsh_home.join("profiles").join(name)
}

fn drain_lines<R: std::io::Read>(reader: R, sink: Arc<Mutex<Vec<String>>>) {
    let reader = BufReader::new(reader);
    for line in reader.lines().flatten() {
        if let Ok(mut guard) = sink.lock() {
            guard.push(line);
            if guard.len() > 20 {
                let drop = guard.len() - 20;
                guard.drain(0..drop);
            }
        }
    }
}

fn format_output_tail(tail: &Arc<Mutex<Vec<String>>>) -> String {
    let lines = tail
        .lock()
        .map(|lines| lines.join("\n"))
        .unwrap_or_default();
    if lines.is_empty() {
        String::new()
    } else {
        format!("\n{lines}")
    }
}

#[cfg(test)]
mod tests {
    use super::super::user_home::profiles_needing_install;
    use super::{
        enable_all_profile_builds, ensure_host_profile_build_policy, rebind_managed_product_links,
    };
    use crate::runtime::provision::RuntimePaths;
    use std::fs;
    use std::path::PathBuf;
    use std::sync::atomic::{AtomicU64, Ordering};
    use std::time::{SystemTime, UNIX_EPOCH};

    static NEXT_DIR: AtomicU64 = AtomicU64::new(0);

    #[cfg(unix)]
    #[tokio::test]
    #[ignore = "requires prepared Node and pnpm artifacts; real offline mixed-profile startup repair"]
    async fn real_pnpm_rebinds_required_product_while_preserving_missing_optional_harbor() {
        use std::os::unix::fs::{symlink, PermissionsExt};
        let root = tempfile::tempdir().unwrap();
        let home = root.path().join("home");
        let profile = home.join("profiles/web");
        let modules = profile.join("node_modules");
        fs::create_dir_all(modules.join("@xiaohui-wang")).unwrap();
        let old_root = root.path().join("harness-versions/0123456789abcdef");
        let current = root.path().join("harness-versions/fedcba9876543210");
        let old_pomodoro = old_root.join("packages/product/pomodoro");
        let new_pomodoro = current.join("packages/product/pomodoro");
        for package in [&old_pomodoro, &new_pomodoro] {
            fs::create_dir_all(package).unwrap();
            fs::write(
                package.join("package.json"),
                r#"{"name":"@xiaohui-wang/dsh-pomodoro","version":"1.0.0"}"#,
            )
            .unwrap();
        }
        let missing_harbor = old_root.join("packages/product/harbor-evolution");
        let harbor_spec = format!("link:{}", missing_harbor.display());
        fs::write(profile.join("package.json"), serde_json::to_vec(&serde_json::json!({
            "dependencies": {"dsh-harbor-evolution":harbor_spec, "@xiaohui-wang/dsh-pomodoro":format!("link:{}", old_pomodoro.display())},
            "dsh":{"profile":{"bundles":["dsh-harbor-evolution","@xiaohui-wang/dsh-pomodoro"]}}
        })).unwrap()).unwrap();
        let raw_harbor =
            "../../../../harness-versions/0123456789abcdef/packages/product/harbor-evolution";
        symlink(raw_harbor, modules.join("dsh-harbor-evolution")).unwrap();
        symlink(&old_pomodoro, modules.join("@xiaohui-wang/dsh-pomodoro")).unwrap();
        fs::write(
            profile.join("cordis.patch.yml"),
            "- id: dsh-pomodoro\n  config: {focusMinutes: 37}\n",
        )
        .unwrap();
        fs::write(home.join("settings.yaml"), "keep: true\n").unwrap();
        let patch = fs::read(profile.join("cordis.patch.yml")).unwrap();
        let settings = fs::read(home.join("settings.yaml")).unwrap();
        // The production spawn remains unchanged. Its test-only Node launcher
        // gives the real pnpm a private home and offline store, without changing
        // the test process environment or consulting the operator's npm config.
        let node = std::env::var("YOURBUDDY_TEST_NODE").expect("Node artifact path");
        let pnpm_js =
            PathBuf::from(std::env::var_os("YOURBUDDY_TEST_PNPM_JS").expect("pnpm artifact path"));
        let pnpm_package = pnpm_js.parent().unwrap().parent().unwrap();
        let pnpm_home = root.path().join("pnpm");
        fs::create_dir_all(pnpm_home.join("lib/node_modules")).unwrap();
        symlink(pnpm_package, pnpm_home.join("lib/node_modules/pnpm")).unwrap();
        let quote = |value: &str| format!("'{}'", value.replace('\'', "'\"'\"'"));
        let launcher = root.path().join("node-launcher");
        fs::write(&launcher, format!("#!/bin/sh\nexec /usr/bin/env -i PATH={} HOME={} USERPROFILE={} XDG_DATA_HOME={} XDG_CACHE_HOME={} PNPM_HOME={} pnpm_config_offline=true pnpm_config_store_dir={} {} \"$@\"\n",
            quote(&std::env::var("PATH").unwrap_or_default()), quote(root.path().to_str().unwrap()), quote(root.path().to_str().unwrap()),
            quote(root.path().join("data").to_str().unwrap()), quote(root.path().join("cache").to_str().unwrap()),
            quote(pnpm_home.to_str().unwrap()), quote(root.path().join("store").to_str().unwrap()), quote(&node))).unwrap();
        fs::set_permissions(&launcher, fs::Permissions::from_mode(0o700)).unwrap();
        let paths = RuntimePaths {
            node_binary: launcher,
            pnpm_binary: pnpm_home.join("bin/pnpm"),
            cli_entry: current.join("apps/cli/lib/bin.js"),
            harness_root: current,
            runtime_root: root.path().join("runtime"),
            dsh_home: home.clone(),
        };
        let progress: std::sync::Arc<dyn Fn(super::ProvisionEvent) + Send + Sync> =
            std::sync::Arc::new(|_| {});
        let proxy = crate::network_proxy::resolve(
            &crate::network_proxy::NetworkProxySettings::legacy_direct(),
        )
        .unwrap();
        super::ensure_profile_installs(&paths, "/usr/bin:/bin", &progress, &proxy)
            .await
            .unwrap();
        assert_eq!(
            fs::canonicalize(modules.join("@xiaohui-wang/dsh-pomodoro")).unwrap(),
            new_pomodoro
        );
        assert_eq!(
            fs::read_link(modules.join("dsh-harbor-evolution")).unwrap(),
            PathBuf::from(raw_harbor)
        );
        assert!(!missing_harbor.exists());
        let after: serde_json::Value =
            serde_json::from_slice(&fs::read(profile.join("package.json")).unwrap()).unwrap();
        assert_eq!(after["dependencies"]["dsh-harbor-evolution"], harbor_spec);
        assert_eq!(
            after["dsh"]["profile"]["bundles"],
            serde_json::json!(["dsh-harbor-evolution", "@xiaohui-wang/dsh-pomodoro"])
        );
        assert_eq!(fs::read(profile.join("cordis.patch.yml")).unwrap(), patch);
        assert_eq!(fs::read(home.join("settings.yaml")).unwrap(), settings);
        assert!(!super::profile_dependencies_unresolved(&profile));
    }

    #[tokio::test]
    async fn optional_missing_harbor_does_not_run_policy_only_install_or_change_user_records() {
        let root = tempfile::tempdir().unwrap();
        let home = root.path().join("home");
        let profile = home.join("profiles/web");
        fs::create_dir_all(&profile).unwrap();
        let old = root
            .path()
            .join("harness-versions/0123456789abcdef/packages/product/harbor-evolution");
        let manifest = serde_json::to_vec(&serde_json::json!({
            "dependencies": {"dsh-harbor-evolution": format!("link:{}", old.display())},
            "dsh": {"profile": {"bundles": ["dsh-harbor-evolution"]}}
        }))
        .unwrap();
        fs::write(profile.join("package.json"), &manifest).unwrap();
        fs::write(
            profile.join("cordis.patch.yml"),
            "- id: harbor-evolution\n  config: {jobsDir: keep}\n",
        )
        .unwrap();
        let patch = fs::read(profile.join("cordis.patch.yml")).unwrap();
        let paths = RuntimePaths {
            node_binary: root.path().join("never-launch-node"),
            pnpm_binary: root.path().join("never-launch-pnpm"),
            cli_entry: root.path().join("current/apps/cli/lib/bin.js"),
            harness_root: root.path().join("current"),
            runtime_root: root.path().join("runtime"),
            dsh_home: home,
        };
        assert!(rebind_managed_product_links(&paths).unwrap().is_empty());
        let progress: std::sync::Arc<dyn Fn(super::ProvisionEvent) + Send + Sync> =
            std::sync::Arc::new(|_| {});
        let proxy = crate::network_proxy::resolve(
            &crate::network_proxy::NetworkProxySettings::legacy_direct(),
        )
        .unwrap();
        super::ensure_profile_installs(&paths, "", &progress, &proxy)
            .await
            .unwrap();
        assert_eq!(fs::read(profile.join("package.json")).unwrap(), manifest);
        assert_eq!(fs::read(profile.join("cordis.patch.yml")).unwrap(), patch);
        assert!(!old.exists());
        assert!(!profile.join("node_modules").exists());
        assert!(!profile.join("pnpm-lock.yaml").exists());
        // Another declared dependency remains a real boot blocker; the absent
        // optional Harbor is not permission to suppress unrelated install errors.
        let mut value: serde_json::Value = serde_json::from_slice(&manifest).unwrap();
        value["dependencies"]["required-package"] = serde_json::json!("1.0.0");
        fs::write(
            profile.join("package.json"),
            serde_json::to_vec(&value).unwrap(),
        )
        .unwrap();
        assert!(
            super::ensure_profile_installs(&paths, "", &progress, &proxy)
                .await
                .is_err()
        );
        fs::create_dir_all(profile.join("node_modules/required-package")).unwrap();
        fs::write(
            profile.join("node_modules/required-package/package.json"),
            r#"{"name":"required-package"}"#,
        )
        .unwrap();
        fs::remove_file(profile.join("pnpm-workspace.yaml")).unwrap();
        assert!(
            super::ensure_profile_installs(&paths, "", &progress, &proxy).await.is_err(),
            "required packages still receive the policy-change lifecycle install when their manifests exist"
        );
        for field in [
            "devDependencies",
            "optionalDependencies",
            "peerDependencies",
            "scripts",
        ] {
            for extra in [
                serde_json::json!({"retained": "value"}),
                serde_json::Value::Null,
                serde_json::json!([]),
                serde_json::json!("invalid"),
            ] {
                let mut value: serde_json::Value = serde_json::from_slice(&manifest).unwrap();
                value[field] = extra;
                fs::write(
                    profile.join("package.json"),
                    serde_json::to_vec(&value).unwrap(),
                )
                .unwrap();
                fs::remove_file(profile.join("pnpm-workspace.yaml")).unwrap();
                assert!(
                    super::ensure_profile_installs(&paths, "", &progress, &proxy)
                        .await
                        .is_err(),
                    "{field} must retain the existing install policy"
                );
            }
        }
    }

    #[test]
    fn missing_current_core_still_blocks_rebinding_required_product_links() {
        let root = tempfile::tempdir().unwrap();
        let home = root.path().join("home");
        let profile = home.join("profiles/web");
        fs::create_dir_all(&profile).unwrap();
        let old = root
            .path()
            .join("harness-versions/0123456789abcdef/packages/product/pomodoro");
        fs::write(
            profile.join("package.json"),
            serde_json::to_vec(&serde_json::json!({
                "dependencies": {"@xiaohui-wang/dsh-pomodoro": format!("link:{}", old.display())}
            }))
            .unwrap(),
        )
        .unwrap();
        let paths = RuntimePaths {
            node_binary: root.path().join("node"),
            pnpm_binary: root.path().join("pnpm"),
            cli_entry: root.path().join("current/apps/cli/lib/bin.js"),
            harness_root: root.path().join("current"),
            runtime_root: root.path().join("runtime"),
            dsh_home: home,
        };
        assert!(rebind_managed_product_links(&paths)
            .unwrap_err()
            .contains("missing from the active Harness tree"));
    }

    fn temp_root() -> PathBuf {
        let id = NEXT_DIR.fetch_add(1, Ordering::Relaxed);
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(0);
        let root = std::env::temp_dir().join(format!(
            "dsh-desktop-repair-{}-{}-{}",
            std::process::id(),
            nanos,
            id
        ));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).unwrap();
        root
    }

    #[test]
    fn lists_profiles_with_unresolved_dependencies_only() {
        let root = temp_root();
        let home = root.join("home");
        let broken = home.join("profiles").join("web");
        let intact = home.join("profiles").join("cli");
        let plain = home.join("profiles").join("plain");
        for dir in [&broken, &intact, &plain] {
            fs::create_dir_all(dir).unwrap();
        }
        fs::write(
            broken.join("package.json"),
            r#"{"dependencies":{"dsh-plugins-catalog":"github:x/y"}}"#,
        )
        .unwrap();
        fs::write(
            intact.join("package.json"),
            r#"{"dependencies":{"kept":"1.0.0"}}"#,
        )
        .unwrap();
        fs::create_dir_all(intact.join("node_modules").join("kept")).unwrap();
        fs::write(
            intact
                .join("node_modules")
                .join("kept")
                .join("package.json"),
            r#"{"name":"kept"}"#,
        )
        .unwrap();
        fs::write(plain.join("package.json"), r#"{"dependencies":{}}"#).unwrap();

        assert_eq!(profiles_needing_install(&home), vec!["web".to_string()]);
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn empty_home_needs_no_installs() {
        let root = temp_root();
        assert!(profiles_needing_install(&root.join("home")).is_empty());
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn creates_the_yourbuddy_web_profile_build_policy() {
        let root = temp_root();
        let home = root.join("dsh-home");

        assert!(ensure_host_profile_build_policy(&home).unwrap());
        let workspace = fs::read_to_string(
            home.join("profiles")
                .join("web")
                .join("pnpm-workspace.yaml"),
        )
        .unwrap();
        assert!(workspace.contains("packages:\n  - ."));
        assert!(workspace.contains("nodeLinker: hoisted"));
        assert!(workspace.contains("autoInstallPeers: false"));
        assert!(workspace.contains("dangerouslyAllowAllBuilds: true"));
        assert!(!ensure_host_profile_build_policy(&home).unwrap());
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn enables_all_builds_without_removing_existing_profile_policy() {
        let raw = "packages:\n  - .\nallowBuilds:\n  protobufjs: set this to true or false\ndangerouslyAllowAllBuilds: false\n";
        let (updated, changed) = enable_all_profile_builds(raw);

        assert!(changed);
        assert!(updated.contains("allowBuilds:\n  protobufjs: set this to true or false"));
        assert!(updated.contains("dangerouslyAllowAllBuilds: true"));
        assert!(!updated.contains("dangerouslyAllowAllBuilds: false"));
        assert_eq!(enable_all_profile_builds(&updated), (updated, false));
    }

    #[test]
    fn appends_the_build_policy_to_an_existing_profile_workspace() {
        let raw = "packages:\n  - .\nnodeLinker: hoisted";
        let (updated, changed) = enable_all_profile_builds(raw);

        assert!(changed);
        assert_eq!(
            updated,
            "packages:\n  - .\nnodeLinker: hoisted\ndangerouslyAllowAllBuilds: true\n"
        );
    }

    #[test]
    fn rebinds_only_product_links_owned_by_an_old_yourbuddy_tree() {
        let root = temp_root();
        let dsh_home = root.join("dsh-home");
        let profile = dsh_home.join("profiles").join("web");
        let current = root.join("harness-versions").join("current");
        let current_plugin = current.join("packages/product/harbor-evolution");
        let current_context_doctor = current.join("packages/product/context-doctor");
        let current_marketplace = current.join("packages/product/plugin-marketplace");
        let current_pomodoro = current.join("packages/product/pomodoro");
        let old_plugin = root
            .join("harness-versions")
            .join("old")
            .join("packages/product/harbor-evolution");
        let old_context_doctor = root
            .join("harness-versions")
            .join("old")
            .join("packages/product/context-doctor");
        let old_marketplace = root
            .join("harness-versions")
            .join("old")
            .join("packages/product/plugin-marketplace");
        let old_pomodoro = root
            .join("harness-versions")
            .join("old")
            .join("packages/product/pomodoro");
        fs::create_dir_all(&profile).unwrap();
        fs::create_dir_all(&current_plugin).unwrap();
        fs::create_dir_all(&current_context_doctor).unwrap();
        fs::create_dir_all(&current_marketplace).unwrap();
        fs::create_dir_all(&current_pomodoro).unwrap();
        fs::write(
            current_plugin.join("package.json"),
            r#"{"name":"dsh-harbor-evolution"}"#,
        )
        .unwrap();
        fs::write(
            current_context_doctor.join("package.json"),
            r#"{"name":"dsh-context-doctor"}"#,
        )
        .unwrap();
        fs::write(
            current_marketplace.join("package.json"),
            r#"{"name":"dsh-plugin-marketplace"}"#,
        )
        .unwrap();
        fs::write(
            current_pomodoro.join("package.json"),
            r#"{"name":"@xiaohui-wang/dsh-pomodoro"}"#,
        )
        .unwrap();
        fs::write(
            profile.join("package.json"),
            format!(
                "{{\"dependencies\":{{\"dsh-harbor-evolution\":\"link:{}\",\"dsh-context-doctor\":\"link:{}\",\"dsh-plugin-marketplace\":\"link:{}\",\"@xiaohui-wang/dsh-pomodoro\":\"link:{}\",\"third-party\":\"link:/tmp/third-party\"}}}}",
                old_plugin.display(),
                old_context_doctor.display(),
                old_marketplace.display(),
                old_pomodoro.display()
            ),
        )
        .unwrap();
        let paths = RuntimePaths {
            node_binary: root.join("node"),
            pnpm_binary: root.join("pnpm"),
            cli_entry: current.join("apps/cli/lib/bin.js"),
            harness_root: current.clone(),
            runtime_root: root.join("runtime"),
            dsh_home,
        };

        assert_eq!(
            rebind_managed_product_links(&paths).unwrap(),
            vec!["web".to_string()]
        );
        let value: serde_json::Value =
            serde_json::from_str(&fs::read_to_string(profile.join("package.json")).unwrap())
                .unwrap();
        assert_eq!(
            value["dependencies"]["dsh-harbor-evolution"],
            format!("link:{}", old_plugin.display())
        );
        assert_eq!(
            value["dependencies"]["dsh-context-doctor"],
            format!("link:{}", current_context_doctor.display())
        );
        assert_eq!(
            value["dependencies"]["dsh-plugin-marketplace"],
            format!("link:{}", current_marketplace.display())
        );
        assert_eq!(
            value["dependencies"]["@xiaohui-wang/dsh-pomodoro"],
            format!("link:{}", current_pomodoro.display())
        );
        assert_eq!(
            value["dependencies"]["third-party"],
            "link:/tmp/third-party"
        );
        let _ = fs::remove_dir_all(&root);
    }
}
