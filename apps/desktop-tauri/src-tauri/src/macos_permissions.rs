//! Redacted macOS privacy status for application-owned features.

use serde::Serialize;
use std::time::Duration;

const STATUS_CALLBACK_TIMEOUT: Duration = Duration::from_secs(2);
const REQUEST_CALLBACK_TIMEOUT: Duration = Duration::from_secs(120);

/// Stable macOS privacy states exposed to the settings Client.
#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum PermissionStatus {
    Granted,
    Denied,
    NotDetermined,
    Restricted,
    NotApplicable,
    Unknown,
}

/// One permission row without user data or TCC database details.
#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PermissionState {
    pub id: &'static str,
    pub status: PermissionStatus,
    pub owner: &'static str,
    pub can_request: bool,
    pub can_open_settings: bool,
}

/// Return current privacy states without prompting.
#[cfg(target_os = "macos")]
pub fn snapshot() -> Vec<PermissionState> {
    let microphone = microphone_status();
    let notifications = notification_status();
    vec![
        state(
            "accessibility",
            accessibility_status(),
            "yourBuddy",
            true,
            true,
        ),
        state(
            "microphone",
            microphone,
            "yourBuddy",
            microphone == PermissionStatus::NotDetermined,
            true,
        ),
        state(
            "screenRecording",
            PermissionStatus::NotApplicable,
            "externalFfmpeg",
            false,
            true,
        ),
        state(
            "fullDiskAccess",
            PermissionStatus::Unknown,
            "macOS",
            false,
            true,
        ),
        state(
            "notifications",
            notifications,
            "yourBuddy",
            notifications == PermissionStatus::NotDetermined,
            true,
        ),
    ]
}

#[cfg(not(target_os = "macos"))]
pub fn snapshot() -> Vec<PermissionState> {
    Vec::new()
}

/// Request an application-owned permission after a direct user action.
pub async fn request(permission: &str) -> Result<Vec<PermissionState>, String> {
    match permission {
        "accessibility" => request_accessibility(),
        "microphone" => request_microphone().await?,
        "notifications" => request_notifications().await?,
        _ => return Err("macos-permission-request-unsupported".into()),
    }
    Ok(snapshot())
}

/// Open one fixed System Settings privacy pane.
pub fn open_settings(permission: &str) -> Result<(), String> {
    if !cfg!(target_os = "macos") {
        return Err("macos-permission-not-applicable".into());
    }
    let route = settings_route(permission, modern_macos_settings())?;
    tauri_plugin_opener::open_url(route, None::<&str>).map_err(|error| error.to_string())
}

fn settings_route(permission: &str, modern: bool) -> Result<&'static str, String> {
    let privacy_pane = if modern {
        "com.apple.settings.PrivacySecurity.extension"
    } else {
        "com.apple.preference.security"
    };
    let section = match permission {
        "accessibility" => "Privacy_Accessibility",
        "microphone" => "Privacy_Microphone",
        "screenRecording" => "Privacy_ScreenCapture",
        "fullDiskAccess" => "Privacy_AllFiles",
        "notifications" => {
            return Ok(if modern {
                "x-apple.systempreferences:com.apple.Notifications-Settings.extension"
            } else {
                "x-apple.systempreferences:com.apple.preference.notifications"
            })
        }
        _ => return Err("macos-permission-settings-unsupported".into()),
    };
    Ok(match (modern, section) {
        (true, "Privacy_Accessibility") => "x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension?Privacy_Accessibility",
        (true, "Privacy_Microphone") => "x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension?Privacy_Microphone",
        (true, "Privacy_ScreenCapture") => "x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension?Privacy_ScreenCapture",
        (true, "Privacy_AllFiles") => "x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension?Privacy_AllFiles",
        (false, "Privacy_Accessibility") => "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility",
        (false, "Privacy_Microphone") => "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone",
        (false, "Privacy_ScreenCapture") => "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture",
        (false, "Privacy_AllFiles") => "x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles",
        _ => return Err(format!("macos-permission-settings-route-invalid-{privacy_pane}")),
    })
}

#[cfg(target_os = "macos")]
fn modern_macos_settings() -> bool {
    objc2_foundation::NSProcessInfo::processInfo()
        .operatingSystemVersion()
        .majorVersion
        >= 13
}

#[cfg(not(target_os = "macos"))]
fn modern_macos_settings() -> bool {
    false
}

fn state(
    id: &'static str,
    status: PermissionStatus,
    owner: &'static str,
    can_request: bool,
    can_open_settings: bool,
) -> PermissionState {
    PermissionState {
        id,
        status,
        owner,
        can_request,
        can_open_settings,
    }
}

#[cfg(target_os = "macos")]
fn accessibility_status() -> PermissionStatus {
    if macos_accessibility_client::accessibility::application_is_trusted() {
        PermissionStatus::Granted
    } else {
        PermissionStatus::Unknown
    }
}

#[cfg(not(target_os = "macos"))]
fn accessibility_status() -> PermissionStatus {
    PermissionStatus::NotApplicable
}

#[cfg(target_os = "macos")]
fn request_accessibility() {
    let _ = macos_accessibility_client::accessibility::application_is_trusted_with_prompt();
}

#[cfg(not(target_os = "macos"))]
fn request_accessibility() {}

#[cfg(target_os = "macos")]
fn microphone_status() -> PermissionStatus {
    use objc2_av_foundation::{AVAuthorizationStatus, AVCaptureDevice, AVMediaTypeAudio};
    let Some(media_type) = (unsafe { AVMediaTypeAudio }) else {
        return PermissionStatus::Unknown;
    };
    let status = unsafe { AVCaptureDevice::authorizationStatusForMediaType(media_type) };
    match status {
        AVAuthorizationStatus::Authorized => PermissionStatus::Granted,
        AVAuthorizationStatus::Denied => PermissionStatus::Denied,
        AVAuthorizationStatus::Restricted => PermissionStatus::Restricted,
        AVAuthorizationStatus::NotDetermined => PermissionStatus::NotDetermined,
        _ => PermissionStatus::Unknown,
    }
}

#[cfg(not(target_os = "macos"))]
fn microphone_status() -> PermissionStatus {
    PermissionStatus::NotApplicable
}

#[cfg(target_os = "macos")]
async fn request_microphone() -> Result<(), String> {
    let receiver = begin_microphone_request()?;
    tokio::time::timeout(REQUEST_CALLBACK_TIMEOUT, receiver)
        .await
        .map_err(|_| "macos-microphone-request-timeout".to_string())?
        .map(|_| ())
        .map_err(|_| "macos-microphone-request-cancelled".into())
}

#[cfg(target_os = "macos")]
fn begin_microphone_request() -> Result<tokio::sync::oneshot::Receiver<bool>, String> {
    use block2::RcBlock;
    use objc2_av_foundation::{AVCaptureDevice, AVMediaTypeAudio};
    use tokio::sync::oneshot;

    let Some(media_type) = (unsafe { AVMediaTypeAudio }) else {
        return Err("macos-microphone-media-type-unavailable".into());
    };
    let (sender, receiver) = oneshot::channel();
    let sender = std::sync::Mutex::new(Some(sender));
    let handler = RcBlock::new(move |granted: objc2::runtime::Bool| {
        if let Some(sender) = sender.lock().ok().and_then(|mut sender| sender.take()) {
            let _ = sender.send(granted.as_bool());
        }
    });
    unsafe {
        AVCaptureDevice::requestAccessForMediaType_completionHandler(media_type, &handler);
    }
    Ok(receiver)
}

#[cfg(not(target_os = "macos"))]
async fn request_microphone() -> Result<(), String> {
    Err("macos-permission-not-applicable".into())
}

#[cfg(target_os = "macos")]
fn notification_bundle_available() -> bool {
    objc2_foundation::NSBundle::mainBundle()
        .bundleIdentifier()
        .is_some()
}

#[cfg(target_os = "macos")]
fn notification_status() -> PermissionStatus {
    use block2::RcBlock;
    use objc2_user_notifications::{
        UNAuthorizationStatus, UNNotificationSettings, UNUserNotificationCenter,
    };
    use std::ptr::NonNull;
    use std::sync::mpsc;

    if !notification_bundle_available() {
        return PermissionStatus::Unknown;
    }
    let (sender, receiver) = mpsc::sync_channel(1);
    let handler = RcBlock::new(move |settings: NonNull<UNNotificationSettings>| {
        let status = unsafe { settings.as_ref() }.authorizationStatus();
        let _ = sender.send(status);
    });
    UNUserNotificationCenter::currentNotificationCenter()
        .getNotificationSettingsWithCompletionHandler(&handler);
    let Ok(status) = receiver.recv_timeout(STATUS_CALLBACK_TIMEOUT) else {
        return PermissionStatus::Unknown;
    };
    match status {
        UNAuthorizationStatus::Authorized
        | UNAuthorizationStatus::Provisional
        | UNAuthorizationStatus::Ephemeral => PermissionStatus::Granted,
        UNAuthorizationStatus::Denied => PermissionStatus::Denied,
        UNAuthorizationStatus::NotDetermined => PermissionStatus::NotDetermined,
        _ => PermissionStatus::Unknown,
    }
}

#[cfg(not(target_os = "macos"))]
fn notification_status() -> PermissionStatus {
    PermissionStatus::NotApplicable
}

#[cfg(target_os = "macos")]
async fn request_notifications() -> Result<(), String> {
    let receiver = begin_notifications_request()?;
    let result = tokio::time::timeout(REQUEST_CALLBACK_TIMEOUT, receiver)
        .await
        .map_err(|_| "macos-notifications-request-timeout".to_string())?
        .map_err(|_| "macos-notifications-request-cancelled".to_string())?;
    result
        .map(|_| ())
        .map_err(|_| "macos-notifications-request-failed".into())
}

#[cfg(target_os = "macos")]
fn begin_notifications_request() -> Result<tokio::sync::oneshot::Receiver<Result<bool, ()>>, String>
{
    use block2::RcBlock;
    use objc2_user_notifications::{UNAuthorizationOptions, UNUserNotificationCenter};
    use tokio::sync::oneshot;

    if !notification_bundle_available() {
        return Err("macos-notifications-bundle-unavailable".into());
    }
    let (sender, receiver) = oneshot::channel();
    let sender = std::sync::Mutex::new(Some(sender));
    let handler = RcBlock::new(
        move |granted: objc2::runtime::Bool, error: *mut objc2_foundation::NSError| {
            if let Some(sender) = sender.lock().ok().and_then(|mut sender| sender.take()) {
                let result = if error.is_null() {
                    Ok(granted.as_bool())
                } else {
                    Err(())
                };
                let _ = sender.send(result);
            }
        },
    );
    let options = UNAuthorizationOptions::Alert
        | UNAuthorizationOptions::Sound
        | UNAuthorizationOptions::Badge;
    UNUserNotificationCenter::currentNotificationCenter()
        .requestAuthorizationWithOptions_completionHandler(options, &handler);
    Ok(receiver)
}

#[cfg(not(target_os = "macos"))]
async fn request_notifications() -> Result<(), String> {
    Err("macos-permission-not-applicable".into())
}

#[cfg(test)]
mod tests {
    use super::{open_settings, settings_route, snapshot, PermissionStatus};

    #[test]
    fn snapshot_keeps_external_and_unknown_ownership_explicit() {
        let states = snapshot();
        let screen = states
            .iter()
            .find(|state| state.id == "screenRecording")
            .unwrap();
        assert_eq!(screen.status, PermissionStatus::NotApplicable);
        assert_eq!(screen.owner, "externalFfmpeg");
        let disk = states
            .iter()
            .find(|state| state.id == "fullDiskAccess")
            .unwrap();
        assert_eq!(disk.status, PermissionStatus::Unknown);
        assert!(!disk.can_request);
    }

    #[test]
    fn settings_routes_follow_macos_settings_generations() {
        assert_eq!(
            settings_route("microphone", false).unwrap(),
            "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone"
        );
        assert_eq!(
            settings_route("microphone", true).unwrap(),
            "x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension?Privacy_Microphone"
        );
        assert_eq!(
            settings_route("notifications", false).unwrap(),
            "x-apple.systempreferences:com.apple.preference.notifications"
        );
    }

    #[test]
    fn settings_route_rejects_unknown_permissions_without_opening() {
        assert!(open_settings("arbitrary").is_err());
    }
}
