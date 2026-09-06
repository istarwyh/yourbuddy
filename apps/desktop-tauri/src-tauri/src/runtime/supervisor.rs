use std::ffi::OsString;
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::mpsc::{self, TryRecvError};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use reqwest::header::{HeaderMap, LOCATION, SET_COOKIE};
use reqwest::{redirect, StatusCode};
use url::Url;

use super::app_data_root;
use super::boot_log;
use super::config::DEFAULT_WEB_PORT;
use super::process::{
    hide_console, isolate_host_group, kill_process_tree, reclaim_stale_host, write_host_pid,
};
use super::provision::RuntimePaths;
use super::wsl::{build_wsl_web_command, WslLaunchSpec, WslRunner, WslRuntimePaths};
use crate::i18n::{self, Msg};
use crate::network_proxy::{apply_to_command, ResolvedNetworkProxy};

/// Maximum broken plugins one boot disables before giving up on the Host.
const MAX_PLUGIN_RESCUES: usize = 4;
/// Bound for reading the Linux pid handshake from WSL stderr.
const WSL_PID_HANDSHAKE_TIMEOUT: Duration = Duration::from_secs(30);

/// Linux Host identity inside a WSL distro (pid discovered via stderr handshake).
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct WslSession {
    pub distro: String,
    pub linux_pid: u32,
}

/// Running `dsh web` child, bound port, clean root URL, and authenticated launch URL.
pub struct HostHandle {
    /// Selected loopback port owned by this Host process.
    pub port: u16,
    /// Credential-free root URL used for origin checks and diagnostics.
    pub web_url: String,
    /// Process-token URL used only for the WebView's first navigation.
    pub launch_url: String,
    /// Plugin entry ids whose load failure was bypassed through a rescue
    /// `--patch` this session; empty when the Host started clean.
    pub disabled_plugins: Vec<String>,
    /// Set when the Host runs inside WSL; `None` for the Windows `node.exe` path.
    /// Cleared on the first successful `stop` so Drop does not wait again.
    pub wsl: Mutex<Option<WslSession>>,
    child: Arc<Mutex<Option<Child>>>,
    #[cfg(windows)]
    job: Mutex<Option<super::process::KillOnCloseJob>>,
}

impl HostHandle {
    /// Stop the Host Node tree. Safe to call more than once, including before
    /// `app.exit` / `app.restart`, which do not run `Drop`.
    pub fn stop(&self) {
        let session = self.wsl.lock().ok().and_then(|mut guard| guard.take());
        if let Some(session) = session {
            stop_wsl_linux_host(&session);
        }
        if let Ok(mut guard) = self.child.lock() {
            if let Some(mut child) = guard.take() {
                kill_process_tree(child.id());
                let _ = child.kill();
                let _ = child.wait();
            }
        }
        #[cfg(windows)]
        if let Ok(mut job) = self.job.lock() {
            job.take();
        }
        let _ = std::fs::remove_file(host_pid_path());
    }
}

impl Drop for HostHandle {
    fn drop(&mut self) {
        self.stop();
    }
}

/// Extra Host flags the desktop shell injects without editing Harness packages.
pub struct HostOverlay {
    pub patch_file: std::path::PathBuf,
    pub notify_url: String,
}

/// Spawn `dsh web --no-open --host 127.0.0.1 --port <port>` and wait for its
/// authenticated readiness URL plus a reachable token exchange.
/// A Host that dies naming a loader entry (`failed to apply loader entry <id>`)
/// is respawned with that plugin disabled through a rescue `--patch` overlay,
/// so one broken community plugin cannot keep the desktop closed; the disable
/// lasts only this boot, so a fixed or updated plugin loads again on restart.
pub async fn spawn_web_host(
    paths: &RuntimePaths,
    overlay: Option<&HostOverlay>,
    host_path: &str,
    network_proxy: &ResolvedNetworkProxy,
) -> Result<HostHandle, String> {
    if !paths.cli_entry.is_file() {
        return Err(format!(
            "harness CLI 缺失: {} — 请确认安装包内已包含 apps/cli/lib",
            paths.cli_entry.display()
        ));
    }

    reclaim_stale_host(&host_pid_path());
    let port = pick_port(DEFAULT_WEB_PORT)?;
    let web_url = format!("http://127.0.0.1:{port}/");
    let mut disabled_plugins: Vec<String> = Vec::new();
    let mut last_error = String::new();

    for _ in 0..=MAX_PLUGIN_RESCUES {
        let rescue_patch = (!disabled_plugins.is_empty())
            .then(|| write_rescue_patch(&disabled_plugins))
            .transpose()?;
        boot_log::info(&format!(
            "spawning dsh web node={} cli={} port={port} rescue={}",
            paths.node_binary.display(),
            paths.cli_entry.display(),
            if disabled_plugins.is_empty() {
                "none".to_string()
            } else {
                disabled_plugins.join(",")
            }
        ));
        let child = spawn_child(
            paths,
            port,
            overlay,
            host_path,
            rescue_patch.as_deref(),
            network_proxy,
        )?;
        let pid = child.id();
        #[cfg(windows)]
        let job = attach_host_job(&child);
        if let Err(error) = write_host_pid(&host_pid_path(), pid, &paths.node_binary) {
            boot_log::info(&format!("host pid file skipped: {error}"));
        }
        let child_handle = Arc::new(Mutex::new(Some(child)));

        let stderr_lines: Arc<Mutex<Vec<String>>> = Arc::new(Mutex::new(Vec::new()));
        if let Some(stderr) = child_handle
            .lock()
            .map_err(|e| e.to_string())?
            .as_mut()
            .and_then(|c| c.stderr.take())
        {
            let lines = Arc::clone(&stderr_lines);
            std::thread::spawn(move || drain_lines(stderr, lines));
        }

        let stdout = child_handle
            .lock()
            .map_err(|e| e.to_string())?
            .as_mut()
            .and_then(|c| c.stdout.take())
            .ok_or_else(|| "dsh web stdout 不可用".to_string());
        let stdout = match stdout {
            Ok(stdout) => stdout,
            Err(error) => {
                reap_child_handle(&child_handle);
                let _ = std::fs::remove_file(host_pid_path());
                return Err(error);
            }
        };
        let ready_urls = drain_stdout_for_ready_url(stdout, port);

        let launch_url = match wait_for_host_ready(
            &web_url,
            ready_urls,
            &child_handle,
            &stderr_lines,
            Duration::from_secs(120),
            None,
        )
        .await
        {
            Ok(url) => url,
            Err(error) => {
                reap_child_handle(&child_handle);
                let _ = std::fs::remove_file(host_pid_path());
                last_error = error.clone();
                match failing_loader_entry(&error).filter(|entry| !disabled_plugins.contains(entry))
                {
                    Some(entry) => {
                        boot_log::error(&format!(
                            "plugin {entry} failed to load; retrying with it disabled"
                        ));
                        disabled_plugins.push(entry);
                        continue;
                    }
                    None => return Err(error),
                }
            }
        };
        boot_log::info(&format!("authenticated readiness passed url={web_url}"));

        return Ok(HostHandle {
            port,
            web_url,
            launch_url,
            disabled_plugins,
            wsl: Mutex::new(None),
            child: child_handle,
            #[cfg(windows)]
            job: Mutex::new(job),
        });
    }
    Err(last_error)
}

/// Spawn `dsh web` as a Linux Node process inside WSL and wait for its
/// authenticated readiness URL plus the Windows-visible token exchange.
///
/// `runner` is reserved for callers that already hold a `WslRunner`; the long-lived
/// Host is spawned via `wsl.exe` directly so stdout/stderr stay piped.
pub async fn spawn_wsl_web_host(
    paths: &WslRuntimePaths,
    overlay: Option<&HostOverlay>,
    _runner: &dyn WslRunner,
    network_proxy: &ResolvedNetworkProxy,
) -> Result<HostHandle, String> {
    reclaim_stale_host(&host_pid_path());
    let port = pick_port(DEFAULT_WEB_PORT)?;
    let web_url = format!("http://127.0.0.1:{port}/");

    let spec = WslLaunchSpec {
        distro: paths.distro.clone(),
        linux_node: paths.linux_node.clone(),
        linux_cli: paths.linux_cli.clone(),
        linux_harness_root: paths.linux_harness_root.clone(),
        linux_dsh_home: paths.linux_dsh_home.clone(),
        linux_path: paths.linux_path.clone(),
        linux_patch: paths.linux_patch.clone(),
        notify_url: overlay.map(|o| o.notify_url.clone()),
        port,
        host: "127.0.0.1".into(),
    };

    boot_log::info(&format!(
        "spawning wsl dsh web distro={} node={} cli={} port={port}",
        paths.distro, paths.linux_node, paths.linux_cli
    ));

    let command = build_wsl_web_command(&spec, network_proxy)?;
    let mut child = spawn_wsl_child(&command)?;
    let stub_pid = child.id();
    #[cfg(windows)]
    let job = attach_host_job(&child);

    let stderr_lines: Arc<Mutex<Vec<String>>> = Arc::new(Mutex::new(Vec::new()));
    let linux_pid = match take_linux_pid_and_drain_stderr(&mut child, &stderr_lines).await {
        Ok(pid) => pid,
        Err(error) => {
            reap_wsl_stub_only(&mut child);
            return Err(error);
        }
    };

    if let Err(error) = write_host_pid(&host_pid_path(), stub_pid, Path::new(&paths.linux_node)) {
        boot_log::info(&format!("host pid file skipped: {error}"));
    }

    let session = WslSession {
        distro: paths.distro.clone(),
        linux_pid,
    };
    let stdout = match child.stdout.take() {
        Some(stdout) => stdout,
        None => {
            stop_wsl_linux_host(&session);
            reap_wsl_stub_only(&mut child);
            return Err("WSL dsh web stdout 不可用".into());
        }
    };
    let ready_urls = drain_stdout_for_ready_url(stdout, port);

    let child_handle = Arc::new(Mutex::new(Some(child)));
    let wsl_timeout = i18n::t(Msg::WslWaitForwarding);
    let launch_url = match wait_for_host_ready(
        &web_url,
        ready_urls,
        &child_handle,
        &stderr_lines,
        Duration::from_secs(120),
        Some(wsl_timeout),
    )
    .await
    {
        Ok(url) => url,
        Err(error) => {
            reap_wsl_session_and_stub(&session, &child_handle);
            return Err(error);
        }
    };

    boot_log::info(&format!(
        "authenticated readiness passed url={web_url} linux_pid={linux_pid}"
    ));

    Ok(HostHandle {
        port,
        web_url,
        launch_url,
        disabled_plugins: Vec::new(),
        wsl: Mutex::new(Some(session)),
        child: child_handle,
        #[cfg(windows)]
        job: Mutex::new(job),
    })
}

/// Parse the Linux Host pid from stderr handshake text.
///
/// Scans every line and returns the first that is entirely a decimal pid so a
/// leading `wsl.exe` diagnostic does not hide `echo $$`.
pub fn parse_linux_pid_from_stderr(stderr: &str) -> Option<u32> {
    stderr.lines().find_map(parse_linux_pid_line)
}

fn parse_linux_pid_line(line: &str) -> Option<u32> {
    let trimmed = line.trim();
    if trimmed.is_empty() {
        return None;
    }
    trimmed.parse().ok()
}

/// `wsl.exe` argv that sends `SIGTERM` to the Linux Host pid (never `--terminate`).
pub fn wsl_stop_args(distro: &str, linux_pid: u32) -> Vec<String> {
    vec![
        "-d".into(),
        distro.into(),
        "--exec".into(),
        "kill".into(),
        "-TERM".into(),
        linux_pid.to_string(),
    ]
}

fn wsl_kill_args(distro: &str, linux_pid: u32) -> Vec<String> {
    vec![
        "-d".into(),
        distro.into(),
        "--exec".into(),
        "kill".into(),
        "-KILL".into(),
        linux_pid.to_string(),
    ]
}

fn wsl_pid_alive_args(distro: &str, linux_pid: u32) -> Vec<String> {
    vec![
        "-d".into(),
        distro.into(),
        "--exec".into(),
        "kill".into(),
        "-0".into(),
        linux_pid.to_string(),
    ]
}

fn stop_wsl_linux_host(session: &WslSession) {
    let _ = run_wsl_argv(&wsl_stop_args(&session.distro, session.linux_pid));
    std::thread::sleep(Duration::from_secs(3));
    if wsl_linux_pid_alive(&session.distro, session.linux_pid) {
        let _ = run_wsl_argv(&wsl_kill_args(&session.distro, session.linux_pid));
    }
}

fn wsl_linux_pid_alive(distro: &str, linux_pid: u32) -> bool {
    run_wsl_argv(&wsl_pid_alive_args(distro, linux_pid))
        .map(|code| code == 0)
        .unwrap_or(false)
}

fn run_wsl_argv(args: &[String]) -> Result<i32, String> {
    let mut cmd = Command::new("wsl.exe");
    cmd.args(args);
    hide_console(&mut cmd);
    let status = cmd.status().map_err(|e| format!("无法执行 wsl.exe: {e}"))?;
    Ok(status.code().unwrap_or(-1))
}

fn reap_wsl_stub_only(child: &mut Child) {
    kill_process_tree(child.id());
    let _ = child.kill();
    let _ = child.wait();
    let _ = std::fs::remove_file(host_pid_path());
}

fn reap_wsl_session_and_stub(session: &WslSession, child: &Arc<Mutex<Option<Child>>>) {
    stop_wsl_linux_host(session);
    reap_child_handle(child);
    let _ = std::fs::remove_file(host_pid_path());
}

fn reap_child_handle(child: &Arc<Mutex<Option<Child>>>) {
    if let Ok(mut guard) = child.lock() {
        if let Some(mut child) = guard.take() {
            kill_process_tree(child.id());
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}

fn spawn_wsl_child(command: &super::wsl::WslCommand) -> Result<Child, String> {
    let mut cmd = Command::new(&command.program);
    cmd.args(&command.args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    hide_console(&mut cmd);
    cmd.spawn()
        .map_err(|e| format!("无法启动 WSL dsh web: {e}"))
}

/// Read stderr until the first parseable pid line, within [`WSL_PID_HANDSHAKE_TIMEOUT`].
/// Remaining lines keep draining into `stderr_lines` for later failure messages.
async fn take_linux_pid_and_drain_stderr(
    child: &mut Child,
    stderr_lines: &Arc<Mutex<Vec<String>>>,
) -> Result<u32, String> {
    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| "WSL Host stderr 不可用".to_string())?;
    let lines = Arc::clone(stderr_lines);
    let join = tokio::task::spawn_blocking(move || {
        read_linux_pid_handshake(stderr, lines, WSL_PID_HANDSHAKE_TIMEOUT)
    });
    join.await
        .map_err(|e| format!("WSL Host pid handshake 任务失败: {e}"))?
}

fn read_linux_pid_handshake<R: std::io::Read + Send + 'static>(
    stderr: R,
    stderr_lines: Arc<Mutex<Vec<String>>>,
    timeout: Duration,
) -> Result<u32, String> {
    let (tx, rx) = std::sync::mpsc::channel::<Result<u32, String>>();
    std::thread::spawn(move || {
        let mut reader = BufReader::new(stderr);
        let mut line = String::new();
        let mut sent = false;
        loop {
            line.clear();
            match reader.read_line(&mut line) {
                Ok(0) => break,
                Ok(_) => {
                    let trimmed = line.trim_end().to_string();
                    if !trimmed.is_empty() {
                        if let Ok(mut guard) = stderr_lines.lock() {
                            guard.push(trimmed.clone());
                            if guard.len() > 64 {
                                let drop = guard.len() - 64;
                                guard.drain(0..drop);
                            }
                        }
                    }
                    if !sent {
                        if let Some(pid) = parse_linux_pid_line(&trimmed) {
                            let _ = tx.send(Ok(pid));
                            sent = true;
                        }
                    }
                }
                Err(error) => {
                    if !sent {
                        let _ = tx.send(Err(format!("无法读取 WSL Host pid: {error}")));
                    }
                    return;
                }
            }
        }
        if !sent {
            let preview = stderr_lines
                .lock()
                .map(|lines| lines.join("\n"))
                .unwrap_or_default();
            let detail = if preview.is_empty() {
                "无 stderr 输出".to_string()
            } else {
                preview
            };
            let _ = tx.send(Err(format!("无法解析 WSL Host pid（handshake）: {detail}")));
        }
    });

    match rx.recv_timeout(timeout) {
        Ok(result) => result,
        Err(std::sync::mpsc::RecvTimeoutError::Timeout) => {
            Err("等待 WSL Host pid handshake 超时".into())
        }
        Err(std::sync::mpsc::RecvTimeoutError::Disconnected) => {
            Err("WSL Host pid handshake 通道已断开".into())
        }
    }
}

/// Write the rescue `--patch` overlay that disables the given plugin entry ids.
fn write_rescue_patch(ids: &[String]) -> Result<PathBuf, String> {
    let path = app_data_root()?.join("plugin-rescue.patch.yml");
    std::fs::write(&path, rescue_patch_body(ids))
        .map_err(|e| format!("无法写入 {}: {e}", path.display()))?;
    Ok(path)
}

/// One `disabled: true` patch row per plugin entry id.
fn rescue_patch_body(ids: &[String]) -> String {
    ids.iter()
        .map(|id| format!("- id: {id}\n  disabled: true\n"))
        .collect()
}

/// The plugin entry id named by a loader failure message, e.g.
/// "failed to apply loader entry dsh-plugins-catalog (…): invalid plugin".
/// The innermost (last) occurrence is taken; nested causes repeat the id.
fn failing_loader_entry(message: &str) -> Option<String> {
    const NEEDLE: &str = "failed to apply loader entry ";
    let start = message.rfind(NEEDLE)? + NEEDLE.len();
    let id: String = message[start..]
        .chars()
        .take_while(|c| !c.is_whitespace() && *c != '(' && *c != ':')
        .collect();
    (!id.is_empty()).then_some(id)
}

fn host_pid_path() -> std::path::PathBuf {
    app_data_root()
        .map(|root| root.join("host.pid"))
        .unwrap_or_else(|_| std::env::temp_dir().join("dsh-desktop-host.pid"))
}

#[cfg(windows)]
fn attach_host_job(child: &Child) -> Option<super::process::KillOnCloseJob> {
    let job = super::process::KillOnCloseJob::create()?;
    if job.assign(child) {
        Some(job)
    } else {
        None
    }
}

fn spawn_child(
    paths: &RuntimePaths,
    port: u16,
    overlay: Option<&HostOverlay>,
    host_path: &str,
    rescue_patch: Option<&Path>,
    network_proxy: &ResolvedNetworkProxy,
) -> Result<Child, String> {
    let mut cmd = Command::new(&paths.node_binary);
    cmd.args(native_web_args(
        &paths.cli_entry,
        port,
        overlay.map(|value| value.patch_file.as_path()),
        rescue_patch,
    ));
    if let Some(overlay) = overlay {
        cmd.env("DSH_DESKTOP_NOTIFY_URL", &overlay.notify_url);
    }
    cmd.env("DSH_HOME", &paths.dsh_home)
        .env("PATH", host_path)
        .env("NODE_ENV", "production")
        .current_dir(&paths.harness_root)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    apply_to_command(&mut cmd, network_proxy);

    isolate_host_group(&mut cmd);
    hide_console(&mut cmd);

    cmd.spawn().map_err(|e| format!("无法启动 dsh web: {e}"))
}

fn native_web_args(
    cli_entry: &Path,
    port: u16,
    overlay_patch: Option<&Path>,
    rescue_patch: Option<&Path>,
) -> Vec<OsString> {
    let mut args = vec![cli_entry.as_os_str().to_owned(), "web".into()];
    for patch in [overlay_patch, rescue_patch].into_iter().flatten() {
        args.push("--patch".into());
        args.push(patch.as_os_str().to_owned());
    }
    args.extend([
        "--no-open".into(),
        "--host".into(),
        "127.0.0.1".into(),
        "--port".into(),
        port.to_string().into(),
    ]);
    args
}

fn drain_lines<R: std::io::Read>(reader: R, sink: Arc<Mutex<Vec<String>>>) {
    let reader = BufReader::new(reader);
    for line in reader.lines().flatten() {
        if let Ok(mut guard) = sink.lock() {
            guard.push(line);
            if guard.len() > 64 {
                let drop = guard.len() - 64;
                guard.drain(0..drop);
            }
        }
    }
}

fn drain_stdout_for_ready_url<R: std::io::Read + Send + 'static>(
    reader: R,
    port: u16,
) -> mpsc::Receiver<String> {
    let (sender, receiver) = mpsc::channel();
    std::thread::spawn(move || read_ready_url_and_drain(reader, port, sender));
    receiver
}

fn read_ready_url_and_drain<R: std::io::Read>(reader: R, port: u16, sender: mpsc::Sender<String>) {
    let reader = BufReader::new(reader);
    let mut sender = Some(sender);
    for line in reader.lines().map_while(Result::ok) {
        let Some(ready_sender) = sender.as_ref() else {
            continue;
        };
        let Some(url) = parse_ready_url(&line, port) else {
            continue;
        };
        let _ = ready_sender.send(url);
        sender = None;
    }
}

fn parse_ready_url(line: &str, port: u16) -> Option<String> {
    const PREFIX: &str = "dsh web: ";
    const MIN_TOKEN_LENGTH: usize = 32;
    const MAX_TOKEN_LENGTH: usize = 128;

    let value = line.strip_prefix(PREFIX)?.split_ascii_whitespace().next()?;
    let parsed = Url::parse(value).ok()?;
    let token = parsed.query()?.strip_prefix("token=")?;
    let expected = format!("http://127.0.0.1:{port}/?token={token}");
    if value != expected
        || parsed.scheme() != "http"
        || !parsed.username().is_empty()
        || parsed.password().is_some()
        || parsed.host_str() != Some("127.0.0.1")
        || parsed.port() != Some(port)
        || parsed.path() != "/"
        || parsed.fragment().is_some()
        || !(MIN_TOKEN_LENGTH..=MAX_TOKEN_LENGTH).contains(&token.len())
        || !token
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_'))
    {
        return None;
    }
    Some(value.to_string())
}

fn child_exit_code(child: &Arc<Mutex<Option<Child>>>) -> Option<i32> {
    let mut guard = child.lock().ok()?;
    let child = guard.as_mut()?;
    match child.try_wait().ok()? {
        Some(status) => Some(status.code().unwrap_or(-1)),
        None => None,
    }
}

fn format_child_failure(stderr_lines: &Arc<Mutex<Vec<String>>>, exit_code: i32) -> String {
    let tail = stderr_lines
        .lock()
        .map(|lines| redact_launch_tokens(&lines.join("\n")))
        .unwrap_or_default();
    if tail.is_empty() {
        format!("dsh web 进程已退出 (code {exit_code})")
    } else {
        format!("dsh web 进程已退出 (code {exit_code})\n{tail}")
    }
}

fn format_readiness_failure(stderr_lines: &Arc<Mutex<Vec<String>>>, message: &str) -> String {
    let tail = stderr_lines
        .lock()
        .map(|lines| redact_launch_tokens(&lines.join("\n")))
        .unwrap_or_default();
    if tail.is_empty() {
        message.to_string()
    } else {
        format!("{message}\n{tail}")
    }
}

fn redact_launch_tokens(value: &str) -> String {
    const NEEDLE: &str = "token=";
    let mut output = String::with_capacity(value.len());
    let mut remaining = value;
    while let Some(start) = remaining.find(NEEDLE) {
        let value_start = start + NEEDLE.len();
        output.push_str(&remaining[..value_start]);
        let token_len = remaining[value_start..]
            .bytes()
            .take_while(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_'))
            .count();
        if token_len == 0 {
            remaining = &remaining[value_start..];
            continue;
        }
        output.push_str("<redacted>");
        remaining = &remaining[value_start + token_len..];
    }
    output.push_str(remaining);
    output
}

fn readiness_timeout(url: &str, timeout_detail: Option<&str>) -> String {
    match timeout_detail {
        Some(detail) => format!("等待 {url} 就绪超时。{detail}"),
        None => format!("等待 {url} 就绪超时"),
    }
}

fn authenticated_exchange_ready(status: StatusCode, headers: &HeaderMap) -> bool {
    status == StatusCode::SEE_OTHER
        && headers.get(LOCATION).is_some_and(|value| value == "/")
        && headers.contains_key(SET_COOKIE)
}

async fn wait_for_host_ready(
    web_url: &str,
    ready_urls: mpsc::Receiver<String>,
    child: &Arc<Mutex<Option<Child>>>,
    stderr_lines: &Arc<Mutex<Vec<String>>>,
    timeout: Duration,
    timeout_detail: Option<&str>,
) -> Result<String, String> {
    let deadline = tokio::time::Instant::now() + timeout;
    let launch_url = loop {
        if tokio::time::Instant::now() >= deadline {
            if let Some(code) = child_exit_code(child) {
                return Err(format_child_failure(stderr_lines, code));
            }
            return Err(readiness_timeout(web_url, timeout_detail));
        }
        if let Some(code) = child_exit_code(child) {
            return Err(format_child_failure(stderr_lines, code));
        }
        match ready_urls.try_recv() {
            Ok(url) => break url,
            Err(TryRecvError::Disconnected) => {
                if let Some(code) = child_exit_code(child) {
                    return Err(format_child_failure(stderr_lines, code));
                }
                return Err(format_readiness_failure(
                    stderr_lines,
                    "dsh web stdout 在报告就绪前已关闭",
                ));
            }
            Err(TryRecvError::Empty) => {}
        }
        tokio::time::sleep(Duration::from_millis(50)).await;
    };

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(5))
        .no_proxy()
        .redirect(redirect::Policy::none())
        .build()
        .map_err(|e| e.to_string())?;
    let mut logged_failure = false;

    loop {
        if tokio::time::Instant::now() >= deadline {
            if let Some(code) = child_exit_code(child) {
                return Err(format_child_failure(stderr_lines, code));
            }
            return Err(readiness_timeout(web_url, timeout_detail));
        }

        if let Some(code) = child_exit_code(child) {
            return Err(format_child_failure(stderr_lines, code));
        }

        match client.get(&launch_url).send().await {
            Ok(response) if authenticated_exchange_ready(response.status(), response.headers()) => {
                return Ok(launch_url);
            }
            Ok(response) => {
                return Err(format_readiness_failure(
                    stderr_lines,
                    &format!(
                        "dsh web 身份认证就绪检查返回意外状态 {}: {web_url}",
                        response.status()
                    ),
                ));
            }
            Err(err) => {
                if !logged_failure {
                    boot_log::info(&format!(
                        "authenticated readiness probe failed url={web_url} err={}",
                        redact_launch_tokens(&err.to_string())
                    ));
                    logged_failure = true;
                }
            }
        }

        tokio::time::sleep(Duration::from_millis(150)).await;
    }
}

fn pick_port(preferred: u16) -> Result<u16, String> {
    for port in preferred..preferred.saturating_add(10) {
        if port_free(port) {
            return Ok(port);
        }
    }
    Err(format!("端口 {preferred}–{} 均被占用", preferred + 9))
}

fn port_free(port: u16) -> bool {
    std::net::TcpListener::bind(("127.0.0.1", port)).is_ok()
}

#[cfg(test)]
mod tests {
    use super::{
        authenticated_exchange_ready, drain_lines, drain_stdout_for_ready_url,
        failing_loader_entry, format_child_failure, native_web_args, parse_linux_pid_from_stderr,
        parse_ready_url, read_linux_pid_handshake, read_ready_url_and_drain, reap_child_handle,
        rescue_patch_body, wait_for_host_ready, wsl_stop_args,
    };
    use reqwest::header::{HeaderMap, HeaderValue, LOCATION, SET_COOKIE};
    use reqwest::StatusCode;
    use std::io::{Cursor, Read, Write};
    use std::net::TcpListener;
    use std::path::Path;
    use std::process::{Command, Stdio};
    use std::sync::mpsc;
    use std::sync::{Arc, Mutex};
    use std::time::{Duration, Instant};

    #[test]
    fn extracts_the_plugin_id_from_a_loader_failure() {
        let message = "Error: dsh: plugin tree failed to load: \
failed to apply loader entry include (cordis:include): \
failed to apply loader entry dsh-plugins-catalog (dsh-plugins-catalog): \
invalid plugin, expect function or object with an \"apply\" method, received object";
        assert_eq!(
            failing_loader_entry(message),
            Some("dsh-plugins-catalog".to_string())
        );
        assert_eq!(failing_loader_entry("dsh web 进程已退出 (code 1)"), None);
        assert_eq!(failing_loader_entry("failed to apply loader entry "), None);
    }

    #[test]
    fn rescue_patch_disables_each_named_plugin() {
        assert_eq!(
            rescue_patch_body(&["a-b".to_string(), "c.d".to_string()]),
            "- id: a-b\n  disabled: true\n- id: c.d\n  disabled: true\n"
        );
    }

    #[test]
    fn native_desktop_host_orders_launcher_patches_before_web_arguments() {
        let args = native_web_args(
            Path::new("/Applications/YourBuddy.app/cli.js"),
            17890,
            Some(Path::new("/tmp/desktop-overlay.yml")),
            Some(Path::new("/tmp/rescue-overlay.yml")),
        );
        let values = args
            .iter()
            .map(|value| value.to_string_lossy().into_owned())
            .collect::<Vec<_>>();
        assert_eq!(
            values,
            [
                "/Applications/YourBuddy.app/cli.js",
                "web",
                "--patch",
                "/tmp/desktop-overlay.yml",
                "--patch",
                "/tmp/rescue-overlay.yml",
                "--no-open",
                "--host",
                "127.0.0.1",
                "--port",
                "17890",
            ]
        );
    }

    #[test]
    fn accepts_only_the_selected_hosts_authenticated_ready_url() {
        let token = "A".repeat(43);
        let expected = format!("http://127.0.0.1:17890/?token={token}");
        assert_eq!(
            parse_ready_url(
                &format!("dsh web: {expected} (LAN: http://192.168.1.2:17890/?token={token})"),
                17890
            ),
            Some(expected)
        );

        for line in [
            format!("ready: http://127.0.0.1:17890/?token={token}"),
            format!("dsh web: https://127.0.0.1:17890/?token={token}"),
            format!("dsh web: http://localhost:17890/?token={token}"),
            format!("dsh web: http://2130706433:17890/?token={token}"),
            format!("dsh web: http://127.0.0.1:17891/?token={token}"),
            format!("dsh web: http://127.0.0.1:17890/index.html?token={token}"),
            format!("dsh web: http://127.0.0.1:17890/?token={token}#fragment"),
            format!("dsh web: http://127.0.0.1:17890/?token={token}&extra=1"),
            "dsh web: http://127.0.0.1:17890/?token=short".to_string(),
            format!(
                "dsh web: http://127.0.0.1:17890/?token={}%41",
                "A".repeat(42)
            ),
        ] {
            assert_eq!(parse_ready_url(&line, 17890), None, "accepted {line}");
        }
    }

    #[test]
    fn stdout_reader_reports_once_and_drains_after_readiness() {
        let token = "A".repeat(43);
        let input = format!(
            "unrelated output\ndsh web: http://127.0.0.1:17890/?token={token}\nafter readiness\n"
        );
        let mut reader = Cursor::new(input.as_bytes());
        let (sender, receiver) = mpsc::channel();
        read_ready_url_and_drain(&mut reader, 17890, sender);

        assert_eq!(
            receiver.recv().unwrap(),
            format!("http://127.0.0.1:17890/?token={token}")
        );
        assert!(receiver.try_recv().is_err());
        assert_eq!(reader.position(), input.len() as u64);
    }

    #[test]
    fn child_failure_redacts_launch_tokens() {
        let token = "A".repeat(43);
        let stderr = Arc::new(Mutex::new(vec![format!(
            "failed near http://127.0.0.1:17890/?token={token}&retry=1"
        )]));
        let failure = format_child_failure(&stderr, 1);
        assert!(!failure.contains(&token));
        assert!(failure.contains("?token=<redacted>&retry=1"));
    }

    #[test]
    fn readiness_requires_the_token_exchange_response() {
        let mut headers = HeaderMap::new();
        headers.insert(LOCATION, HeaderValue::from_static("/"));
        headers.insert(SET_COOKIE, HeaderValue::from_static("dsh-auth=test"));
        assert!(authenticated_exchange_ready(
            StatusCode::SEE_OTHER,
            &headers
        ));
        assert!(!authenticated_exchange_ready(
            StatusCode::UNAUTHORIZED,
            &headers
        ));
        headers.remove(SET_COOKIE);
        assert!(!authenticated_exchange_ready(
            StatusCode::SEE_OTHER,
            &headers
        ));
    }

    #[test]
    fn ready_child_fixture() {
        let Ok(url) = std::env::var("YOURBUDDY_READY_CHILD_URL") else {
            return;
        };
        println!("\ndsh web: {url}");
        std::io::stdout().flush().unwrap();
        std::thread::sleep(Duration::from_secs(30));
    }

    #[tokio::test]
    async fn child_ready_url_drives_the_authenticated_exchange() {
        let listener = TcpListener::bind(("127.0.0.1", 0)).unwrap();
        listener.set_nonblocking(true).unwrap();
        let port = listener.local_addr().unwrap().port();
        let token = "A".repeat(43);
        let launch_url = format!("http://127.0.0.1:{port}/?token={token}");
        let web_url = format!("http://127.0.0.1:{port}/");
        let expected_request_target = format!("GET /?token={token} HTTP/1.1");
        let server = std::thread::spawn(move || {
            let deadline = Instant::now() + Duration::from_secs(5);
            let mut stream = loop {
                match listener.accept() {
                    Ok((stream, _)) => break stream,
                    Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                        assert!(Instant::now() < deadline, "readiness request never arrived");
                        std::thread::sleep(Duration::from_millis(10));
                    }
                    Err(error) => panic!("readiness listener failed: {error}"),
                }
            };
            stream.set_nonblocking(false).unwrap();
            stream
                .set_read_timeout(Some(Duration::from_secs(2)))
                .unwrap();
            let mut request = Vec::new();
            while !request.windows(4).any(|bytes| bytes == b"\r\n\r\n") {
                let mut chunk = [0_u8; 512];
                let length = stream.read(&mut chunk).unwrap();
                assert!(length > 0, "readiness request ended before its headers");
                request.extend_from_slice(&chunk[..length]);
                assert!(
                    request.len() <= 8192,
                    "readiness request headers are too large"
                );
            }
            let request = String::from_utf8_lossy(&request);
            assert!(request.starts_with(&expected_request_target), "{request}");
            stream
                .write_all(
                    b"HTTP/1.1 303 See Other\r\nLocation: /\r\nSet-Cookie: dsh-auth=test; HttpOnly\r\nContent-Length: 0\r\nConnection: close\r\n\r\n",
                )
                .unwrap();
        });

        let mut child = Command::new(std::env::current_exe().unwrap())
            .args([
                "--exact",
                "runtime::supervisor::tests::ready_child_fixture",
                "--nocapture",
            ])
            .env("YOURBUDDY_READY_CHILD_URL", &launch_url)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .unwrap();
        let ready_urls = drain_stdout_for_ready_url(child.stdout.take().unwrap(), port);
        let stderr_lines = Arc::new(Mutex::new(Vec::new()));
        let stderr = child.stderr.take().unwrap();
        let stderr_sink = Arc::clone(&stderr_lines);
        std::thread::spawn(move || drain_lines(stderr, stderr_sink));
        let child = Arc::new(Mutex::new(Some(child)));

        let result = wait_for_host_ready(
            &web_url,
            ready_urls,
            &child,
            &stderr_lines,
            Duration::from_secs(5),
            None,
        )
        .await;
        reap_child_handle(&child);
        server.join().unwrap();
        assert_eq!(result.unwrap(), launch_url);
    }

    #[test]
    fn parses_linux_pid_from_first_stderr_line() {
        assert_eq!(parse_linux_pid_from_stderr("43210\nready\n"), Some(43210));
        assert_eq!(parse_linux_pid_from_stderr("not-a-pid\n"), None);
        assert_eq!(
            parse_linux_pid_from_stderr("wsl: localhost proxy\n43210\nready\n"),
            Some(43210)
        );
    }

    #[test]
    fn stop_argv_is_kill_not_terminate() {
        let args = wsl_stop_args("Ubuntu", 43210);
        assert_eq!(args[0], "-d");
        assert!(args.contains(&"kill".into()));
        assert!(!args.iter().any(|a| a == "--terminate"));
    }

    #[test]
    fn handshake_scans_past_diagnostic_lines() {
        let lines = Arc::new(Mutex::new(Vec::new()));
        let stderr = std::io::Cursor::new(b"wsl: diagnostic\n43210\nafter\n".to_vec());
        let pid =
            read_linux_pid_handshake(stderr, Arc::clone(&lines), Duration::from_secs(2)).unwrap();
        assert_eq!(pid, 43210);
        std::thread::sleep(Duration::from_millis(50));
        let captured = lines.lock().unwrap();
        assert!(captured.iter().any(|l| l.contains("diagnostic")));
        assert!(captured.iter().any(|l| l == "43210"));
        assert!(captured.iter().any(|l| l == "after"));
    }

    #[test]
    fn handshake_times_out_when_stderr_stalls() {
        struct Stall;
        impl Read for Stall {
            fn read(&mut self, _buf: &mut [u8]) -> std::io::Result<usize> {
                std::thread::sleep(Duration::from_secs(10));
                Ok(0)
            }
        }
        let lines = Arc::new(Mutex::new(Vec::new()));
        let err = read_linux_pid_handshake(Stall, lines, Duration::from_millis(200)).unwrap_err();
        assert!(err.contains("超时"), "expected timeout error, got: {err}");
    }
}
