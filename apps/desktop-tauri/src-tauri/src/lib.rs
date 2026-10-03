mod chrome;
mod cli_shim;
mod component_helper;
mod desktop_settings;
mod desktop_shell;
mod external_links;
mod i18n;
mod network_proxy;
mod notify;
mod overlay;
mod product;
mod runtime;
mod tray;
mod updater;
mod window_layout;

use desktop_settings::AgentEnvironment;
use i18n::Msg;
use runtime::boot_log;
use runtime::components::ComponentManager;
use runtime::config::BUNDLED_HARNESS_DIR;
use runtime::io_fallback::is_recoverable_io;
use runtime::provision::{
    ensure_runtime, invalidate_provisioned_tree, read_bundle_hash, try_recover_paths, RuntimePaths,
};
use runtime::supervisor::{is_missing_dependency_failure, spawn_wsl_web_host, HostOverlay};
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
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            chrome::show_main(app);
        }))
        .invoke_handler(tauri::generate_handler![
            chrome::set_close_action,
            chrome::dismiss_close_prompt,
            chrome::restart_app
        ])
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

    let web_url = runtime.web_url.read().expect("web_url lock poisoned").clone();
    if !runtime
        .host
        .read()
        .expect("host lock poisoned")
        .disabled_plugins
        .is_empty()
    {
        let names = runtime
            .host
            .read()
            .expect("host lock poisoned")
            .disabled_plugins
            .join("、");
        boot_log::error(&format!("plugins disabled by rescue patch: {names}"));
        notify::toast(&app, "YourBuddy", &i18n::tf(Msg::PluginsDisabled, &names));
    }
    app.manage(runtime);
    if let Some(notify) = notify {
        app.manage(notify);
    }
    boot_log::info("opening main window");
    chrome::open_main_window(&app, &web_url)?;
    if let Some(splash) = app.get_webview_window("splash") {
        let _ = splash.close();
    }
    boot_log::info("boot complete");
    runtime::watchdog::start(app.clone());
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
    let overlay_src = overlay::resolve_overlay_source(app.path().resource_dir().ok().as_deref());
    let mut paths = ensure_or_recover(bundled.clone(), &progress).await?;

    // A Host that dies naming an unresolvable dependency points at store
    // damage the on-disk gates cannot see (e.g. a package removed after a
    // completed install), so the first such failure invalidates the tree and
    // re-provisions once before giving up. The overlay patch file lives
    // inside the harness tree and is re-implanted with each attempt.
    let mut repaired = false;
    loop {
        let host_overlay = notify.and_then(|notify| {
            match overlay::install_overlay(&paths, &overlay_src, &notify.url) {
                Ok(implanted) => Some(HostOverlay {
                    patch_file: implanted.patch_file,
                    notify_url: notify.url.clone(),
                }),
                Err(error) => {
                    boot_log::info(&format!("overlay skipped: {error}"));
                    None
                }
            }
        });

        match DesktopRuntime::start(paths.clone(), host_overlay.as_ref(), Arc::clone(&progress))
            .await
        {
            Ok(runtime) => return Ok(runtime),
            Err(error) if !repaired && is_missing_dependency_failure(&error) => {
                boot_log::error(&format!(
                    "host missing a provisioned dependency; re-provisioning: {error}"
                ));
                invalidate_provisioned_tree(&paths)?;
                paths = ensure_or_recover(bundled.clone(), &progress).await?;
                repaired = true;
            }
            Err(error) => return Err(error),
        }
    }
}

/// Provision the runtime, falling back to whatever Node / CLI already exists
/// on disk when provisioning fails.
async fn ensure_or_recover(
    bundled: Option<PathBuf>,
    progress: &Arc<dyn Fn(ProvisionEvent) + Send + Sync>,
) -> Result<RuntimePaths, String> {
    match ensure_runtime(bundled.clone(), {
        let progress = Arc::clone(progress);
        move |event| progress(event)
    })
    .await
    {
        Ok(paths) => Ok(paths),
        Err(error) => {
            boot_log::error(&format!("provision failed: {error}"));
            if let Some(paths) = try_recover_paths(bundled.as_deref()) {
                progress(ProvisionEvent::Status(if is_recoverable_io(&error) {
                    i18n::t(Msg::BootRecoverIo).into()
                } else {
                    i18n::t(Msg::BootRecoverGeneric).into()
                }));
                Ok(paths)
            } else if is_recoverable_io(&error) {
                Err(i18n::t(Msg::BootRecoverFailed).into())
            } else {
                Err(error)
            }
        }
    }
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
        spawn_wsl_web_host(&wsl_paths, host_overlay.as_ref(), &runner, runtime::config::DEFAULT_WEB_PORT)
            .await?;
    Ok(DesktopRuntime::start_wsl(host, wsl_paths))
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
