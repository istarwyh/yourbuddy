//! Headless access to the fixed Harbor component for the product-owned Host plugin.

use std::path::{Path, PathBuf};
use std::process::Command;

use crate::desktop_settings;
use crate::network_proxy;
use crate::runtime::components::{verify_component_channel, ComponentManager};

const MODE: &str = "--yourbuddy-component-helper";

/// True when the application was invoked as its restricted component helper.
pub fn should_run() -> bool {
    std::env::args().nth(1).as_deref() == Some(MODE)
}

/// Resolve or explicitly install Harbor, then run one declared entry point.
pub fn run() -> i32 {
    match run_inner() {
        Ok(code) => code,
        Err(error) => {
            eprintln!("{error}");
            1
        }
    }
}

fn run_inner() -> Result<i32, String> {
    let args: Vec<String> = std::env::args().skip(2).collect();
    let action = args.first().map(String::as_str).unwrap_or("");
    let entry = args.get(1).map(String::as_str).unwrap_or("");
    if action == "verify-channel" {
        if args.len() != 1 {
            return Err("component helper verify-channel accepts no extra arguments".into());
        }
        verify_component_channel(&resource_dir()?)?;
        return Ok(0);
    }
    if !matches!(action, "run" | "install") || !matches!(entry, "harbor" | "harbor-dsh") {
        return Err(
            "component helper accepts only: verify-channel or <run|install> <harbor|harbor-dsh>"
                .into(),
        );
    }
    let resource_dir = resource_dir()?;
    let settings = desktop_settings::load();
    let proxy = network_proxy::resolve(&settings.network_proxy)?;
    let manager = ComponentManager::load(&resource_dir, &proxy)?;
    let root = if action == "install" {
        tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .map_err(|error| format!("cannot start component runtime: {error}"))?
            .block_on(manager.ensure("harbor"))?
    } else {
        manager.installed("harbor")?.ok_or_else(|| {
            "HARBOR_RUNTIME_NOT_READY: install the Harbor runtime from YourBuddy settings".to_string()
        })?
    };
    let manifest: serde_json::Value = serde_json::from_slice(
        &std::fs::read(root.join("manifest.json"))
            .map_err(|error| format!("Harbor component manifest is unavailable: {error}"))?,
    )
    .map_err(|error| format!("Harbor component manifest is invalid: {error}"))?;
    let field = if entry == "harbor" { "harborBin" } else { "harborDshBin" };
    let relative = manifest[field]
        .as_str()
        .ok_or_else(|| format!("Harbor component manifest is missing {field}"))?;
    let executable = root.join(relative);
    if !executable.is_file() {
        return Err(format!("Harbor component entry point is missing: {}", executable.display()));
    }
    let status = Command::new(executable)
        .args(args.iter().skip(2))
        .status()
        .map_err(|error| format!("cannot run Harbor component: {error}"))?;
    Ok(status.code().unwrap_or(1))
}

fn resource_dir() -> Result<PathBuf, String> {
    let executable = std::env::current_exe()
        .map_err(|error| format!("cannot resolve component helper executable: {error}"))?;
    let macos = executable
        .parent()
        .ok_or_else(|| "component helper executable has no parent".to_string())?;
    let contents = macos
        .parent()
        .ok_or_else(|| "component helper executable is outside an application bundle".to_string())?;
    let resources = contents.join("Resources");
    if resources.is_dir() {
        return Ok(resources);
    }
    developer_resource_dir(&executable)
}

fn developer_resource_dir(executable: &Path) -> Result<PathBuf, String> {
    executable
        .ancestors()
        .find(|path| path.join("component-channel").is_dir())
        .map(Path::to_path_buf)
        .ok_or_else(|| "component channel resource directory is unavailable".into())
}
