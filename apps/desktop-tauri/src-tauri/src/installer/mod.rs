//! Packaged, one-shot macOS installation; no daemon and no automatic Agent continuation.

mod release;
mod store;

use std::ffi::OsString;
use std::fs::{self, File};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::Mutex;
use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri::Manager;

use store::{now, read_json, write_json, Operation, Phase, Request, Store};

const MODE: &str = "--yourbuddy-installer";
const HANDOFF_TIMEOUT: Duration = Duration::from_secs(5 * 60);
const READY_TIMEOUT: Duration = Duration::from_secs(5 * 60);

const HELP: &str = "YourBuddy installer (macOS arm64)\n\n  yourbuddy install [--version latest|X.Y.Z] [--app /path/YourBuddy.app]\n  yourbuddy check [--version latest|X.Y.Z] [--app /path/YourBuddy.app]\n  yourbuddy status --operation ID\n\nOptions: --package FILE --signature FILE --offline --proxy URL --request-id ID\nInstall returns a durable operation ID, not a success claim. Query status until succeeded, failed, or needsUserAction. Multiple application copies require --app. Local packages require their official .sig. User settings, keys, and sessions are preserved.\n";

#[derive(Default)]
struct Options {
    action: String,
    app: Option<PathBuf>,
    version: Option<String>,
    request_id: Option<String>,
    session_id: Option<String>,
    operation: Option<String>,
    package: Option<PathBuf>,
    signature: Option<PathBuf>,
    proxy: Option<OsString>,
    offline: bool,
    defer_stop: bool,
    wait: bool,
    reason: Option<String>,
}

/// Intercept installer invocations before Tauri plugins, windows, or single-instance setup.
pub fn run_if_requested() -> Option<i32> {
    let args: Vec<OsString> = std::env::args_os().collect();
    if args.get(1).map(OsString::as_os_str) != Some(std::ffi::OsStr::new(MODE)) {
        return None;
    }
    if args.len() == 2 || args[2] == "--help" || args[2] == "help" {
        println!("{HELP}");
        return Some(0);
    }
    Some(match parse(&args[2..]).and_then(run) {
        Ok(value) => {
            println!("{value}");
            0
        }
        Err(error) => {
            eprintln!("{}", json!({ "status": "failed", "error": error }));
            1
        }
    })
}

fn parse(args: &[OsString]) -> Result<Options, String> {
    let mut options = Options {
        action: args[0].to_str().ok_or("invalid action")?.into(),
        ..Options::default()
    };
    let mut args = args.iter().skip(1);
    while let Some(arg) = args.next() {
        let flag = arg.to_str().ok_or("invalid installer option")?;
        match flag {
            "--offline" => options.offline = true,
            "--defer-stop" => options.defer_stop = true,
            "--wait" => options.wait = true,
            "--json" => {}
            _ => {
                let value = args
                    .next()
                    .ok_or_else(|| format!("missing value for {flag}"))?;
                match flag {
                    "--app" => options.app = Some(value.into()),
                    "--package" => options.package = Some(value.into()),
                    "--signature" => options.signature = Some(value.into()),
                    "--proxy" => options.proxy = Some(value.clone()),
                    "--version" => {
                        options.version = Some(value.to_str().ok_or("invalid version")?.into())
                    }
                    "--request-id" => {
                        options.request_id =
                            Some(value.to_str().ok_or("invalid request ID")?.into())
                    }
                    "--session-id" => {
                        options.session_id =
                            Some(value.to_str().ok_or("invalid session ID")?.into())
                    }
                    "--reason" => {
                        options.reason = Some(value.to_str().ok_or("invalid reason")?.into())
                    }
                    "--operation" => {
                        options.operation =
                            Some(value.to_str().ok_or("invalid operation ID")?.into())
                    }
                    _ => return Err(format!("unknown installer option {flag}")),
                }
            }
        }
    }
    Ok(options)
}

fn store() -> Result<Store, String> {
    Store::new(crate::runtime::app_data_root()?.join("installer"))
}

fn run(options: Options) -> Result<Value, String> {
    if matches!(options.action.as_str(), "version" | "--version") {
        return Ok(json!({"version": env!("CARGO_PKG_VERSION")}));
    }
    let store = store()?;
    match options.action.as_str() {
        "status" => {
            let _lock = store.lock()?;
            let operation = if let Some(id) = options.operation {
                store.read(&id)?
            } else {
                let app = select_app(options.app)?;
                store
                    .all()?
                    .into_iter()
                    .filter(|op| op.request.app_path == app)
                    .max_by_key(|op| op.created_at)
                    .ok_or("no installation operation found for this application")?
            };
            drop(_lock);
            let mut operation = store.converge(operation)?;
            while options.wait && !operation.phase.terminal() {
                std::thread::sleep(Duration::from_millis(200));
                operation = store.converge(store.read(&operation.id)?)?;
            }
            serde_json::to_value(operation).map_err(|e| e.to_string())
        }
        "cancel" => {
            let id = options.operation.ok_or("cancel requires --operation")?;
            serde_json::to_value(store.cancel(
                &id,
                options.reason.unwrap_or_else(|| {
                    "the initiating session could not persist the handoff".into()
                }),
            )?)
            .map_err(|e| e.to_string())
        }
        "handoff" => {
            let id = options.operation.ok_or("handoff requires --operation")?;
            let operation = store.read(&id)?;
            if operation.phase.terminal() {
                return Err(
                    "installation has already ended; inspect its status before retrying".into(),
                );
            }
            write_json(
                &store.directory(&id)?.join("handoff.json"),
                &json!({ "id": id, "committedAt": now() }),
            )?;
            Ok(json!({"id": id, "handoffCommitted": true}))
        }
        "execute" => {
            let id = options.operation.ok_or("execute requires --operation")?;
            execute(&store, &id)?;
            Ok(json!({ "id": id }))
        }
        "prepare" => prepare(options.offline, options.operation.as_deref()),
        "check" => {
            require_platform()?;
            if let Some(proxy) = options.proxy {
                std::env::set_var("YOURBUDDY_INSTALL_PROXY", proxy);
            }
            let release = runtime()?.block_on(release::resolve(
                options.version.as_deref().unwrap_or("latest"),
            ))?;
            Ok(
                json!({"appPath": select_app(options.app)?, "installerVersion": env!("CARGO_PKG_VERSION"), "targetVersion": release.version, "message": "An update check does not install or restart YourBuddy."}),
            )
        }
        "install" => {
            require_platform()?;
            install(&store, options)
                .and_then(|op| serde_json::to_value(op).map_err(|e| e.to_string()))
        }
        _ => Err(format!(
            "unknown installer action {}; use --help",
            options.action
        )),
    }
}

fn require_platform() -> Result<(), String> {
    if cfg!(all(target_os = "macos", target_arch = "aarch64")) {
        Ok(())
    } else {
        Err("the standalone installer currently supports macOS arm64 only".into())
    }
}

fn runtime() -> Result<tokio::runtime::Runtime, String> {
    tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .map_err(|e| e.to_string())
}

fn select_app(explicit: Option<PathBuf>) -> Result<PathBuf, String> {
    let path = if let Some(path) = explicit {
        path
    } else {
        let mut candidates = vec![PathBuf::from("/Applications/YourBuddy.app")];
        if let Some(home) = dirs::home_dir() {
            candidates.push(home.join("Applications/YourBuddy.app"));
        }
        let existing: Vec<_> = candidates.iter().filter(|path| path.exists()).collect();
        match existing.as_slice() {
            [] => candidates[0].clone(),
            [path] => (*path).clone(),
            _ => return Err("multiple YourBuddy copies found; choose exactly one with --app /path/YourBuddy.app".into()),
        }
    };
    if !path.is_absolute()
        || path.extension().is_none_or(|extension| extension != "app")
        || path.components().any(|part| {
            matches!(
                part,
                std::path::Component::ParentDir | std::path::Component::CurDir
            )
        })
    {
        return Err("--app must be an absolute .app path without traversal segments".into());
    }
    if path.exists() {
        let path = fs::canonicalize(path).map_err(|e| e.to_string())?;
        validate_target(&path)?;
        Ok(path)
    } else {
        let parent = path.parent().ok_or("application path has no parent")?;
        let parent = fs::canonicalize(parent).map_err(|e| {
            format!("application parent is unavailable: {e}; create it or choose --app")
        })?;
        Ok(parent.join(path.file_name().ok_or("application path has no name")?))
    }
}

fn install(store: &Store, options: Options) -> Result<Operation, String> {
    if options.package.is_some() != options.signature.is_some() {
        return Err("--package and --signature must be provided together".into());
    }
    if options.offline && options.package.is_none() {
        return Err("--offline requires --package and --signature".into());
    }
    let version = options.version.unwrap_or_else(|| "latest".into());
    if version != "latest" {
        semver::Version::parse(&version).map_err(|e| format!("invalid version: {e}"))?;
    }
    let request = Request {
        request_id: options
            .request_id
            .unwrap_or_else(|| format!("cli-{}-{}", std::process::id(), now())),
        session_id: options.session_id,
        app_path: select_app(options.app)?,
        requested_version: version,
        package_identity: options
            .signature
            .as_ref()
            .map(|path| {
                fs::read(path)
                    .map(|bytes| store::digest(&bytes))
                    .map_err(|e| e.to_string())
            })
            .transpose()?,
        package: options.package,
        signature: options.signature,
        offline: options.offline,
        defer_stop: options.defer_stop,
    };
    let global = store.lock()?;
    let (mut operation, created) = store.create(request)?;
    if created {
        let result = spawn_executor(store, &operation, options.proxy);
        if let Err(error) = result {
            store.finish_error(&mut operation, error.clone(), None)?;
            return Err(error);
        }
    }
    drop(global);
    let started = Instant::now();
    loop {
        operation = store.read(&operation.id)?;
        if operation.executor_pid.is_some() || operation.phase.terminal() {
            return Ok(operation);
        }
        if started.elapsed() > Duration::from_secs(30) {
            return Err(format!(
                "installer acknowledgment timed out; inspect status --operation {} before retrying",
                operation.id
            ));
        }
        std::thread::sleep(Duration::from_millis(25));
    }
}

fn spawn_executor(
    store: &Store,
    operation: &Operation,
    proxy: Option<OsString>,
) -> Result<(), String> {
    let directory = store.directory(&operation.id)?;
    if let Some(package) = &operation.request.package {
        fs::copy(package, directory.join("package.tar.gz"))
            .map_err(|e| format!("cannot retain local package: {e}"))?;
        fs::copy(
            operation
                .request
                .signature
                .as_ref()
                .ok_or("package signature missing")?,
            directory.join("package.tar.gz.sig"),
        )
        .map_err(|e| e.to_string())?;
    }
    let executor = directory.join("executor");
    fs::copy(
        std::env::current_exe().map_err(|e| e.to_string())?,
        &executor,
    )
    .map_err(|e| format!("cannot retain installer executor: {e}"))?;
    install_shim_executable(&executor)?;
    let log = File::create(directory.join("executor.log")).map_err(|e| e.to_string())?;
    let mut command = Command::new(executor);
    command
        .args([MODE, "execute", "--operation", &operation.id])
        .stdin(Stdio::null())
        .stdout(log.try_clone().map_err(|e| e.to_string())?)
        .stderr(log);
    if let Some(proxy) = proxy {
        command.env("YOURBUDDY_INSTALL_PROXY", proxy);
    }
    detach(&mut command);
    command
        .spawn()
        .map_err(|e| format!("cannot start independent installer: {e}"))?;
    Ok(())
}

/// A new session and closed standard streams keep Host tree teardown and tool exit independent.
fn detach(command: &mut Command) {
    #[cfg(unix)]
    {
        use std::os::unix::process::CommandExt;
        unsafe {
            command.pre_exec(|| {
                if libc::setsid() == -1 {
                    return Err(std::io::Error::last_os_error());
                }
                Ok(())
            });
        }
    }
    let _ = command;
}

fn claim_execution(store: &Store, observed: &Operation) -> Result<(File, Operation), String> {
    let target = store
        .target_lock(&observed.request.app_path)?
        .ok_or("another installer owns this application")?;
    let operation = store.read(&observed.id)?;
    if operation.phase != Phase::Requested {
        return Err("installer operation was already executed; inspect status".into());
    }
    Ok((target, operation))
}

fn execute(store: &Store, id: &str) -> Result<(), String> {
    let observed = store.read(id)?;
    let (_target, mut operation) = claim_execution(store, &observed)?;
    operation.executor_pid = Some(std::process::id());
    store.transition(&mut operation, Phase::Accepted)?;
    let result = execute_inner(store, &mut operation);
    if let Err(error) = result {
        operation = store.read(id)?;
        if !operation.phase.terminal() {
            store.finish_error(&mut operation, error, None)?;
        }
    }
    Ok(())
}

fn execute_inner(store: &Store, operation: &mut Operation) -> Result<(), String> {
    let candidate = runtime()?.block_on(release::stage(store, operation))?;
    let marker: Value = read_json(&candidate.join("Contents/Resources/installer-protocol.json")).map_err(|_| "this release predates the standalone installer; choose a release with installer protocol 1")?;
    if marker["version"] != 1 {
        return Err("unsupported candidate installer protocol".into());
    }
    let mut command = Command::new(candidate.join("Contents/MacOS/yourbuddy"));
    command.args([MODE, "prepare", "--operation", &operation.id]);
    if operation.request.offline {
        command.arg("--offline");
    }
    let prepared_path = store.directory(&operation.id)?.join("prepared.json");
    command
        .stdout(File::create(&prepared_path).map_err(|e| e.to_string())?)
        .stderr(Stdio::null());
    #[cfg(unix)]
    {
        use std::os::unix::process::CommandExt;
        command.process_group(0);
    }
    let mut child = command
        .spawn()
        .map_err(|e| format!("cannot prepare candidate runtime: {e}"))?;
    let preparation = wait_until(Duration::from_secs(30 * 60), || {
        if store.read(&operation.id)?.phase.terminal() {
            return Err("installation was cancelled".into());
        }
        match child.try_wait().map_err(|e| e.to_string())? {
            Some(status) if status.success() => Ok(true),
            Some(_) => Err("candidate component preparation failed; check package/cache completeness and network settings".into()),
            None => Ok(false),
        }
    });
    if !matches!(preparation, Ok(true)) {
        stop_child(&mut child);
        preparation?;
        return Err(
            "candidate component preparation timed out; retry after checking network settings"
                .into(),
        );
    }
    let prepared: Value = read_json(&prepared_path)?;
    let version = prepared["version"]
        .as_str()
        .ok_or("candidate preparation omitted its version")?
        .to_string();
    if (operation.request.requested_version != "latest"
        && operation.request.requested_version != version)
        || operation
            .target_version
            .as_ref()
            .is_some_and(|expected| expected != &version)
    {
        return Err("signed candidate version differs from requested release".into());
    }
    if operation.request.app_path.exists() {
        let installed = Command::new("/usr/libexec/PlistBuddy")
            .args(["-c", "Print :CFBundleShortVersionString"])
            .arg(operation.request.app_path.join("Contents/Info.plist"))
            .output()
            .map_err(|_| "cannot read the installed application version")?;
        if !installed.status.success() {
            return Err("cannot read the installed application version; choose the intended YourBuddy copy with --app".into());
        }
        let current = semver::Version::parse(String::from_utf8_lossy(&installed.stdout).trim())
            .map_err(|_| "installed application version is invalid")?;
        if settle_installed_version(store, operation, &version, &current)? {
            return Ok(());
        }
    }
    *operation = store.read(&operation.id)?;
    operation.target_version = Some(version);

    store.save(operation)?;
    if operation.request.defer_stop {
        store.transition(operation, Phase::AwaitingHandoff)?;
        if !wait_until(HANDOFF_TIMEOUT, || {
            Ok(store
                .directory(&operation.id)?
                .join("handoff.json")
                .is_file())
        })? {
            return store.finish_error(operation, "the initiating session did not commit the upgrade handoff".into(), Some("The running application was left unchanged. Retry from the session after its result has been saved.".into()));
        }
    }
    store.transition(operation, Phase::Stopping)?;
    if !stop_existing(store, operation)? {
        return Ok(());
    }
    store.transition(operation, Phase::Installing)?;
    install_bundle(&candidate, &operation.request.app_path, &operation.id)?;
    store.transition(operation, Phase::Starting)?;
    let mut command = Command::new(operation.request.app_path.join("Contents/MacOS/yourbuddy"));
    command
        .env("YOURBUDDY_INSTALL_OPERATION", &operation.id)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    detach(&mut command);
    let mut desktop = command
        .spawn()
        .map_err(|e| format!("cannot launch installed application: {e}"))?;
    store.transition(operation, Phase::Verifying)?;
    let ready = wait_until(READY_TIMEOUT, || {
        if let Some(status) = desktop.try_wait().map_err(|e| e.to_string())? {
            return Err(format!(
                "installed application exited before readiness: {status}"
            ));
        }
        let live = match read_json::<LiveDesktop>(&store.root.join("desktop.json")) {
            Ok(live) => live,
            Err(_) => return Ok(false),
        };
        if !matches_ready(&live, operation, desktop.id()) {
            return Ok(false);
        }
        if let Some(error) = live.failure {
            return Err(format!("installed application failed to start: {error}"));
        }
        Ok(live.host_ready && live.frontend_ready)
    })?;
    if !ready {
        return store.finish_error(operation, "installed application did not confirm Host and frontend readiness".into(), Some("Open this application and inspect its startup error. Installation is not marked successful; no Agent was resumed.".into()));
    }
    install_shim(&operation.request.app_path)?;
    store.transition(operation, Phase::Succeeded)
}

/// Equal versions end without shutdown or replacement; readiness is not asserted.
fn settle_installed_version(
    store: &Store,
    operation: &mut Operation,
    version: &str,
    current: &semver::Version,
) -> Result<bool, String> {
    let target = semver::Version::parse(version).map_err(|e| e.to_string())?;
    if target < *current {
        return Err("downgrades are not supported by the standalone installer; the existing application was left unchanged".into());
    }
    if target == *current {
        *operation = store.read(&operation.id)?;
        operation.target_version = Some(version.into());
        store.transition(operation, Phase::Unchanged)?;
        return Ok(true);
    }
    Ok(false)
}

fn prepare(offline: bool, operation_id: Option<&str>) -> Result<Value, String> {
    let app = app_for_executable(&std::env::current_exe().map_err(|e| e.to_string())?)?;
    let resources = app.join("Contents/Resources");
    let mut settings = crate::desktop_settings::load().network_proxy;
    if let Ok(proxy) = std::env::var("YOURBUDDY_INSTALL_PROXY") {
        settings.mode = crate::network_proxy::NetworkProxyMode::Custom;
        settings.http_proxy = proxy.clone();
        settings.https_proxy = proxy;
    }
    let proxy = crate::network_proxy::resolve(&settings)?;
    let mut manager = crate::runtime::components::ComponentManager::load(&resources, &proxy)?
        .with_offline(offline);
    let mut requests = vec![crate::runtime::component_plan::PlanRequest::Startup];
    let managed_node = crate::runtime::app_data_root()?.join("runtime/node/bin/node");
    let managed_pnpm = crate::runtime::app_data_root()?.join("runtime/pnpm-global/bin/pnpm");
    let toolchain = crate::runtime::host_env::scan_host_toolchain(&managed_node, &managed_pnpm);
    if toolchain.node.is_none() {
        requests.push(crate::runtime::component_plan::PlanRequest::Fallback(
            "node".into(),
        ));
    }
    if toolchain.pnpm.is_none() {
        requests.push(crate::runtime::component_plan::PlanRequest::Fallback(
            "pnpmStore".into(),
        ));
    }
    if let Some(id) = operation_id {
        let store = store()?;
        let mut operation = store.read(id)?;
        let mut entries = std::collections::BTreeMap::new();
        for request in &requests {
            for entry in manager.installation_plan(request)?.components {
                entries.insert(entry.component.clone(), entry);
            }
        }
        operation.component_plan = Some(
            serde_json::to_value(entries.values().collect::<Vec<_>>())
                .map_err(|e| e.to_string())?,
        );
        store.save(&operation)?;
        let id = id.to_string();
        manager = manager.with_progress(std::sync::Arc::new(move |progress| {
            if let Ok(mut operation) = store.read(&id) {
                operation.component_progress = serde_json::to_value(progress).ok();
                operation.updated_at = now();
                let _ = store.save(&operation);
            }
        }));
    }
    runtime()?.block_on(async {
        for request in requests {
            manager.prepare(&request).await?;
        }
        Ok::<(), String>(())
    })?;
    Ok(json!({"version": env!("CARGO_PKG_VERSION"), "componentsPrepared": true}))
}

fn stop_child(child: &mut std::process::Child) {
    if child.try_wait().ok().flatten().is_some() {
        return;
    }
    #[cfg(unix)]
    unsafe {
        libc::kill(-(child.id() as i32), libc::SIGKILL);
    }
    let _ = child.kill();
    let _ = child.wait();
}

/// Skip only the automatic startup check while an installer-selected launch stays pinned.
pub fn installer_owned_launch() -> bool {
    std::env::var_os("YOURBUDDY_INSTALL_OPERATION").is_some()
}

fn wait_until(
    timeout: Duration,
    mut condition: impl FnMut() -> Result<bool, String>,
) -> Result<bool, String> {
    let started = Instant::now();
    loop {
        if condition()? {
            return Ok(true);
        }
        if started.elapsed() >= timeout {
            return Ok(false);
        }
        std::thread::sleep(Duration::from_millis(100));
    }
}

fn app_for_executable(executable: &Path) -> Result<PathBuf, String> {
    let macos = executable
        .parent()
        .ok_or("application executable has no parent")?;
    let contents = macos
        .parent()
        .ok_or("application executable is outside a bundle")?;
    if macos.file_name().is_none_or(|name| name != "MacOS")
        || contents.file_name().is_none_or(|name| name != "Contents")
    {
        return Err("installer preparation requires the packaged YourBuddy application".into());
    }
    fs::canonicalize(contents.parent().ok_or("application bundle missing")?)
        .map_err(|e| e.to_string())
}

fn validate_target(app: &Path) -> Result<(), String> {
    validate_target_with(app, |app| {
        let output = Command::new("/usr/libexec/PlistBuddy")
            .args(["-c", "Print :CFBundleIdentifier"])
            .arg(app.join("Contents/Info.plist"))
            .output()
            .map_err(|_| "cannot read the selected application's bundle identifier")?;
        if !output.status.success() {
            return Err("cannot establish that --app names YourBuddy; the selected application was left unchanged".into());
        }
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    })
}

fn validate_target_with(
    app: &Path,
    read_identifier: impl FnOnce(&Path) -> Result<String, String>,
) -> Result<(), String> {
    if !app.exists() {
        return Ok(());
    }
    if read_identifier(app)? != "io.github.istarwyh.yourbuddy" {
        return Err("--app names a different application; select an existing YourBuddy copy or a new .app path".into());
    }
    Ok(())
}

fn install_bundle(candidate: &Path, target: &Path, id: &str) -> Result<(), String> {
    validate_target(target)?;
    let parent = target.parent().ok_or("install target has no parent")?;
    let staging = tempfile::Builder::new()
        .prefix(".yourbuddy-install-")
        .tempdir_in(parent)
        .map_err(|e| {
            format!("cannot write application directory: {e}; choose a writable --app path")
        })?;
    let next = staging.path().join("YourBuddy.app");
    let status = Command::new("/usr/bin/ditto")
        .arg(candidate)
        .arg(&next)
        .status()
        .map_err(|e| e.to_string())?;
    if !status.success() {
        return Err("cannot stage the new application in its destination".into());
    }
    let previous = staging.path().join(format!("previous-{id}.app"));
    let existed = target.exists();
    if existed {
        validate_target(target)?;
        fs::rename(target, &previous)
            .map_err(|e| format!("cannot move the existing application: {e}"))?;
    }
    if let Err(error) = fs::rename(&next, target) {
        if existed {
            if let Err(restore) = fs::rename(&previous, target) {
                let preserved = staging.keep();
                return Err(format!("application replacement failed: {error}; restoring the original also failed: {restore}; original retained at {}", preserved.join(format!("previous-{id}.app")).display()));
            }
        }
        return Err(format!("application replacement failed: {error}"));
    }
    // Only application bundles in this transaction are removed; user data is outside this directory.
    Ok(())
}

fn install_shim(app: &Path) -> Result<(), String> {
    install_shim_executable(&app.join("Contents/MacOS/yourbuddy"))
}

fn install_shim_executable(executable: &Path) -> Result<(), String> {
    let bin = crate::runtime::app_data_root()?.join("bin");
    fs::create_dir_all(&bin).map_err(|e| e.to_string())?;
    let executable = executable.to_string_lossy().replace('\'', "'\\''");
    let path = bin.join("yourbuddy");
    fs::write(
        &path,
        format!("#!/bin/sh\nexec '{executable}' {MODE} \"$@\"\n"),
    )
    .map_err(|e| e.to_string())?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(path, fs::Permissions::from_mode(0o755)).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LiveDesktop {
    app_path: PathBuf,
    pid: u32,
    launch_id: String,
    version: String,
    operation_id: Option<String>,
    host_ready: bool,
    frontend_ready: bool,
    failure: Option<String>,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Shutdown {
    operation_id: String,
    app_path: PathBuf,
    pid: u32,
    launch_id: String,
}

fn matches_ready(live: &LiveDesktop, operation: &Operation, pid: u32) -> bool {
    live.pid == pid
        && live.app_path == operation.request.app_path
        && live.operation_id.as_deref() == Some(&operation.id)
        && Some(&live.version) == operation.target_version.as_ref()
}

fn process_matches(pid: u32, executable: &Path) -> bool {
    #[cfg(target_os = "macos")]
    {
        let output = Command::new("/bin/ps")
            .args(["-p", &pid.to_string(), "-o", "comm="])
            .output();
        return output
            .map(|output| {
                if !output.status.success() {
                    return output.status.code() != Some(1);
                }
                String::from_utf8_lossy(&output.stdout).trim() == executable.to_string_lossy()
            })
            .unwrap_or(true);
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = (pid, executable);
        false
    }
}

fn target_running(app: &Path) -> bool {
    let executable = app.join("Contents/MacOS/yourbuddy");
    let output = Command::new("/bin/ps").args(["-axo", "comm="]).output();
    output
        .map(|output| {
            !output.status.success()
                || String::from_utf8_lossy(&output.stdout)
                    .lines()
                    .any(|line| line.trim() == executable.to_string_lossy())
        })
        .unwrap_or(true)
}

fn stop_existing(store: &Store, operation: &mut Operation) -> Result<bool, String> {
    let executable = operation.request.app_path.join("Contents/MacOS/yourbuddy");
    let existing = read_json::<LiveDesktop>(&store.root.join("desktop.json")).ok();
    if existing.as_ref().is_some_and(|live| {
        live.app_path != operation.request.app_path
            && process_matches(live.pid, &live.app_path.join("Contents/MacOS/yourbuddy"))
    }) {
        store.finish_error(
            operation,
            "a different YourBuddy copy is running".into(),
            Some(
                "Quit the other application copy before installing this selected --app target."
                    .into(),
            ),
        )?;
        return Ok(false);
    }
    let live = existing.filter(|live| {
        live.app_path == operation.request.app_path && process_matches(live.pid, &executable)
    });
    if (live.is_some() || target_running(&operation.request.app_path))
        && (!operation.request.defer_stop || operation.request.session_id.is_none())
    {
        store.finish_error(operation, "a running application requires the session's committed upgrade handoff".into(), Some("Ask the current conversation to upgrade, or finish all tasks and quit this YourBuddy copy before retrying from the terminal.".into()))?;
        return Ok(false);
    }
    if let Some(live) = live {
        write_json(
            &store.root.join("shutdown.json"),
            &Shutdown {
                operation_id: operation.id.clone(),
                app_path: live.app_path,
                pid: live.pid,
                launch_id: live.launch_id,
            },
        )?;
        if wait_until(Duration::from_secs(30), || {
            Ok(!process_matches(live.pid, &executable))
        })? {
            return Ok(true);
        }
    } else if !target_running(&operation.request.app_path) {
        return Ok(true);
    }
    store.finish_error(operation, "the running application did not acknowledge a clean shutdown".into(), Some("Quit this YourBuddy copy from its tray menu, then retry with a new request ID. The application and user data have not been replaced.".into()))?;
    Ok(false)
}

/// Serialize the existing GUI updater with explicit installs; an installer-owned launch stays pinned.
pub fn updater_guard() -> Result<Option<File>, String> {
    if !cfg!(target_os = "macos") {
        return Ok(None);
    }
    let app = app_for_executable(&std::env::current_exe().map_err(|e| e.to_string())?)?;
    let store = store()?;
    let _requests = store.lock()?;
    for operation in store.all()? {
        if operation.request.app_path == app && !store.converge(operation)?.phase.terminal() {
            return Ok(None);
        }
    }
    store.target_lock(&app)
}

fn pending_notification(store: &Store, app: &Path) -> Result<Option<Operation>, String> {
    let mut candidates = store
        .all()?
        .into_iter()
        .filter(|operation| operation.request.app_path == app)
        .collect::<Vec<_>>();
    candidates.sort_by_key(|operation| std::cmp::Reverse(operation.created_at));
    for operation in candidates {
        if store
            .directory(&operation.id)?
            .join("notified.json")
            .is_file()
        {
            continue;
        }
        let operation = store.converge(operation)?;
        if operation.phase.terminal() {
            return Ok(Some(operation));
        }
    }
    Ok(None)
}

/// Register this exact application launch and watch only its committed shutdown requests.
pub fn attach_desktop(app: &tauri::AppHandle) -> Result<(), String> {
    if !cfg!(target_os = "macos") {
        return Ok(());
    }
    let executable = std::env::current_exe().map_err(|e| e.to_string())?;
    let app_path = match app_for_executable(&executable) {
        Ok(path) => path,
        Err(_) => return Ok(()),
    };
    let store = store()?;
    let live = LiveDesktop {
        app_path: app_path.clone(),
        pid: std::process::id(),
        launch_id: format!("{}-{}", std::process::id(), now()),
        version: env!("CARGO_PKG_VERSION").into(),
        operation_id: std::env::var("YOURBUDDY_INSTALL_OPERATION").ok(),
        host_ready: false,
        frontend_ready: false,
        failure: None,
    };
    write_json(&store.root.join("desktop.json"), &live)?;
    std::env::set_var("YOURBUDDY_DESKTOP_APP", &app_path);
    std::env::set_var("YOURBUDDY_DESKTOP_EXECUTABLE", executable);
    app.manage(Mutex::new(live.clone()));
    let app = app.clone();
    std::thread::Builder::new()
        .name("installer-shutdown".into())
        .spawn(move || {
            let mut notification_check = Instant::now() - Duration::from_secs(1);
            loop {
                if crate::chrome::quit_requested() {
                    break;
                }
                if notification_check.elapsed() >= Duration::from_secs(1) {
                    notification_check = Instant::now();
                    if let Ok(Some(operation)) = pending_notification(&store, &live.app_path) {
                        let message = if operation.phase == Phase::Succeeded {
                            crate::i18n::tf(
                                crate::i18n::Msg::InstallerSucceeded,
                                operation.target_version.as_deref().unwrap_or(&live.version),
                            )
                        } else if operation.phase == Phase::Unchanged {
                            crate::i18n::tf(
                                crate::i18n::Msg::InstallerUnchanged,
                                operation.target_version.as_deref().unwrap_or(&live.version),
                            )
                        } else {
                            crate::i18n::tf(
                                crate::i18n::Msg::InstallerNeedsAttention,
                                &operation.id,
                            )
                        };
                        crate::notify::toast(&app, "YourBuddy", &message);
                        if let Ok(directory) = store.directory(&operation.id) {
                            let _ =
                                write_json(&directory.join("notified.json"), &json!({"at": now()}));
                        }
                    }
                }
                if let Ok(shutdown) = read_json::<Shutdown>(&store.root.join("shutdown.json")) {
                    if shutdown.app_path == live.app_path
                        && shutdown.pid == live.pid
                        && shutdown.launch_id == live.launch_id
                    {
                        if let Ok(operation) = store.read(&shutdown.operation_id) {
                            let committed = !operation.request.defer_stop
                                || store
                                    .directory(&operation.id)
                                    .is_ok_and(|path| path.join("handoff.json").is_file());
                            if committed && operation.phase == Phase::Stopping {
                                let handle = app.clone();
                                let _ = app.run_on_main_thread(move || {
                                    crate::chrome::request_quit(&handle)
                                });
                                break;
                            }
                        }
                    }
                }
                std::thread::sleep(Duration::from_millis(100));
            }
        })
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Record readiness only after the existing authenticated Host/frontend observations succeed.
pub fn report_ready(app: &tauri::AppHandle, frontend: bool) -> Result<(), String> {
    if let Some(state) = app.try_state::<Mutex<LiveDesktop>>() {
        let mut live = state.lock().map_err(|e| e.to_string())?;
        if frontend {
            live.frontend_ready = true;
        } else {
            live.host_ready = true;
        }
        write_json(&store()?.root.join("desktop.json"), &*live)?;
    }
    Ok(())
}

/// Persist a startup failure so the executor does not wait out the readiness deadline.
pub fn report_failure(app: &tauri::AppHandle, error: &str) {
    if let Some(state) = app.try_state::<Mutex<LiveDesktop>>() {
        if let Ok(mut live) = state.lock() {
            let _ = error;
            live.failure = Some("desktop-startup-failed".into());
            if let Ok(store) = store() {
                let _ = write_json(&store.root.join("desktop.json"), &*live);
            }
        }
    }
}

#[cfg(test)]
mod tests;
