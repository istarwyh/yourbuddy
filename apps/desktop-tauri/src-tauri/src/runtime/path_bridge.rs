//! Put the Host's required CLIs on PATH: process env first, user PATH when missing.

use std::fs;
use std::io::{ErrorKind, Write};
use std::path::{Path, PathBuf};

use crate::cli_shim::{DshLaunchSpec, LAUNCH_FILE};
use crate::i18n::{self, Msg};

use super::boot_log;
use super::env_path::{discovery_path, path_eq, which_on_host};
use super::io_fallback::recoverable_message;

#[cfg(windows)]
use super::env_path::is_direct_spawnable_cli;
use super::provision::RuntimePaths;
use super::{app_data_root, ProvisionEvent};

const BIN_DIR_NAME: &str = "bin";
const DSH_SHIM_MARKER: &str = "YourBuddy managed CLI shim";

#[cfg(not(windows))]
const PROFILE_MARKER: &str = "dsh-desktop-path";

/// Directories the Host and its children must see on PATH.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PathBridge {
    pub bin_dir: PathBuf,
    pub node_dir: Option<PathBuf>,
    pub pnpm_dir: Option<PathBuf>,
    pub prepend: Vec<PathBuf>,
}

/// Write `dsh` / `pnpm` shims and return a PATH that includes every required CLI directory.
pub fn prepare_host_path(
    paths: &RuntimePaths,
    progress: impl Fn(ProvisionEvent),
) -> Result<String, String> {
    progress(ProvisionEvent::Status(i18n::t(Msg::StatusWritePath).into()));
    let bridge = match install_path_bridge(paths) {
        Ok(bridge) => bridge,
        Err(error) => {
            boot_log::info(&format!("path bridge install fallback: {error}"));
            return Ok(merge_path(Some(discovery_path()), &[]));
        }
    };
    std::env::set_var("YOURBUDDY_BIN_DIR", &bridge.bin_dir);
    std::env::set_var("YOURBUDDY_NODE_BINARY", &paths.node_binary);
    if user_cli_persistence_enabled(std::env::var_os("YOURBUDDY_PERSIST_DSH_CLI").as_deref()) {
        if let Err(error) = persist_user_path(&bridge) {
            boot_log::info(&format!("user PATH persist skipped: {error}"));
        }
    } else {
        boot_log::info("user PATH persist disabled for isolated YourBuddy product");
    }
    let merged = merge_path(Some(discovery_path()), &bridge.prepend);
    std::env::set_var("PATH", &merged);
    boot_log::info(&format!(
        "path bridge bin={} prepend={}",
        bridge.bin_dir.display(),
        bridge
            .prepend
            .iter()
            .map(|path| path.display().to_string())
            .collect::<Vec<_>>()
            .join(";")
    ));
    Ok(merged)
}

fn user_cli_persistence_enabled(value: Option<&std::ffi::OsStr>) -> bool {
    value == Some(std::ffi::OsStr::new("1"))
}

/// Create shims and collect directories that must precede the inherited PATH.
pub fn install_path_bridge(paths: &RuntimePaths) -> Result<PathBridge, String> {
    let app_root = app_data_root()?;
    require_real_directory(&app_root)?;
    let bin_dir = app_root.join(BIN_DIR_NAME);
    match fs::create_dir(&bin_dir) {
        Ok(()) => {}
        Err(error) if error.kind() == ErrorKind::AlreadyExists => {}
        Err(error) => return Err(recoverable_message("create", &bin_dir, error)),
    }
    require_real_directory(&bin_dir)?;
    write_cli_shims(
        &bin_dir,
        &paths.node_binary,
        &paths.cli_entry,
        &paths.pnpm_binary,
        &paths.dsh_home,
        true,
    )?;

    let node_dir = paths.node_binary.parent().map(Path::to_path_buf);
    let pnpm_dir = paths.pnpm_binary.parent().map(Path::to_path_buf);
    let mut prepend = vec![bin_dir.clone()];
    push_unique_dir(&mut prepend, node_dir.as_deref());
    push_unique_dir(&mut prepend, pnpm_dir.as_deref());
    for dir in companion_tool_dirs() {
        push_unique_dir(&mut prepend, Some(&dir));
    }

    Ok(PathBridge {
        bin_dir,
        node_dir,
        pnpm_dir,
        prepend,
    })
}

/// Prepend unique directories onto an existing PATH value.
pub fn merge_path(existing: Option<impl AsRef<std::ffi::OsStr>>, prepend: &[PathBuf]) -> String {
    let mut parts = Vec::new();
    for dir in prepend {
        if !path_list_contains(&parts, dir) {
            parts.push(dir.clone());
        }
    }
    if let Some(existing) = existing {
        for dir in std::env::split_paths(existing.as_ref()) {
            if !dir.as_os_str().is_empty() && !path_list_contains(&parts, &dir) {
                parts.push(dir);
            }
        }
    }
    std::env::join_paths(parts)
        .map(|value| value.to_string_lossy().into_owned())
        .unwrap_or_else(|_| prepend[0].display().to_string())
}

/// Write Host-facing `dsh` / `pnpm` shims. `install_exe` copies the desktop binary as `dsh.exe`.
pub fn write_cli_shims(
    bin_dir: &Path,
    node: &Path,
    cli_entry: &Path,
    pnpm: &Path,
    dsh_home: &Path,
    install_exe: bool,
) -> Result<(), String> {
    require_real_directory(bin_dir)?;
    // Canonicalize the existing owner directory once, without recursively creating
    // or traversing a caller-supplied bin symlink. Concurrent ancestor replacement
    // is outside the same-user application-data boundary.
    let owned_bin =
        fs::canonicalize(bin_dir).map_err(|error| recoverable_message("read", bin_dir, error))?;
    let bin_dir = owned_bin.as_path();
    #[cfg(windows)]
    let outputs = ["dsh.cmd", LAUNCH_FILE, "pnpm.cmd", "dsh.exe"];
    #[cfg(not(windows))]
    let outputs = ["dsh", LAUNCH_FILE, "pnpm"];
    for name in outputs {
        require_regular_output(&bin_dir.join(name))?;
    }
    let path_prepend = shim_path_prepend(node, pnpm);
    let helper = std::env::current_exe()
        .map_err(|error| format!("cannot resolve the YourBuddy CLI helper: {error}"))?;
    check_dsh_shim_owner(bin_dir)?;
    write_dsh_cmd_shim(bin_dir, &helper)?;
    write_launch_spec(bin_dir, node, cli_entry, dsh_home, &path_prepend)?;
    write_pnpm_shim(bin_dir, node, pnpm)?;
    #[cfg(windows)]
    if install_exe {
        install_dsh_exe(bin_dir)?;
    }
    #[cfg(not(windows))]
    let _ = install_exe;
    Ok(())
}

/// Directories every `dsh` shim prepends to `PATH`: the provisioned Node and
/// pnpm directories, so a terminal `dsh plugin` uses the same pnpm as the
/// desktop instead of splitting one profile across two pnpm-major stores.
fn shim_path_prepend(node: &Path, pnpm: &Path) -> Vec<PathBuf> {
    let mut prepend = Vec::new();
    push_unique_dir(&mut prepend, node.parent());
    push_unique_dir(&mut prepend, pnpm.parent());
    prepend
}

fn is_link_like(metadata: &fs::Metadata) -> bool {
    if metadata.file_type().is_symlink() {
        return true;
    }
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        if metadata.file_attributes() & 0x400 != 0 {
            return true;
        }
    }
    false
}

fn require_real_directory(path: &Path) -> Result<(), String> {
    let metadata =
        fs::symlink_metadata(path).map_err(|error| recoverable_message("read", path, error))?;
    if is_link_like(&metadata) || !metadata.is_dir() {
        return Err(format!(
            "refusing a redirected CLI directory: {}",
            path.display()
        ));
    }
    Ok(())
}

fn require_regular_output(path: &Path) -> Result<(), String> {
    match fs::symlink_metadata(path) {
        Ok(metadata) if is_link_like(&metadata) || !metadata.is_file() => Err(format!(
            "refusing to replace a non-managed CLI output: {}",
            path.display()
        )),
        Ok(_) => Ok(()),
        Err(error) if error.kind() == ErrorKind::NotFound => Ok(()),
        Err(error) => Err(recoverable_message("read", path, error)),
    }
}

/// Same-directory atomic replacement never opens/truncates the destination.
/// Preflight all outputs before writing any, and check again immediately before
/// rename; an existing hard link is detached rather than mutating its other name.
fn write_cli_output(path: &Path, body: impl AsRef<[u8]>, executable: bool) -> Result<(), String> {
    let parent = path.parent().ok_or("CLI output has no parent")?;
    require_real_directory(parent)?;
    require_regular_output(path)?;
    let mut temporary = tempfile::NamedTempFile::new_in(parent)
        .map_err(|error| recoverable_message("create", path, error))?;
    temporary
        .write_all(body.as_ref())
        .map_err(|error| recoverable_message("write", path, error))?;
    #[cfg(unix)]
    if executable {
        use std::os::unix::fs::PermissionsExt;
        temporary
            .as_file()
            .set_permissions(fs::Permissions::from_mode(0o755))
            .map_err(|error| recoverable_message("write", path, error))?;
    }
    #[cfg(not(unix))]
    let _ = executable;
    temporary
        .as_file()
        .sync_all()
        .map_err(|error| recoverable_message("write", path, error))?;
    require_regular_output(path)?;
    temporary
        .persist(path)
        .map_err(|error| recoverable_message("write", path, error.error))?;
    Ok(())
}

/// Do not replace a user's command. Only our marker or the exact previous
/// sidecar-derived legacy script establishes ownership; a filename alone does not.
fn check_dsh_shim_owner(bin_dir: &Path) -> Result<(), String> {
    #[cfg(windows)]
    let name = "dsh.cmd";
    #[cfg(not(windows))]
    let name = "dsh";
    let dest = bin_dir.join(name);
    let metadata = match fs::symlink_metadata(&dest) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == ErrorKind::NotFound => return Ok(()),
        Err(error) => return Err(recoverable_message("read", &dest, error)),
    };
    if metadata.file_type().is_symlink() || !metadata.is_file() {
        return Err(format!(
            "refusing to replace a non-managed CLI: {}",
            dest.display()
        ));
    }
    let body =
        fs::read_to_string(&dest).map_err(|error| recoverable_message("read", &dest, error))?;
    #[cfg(windows)]
    let marker = format!("@echo off\r\nrem {DSH_SHIM_MARKER}\r\n");
    #[cfg(not(windows))]
    let marker = format!("#!/bin/sh\n# {DSH_SHIM_MARKER}\n");
    if body.starts_with(&marker) {
        return Ok(());
    }
    if let Ok(previous) = crate::cli_shim::read_launch_spec(&bin_dir.join(LAUNCH_FILE)) {
        let node = quote_for_cmd(Path::new(&previous.node));
        let cli = quote_for_cmd(Path::new(&previous.cli));
        let prepend = std::env::join_paths(previous.path_prepend.iter().map(Path::new))
            .map(|value| value.to_string_lossy().into_owned())
            .unwrap_or_default();
        #[cfg(windows)]
        let legacy = format!("@echo off\r\nset \"PATH={prepend};%PATH%\"\r\n{node} {cli} %*\r\n");
        #[cfg(not(windows))]
        let legacy = format!("#!/bin/sh\nPATH=\"{prepend}:$PATH\"\nexec {node} {cli} \"$@\"\n");
        if body == legacy {
            return Ok(());
        }
    }
    Err(format!(
        "refusing to replace a non-managed CLI: {}",
        dest.display()
    ))
}

fn write_dsh_cmd_shim(bin_dir: &Path, helper: &Path) -> Result<(), String> {
    #[cfg(windows)]
    {
        // Keep Windows on its native trampoline; Unix inherited-lock guarantees
        // do not apply to Windows and component cleanup remains unavailable there.
        let dest = bin_dir.join("dsh.cmd");
        write_cli_output(
            &dest,
            format!("@echo off\r\nrem {DSH_SHIM_MARKER}\r\n\"%~dp0dsh.exe\" %*\r\n"),
            false,
        )?;
        let _ = helper;
    }
    #[cfg(not(windows))]
    {
        let script = bin_dir.join("dsh");
        write_cli_output(&script, dsh_shell_body(helper)?, true)?;
    }
    Ok(())
}

#[cfg(not(windows))]
fn dsh_shell_body(helper: &Path) -> Result<String, String> {
    let path = helper
        .to_str()
        .ok_or("YourBuddy helper path is not UTF-8")?;
    if !helper.is_absolute() {
        return Err("YourBuddy helper path must be absolute".into());
    }
    // POSIX single quotes preserve spaces, quotes, dollars and shell metacharacters.
    let quoted = format!("'{}'", path.replace('\'', "'\"'\"'"));
    Ok(format!(
        "#!/bin/sh\n# {DSH_SHIM_MARKER}\nexec {quoted} --yourbuddy-component-helper cli \"$@\"\n"
    ))
}

fn write_launch_spec(
    bin_dir: &Path,
    node: &Path,
    cli_entry: &Path,
    dsh_home: &Path,
    path_prepend: &[PathBuf],
) -> Result<(), String> {
    let spec = DshLaunchSpec {
        node: node.display().to_string(),
        cli: cli_entry.display().to_string(),
        dsh_home: dsh_home.display().to_string(),
        path_prepend: path_prepend
            .iter()
            .map(|dir| dir.display().to_string())
            .collect(),
    };
    let raw = serde_json::to_string_pretty(&spec).map_err(|e| e.to_string())?;
    let dest = bin_dir.join(LAUNCH_FILE);
    write_cli_output(&dest, format!("{raw}\n"), false)
}

fn write_pnpm_shim(bin_dir: &Path, node: &Path, pnpm: &Path) -> Result<(), String> {
    let body = pnpm_shim_body(node, pnpm);

    #[cfg(windows)]
    {
        let dest = bin_dir.join("pnpm.cmd");
        write_cli_output(&dest, body, false)?;
    }

    #[cfg(not(windows))]
    {
        let script = bin_dir.join("pnpm");
        write_cli_output(&script, body, true)?;
    }

    Ok(())
}

fn pnpm_shim_body(node: &Path, pnpm: &Path) -> String {
    if let Some(cjs) = find_pnpm_cjs(pnpm) {
        #[cfg(windows)]
        {
            return format!(
                "@echo off\r\n{} {} %*\r\n",
                quote_for_cmd(node),
                quote_for_cmd(&cjs)
            );
        }
        #[cfg(not(windows))]
        {
            return format!(
                "#!/bin/sh\nexec {} {} \"$@\"\n",
                quote_for_cmd(node),
                quote_for_cmd(&cjs)
            );
        }
    }

    #[cfg(windows)]
    {
        if pnpm
            .extension()
            .and_then(|ext| ext.to_str())
            .is_some_and(|ext| ext.eq_ignore_ascii_case("cmd") || ext.eq_ignore_ascii_case("bat"))
        {
            return format!("@echo off\r\ncall {} %*\r\n", quote_for_cmd(pnpm));
        }
        format!("@echo off\r\n{} %*\r\n", quote_for_cmd(pnpm))
    }

    #[cfg(not(windows))]
    {
        format!("#!/bin/sh\nexec {} \"$@\"\n", quote_for_cmd(pnpm))
    }
}

fn find_pnpm_cjs(pnpm: &Path) -> Option<PathBuf> {
    let dir = pnpm.parent()?;
    let candidates = [
        dir.join("node_modules")
            .join("pnpm")
            .join("bin")
            .join("pnpm.cjs"),
        dir.join("lib")
            .join("node_modules")
            .join("pnpm")
            .join("bin")
            .join("pnpm.cjs"),
        dir.join("pnpm").join("bin").join("pnpm.cjs"),
    ];
    candidates.into_iter().find(|path| path.is_file())
}

fn install_dsh_exe(bin_dir: &Path) -> Result<(), String> {
    let Ok(source) = std::env::current_exe() else {
        return Ok(());
    };
    if source
        .file_stem()
        .and_then(|stem| stem.to_str())
        .is_some_and(|stem| stem.eq_ignore_ascii_case("dsh"))
    {
        return Ok(());
    }
    let dest = bin_dir.join("dsh.exe");
    if same_exe(&source, &dest) || !exe_needs_refresh(&source, &dest) {
        return Ok(());
    }
    match fs::remove_file(&dest) {
        Ok(()) => {}
        Err(error) if error.kind() == ErrorKind::NotFound => {}
        Err(error) => {
            boot_log::info(&format!(
                "dsh.exe refresh skipped ({}): {error}",
                dest.display()
            ));
            return Ok(());
        }
    }
    if fs::hard_link(&source, &dest).is_ok() {
        boot_log::info(&format!("dsh.exe hard-linked from {}", source.display()));
        return Ok(());
    }
    fs::copy(&source, &dest).map_err(|e| format!("无法写入 {}: {e}", dest.display()))?;
    boot_log::info(&format!("dsh.exe copied from {}", source.display()));
    Ok(())
}

fn same_exe(left: &Path, right: &Path) -> bool {
    if !left.is_file() || !right.is_file() {
        return false;
    }
    if path_eq(left, right) {
        return true;
    }
    match (fs::canonicalize(left), fs::canonicalize(right)) {
        (Ok(a), Ok(b)) => path_eq(&a, &b),
        _ => false,
    }
}

/// True when `dest` is missing, a different size, or older than `source`.
fn exe_needs_refresh(source: &Path, dest: &Path) -> bool {
    let Ok(src) = fs::metadata(source) else {
        return false;
    };
    let Ok(dst) = fs::metadata(dest) else {
        return true;
    };
    if src.len() != dst.len() {
        return true;
    }
    match (src.modified(), dst.modified()) {
        (Ok(src_mtime), Ok(dst_mtime)) => src_mtime > dst_mtime,
        _ => false,
    }
}

fn companion_tool_dirs() -> Vec<PathBuf> {
    let mut dirs = Vec::new();
    if which_on_host("git").is_none() {
        dirs.extend(existing_tool_dirs(well_known_git_dirs(), "git"));
    }
    if which_on_host("bash").is_none() {
        dirs.extend(existing_tool_dirs(well_known_bash_dirs(), "bash"));
    }
    dirs
}

fn well_known_git_dirs() -> Vec<PathBuf> {
    let mut dirs = Vec::new();
    #[cfg(windows)]
    {
        push_env_join(&mut dirs, "ProgramFiles", &["Git", "cmd"]);
        push_env_join(&mut dirs, "ProgramFiles", &["Git", "bin"]);
        push_env_join(&mut dirs, "ProgramFiles(x86)", &["Git", "cmd"]);
        push_env_join(&mut dirs, "ProgramFiles(x86)", &["Git", "bin"]);
        push_env_join(&mut dirs, "LOCALAPPDATA", &["Programs", "Git", "cmd"]);
        push_env_join(&mut dirs, "LOCALAPPDATA", &["Programs", "Git", "bin"]);
    }
    dirs
}

fn well_known_bash_dirs() -> Vec<PathBuf> {
    let mut dirs = Vec::new();
    #[cfg(windows)]
    {
        push_env_join(&mut dirs, "ProgramFiles", &["Git", "bin"]);
        push_env_join(&mut dirs, "ProgramFiles", &["Git", "usr", "bin"]);
        push_env_join(&mut dirs, "ProgramFiles(x86)", &["Git", "bin"]);
        push_env_join(&mut dirs, "LOCALAPPDATA", &["Programs", "Git", "bin"]);
    }
    dirs
}

fn existing_tool_dirs(candidates: Vec<PathBuf>, name: &str) -> Vec<PathBuf> {
    candidates
        .into_iter()
        .filter(|dir| tool_exists_in(dir, name))
        .collect()
}

fn tool_exists_in(dir: &Path, name: &str) -> bool {
    let mut names = vec![name.to_string()];
    #[cfg(windows)]
    {
        names.push(format!("{name}.exe"));
        names.push(format!("{name}.cmd"));
    }
    names.iter().any(|file| dir.join(file).is_file())
}

fn persist_user_path(bridge: &PathBridge) -> Result<(), String> {
    #[cfg(windows)]
    {
        persist_windows_user_path(&bridge.bin_dir)?;
        persist_windows_user_path_if_missing(bridge.node_dir.as_deref(), &["node"])?;
        persist_windows_user_path_if_missing(bridge.pnpm_dir.as_deref(), &["pnpm"])?;
    }
    #[cfg(not(windows))]
    {
        persist_unix_user_path(&bridge.bin_dir)?;
    }
    Ok(())
}

/// Persist the stable YourBuddy managed-bin directory for future terminal sessions.
pub fn persist_managed_bin_path() -> Result<(), String> {
    let bin_dir = app_data_root()?.join(BIN_DIR_NAME);
    #[cfg(windows)]
    persist_windows_user_path(&bin_dir)?;
    #[cfg(not(windows))]
    persist_unix_user_path(&bin_dir)?;
    Ok(())
}

#[cfg(windows)]
fn persist_windows_user_path_if_missing(dir: Option<&Path>, names: &[&str]) -> Result<(), String> {
    let Some(dir) = dir else {
        return Ok(());
    };
    if names.iter().any(|name| host_has_spawnable(name)) {
        return Ok(());
    }
    persist_windows_user_path(dir)
}

#[cfg(windows)]
fn host_has_spawnable(name: &str) -> bool {
    which_on_host(name)
        .map(|path| is_direct_spawnable_cli(&path))
        .unwrap_or(false)
}

#[cfg(windows)]
fn persist_windows_user_path(dir: &Path) -> Result<(), String> {
    let current = read_windows_user_path()?;
    if path_string_contains(&current, dir) {
        return Ok(());
    }
    let dir_text = dir.display().to_string();
    let next = if current.trim().is_empty() {
        dir_text
    } else {
        format!("{current};{dir_text}")
    };
    write_windows_user_path(&next)?;
    broadcast_environment_change();
    boot_log::info(&format!("user PATH appended {}", dir.display()));
    Ok(())
}

#[cfg(windows)]
fn read_windows_user_path() -> Result<String, String> {
    let env = open_user_environment(false)?;
    match env.get_value::<String, _>("Path") {
        Ok(value) => Ok(value),
        Err(error) if error.kind() == ErrorKind::NotFound => Ok(String::new()),
        Err(error) => Err(format!("无法读取用户 PATH: {error}")),
    }
}

#[cfg(windows)]
fn write_windows_user_path(value: &str) -> Result<(), String> {
    use winreg::enums::RegType::REG_EXPAND_SZ;
    use winreg::types::ToRegValue;
    let env = open_user_environment(true)?;
    let mut raw = value.to_reg_value();
    raw.vtype = REG_EXPAND_SZ;
    env.set_raw_value("Path", &raw)
        .map_err(|e| format!("无法写入用户 PATH: {e}"))
}

#[cfg(windows)]
fn open_user_environment(write: bool) -> Result<winreg::RegKey, String> {
    use winreg::enums::{HKEY_CURRENT_USER, KEY_READ, KEY_WRITE};
    let hkcu = winreg::RegKey::predef(HKEY_CURRENT_USER);
    let flags = if write {
        KEY_READ | KEY_WRITE
    } else {
        KEY_READ
    };
    hkcu.open_subkey_with_flags("Environment", flags)
        .map_err(|e| format!("无法打开 HKCU\\Environment: {e}"))
}

#[cfg(windows)]
fn broadcast_environment_change() {
    use windows::core::w;
    use windows::Win32::Foundation::{LPARAM, WPARAM};
    use windows::Win32::UI::WindowsAndMessaging::{
        SendMessageTimeoutW, HWND_BROADCAST, SMTO_ABORTIFHUNG, WM_SETTINGCHANGE,
    };
    unsafe {
        let _ = SendMessageTimeoutW(
            HWND_BROADCAST,
            WM_SETTINGCHANGE,
            WPARAM(0),
            LPARAM(w!("Environment").as_ptr() as isize),
            SMTO_ABORTIFHUNG,
            5000,
            None,
        );
    }
}

#[cfg(not(windows))]
fn persist_unix_user_path(bin_dir: &Path) -> Result<(), String> {
    let Some(home) = dirs::home_dir() else {
        return Ok(());
    };
    append_profile_path(&home, bin_dir)
}

#[cfg(not(windows))]
fn append_profile_path(home: &Path, local_bin: &Path) -> Result<(), String> {
    let profile = if cfg!(target_os = "macos") {
        home.join(".zprofile")
    } else {
        home.join(".profile")
    };
    let existing = fs::read_to_string(&profile).unwrap_or_default();
    if existing.contains(PROFILE_MARKER) {
        return Ok(());
    }
    let block = format!(
        "\n# {PROFILE_MARKER}\nexport PATH=\"{}:$PATH\"\n",
        local_bin.display()
    );
    fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&profile)
        .and_then(|mut file| {
            use std::io::Write;
            file.write_all(block.as_bytes())
        })
        .map_err(|e| e.to_string())?;
    boot_log::info(&format!("profile PATH appended {}", profile.display()));
    Ok(())
}

#[cfg(not(windows))]
fn set_executable(path: &Path) -> Result<(), String> {
    use std::os::unix::fs::PermissionsExt;
    let mut permissions = fs::metadata(path).map_err(|e| e.to_string())?.permissions();
    permissions.set_mode(0o755);
    fs::set_permissions(path, permissions).map_err(|e| e.to_string())
}

fn quote_for_cmd(path: &Path) -> String {
    let mut text = path.display().to_string();
    #[cfg(windows)]
    {
        text = text.replace('/', "\\");
    }
    if text.contains(' ') || text.contains('&') {
        format!("\"{text}\"")
    } else {
        text
    }
}

fn push_unique_dir(dirs: &mut Vec<PathBuf>, candidate: Option<&Path>) {
    let Some(path) = candidate else {
        return;
    };
    if path.as_os_str().is_empty() || path_list_contains(dirs, path) {
        return;
    }
    dirs.push(path.to_path_buf());
}

fn push_env_join(dirs: &mut Vec<PathBuf>, key: &str, suffix: &[&str]) {
    if let Ok(root) = std::env::var(key) {
        if !root.trim().is_empty() {
            let mut path = PathBuf::from(root);
            for part in suffix {
                path.push(part);
            }
            dirs.push(path);
        }
    }
}

fn path_list_contains(dirs: &[PathBuf], candidate: &Path) -> bool {
    dirs.iter().any(|dir| path_eq(dir, candidate))
}

fn path_string_contains(path: &str, candidate: &Path) -> bool {
    std::env::split_paths(path).any(|dir| path_eq(&dir, candidate))
}

#[cfg(test)]
mod tests {
    use super::{
        exe_needs_refresh, merge_path, path_string_contains, pnpm_shim_body, quote_for_cmd,
        tool_exists_in, user_cli_persistence_enabled, write_cli_shims, write_launch_spec,
    };
    use crate::cli_shim::{read_launch_spec, LAUNCH_FILE};
    use std::fs;
    use std::path::{Path, PathBuf};
    use std::sync::atomic::{AtomicU64, Ordering};
    use std::time::{SystemTime, UNIX_EPOCH};

    static NEXT_DIR: AtomicU64 = AtomicU64::new(0);

    fn temp_root() -> PathBuf {
        let id = NEXT_DIR.fetch_add(1, Ordering::Relaxed);
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(0);
        let root = std::env::temp_dir().join(format!(
            "dsh-desktop-path-{}-{}-{}",
            std::process::id(),
            nanos,
            id
        ));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).unwrap();
        root
    }

    fn dsh_script(bin: &Path) -> PathBuf {
        #[cfg(windows)]
        let name = "dsh.cmd";
        #[cfg(not(windows))]
        let name = "dsh";
        bin.join(name)
    }

    fn pnpm_script(bin: &Path) -> PathBuf {
        #[cfg(windows)]
        let name = "pnpm.cmd";
        #[cfg(not(windows))]
        let name = "pnpm";
        bin.join(name)
    }

    #[test]
    fn prepends_missing_dirs_without_duplicating_existing_path() {
        #[cfg(windows)]
        let first = PathBuf::from("C:\\DeepSeek Harness\\bin");
        #[cfg(windows)]
        let second = PathBuf::from("C:\\DeepSeek Harness\\runtime\\node");
        #[cfg(windows)]
        let system = PathBuf::from("C:\\Windows\\System32");
        #[cfg(not(windows))]
        let first = PathBuf::from("/opt/yourbuddy/bin");
        #[cfg(not(windows))]
        let second = PathBuf::from("/opt/yourbuddy/runtime/node");
        #[cfg(not(windows))]
        let system = PathBuf::from("/usr/bin");
        let existing = std::env::join_paths([&second, &system]).unwrap();
        let merged = merge_path(Some(existing), &[first.clone(), second.clone()]);
        let parts: Vec<PathBuf> = std::env::split_paths(&merged).collect();
        assert_eq!(parts[0], first);
        assert_eq!(
            parts
                .iter()
                .filter(|path| path_string_contains(&merged, path) && **path == second)
                .count(),
            1
        );
    }

    #[test]
    fn user_cli_persistence_is_explicit_opt_in() {
        assert!(!user_cli_persistence_enabled(None));
        assert!(!user_cli_persistence_enabled(Some(std::ffi::OsStr::new(
            "true"
        ))));
        assert!(user_cli_persistence_enabled(Some(std::ffi::OsStr::new(
            "1"
        ))));
    }

    #[test]
    fn writes_spawnable_dsh_and_pnpm_shims() {
        let root = temp_root();
        let bin = root.join("bin");
        fs::create_dir_all(&bin).unwrap();

        let node = root.join("node.exe");
        let cli = root.join("apps").join("cli").join("lib").join("bin.js");
        let pnpm_home = root.join("pnpm-global");
        let pnpm_cjs = pnpm_home
            .join("node_modules")
            .join("pnpm")
            .join("bin")
            .join("pnpm.cjs");
        fs::create_dir_all(pnpm_cjs.parent().unwrap()).unwrap();
        fs::write(&pnpm_cjs, "module.exports = {}\n").unwrap();
        let pnpm = pnpm_home.join("pnpm.cmd");
        let home = root.join("dsh-home");
        write_cli_shims(&bin, &node, &cli, &pnpm, &home, false).unwrap();

        #[cfg(windows)]
        {
            let cmd = fs::read_to_string(bin.join("dsh.cmd")).unwrap();
            assert!(cmd.contains("dsh.exe"));
            assert!(!cmd.contains("bin.js"));
            assert!(cmd.contains("%*"));
            let pnpm_cmd = fs::read_to_string(bin.join("pnpm.cmd")).unwrap();
            assert!(pnpm_cmd.contains("node.exe"));
            assert!(pnpm_cmd.contains("pnpm.cjs"));
            let spec = read_launch_spec(&bin.join(LAUNCH_FILE)).unwrap();
            assert!(spec.cli.contains("bin.js"));
            assert!(spec.dsh_home.contains("dsh-home"));
            let expected_prepend: Vec<String> = [node.parent().unwrap(), pnpm.parent().unwrap()]
                .iter()
                .map(|dir| dir.display().to_string())
                .collect();
            assert_eq!(spec.path_prepend, expected_prepend);
        }
        #[cfg(not(windows))]
        {
            let sh = fs::read_to_string(bin.join("dsh")).unwrap();
            assert!(sh.starts_with("#!/bin/sh"));
            assert!(sh.contains("--yourbuddy-component-helper cli"));
            assert!(!sh.contains("bin.js"));
            let pnpm_sh = fs::read_to_string(bin.join("pnpm")).unwrap();
            assert!(pnpm_sh.contains("pnpm.cjs"));
            let spec = read_launch_spec(&bin.join(LAUNCH_FILE)).unwrap();
            let expected_prepend: Vec<String> = [node.parent().unwrap(), pnpm.parent().unwrap()]
                .iter()
                .map(|dir| dir.display().to_string())
                .collect();
            assert_eq!(spec.path_prepend, expected_prepend);
        }
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn upgrades_only_the_exact_legacy_script_from_its_previous_launch_spec() {
        let root = tempfile::tempdir().unwrap();
        let bin = root.path().join("bin");
        fs::create_dir(&bin).unwrap();
        let old_node = root.path().join("old node").join("node.exe");
        let old_cli = root.path().join("old cli").join("bin.js");
        let old_pnpm = root.path().join("old pnpm").join("pnpm.cmd");
        let home = root.path().join("dsh-home");
        let previous_prepend = vec![
            old_node.parent().unwrap().to_path_buf(),
            old_pnpm.parent().unwrap().to_path_buf(),
        ];
        write_launch_spec(&bin, &old_node, &old_cli, &home, &previous_prepend).unwrap();
        let prepend = std::env::join_paths(&previous_prepend)
            .unwrap()
            .to_string_lossy()
            .into_owned();
        let node = quote_for_cmd(&old_node);
        let cli = quote_for_cmd(&old_cli);
        #[cfg(windows)]
        let legacy = format!("@echo off\r\nset \"PATH={prepend};%PATH%\"\r\n{node} {cli} %*\r\n");
        #[cfg(not(windows))]
        let legacy = format!("#!/bin/sh\nPATH=\"{prepend}:$PATH\"\nexec {node} {cli} \"$@\"\n");
        let script = dsh_script(&bin);
        fs::write(&script, &legacy).unwrap();

        let node = root.path().join("new node").join("node.exe");
        let cli = root.path().join("new cli").join("bin.js");
        let pnpm = root.path().join("new pnpm").join("pnpm.cmd");
        let sidecar = fs::read(bin.join(LAUNCH_FILE)).unwrap();
        let customized = format!("{legacy}# user customization\n");
        fs::write(&script, &customized).unwrap();
        assert!(write_cli_shims(&bin, &node, &cli, &pnpm, &home, false).is_err());
        assert_eq!(fs::read(&script).unwrap(), customized.as_bytes());
        assert_eq!(fs::read(bin.join(LAUNCH_FILE)).unwrap(), sidecar);
        assert!(!pnpm_script(&bin).exists());

        fs::write(&script, &legacy).unwrap();
        write_cli_shims(&bin, &node, &cli, &pnpm, &home, false).unwrap();

        let body = fs::read_to_string(&script).unwrap();
        assert!(body.contains(super::DSH_SHIM_MARKER));
        assert_ne!(body, legacy);
        assert!(!body.contains("old node"));
        let spec = read_launch_spec(&bin.join(LAUNCH_FILE)).unwrap();
        assert_eq!(spec.node, node.display().to_string());
        assert_eq!(spec.cli, cli.display().to_string());
    }

    #[test]
    fn preserves_custom_scripts_and_sidecars_when_refresh_is_refused() {
        let root = tempfile::tempdir().unwrap();
        let bin = root.path().join("bin");
        fs::create_dir(&bin).unwrap();
        let node = root.path().join("node.exe");
        let cli = root.path().join("bin.js");
        let pnpm = root.path().join("pnpm.cmd");
        let home = root.path().join("dsh-home");
        write_cli_shims(&bin, &node, &cli, &pnpm, &home, false).unwrap();
        let sidecar = fs::read(bin.join(LAUNCH_FILE)).unwrap();
        let pnpm_body = fs::read(pnpm_script(&bin)).unwrap();
        let custom = format!("echo custom command\n# {}\n", super::DSH_SHIM_MARKER);
        fs::write(dsh_script(&bin), &custom).unwrap();

        let error = write_cli_shims(
            &bin,
            &root.path().join("replacement-node.exe"),
            &root.path().join("replacement-cli.js"),
            &root.path().join("replacement-pnpm.cmd"),
            &home,
            false,
        )
        .unwrap_err();

        assert!(error.contains("refusing to replace a non-managed CLI"));
        assert_eq!(fs::read(dsh_script(&bin)).unwrap(), custom.as_bytes());
        assert_eq!(fs::read(bin.join(LAUNCH_FILE)).unwrap(), sidecar);
        assert_eq!(fs::read(pnpm_script(&bin)).unwrap(), pnpm_body);
    }

    #[test]
    fn repeatedly_refreshes_a_managed_script_and_its_launch_spec() {
        let root = tempfile::tempdir().unwrap();
        let bin = root.path().join("bin");
        fs::create_dir(&bin).unwrap();
        let home = root.path().join("dsh-home");
        let node = root.path().join("node.exe");
        let cli = root.path().join("bin.js");
        let pnpm = root.path().join("pnpm.cmd");
        write_cli_shims(&bin, &node, &cli, &pnpm, &home, false).unwrap();
        let managed = fs::read(dsh_script(&bin)).unwrap();

        let node = root.path().join("updated node").join("node.exe");
        let cli = root.path().join("updated cli").join("bin.js");
        let pnpm = root.path().join("updated pnpm").join("pnpm.cmd");
        for _ in 0..2 {
            write_cli_shims(&bin, &node, &cli, &pnpm, &home, false).unwrap();
            assert_eq!(fs::read(dsh_script(&bin)).unwrap(), managed);
            let spec = read_launch_spec(&bin.join(LAUNCH_FILE)).unwrap();
            assert_eq!(spec.node, node.display().to_string());
            assert_eq!(spec.cli, cli.display().to_string());
            assert_eq!(
                spec.path_prepend,
                [node.parent().unwrap(), pnpm.parent().unwrap()]
                    .map(|dir| dir.display().to_string())
            );
        }
    }

    #[cfg(unix)]
    #[test]
    fn refuses_to_follow_a_dsh_symlink_even_when_its_target_is_managed() {
        let root = tempfile::tempdir().unwrap();
        let bin = root.path().join("bin");
        fs::create_dir(&bin).unwrap();
        let target = root.path().join("user-command");
        let target_body = format!("#!/bin/sh\n# {}\nexit 0\n", super::DSH_SHIM_MARKER);
        fs::write(&target, &target_body).unwrap();
        let script = dsh_script(&bin);
        std::os::unix::fs::symlink(&target, &script).unwrap();
        let sidecar = b"user-owned sidecar\n";
        fs::write(bin.join(LAUNCH_FILE), sidecar).unwrap();

        let error = write_cli_shims(
            &bin,
            &root.path().join("node"),
            &root.path().join("bin.js"),
            &root.path().join("pnpm"),
            &root.path().join("dsh-home"),
            false,
        )
        .unwrap_err();

        assert!(error.contains("refusing to replace a non-managed CLI"));
        assert!(fs::symlink_metadata(&script)
            .unwrap()
            .file_type()
            .is_symlink());
        assert_eq!(fs::read_link(&script).unwrap(), target);
        assert_eq!(fs::read(&target).unwrap(), target_body.as_bytes());
        assert_eq!(fs::read(bin.join(LAUNCH_FILE)).unwrap(), sidecar);
        assert!(!pnpm_script(&bin).exists());
    }

    #[cfg(unix)]
    #[test]
    fn shell_preserves_quoted_helper_paths_and_arguments_without_expansion() {
        use std::process::{Child, Command, Stdio};
        use std::time::{Duration, Instant};

        struct ShimChild(Child);
        impl Drop for ShimChild {
            fn drop(&mut self) {
                let _ = self.0.kill();
                let _ = self.0.wait();
            }
        }

        let root = tempfile::tempdir().unwrap();
        let helper = root
            .path()
            .join("helper ' \" $(touch helper-dollar) `touch helper-backtick` ; &");
        fs::write(&helper, "#!/bin/sh\nprintf '%s\\000' \"$@\"\n").unwrap();
        super::set_executable(&helper).unwrap();
        let script = root.path().join("dsh");
        super::write_dsh_cmd_shim(root.path(), &helper).unwrap();
        let stdout = root.path().join("stdout");
        let stderr = root.path().join("stderr");
        let args = [
            "",
            "two words",
            "single' and double\" quotes",
            "line one\nline two",
            "$(touch argument-dollar)",
            "`touch argument-backtick`",
            "; touch argument-semicolon; #",
            "*?[$HOME]",
            "中文",
        ];
        let mut child = ShimChild(
            Command::new("/bin/sh")
                .arg(&script)
                .args(args)
                .current_dir(root.path())
                .env_clear()
                .env("PATH", "/usr/bin:/bin")
                .stdin(Stdio::null())
                .stdout(fs::File::create(&stdout).unwrap())
                .stderr(fs::File::create(&stderr).unwrap())
                .spawn()
                .unwrap(),
        );
        let deadline = Instant::now() + Duration::from_secs(30);
        let status = loop {
            if let Some(status) = child.0.try_wait().unwrap() {
                break status;
            }
            assert!(Instant::now() < deadline, "dsh shell fixture timed out");
            std::thread::sleep(Duration::from_millis(10));
        };
        assert!(status.success(), "{}", fs::read_to_string(stderr).unwrap());
        let expected: Vec<u8> = ["--yourbuddy-component-helper", "cli"]
            .into_iter()
            .chain(args)
            .flat_map(|arg| arg.bytes().chain(std::iter::once(0)))
            .collect();
        assert_eq!(fs::read(stdout).unwrap(), expected);
        for name in [
            "helper-dollar",
            "helper-backtick",
            "argument-dollar",
            "argument-backtick",
            "argument-semicolon",
        ] {
            assert!(!root.path().join(name).exists(), "shell expanded {name}");
        }
    }

    #[cfg(unix)]
    #[test]
    fn sidecar_and_pnpm_symlinks_or_nonfiles_never_modify_external_data() {
        for name in [LAUNCH_FILE, "pnpm"] {
            for directory in [false, true] {
                let root = tempfile::tempdir().unwrap();
                let bin = root.path().join("bin");
                fs::create_dir(&bin).unwrap();
                let node = root.path().join("node");
                let cli = root.path().join("bin.js");
                let pnpm = root.path().join("pnpm-source");
                let home = root.path().join("dsh-home");
                write_cli_shims(&bin, &node, &cli, &pnpm, &home, false).unwrap();
                let dsh_before = fs::read(bin.join("dsh")).unwrap();
                let other = if name == LAUNCH_FILE {
                    "pnpm"
                } else {
                    LAUNCH_FILE
                };
                let other_before = fs::read(bin.join(other)).unwrap();
                let external = root.path().join("user-data");
                fs::write(&external, b"preserve user data").unwrap();
                let output = bin.join(name);
                fs::remove_file(&output).unwrap();
                if directory {
                    fs::create_dir(&output).unwrap();
                    fs::write(output.join("sentinel"), b"preserve directory").unwrap();
                } else {
                    std::os::unix::fs::symlink(&external, &output).unwrap();
                }
                assert!(write_cli_shims(&bin, &node, &cli, &pnpm, &home, false).is_err());
                assert_eq!(fs::read(&external).unwrap(), b"preserve user data");
                assert_eq!(fs::read(bin.join("dsh")).unwrap(), dsh_before);
                assert_eq!(fs::read(bin.join(other)).unwrap(), other_before);
                if directory {
                    assert_eq!(
                        fs::read(output.join("sentinel")).unwrap(),
                        b"preserve directory"
                    );
                } else {
                    assert_eq!(fs::read_link(output).unwrap(), external);
                }
                assert_eq!(
                    fs::read_dir(&bin).unwrap().count(),
                    3,
                    "no temporary-file residue"
                );
            }
        }
    }

    #[cfg(unix)]
    #[test]
    fn bin_symlink_is_rejected_without_creating_or_writing_descendants() {
        let root = tempfile::tempdir().unwrap();
        let external = root.path().join("user-directory");
        fs::create_dir(&external).unwrap();
        fs::write(external.join("sentinel"), b"preserve").unwrap();
        let bin = root.path().join("bin");
        std::os::unix::fs::symlink(&external, &bin).unwrap();
        assert!(write_cli_shims(
            &bin,
            Path::new("node"),
            Path::new("cli"),
            Path::new("pnpm"),
            Path::new("home"),
            false
        )
        .is_err());
        assert_eq!(fs::read(external.join("sentinel")).unwrap(), b"preserve");
        assert_eq!(fs::read_dir(&external).unwrap().count(), 1);
        assert_eq!(fs::read_link(bin).unwrap(), external);
    }

    #[test]
    fn atomic_output_replacement_preserves_an_existing_hardlink_target() {
        let root = tempfile::tempdir().unwrap();
        let external = root.path().join("user-data");
        let output = root.path().join("managed-output");
        fs::write(&external, b"preserve user data").unwrap();
        fs::hard_link(&external, &output).unwrap();
        super::write_cli_output(&output, b"new managed content", false).unwrap();
        assert_eq!(fs::read(&external).unwrap(), b"preserve user data");
        assert_eq!(fs::read(&output).unwrap(), b"new managed content");
        assert_eq!(
            fs::read_dir(root.path()).unwrap().count(),
            2,
            "temporary output must be consumed"
        );
    }

    #[test]
    fn pnpm_shim_falls_back_to_calling_a_cmd_when_cjs_is_missing() {
        let body = pnpm_shim_body(
            Path::new(r"C:\Program Files\nodejs\node.exe"),
            Path::new(r"C:\Users\me\AppData\Roaming\npm\pnpm.cmd"),
        );
        #[cfg(windows)]
        {
            assert!(body.contains("call"));
            assert!(body.contains("pnpm.cmd"));
        }
        #[cfg(not(windows))]
        {
            assert!(body.contains("exec"));
            assert!(body.contains("pnpm.cmd"));
        }
    }

    #[test]
    fn quotes_paths_that_contain_spaces() {
        assert_eq!(
            quote_for_cmd(Path::new(r"C:\Program Files\nodejs\node.exe")),
            r#""C:\Program Files\nodejs\node.exe""#
        );
    }

    #[test]
    fn detects_a_tool_only_when_the_file_exists() {
        let root = temp_root();
        #[cfg(windows)]
        fs::write(root.join("git.exe"), "").unwrap();
        #[cfg(not(windows))]
        fs::write(root.join("git"), "").unwrap();
        assert!(tool_exists_in(&root, "git"));
        assert!(!tool_exists_in(&root, "bash"));
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn skips_exe_refresh_when_dest_matches_size_and_is_not_older() {
        let root = temp_root();
        let source = root.join("dsh-desktop.exe");
        let dest = root.join("dsh.exe");
        fs::write(&source, b"desktop-binary").unwrap();
        fs::copy(&source, &dest).unwrap();
        assert!(!exe_needs_refresh(&source, &dest));
        fs::write(&dest, b"stale").unwrap();
        assert!(exe_needs_refresh(&source, &dest));
        let _ = fs::remove_dir_all(&root);
    }
}
