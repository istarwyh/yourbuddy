//! Headless access to the fixed Harbor component for the product-owned Host plugin.

use std::path::{Path, PathBuf};
use std::process::Command;

use crate::desktop_settings;
use crate::network_proxy;
use crate::runtime::component_leases::{ComponentIdentity, ComponentLeases};
use crate::runtime::component_plan::PlanRequest;
use crate::runtime::components::{verify_component_channel, ComponentManager};

const MODE: &str = "--yourbuddy-component-helper";

/// True when the application was invoked as its restricted component helper.
pub fn should_run() -> bool {
    std::env::args_os().nth(1).as_deref() == Some(std::ffi::OsStr::new(MODE))
}

/// Resolve or explicitly install Harbor, then run one declared entry point.
pub fn run() -> i32 {
    // Helpers bypass GUI setup; metrics use the same best-effort local sink.
    let _ = crate::runtime::boot_log::init();
    match run_inner() {
        Ok(code) => code,
        Err(error) => {
            eprintln!("{error}");
            1
        }
    }
}

fn run_inner() -> Result<i32, String> {
    let args: Vec<std::ffi::OsString> = std::env::args_os().skip(2).collect();
    run_args(&args)
}

fn run_args(args: &[std::ffi::OsString]) -> Result<i32, String> {
    let action = args.first().and_then(|arg| arg.to_str()).unwrap_or("");
    let entry = args.get(1).and_then(|arg| arg.to_str()).unwrap_or("");
    if action == "cli" {
        return crate::cli_shim::run_component_cli(&resource_dir()?, &args[1..]);
    }
    if action == "verify-channel" {
        if args.len() != 1 {
            return Err("component helper verify-channel accepts no extra arguments".into());
        }
        verify_component_channel(&resource_dir()?)?;
        return Ok(0);
    }
    if !matches!(action, "run" | "install") || !matches!(entry, "harbor" | "harbor-dsh") {
        return Err(
            "component helper accepts only: cli, verify-channel, or <run|install> <harbor|harbor-dsh>"
                .into(),
        );
    }
    let resource_dir = resource_dir()?;
    let settings = desktop_settings::load();
    let proxy = network_proxy::resolve(&settings.network_proxy)?;
    let manager = ComponentManager::load(&resource_dir, &proxy)?;
    let identities = manager
        .installation_plan(&PlanRequest::Capability("harbor".into()))?
        .components
        .into_iter()
        .map(|entry| ComponentIdentity {
            component: entry.component,
            id: entry.id,
        })
        .collect::<Vec<_>>();
    let leases = ComponentLeases::new(manager.cache_root())?.acquire_shared(&identities)?;
    let root = if action == "install" {
        tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .map_err(|error| format!("cannot start component runtime: {error}"))?
            .block_on(manager.ensure("harbor"))?
    } else {
        manager.installed("harbor")?.ok_or_else(|| {
            "HARBOR_RUNTIME_NOT_READY: install the Harbor runtime from YourBuddy settings"
                .to_string()
        })?
    };
    let manifest: serde_json::Value = serde_json::from_slice(
        &std::fs::read(root.join("manifest.json"))
            .map_err(|error| format!("Harbor component manifest is unavailable: {error}"))?,
    )
    .map_err(|error| format!("Harbor component manifest is invalid: {error}"))?;
    let field = if entry == "harbor" {
        "harborBin"
    } else {
        "harborDshBin"
    };
    let relative = manifest[field]
        .as_str()
        .ok_or_else(|| format!("Harbor component manifest is missing {field}"))?;
    let executable = declared_harbor_entry(&root, relative)?;
    let mut command = Command::new(executable);
    command.args(args.iter().skip(2));
    crate::cli_shim::run_leased_command(command, leases, "Harbor component")
}

fn resource_dir() -> Result<PathBuf, String> {
    let executable = std::env::current_exe()
        .map_err(|error| format!("cannot resolve component helper executable: {error}"))?;
    resource_dir_for(&executable)
}

fn resource_dir_for(executable: &Path) -> Result<PathBuf, String> {
    let macos = executable
        .parent()
        .ok_or_else(|| "component helper executable has no parent".to_string())?;
    let contents = macos.parent().ok_or_else(|| {
        "component helper executable is outside an application bundle".to_string()
    })?;
    let resources = contents.join("Resources");
    if macos.file_name().is_some_and(|name| name == "MacOS")
        && contents.file_name().is_some_and(|name| name == "Contents")
    {
        // A damaged real bundle must not silently select a developer channel above it.
        if !resources.join("component-channel").is_dir() {
            return Err(format!(
                "YourBuddy signed component channel is unavailable in {}",
                resources.display()
            ));
        }
        return Ok(resources);
    }
    developer_resource_dir(executable)
}

fn developer_resource_dir(executable: &Path) -> Result<PathBuf, String> {
    executable
        .ancestors()
        .find(|path| path.join("component-channel").is_dir())
        .map(Path::to_path_buf)
        .ok_or_else(|| "component channel resource directory is unavailable".into())
}

fn declared_harbor_entry(root: &Path, relative: &str) -> Result<PathBuf, String> {
    let path = Path::new(relative);
    if path.as_os_str().is_empty()
        || path
            .components()
            .any(|part| !matches!(part, std::path::Component::Normal(_)))
    {
        return Err("Harbor entry must be a relative component path".into());
    }
    let root = std::fs::canonicalize(root)
        .map_err(|error| format!("Harbor component root is unavailable: {error}"))?;
    let executable = std::fs::canonicalize(root.join(path))
        .map_err(|error| format!("Harbor entry is unavailable: {error}"))?;
    if !executable.starts_with(&root) || !executable.is_file() {
        return Err("Harbor entry is outside its verified component".into());
    }
    Ok(executable)
}

#[cfg(test)]
#[path = "component_helper_tests.rs"]
mod tests;
