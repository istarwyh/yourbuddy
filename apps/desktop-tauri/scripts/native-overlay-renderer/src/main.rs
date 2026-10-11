//! Render the production desktop overlay without starting Tauri or touching app data.
#![allow(dead_code)]

use std::io::{Read, Write};
use std::path::{Component, Path, PathBuf};

#[path = "../../../src-tauri/src/overlay.rs"]
mod overlay;
#[path = "../../../src-tauri/src/product.rs"]
mod product;

// The production renderer only reads ProductRuntime. These definitions satisfy
// unused desktop installation functions without importing the Tauri dependency.
mod runtime {
    pub fn app_data_root() -> Result<std::path::PathBuf, String> {
        Err("the overlay renderer cannot access application data".into())
    }
    pub mod provision {
        pub struct RuntimePaths {
            pub node_binary: std::path::PathBuf,
            pub pnpm_binary: std::path::PathBuf,
            pub cli_entry: std::path::PathBuf,
            pub harness_root: std::path::PathBuf,
            pub runtime_root: std::path::PathBuf,
            pub dsh_home: std::path::PathBuf,
        }
    }
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Input {
    plugin_url: String,
    project_root: PathBuf,
    harbor_bin: PathBuf,
    harbor_dsh_bin: PathBuf,
}

fn validate_path(path: &Path) -> Result<(), String> {
    if path.as_os_str().len() > 4096
        || !path.is_absolute()
        || path
            .components()
            .any(|part| matches!(part, Component::ParentDir))
    {
        return Err("overlay paths must be bounded absolute paths without parent segments".into());
    }
    Ok(())
}

fn render(raw: &[u8]) -> Result<String, String> {
    if raw.len() > 32 * 1024 {
        return Err("overlay input exceeds 32 KiB".into());
    }
    let input: Input =
        serde_json::from_slice(raw).map_err(|error| format!("invalid overlay input: {error}"))?;
    validate_path(&input.project_root)?;
    validate_path(&input.harbor_bin)?;
    validate_path(&input.harbor_dsh_bin)?;
    let plugin = url::Url::parse(&input.plugin_url)
        .map_err(|error| format!("invalid notification module URL: {error}"))?;
    if input.plugin_url.len() > 16 * 1024
        || plugin.scheme() != "file"
        || plugin.to_file_path().is_err()
        || plugin.query().is_some()
        || plugin.fragment().is_some()
        || plugin.host_str().is_some_and(|host| host != "localhost")
    {
        return Err("notification module must be a local file URL".into());
    }
    Ok(overlay::overlay_yaml(
        &input.plugin_url,
        &product::ProductRuntime {
            project_root: input.project_root,
            harbor_bin: input.harbor_bin,
            harbor_dsh_bin: input.harbor_dsh_bin,
            integration_version: env!("CARGO_PKG_VERSION").into(),
        },
    ))
}

fn run() -> Result<(), String> {
    if std::env::args_os().len() != 1 {
        return Err(
            "overlay renderer reads one JSON object from stdin and writes YAML to stdout".into(),
        );
    }
    let mut raw = Vec::new();
    std::io::stdin()
        .take(32 * 1024 + 1)
        .read_to_end(&mut raw)
        .map_err(|error| format!("cannot read overlay input: {error}"))?;
    let yaml = render(&raw)?;
    std::io::stdout()
        .write_all(yaml.as_bytes())
        .map_err(|error| format!("cannot write overlay output: {error}"))
}

fn main() {
    if let Err(error) = run() {
        eprintln!("yourbuddy-native-overlay-renderer: {error}");
        std::process::exit(1);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn input() -> serde_json::Value {
        let root = std::env::temp_dir();
        serde_json::json!({
            "pluginUrl": url::Url::from_file_path(root.join("notify.mjs")).unwrap().as_str(),
            "projectRoot": root.join("workspace"),
            "harborBin": root.join("harbor"),
            "harborDshBin": root.join("harbor-dsh"),
        })
    }

    #[test]
    fn uses_the_same_production_renderer_and_preserves_core_defaults() {
        let value = input();
        let input: Input = serde_json::from_value(value.clone()).unwrap();
        let expected = overlay::overlay_yaml(
            &input.plugin_url,
            &product::ProductRuntime {
                project_root: input.project_root,
                harbor_bin: input.harbor_bin,
                harbor_dsh_bin: input.harbor_dsh_bin,
                integration_version: "0.4.9".into(),
            },
        );
        let rendered = render(&serde_json::to_vec(&value).unwrap()).unwrap();
        assert_eq!(rendered, expected);
        assert!(rendered.contains("default: codex"));
        assert!(rendered.contains("id: ui-sidebar-browser\n  disabled: false"));
        for package in ["dsh-ego-browser", "dsh-oil-creator", "dsh-context-doctor"] {
            assert!(rendered.contains(&format!("name: {package}")));
        }
        assert!(!rendered.contains("name: dsh-harbor-evolution"));
    }

    #[test]
    fn rejects_unknown_fields_urls_and_unbounded_paths() {
        let mut value = input();
        value["other"] = true.into();
        assert!(render(&serde_json::to_vec(&value).unwrap()).is_err());
        for invalid in ["relative", "/safe/../elsewhere", &"x".repeat(4097)] {
            let mut value = input();
            value["projectRoot"] = invalid.into();
            assert!(render(&serde_json::to_vec(&value).unwrap()).is_err());
        }
        for invalid in [
            "https://example.com/plugin.mjs",
            "file://remote/plugin.mjs",
            "file:///plugin.mjs?query",
        ] {
            let mut value = input();
            value["pluginUrl"] = invalid.into();
            assert!(render(&serde_json::to_vec(&value).unwrap()).is_err());
        }
        assert!(render(&vec![b' '; 32 * 1024 + 1]).is_err());
    }
}
