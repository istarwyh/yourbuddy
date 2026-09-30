//! Resolve product workspace and restricted Harbor component helper wrappers.

use std::fs;
#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;
use std::path::{Path, PathBuf};

use crate::runtime::app_data_root;

/// Absolute paths injected into the product's Harbor Cordis plugin row.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ProductRuntime {
    pub project_root: PathBuf,
    pub harbor_bin: PathBuf,
    pub harbor_dsh_bin: PathBuf,
    pub integration_version: String,
}

/// Create YourBuddy's workspace and stable wrappers for the lazy Harbor component.
pub fn resolve(_resource_dir: Option<&Path>) -> Result<ProductRuntime, String> {
    let project_root = app_data_root()?.join("workspace");
    fs::create_dir_all(project_root.join("jobs")).map_err(|e| {
        format!(
            "cannot create YourBuddy workspace {}: {e}",
            project_root.display()
        )
    })?;

    let helper_dir = app_data_root()?.join("component-helper");
    fs::create_dir_all(&helper_dir)
        .map_err(|error| format!("cannot create Harbor component helper: {error}"))?;
    let executable = std::env::current_exe()
        .map_err(|error| format!("cannot resolve YourBuddy executable: {error}"))?;
    let harbor_bin = write_helper(&helper_dir, &executable, "harbor")?;
    let harbor_dsh_bin = write_helper(&helper_dir, &executable, "harbor-dsh")?;
    Ok(ProductRuntime {
        project_root,
        harbor_bin,
        harbor_dsh_bin,
        integration_version: env!("CARGO_PKG_VERSION").into(),
    })
}

fn write_helper(root: &Path, executable: &Path, entry: &str) -> Result<PathBuf, String> {
    let path = root.join(entry);
    let executable = executable.display().to_string().replace('"', "\\\"");
    fs::write(
        &path,
        format!("#!/bin/sh\nexec \"{executable}\" --yourbuddy-component-helper run {entry} \"$@\"\n"),
    )
    .map_err(|error| format!("cannot write Harbor component helper: {error}"))?;
    #[cfg(unix)]
    fs::set_permissions(&path, fs::Permissions::from_mode(0o700))
        .map_err(|error| format!("cannot make Harbor component helper executable: {error}"))?;
    Ok(path)
}
