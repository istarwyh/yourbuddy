mod chrome;
mod cli_shim;
mod component_helper;
mod desktop_settings;
mod desktop_shell;
mod external_links;
mod i18n;
mod macos_permissions;
mod network_proxy;
mod notify;
mod overlay;
mod product;
mod runtime;
mod shell_environment;
mod tray;
mod updater;
mod window_layout;

use desktop_settings::AgentEnvironment;
use i18n::Msg;
use runtime::boot_log;
use runtime::components::ComponentManager;
use runtime::config::BUNDLED_HARNESS_DIR;
use runtime::io_fallback::is_recoverable_io;
use runtime::provision::{ensure_runtime, read_bundle_hash, try_recover_paths};
use runtime::supervisor::{spawn_wsl_web_host, HostOverlay};
use runtime::user_home::resolve_user_home;
use runtime::wsl::{
    ensure_wsl_runtime, parse_wsl_list, select_distro, SystemWslRunner, WslRunner, WslSelectError,
};
use runtime::{app_data_root, boot_kind, DesktopRuntime, ProvisionEvent};
use serde::Deserialize;
use serde_json::{json, Value};
use std::path::PathBuf;
use std::sync::Arc;
use tauri::window::Color;
use tauri::{AppHandle, Manager, RunEvent};

const SPLASH_BG: Color = Color(10, 15, 30, 255);

fn app_context() -> tauri::Context<tauri::Wry> {
    tauri::generate_context!()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    if component_helper::should_run() {
        std::process::exit(component_helper::run());
    }
    if cli_shim::should_run_as_cli() {
        std::process::exit(cli_shim::run());
    }
    if let Some(exit_code) = shell_environment::run_emitter_if_requested() {
        std::process::exit(exit_code);
    }
    let startup_settings = desktop_settings::load();
    shell_environment::initialize(&startup_settings.shell_environment);
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            chrome::show_main(app);
        }))
        .invoke_handler(tauri::generate_handler![run_first_party_command])
        .setup(|app| {
            let handle = app.handle().clone();
            let icon = app
                .default_window_icon()
                .cloned()
                .ok_or("default window icon is missing")?;
            if let Some(splash) = app.get_webview_window("splash") {
                splash.set_icon(icon)?;
                let _ = splash.set_background_color(Some(SPLASH_BG));
                let _ = splash.center();
                let locale = match i18n::current() {
                    i18n::Locale::Zh => "zh",
                    i18n::Locale::En => "en",
                };
                let _ = splash.eval(&format!(
                    "window.__DSH_LOCALE__={};window.DSH_I18N&&window.DSH_I18N.apply();",
                    json_string(locale)
                ));
            }
            tray::install(&handle)?;
            let bundled = resolve_bundled_source(&handle);
            tauri::async_runtime::spawn(async move {
                if let Err(err) = boot_app(handle.clone(), bundled).await {
                    boot_log::error(&err);
                    let script = format!("window.__DSH_SPLASH__?.setError({});", json_string(&err));
                    let _ = splash_eval(&handle, &script);
                }
            });
            Ok(())
        })
        .build(app_context())
        .expect("error while building tauri application")
        .run(|app, event| match event {
            RunEvent::ExitRequested { api, .. } => {
                if !chrome::quit_requested() {
                    api.prevent_exit();
                } else {
                    chrome::stop_host(app);
                }
            }
            RunEvent::Exit => chrome::stop_host(app),
            _ => {}
        });
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase")]
struct FirstPartyCommandPayload {
    action: Option<String>,
    url: Option<String>,
    settings: Option<network_proxy::NetworkProxySettings>,
    environment_settings: Option<desktop_settings::ShellEnvironmentSettings>,
    permission: Option<String>,
}

/// Dispatch application-owned desktop operations without a second command ACL.
#[tauri::command]
async fn run_first_party_command(
    app: AppHandle,
    runtime: tauri::State<'_, DesktopRuntime>,
    command: String,
    payload: Option<FirstPartyCommandPayload>,
) -> Result<Value, String> {
    let payload = payload.unwrap_or_default();
    match command.as_str() {
        "set_close_action" => {
            chrome::set_close_action(app, payload.action.ok_or("close-action-missing")?)?;
            Ok(Value::Null)
        }
        "restart_app" => {
            chrome::restart_app(app);
            Ok(Value::Null)
        }
        "open_external_url" => {
            external_links::open_external_url(payload.url.ok_or("external-url-missing")?)?;
            Ok(Value::Null)
        }
        "open_marketplace_url" => {
            external_links::open_marketplace_url(payload.url.ok_or("marketplace-url-missing")?)?;
            Ok(Value::Null)
        }
        "get_network_proxy_settings" => {
            serde_json::to_value(network_proxy::get_network_proxy_settings())
                .map_err(|error| error.to_string())
        }
        "select_ca_certificate" => {
            serde_json::to_value(network_proxy::select_ca_certificate(app).await?)
                .map_err(|error| error.to_string())
        }
        "test_network_proxy_settings" => serde_json::to_value(
            network_proxy::test_network_proxy_settings(
                payload.settings.ok_or("network-proxy-settings-missing")?,
                runtime,
            )
            .await?,
        )
        .map_err(|error| error.to_string()),
        "save_network_proxy_settings" => serde_json::to_value(
            network_proxy::save_network_proxy_settings(
                payload.settings.ok_or("network-proxy-settings-missing")?,
                runtime,
            )
            .await?,
        )
        .map_err(|error| error.to_string()),
        "get_shell_environment" => {
            serde_json::to_value(shell_environment::snapshot()).map_err(|error| error.to_string())
        }
        "preview_shell_environment" => serde_json::to_value(shell_environment::preview(
            &payload
                .environment_settings
                .ok_or("shell-environment-settings-missing")?,
        ))
        .map_err(|error| error.to_string()),
        "save_shell_environment" => serde_json::to_value(shell_environment::save(
            payload
                .environment_settings
                .ok_or("shell-environment-settings-missing")?,
        )?)
        .map_err(|error| error.to_string()),
        "get_macos_permissions" => {
            serde_json::to_value(macos_permissions::snapshot()).map_err(|error| error.to_string())
        }
        "request_macos_permission" => serde_json::to_value(
            macos_permissions::request(&payload.permission.ok_or("macos-permission-missing")?)
                .await?,
        )
        .map_err(|error| error.to_string()),
        "open_macos_permission_settings" => {
            macos_permissions::open_settings(
                &payload.permission.ok_or("macos-permission-missing")?,
            )?;
            Ok(Value::Null)
        }
        "install_harbor_component" => Ok(json!(install_harbor_component(app).await?)),
        "enable_managed_cli_path" => Ok(json!(enable_managed_cli_path()?)),
        "check_for_updates" => Ok(json!(updater::check_for_updates(app).await?)),
        _ => Err(format!("unknown first-party command: {command}")),
    }
}

/// Download and activate the optional Harbor component after a user action.
#[tauri::command]
async fn install_harbor_component(app: AppHandle) -> Result<String, String> {
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|error| format!("component resources are unavailable: {error}"))?;
    let settings = desktop_settings::load();
    let proxy = network_proxy::resolve(&settings.network_proxy)?;
    let manager = ComponentManager::load(&resource_dir, &proxy)?;
    manager
        .ensure("harbor")
        .await
        .map_err(|error| format!("HARBOR_RUNTIME_INSTALL_FAILED: {error}"))?;
    Ok("Harbor runtime installed".into())
}

/// Add YourBuddy's stable managed-bin directory to future terminal sessions after an explicit user action.
#[tauri::command]
fn enable_managed_cli_path() -> Result<String, String> {
    runtime::path_bridge::persist_managed_bin_path()?;
    Ok("YourBuddy terminal commands enabled".into())
}

fn resolve_bundled_source(app: &AppHandle) -> Option<PathBuf> {
    app.path()
        .resource_dir()
        .ok()
        .map(|dir| dir.join(BUNDLED_HARNESS_DIR))
        .filter(|path| path.join(".bundle-manifest.json").is_file())
}

async fn boot_app(app: AppHandle, bundled: Option<PathBuf>) -> Result<(), String> {
    boot_log::init()?;
    let environment_status = shell_environment::status();
    boot_log::info(&format!(
        "shell environment state={:?} source={} shell={} duration_ms={} variables={} path_entries={} error={}",
        environment_status.state,
        environment_status.source,
        environment_status.shell_path,
        environment_status.duration_ms,
        environment_status.variable_count,
        environment_status.path_entry_count,
        environment_status.error_code
    ));
    boot_log::info(&format!(
        "boot start bundled={}",
        bundled
            .as_ref()
            .map(|p| p.display().to_string())
            .unwrap_or_else(|| "none".into())
    ));

    let app_for_progress = app.clone();
    let progress: Arc<dyn Fn(ProvisionEvent) + Send + Sync> =
        Arc::new(move |event: ProvisionEvent| {
            let app = app_for_progress.clone();
            tauri::async_runtime::spawn(async move {
                let script = match event {
                    ProvisionEvent::Status(text) => {
                        boot_log::info(&format!("status: {text}"));
                        format!("window.__DSH_SPLASH__?.setStatus({});", json_string(&text))
                    }
                    ProvisionEvent::Progress(pct) => {
                        format!("window.__DSH_SPLASH__?.setProgress({pct});", pct = pct)
                    }
                };
                let _ = splash_eval(&app, &script);
            });
        });

    let notify = match notify::start(app.clone()) {
        Ok(notify) => Some(notify),
        Err(error) => {
            boot_log::info(&format!("notify disabled, overlay skipped: {error}"));
            None
        }
    };

    let settings = desktop_settings::load();
    let network_proxy = network_proxy::resolve(&settings.network_proxy)?;
    network_proxy::log_active(&network_proxy);
    let resource_dir = app.path().resource_dir().ok();
    let mut bundled = bundled;
    let components = if let Some(resource_dir) = resource_dir
        .as_deref()
        .filter(|path| path.join("component-channel/components.json").is_file())
    {
        let manager = Arc::new(ComponentManager::load(resource_dir, &network_proxy)?);
        bundled = Some(manager.ensure_startup().await?);
        Some(manager)
    } else {
        None
    };
    let mut runtime = match boot_kind(&settings) {
        AgentEnvironment::Windows => {
            boot_windows_runtime(
                app.clone(),
                bundled,
                components,
                notify.as_ref(),
                Arc::clone(&progress),
                network_proxy,
            )
            .await?
        }
        AgentEnvironment::Wsl => {
            boot_wsl_runtime(
                app.clone(),
                bundled,
                &settings,
                notify.as_ref(),
                Arc::clone(&progress),
                network_proxy,
            )
            .await?
        }
    };

    let web_url = runtime.web_url.clone();
    let session_cookie = runtime.take_session_cookie();
    if !runtime.host.disabled_plugins.is_empty() {
        let names = runtime.host.disabled_plugins.join("、");
        boot_log::error(&format!("plugins disabled by rescue patch: {names}"));
        notify::toast(&app, "YourBuddy", &i18n::tf(Msg::PluginsDisabled, &names));
    }
    app.manage(runtime);
    if let Some(notify) = notify {
        app.manage(notify);
    }
    let shell = desktop_shell::start(&app)?;
    let shell_url = shell.url.clone();
    app.manage(shell);
    boot_log::info(&format!("opening main window url={web_url}"));
    chrome::open_main_window(&app, &shell_url, &web_url, &session_cookie)?;
    if let Some(splash) = app.get_webview_window("splash") {
        let _ = splash.close();
    }
    boot_log::info("boot complete");
    let app_for_update = app.clone();
    tauri::async_runtime::spawn(async move {
        if let Err(error) = updater::install_available(&app_for_update).await {
            boot_log::info(&format!("desktop update skipped: {error}"));
        }
    });
    Ok(())
}

async fn boot_windows_runtime(
    app: AppHandle,
    bundled: Option<PathBuf>,
    components: Option<Arc<ComponentManager>>,
    notify: Option<&notify::NotifyHandle>,
    progress: Arc<dyn Fn(ProvisionEvent) + Send + Sync>,
    network_proxy: network_proxy::ResolvedNetworkProxy,
) -> Result<DesktopRuntime, String> {
    let paths = match ensure_runtime(bundled.clone(), components, network_proxy.clone(), {
        let progress = Arc::clone(&progress);
        move |event| progress(event)
    })
    .await
    {
        Ok(paths) => paths,
        Err(error) => {
            boot_log::error(&format!("provision failed: {error}"));
            if let Some(paths) = try_recover_paths(bundled.as_deref()) {
                progress(ProvisionEvent::Status(if is_recoverable_io(&error) {
                    i18n::t(Msg::BootRecoverIo).into()
                } else {
                    i18n::t(Msg::BootRecoverGeneric).into()
                }));
                paths
            } else if is_recoverable_io(&error) {
                return Err(i18n::t(Msg::BootRecoverFailed).into());
            } else {
                return Err(error);
            }
        }
    };

    progress(ProvisionEvent::Status(
        i18n::t(Msg::StatusProductRuntime).into(),
    ));
    let resource_dir = app.path().resource_dir().ok();
    let product = product::resolve(resource_dir.as_deref())?;
    boot_log::info(&format!(
        "YourBuddy product runtime ready harbor={} integration={}",
        product.harbor_bin.display(),
        product.integration_version
    ));

    let overlay_src = overlay::resolve_overlay_source(resource_dir.as_deref());
    let notify_url = notify.map(|server| server.url.as_str()).unwrap_or("");
    let implanted = overlay::install_overlay(&paths, &overlay_src, notify_url, &product)?;
    let host_overlay = Some(HostOverlay {
        patch_file: implanted.patch_file,
        notify_url: notify_url.to_string(),
    });

    DesktopRuntime::start(paths, host_overlay.as_ref(), progress, network_proxy).await
}

async fn boot_wsl_runtime(
    app: AppHandle,
    bundled: Option<PathBuf>,
    settings: &desktop_settings::DesktopSettings,
    notify: Option<&notify::NotifyHandle>,
    progress: Arc<dyn Fn(ProvisionEvent) + Send + Sync>,
    network_proxy: network_proxy::ResolvedNetworkProxy,
) -> Result<DesktopRuntime, String> {
    progress(ProvisionEvent::Status(i18n::t(Msg::StatusDetectWsl).into()));
    let runner = SystemWslRunner;
    let list_out = runner
        .run(&["-l", "-v"])
        .map_err(|_| WslSelectError::missing_wsl().splash_message().to_string())?;
    let list_text = String::from_utf8_lossy(&list_out.stdout);
    let distros = parse_wsl_list(&list_text);
    let distro = select_distro(&distros, settings.wsl_distro.as_deref())
        .map_err(|error| error.splash_message().to_string())?;

    let bundled = bundled.ok_or_else(|| i18n::t(Msg::BootMissingBundle).to_string())?;
    let bundle_hash = read_bundle_hash(&bundled)?;
    let isolated_home = app_data_root()?.join("dsh-home");
    let windows_dsh_home = resolve_user_home(&isolated_home).path;
    let overlay_src = overlay::resolve_overlay_source(app.path().resource_dir().ok().as_deref());
    let overlay_for_provision = notify.map(|_| overlay_src.as_path());
    let notify_url = notify.map(|server| server.url.as_str());

    let wsl_paths = ensure_wsl_runtime(
        &runner,
        &distro.name,
        &bundled,
        &bundle_hash,
        &windows_dsh_home,
        overlay_for_provision,
        notify_url,
        network_proxy.clone(),
        {
            let progress = Arc::clone(&progress);
            move |event| progress(event)
        },
    )
    .await?;

    let host_overlay = notify.map(|server| HostOverlay {
        // Linux patch path is already on `wsl_paths.linux_patch`; Windows
        // `patch_file` is unused by `spawn_wsl_web_host`.
        patch_file: PathBuf::new(),
        notify_url: server.url.clone(),
    });

    progress(ProvisionEvent::Status(i18n::t(Msg::StatusStartWeb).into()));
    let host =
        spawn_wsl_web_host(&wsl_paths, host_overlay.as_ref(), &runner, &network_proxy).await?;
    Ok(DesktopRuntime::start_wsl(host, wsl_paths, network_proxy))
}

fn splash_eval(app: &AppHandle, script: &str) -> Result<(), String> {
    if let Some(splash) = app.get_webview_window("splash") {
        splash.eval(script).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn json_string(value: &str) -> String {
    serde_json::to_string(value).unwrap_or_else(|_| "\"\"".into())
}
