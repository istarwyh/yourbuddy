//! Native directory selection owned by the privileged desktop shell.

use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

use crate::i18n::{self, Msg};

/// Choose one local directory without exposing generic Tauri dialog access to the Host iframe.
#[tauri::command]
pub async fn select_directory(app: AppHandle) -> Result<Option<String>, String> {
    let Some(selected) = app
        .dialog()
        .file()
        .set_title(i18n::t(Msg::DirectoryPickerTitle))
        .blocking_pick_folder()
    else {
        return Ok(None);
    };
    let path = selected
        .into_path()
        .map_err(|_| "directory-picker-path-invalid")?;
    Ok(Some(
        path.to_str()
            .ok_or("directory-picker-path-invalid")?
            .to_string(),
    ))
}
