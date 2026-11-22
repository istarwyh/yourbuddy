//! Mirror URLs and harness version for first-run provisioning.

/// Default Node LTS satisfying repo engines (`>=24.9.0`).
pub const DEFAULT_NODE_VERSION: &str = "24.22.3";

/// Lowest accepted Node 24 minor; matches workspace `engines.node`.
pub const MIN_NODE_MINOR_FOR_24: u64 = 9;

/// Major versions at or above this are accepted without a minor floor.
pub const MIN_UNRESTRICTED_NODE_MAJOR: u64 = 25;

/// pnpm version aligned with root packageManager.
pub const DEFAULT_PNPM_VERSION: &str = "11.28.5";

/// Host port range start for `dsh web`.
pub const DEFAULT_WEB_PORT: u16 = 17_890;

/// Bundled harness resource directory name inside Tauri resources.
pub const BUNDLED_HARNESS_DIR: &str = "harness-source";

/// Fixed first-run toolchain resource bundled beside the Harness source.
pub const BUNDLED_TOOLCHAIN_DIR: &str = "toolchain";

/// Production-only pnpm content-addressable store copied with each Harness tree.
pub const OFFLINE_PNPM_STORE_DIR: &str = ".yourbuddy-pnpm-store";

/// Compressed production store shipped in the application resource.
pub const OFFLINE_PNPM_STORE_ARCHIVE: &str = "yourbuddy-pnpm-store.tar.gz";

/// Pinned macOS arm64 Node archive and its official SHA-256 digest.
pub const BUNDLED_NODE_ARCHIVE: &str = "node-v24.22.3-darwin-arm64.tar.gz";
pub const BUNDLED_NODE_SHA256: &str =
    "ff6e17d4874b76d272212b908cc020d6e815fba5a6c7eaaa06add725840307fd";

/// Pinned pnpm package and its registry SHA-512 digest (hex encoded).
pub const BUNDLED_PNPM_ARCHIVE: &str = "pnpm-11.28.5.tgz";
pub const BUNDLED_PNPM_SHA512: &str = "484563d30b4c2ad27cb48aa94ff2b302dbcebc8ff6bf28816c2589886e146ce7f76f354f3bc1a438e6f5e9768c302aa0a6f7add8232903cd4cf81426cbc14d9e";

/// Parent for bundle-specific writable harness trees under app data.
pub const HARNESS_VERSIONS_DIR: &str = "harness-versions";

/// China-friendly Node mirror (override with `DSH_NODE_MIRROR`).
pub fn node_mirror_base() -> String {
    std::env::var("DSH_NODE_MIRROR").unwrap_or_else(|_| "https://npmmirror.com/mirrors/node".into())
}

/// npm/pnpm registry (override with `DSH_NPM_REGISTRY`).
pub fn npm_registry() -> String {
    std::env::var("DSH_NPM_REGISTRY").unwrap_or_else(|_| "https://registry.npmmirror.com".into())
}

/// When set to `local`, use monorepo checkout instead of bundled tree.
pub fn dev_launch_mode() -> Option<String> {
    std::env::var("DSH_DESKTOP_LAUNCH").ok()
}
