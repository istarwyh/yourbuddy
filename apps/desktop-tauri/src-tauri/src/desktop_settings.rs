//! Persisted desktop-shell preferences next to `boot.log`.

use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::network_proxy::{NetworkProxySettings, NETWORK_PROXY_SETTINGS_VERSION};
use crate::runtime::app_data_root;

/// What the title-bar / window close button does after the user has chosen.
#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum CloseAction {
    Minimize,
    Exit,
}

/// Where the desktop shell runs the agent runtime.
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum AgentEnvironment {
    #[default]
    Windows,
    Wsl,
}

/// How the native desktop process obtains exported user configuration.
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ShellEnvironmentMode {
    /// Capture the account's interactive login shell before runtime discovery.
    #[default]
    Inherit,
    /// Keep only the GUI process environment and application-owned overrides.
    DesktopOnly,
}

/// Persisted login-shell environment preferences.
#[derive(Clone, Debug, Default, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ShellEnvironmentSettings {
    #[serde(default)]
    pub mode: ShellEnvironmentMode,
    #[serde(default)]
    pub shell_path: Option<PathBuf>,
}

/// Desktop preferences stored as JSON under the application-data root.
#[derive(Clone, Debug, Default, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopSettings {
    #[serde(default)]
    pub close_action: Option<CloseAction>,
    #[serde(default)]
    pub agent_environment: AgentEnvironment,
    #[serde(default)]
    pub wsl_distro: Option<String>,
    #[serde(default)]
    pub network_proxy: NetworkProxySettings,
    #[serde(default)]
    pub shell_environment: ShellEnvironmentSettings,
}

/// Path of `desktop-settings.json` beside `boot.log`.
pub fn settings_path() -> Result<PathBuf, String> {
    Ok(app_data_root()?.join("desktop-settings.json"))
}

/// Load preferences, or defaults when the file is missing or unreadable.
pub fn load() -> DesktopSettings {
    match settings_path() {
        Ok(path) => load_from(&path),
        Err(_) => DesktopSettings::default(),
    }
}

/// Persist preferences. Failure is logged by the caller.
pub fn save(settings: &DesktopSettings) -> Result<(), String> {
    save_to(&settings_path()?, settings)
}

/// Read one settings file. Invalid JSON becomes defaults.
pub fn load_from(path: &Path) -> DesktopSettings {
    let Ok(raw) = fs::read_to_string(path) else {
        return DesktopSettings::default();
    };
    let Ok(mut value) = serde_json::from_str::<serde_json::Value>(&raw) else {
        return legacy_settings();
    };
    migrate_network_proxy(&mut value);
    match serde_json::from_value(value) {
        Ok(settings) => settings,
        Err(_) => legacy_settings(),
    }
}

fn migrate_network_proxy(value: &mut serde_json::Value) {
    let Some(settings) = value.as_object_mut() else {
        return;
    };
    if !settings.contains_key("networkProxy") {
        settings.insert(
            "networkProxy".into(),
            serde_json::to_value(NetworkProxySettings::legacy_direct())
                .expect("legacy network settings serialize"),
        );
        return;
    }
    let Some(network) = settings
        .get_mut("networkProxy")
        .and_then(serde_json::Value::as_object_mut)
    else {
        return;
    };
    network
        .entry("mode")
        .or_insert_with(|| serde_json::Value::String("direct".into()));
    network.entry("version").or_insert_with(|| {
        serde_json::Value::Number(serde_json::Number::from(NETWORK_PROXY_SETTINGS_VERSION))
    });
}

fn legacy_settings() -> DesktopSettings {
    DesktopSettings {
        network_proxy: NetworkProxySettings::legacy_direct(),
        ..DesktopSettings::default()
    }
}

/// Write one settings file, creating the parent directory.
pub fn save_to(path: &Path, settings: &DesktopSettings) -> Result<(), String> {
    if settings.network_proxy.version != NETWORK_PROXY_SETTINGS_VERSION {
        return Err("network-proxy-settings-version-unsupported".into());
    }
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("无法创建 {}: {e}", parent.display()))?;
    }
    let raw = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    fs::write(path, format!("{raw}\n")).map_err(|e| format!("无法写入 {}: {e}", path.display()))
}

/// Resolved agent runtime target from persisted settings.
pub fn effective_agent_environment(settings: &DesktopSettings) -> AgentEnvironment {
    settings.agent_environment
}

#[cfg(test)]
mod tests {
    use super::{
        load_from, save_to, AgentEnvironment, CloseAction, DesktopSettings, ShellEnvironmentMode,
    };
    use crate::network_proxy::{NetworkProxyMode, NetworkProxySettings};
    use std::fs;
    use std::path::PathBuf;

    fn temp_file() -> PathBuf {
        let root = std::env::temp_dir().join(format!(
            "dsh-desktop-settings-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_nanos())
                .unwrap_or(0)
        ));
        let _ = fs::create_dir_all(&root);
        root.join("desktop-settings.json")
    }

    #[test]
    fn missing_file_is_unset_close_action() {
        let path = temp_file();
        let _ = fs::remove_file(&path);
        assert_eq!(load_from(&path).close_action, None);
    }

    #[test]
    fn omitted_agent_environment_is_windows() {
        let path = temp_file();
        let _ = fs::remove_file(&path);
        assert_eq!(
            load_from(&path).agent_environment,
            AgentEnvironment::Windows
        );
        assert_eq!(load_from(&path).wsl_distro, None);
        assert_eq!(
            load_from(&path).network_proxy,
            NetworkProxySettings::default()
        );
        assert_eq!(
            load_from(&path).shell_environment.mode,
            ShellEnvironmentMode::Inherit
        );
    }

    #[test]
    fn existing_settings_without_network_choice_keep_direct_mode() {
        let path = temp_file();
        fs::write(&path, "{}\n").unwrap();
        let loaded = load_from(&path);
        assert_eq!(loaded.network_proxy.mode, NetworkProxyMode::Direct);
        assert_eq!(
            loaded.network_proxy.version,
            crate::network_proxy::NETWORK_PROXY_SETTINGS_VERSION
        );
        let _ = fs::remove_file(&path);
    }

    #[test]
    fn preserves_and_rejects_future_network_settings_versions() {
        let path = temp_file();
        fs::write(&path, "{\"networkProxy\":{\"version\":2}}\n").unwrap();
        let loaded = load_from(&path);
        assert_eq!(loaded.network_proxy.version, 2);
        assert_eq!(
            save_to(&path, &loaded).unwrap_err(),
            "network-proxy-settings-version-unsupported"
        );
        let _ = fs::remove_file(&path);
    }

    #[test]
    fn persists_wsl_environment_and_distro() {
        let path = temp_file();
        save_to(
            &path,
            &DesktopSettings {
                close_action: None,
                agent_environment: AgentEnvironment::Wsl,
                wsl_distro: Some("Ubuntu".into()),
                network_proxy: NetworkProxySettings::default(),
                shell_environment: Default::default(),
            },
        )
        .unwrap();
        let loaded = load_from(&path);
        assert_eq!(loaded.agent_environment, AgentEnvironment::Wsl);
        assert_eq!(loaded.wsl_distro.as_deref(), Some("Ubuntu"));
        let raw = fs::read_to_string(&path).unwrap();
        assert!(raw.contains("agentEnvironment"));
        assert!(raw.contains("wsl"));
        let _ = fs::remove_file(&path);
    }

    #[test]
    fn persists_minimize_and_exit_close_actions() {
        let path = temp_file();
        save_to(
            &path,
            &DesktopSettings {
                close_action: Some(CloseAction::Minimize),
                ..DesktopSettings::default()
            },
        )
        .unwrap();
        assert_eq!(load_from(&path).close_action, Some(CloseAction::Minimize));
        save_to(
            &path,
            &DesktopSettings {
                close_action: Some(CloseAction::Exit),
                ..DesktopSettings::default()
            },
        )
        .unwrap();
        assert_eq!(load_from(&path).close_action, Some(CloseAction::Exit));
        let raw = fs::read_to_string(&path).unwrap();
        assert!(raw.contains("closeAction"));
        save_to(
            &path,
            &DesktopSettings {
                close_action: None,
                ..DesktopSettings::default()
            },
        )
        .unwrap();
        assert_eq!(load_from(&path).close_action, None);
        let _ = fs::remove_file(&path);
    }

    #[test]
    fn persists_application_network_proxy_preferences() {
        let path = temp_file();
        let settings = NetworkProxySettings {
            mode: NetworkProxyMode::Custom,
            http_proxy: "http://127.0.0.1:7890".into(),
            https_proxy: "http://127.0.0.1:7890".into(),
            no_proxy: "*.local".into(),
            ca_certificate_path: "/tmp/company-root.pem".into(),
            ..NetworkProxySettings::default()
        };
        save_to(
            &path,
            &DesktopSettings {
                network_proxy: settings.clone(),
                ..DesktopSettings::default()
            },
        )
        .unwrap();
        assert_eq!(load_from(&path).network_proxy, settings);
        let raw = fs::read_to_string(&path).unwrap();
        assert!(raw.contains("networkProxy"));
        assert!(raw.contains("company-root.pem"));
        assert!(!raw.contains("password"));
        let _ = fs::remove_file(&path);
    }
}
