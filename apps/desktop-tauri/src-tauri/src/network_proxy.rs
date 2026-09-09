//! Application-wide proxy policy for native requests and the private DSH Host.

use std::collections::HashSet;
use std::error::Error as StdError;
use std::ffi::{OsStr, OsString};
use std::fs;
use std::io::BufReader;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::Arc;
use std::time::Duration;

use reqwest::{ClientBuilder, NoProxy, Proxy};
use rustls::{CertificateError, ClientConfig};
use rustls_platform_verifier::Verifier;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_updater::UpdaterBuilder;
use tokio::io::AsyncReadExt;
use url::{Host, Url};
use x509_parser::parse_x509_certificate;
use x509_parser::time::ASN1Time;

use crate::desktop_settings;
use crate::runtime::boot_log;
use crate::runtime::plugin_catalog::PluginRunTarget;
use crate::runtime::process::hide_console;
use crate::runtime::DesktopRuntime;

const PROXY_TEST_URL: &str = "https://chatgpt.com/";
const PROXY_TEST_TIMEOUT: Duration = Duration::from_secs(15);
const NODE_PREFLIGHT_TIMEOUT: Duration = Duration::from_secs(20);
const MAX_NODE_PREFLIGHT_OUTPUT_BYTES: u64 = 4_096;
const MAX_PROXY_URL_LENGTH: usize = 2_048;
const MAX_NO_PROXY_LENGTH: usize = 4_096;
const MAX_CA_CERTIFICATE_PATH_LENGTH: usize = 4_096;
const MAX_CA_CERTIFICATE_BYTES: u64 = 1_048_576;
const LOCAL_BYPASS: [&str; 3] = ["localhost", "127.0.0.1", "::1"];
const CHILD_NETWORK_ENV_NAMES: [&str; 13] = [
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
    "YOURBUDDY_NETWORK_PROXY_MODE",
    "YOURBUDDY_NETWORK_CA_SOURCE",
];
const NODE_SYSTEM_CA_OPTION: &str = "--use-system-ca";
const NODE_PREFLIGHT_SOURCE: &str = r#"
import { createRequire } from 'node:module'

function safeErrorCode(error) {
  let current = error
  for (let depth = 0; depth < 5 && current !== undefined; depth += 1) {
    if (current !== null && typeof current === 'object') {
      if (typeof current.code === 'string' && /^[A-Z0-9_]{1,64}$/.test(current.code)) return current.code
      if (typeof current.name === 'string' && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(current.name)
        && current.name !== 'Error' && current.name !== 'TypeError') return current.name.toUpperCase()
      current = current.cause
      continue
    }
    break
  }
  return 'UNKNOWN'
}

let dispatcher
let result
try {
  const require = createRequire(process.argv[1])
  const { EnvHttpProxyAgent, setGlobalDispatcher } = require('undici')
  const httpProxy = process.env.http_proxy ?? process.env.HTTP_PROXY
  const httpsProxy = process.env.https_proxy ?? process.env.HTTPS_PROXY
  const noProxy = process.env.no_proxy ?? process.env.NO_PROXY
  if (httpProxy !== undefined || httpsProxy !== undefined) {
    dispatcher = new EnvHttpProxyAgent({
      ...(httpProxy === undefined ? {} : { httpProxy }),
      ...(httpsProxy === undefined ? {} : { httpsProxy }),
      ...(noProxy === undefined ? {} : { noProxy }),
    })
    setGlobalDispatcher(dispatcher)
  }
  const response = await fetch(process.argv[2], { signal: AbortSignal.timeout(15_000) })
  const ok = response.status !== 407 && response.status < 500
  result = { ok, status: response.status, errorCode: ok ? '' : `HTTP_${response.status}` }
}
catch (error) {
  result = { ok: false, status: 0, errorCode: safeErrorCode(error) }
}
finally {
  try {
    await dispatcher?.close()
  }
  catch (closeError) {
    void closeError
  }
}
process.stdout.write(`${JSON.stringify(result)}\n`)
"#;

/// User-selected source of the application's outbound proxy configuration.
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum NetworkProxyMode {
    /// Ignore ambient proxy variables and connect directly.
    #[default]
    Direct,
    /// Read fixed HTTP and HTTPS endpoints from macOS System Configuration.
    System,
    /// Use the explicitly persisted HTTP and HTTPS proxy URLs.
    Custom,
}

impl NetworkProxyMode {
    fn as_env(self) -> &'static str {
        match self {
            Self::Direct => "direct",
            Self::System => "system",
            Self::Custom => "custom",
        }
    }
}

/// Trust source active for one native or Node reachability test.
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum NetworkCaSource {
    /// Use the operating system trust store.
    #[default]
    System,
    /// Supplement system trust with a validated `NODE_EXTRA_CA_CERTS` value.
    Environment,
    /// Use the operating system trust store plus one selected PEM bundle.
    Custom,
}

impl NetworkCaSource {
    fn as_env(self) -> &'static str {
        match self {
            Self::System => "system",
            Self::Environment => "environment",
            Self::Custom => "custom",
        }
    }
}

/// Persisted application-wide network proxy preferences.
#[derive(Clone, Debug, Default, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct NetworkProxySettings {
    #[serde(default)]
    pub mode: NetworkProxyMode,
    #[serde(default)]
    pub http_proxy: String,
    #[serde(default)]
    pub https_proxy: String,
    #[serde(default)]
    pub no_proxy: String,
    #[serde(default)]
    pub ca_certificate_path: String,
}

/// Validated proxy values fixed for one desktop-process lifetime.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ResolvedNetworkProxy {
    pub mode: NetworkProxyMode,
    http_proxy: Option<Url>,
    https_proxy: Option<Url>,
    no_proxy: String,
    ca_certificate_path: Option<PathBuf>,
    ca_source: NetworkCaSource,
}

/// Browser-safe proxy values with credentials structurally excluded.
#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EffectiveNetworkProxy {
    pub mode: NetworkProxyMode,
    pub http_proxy: String,
    pub https_proxy: String,
    pub no_proxy: String,
    pub ca_certificate_path: String,
    pub ca_source: NetworkCaSource,
}

/// Current macOS fixed proxy detection result.
#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemNetworkProxy {
    pub supported: bool,
    pub configured: bool,
    pub http_proxy: String,
    pub https_proxy: String,
    pub no_proxy: String,
    pub auto_config_url: String,
    pub error: String,
}

/// Initial state consumed by the General network-proxy settings card.
#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NetworkProxySnapshot {
    pub settings: NetworkProxySettings,
    pub system: SystemNetworkProxy,
    pub effective: Option<EffectiveNetworkProxy>,
    pub effective_error: String,
}

/// Result of connecting to the fixed ChatGPT reachability endpoint.
#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NetworkProxyTestResult {
    pub ok: bool,
    pub status: u16,
    pub proxied: bool,
    pub error_code: String,
    pub proxy_mode: NetworkProxyMode,
    pub ca_source: NetworkCaSource,
}

/// Candidate native and Node results produced from the same resolved policy.
#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NetworkProxyPreflightResult {
    pub native: NetworkProxyTestResult,
    pub node: NetworkProxyTestResult,
}

/// Save outcome that persists only after both candidate paths are reachable.
#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NetworkProxySaveResult {
    pub saved: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub snapshot: Option<NetworkProxySnapshot>,
    pub preflight: NetworkProxyPreflightResult,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct NodePreflightOutput {
    ok: bool,
    status: u16,
    error_code: String,
}

impl ResolvedNetworkProxy {
    fn direct(ca_certificate_path: Option<PathBuf>, ca_source: NetworkCaSource) -> Self {
        Self {
            mode: NetworkProxyMode::Direct,
            http_proxy: None,
            https_proxy: None,
            no_proxy: normalize_no_proxy("").expect("fixed local bypass list is valid"),
            ca_certificate_path,
            ca_source,
        }
    }

    fn effective(&self) -> EffectiveNetworkProxy {
        EffectiveNetworkProxy {
            mode: self.mode,
            http_proxy: self
                .http_proxy
                .as_ref()
                .map(Url::as_str)
                .unwrap_or_default()
                .to_string(),
            ca_source: self.ca_source,
            https_proxy: self
                .https_proxy
                .as_ref()
                .map(Url::as_str)
                .unwrap_or_default()
                .to_string(),
            no_proxy: self.no_proxy.clone(),
            ca_certificate_path: self
                .ca_certificate_path
                .as_ref()
                .and_then(|path| path.to_str())
                .unwrap_or_default()
                .to_string(),
        }
    }

    /// Whether any outbound protocol is configured to use a proxy.
    pub fn is_proxied(&self) -> bool {
        self.http_proxy.is_some() || self.https_proxy.is_some()
    }

    /// Selected additional CA path, when one was validated at application boot.
    pub fn ca_certificate_path(&self) -> Option<&Path> {
        self.ca_certificate_path.as_deref()
    }

    fn ca_source(&self) -> NetworkCaSource {
        self.ca_source
    }
}

/// Resolve one selection with an explicit CA before validated launch-environment trust.
pub fn resolve(settings: &NetworkProxySettings) -> Result<ResolvedNetworkProxy, String> {
    let inherited_ca = if settings.ca_certificate_path.trim().is_empty() {
        detect_environment_ca_certificate()?
    } else {
        None
    };
    resolve_with_environment_ca(settings, inherited_ca.as_deref())
}

#[cfg(test)]
pub(crate) fn resolve_without_environment_ca(
    settings: &NetworkProxySettings,
) -> Result<ResolvedNetworkProxy, String> {
    resolve_with_environment_ca(settings, None)
}

fn resolve_with_environment_ca(
    settings: &NetworkProxySettings,
    inherited_ca: Option<&OsStr>,
) -> Result<ResolvedNetworkProxy, String> {
    validate_inactive_custom_fields(settings)?;
    let (ca_certificate_path, ca_source) = resolve_ca_source(settings, inherited_ca)?;
    match settings.mode {
        NetworkProxyMode::Direct => {
            Ok(ResolvedNetworkProxy::direct(ca_certificate_path, ca_source))
        }
        NetworkProxyMode::Custom => resolve_custom(settings, ca_certificate_path, ca_source),
        NetworkProxyMode::System => {
            let detected = detect_system_proxy();
            if !detected.supported {
                return Err(detected.error);
            }
            Ok(ResolvedNetworkProxy {
                mode: NetworkProxyMode::System,
                http_proxy: parse_optional_proxy_url("httpProxy", &detected.http_proxy)?,
                https_proxy: parse_optional_proxy_url("httpsProxy", &detected.https_proxy)?,
                no_proxy: normalize_no_proxy(&detected.no_proxy)?,
                ca_certificate_path,
                ca_source,
            })
        }
    }
}

fn resolve_custom(
    settings: &NetworkProxySettings,
    ca_certificate_path: Option<PathBuf>,
    ca_source: NetworkCaSource,
) -> Result<ResolvedNetworkProxy, String> {
    let http_proxy = parse_optional_proxy_url("httpProxy", &settings.http_proxy)?;
    let https_proxy = parse_optional_proxy_url("httpsProxy", &settings.https_proxy)?;
    if http_proxy.is_none() || https_proxy.is_none() {
        return Err("network-proxy-custom-http-and-https-required".into());
    }
    let (http_proxy, https_proxy) = normalize_loopback_proxy_pair(http_proxy, https_proxy);
    Ok(ResolvedNetworkProxy {
        mode: NetworkProxyMode::Custom,
        http_proxy,
        https_proxy,
        no_proxy: normalize_no_proxy(&settings.no_proxy)?,
        ca_certificate_path,
        ca_source,
    })
}

fn normalize_loopback_proxy_pair(
    http_proxy: Option<Url>,
    mut https_proxy: Option<Url>,
) -> (Option<Url>, Option<Url>) {
    let Some(http) = http_proxy.as_ref() else {
        return (http_proxy, https_proxy);
    };
    let Some(https) = https_proxy.as_mut() else {
        return (http_proxy, https_proxy);
    };
    let same_endpoint = http
        .host_str()
        .zip(https.host_str())
        .is_some_and(|(left, right)| {
            left.eq_ignore_ascii_case(right)
                && http.port_or_known_default() == https.port_or_known_default()
        });
    if http.scheme() == "http"
        && https.scheme() == "https"
        && same_endpoint
        && is_loopback_host(http.host())
    {
        https
            .set_scheme("http")
            .expect("http is an accepted proxy URL scheme");
    }
    (http_proxy, https_proxy)
}

fn is_loopback_host(host: Option<Host<&str>>) -> bool {
    match host {
        Some(Host::Domain(value)) => value.eq_ignore_ascii_case("localhost"),
        Some(Host::Ipv4(value)) => value.is_loopback(),
        Some(Host::Ipv6(value)) => value.is_loopback(),
        None => false,
    }
}

fn validate_inactive_custom_fields(settings: &NetworkProxySettings) -> Result<(), String> {
    parse_optional_proxy_url("httpProxy", &settings.http_proxy)?;
    parse_optional_proxy_url("httpsProxy", &settings.https_proxy)?;
    normalize_no_proxy(&settings.no_proxy)?;
    Ok(())
}

fn parse_optional_proxy_url(field: &str, raw: &str) -> Result<Option<Url>, String> {
    let raw = raw.trim();
    if raw.is_empty() {
        return Ok(None);
    }
    if raw.len() > MAX_PROXY_URL_LENGTH {
        return Err(format!("network-proxy-url-too-long:{field}"));
    }
    let url = Url::parse(raw).map_err(|_| format!("network-proxy-url-invalid:{field}"))?;
    if !matches!(url.scheme(), "http" | "https") {
        return Err(format!("network-proxy-scheme-unsupported:{field}"));
    }
    if url.host_str().is_none()
        || !url.username().is_empty()
        || url.password().is_some()
        || !matches!(url.path(), "" | "/")
        || url.query().is_some()
        || url.fragment().is_some()
    {
        return Err(format!("network-proxy-url-invalid:{field}"));
    }
    Ok(Some(url))
}

fn normalize_no_proxy(raw: &str) -> Result<String, String> {
    if raw.len() > MAX_NO_PROXY_LENGTH || raw.chars().any(char::is_control) {
        return Err("network-proxy-no-proxy-invalid".into());
    }
    let mut values = Vec::new();
    let mut seen = HashSet::new();
    for value in LOCAL_BYPASS
        .into_iter()
        .chain(raw.split(',').map(str::trim))
    {
        if value.is_empty() || value == "<local>" {
            continue;
        }
        let key = value.to_ascii_lowercase();
        if seen.insert(key) {
            values.push(value.to_string());
        }
    }
    Ok(values.join(","))
}

fn resolve_ca_source(
    settings: &NetworkProxySettings,
    inherited_ca: Option<&OsStr>,
) -> Result<(Option<PathBuf>, NetworkCaSource), String> {
    if !settings.ca_certificate_path.trim().is_empty() {
        return resolve_ca_certificate(&settings.ca_certificate_path)
            .map(|path| (path, NetworkCaSource::Custom));
    }
    let Some(raw) = inherited_ca else {
        return Ok((None, NetworkCaSource::System));
    };
    let raw = raw
        .to_str()
        .ok_or_else(|| "network-proxy-ca-path-invalid".to_string())?;
    if raw.trim().is_empty() {
        return Ok((None, NetworkCaSource::System));
    }
    resolve_ca_certificate(raw).map(|path| (path, NetworkCaSource::Environment))
}

fn detect_environment_ca_certificate() -> Result<Option<OsString>, String> {
    if let Some(value) = std::env::var_os("NODE_EXTRA_CA_CERTS") {
        return Ok(Some(value));
    }
    #[cfg(target_os = "macos")]
    {
        let output = match Command::new("/bin/launchctl")
            .args(["getenv", "NODE_EXTRA_CA_CERTS"])
            .output()
        {
            Ok(output) if output.status.success() => output,
            Ok(_) | Err(_) => return Ok(None),
        };
        let value = String::from_utf8(output.stdout)
            .map_err(|_| "network-proxy-ca-path-invalid".to_string())?;
        let value = value.trim();
        if !value.is_empty() {
            return Ok(Some(OsString::from(value)));
        }
    }
    Ok(None)
}

fn resolve_ca_certificate(raw: &str) -> Result<Option<PathBuf>, String> {
    let raw = raw.trim();
    if raw.is_empty() {
        return Ok(None);
    }
    if raw.len() > MAX_CA_CERTIFICATE_PATH_LENGTH || raw.chars().any(char::is_control) {
        return Err("network-proxy-ca-path-invalid".into());
    }
    let path = PathBuf::from(raw);
    if !path.is_absolute() {
        return Err("network-proxy-ca-path-not-absolute".into());
    }
    let canonical = fs::canonicalize(&path).map_err(|_| "network-proxy-ca-file-missing")?;
    validate_ca_certificate_file(&canonical)?;
    Ok(Some(canonical))
}

fn validate_ca_certificate_file(path: &Path) -> Result<(), String> {
    validate_ca_certificate_file_at(path, ASN1Time::now())
}

fn validate_ca_certificate_file_at(path: &Path, now: ASN1Time) -> Result<(), String> {
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .map(str::to_ascii_lowercase)
        .unwrap_or_default();
    if !matches!(extension.as_str(), "pem" | "crt") {
        return Err("network-proxy-ca-extension-unsupported".into());
    }
    let metadata = fs::metadata(path).map_err(|_| "network-proxy-ca-file-missing")?;
    if !metadata.is_file() {
        return Err("network-proxy-ca-file-not-regular".into());
    }
    if metadata.len() == 0 || metadata.len() > MAX_CA_CERTIFICATE_BYTES {
        return Err("network-proxy-ca-file-size-invalid".into());
    }
    let certificates = load_ca_certificates_unchecked(path)?;
    for certificate in certificates {
        let (remainder, parsed) = parse_x509_certificate(certificate.as_ref())
            .map_err(|_| "network-proxy-ca-certificate-invalid")?;
        if !remainder.is_empty() {
            return Err("network-proxy-ca-certificate-invalid".into());
        }
        if now < parsed.validity().not_before {
            return Err("network-proxy-ca-certificate-not-yet-valid".into());
        }
        if now > parsed.validity().not_after {
            return Err("network-proxy-ca-certificate-expired".into());
        }
    }
    Ok(())
}

fn load_ca_certificates(
    path: &Path,
) -> Result<Vec<rustls::pki_types::CertificateDer<'static>>, String> {
    validate_ca_certificate_file(path)?;
    load_ca_certificates_unchecked(path)
}

fn load_ca_certificates_unchecked(
    path: &Path,
) -> Result<Vec<rustls::pki_types::CertificateDer<'static>>, String> {
    let file = fs::File::open(path).map_err(|_| "network-proxy-ca-file-unreadable")?;
    let certificates = rustls_pemfile::certs(&mut BufReader::new(file))
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| "network-proxy-ca-pem-invalid")?;
    if certificates.is_empty() {
        return Err("network-proxy-ca-pem-invalid".into());
    }
    Ok(certificates)
}

/// Apply system CA trust and a resolved proxy policy after removing ambient network options.
pub fn apply_to_command(command: &mut Command, proxy: &ResolvedNetworkProxy) {
    for name in CHILD_NETWORK_ENV_NAMES {
        command.env_remove(name);
    }
    command.env("NODE_OPTIONS", NODE_SYSTEM_CA_OPTION);
    command.env("YOURBUDDY_NETWORK_PROXY_MODE", proxy.mode.as_env());
    command.env("YOURBUDDY_NETWORK_CA_SOURCE", proxy.ca_source.as_env());
    if let Some(path) = proxy.ca_certificate_path() {
        command.env("NODE_EXTRA_CA_CERTS", path);
    }
    let Some(http_proxy) = proxy.http_proxy.as_ref() else {
        if let Some(https_proxy) = proxy.https_proxy.as_ref() {
            set_proxy_env(command, "HTTPS_PROXY", "https_proxy", https_proxy.as_str());
            set_no_proxy_env(command, &proxy.no_proxy);
            command.env("NODE_USE_ENV_PROXY", "1");
        }
        return;
    };
    set_proxy_env(command, "HTTP_PROXY", "http_proxy", http_proxy.as_str());
    if let Some(https_proxy) = proxy.https_proxy.as_ref() {
        set_proxy_env(command, "HTTPS_PROXY", "https_proxy", https_proxy.as_str());
    }
    set_no_proxy_env(command, &proxy.no_proxy);
    command.env("NODE_USE_ENV_PROXY", "1");
}

/// Arguments that replace ambient proxy variables through WSL `/usr/bin/env`.
pub fn env_arguments(
    proxy: &ResolvedNetworkProxy,
    node_ca_certificate_path: Option<&str>,
) -> Vec<String> {
    let mut assignments = Vec::new();
    for name in CHILD_NETWORK_ENV_NAMES {
        assignments.push("-u".into());
        assignments.push(name.into());
    }
    assignments.push(format!("NODE_OPTIONS={NODE_SYSTEM_CA_OPTION}"));
    assignments.push(format!(
        "YOURBUDDY_NETWORK_PROXY_MODE={}",
        proxy.mode.as_env()
    ));
    assignments.push(format!(
        "YOURBUDDY_NETWORK_CA_SOURCE={}",
        proxy.ca_source.as_env()
    ));
    if let Some(path) = node_ca_certificate_path {
        assignments.push(format!("NODE_EXTRA_CA_CERTS={path}"));
    }
    if let Some(url) = &proxy.http_proxy {
        assignments.push(format!("HTTP_PROXY={}", url.as_str()));
        assignments.push(format!("http_proxy={}", url.as_str()));
    }
    if let Some(url) = &proxy.https_proxy {
        assignments.push(format!("HTTPS_PROXY={}", url.as_str()));
        assignments.push(format!("https_proxy={}", url.as_str()));
    }
    if proxy.is_proxied() {
        assignments.push(format!("NO_PROXY={}", proxy.no_proxy));
        assignments.push(format!("no_proxy={}", proxy.no_proxy));
        assignments.push("NODE_USE_ENV_PROXY=1".into());
    }
    assignments
}

fn set_proxy_env(command: &mut Command, upper: &str, lower: &str, value: &str) {
    command.env(upper, value).env(lower, value);
}

fn set_no_proxy_env(command: &mut Command, value: &str) {
    command.env("NO_PROXY", value).env("no_proxy", value);
}

/// Apply a resolved policy to an application-owned reqwest client.
pub fn apply_to_client(
    mut builder: ClientBuilder,
    proxy: &ResolvedNetworkProxy,
) -> Result<ClientBuilder, String> {
    let tls = build_tls_config(proxy)?;
    builder = builder.use_preconfigured_tls(tls).no_proxy();
    let no_proxy = NoProxy::from_string(&proxy.no_proxy);
    if let Some(url) = &proxy.http_proxy {
        let configured = Proxy::http(url.as_str())
            .map_err(|_| "network-proxy-client-config-invalid".to_string())?
            .no_proxy(no_proxy.clone());
        builder = builder.proxy(configured);
    }
    if let Some(url) = &proxy.https_proxy {
        let configured = Proxy::https(url.as_str())
            .map_err(|_| "network-proxy-client-config-invalid".to_string())?
            .no_proxy(no_proxy);
        builder = builder.proxy(configured);
    }
    Ok(builder)
}

fn build_tls_config(proxy: &ResolvedNetworkProxy) -> Result<ClientConfig, String> {
    let tls_builder = ClientConfig::builder();
    let verifier = match proxy.ca_certificate_path() {
        Some(path) => Verifier::new_with_extra_roots(
            load_ca_certificates(path)?,
            tls_builder.crypto_provider().clone(),
        ),
        None => Verifier::new(tls_builder.crypto_provider().clone()),
    }
    .map_err(|_| "network-proxy-platform-verifier-init-failed".to_string())?;
    let tls = tls_builder
        .dangerous()
        .with_custom_certificate_verifier(Arc::new(verifier))
        .with_no_client_auth();
    Ok(tls)
}

/// Apply the HTTPS proxy, or explicit no-proxy mode, to the signed updater.
pub fn apply_to_updater(
    mut builder: UpdaterBuilder,
    proxy: &ResolvedNetworkProxy,
) -> Result<UpdaterBuilder, String> {
    let tls = build_tls_config(proxy)?;
    builder = builder.configure_client(move |client| client.use_preconfigured_tls(tls.clone()));
    if let Some(url) = proxy.https_proxy.clone() {
        builder = builder.proxy(url);
    } else {
        builder = builder.no_proxy();
    }
    Ok(builder)
}

/// Load the current preferences and detect macOS fixed proxy endpoints.
#[tauri::command]
pub fn get_network_proxy_settings() -> NetworkProxySnapshot {
    snapshot(desktop_settings::load().network_proxy)
}

/// Choose and validate one PEM CA bundle without exposing a generic file picker to the WebView.
#[tauri::command]
pub async fn select_ca_certificate(app: AppHandle) -> Result<Option<String>, String> {
    let Some(selected) = app
        .dialog()
        .file()
        .set_title("CA")
        .add_filter("PEM / CRT", &["pem", "crt"])
        .blocking_pick_file()
    else {
        return Ok(None);
    };
    let path = selected
        .into_path()
        .map_err(|_| "network-proxy-ca-path-invalid")?;
    let resolved = resolve_ca_certificate(path.to_str().ok_or("network-proxy-ca-path-invalid")?)?
        .ok_or("network-proxy-ca-path-invalid")?;
    Ok(Some(
        resolved
            .to_str()
            .ok_or("network-proxy-ca-path-invalid")?
            .to_string(),
    ))
}

/// Preflight and persist one selection; the running process keeps its old policy until restart.
#[tauri::command]
pub async fn save_network_proxy_settings(
    mut settings: NetworkProxySettings,
    runtime: State<'_, DesktopRuntime>,
) -> Result<NetworkProxySaveResult, String> {
    let resolved = resolve(&settings)?;
    let preflight = preflight_proxy(&resolved, &runtime.plugin_target).await;
    if !preflight.native.ok || !preflight.node.ok {
        return Ok(NetworkProxySaveResult {
            saved: false,
            snapshot: None,
            preflight,
        });
    }
    normalize_persisted_settings(&mut settings, &resolved)?;
    let mut desktop = desktop_settings::load();
    desktop.network_proxy = settings.clone();
    desktop_settings::save(&desktop)?;
    Ok(NetworkProxySaveResult {
        saved: true,
        snapshot: Some(snapshot(settings)),
        preflight,
    })
}

/// Test the native client and a fresh managed Node process with one candidate selection.
#[tauri::command]
pub async fn test_network_proxy_settings(
    settings: NetworkProxySettings,
    runtime: State<'_, DesktopRuntime>,
) -> Result<NetworkProxyPreflightResult, String> {
    let proxy = resolve(&settings)?;
    Ok(preflight_proxy(&proxy, &runtime.plugin_target).await)
}

async fn preflight_proxy(
    proxy: &ResolvedNetworkProxy,
    target: &PluginRunTarget,
) -> NetworkProxyPreflightResult {
    let (native, node) = tokio::join!(test_native_proxy(proxy), test_node_proxy(proxy, target));
    NetworkProxyPreflightResult { native, node }
}

async fn test_native_proxy(proxy: &ResolvedNetworkProxy) -> NetworkProxyTestResult {
    let client = match apply_to_client(
        reqwest::Client::builder()
            .user_agent("YourBuddy-Harness/proxy-test")
            .timeout(PROXY_TEST_TIMEOUT)
            .redirect(reqwest::redirect::Policy::limited(3)),
        &proxy,
    ) {
        Ok(builder) => match builder.build() {
            Ok(client) => client,
            Err(_) => return failed_test_result(proxy, 0, "CLIENT_BUILD_FAILED"),
        },
        Err(_) => return failed_test_result(proxy, 0, "PLATFORM_TRUST_INIT_FAILED"),
    };
    let response = match client.get(PROXY_TEST_URL).send().await {
        Ok(response) => response,
        Err(error) => return failed_test_result(proxy, 0, reqwest_error_code(&error)),
    };
    let status = response.status();
    if status.as_u16() == 407 || status.is_server_error() {
        return failed_test_result(proxy, status.as_u16(), &format!("HTTP_{}", status.as_u16()));
    }
    successful_test_result(proxy, status.as_u16())
}

async fn test_node_proxy(
    proxy: &ResolvedNetworkProxy,
    target: &PluginRunTarget,
) -> NetworkProxyTestResult {
    let mut command = match node_preflight_command(proxy, target) {
        Ok(command) => command,
        Err(error_code) => return failed_test_result(proxy, 0, error_code),
    };
    command
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::null());
    hide_console(&mut command);
    let mut command = tokio::process::Command::from(command);
    command.kill_on_drop(true);
    let mut child = match command.spawn() {
        Ok(child) => child,
        Err(_) => return failed_test_result(proxy, 0, "NODE_PREFLIGHT_SPAWN_FAILED"),
    };
    let Some(stdout) = child.stdout.take() else {
        let _ = child.kill().await;
        return failed_test_result(proxy, 0, "NODE_PREFLIGHT_OUTPUT_FAILED");
    };
    let output = tokio::spawn(async move {
        let mut bytes = Vec::new();
        stdout
            .take(MAX_NODE_PREFLIGHT_OUTPUT_BYTES + 1)
            .read_to_end(&mut bytes)
            .await
            .map(|_| bytes)
    });
    let status = match tokio::time::timeout(NODE_PREFLIGHT_TIMEOUT, child.wait()).await {
        Ok(Ok(status)) => status,
        Ok(Err(_)) => {
            let _ = child.kill().await;
            let _ = output.await;
            return failed_test_result(proxy, 0, "NODE_PREFLIGHT_WAIT_FAILED");
        }
        Err(_) => {
            let _ = child.kill().await;
            let _ = output.await;
            return failed_test_result(proxy, 0, "NODE_PREFLIGHT_TIMEOUT");
        }
    };
    let bytes = match output.await {
        Ok(Ok(bytes)) if bytes.len() <= MAX_NODE_PREFLIGHT_OUTPUT_BYTES as usize => bytes,
        _ => return failed_test_result(proxy, 0, "NODE_PREFLIGHT_OUTPUT_FAILED"),
    };
    if !status.success() {
        return failed_test_result(proxy, 0, "NODE_PREFLIGHT_EXIT_FAILED");
    }
    let parsed: NodePreflightOutput = match serde_json::from_slice(&bytes) {
        Ok(parsed) => parsed,
        Err(_) => return failed_test_result(proxy, 0, "NODE_PREFLIGHT_OUTPUT_INVALID"),
    };
    if !valid_node_preflight_output(&parsed) {
        return failed_test_result(proxy, 0, "NODE_PREFLIGHT_OUTPUT_INVALID");
    }
    if parsed.ok {
        successful_test_result(proxy, parsed.status)
    } else {
        failed_test_result(proxy, parsed.status, &parsed.error_code)
    }
}

fn node_preflight_command(
    proxy: &ResolvedNetworkProxy,
    target: &PluginRunTarget,
) -> Result<Command, &'static str> {
    match target {
        PluginRunTarget::Windows {
            node, harness_root, ..
        } => {
            let cli_package = harness_root.join("apps").join("cli").join("package.json");
            if !node.is_file() || !cli_package.is_file() {
                return Err("NODE_RUNTIME_UNAVAILABLE");
            }
            let mut command = Command::new(node);
            command
                .current_dir(harness_root)
                .args(["--input-type=module", "--eval", NODE_PREFLIGHT_SOURCE])
                .arg(cli_package)
                .arg(PROXY_TEST_URL);
            apply_to_command(&mut command, proxy);
            Ok(command)
        }
        PluginRunTarget::Wsl(paths) => {
            let cli_package = format!("{}/apps/cli/package.json", paths.linux_harness_root);
            let mut command = Command::new("wsl.exe");
            for name in CHILD_NETWORK_ENV_NAMES {
                command.env_remove(name);
            }
            command.args([
                "-d",
                &paths.distro,
                "--cd",
                &paths.linux_harness_root,
                "--exec",
                "/usr/bin/env",
            ]);
            command.args(
                crate::runtime::wsl::network_env_arguments(proxy)
                    .map_err(|_| "NODE_PREFLIGHT_CONFIG_INVALID")?,
            );
            command
                .arg(&paths.linux_node)
                .args(["--input-type=module", "--eval", NODE_PREFLIGHT_SOURCE])
                .arg(cli_package)
                .arg(PROXY_TEST_URL);
            Ok(command)
        }
    }
}

fn valid_node_preflight_output(output: &NodePreflightOutput) -> bool {
    let status_valid = output.status <= 599;
    let code_valid = output.error_code.len() <= 64
        && output
            .error_code
            .chars()
            .all(|value| value.is_ascii_uppercase() || value.is_ascii_digit() || value == '_');
    status_valid
        && code_valid
        && if output.ok {
            output.status >= 100 && output.error_code.is_empty()
        } else {
            !output.error_code.is_empty()
        }
}

fn normalize_persisted_settings(
    settings: &mut NetworkProxySettings,
    resolved: &ResolvedNetworkProxy,
) -> Result<(), String> {
    if settings.mode == NetworkProxyMode::Custom {
        settings.http_proxy = resolved
            .http_proxy
            .as_ref()
            .map(Url::as_str)
            .unwrap_or_default()
            .to_string();
        settings.https_proxy = resolved
            .https_proxy
            .as_ref()
            .map(Url::as_str)
            .unwrap_or_default()
            .to_string();
    }
    settings.ca_certificate_path = if settings.ca_certificate_path.trim().is_empty() {
        String::new()
    } else {
        resolved
            .ca_certificate_path()
            .and_then(Path::to_str)
            .ok_or_else(|| "network-proxy-ca-path-invalid".to_string())?
            .to_string()
    };
    Ok(())
}

fn successful_test_result(proxy: &ResolvedNetworkProxy, status: u16) -> NetworkProxyTestResult {
    NetworkProxyTestResult {
        ok: true,
        status,
        proxied: proxy.is_proxied(),
        error_code: String::new(),
        proxy_mode: proxy.mode,
        ca_source: proxy.ca_source(),
    }
}

fn failed_test_result(
    proxy: &ResolvedNetworkProxy,
    status: u16,
    error_code: &str,
) -> NetworkProxyTestResult {
    NetworkProxyTestResult {
        ok: false,
        status,
        proxied: proxy.is_proxied(),
        error_code: error_code.to_string(),
        proxy_mode: proxy.mode,
        ca_source: proxy.ca_source(),
    }
}

fn reqwest_error_code(error: &reqwest::Error) -> &'static str {
    let mut current: Option<&(dyn StdError + 'static)> = Some(error);
    while let Some(source) = current {
        if let Some(tls_error) = source.downcast_ref::<rustls::Error>() {
            return rustls_error_code(tls_error);
        }
        current = source.source();
    }
    if error.is_timeout() {
        "REQUEST_TIMEOUT"
    } else if error.is_connect() {
        "CONNECT_FAILED"
    } else {
        "REQUEST_FAILED"
    }
}

fn rustls_error_code(error: &rustls::Error) -> &'static str {
    let rustls::Error::InvalidCertificate(certificate) = error else {
        return "TLS_HANDSHAKE_FAILED";
    };
    match certificate {
        CertificateError::BadEncoding => "CERTIFICATE_BAD_ENCODING",
        CertificateError::Expired | CertificateError::ExpiredContext { .. } => {
            "CERTIFICATE_EXPIRED"
        }
        CertificateError::NotValidYet | CertificateError::NotValidYetContext { .. } => {
            "CERTIFICATE_NOT_YET_VALID"
        }
        CertificateError::Revoked => "CERTIFICATE_REVOKED",
        CertificateError::UnknownIssuer => "UNKNOWN_ISSUER",
        CertificateError::BadSignature => "CERTIFICATE_BAD_SIGNATURE",
        CertificateError::NotValidForName | CertificateError::NotValidForNameContext { .. } => {
            "CERTIFICATE_NAME_MISMATCH"
        }
        _ => "CERTIFICATE_INVALID",
    }
}

fn snapshot(settings: NetworkProxySettings) -> NetworkProxySnapshot {
    let system = detect_system_proxy();
    match resolve(&settings) {
        Ok(resolved) => NetworkProxySnapshot {
            settings,
            system,
            effective: Some(resolved.effective()),
            effective_error: String::new(),
        },
        Err(error) => NetworkProxySnapshot {
            settings,
            system,
            effective: None,
            effective_error: error,
        },
    }
}

/// Read fixed proxy endpoints from macOS without importing the launch environment.
pub fn detect_system_proxy() -> SystemNetworkProxy {
    #[cfg(target_os = "macos")]
    {
        let output = match Command::new("/usr/sbin/scutil").arg("--proxy").output() {
            Ok(output) if output.status.success() => output,
            Ok(output) => {
                return unsupported_system_proxy(format!(
                    "network-proxy-system-command-exit:{}",
                    output.status.code().unwrap_or(-1)
                ));
            }
            Err(error) => {
                return unsupported_system_proxy(format!(
                    "network-proxy-system-command-failed:{error}"
                ));
            }
        };
        return parse_scutil_proxy(&String::from_utf8_lossy(&output.stdout));
    }
    #[cfg(not(target_os = "macos"))]
    {
        unsupported_system_proxy("network-proxy-system-unsupported-platform".into())
    }
}

fn unsupported_system_proxy(error: String) -> SystemNetworkProxy {
    SystemNetworkProxy {
        supported: false,
        configured: false,
        http_proxy: String::new(),
        https_proxy: String::new(),
        no_proxy: normalize_no_proxy("").expect("fixed local bypass list is valid"),
        auto_config_url: String::new(),
        error,
    }
}

fn parse_scutil_proxy(raw: &str) -> SystemNetworkProxy {
    let mut values = std::collections::HashMap::<String, String>::new();
    let mut exceptions = Vec::new();
    let mut reading_exceptions = false;
    for raw_line in raw.lines() {
        let line = raw_line.trim();
        if reading_exceptions {
            if line == "}" {
                reading_exceptions = false;
                continue;
            }
            if let Some((_, value)) = line.split_once(" : ") {
                exceptions.push(value.trim().to_string());
            }
            continue;
        }
        if line.starts_with("ExceptionsList :") {
            reading_exceptions = true;
            continue;
        }
        if let Some((key, value)) = line.split_once(" : ") {
            values.insert(key.trim().to_string(), value.trim().to_string());
        }
    }

    let auto_config_url = values
        .get("ProxyAutoConfigURLString")
        .cloned()
        .unwrap_or_default();
    let uses_auto_config =
        enabled(&values, "ProxyAutoConfigEnable") || enabled(&values, "ProxyAutoDiscoveryEnable");
    let no_proxy = match normalize_no_proxy(&exceptions.join(",")) {
        Ok(value) => value,
        Err(error) => return unsupported_system_proxy(error),
    };
    let http_proxy = match system_endpoint(&values, "HTTP") {
        Ok(value) => value,
        Err(error) => return unsupported_system_proxy(error),
    };
    let https_proxy = match system_endpoint(&values, "HTTPS") {
        Ok(value) => value,
        Err(error) => return unsupported_system_proxy(error),
    };

    if uses_auto_config {
        return SystemNetworkProxy {
            supported: false,
            configured: true,
            http_proxy,
            https_proxy,
            no_proxy,
            auto_config_url,
            error: "network-proxy-system-auto-config-unsupported".into(),
        };
    }
    if !http_proxy.is_empty() && https_proxy.is_empty() {
        return SystemNetworkProxy {
            supported: false,
            configured: true,
            http_proxy,
            https_proxy,
            no_proxy,
            auto_config_url,
            error: "network-proxy-system-http-only-unsupported".into(),
        };
    }
    SystemNetworkProxy {
        supported: true,
        configured: !http_proxy.is_empty() || !https_proxy.is_empty(),
        http_proxy,
        https_proxy,
        no_proxy,
        auto_config_url,
        error: String::new(),
    }
}

fn enabled(values: &std::collections::HashMap<String, String>, key: &str) -> bool {
    values.get(key).is_some_and(|value| value == "1")
}

fn system_endpoint(
    values: &std::collections::HashMap<String, String>,
    prefix: &str,
) -> Result<String, String> {
    if !enabled(values, &format!("{prefix}Enable")) {
        return Ok(String::new());
    }
    let host = values
        .get(&format!("{prefix}Proxy"))
        .map(String::as_str)
        .unwrap_or_default()
        .trim();
    let port = values
        .get(&format!("{prefix}Port"))
        .and_then(|value| value.parse::<u16>().ok());
    if host.is_empty() || port.is_none() || host.chars().any(char::is_whitespace) {
        return Err(format!("network-proxy-system-{prefix}-invalid"));
    }
    let host = if host.contains(':') && !host.starts_with('[') {
        format!("[{host}]")
    } else {
        host.to_string()
    };
    let value = format!("http://{host}:{}", port.expect("port checked above"));
    parse_optional_proxy_url(prefix, &value)?;
    Ok(value)
}

/// Log only mode, endpoint presence, and fixed trust behavior; proxy addresses can contain private hostnames.
pub fn log_active(proxy: &ResolvedNetworkProxy) {
    boot_log::info(&format!(
        "network proxy active mode={:?} http={} https={} ca={:?} nativeSystemTrust=true nodeSystemCa=true",
        proxy.mode,
        proxy.http_proxy.is_some(),
        proxy.https_proxy.is_some(),
        proxy.ca_source()
    ));
}

#[cfg(test)]
mod tests {
    use std::fs;
    use std::path::PathBuf;
    use std::process::Command;
    use std::sync::atomic::{AtomicU64, Ordering};
    use std::time::{SystemTime, UNIX_EPOCH};

    use rustls::CertificateError;
    use url::Url;
    use x509_parser::time::ASN1Time;

    use super::{
        apply_to_client, apply_to_command, normalize_persisted_settings, parse_scutil_proxy,
        resolve_with_environment_ca, resolve_without_environment_ca as resolve, rustls_error_code,
        validate_ca_certificate_file_at, NetworkCaSource, NetworkProxyMode, NetworkProxySettings,
    };

    const TEST_CA_PEM: &str = r#"-----BEGIN CERTIFICATE-----
MIIDHzCCAgegAwIBAgIUdxu5JjZXYXvUW+LuCAd0wISut78wDQYJKoZIhvcNAQEL
BQAwHzEdMBsGA1UEAwwUWGlhb0h1aSBUZXN0IFJvb3QgQ0EwHhcNMjYwOTAzMTYy
MzI5WhcNMzYwODMxMTYyMzI5WjAfMR0wGwYDVQQDDBRYaWFvSHVpIFRlc3QgUm9v
dCBDQTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBANPI+zzaoCxkeAxr
Yf6pLbY2Q9C3cnfuwY0fNAIlVWwZ15rBavFmtEagUw59k6cZ5uWlACjU+cZGp3fF
pfPO7FkYfvYKulFoFl6OBX1ywzAfjmY+jNh4cKPWNQ0GerEbyWaQCZZFSS0fN3qI
kMLiJZ1/0Du4TvF4UZFehQf5Bd+k3DHAo0pna2gWLqtqTtOo1r8snULEqoKAClB1
Z43u6ky1DK+NQe5dFiSYf2GdKfSLP0uKmnBJPTEVyv6usrXcoG4DVeiiRz73w7rp
iFvcgdu+5dpMF1+MnXI/bPV6/AXvo7Dc4zvdOlziMMappGGIT0H2eu2SzGbT3zqX
nuIJk98CAwEAAaNTMFEwHQYDVR0OBBYEFL05bkFo869nwAWspSKpvUQTbAifMB8G
A1UdIwQYMBaAFL05bkFo869nwAWspSKpvUQTbAifMA8GA1UdEwEB/wQFMAMBAf8w
DQYJKoZIhvcNAQELBQADggEBADX90WScMxdZJqgBeusQ1wZ3pf2mHocFRtyfFnmt
k5P7XslZ1ruvl/b7+uawCnqXBUKVWWcUpXIWg1gA3izZBRCd5Tu3bRjOZpK3ltjv
6SMn8KOMNMhUNzV7oObNmwaGQqnzBCbzxwRRb5WX2ZCm9DUpUWESrgiZvROt8eI+
Z3yTKEahVJukxCCUY5dflcgN0Yc7j0eymVN+uTIV31Mwbe6b4mVy3et25rpS3Wgv
taOR/eYw4rUVTZFOPqm8UnjHU/7A912wTNtw9zXTZ+NyB1Ime0FnVs5OYzeWAi9P
S6SwbXK80h7DuF0rHy94HjkjOYfkfNPnOccktVWMuUUJqLc=
-----END CERTIFICATE-----
"#;

    static NEXT_TEMP_FILE: AtomicU64 = AtomicU64::new(0);

    fn temp_file(extension: &str, contents: &str) -> PathBuf {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let path = std::env::temp_dir().join(format!(
            "yourbuddy-network-proxy-{}-{nonce}-{}.{extension}",
            std::process::id(),
            NEXT_TEMP_FILE.fetch_add(1, Ordering::Relaxed)
        ));
        fs::write(&path, contents).unwrap();
        path
    }

    fn custom() -> NetworkProxySettings {
        NetworkProxySettings {
            mode: NetworkProxyMode::Custom,
            http_proxy: "http://127.0.0.1:7890".into(),
            https_proxy: "http://127.0.0.1:7890".into(),
            no_proxy: "*.local,10.0.0.0/8".into(),
            ca_certificate_path: String::new(),
        }
    }

    #[test]
    fn parses_fixed_macos_proxy_and_required_bypass_hosts() {
        let detected = parse_scutil_proxy(
            r#"<dictionary> {
  ExceptionsList : <array> {
    0 : 127.0.0.1
    1 : *.local
    2 : <local>
  }
  HTTPEnable : 1
  HTTPPort : 7890
  HTTPProxy : 127.0.0.1
  HTTPSEnable : 1
  HTTPSPort : 7891
  HTTPSProxy : proxy.example
  ProxyAutoConfigEnable : 0
}"#,
        );
        assert!(detected.supported);
        assert!(detected.configured);
        assert_eq!(detected.http_proxy, "http://127.0.0.1:7890");
        assert_eq!(detected.https_proxy, "http://proxy.example:7891");
        assert_eq!(detected.no_proxy, "localhost,127.0.0.1,::1,*.local");
    }

    #[test]
    fn reports_pac_and_http_only_system_modes_as_unsupported() {
        let pac = parse_scutil_proxy(
            r#"<dictionary> {
  ProxyAutoConfigEnable : 1
  ProxyAutoConfigURLString : https://proxy.example/config.pac
}"#,
        );
        assert!(!pac.supported);
        assert_eq!(pac.error, "network-proxy-system-auto-config-unsupported");
        assert_eq!(pac.auto_config_url, "https://proxy.example/config.pac");

        let http_only = parse_scutil_proxy(
            r#"<dictionary> {
  HTTPEnable : 1
  HTTPPort : 7890
  HTTPProxy : 127.0.0.1
}"#,
        );
        assert!(!http_only.supported);
        assert_eq!(
            http_only.error,
            "network-proxy-system-http-only-unsupported"
        );
    }

    #[test]
    fn validates_custom_urls_without_persisting_credentials() {
        let resolved = resolve(&custom()).unwrap();
        assert!(resolved.is_proxied());
        for settings in [
            NetworkProxySettings {
                http_proxy: "socks5://127.0.0.1:7890".into(),
                ..custom()
            },
            NetworkProxySettings {
                https_proxy: "http://user:secret@127.0.0.1:7890".into(),
                ..custom()
            },
            NetworkProxySettings {
                https_proxy: String::new(),
                ..custom()
            },
        ] {
            assert!(resolve(&settings).is_err());
        }
    }

    #[test]
    fn normalizes_a_loopback_https_target_proxy_to_plain_http_connect() {
        let mut settings = custom();
        settings.https_proxy = "https://127.0.0.1:7890".into();
        let resolved = resolve(&settings).unwrap();
        assert_eq!(
            resolved.https_proxy.as_ref().map(Url::as_str),
            Some("http://127.0.0.1:7890/")
        );
        normalize_persisted_settings(&mut settings, &resolved).unwrap();
        assert_eq!(settings.http_proxy, "http://127.0.0.1:7890/");
        assert_eq!(settings.https_proxy, "http://127.0.0.1:7890/");

        let mut remote = custom();
        remote.http_proxy = "http://proxy.example:7890".into();
        remote.https_proxy = "https://proxy.example:7890".into();
        let resolved = resolve(&remote).unwrap();
        assert_eq!(
            resolved.https_proxy.as_ref().map(Url::as_str),
            Some("https://proxy.example:7890/")
        );
    }

    #[test]
    fn explicit_ca_precedes_a_validated_environment_ca() {
        let environment_ca = temp_file("crt", TEST_CA_PEM);
        let selected_ca = temp_file("pem", TEST_CA_PEM);
        let inherited = resolve_with_environment_ca(
            &NetworkProxySettings::default(),
            Some(environment_ca.as_os_str()),
        )
        .unwrap();
        assert_eq!(inherited.ca_source(), NetworkCaSource::Environment);
        assert_eq!(
            inherited.ca_certificate_path(),
            Some(fs::canonicalize(&environment_ca).unwrap().as_path())
        );
        let mut inherited_command = Command::new("node");
        apply_to_command(&mut inherited_command, &inherited);
        let inherited_environment: Vec<_> = inherited_command.get_envs().collect();
        assert!(inherited_environment.iter().any(|(name, value)| {
            *name == "NODE_EXTRA_CA_CERTS"
                && value.is_some_and(|value| value == fs::canonicalize(&environment_ca).unwrap())
        }));
        assert!(inherited_environment.iter().any(|(name, value)| {
            *name == "YOURBUDDY_NETWORK_CA_SOURCE"
                && value.is_some_and(|value| value == "environment")
        }));

        let settings = NetworkProxySettings {
            ca_certificate_path: selected_ca.to_string_lossy().into_owned(),
            ..NetworkProxySettings::default()
        };
        let selected =
            resolve_with_environment_ca(&settings, Some(environment_ca.as_os_str())).unwrap();
        assert_eq!(selected.ca_source(), NetworkCaSource::Custom);
        assert_eq!(
            selected.ca_certificate_path(),
            Some(fs::canonicalize(&selected_ca).unwrap().as_path())
        );
        fs::remove_file(environment_ca).unwrap();
        fs::remove_file(selected_ca).unwrap();
    }

    #[test]
    fn command_policy_replaces_ambient_proxy_variables_in_both_cases() {
        let mut direct_command = Command::new("node");
        direct_command.env("HTTP_PROXY", "http://ambient.invalid:1");
        direct_command.env("ALL_PROXY", "socks5://ambient.invalid:2");
        direct_command.env("NODE_OPTIONS", "--require=/tmp/ambient.cjs");
        direct_command.env("NODE_EXTRA_CA_CERTS", "/tmp/ambient.pem");
        apply_to_command(
            &mut direct_command,
            &resolve(&NetworkProxySettings::default()).unwrap(),
        );
        let direct_env: Vec<_> = direct_command.get_envs().collect();
        assert!(direct_env
            .iter()
            .any(|(name, value)| *name == "HTTP_PROXY" && value.is_none()));
        assert!(direct_env
            .iter()
            .any(|(name, value)| *name == "ALL_PROXY" && value.is_none()));
        assert!(direct_env.iter().any(|(name, value)| {
            *name == "NODE_OPTIONS" && value.is_some_and(|value| value == "--use-system-ca")
        }));
        assert!(direct_env
            .iter()
            .any(|(name, value)| *name == "NODE_EXTRA_CA_CERTS" && value.is_none()));
        assert!(direct_env.iter().any(|(name, value)| {
            *name == "YOURBUDDY_NETWORK_PROXY_MODE" && value.is_some_and(|value| value == "direct")
        }));
        assert!(direct_env.iter().any(|(name, value)| {
            *name == "YOURBUDDY_NETWORK_CA_SOURCE" && value.is_some_and(|value| value == "system")
        }));

        let mut proxied_command = Command::new("node");
        apply_to_command(&mut proxied_command, &resolve(&custom()).unwrap());
        let proxied_env: Vec<_> = proxied_command.get_envs().collect();
        assert!(proxied_env.iter().any(|(name, value)| {
            *name == "HTTPS_PROXY" && value.is_some_and(|value| value == "http://127.0.0.1:7890/")
        }));
        assert!(proxied_env.iter().any(|(name, value)| {
            *name == "NO_PROXY"
                && value.is_some_and(|value| value.to_string_lossy().contains("localhost"))
        }));
    }

    #[test]
    fn native_clients_accept_the_platform_certificate_verifier() {
        let builder = apply_to_client(
            reqwest::Client::builder(),
            &resolve(&NetworkProxySettings::default()).unwrap(),
        )
        .unwrap();
        builder.build().unwrap();
    }

    #[test]
    fn custom_ca_is_validated_and_injected_before_node_launch() {
        let ca_path = temp_file("pem", TEST_CA_PEM);
        let mut settings = custom();
        settings.ca_certificate_path = ca_path.to_string_lossy().into_owned();
        let resolved = resolve(&settings).unwrap();
        assert_eq!(resolved.ca_source(), NetworkCaSource::Custom);
        let canonical_ca_path = resolved.ca_certificate_path().unwrap().to_path_buf();

        let mut command = Command::new("node");
        apply_to_command(&mut command, &resolved);
        let environment: Vec<_> = command.get_envs().collect();
        assert!(environment.iter().any(|(name, value)| {
            *name == "NODE_EXTRA_CA_CERTS"
                && value.is_some_and(|value| value == canonical_ca_path.as_os_str())
        }));
        assert!(environment.iter().any(|(name, value)| {
            *name == "YOURBUDDY_NETWORK_PROXY_MODE" && value.is_some_and(|value| value == "custom")
        }));
        assert!(environment.iter().any(|(name, value)| {
            *name == "YOURBUDDY_NETWORK_CA_SOURCE" && value.is_some_and(|value| value == "custom")
        }));
        apply_to_client(reqwest::Client::builder(), &resolved)
            .unwrap()
            .build()
            .unwrap();
        fs::remove_file(ca_path).unwrap();
    }

    #[test]
    fn custom_ca_rejects_untrusted_file_inputs() {
        let invalid_pem = temp_file("pem", "not a certificate\n");
        let invalid_certificate = temp_file(
            "pem",
            "-----BEGIN CERTIFICATE-----\naGVsbG8=\n-----END CERTIFICATE-----\n",
        );
        let invalid_extension = temp_file("der", TEST_CA_PEM);
        for (path, expected) in [
            (
                "relative.pem".to_string(),
                "network-proxy-ca-path-not-absolute",
            ),
            (
                invalid_pem.to_string_lossy().into_owned(),
                "network-proxy-ca-pem-invalid",
            ),
            (
                invalid_certificate.to_string_lossy().into_owned(),
                "network-proxy-ca-certificate-invalid",
            ),
            (
                invalid_extension.to_string_lossy().into_owned(),
                "network-proxy-ca-extension-unsupported",
            ),
        ] {
            let mut settings = custom();
            settings.ca_certificate_path = path;
            assert_eq!(resolve(&settings).unwrap_err(), expected);
        }
        fs::remove_file(invalid_pem).unwrap();
        fs::remove_file(invalid_certificate).unwrap();
        fs::remove_file(invalid_extension).unwrap();
    }

    #[test]
    fn ca_validation_rejects_certificates_outside_their_validity_period() {
        let ca_path = temp_file("pem", TEST_CA_PEM);
        let before_validity = ASN1Time::from_timestamp(1_700_000_000).unwrap();
        assert_eq!(
            validate_ca_certificate_file_at(&ca_path, before_validity).unwrap_err(),
            "network-proxy-ca-certificate-not-yet-valid"
        );
        let after_expiry = ASN1Time::from_timestamp(2_200_000_000).unwrap();
        assert_eq!(
            validate_ca_certificate_file_at(&ca_path, after_expiry).unwrap_err(),
            "network-proxy-ca-certificate-expired"
        );
        fs::remove_file(ca_path).unwrap();
    }

    #[test]
    fn certificate_diagnostics_return_only_bounded_codes() {
        assert_eq!(
            rustls_error_code(&rustls::Error::InvalidCertificate(
                CertificateError::UnknownIssuer,
            )),
            "UNKNOWN_ISSUER"
        );
        assert_eq!(
            rustls_error_code(&rustls::Error::InvalidCertificate(
                CertificateError::NotValidForName,
            )),
            "CERTIFICATE_NAME_MISMATCH"
        );
        assert_eq!(
            rustls_error_code(&rustls::Error::General("private detail".into())),
            "TLS_HANDSHAKE_FAILED"
        );
    }
}
