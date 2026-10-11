//! Preview-confirmed removal of exact current-catalog download files only.
//!
//! The shared component transaction lock excludes current-version downloaders. Runtime
//! installations, profiles, staging, leases, and unknown directory entries are never selected.
//! Call both operations on a blocking worker: previews hash bounded catalog-owned files.

use super::components::ComponentManager;
#[cfg(unix)]
use super::components::ComponentManifest;
use serde::Serialize;
use std::sync::Arc;

/// The three fixed download-cache names derived from each authenticated archive name.
#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum CacheFileKind {
    Archive,
    Partial,
    ResumeMetadata,
}

/// One eligible cache file; no caller-supplied or absolute path crosses the UI boundary.
#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CacheCleanupFile {
    pub component: String,
    pub kind: CacheFileKind,
    pub bytes: u64,
}

/// A confirmation token bound to the exact catalog, directories, identities, and file contents.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CacheCleanupPreview {
    pub token: String,
    pub files: Vec<CacheCleanupFile>,
    pub total_bytes: u64,
}

/// An eligible file that could not be removed; earlier successful removals are not rolled back.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CacheCleanupFailure {
    pub component: String,
    pub kind: CacheFileKind,
    pub error: String,
}

/// Exact completed removals and remaining failures from one confirmed execution.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CacheCleanupResult {
    pub deleted_bytes: u64,
    pub deleted_files: u32,
    pub failures: Vec<CacheCleanupFailure>,
    pub complete: bool,
}

/// Download-cache cleanup for one authenticated manager; arbitrary path selection is unavailable.
pub struct CacheCleanup {
    manager: Arc<ComponentManager>,
}

impl CacheCleanup {
    pub fn new(manager: Arc<ComponentManager>) -> Self {
        Self { manager }
    }

    /// Inspect the fixed candidates without changing them. Unsupported entries are preserved.
    #[cfg(unix)]
    pub fn preview(&self) -> Result<CacheCleanupPreview, String> {
        let _lock = self.manager.lock().map_err(lock_error)?;
        let snapshot = self.capture()?;
        Ok(CacheCleanupPreview {
            token: self.token(&snapshot)?,
            files: snapshot
                .files
                .iter()
                .map(|file| file.public.clone())
                .collect(),
            total_bytes: snapshot.total_bytes,
        })
    }

    /// Revalidate the complete preview before any deletion, then report each failed removal.
    /// A crash can leave a subset removed; a fresh preview describes the remaining cache.
    #[cfg(unix)]
    pub fn execute(&self, token: &str) -> Result<CacheCleanupResult, String> {
        self.execute_with(token, unlink_file)
    }

    #[cfg(not(unix))]
    pub fn preview(&self) -> Result<CacheCleanupPreview, String> {
        Err("CACHE_CLEANUP_UNSUPPORTED: cache cleanup requires Unix file identity checks".into())
    }

    #[cfg(not(unix))]
    pub fn execute(&self, _token: &str) -> Result<CacheCleanupResult, String> {
        Err("CACHE_CLEANUP_UNSUPPORTED: cache cleanup requires Unix file identity checks".into())
    }
}

#[cfg(unix)]
use {
    sha2::{Digest, Sha256},
    std::collections::{BTreeMap, BTreeSet},
    std::ffi::{CStr, CString},
    std::fs::{File, Metadata, OpenOptions},
    std::io::{ErrorKind, Read},
    std::os::fd::{AsRawFd, FromRawFd},
    std::os::unix::fs::{MetadataExt, OpenOptionsExt},
};

#[cfg(unix)]
const MAX_SAFE_INTEGER: u64 = 9_007_199_254_740_991;
#[cfg(unix)]
const MAX_METADATA_BYTES: u64 = 64 * 1024;

#[cfg(unix)]
#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
struct Identity {
    device: u64,
    inode: u64,
    bytes: u64,
    mode: u32,
    owner: u32,
    links: u64,
    modified: i64,
    modified_ns: i64,
    changed: i64,
    changed_ns: i64,
}

#[cfg(unix)]
impl Identity {
    fn of(metadata: &Metadata) -> Self {
        Self {
            device: metadata.dev(),
            inode: metadata.ino(),
            bytes: metadata.len(),
            mode: metadata.mode(),
            owner: metadata.uid(),
            links: metadata.nlink(),
            modified: metadata.mtime(),
            modified_ns: metadata.mtime_nsec(),
            changed: metadata.ctime(),
            changed_ns: metadata.ctime_nsec(),
        }
    }
}

#[cfg(unix)]
#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
struct SelectedFile {
    public: CacheCleanupFile,
    name: String,
    limit: u64,
    identity: Identity,
    digest: String,
}

#[cfg(unix)]
struct Snapshot {
    root: File,
    downloads: Option<File>,
    files: Vec<SelectedFile>,
    total_bytes: u64,
}

#[cfg(unix)]
impl CacheCleanup {
    fn capture(&self) -> Result<Snapshot, String> {
        let root = OpenOptions::new()
            .read(true)
            .custom_flags(libc::O_DIRECTORY | libc::O_NOFOLLOW | libc::O_NONBLOCK)
            .open(self.manager.cache_root())
            .map_err(unsafe_error)?;
        check_directory(&root)?;
        let downloads = match open_at(&root, c"downloads", true) {
            Ok(directory) => {
                check_directory(&directory)?;
                Some(directory)
            }
            Err(error) if error.kind() == ErrorKind::NotFound => None,
            Err(error) => return Err(unsafe_error(error)),
        };
        let mut snapshot = Snapshot {
            root,
            downloads,
            files: Vec::new(),
            total_bytes: 0,
        };
        let Some(directory) = &snapshot.downloads else {
            return Ok(snapshot);
        };
        let mut candidates = BTreeMap::new();
        for (component, spec) in &self.manager.catalog().components {
            for (name, kind, limit) in [
                (spec.archive.clone(), CacheFileKind::Archive, spec.bytes),
                (
                    format!("{}.partial", spec.archive),
                    CacheFileKind::Partial,
                    spec.bytes,
                ),
                (
                    format!("{}.partial.json", spec.archive),
                    CacheFileKind::ResumeMetadata,
                    MAX_METADATA_BYTES,
                ),
            ] {
                candidates.entry(name).or_insert((component, kind, limit));
            }
        }
        let mut identities = BTreeSet::new();
        for (name, (component, kind, limit)) in candidates {
            if let Some(file) = inspect_file(directory, component, kind, &name, limit)? {
                if identities.insert((file.identity.device, file.identity.inode)) {
                    snapshot.total_bytes = snapshot
                        .total_bytes
                        .checked_add(file.public.bytes)
                        .filter(|total| *total <= MAX_SAFE_INTEGER)
                        .ok_or(
                            "CACHE_CLEANUP_UNSAFE: cache byte count exceeds the supported range",
                        )?;
                    snapshot.files.push(file);
                }
            }
        }
        Ok(snapshot)
    }

    fn token(&self, snapshot: &Snapshot) -> Result<String, String> {
        confirmation_token(self.manager.catalog(), snapshot)
    }

    fn execute_with(
        &self,
        token: &str,
        mut remove: impl FnMut(&File, &CStr) -> std::io::Result<()>,
    ) -> Result<CacheCleanupResult, String> {
        let _lock = self.manager.lock().map_err(lock_error)?;
        let snapshot = self.capture()?;
        if self.token(&snapshot)? != token {
            return Err("CACHE_CLEANUP_STALE: cache changed; request a new preview".into());
        }
        let mut result = CacheCleanupResult {
            deleted_bytes: 0,
            deleted_files: 0,
            failures: Vec::new(),
            complete: true,
        };
        let Some(directory) = snapshot.downloads.as_ref() else {
            return Ok(result);
        };
        for file in &snapshot.files {
            let removed = self.remove_selected(&snapshot, directory, file, &mut remove);
            match removed {
                Ok(()) => {
                    result.deleted_bytes += file.public.bytes;
                    result.deleted_files += 1;
                }
                Err(error) => result.failures.push(CacheCleanupFailure {
                    component: file.public.component.clone(),
                    kind: file.public.kind,
                    error,
                }),
            }
        }
        result.complete = result.failures.is_empty();
        Ok(result)
    }

    fn remove_selected(
        &self,
        snapshot: &Snapshot,
        directory: &File,
        file: &SelectedFile,
        remove: &mut impl FnMut(&File, &CStr) -> std::io::Result<()>,
    ) -> Result<(), String> {
        let current_directory =
            open_at(&snapshot.root, c"downloads", true).map_err(unsafe_error)?;
        let current = current_directory.metadata().map_err(unsafe_error)?;
        let original = directory.metadata().map_err(unsafe_error)?;
        if (current.dev(), current.ino()) != (original.dev(), original.ino()) {
            return Err("CACHE_CLEANUP_STALE: download directory changed".into());
        }
        let current = inspect_file(
            directory,
            &file.public.component,
            file.public.kind,
            &file.name,
            file.limit,
        )?;
        if current.as_ref() != Some(file) {
            return Err("CACHE_CLEANUP_STALE: cache file changed".into());
        }
        let name = filename(&file.name)?;
        remove(directory, &name)
            .map_err(|error| format!("cache file could not be removed: {error}"))
    }
}

#[cfg(unix)]
fn confirmation_token(catalog: &ComponentManifest, snapshot: &Snapshot) -> Result<String, String> {
    let root = snapshot.root.metadata().map_err(unsafe_error)?;
    let downloads = snapshot
        .downloads
        .as_ref()
        .map(File::metadata)
        .transpose()
        .map_err(unsafe_error)?;
    let bytes = serde_json::to_vec(&(
        "yourbuddy-download-cache-cleanup-v1",
        catalog,
        (root.dev(), root.ino(), root.uid()),
        downloads.map(|metadata| (metadata.dev(), metadata.ino(), metadata.uid())),
        &snapshot.files,
    ))
    .map_err(|_| "CACHE_CLEANUP_UNSAFE: cannot encode cache preview")?;
    Ok(hex::encode(Sha256::digest(bytes)))
}

#[cfg(unix)]
fn inspect_file(
    directory: &File,
    component: &str,
    kind: CacheFileKind,
    name: &str,
    limit: u64,
) -> Result<Option<SelectedFile>, String> {
    let name_c = filename(name)?;
    let before = match stat_at(directory, &name_c) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == ErrorKind::NotFound => return Ok(None),
        Err(error) => return Err(unsafe_error(error)),
    };
    // Unsafe or oversized entries are preserved without opening their contents.
    if before.st_mode & libc::S_IFMT != libc::S_IFREG
        || before.st_nlink != 1
        || before.st_uid != effective_uid()
        || before.st_size < 0
        || before.st_size as u64 > limit
    {
        return Ok(None);
    }
    let file = open_at(directory, &name_c, false).map_err(unsafe_error)?;
    let identity = Identity::of(&file.metadata().map_err(unsafe_error)?);
    if identity.device != before.st_dev as u64
        || identity.inode != before.st_ino as u64
        || identity.links != 1
        || identity.owner != effective_uid()
        || identity.mode & libc::S_IFMT as u32 != libc::S_IFREG as u32
        || identity.bytes > limit
    {
        return Err("CACHE_CLEANUP_STALE: cache identity changed while reading".into());
    }
    let mut reader = (&file).take(identity.bytes + 1);
    let mut digest = Sha256::new();
    let mut buffer = [0_u8; 64 * 1024];
    let mut bytes = 0_u64;
    loop {
        let read = reader.read(&mut buffer).map_err(unsafe_error)?;
        if read == 0 {
            break;
        }
        bytes += read as u64;
        digest.update(&buffer[..read]);
    }
    let after = stat_at(directory, &name_c).map_err(unsafe_error)?;
    if bytes != identity.bytes
        || Identity::of(&file.metadata().map_err(unsafe_error)?) != identity
        || after.st_dev as u64 != identity.device
        || after.st_ino as u64 != identity.inode
        || after.st_nlink != 1
    {
        return Err("CACHE_CLEANUP_STALE: cache changed while hashing".into());
    }
    Ok(Some(SelectedFile {
        public: CacheCleanupFile {
            component: component.into(),
            kind,
            bytes,
        },
        name: name.into(),
        limit,
        identity,
        digest: hex::encode(digest.finalize()),
    }))
}

#[cfg(unix)]
fn filename(name: &str) -> Result<CString, String> {
    if name.is_empty() || name.contains('/') || name == "." || name == ".." {
        return Err("CACHE_CLEANUP_UNSAFE: catalog cache name is not a filename".into());
    }
    CString::new(name).map_err(|_| "CACHE_CLEANUP_UNSAFE: catalog cache name contains NUL".into())
}

#[cfg(unix)]
fn effective_uid() -> u32 {
    // SAFETY: geteuid has no pointer arguments or side effects.
    unsafe { libc::geteuid() }
}

#[cfg(unix)]
fn check_directory(directory: &File) -> Result<(), String> {
    let metadata = directory.metadata().map_err(unsafe_error)?;
    if !metadata.is_dir() || metadata.uid() != effective_uid() {
        return Err(
            "CACHE_CLEANUP_UNSAFE: cache directory is not owned by the current user".into(),
        );
    }
    Ok(())
}

#[cfg(unix)]
fn open_at(directory: &File, name: &CStr, is_directory: bool) -> std::io::Result<File> {
    let flags = libc::O_RDONLY
        | libc::O_NOFOLLOW
        | libc::O_NONBLOCK
        | libc::O_CLOEXEC
        | if is_directory { libc::O_DIRECTORY } else { 0 };
    // SAFETY: directory is a live handle and name is a bounded, NUL-terminated filename.
    let fd = unsafe { libc::openat(directory.as_raw_fd(), name.as_ptr(), flags) };
    if fd < 0 {
        return Err(std::io::Error::last_os_error());
    }
    // SAFETY: openat returned a new descriptor whose sole Rust owner is this File.
    Ok(unsafe { File::from_raw_fd(fd) })
}

#[cfg(unix)]
fn stat_at(directory: &File, name: &CStr) -> std::io::Result<libc::stat> {
    let mut metadata = std::mem::MaybeUninit::<libc::stat>::uninit();
    // SAFETY: fstatat initializes the stat output on success and does not follow the final link.
    if unsafe {
        libc::fstatat(
            directory.as_raw_fd(),
            name.as_ptr(),
            metadata.as_mut_ptr(),
            libc::AT_SYMLINK_NOFOLLOW,
        )
    } != 0
    {
        return Err(std::io::Error::last_os_error());
    }
    // SAFETY: successful fstatat initialized every field of the stat structure.
    Ok(unsafe { metadata.assume_init() })
}

#[cfg(unix)]
fn unlink_file(directory: &File, name: &CStr) -> std::io::Result<()> {
    // SAFETY: the held directory handle and validated filename identify one file, never a tree.
    if unsafe { libc::unlinkat(directory.as_raw_fd(), name.as_ptr(), 0) } != 0 {
        return Err(std::io::Error::last_os_error());
    }
    Ok(())
}

#[cfg(unix)]
fn lock_error(error: String) -> String {
    if error == "another component operation is active" {
        "CACHE_CLEANUP_BUSY: another component operation is active".into()
    } else {
        format!("CACHE_CLEANUP_UNSAFE: {error}")
    }
}

#[cfg(unix)]
fn unsafe_error(error: std::io::Error) -> String {
    format!("CACHE_CLEANUP_UNSAFE: cache storage is unavailable: {error}")
}

#[cfg(all(test, unix))]
#[path = "component_cache_cleanup_tests.rs"]
mod tests;
