//! Capture one interactive login-shell environment before desktop runtime discovery.

use std::collections::HashMap;
use std::ffi::{OsStr, OsString};
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::OnceLock;
use std::time::{Duration, Instant};

use serde::Serialize;

use crate::desktop_settings::{self, ShellEnvironmentMode, ShellEnvironmentSettings};

#[cfg(unix)]
use std::os::unix::ffi::{OsStrExt, OsStringExt};
#[cfg(unix)]
use std::os::unix::fs::{MetadataExt, OpenOptionsExt};
#[cfg(unix)]
use std::os::unix::process::CommandExt;

const EMITTER_ARGUMENT: &str = "--yourbuddy-emit-environment";
const CAPTURE_TIMEOUT: Duration = Duration::from_secs(8);
const WAIT_INTERVAL: Duration = Duration::from_millis(10);
const MAX_CAPTURE_BYTES: u64 = 2 * 1024 * 1024;
const MAX_CAPTURE_ENTRIES: usize = 8_192;
const BOOKKEEPING_NAMES: [&str; 10] = [
    "PWD", "OLDPWD", "SHLVL", "_", "PS1", "PS2", "PS4", "PROMPT", "PROMPT2", "RPS1",
];
const NETWORK_NAMES: [&str; 11] = [
    "HTTP_PROXY",
    "HTTPS_PROXY",
    "ALL_PROXY",
    "NO_PROXY",
    "http_proxy",
    "https_proxy",
    "all_proxy",
    "no_proxy",
    "NODE_USE_ENV_PROXY",
    "NODE_OPTIONS",
    "NODE_EXTRA_CA_CERTS",
];

/// Result category for the login-shell capture used by diagnostics and settings.
#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum ShellEnvironmentState {
    Ready,
    DesktopOnly,
    TimedOut,
    Failed,
}

/// Browser-safe metadata for the environment selected at application startup.
#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ShellEnvironmentStatus {
    pub state: ShellEnvironmentState,
    pub source: &'static str,
    pub shell_path: String,
    pub duration_ms: u64,
    pub variable_count: usize,
    pub path_entry_count: usize,
    pub error_code: String,
}

#[derive(Clone, Debug)]
struct CapturedEnvironment {
    values: HashMap<OsString, OsString>,
    status: ShellEnvironmentStatus,
}

static STARTUP_ENVIRONMENT: OnceLock<CapturedEnvironment> = OnceLock::new();
static STARTUP_SETTINGS: OnceLock<ShellEnvironmentSettings> = OnceLock::new();

/// Credential-free availability result for one common external executable.
#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ShellToolStatus {
    pub name: &'static str,
    pub available: bool,
}

/// Settings snapshot returned to the first-party General settings row.
#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ShellEnvironmentSnapshot {
    pub settings: ShellEnvironmentSettings,
    pub status: ShellEnvironmentStatus,
    pub restart_required: bool,
    pub overridden_names: Vec<&'static str>,
    pub tools: Vec<ShellToolStatus>,
}

/// Run the internal emitter before any Tauri initialization.
pub fn run_emitter_if_requested() -> Option<i32> {
    let mut args = std::env::args_os().skip(1);
    if args.next().as_deref() != Some(OsStr::new(EMITTER_ARGUMENT)) {
        return None;
    }
    let Some(path) = args.next() else {
        return Some(2);
    };
    if args.next().is_some() {
        return Some(2);
    }
    Some(match emit_environment(Path::new(&path)) {
        Ok(()) => 0,
        Err(_) => 1,
    })
}

/// Capture and apply the selected startup environment exactly once.
pub fn initialize(settings: &ShellEnvironmentSettings) -> ShellEnvironmentStatus {
    let captured = match settings.mode {
        ShellEnvironmentMode::DesktopOnly => desktop_only_status(),
        ShellEnvironmentMode::Inherit => capture_selected_shell(settings),
    };
    if captured.status.state == ShellEnvironmentState::Ready {
        apply_environment(&captured.values);
    }
    let status = captured.status.clone();
    let _ = STARTUP_ENVIRONMENT.set(captured);
    let _ = STARTUP_SETTINGS.set(settings.clone());
    status
}

/// Return the startup capture metadata without exposing environment values.
pub fn status() -> ShellEnvironmentStatus {
    STARTUP_ENVIRONMENT
        .get()
        .map(|captured| captured.status.clone())
        .unwrap_or_else(desktop_only_status_value)
}

/// Read one captured value for an application-owned resolver.
pub fn captured_var_os(name: &str) -> Option<OsString> {
    STARTUP_ENVIRONMENT
        .get()
        .and_then(|captured| captured.values.get(OsStr::new(name)).cloned())
}

/// Return persisted selection and redacted state for the settings Client.
pub fn snapshot() -> ShellEnvironmentSnapshot {
    let settings = desktop_settings::load().shell_environment;
    snapshot_for(settings, status(), None)
}

/// Run an isolated login-shell preview without mutating the current process.
pub fn preview(settings: &ShellEnvironmentSettings) -> ShellEnvironmentSnapshot {
    let captured = match settings.mode {
        ShellEnvironmentMode::DesktopOnly => desktop_only_status(),
        ShellEnvironmentMode::Inherit => capture_selected_shell(settings),
    };
    let values =
        (captured.status.state == ShellEnvironmentState::Ready).then_some(&captured.values);
    snapshot_for(settings.clone(), captured.status, values)
}

/// Persist the next-start selection and return its restart state.
pub fn save(settings: ShellEnvironmentSettings) -> Result<ShellEnvironmentSnapshot, String> {
    validate_settings(&settings)?;
    let mut desktop = desktop_settings::load();
    desktop.shell_environment = settings;
    desktop_settings::save(&desktop)?;
    Ok(snapshot())
}

fn snapshot_for(
    settings: ShellEnvironmentSettings,
    status: ShellEnvironmentStatus,
    preview_values: Option<&HashMap<OsString, OsString>>,
) -> ShellEnvironmentSnapshot {
    let restart_required = STARTUP_SETTINGS
        .get()
        .is_some_and(|startup| startup != &settings);
    let tools = ["git", "python3", "ffmpeg", "ffprobe"]
        .into_iter()
        .map(|name| ShellToolStatus {
            name,
            available: preview_values.map_or_else(
                || crate::runtime::env_path::which_on_host(name).is_some(),
                |values| tool_available_on_path(values, name),
            ),
        })
        .collect();
    ShellEnvironmentSnapshot {
        settings,
        status,
        restart_required,
        overridden_names: vec![
            "DSH_HOME",
            "NODE_ENV",
            "NODE_OPTIONS",
            "PATH",
            "proxy and CA",
            "YOURBUDDY_*",
        ],
        tools,
    }
}

fn tool_available_on_path(values: &HashMap<OsString, OsString>, name: &str) -> bool {
    let Some(path) = values.get(OsStr::new("PATH")) else {
        return false;
    };
    std::env::split_paths(path).any(|directory| executable_file(&directory.join(name)))
}

fn executable_file(path: &Path) -> bool {
    let Ok(metadata) = path.metadata() else {
        return false;
    };
    if !metadata.is_file() {
        return false;
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        metadata.permissions().mode() & 0o111 != 0
    }
    #[cfg(not(unix))]
    {
        true
    }
}

fn validate_settings(settings: &ShellEnvironmentSettings) -> Result<(), String> {
    if let Some(path) = settings.shell_path.as_deref() {
        if !path.is_absolute() || !path.is_file() {
            return Err("shell-environment-override-invalid".into());
        }
    }
    Ok(())
}

fn desktop_only_status() -> CapturedEnvironment {
    CapturedEnvironment {
        values: HashMap::new(),
        status: desktop_only_status_value(),
    }
}

fn desktop_only_status_value() -> ShellEnvironmentStatus {
    ShellEnvironmentStatus {
        state: ShellEnvironmentState::DesktopOnly,
        source: "desktop",
        shell_path: String::new(),
        duration_ms: 0,
        variable_count: 0,
        path_entry_count: current_path_entry_count(),
        error_code: String::new(),
    }
}

fn capture_selected_shell(settings: &ShellEnvironmentSettings) -> CapturedEnvironment {
    #[cfg(target_os = "macos")]
    {
        let started = Instant::now();
        let shell = match resolve_login_shell(settings.shell_path.as_deref()) {
            Ok(shell) => shell,
            Err(error_code) => {
                return failed_capture(
                    Path::new(""),
                    started,
                    ShellEnvironmentState::Failed,
                    error_code,
                )
            }
        };
        return match capture_shell(&shell, CAPTURE_TIMEOUT) {
            Ok(values) => {
                let path_entry_count = values
                    .get(OsStr::new("PATH"))
                    .map(|value| std::env::split_paths(value).count())
                    .unwrap_or(0);
                CapturedEnvironment {
                    status: ShellEnvironmentStatus {
                        state: ShellEnvironmentState::Ready,
                        source: "loginShell",
                        shell_path: shell.to_string_lossy().into_owned(),
                        duration_ms: elapsed_ms(started),
                        variable_count: values.len(),
                        path_entry_count,
                        error_code: String::new(),
                    },
                    values,
                }
            }
            Err(CaptureError::TimedOut) => failed_capture(
                &shell,
                started,
                ShellEnvironmentState::TimedOut,
                "shell-environment-timeout",
            ),
            Err(error) => {
                failed_capture(&shell, started, ShellEnvironmentState::Failed, error.code())
            }
        };
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = settings;
        desktop_only_status()
    }
}

#[cfg(target_os = "macos")]
fn failed_capture(
    shell: &Path,
    started: Instant,
    state: ShellEnvironmentState,
    error_code: impl Into<String>,
) -> CapturedEnvironment {
    CapturedEnvironment {
        values: HashMap::new(),
        status: ShellEnvironmentStatus {
            state,
            source: "desktop",
            shell_path: shell.to_string_lossy().into_owned(),
            duration_ms: elapsed_ms(started),
            variable_count: 0,
            path_entry_count: current_path_entry_count(),
            error_code: error_code.into(),
        },
    }
}

fn current_path_entry_count() -> usize {
    std::env::var_os("PATH")
        .map(|value| std::env::split_paths(&value).count())
        .unwrap_or(0)
}

fn elapsed_ms(started: Instant) -> u64 {
    started.elapsed().as_millis().try_into().unwrap_or(u64::MAX)
}

#[cfg(unix)]
fn resolve_login_shell(override_path: Option<&Path>) -> Result<PathBuf, &'static str> {
    if let Some(path) = override_path {
        return valid_shell(path)
            .then(|| path.to_path_buf())
            .ok_or("shell-environment-override-invalid");
    }
    account_login_shell()
        .filter(|path| valid_shell(path))
        .or_else(|| valid_shell(Path::new("/bin/zsh")).then(|| PathBuf::from("/bin/zsh")))
        .ok_or("shell-environment-shell-unavailable")
}

#[cfg(unix)]
fn valid_shell(path: &Path) -> bool {
    path.is_absolute() && path.is_file()
}

#[cfg(unix)]
fn account_login_shell() -> Option<PathBuf> {
    let uid = unsafe { libc::getuid() };
    let buffer_len = unsafe { libc::sysconf(libc::_SC_GETPW_R_SIZE_MAX) };
    let buffer_len = if buffer_len <= 0 {
        16 * 1024
    } else {
        usize::try_from(buffer_len).ok()?
    };
    let mut buffer = vec![0_u8; buffer_len];
    let mut record = std::mem::MaybeUninit::<libc::passwd>::uninit();
    let mut result = std::ptr::null_mut();
    let status = unsafe {
        libc::getpwuid_r(
            uid,
            record.as_mut_ptr(),
            buffer.as_mut_ptr().cast(),
            buffer.len(),
            &mut result,
        )
    };
    if status != 0 || result.is_null() {
        return None;
    }
    let record = unsafe { record.assume_init() };
    if record.pw_shell.is_null() {
        return None;
    }
    let bytes = unsafe { std::ffi::CStr::from_ptr(record.pw_shell) }.to_bytes();
    (!bytes.is_empty()).then(|| PathBuf::from(OsString::from_vec(bytes.to_vec())))
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum CaptureError {
    CurrentExecutable,
    TemporaryDirectory,
    OutputFile,
    Spawn,
    TimedOut,
    Exit,
    Oversized,
    Read,
    Malformed,
}

impl CaptureError {
    fn code(self) -> &'static str {
        match self {
            Self::CurrentExecutable => "shell-environment-executable-unavailable",
            Self::TemporaryDirectory => "shell-environment-temp-unavailable",
            Self::OutputFile => "shell-environment-output-unavailable",
            Self::Spawn => "shell-environment-spawn-failed",
            Self::TimedOut => "shell-environment-timeout",
            Self::Exit => "shell-environment-exit-failed",
            Self::Oversized => "shell-environment-output-too-large",
            Self::Read => "shell-environment-output-unreadable",
            Self::Malformed => "shell-environment-output-invalid",
        }
    }
}

#[cfg(unix)]
fn capture_shell(
    shell: &Path,
    timeout: Duration,
) -> Result<HashMap<OsString, OsString>, CaptureError> {
    let executable = std::env::current_exe().map_err(|_| CaptureError::CurrentExecutable)?;
    let directory = tempfile::Builder::new()
        .prefix("yourbuddy-shell-environment-")
        .tempdir()
        .map_err(|_| CaptureError::TemporaryDirectory)?;
    let output_path = directory.path().join("environment.bin");
    OpenOptions::new()
        .write(true)
        .create_new(true)
        .mode(0o600)
        .open(&output_path)
        .map_err(|_| CaptureError::OutputFile)?;

    let mut command = shell_command(shell, &executable, &output_path);
    command
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    unsafe {
        command.pre_exec(|| {
            if libc::setpgid(0, 0) == 0 {
                Ok(())
            } else {
                Err(std::io::Error::last_os_error())
            }
        });
    }
    let mut child = command.spawn().map_err(|_| CaptureError::Spawn)?;
    let started = Instant::now();
    let status = loop {
        match child.try_wait() {
            Ok(Some(status)) => break status,
            Ok(None) if started.elapsed() < timeout => std::thread::sleep(WAIT_INTERVAL),
            Ok(None) => {
                terminate_and_wait(&mut child);
                return Err(CaptureError::TimedOut);
            }
            Err(_) => {
                terminate_and_wait(&mut child);
                return Err(CaptureError::Exit);
            }
        }
    };
    if !status.success() {
        return Err(CaptureError::Exit);
    }
    let metadata = fs::metadata(&output_path).map_err(|_| CaptureError::Read)?;
    if metadata.len() > MAX_CAPTURE_BYTES {
        return Err(CaptureError::Oversized);
    }
    let bytes = fs::read(&output_path).map_err(|_| CaptureError::Read)?;
    parse_environment(&bytes)
}

#[cfg(unix)]
fn terminate_and_wait(child: &mut std::process::Child) {
    unsafe {
        libc::kill(-(child.id() as i32), libc::SIGKILL);
    }
    let _ = child.kill();
    let _ = child.wait();
}

#[cfg(unix)]
fn shell_command(shell: &Path, executable: &Path, output_path: &Path) -> Command {
    let mut command = Command::new(shell);
    let is_fish = shell
        .file_name()
        .and_then(OsStr::to_str)
        .is_some_and(|name| name.eq_ignore_ascii_case("fish"));
    if is_fish {
        command.args([
            OsString::from("-l"),
            OsString::from("-i"),
            OsString::from("-c"),
            OsString::from("exec $argv[1] --yourbuddy-emit-environment $argv[2]"),
            executable.as_os_str().to_owned(),
            output_path.as_os_str().to_owned(),
        ]);
    } else {
        command.args([
            OsString::from("-l"),
            OsString::from("-i"),
            OsString::from("-c"),
            OsString::from("exec \"$1\" --yourbuddy-emit-environment \"$2\""),
            OsString::from("yourbuddy-shell-capture"),
            executable.as_os_str().to_owned(),
            output_path.as_os_str().to_owned(),
        ]);
    }
    command
}

#[cfg(unix)]
fn emit_environment(path: &Path) -> Result<(), ()> {
    let before = fs::symlink_metadata(path).map_err(|_| ())?;
    if !before.file_type().is_file()
        || before.uid() != unsafe { libc::getuid() }
        || before.nlink() != 1
        || before.mode() & 0o077 != 0
    {
        return Err(());
    }
    let parent = path.parent().ok_or(())?;
    let parent_metadata = fs::metadata(parent).map_err(|_| ())?;
    if !parent_metadata.is_dir()
        || parent_metadata.uid() != unsafe { libc::getuid() }
        || parent_metadata.mode() & 0o077 != 0
    {
        return Err(());
    }
    let mut file = OpenOptions::new()
        .write(true)
        .truncate(true)
        .custom_flags(libc::O_NOFOLLOW)
        .open(path)
        .map_err(|_| ())?;
    let after = file.metadata().map_err(|_| ())?;
    if after.dev() != before.dev() || after.ino() != before.ino() {
        return Err(());
    }
    let mut written = 0_u64;
    for (key, value) in std::env::vars_os() {
        let required = key.as_bytes().len() + value.as_bytes().len() + 2;
        written = written.checked_add(required as u64).ok_or(())?;
        if written > MAX_CAPTURE_BYTES {
            return Err(());
        }
        file.write_all(key.as_bytes()).map_err(|_| ())?;
        file.write_all(b"=").map_err(|_| ())?;
        file.write_all(value.as_bytes()).map_err(|_| ())?;
        file.write_all(&[0]).map_err(|_| ())?;
    }
    file.flush().map_err(|_| ())
}

#[cfg(not(unix))]
fn emit_environment(_path: &Path) -> Result<(), ()> {
    Err(())
}

#[cfg(unix)]
fn parse_environment(bytes: &[u8]) -> Result<HashMap<OsString, OsString>, CaptureError> {
    if bytes.len() as u64 > MAX_CAPTURE_BYTES {
        return Err(CaptureError::Oversized);
    }
    if !bytes.is_empty() && bytes.last() != Some(&0) {
        return Err(CaptureError::Malformed);
    }
    let mut values = HashMap::new();
    for entry in bytes
        .split(|byte| *byte == 0)
        .filter(|entry| !entry.is_empty())
    {
        if values.len() >= MAX_CAPTURE_ENTRIES {
            return Err(CaptureError::Oversized);
        }
        let separator = entry
            .iter()
            .position(|byte| *byte == b'=')
            .ok_or(CaptureError::Malformed)?;
        if separator == 0 {
            return Err(CaptureError::Malformed);
        }
        let key = OsString::from_vec(entry[..separator].to_vec());
        let value = OsString::from_vec(entry[separator + 1..].to_vec());
        values.insert(key, value);
    }
    Ok(values)
}

fn apply_environment(values: &HashMap<OsString, OsString>) {
    for (key, value) in values {
        if !application_owned(key) && !bookkeeping(key) {
            std::env::set_var(key, value);
        }
    }
    for name in BOOKKEEPING_NAMES {
        std::env::remove_var(name);
    }
}

fn bookkeeping(name: &OsStr) -> bool {
    BOOKKEEPING_NAMES
        .iter()
        .any(|candidate| name == OsStr::new(candidate))
}

fn application_owned(name: &OsStr) -> bool {
    if name == OsStr::new("DSH_HOME")
        || name == OsStr::new("NODE_ENV")
        || NETWORK_NAMES
            .iter()
            .any(|candidate| name == OsStr::new(candidate))
    {
        return true;
    }
    name.to_str()
        .is_some_and(|value| value.starts_with("YOURBUDDY_") || value.starts_with("DSH_DESKTOP_"))
}

#[cfg(test)]
mod tests {
    use super::{application_owned, bookkeeping, tool_available_on_path};
    #[cfg(unix)]
    use super::{parse_environment, resolve_login_shell, shell_command, CaptureError};
    use std::ffi::OsStr;
    #[cfg(unix)]
    use std::path::Path;

    #[cfg(unix)]
    #[test]
    fn parses_nul_entries_without_utf8_or_line_assumptions() {
        use std::os::unix::ffi::OsStrExt;

        let values =
            parse_environment(b"PATH=/a:/b\0WITH_EQUALS=a=b\0WITH_LINE=x\ny\0BAD_UTF8=\xff\0")
                .unwrap();
        assert_eq!(values.get(OsStr::new("WITH_EQUALS")), Some(&"a=b".into()));
        assert_eq!(values.get(OsStr::new("WITH_LINE")), Some(&"x\ny".into()));
        assert_eq!(
            values.get(OsStr::new("BAD_UTF8")).unwrap().as_bytes(),
            b"\xff"
        );
    }

    #[cfg(unix)]
    #[test]
    fn rejects_malformed_entries() {
        assert_eq!(
            parse_environment(b"PATH=/bin\0missing-separator\0"),
            Err(CaptureError::Malformed)
        );
        assert_eq!(
            parse_environment(b"PATH=/bin"),
            Err(CaptureError::Malformed)
        );
    }

    #[cfg(unix)]
    #[test]
    fn preview_tool_lookup_uses_the_captured_path() {
        use std::collections::HashMap;
        use std::fs;
        use std::os::unix::fs::PermissionsExt;

        let directory = tempfile::tempdir().unwrap();
        let executable = directory.path().join("ffmpeg");
        fs::write(&executable, "#!/bin/sh\n").unwrap();
        fs::set_permissions(&executable, fs::Permissions::from_mode(0o700)).unwrap();
        let values = HashMap::from([("PATH".into(), directory.path().as_os_str().to_os_string())]);
        assert!(tool_available_on_path(&values, "ffmpeg"));
        assert!(!tool_available_on_path(&values, "git"));
    }

    #[cfg(unix)]
    #[test]
    fn fixed_shell_command_passes_paths_as_arguments() {
        let command = shell_command(
            Path::new("/bin/zsh"),
            Path::new("/Applications/Your Buddy.app/Contents/MacOS/YourBuddy"),
            Path::new("/tmp/private directory/environment.bin"),
        );
        let args: Vec<_> = command.get_args().collect();
        assert_eq!(args[0], "-l");
        assert_eq!(args[1], "-i");
        assert_eq!(args[4], "yourbuddy-shell-capture");
        assert_eq!(
            args[5],
            "/Applications/Your Buddy.app/Contents/MacOS/YourBuddy"
        );
        assert_eq!(args[6], "/tmp/private directory/environment.bin");
    }

    #[cfg(unix)]
    #[test]
    fn invalid_explicit_shell_does_not_silently_change_selection() {
        assert_eq!(
            resolve_login_shell(Some(Path::new("relative/zsh"))),
            Err("shell-environment-override-invalid")
        );
    }

    #[test]
    fn excludes_application_owned_and_shell_bookkeeping_names() {
        for name in [
            "DSH_HOME",
            "NODE_ENV",
            "NODE_OPTIONS",
            "HTTPS_PROXY",
            "NODE_EXTRA_CA_CERTS",
            "YOURBUDDY_BIN_DIR",
            "DSH_DESKTOP_NOTIFY_URL",
        ] {
            assert!(application_owned(OsStr::new(name)), "{name}");
        }
        assert!(!application_owned(OsStr::new("GITHUB_TOKEN")));
        assert!(bookkeeping(OsStr::new("PWD")));
        assert!(!bookkeeping(OsStr::new("HOME")));
    }
}
