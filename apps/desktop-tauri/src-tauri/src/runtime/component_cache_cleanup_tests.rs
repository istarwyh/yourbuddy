use super::*;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::thread;
use std::time::{Duration, Instant};

// Unrelated parallel tests can fork while a fixture lock FD is live. FD_CLOEXEC
// releases that inherited flock at exec, but not during the fork-to-exec window.
// Retry only that bounded Busy result for operations whose fixture has no owner;
// explicit contention assertions call `inner` directly and must remain immediate.
struct Fixture {
    inner: CacheCleanup,
}

impl std::ops::Deref for Fixture {
    type Target = CacheCleanup;
    fn deref(&self) -> &Self::Target {
        &self.inner
    }
}

fn uncontended<T>(mut operation: impl FnMut() -> Result<T, String>) -> Result<T, String> {
    let deadline = Instant::now() + Duration::from_secs(2);
    loop {
        match operation() {
            Err(error) if error.starts_with("CACHE_CLEANUP_BUSY:") && Instant::now() < deadline => {
                thread::sleep(Duration::from_millis(1));
            }
            result => return result,
        }
    }
}

impl Fixture {
    fn preview(&self) -> Result<CacheCleanupPreview, String> {
        uncontended(|| self.inner.preview())
    }

    fn execute(&self, token: &str) -> Result<CacheCleanupResult, String> {
        uncontended(|| self.inner.execute(token))
    }

    fn execute_with(
        &self,
        token: &str,
        mut remove: impl FnMut(&File, &CStr) -> std::io::Result<()>,
    ) -> Result<CacheCleanupResult, String> {
        uncontended(|| self.inner.execute_with(token, &mut remove))
    }
}

fn fixture(root: &Path) -> Fixture {
    fs::create_dir_all(root).unwrap();
    Fixture {
        inner: CacheCleanup::new(Arc::new(super::super::components::service_fixture(root))),
    }
}

fn name(cleanup: &CacheCleanup, component: &str, kind: CacheFileKind) -> String {
    let archive = &cleanup.manager.catalog().components[component].archive;
    match kind {
        CacheFileKind::Archive => archive.clone(),
        CacheFileKind::Partial => format!("{archive}.partial"),
        CacheFileKind::ResumeMetadata => format!("{archive}.partial.json"),
    }
}

fn seed(cleanup: &CacheCleanup, component: &str, kind: CacheFileKind, bytes: &[u8]) -> PathBuf {
    let downloads = cleanup.manager.cache_root().join("downloads");
    fs::create_dir_all(&downloads).unwrap();
    let path = downloads.join(name(cleanup, component, kind));
    fs::write(&path, bytes).unwrap();
    path
}

#[test]
fn preview_and_confirmation_delete_only_three_exact_catalog_cache_names() {
    let root = tempfile::tempdir().unwrap();
    let cleanup = fixture(root.path());
    let paths = [
        seed(&cleanup, "harness", CacheFileKind::Archive, b"aa"),
        seed(&cleanup, "harness", CacheFileKind::Partial, b"bbb"),
        seed(&cleanup, "harness", CacheFileKind::ResumeMetadata, b"cccc"),
    ];
    let untouched = [
        "downloads/unknown.tar.zst",
        "downloads/user-note",
        "harness/current/data",
        "staging/partial/data",
        "active.json",
        ".leases/lease",
        "statistics/component-metrics.json",
        "Profile/config.json",
    ];
    for relative in untouched {
        let path = root.path().join(relative);
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        fs::write(path, b"keep").unwrap();
    }
    let preview = cleanup.preview().unwrap();
    assert_eq!(preview.files.len(), 3);
    assert_eq!(preview.total_bytes, 9);
    assert_eq!(preview.token.len(), 64);
    assert!(paths.iter().all(|path| path.exists()));
    let json = serde_json::to_value(&preview).unwrap();
    assert_eq!(json["files"][0].as_object().unwrap().len(), 3);
    assert!(json["files"][0].get("component").is_some());
    assert!(json["files"][0].get("kind").is_some());
    assert!(json["files"][0].get("bytes").is_some());
    assert!(!serde_json::to_string(&preview)
        .unwrap()
        .contains(&root.path().display().to_string()));
    let result = cleanup.execute(&preview.token).unwrap();
    assert!(result.complete);
    assert_eq!(result.deleted_files, 3);
    assert_eq!(result.deleted_bytes, 9);
    assert!(result.failures.is_empty());
    assert!(paths.iter().all(|path| !path.exists()));
    assert!(root.path().join("component.lock").is_file());
    for relative in untouched {
        assert_eq!(fs::read(root.path().join(relative)).unwrap(), b"keep");
    }
    assert!(cleanup
        .execute(&preview.token)
        .unwrap_err()
        .starts_with("CACHE_CLEANUP_STALE"));
}

#[test]
fn previews_missing_downloads_without_creating_them_and_rejects_unconfirmed_new_files() {
    let root = tempfile::tempdir().unwrap();
    let cleanup = fixture(root.path());
    let preview = cleanup.preview().unwrap();
    assert!(preview.files.is_empty());
    assert!(!root.path().join("downloads").exists());
    assert_eq!(cleanup.execute(&preview.token).unwrap().deleted_files, 0);
    let fresh = seed(&cleanup, "harness", CacheFileKind::Partial, b"new");
    assert!(cleanup
        .execute(&preview.token)
        .unwrap_err()
        .starts_with("CACHE_CLEANUP_STALE"));
    assert_eq!(fs::read(fresh).unwrap(), b"new");
}

#[test]
fn changed_content_identity_or_candidate_set_rejects_the_whole_preview() {
    for change in [
        "same-length",
        "replacement",
        "missing",
        "new",
        "symlink",
        "directory",
        "hardlink",
    ] {
        let root = tempfile::tempdir().unwrap();
        let cleanup = fixture(root.path());
        let first = seed(&cleanup, "harness", CacheFileKind::Archive, b"old");
        let second = seed(&cleanup, "harness", CacheFileKind::Partial, b"keep");
        let preview = cleanup.preview().unwrap();
        match change {
            "same-length" => fs::write(&second, b"edit").unwrap(),
            "replacement" => {
                fs::rename(&second, root.path().join("saved")).unwrap();
                fs::write(&second, b"keep").unwrap();
            }
            "missing" => fs::remove_file(&second).unwrap(),
            "new" => {
                seed(&cleanup, "harness", CacheFileKind::ResumeMetadata, b"new");
            }
            "symlink" => {
                fs::remove_file(&second).unwrap();
                std::os::unix::fs::symlink(&first, &second).unwrap();
            }
            "directory" => {
                fs::remove_file(&second).unwrap();
                fs::create_dir(&second).unwrap();
            }
            "hardlink" => {
                fs::hard_link(&second, root.path().join("another-link")).unwrap();
            }
            _ => unreachable!(),
        }
        let error = cleanup.execute(&preview.token).unwrap_err();
        assert!(
            error.starts_with("CACHE_CLEANUP_STALE"),
            "{change}: {error}"
        );
        assert_eq!(fs::read(first).unwrap(), b"old");
    }
}

#[test]
fn preview_tokens_are_bound_to_the_root_and_current_catalog() {
    let first = tempfile::tempdir().unwrap();
    let second = tempfile::tempdir().unwrap();
    let cleanup = fixture(first.path());
    let other = fixture(second.path());
    seed(&cleanup, "harness", CacheFileKind::Archive, b"same");
    let second_path = seed(&other, "harness", CacheFileKind::Archive, b"same");
    assert!(other
        .execute(&cleanup.preview().unwrap().token)
        .unwrap_err()
        .starts_with("CACHE_CLEANUP_STALE"));
    assert!(second_path.exists());
    let mut snapshot = cleanup.capture().unwrap();
    let token = cleanup.token(&snapshot).unwrap();
    let mut catalog = cleanup.manager.catalog().clone();
    catalog.app_version = "0.4.1".into();
    assert_ne!(confirmation_token(&catalog, &snapshot).unwrap(), token);
    catalog = cleanup.manager.catalog().clone();
    catalog.components.get_mut("harness").unwrap().sha256 = "1".repeat(64);
    assert_ne!(confirmation_token(&catalog, &snapshot).unwrap(), token);
    // Hashes remain part of the token even when the identity and byte count are unchanged.
    snapshot.files[0].digest = "2".repeat(64);
    assert_ne!(cleanup.token(&snapshot).unwrap(), token);
    assert!(cleanup
        .execute("not-a-confirmation-token")
        .unwrap_err()
        .starts_with("CACHE_CLEANUP_STALE"));
}

#[test]
fn symlink_hardlink_fifo_directory_and_oversized_entries_are_preserved() {
    use std::os::unix::ffi::OsStrExt;
    use std::os::unix::fs::symlink;
    for kind in ["symlink", "hardlink", "fifo", "directory", "oversized"] {
        let root = tempfile::tempdir().unwrap();
        let outside = tempfile::tempdir().unwrap();
        let cleanup = fixture(root.path());
        let safe = seed(&cleanup, "harness", CacheFileKind::Archive, b"ok");
        let path = root.path().join("downloads").join(name(
            &cleanup,
            "harness",
            CacheFileKind::ResumeMetadata,
        ));
        let target = outside.path().join("user-data");
        fs::write(&target, b"untouched").unwrap();
        match kind {
            "symlink" => symlink(&target, &path).unwrap(),
            "hardlink" => fs::hard_link(&target, &path).unwrap(),
            "fifo" => {
                let path = CString::new(path.as_os_str().as_bytes()).unwrap();
                // SAFETY: this fixture supplies a valid NUL-terminated temporary path.
                assert_eq!(unsafe { libc::mkfifo(path.as_ptr(), 0o600) }, 0);
            }
            "directory" => fs::create_dir(&path).unwrap(),
            "oversized" => fs::write(&path, vec![b'x'; MAX_METADATA_BYTES as usize + 1]).unwrap(),
            _ => unreachable!(),
        }
        let preview = cleanup.preview().unwrap();
        assert_eq!(preview.files.len(), 1, "included {kind}");
        assert!(cleanup.execute(&preview.token).unwrap().complete);
        assert!(!safe.exists());
        assert!(fs::symlink_metadata(path).is_ok());
        assert_eq!(fs::read(target).unwrap(), b"untouched");
    }
}

#[test]
fn linked_or_replaced_download_directories_cannot_redirect_cleanup() {
    use std::os::unix::fs::symlink;
    let root = tempfile::tempdir().unwrap();
    let outside = tempfile::tempdir().unwrap();
    let cleanup = fixture(root.path());
    let original = seed(&cleanup, "harness", CacheFileKind::Partial, b"old");
    let preview = cleanup.preview().unwrap();
    fs::rename(
        root.path().join("downloads"),
        root.path().join("retained-downloads"),
    )
    .unwrap();
    symlink(outside.path(), root.path().join("downloads")).unwrap();
    let outside_path = outside.path().join(original.file_name().unwrap());
    fs::write(&outside_path, b"outside").unwrap();
    assert!(cleanup
        .preview()
        .unwrap_err()
        .starts_with("CACHE_CLEANUP_UNSAFE"));
    assert!(cleanup.execute(&preview.token).is_err());
    assert_eq!(fs::read(outside_path).unwrap(), b"outside");
    fs::remove_file(root.path().join("downloads")).unwrap();
    fs::create_dir(root.path().join("downloads")).unwrap();
    let fresh = seed(&cleanup, "harness", CacheFileKind::Partial, b"new");
    assert!(cleanup
        .execute(&preview.token)
        .unwrap_err()
        .starts_with("CACHE_CLEANUP_STALE"));
    assert_eq!(fs::read(fresh).unwrap(), b"new");
}

#[test]
fn a_symlink_cache_root_is_rejected_without_touching_the_target() {
    let parent = tempfile::tempdir().unwrap();
    let root = parent.path().join("real-cache");
    let cleanup = fixture(&root);
    let retained = seed(&cleanup, "harness", CacheFileKind::Partial, b"keep");
    let link = parent.path().join("linked-cache");
    std::os::unix::fs::symlink(&root, &link).unwrap();
    let linked = fixture(&link);
    assert!(linked
        .preview()
        .unwrap_err()
        .starts_with("CACHE_CLEANUP_UNSAFE"));
    assert_eq!(fs::read(retained).unwrap(), b"keep");
}

#[test]
fn a_partial_unlink_failure_reports_exact_successes_and_retains_the_failed_file() {
    let root = tempfile::tempdir().unwrap();
    let cleanup = fixture(root.path());
    let first = seed(&cleanup, "harness", CacheFileKind::Archive, b"aa");
    let second = seed(&cleanup, "harness", CacheFileKind::Partial, b"bbb");
    let preview = cleanup.preview().unwrap();
    let failed_name = second.file_name().unwrap().to_str().unwrap();
    let result = cleanup
        .execute_with(&preview.token, |directory, name| {
            if name.to_str().unwrap() == failed_name {
                Err(std::io::Error::from(ErrorKind::PermissionDenied))
            } else {
                unlink_file(directory, name)
            }
        })
        .unwrap();
    assert!(!result.complete);
    assert_eq!(result.deleted_files, 1);
    assert_eq!(result.deleted_bytes, 2);
    assert_eq!(result.failures.len(), 1);
    assert_eq!(result.failures[0].kind, CacheFileKind::Partial);
    assert!(!first.exists());
    assert_eq!(fs::read(second).unwrap(), b"bbb");
    assert!(cleanup
        .execute(&preview.token)
        .unwrap_err()
        .starts_with("CACHE_CLEANUP_STALE"));
}

#[test]
fn a_mid_execution_replacement_is_preserved_and_reported_after_prior_deletions() {
    let root = tempfile::tempdir().unwrap();
    let cleanup = fixture(root.path());
    seed(&cleanup, "harness", CacheFileKind::Archive, b"aa");
    let second = seed(&cleanup, "harness", CacheFileKind::Partial, b"bbb");
    let preview = cleanup.preview().unwrap();
    let mut first = true;
    let result = cleanup
        .execute_with(&preview.token, |directory, name| {
            unlink_file(directory, name)?;
            if first {
                first = false;
                fs::remove_file(&second)?;
                fs::write(&second, b"new bytes from an external writer")?;
            }
            Ok(())
        })
        .unwrap();
    assert!(!result.complete);
    assert_eq!(result.deleted_files, 1);
    assert_eq!(result.failures[0].kind, CacheFileKind::Partial);
    assert_eq!(
        fs::read(second).unwrap(),
        b"new bytes from an external writer"
    );
}

fn await_signal(path: &Path) {
    let deadline = Instant::now() + Duration::from_secs(10);
    while !path.exists() {
        assert!(Instant::now() < deadline, "cleanup child did not signal");
        thread::sleep(Duration::from_millis(5));
    }
}

struct ChildGuard(Child);
impl Drop for ChildGuard {
    fn drop(&mut self) {
        let _ = self.0.kill();
        let _ = self.0.wait();
    }
}

fn child(root: &Path, mode: &str) -> ChildGuard {
    ChildGuard(
        Command::new(std::env::current_exe().unwrap())
            .args([
                "--exact",
                "runtime::component_cache_cleanup::tests::cleanup_child_fixture",
                "--nocapture",
            ])
            .env_clear()
            .env("CACHE_CLEANUP_TEST_ROOT", root)
            .env("CACHE_CLEANUP_TEST_MODE", mode)
            .stdin(Stdio::null())
            .spawn()
            .unwrap(),
    )
}

#[test]
fn cleanup_child_fixture() {
    let Some(root) = std::env::var_os("CACHE_CLEANUP_TEST_ROOT") else {
        return;
    };
    let root = PathBuf::from(root);
    let cleanup = fixture(&root);
    let mode = std::env::var("CACHE_CLEANUP_TEST_MODE").unwrap();
    if mode == "download" {
        let _lock = cleanup.manager.lock().unwrap();
        let path = seed(&cleanup, "harness", CacheFileKind::Partial, b"downloaded");
        fs::write(root.join("ready"), b"").unwrap();
        await_signal(&root.join("release"));
        fs::write(path, b"finished").unwrap();
    } else if mode == "clean" {
        let preview = cleanup.preview().unwrap();
        cleanup
            .execute_with(&preview.token, |directory, name| {
                unlink_file(directory, name)?;
                fs::write(root.join("ready"), b"")?;
                await_signal(&root.join("release"));
                Ok(())
            })
            .unwrap();
    } else {
        panic!("unknown cleanup fixture mode");
    }
}

#[test]
fn a_real_transaction_owner_blocks_cleanup_and_invalidates_an_earlier_preview() {
    let root = tempfile::tempdir().unwrap();
    let cleanup = fixture(root.path());
    seed(&cleanup, "harness", CacheFileKind::Partial, b"old");
    let preview = cleanup.preview().unwrap();
    let mut downloader = child(root.path(), "download");
    await_signal(&root.path().join("ready"));
    assert!(cleanup
        .inner
        .preview()
        .unwrap_err()
        .starts_with("CACHE_CLEANUP_BUSY"));
    assert!(cleanup
        .inner
        .execute(&preview.token)
        .unwrap_err()
        .starts_with("CACHE_CLEANUP_BUSY"));
    fs::write(root.path().join("release"), b"").unwrap();
    assert!(downloader.0.wait().unwrap().success());
    assert!(cleanup
        .execute(&preview.token)
        .unwrap_err()
        .starts_with("CACHE_CLEANUP_STALE"));
    assert_eq!(
        fs::read(root.path().join("downloads").join(name(
            &cleanup,
            "harness",
            CacheFileKind::Partial
        )))
        .unwrap(),
        b"finished"
    );
}

#[test]
fn sigkill_after_one_removal_releases_the_lock_and_preserves_remaining_and_runtime_files() {
    let root = tempfile::tempdir().unwrap();
    let cleanup = fixture(root.path());
    let first = seed(&cleanup, "harness", CacheFileKind::Archive, b"aa");
    let second = seed(&cleanup, "harness", CacheFileKind::Partial, b"bbb");
    let runtime = root.path().join("harness/current/user-data");
    fs::create_dir_all(runtime.parent().unwrap()).unwrap();
    fs::write(&runtime, b"keep runtime").unwrap();
    let mut cleaner = child(root.path(), "clean");
    await_signal(&root.path().join("ready"));
    assert!(!first.exists());
    assert!(second.exists());
    assert!(cleanup.manager.lock().is_err());
    // Exercise the public preparation entry: it must fail before archive/network work.
    let executor = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap();
    assert_eq!(
        executor
            .block_on(cleanup.manager.ensure("harness"))
            .unwrap_err(),
        "another component operation is active"
    );
    drop(executor);
    cleaner.0.kill().unwrap();
    assert!(!cleaner.0.wait().unwrap().success());
    let remaining = cleanup.preview().unwrap();
    assert_eq!(remaining.files.len(), 1);
    assert_eq!(remaining.total_bytes, 3);
    assert_eq!(fs::read(&runtime).unwrap(), b"keep runtime");
    assert_eq!(cleanup.execute(&remaining.token).unwrap().deleted_files, 1);
    assert_eq!(fs::read(runtime).unwrap(), b"keep runtime");
}
