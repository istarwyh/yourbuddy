//! When the desktop binary is copied or hard-linked as `dsh.exe`, run the CLI.

use std::collections::BTreeSet;
use std::ffi::OsString;
use std::fs;
use std::path::{Component, Path, PathBuf};
use std::process::{Command, Stdio};

use serde::{Deserialize, Serialize};

use crate::runtime::component_leases::{ComponentIdentity, ComponentLeaseSet, ComponentLeases};
use crate::runtime::component_plan::PlanRequest;
use crate::runtime::components::ComponentManager;
use crate::runtime::host_env::node_binary_compatible;
use crate::runtime::provision::{harness_root_for_bundle, read_bundle_hash};
use crate::{desktop_settings, network_proxy};

/// Sidecar next to `dsh.exe` that names the selected Node, CLI entry, and home.
pub const LAUNCH_FILE: &str = "dsh-launch.json";

/// Launch record written by the PATH bridge and read by the `dsh.exe` trampoline.
#[derive(Debug, Clone, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DshLaunchSpec {
    pub node: String,
    pub cli: String,
    pub dsh_home: String,
    /// Directories prepended to `PATH` before the CLI runs, so `dsh plugin`
    /// resolves the provisioned Node and pnpm instead of whatever the invoking
    /// terminal happens to carry first — two pnpm majors would otherwise split
    /// one profile across two stores. Absent in sidecars from older builds.
    #[serde(default)]
    pub path_prepend: Vec<String>,
}

/// True when this process was started as the `dsh` CLI trampoline, not the GUI.
pub fn should_run_as_cli() -> bool {
    std::env::current_exe()
        .ok()
        .as_deref()
        .and_then(Path::file_stem)
        .and_then(|stem| stem.to_str())
        .is_some_and(|stem| stem.eq_ignore_ascii_case("dsh"))
}

/// The copied Windows trampoline is retained until that platform gains its own
/// consumer-lifetime protocol. Unix must use the original application's helper.
pub fn run() -> i32 {
    #[cfg(windows)]
    {
        run_windows_cli()
    }
    #[cfg(not(windows))]
    {
        eprintln!("dsh: run the managed dsh shell command from YourBuddy; a copied executable cannot authenticate the original application's component channel");
        1
    }
}

#[cfg(windows)]
fn run_windows_cli() -> i32 {
    let parent_console_visible = attach_visible_parent_console();
    let exe_dir = match std::env::current_exe()
        .ok()
        .and_then(|path| path.parent().map(Path::to_path_buf))
    {
        Some(dir) => dir,
        None => {
            eprintln!("dsh: cannot resolve executable directory");
            return 1;
        }
    };
    let spec_path = exe_dir.join(LAUNCH_FILE);
    let spec = match read_launch_spec(&spec_path) {
        Ok(spec) => spec,
        Err(error) => {
            eprintln!("dsh: {error}");
            return 1;
        }
    };
    let args: Vec<String> = std::env::args().skip(1).collect();
    let mut command = Command::new(&spec.node);
    command
        .arg(&spec.cli)
        .args(&args)
        .env("DSH_HOME", &spec.dsh_home)
        .stdin(Stdio::inherit())
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit());
    if !parent_console_visible {
        hide_console(&mut command);
    }
    if let Ok(path) = merged_path(&spec.path_prepend) {
        command.env("PATH", path);
    }
    match command.status() {
        Ok(status) => status.code().unwrap_or(1),
        Err(error) => {
            eprintln!("dsh: failed to start {}: {error}", spec.node);
            1
        }
    }
}

/// Reject known CLI entry points that predate consumer-held leases.
///
/// This is a read-only layout precondition for cleanup preview AND execution.
/// Passing it does not establish that previously launched legacy consumers have
/// exited. The cleanup owner must separately establish lease-only consumer coverage
/// for a migrated installation; it must not infer that from deleting/moving a copy.
pub(crate) fn require_cli_cleanup_coverage(app_root: &Path) -> Result<(), String> {
    #[cfg(unix)]
    {
        let legacy = app_root.join("bin/dsh.exe");
        match fs::symlink_metadata(&legacy) {
            Ok(_) => Err(format!("component cleanup is unavailable while an unverified legacy CLI entry remains at {}; leave this file unchanged until its consumer coverage is resolved", legacy.display())),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
            Err(error) => Err(format!("cannot establish CLI cleanup coverage at {}: {error}", legacy.display())),
        }
    }
    #[cfg(not(unix))]
    {
        let _ = app_root;
        Err(
            "component cleanup requires consumer lifetime protection unavailable on this platform"
                .into(),
        )
    }
}

/// Run the product-managed CLI from the original application's authenticated channel.
/// Arguments contain only CLI arguments; resource and sidecar paths are never caller inputs.
pub(crate) fn run_component_cli(resource_dir: &Path, args: &[OsString]) -> Result<i32, String> {
    let settings = desktop_settings::load();
    let proxy = network_proxy::resolve(&settings.network_proxy)?;
    let manager = ComponentManager::load(resource_dir, &proxy)?;
    let app_root = crate::runtime::app_data_root()?;
    let leases = acquire_cli_leases(&manager)?;
    let source = manager.installed("harness")?.ok_or(
        "DSH_RUNTIME_NOT_READY: start this YourBuddy application to prepare its current Harness",
    )?;
    let bundle_hash = read_bundle_hash(&source)?;
    let expected_cli = harness_root_for_bundle(&app_root, &bundle_hash).join("apps/cli/lib/bin.js");
    let spec = read_launch_spec(&app_root.join("bin").join(LAUNCH_FILE))?;
    let managed_node = manager.installed("node")?.map(|root| {
        #[cfg(windows)]
        {
            root.join("node.exe")
        }
        #[cfg(not(windows))]
        {
            root.join("bin/node")
        }
    });
    validate_component_launch(&spec, &app_root, &expected_cli, managed_node.as_deref())?;
    let command = component_cli_command(&spec, &app_root, args)?;
    run_leased_command(command, leases, "dsh CLI")
}

fn acquire_cli_leases(manager: &ComponentManager) -> Result<ComponentLeaseSet, String> {
    let mut identities = BTreeSet::new();
    for request in [PlanRequest::Startup, PlanRequest::Fallback("node".into())] {
        for entry in manager.installation_plan(&request)?.components {
            identities.insert((entry.component, entry.id));
        }
    }
    let identities: Vec<_> = identities
        .into_iter()
        .map(|(component, id)| ComponentIdentity { component, id })
        .collect();
    ComponentLeases::new(manager.cache_root())?.acquire_shared(&identities)
}

fn validate_component_launch(
    spec: &DshLaunchSpec,
    app_root: &Path,
    expected_cli: &Path,
    managed_node: Option<&Path>,
) -> Result<(), String> {
    let root = fs::canonicalize(app_root)
        .map_err(|error| format!("YourBuddy data is unavailable: {error}"))?;
    let cli = canonical_launch_path(Path::new(&spec.cli))?;
    let expected = canonical_launch_path(expected_cli)?;
    if cli != expected || !expected.starts_with(&root) || !expected.is_file() {
        return Err("dsh launch sidecar does not name the current verified Harness CLI".into());
    }
    let home = canonical_launch_path(Path::new(&spec.dsh_home))?;
    if home != canonical_launch_path(&app_root.join("dsh-home"))? || !home.starts_with(&root) {
        return Err("dsh launch sidecar does not name the YourBuddy home".into());
    }
    let node = canonical_launch_path(Path::new(&spec.node))?;
    let cache = root.join("components");
    if node.starts_with(&cache) || Path::new(&spec.node).starts_with(app_root.join("components")) {
        let expected =
            managed_node.ok_or("dsh launch sidecar names an unavailable Node component")?;
        if !node.starts_with(&cache) || node != canonical_launch_path(expected)? {
            return Err(
                "dsh launch sidecar does not name the current verified Node component".into(),
            );
        }
    }
    let prepend = component_cli_prepend(spec, app_root)?;
    if !spec.path_prepend.is_empty() && spec.path_prepend != prepend {
        return Err("dsh launch sidecar has unexpected runtime PATH directories".into());
    }
    if !node_binary_compatible(&node) {
        return Err(
            "dsh Node does not satisfy the required version and native architecture".into(),
        );
    }
    Ok(())
}

fn canonical_launch_path(path: &Path) -> Result<PathBuf, String> {
    if !path.is_absolute()
        || path
            .components()
            .any(|part| matches!(part, Component::ParentDir | Component::CurDir))
    {
        return Err("dsh launch paths must be absolute without traversal segments".into());
    }
    fs::canonicalize(path).map_err(|error| {
        format!(
            "dsh launch path is unavailable ({}): {error}",
            path.display()
        )
    })
}

fn component_cli_prepend(spec: &DshLaunchSpec, app_root: &Path) -> Result<Vec<String>, String> {
    let node_dir = Path::new(&spec.node)
        .parent()
        .ok_or("dsh Node has no parent directory")?;
    let pnpm = app_root.join("runtime/pnpm-global");
    #[cfg(not(windows))]
    let pnpm = pnpm.join("bin");
    let mut paths = vec![node_dir.display().to_string()];
    if paths[0] != pnpm.display().to_string() {
        paths.push(pnpm.display().to_string());
    }
    Ok(paths)
}

fn component_cli_command(
    spec: &DshLaunchSpec,
    app_root: &Path,
    args: &[OsString],
) -> Result<Command, String> {
    let mut prepend = vec![app_root.join("bin").display().to_string()];
    prepend.extend(component_cli_prepend(spec, app_root)?);
    let mut command = Command::new(&spec.node);
    command
        .arg(&spec.cli)
        .args(args)
        .env("DSH_HOME", &spec.dsh_home)
        .env("PATH", merged_path(&prepend)?)
        .stdin(Stdio::inherit())
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit());
    Ok(command)
}

/// Wait for one approved component command while both supervisor and Unix consumer hold leases.
pub(crate) fn run_leased_command(
    mut command: Command,
    leases: ComponentLeaseSet,
    label: &str,
) -> Result<i32, String> {
    #[cfg(unix)]
    leases.inherit_shared_into(&mut command)?;
    let mut child = command
        .spawn()
        .map_err(|error| format!("cannot run {label}: {error}"))?;
    drop(command);
    let status = child.wait().map_err(|error| {
        let _ = child.kill();
        let _ = child.wait();
        format!("cannot wait for {label}: {error}")
    })?;
    drop(leases);
    Ok(status.code().unwrap_or(1))
}

/// Parse a launch sidecar; used by the trampoline and by PATH-bridge tests.
pub fn read_launch_spec(path: &Path) -> Result<DshLaunchSpec, String> {
    let raw = std::fs::read_to_string(path)
        .map_err(|e| format!("missing launch sidecar {} ({e})", path.display()))?;
    serde_json::from_str(&raw).map_err(|e| format!("invalid {}: {e}", path.display()))
}

/// Attach the parent console when one exists, and report whether it is visible.
/// A hidden parent (catalog PowerShell, GUI `CREATE_NO_WINDOW`) must not cause
/// the sidecar `node.exe` to allocate a new console window.
fn attach_visible_parent_console() -> bool {
    #[cfg(windows)]
    {
        use windows::Win32::System::Console::{
            AttachConsole, GetConsoleWindow, ATTACH_PARENT_PROCESS,
        };
        use windows::Win32::UI::WindowsAndMessaging::IsWindowVisible;
        if unsafe { AttachConsole(ATTACH_PARENT_PROCESS) }.is_err() {
            return false;
        }
        let hwnd = unsafe { GetConsoleWindow() };
        if hwnd.0.is_null() {
            return false;
        }
        unsafe { IsWindowVisible(hwnd) }.as_bool()
    }
    #[cfg(not(windows))]
    {
        true
    }
}

fn hide_console(cmd: &mut Command) {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x0800_0000);
    }
    let _ = cmd;
}

/// Join the prepend list ahead of the inherited `PATH`, or `None` when the
/// list is empty or the platform separator cannot be determined.
fn merged_path(prepend: &[String]) -> Result<String, String> {
    let mut parts: Vec<std::path::PathBuf> = prepend.iter().map(Into::into).collect();
    if let Some(existing) = std::env::var_os("PATH") {
        parts.extend(std::env::split_paths(&existing));
    }
    std::env::join_paths(parts)
        .map(|value| value.to_string_lossy().into_owned())
        .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::{read_launch_spec, should_run_as_cli, DshLaunchSpec};
    use std::fs;

    #[test]
    fn desktop_test_runner_is_not_the_cli_trampoline() {
        assert!(!should_run_as_cli());
    }

    #[test]
    fn reads_camel_case_launch_sidecar() {
        let path = std::env::temp_dir().join(format!(
            "dsh-launch-{}-{}.json",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_nanos())
                .unwrap_or(0)
        ));
        fs::write(
            &path,
            r#"{"node":"C:\\node.exe","cli":"C:\\bin.js","dshHome":"C:\\.dsh","pathPrepend":["C:\\node","C:\\pnpm"]}"#,
        )
        .unwrap();
        assert_eq!(
            read_launch_spec(&path).unwrap(),
            DshLaunchSpec {
                node: r"C:\node.exe".into(),
                cli: r"C:\bin.js".into(),
                dsh_home: r"C:\.dsh".into(),
                path_prepend: vec![r"C:\node".into(), r"C:\pnpm".into()],
            }
        );
        let _ = fs::remove_file(&path);
    }

    #[test]
    fn reads_a_legacy_sidecar_without_path_prepend() {
        let path = std::env::temp_dir().join(format!(
            "dsh-launch-legacy-{}-{}.json",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_nanos())
                .unwrap_or(0)
        ));
        fs::write(
            &path,
            r#"{"node":"C:\\node.exe","cli":"C:\\bin.js","dshHome":"C:\\.dsh"}"#,
        )
        .unwrap();
        assert_eq!(
            read_launch_spec(&path).unwrap().path_prepend,
            Vec::<String>::new()
        );
        let _ = fs::remove_file(&path);
    }
}

#[cfg(test)]
#[path = "cli_shim_component_tests.rs"]
mod component_tests;
