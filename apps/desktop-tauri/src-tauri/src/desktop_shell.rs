//! Loopback origin for the privileged desktop shell.

use std::io::{Read, Write};
use std::net::{SocketAddr, TcpListener, TcpStream};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread::{self, JoinHandle};
use std::time::Duration;

use serde_json::json;
use tauri::{AppHandle, Manager};

const SHELL_HTML: &[u8] = include_bytes!("../../shell.html");
const DESKTOP_I18N: &[u8] = include_bytes!("../../desktop-i18n.js");
const APP_ICON: &[u8] = include_bytes!("../../app-icon.png");
const MAX_REQUEST_BYTES: usize = 8 * 1024;
const READ_TIMEOUT: Duration = Duration::from_secs(2);

/// Bound loopback server whose HTTP origin is same-site with `dsh web`.
pub struct DesktopShellServer {
    pub url: String,
    address: SocketAddr,
    stopping: Arc<AtomicBool>,
    thread: Mutex<Option<JoinHandle<()>>>,
}

impl DesktopShellServer {
    /// Stop accepting shell requests. Safe to call more than once.
    pub fn stop(&self) {
        if !self.stopping.swap(true, Ordering::SeqCst) {
            let _ = TcpStream::connect_timeout(&self.address, Duration::from_millis(200));
        }
        if let Ok(mut guard) = self.thread.lock() {
            if let Some(thread) = guard.take() {
                let _ = thread.join();
            }
        }
    }
}

impl Drop for DesktopShellServer {
    fn drop(&mut self) {
        self.stop();
    }
}

/// Bind a random loopback port, grant that exact origin the existing shell
/// permissions, and serve the three embedded desktop assets.
pub fn start(app: &AppHandle) -> Result<DesktopShellServer, String> {
    let listener =
        TcpListener::bind("127.0.0.1:0").map_err(|error| format!("无法启动桌面壳服务: {error}"))?;
    listener
        .set_nonblocking(true)
        .map_err(|error| format!("无法配置桌面壳服务: {error}"))?;
    let address = listener
        .local_addr()
        .map_err(|error| format!("无法读取桌面壳地址: {error}"))?;
    let url = format!("http://127.0.0.1:{}/", address.port());

    app.add_capability(remote_capability(&url)?)
        .map_err(|error| format!("无法授权桌面壳: {error}"))?;

    let stopping = Arc::new(AtomicBool::new(false));
    let thread_stopping = Arc::clone(&stopping);
    let expected_host = format!("127.0.0.1:{}", address.port());
    let thread = thread::Builder::new()
        .name("yourbuddy-desktop-shell".into())
        .spawn(move || serve(listener, &expected_host, &thread_stopping))
        .map_err(|error| format!("无法运行桌面壳服务: {error}"))?;

    Ok(DesktopShellServer {
        url,
        address,
        stopping,
        thread: Mutex::new(Some(thread)),
    })
}

/// Stop the loopback shell server before quit or restart.
pub fn stop(app: &AppHandle) {
    if let Some(server) = app.try_state::<DesktopShellServer>() {
        server.stop();
    }
}

fn remote_capability(url: &str) -> Result<String, String> {
    let mut capability: serde_json::Value =
        serde_json::from_str(include_str!("../capabilities/default.json"))
            .map_err(|error| format!("桌面壳权限模板无效: {error}"))?;
    capability["identifier"] = json!("desktop-shell-loopback");
    capability["description"] = json!("Exact runtime-owned loopback origin for the desktop shell");
    capability["local"] = json!(false);
    capability["windows"] = json!(["main"]);
    capability["remote"] = json!({ "urls": [format!("{url}*")] });
    serde_json::to_string(&capability).map_err(|error| error.to_string())
}

fn serve(listener: TcpListener, expected_host: &str, stopping: &AtomicBool) {
    while !stopping.load(Ordering::SeqCst) {
        match listener.accept() {
            Ok((stream, _)) => {
                if stopping.load(Ordering::SeqCst) {
                    break;
                }
                handle_client(stream, expected_host);
            }
            Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                thread::sleep(Duration::from_millis(25));
            }
            Err(_) => break,
        }
    }
}

fn handle_client(mut stream: TcpStream, expected_host: &str) {
    let peer = stream.peer_addr().ok();
    if !peer.is_some_and(|address| address.ip().is_loopback()) {
        write_response(&mut stream, 403, "text/plain; charset=utf-8", b"");
        return;
    }
    let _ = stream.set_read_timeout(Some(READ_TIMEOUT));
    let Some(request) = read_request(&mut stream) else {
        write_response(&mut stream, 400, "text/plain; charset=utf-8", b"");
        return;
    };
    let mut lines = request.split("\r\n");
    let target = match lines.next().and_then(|line| {
        let mut parts = line.split(' ');
        match (parts.next(), parts.next(), parts.next(), parts.next()) {
            (Some("GET"), Some(target), Some("HTTP/1.1"), None) => Some(target),
            _ => None,
        }
    }) {
        Some(target) => target,
        None => {
            write_response(&mut stream, 405, "text/plain; charset=utf-8", b"");
            return;
        }
    };
    let host = lines.find_map(|line| {
        let (name, value) = line.split_once(':')?;
        name.eq_ignore_ascii_case("host").then(|| value.trim())
    });
    if host != Some(expected_host) {
        write_response(&mut stream, 421, "text/plain; charset=utf-8", b"");
        return;
    }

    match target {
        "/" | "/shell.html" => {
            write_response(&mut stream, 200, "text/html; charset=utf-8", SHELL_HTML)
        }
        "/desktop-i18n.js" => write_response(
            &mut stream,
            200,
            "text/javascript; charset=utf-8",
            DESKTOP_I18N,
        ),
        "/app-icon.png" => write_response(&mut stream, 200, "image/png", APP_ICON),
        _ => write_response(&mut stream, 404, "text/plain; charset=utf-8", b""),
    }
}

fn read_request<R: Read>(stream: &mut R) -> Option<String> {
    let mut bytes = Vec::with_capacity(1024);
    let mut chunk = [0u8; 1024];
    while bytes.len() < MAX_REQUEST_BYTES {
        let limit = chunk.len().min(MAX_REQUEST_BYTES - bytes.len());
        let count = stream.read(&mut chunk[..limit]).ok()?;
        if count == 0 {
            break;
        }
        bytes.extend_from_slice(&chunk[..count]);
        if bytes.windows(4).any(|window| window == b"\r\n\r\n") {
            break;
        }
    }
    bytes
        .windows(4)
        .any(|window| window == b"\r\n\r\n")
        .then(|| String::from_utf8(bytes).ok())
        .flatten()
}

fn write_response(stream: &mut TcpStream, status: u16, content_type: &str, body: &[u8]) {
    let reason = match status {
        200 => "OK",
        400 => "Bad Request",
        403 => "Forbidden",
        404 => "Not Found",
        405 => "Method Not Allowed",
        421 => "Misdirected Request",
        _ => "Error",
    };
    let csp = if status == 200 && content_type.starts_with("text/html") {
        "Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src ipc: http://ipc.localhost; frame-src http://127.0.0.1:*; object-src 'none'; base-uri 'none'; frame-ancestors 'none'\r\n"
    } else {
        ""
    };
    let head = format!(
        "HTTP/1.1 {status} {reason}\r\nContent-Type: {content_type}\r\nContent-Length: {}\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\nCross-Origin-Resource-Policy: same-origin\r\nReferrer-Policy: no-referrer\r\n{csp}Connection: close\r\n\r\n",
        body.len()
    );
    let _ = stream.write_all(head.as_bytes());
    let _ = stream.write_all(body);
}

#[cfg(test)]
mod tests {
    use super::{read_request, remote_capability};
    use std::io::Cursor;

    #[test]
    fn remote_capability_grants_only_the_runtime_shell_origin() {
        let value: serde_json::Value =
            serde_json::from_str(&remote_capability("http://127.0.0.1:45678/").unwrap()).unwrap();
        assert_eq!(value["local"], false);
        assert_eq!(value["windows"], serde_json::json!(["main"]));
        assert_eq!(
            value["remote"]["urls"],
            serde_json::json!(["http://127.0.0.1:45678/*"])
        );
    }

    #[test]
    fn request_reader_requires_a_complete_bounded_header() {
        let complete = b"GET / HTTP/1.1\r\nHost: 127.0.0.1:1\r\n\r\n";
        assert_eq!(
            read_request(&mut Cursor::new(complete)),
            Some(String::from_utf8(complete.to_vec()).unwrap())
        );
        assert_eq!(read_request(&mut Cursor::new(b"GET / HTTP/1.1\r\n")), None);
    }
}
