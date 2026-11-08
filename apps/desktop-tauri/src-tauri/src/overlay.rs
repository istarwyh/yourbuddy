//! Implant the desktop overlay plugin into `$DSH_HOME` without editing packages.

use std::fs;
use std::path::{Path, PathBuf};

use crate::product::ProductRuntime;

/// Absolute `--patch` file the Host should load.
pub struct OverlayPatch {
    pub patch_file: PathBuf,
}

/// Build a POSIX `file://` URL for a Linux overlay plugin path under `/home`.
///
/// Returns `Err` when `linux_path` is not absolute, not under `/home`, names a
/// Windows drive path (for example `/C:/plugin.mjs`), or contains `wsl.localhost`.
pub fn linux_plugin_file_url(linux_path: &str) -> Result<String, String> {
    if !linux_path.starts_with('/') {
        return Err(format!("Linux plugin path must be absolute: {linux_path}"));
    }
    if linux_path.contains("wsl.localhost") {
        return Err(format!(
            "Linux plugin path must not use wsl.localhost: {linux_path}"
        ));
    }
    if is_windows_drive_path(linux_path) {
        return Err(format!(
            "Linux plugin path must not be a Windows drive path: {linux_path}"
        ));
    }
    if !linux_path.starts_with("/home/") {
        return Err(format!(
            "Linux plugin path must be under /home: {linux_path}"
        ));
    }
    Ok(format!("file://{linux_path}"))
}

fn is_windows_drive_path(path: &str) -> bool {
    let Some(rest) = path.strip_prefix('/') else {
        return false;
    };
    let mut chars = rest.chars();
    matches!(
        (chars.next(), chars.next()),
        (Some(drive), Some(':')) if drive.is_ascii_alphabetic()
    )
}

/// Render the desktop-notification row used by every supported launch mode.
pub fn notification_overlay_yaml(plugin_url: &str) -> String {
    let plugin_url = serde_json::to_string(plugin_url).unwrap_or_else(|_| "\"\"".into());
    format!("- insert:\n    - id: dsh-desktop-notify\n      name: {plugin_url}\n")
}

const PRODUCT_FALLBACKS: &[(&str, &str)] = &[
    (
        "yourbuddy-subagent-codex",
        "@deepseek-ai/dsh-subagent-codex",
    ),
    ("yourbuddy-llm-codex-auth", "dsh-codex-auth"),
    ("yourbuddy-codex-search", "dsh-codex-auth/search"),
    ("yourbuddy-codex-image", "dsh-codex-auth/image"),
    ("yourbuddy-context-doctor", "dsh-context-doctor"),
    ("yourbuddy-ego-browser", "dsh-ego-browser"),
    ("yourbuddy-plugin-marketplace", "dsh-plugin-marketplace"),
    ("yourbuddy-personal-workbench", "dsh-personal-workbench"),
    ("yourbuddy-oil-creator", "dsh-oil-creator"),
    ("yourbuddy-media-desk", "dsh-media-desk"),
    ("yourbuddy-dsh-context", "dsh-context"),
];

fn profile_fallback_disabled(name: &str, id: &str) -> String {
    format!(
        r#"!!js "[...ctx.loader.entries()].some((e) => e.options.name === '{name}' && e.options.id !== '{id}' && !e.disabled)""#
    )
}

/// Render the YourBuddy product and desktop-notification rows loaded after the web profile.
///
/// The overlay defaults new Sessions to Full access unless General settings
/// provide an explicit permission preset. The configured project root backs
/// the global Web Workbench. Agent Tool calls resolve a separate request-local
/// root from their calling session.
pub fn overlay_yaml(plugin_url: &str, product: &ProductRuntime) -> String {
    let project_root = serde_json::to_string(&product.project_root.display().to_string())
        .unwrap_or_else(|_| "\"\"".into());
    let harbor_bin = serde_json::to_string(&product.harbor_bin.display().to_string())
        .unwrap_or_else(|_| "\"\"".into());
    let harbor_dsh_bin = serde_json::to_string(&product.harbor_dsh_bin.display().to_string())
        .unwrap_or_else(|_| "\"\"".into());
    let notification = notification_overlay_yaml(plugin_url);
    let better_sidebar_disabled = profile_fallback_disabled("dsh-better-sidebar", "better-sidebar");
    let mut yaml = format!(
        r#"{notification}- id: web
  config:
    searchProvider: codex

- id: sandbox-policy
  config:
    mode: danger-full-access
    workspaceRoot: !!js process.cwd()

- id: approval
  config:
    policy: never

- id: agent-preset-registry
  config:
    default: codex

- id: tool-skill
  config:
    modelExcludedSkills:
      - codexhost-delegation

- id: ui-sidebar-browser
  disabled: false

- id: better-sidebar
  disabled: {better_sidebar_disabled}
  config:
    presentation: slot
    workspaceFence: false

- id: harbor-evolution
  config:
    projectRoot: {project_root}
    jobsDir: "jobs"
    harborBin: {harbor_bin}
    harborDshBin: {harbor_dsh_bin}
    pythonPath: ""

- insert:
"#
    );
    for &(id, name) in PRODUCT_FALLBACKS {
        let quote = if name.starts_with('@') { "'" } else { "" };
        let disabled = profile_fallback_disabled(name, id);
        yaml.push_str(&format!(
            r#"    - id: {id}
      name: {quote}{name}{quote}
      disabled: {disabled}
"#
        ));
    }
    yaml
}

/// Copy the notification plugin and render its desktop patch under the Harness home.
pub fn install_overlay(
    dsh_home: &Path,
    overlay_src: &Path,
    product: &ProductRuntime,
) -> Result<OverlayPatch, String> {
    let dest_dir = dsh_home.join("desktop-overlay");
    let plugin_src = overlay_src.join("index.mjs");
    if !plugin_src.is_file() {
        return Err(format!(
            "desktop overlay plugin missing: {}",
            plugin_src.display()
        ));
    }

    fs::create_dir_all(&dest_dir).map_err(|e| format!("无法创建 {}: {e}", dest_dir.display()))?;
    let plugin_dest = dest_dir.join("index.mjs");
    fs::copy(&plugin_src, &plugin_dest).map_err(|e| {
        format!(
            "无法复制 {} -> {}: {e}",
            plugin_src.display(),
            plugin_dest.display()
        )
    })?;

    let plugin_url = normalize_plugin_path(&plugin_dest)?;
    let patch_file = dest_dir.join("cordis.yml");
    fs::write(&patch_file, overlay_yaml(&plugin_url, product))
        .map_err(|e| format!("无法写入 {}: {e}", patch_file.display()))?;

    Ok(OverlayPatch { patch_file })
}

fn normalize_plugin_path(path: &Path) -> Result<String, String> {
    let canonical = path
        .canonicalize()
        .map_err(|e| format!("无法解析 {}: {e}", path.display()))?;
    url::Url::from_file_path(&canonical)
        .map(|file_url| file_url.as_str().to_string())
        .map_err(|()| {
            format!(
                "plugin path is not a usable file URL: {}",
                canonical.display()
            )
        })
}

/// Resolve the overlay source shipped beside the desktop shell.
pub fn resolve_overlay_source(resource_dir: Option<&Path>) -> PathBuf {
    if let Some(dir) = resource_dir {
        let bundled = dir.join("desktop-overlay");
        if bundled.join("index.mjs").is_file() {
            return bundled;
        }
    }

    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("overlay")
        .join("desktop-notify")
}

#[cfg(test)]
mod tests {
    use super::{install_overlay, linux_plugin_file_url, normalize_plugin_path, overlay_yaml};
    use crate::product::ProductRuntime;
    use std::fs;

    fn product(root: &std::path::Path) -> ProductRuntime {
        ProductRuntime {
            project_root: root.join("workspace"),
            harbor_bin: root.join("runtime").join("harbor"),
            harbor_dsh_bin: root.join("runtime").join("harbor-dsh"),
            integration_version: "0.7.3".into(),
        }
    }

    #[test]
    fn linux_file_url_is_posix() {
        assert_eq!(
            linux_plugin_file_url("/home/u/.dsh/desktop-overlay/index.mjs").unwrap(),
            "file:///home/u/.dsh/desktop-overlay/index.mjs"
        );
    }

    #[test]
    fn linux_file_url_rejects_windows_drive_path() {
        assert!(linux_plugin_file_url("/C:/plugin.mjs").is_err());
    }

    #[test]
    fn linux_file_url_rejects_wsl_localhost() {
        assert!(linux_plugin_file_url("//wsl.localhost/Ubuntu/home/u/plugin.mjs").is_err());
    }

    #[test]
    fn overlay_yaml_names_linux_url() {
        let root = std::path::PathBuf::from("/tmp/yourbuddy");
        let yaml = overlay_yaml(
            "file:///home/u/.dsh/desktop-overlay/index.mjs",
            &product(&root),
        );
        assert!(yaml.contains("file:///home/u/.dsh/desktop-overlay/index.mjs"));
        assert!(!yaml.contains("file:///C:"));
        assert!(yaml.contains("searchProvider: codex"));
        assert!(yaml.contains(
            "id: sandbox-policy\n  config:\n    mode: danger-full-access\n    workspaceRoot: !!js process.cwd()"
        ));
        assert!(yaml.contains("id: approval\n  config:\n    policy: never"));
        assert!(yaml.contains("id: agent-preset-registry\n  config:\n    default: codex"));
        assert!(yaml.contains(
            "id: tool-skill\n  config:\n    modelExcludedSkills:\n      - codexhost-delegation"
        ));
        assert!(!yaml.contains("id: ui-sidebar\n  disabled: true"));
        assert!(yaml.contains("id: yourbuddy-subagent-codex"));
        assert!(yaml.contains("name: '@deepseek-ai/dsh-subagent-codex'"));
        assert!(yaml.contains("e.options.id !== 'yourbuddy-subagent-codex' && !e.disabled"));
        assert!(yaml.contains("id: yourbuddy-llm-codex-auth"));
        assert!(yaml.contains("name: dsh-codex-auth/search"));
        assert!(yaml.contains("name: dsh-codex-auth/image"));
        assert!(yaml.contains("id: better-sidebar"));
        assert!(yaml.contains("e.options.id !== 'better-sidebar' && !e.disabled"));
        assert!(yaml.contains("presentation: slot\n    workspaceFence: false"));
        assert!(yaml.contains("id: yourbuddy-context-doctor"));
        assert!(yaml.contains("name: dsh-context-doctor"));
        assert!(yaml.contains("id: yourbuddy-ego-browser"));
        assert!(yaml.contains("name: dsh-ego-browser"));
        assert!(yaml.contains("e.options.id !== 'yourbuddy-ego-browser' && !e.disabled"));
        assert!(yaml.contains("id: yourbuddy-plugin-marketplace"));
        assert!(yaml.contains("name: dsh-plugin-marketplace"));
        assert!(yaml.contains("id: yourbuddy-personal-workbench"));
        assert!(yaml.contains("name: dsh-personal-workbench"));
        assert!(yaml.contains("id: yourbuddy-oil-creator"));
        assert!(yaml.contains("name: dsh-oil-creator"));
        assert!(yaml.contains("id: harbor-evolution"));
        assert!(!yaml.contains("name: dsh-harbor-evolution"));
        assert!(yaml.contains("ctx.loader.entries()"));
        assert!(yaml.contains("projectRoot: \"/tmp/yourbuddy/workspace\""));
    }

    #[test]
    fn writes_a_file_url_patch_row_for_the_copied_plugin() {
        let root = std::env::temp_dir().join(format!("dsh desktop overlay {}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(root.join("src")).unwrap();
        fs::write(
            root.join("src").join("index.mjs"),
            "export function apply() {}\n",
        )
        .unwrap();

        let dsh_home = root.join("home");
        let overlay = install_overlay(&dsh_home, &root.join("src"), &product(&root)).unwrap();
        let yaml = fs::read_to_string(&overlay.patch_file).unwrap();
        let plugin = dsh_home.join("desktop-overlay").join("index.mjs");
        let plugin_url = normalize_plugin_path(&plugin).unwrap();
        assert_eq!(fs::read(&plugin).unwrap(), b"export function apply() {}\n");
        assert!(plugin_url.starts_with("file://"), "{plugin_url}");
        assert!(plugin_url.contains("%20"), "{plugin_url}");
        assert!(!plugin_url.contains('\\'), "{plugin_url}");
        assert!(
            yaml.contains(&format!(
                "- id: dsh-desktop-notify\n      name: \"{plugin_url}\"\n"
            )),
            "{yaml}"
        );
        let _ = fs::remove_dir_all(&root);
    }
}
