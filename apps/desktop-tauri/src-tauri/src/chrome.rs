//! Frameless main window, close preference, and custom title-bar commands.

use std::sync::atomic::{AtomicBool, Ordering};

use cookie::{Cookie, SameSite};
use tauri::window::Color;
use tauri::{AppHandle, Manager, Theme, WebviewUrl, WebviewWindowBuilder, WindowEvent};
use url::Url;

const DSH_BG: Color = Color(21, 21, 23, 255);

use crate::desktop_settings::{self, AgentEnvironment, CloseAction};
use crate::i18n::{self, Msg};
use crate::notify;
use crate::runtime::boot_log;
use crate::runtime::DesktopRuntime;
use crate::window_layout::resolve_controls_layout;

static QUIT_REQUESTED: AtomicBool = AtomicBool::new(false);

/// True when the process is allowed to exit (tray Quit/Restart, Exit close, updater restart).
pub fn quit_requested() -> bool {
    QUIT_REQUESTED.load(Ordering::SeqCst)
}

/// Exit the process after marking quit so `ExitRequested` is not cancelled.
pub fn request_quit(app: &AppHandle) {
    mark_process_end(app);
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.destroy();
    }
    app.exit(0);
}

/// Relaunch the desktop process. Stops the Host first because `app.restart`
/// skips `Drop`, and marks quit so a non-main-thread restart is not cancelled.
pub fn request_restart(app: &AppHandle) -> ! {
    mark_process_end(app);
    app.restart()
}

/// Webview-facing restart for the General application-lifecycle settings card.
/// Restarts the shell and Host together so installed plugins are rescanned.
#[tauri::command]
pub fn restart_app(app: AppHandle) {
    request_restart(&app)
}

fn mark_process_end(app: &AppHandle) {
    QUIT_REQUESTED.store(true, Ordering::SeqCst);
    stop_host(app);
    crate::desktop_shell::stop(app);
}

/// Reap the Host Node tree. `app.exit` / `app.restart` skip `Drop`.
pub fn stop_host(app: &AppHandle) {
    if let Some(runtime) = app.try_state::<DesktopRuntime>() {
        runtime.host.stop();
    }
}

/// Create the frameless loopback shell window, install its authority-bound Host
/// cookie, and start the same-site Host iframe only after the cookie store confirms it.
pub fn open_main_window(
    app: &AppHandle,
    shell_url: &str,
    web_url: &str,
    session_cookie: &str,
) -> Result<(), String> {
    if let Some(existing) = app.get_webview_window("main") {
        let _ = existing.show();
        let _ = existing.set_focus();
        return Ok(());
    }

    let session_cookie = desktop_session_cookie(web_url, session_cookie)?;
    let shell_url = desktop_shell_url(shell_url)?;
    let icon = app
        .default_window_icon()
        .cloned()
        .ok_or_else(|| "default window icon is missing".to_string())?;
    let locale = match i18n::current() {
        i18n::Locale::Zh => "zh",
        i18n::Locale::En => "en",
    };
    let init = format!(
        "window.__DSH_WEB_URL__ = {}; window.__DSH_CHROME__ = {}; window.__DSH_LOCALE__ = {};",
        serde_json::to_string(web_url).unwrap_or_else(|_| "\"\"".into()),
        serde_json::to_string(&resolve_controls_layout()).unwrap_or_else(|_| "{}".into()),
        serde_json::to_string(locale).unwrap_or_else(|_| "\"en\"".into()),
    );

    let mut builder = WebviewWindowBuilder::new(app, "main", WebviewUrl::External(shell_url))
        .title("YourBuddy")
        .inner_size(1280.0, 860.0)
        .center()
        .decorations(false)
        .visible(false)
        .background_color(DSH_BG)
        .theme(Some(Theme::Dark))
        .initialization_script(&init);

    #[cfg(any(target_os = "windows", target_os = "macos"))]
    {
        builder = builder.shadow(true);
    }

    let window = builder
        .icon(icon)
        .map_err(|e| e.to_string())?
        .build()
        .map_err(|e| e.to_string())?;

    if let Err(error) = install_session_cookie(&window, session_cookie) {
        let _ = window.destroy();
        return Err(error);
    }
    window
        .eval("window.__DSH_HOST_COOKIE_READY__ = true; window.__DSH_OPEN_HOST__?.();")
        .map_err(|e| e.to_string())?;

    let app_handle = window.app_handle().clone();
    window.on_window_event(move |event| {
        if let WindowEvent::CloseRequested { api, .. } = event {
            api.prevent_close();
            on_close_requested(&app_handle);
        }
    });

    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;
    Ok(())
}

fn desktop_session_cookie(web_url: &str, value: &str) -> Result<Cookie<'static>, String> {
    let url = Url::parse(web_url).map_err(|_| "Host URL 无效".to_string())?;
    let host = url
        .host_str()
        .filter(|host| *host == "127.0.0.1")
        .ok_or_else(|| "Host Cookie 只能绑定 127.0.0.1".to_string())?;
    if url.scheme() != "http"
        || url.port().is_none()
        || url.path() != "/"
        || url.query().is_some()
        || url.fragment().is_some()
        || !url.username().is_empty()
        || url.password().is_some()
    {
        return Err("Host URL 不是预期的本机根地址".into());
    }

    let mut cookie = Cookie::parse(value.to_owned())
        .map_err(|_| "Host 身份认证返回了无效 Cookie".to_string())?
        .into_owned();
    let suffix = cookie.name().strip_prefix("dsh-auth-");
    let valid_name = suffix.is_some_and(|suffix| {
        suffix.len() == 43
            && suffix
                .bytes()
                .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_'))
    });
    if !valid_name
        || cookie.value().is_empty()
        || cookie.value().len() > 4096
        || cookie.domain().is_some()
        || cookie.path() != Some("/")
        || cookie.http_only() != Some(true)
        || cookie.secure() == Some(true)
        || cookie.same_site() != Some(SameSite::Strict)
        || !cookie
            .max_age()
            .is_some_and(|duration| duration.whole_seconds() > 0)
        || cookie.expires_datetime().is_none()
    {
        return Err("Host 身份认证 Cookie 不符合桌面会话要求".into());
    }

    cookie.set_domain(host.to_owned());
    Ok(cookie)
}

fn desktop_shell_url(value: &str) -> Result<Url, String> {
    let url = Url::parse(value).map_err(|_| "桌面壳 URL 无效".to_string())?;
    if url.scheme() != "http"
        || url.host_str() != Some("127.0.0.1")
        || url.port().is_none()
        || url.path() != "/"
        || url.query().is_some()
        || url.fragment().is_some()
        || !url.username().is_empty()
        || url.password().is_some()
    {
        return Err("桌面壳 URL 不是预期的本机根地址".into());
    }
    Ok(url)
}

fn install_session_cookie(
    window: &tauri::WebviewWindow,
    session_cookie: Cookie<'static>,
) -> Result<(), String> {
    let expected_name = session_cookie.name().to_owned();
    let expected_value = session_cookie.value().to_owned();
    window
        .set_cookie(session_cookie)
        .map_err(|e| format!("无法写入 Host 身份认证 Cookie: {e}"))?;
    let installed = window
        .cookies()
        .map_err(|e| format!("无法确认 Host 身份认证 Cookie: {e}"))?
        .into_iter()
        .any(|cookie| {
            cookie.name() == expected_name
                && cookie.value() == expected_value
                && cookie.http_only() == Some(true)
                && cookie.secure() != Some(true)
                && cookie.same_site() == Some(SameSite::Strict)
        });
    if !installed {
        return Err("Host 身份认证 Cookie 未进入桌面 WebView".into());
    }
    Ok(())
}

/// Focus or unhide the main window (single-instance and tray).
pub fn show_main(app: &AppHandle) {
    if let Some(window) = app
        .get_webview_window("main")
        .or_else(|| app.get_webview_window("splash"))
    {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

/// Apply the saved close action, or ask once when none is stored.
pub fn on_close_requested(app: &AppHandle) {
    match desktop_settings::load().close_action {
        Some(CloseAction::Minimize) => hide_main(app),
        Some(CloseAction::Exit) => request_quit(app),
        None => {
            if let Err(error) = open_close_prompt(app) {
                boot_log::info(&format!("close prompt fallback hide: {error}"));
                hide_main(app);
            }
        }
    }
}

/// Persist a close action from the in-window prompt, then apply it.
#[tauri::command]
pub fn set_close_action(app: AppHandle, action: String) -> Result<(), String> {
    let parsed = parse_close_action(&action)?;
    remember_close_action(&app, parsed)?;
    hide_close_prompt(&app);
    match parsed {
        None => {}
        Some(CloseAction::Minimize) => hide_main(&app),
        Some(CloseAction::Exit) => request_quit(&app),
    }
    Ok(())
}

/// Persist a close action from the tray without immediately hiding or quitting.
pub fn remember_close_action(app: &AppHandle, action: Option<CloseAction>) -> Result<(), String> {
    save_close_action(action)?;
    let message = match action {
        Some(CloseAction::Minimize) => i18n::t(Msg::ToastCloseMin),
        Some(CloseAction::Exit) => i18n::t(Msg::ToastCloseExit),
        None => i18n::t(Msg::ToastCloseAsk),
    };
    notify::toast(app, "YourBuddy", message);
    Ok(())
}

fn parse_close_action(action: &str) -> Result<Option<CloseAction>, String> {
    match action {
        "minimize" => Ok(Some(CloseAction::Minimize)),
        "exit" => Ok(Some(CloseAction::Exit)),
        "ask" => Ok(None),
        other => Err(format!("unknown close action: {other}")),
    }
}

fn save_close_action(action: Option<CloseAction>) -> Result<(), String> {
    let mut settings = desktop_settings::load();
    settings.close_action = action;
    desktop_settings::save(&settings)
}

fn hide_main(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }
}

fn open_close_prompt(app: &AppHandle) -> Result<(), String> {
    let main = app
        .get_webview_window("main")
        .ok_or_else(|| "main window is missing".to_string())?;
    main.eval("window.__DSH_CLOSE_PROMPT__?.show()")
        .map_err(|e| e.to_string())?;
    let _ = main.set_focus();
    Ok(())
}

fn hide_close_prompt(app: &AppHandle) {
    if let Some(main) = app.get_webview_window("main") {
        let _ = main.eval("window.__DSH_CLOSE_PROMPT__?.hide()");
    }
}

/// Toast copy when the tray changes the agent runtime target.
pub fn environment_changed_message() -> &'static str {
    i18n::t(Msg::EnvRestart)
}

/// Persist the agent runtime target from the tray without restarting the Host.
pub fn apply_agent_environment(value: AgentEnvironment) -> Result<(), String> {
    let mut settings = desktop_settings::load();
    settings.agent_environment = value;
    desktop_settings::save(&settings)
}

/// Persist the agent runtime target from the tray and toast success or failure.
pub fn remember_agent_environment(app: &AppHandle, value: AgentEnvironment) {
    match apply_agent_environment(value) {
        Ok(()) => notify::toast(app, "YourBuddy", environment_changed_message()),
        Err(error) => {
            boot_log::error(&format!("tray agent environment save failed: {error}"));
            notify::toast(app, i18n::t(Msg::EnvSaveFailed), &error);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{desktop_session_cookie, desktop_shell_url, environment_changed_message};
    use cookie::SameSite;

    fn server_cookie() -> String {
        format!(
            "dsh-auth-{}=v1.payload.signature; Max-Age=2592000; Path=/; Expires=Tue, 06 Oct 2026 12:00:00 GMT; HttpOnly; SameSite=Strict",
            "A".repeat(43)
        )
    }

    #[test]
    fn environment_changed_message_is_restart_toast() {
        assert_eq!(environment_changed_message(), "运行环境将在重启后生效");
    }

    #[test]
    fn desktop_cookie_preserves_strict_same_site_host_authentication() {
        let cookie = desktop_session_cookie("http://127.0.0.1:17890/", &server_cookie()).unwrap();
        assert_eq!(cookie.domain(), Some("127.0.0.1"));
        assert_eq!(cookie.path(), Some("/"));
        assert_eq!(cookie.http_only(), Some(true));
        assert_ne!(cookie.secure(), Some(true));
        assert_eq!(cookie.same_site(), Some(SameSite::Strict));
        assert!(cookie
            .max_age()
            .is_some_and(|duration| duration.whole_seconds() > 0));
        assert!(cookie.expires_datetime().is_some());
    }

    #[test]
    fn desktop_cookie_rejects_untrusted_hosts_and_weakened_attributes() {
        assert!(desktop_session_cookie("http://localhost:17890/", &server_cookie()).is_err());
        assert!(
            desktop_session_cookie("http://127.0.0.1:17890/?token=secret", &server_cookie())
                .is_err()
        );
        for invalid in [
            server_cookie().replace("HttpOnly; ", ""),
            server_cookie().replace("SameSite=Strict", "SameSite=Lax"),
            server_cookie().replace("Max-Age=2592000; ", ""),
            server_cookie().replace("dsh-auth-", "other-"),
        ] {
            assert!(desktop_session_cookie("http://127.0.0.1:17890/", &invalid).is_err());
        }
    }

    #[test]
    fn desktop_shell_requires_an_exact_loopback_http_origin() {
        assert!(desktop_shell_url("http://127.0.0.1:45678/").is_ok());
        for invalid in [
            "tauri://localhost/shell.html",
            "http://localhost:45678/",
            "http://127.0.0.1:45678/shell.html",
            "http://127.0.0.1:45678/?token=secret",
        ] {
            assert!(desktop_shell_url(invalid).is_err(), "accepted {invalid}");
        }
    }
}
