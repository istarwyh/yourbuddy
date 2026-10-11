//! Cross-process leases for exact component identities in one application cache.
//!
//! Acquire shared leases before preparing components and retain them until every consuming
//! process exits. Cleanup takes the component transaction lock, tries exclusive leases, and
//! then revalidates its preview before removal. Busy identities must remain untouched.
//! Lease files are permanent coordination records: deleting them can create two independently
//! locked inodes for the same identity. These checks reject link-shaped cache/lease entries;
//! they do not protect a cache whose ancestors are concurrently replaced by another writer.

use std::collections::BTreeSet;
use std::fs::{self, File, Metadata, OpenOptions, TryLockError};
use std::path::{Path, PathBuf};

use sha2::{Digest, Sha256};

use super::component_plan::{component_storage_path, validate_component_name};

const MAX_IDENTITIES: usize = 64;
const LEASE_DIRECTORY: &str = ".leases";

/// A catalog key and exact release identity already authenticated by the component owner.
/// This module checks storage bounds, not signatures or installation readiness. Identities
/// that resolve to the same cache slot share a lock, including case-insensitive aliases.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ComponentIdentity {
    pub component: String,
    pub id: String,
}

/// Opens independent OS file handles for leases in the caller-owned component cache.
#[derive(Clone, Debug)]
pub struct ComponentLeases {
    cache_root: PathBuf,
}

/// Keeps all acquired OS locks alive; dropping the set closes every owned handle.
///
/// Do not rely on handle inheritance when launching a component. Its supervising process
/// owns this set until the child exits, including cancellation and failed-readiness teardown.
#[must_use = "dropping a component lease permits cleanup of its installation"]
#[derive(Debug)]
pub struct ComponentLeaseSet {
    _files: Vec<File>,
}

impl ComponentLeases {
    /// Open a cache's permanent lease directory, creating missing directories as needed.
    /// Existing symlink/reparse-point cache roots and lease directories are rejected.
    pub fn new(cache_root: &Path) -> Result<Self, String> {
        create_directory(cache_root)?;
        let cache_root = fs::canonicalize(cache_root).map_err(io_error)?;
        create_directory(&cache_root.join(LEASE_DIRECTORY))?;
        Ok(Self { cache_root })
    }

    /// Block until all exact identities have shared leases, in stable filename order.
    ///
    /// Call on a blocking worker when used by an async owner. Inputs are capped at 64;
    /// duplicates share one handle and an empty list owns no locks. Any error releases
    /// every lock acquired by this call, without affecting other lease sets.
    pub fn acquire_shared(
        &self,
        identities: &[ComponentIdentity],
    ) -> Result<ComponentLeaseSet, String> {
        let names = lease_names(identities)?;
        let mut files = Vec::with_capacity(names.len());
        for name in names {
            let file = self.open(&name)?;
            file.lock_shared().map_err(io_error)?;
            files.push(file);
        }
        Ok(ComponentLeaseSet { _files: files })
    }

    /// Try exclusive leases without waiting; return `None` if any identity is in use.
    ///
    /// Contention or a storage error releases this call's partially acquired set. Callers
    /// must also hold the component transaction lock and revalidate the cleanup preview
    /// after success. This method never removes component data or lease files.
    pub fn try_acquire_exclusive(
        &self,
        identities: &[ComponentIdentity],
    ) -> Result<Option<ComponentLeaseSet>, String> {
        let names = lease_names(identities)?;
        let mut files = Vec::with_capacity(names.len());
        for name in names {
            let file = self.open(&name)?;
            match file.try_lock() {
                Ok(()) => files.push(file),
                Err(TryLockError::WouldBlock) => return Ok(None),
                Err(TryLockError::Error(error)) => return Err(io_error(error)),
            }
        }
        Ok(Some(ComponentLeaseSet { _files: files }))
    }

    fn open(&self, name: &str) -> Result<File, String> {
        validate_directory(&fs::symlink_metadata(&self.cache_root).map_err(io_error)?)?;
        let directory = self.cache_root.join(LEASE_DIRECTORY);
        validate_directory(&fs::symlink_metadata(&directory).map_err(io_error)?)?;
        let path = directory.join(name);
        match fs::symlink_metadata(&path) {
            Ok(metadata) => validate_file(&metadata)?,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
            Err(error) => return Err(io_error(error)),
        }
        let file = regular_file_options()
            .read(true)
            .write(true)
            .create(true)
            .truncate(false)
            .open(&path)
            .map_err(io_error)?;
        validate_file(&file.metadata().map_err(io_error)?)?;
        Ok(file)
    }
}

fn lease_names(identities: &[ComponentIdentity]) -> Result<BTreeSet<String>, String> {
    if identities.len() > MAX_IDENTITIES {
        return Err("component lease count exceeds 64".into());
    }
    let mut names = BTreeSet::new();
    for identity in identities {
        validate_component_name(&identity.component)?;
        if identity.id.is_empty()
            || identity.id.len() > 160
            || !identity.id.as_bytes()[0].is_ascii_alphanumeric()
        {
            return Err("component lease identity is invalid".into());
        }
        let storage_path = component_storage_path(&identity.component, &identity.id)?;
        let mut digest = Sha256::new();
        digest.update(b"yourbuddy-component-lease-v1\0");
        // Match the manager's physical cache slot, including ID prefix aliases. Folding
        // ASCII case also coordinates case-insensitive volumes; on other volumes it only
        // adds conservative contention between otherwise distinct installations.
        for part in &storage_path {
            let value = part
                .to_str()
                .ok_or("component storage path is not UTF-8")?
                .to_ascii_lowercase();
            digest.update((value.len() as u64).to_le_bytes());
            digest.update(value.as_bytes());
        }
        names.insert(format!("{}.lock", hex::encode(digest.finalize())));
    }
    Ok(names)
}

fn create_directory(path: &Path) -> Result<(), String> {
    match fs::symlink_metadata(path) {
        Ok(metadata) => return validate_directory(&metadata),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
        Err(error) => return Err(io_error(error)),
    }
    fs::create_dir_all(path).map_err(io_error)?;
    validate_directory(&fs::symlink_metadata(path).map_err(io_error)?)
}

fn is_link(metadata: &Metadata) -> bool {
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        const FILE_ATTRIBUTE_REPARSE_POINT: u32 = 0x400;
        metadata.file_attributes() & FILE_ATTRIBUTE_REPARSE_POINT != 0
    }
    #[cfg(not(windows))]
    {
        metadata.file_type().is_symlink()
    }
}

fn validate_directory(metadata: &Metadata) -> Result<(), String> {
    if !metadata.is_dir() || is_link(metadata) {
        return Err("component lease root must be a real directory".into());
    }
    Ok(())
}

fn validate_file(metadata: &Metadata) -> Result<(), String> {
    if !metadata.is_file() || is_link(metadata) {
        return Err("component lease storage must use regular files".into());
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::MetadataExt;
        if metadata.nlink() != 1 {
            return Err("component lease files must not have hard links".into());
        }
    }
    Ok(())
}

fn regular_file_options() -> OpenOptions {
    let mut options = OpenOptions::new();
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.custom_flags(libc::O_NOFOLLOW | libc::O_NONBLOCK);
    }
    #[cfg(windows)]
    {
        use std::os::windows::fs::OpenOptionsExt;
        const FILE_FLAG_OPEN_REPARSE_POINT: u32 = 0x00200000;
        options.custom_flags(FILE_FLAG_OPEN_REPARSE_POINT);
    }
    options
}

fn io_error(error: std::io::Error) -> String {
    format!("component lease storage is unavailable: {error}")
}

#[cfg(test)]
#[path = "component_leases_tests.rs"]
mod tests;
