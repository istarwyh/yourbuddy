//! Current-target Bootstrap preparation must fail closed without selecting or deleting older trees.

use super::*;

struct Fixture {
    _directory: tempfile::TempDir,
    app: PathBuf,
    source: PathBuf,
    target: PathBuf,
    cli: PathBuf,
    node: PathBuf,
    manifest: PathBuf,
    old_trees: Vec<PathBuf>,
}

impl Fixture {
    fn new() -> Self {
        let directory = tempfile::tempdir().unwrap();
        let app = directory.path().join("app");
        let source = directory.path().join("source");
        let target = harness_root_for_bundle(&app, "current-bundle-hash");
        let cli = target.join("apps/cli/lib/bin.js");
        fs::create_dir_all(source.join("apps/cli/lib")).unwrap();
        fs::write(source.join("apps/cli/lib/bin.js"), b"current CLI").unwrap();
        fs::write(
            source.join(".bundle-manifest.json"),
            r#"{"contentSha256":"current-bundle-hash","harnessVersion":"current"}"#,
        )
        .unwrap();
        fs::create_dir_all(cli.parent().unwrap()).unwrap();
        fs::write(&cli, b"existing current CLI").unwrap();
        fs::create_dir_all(target.join("node_modules/.pnpm")).unwrap();
        fs::write(target.join("retained.txt"), b"current target data").unwrap();
        let node = directory.path().join("node");
        fs::write(&node, b"fixture node").unwrap();
        let manifest = directory.path().join("manifest.json");
        write_manifest(&manifest, &source, &node, &target, &cli).unwrap();
        let old_trees = (0..4)
            .map(|index| {
                let old = harness_root_for_bundle(&app, &format!("older-{index}"));
                fs::create_dir_all(old.join("apps/cli/lib")).unwrap();
                fs::create_dir_all(old.join("node_modules/.pnpm")).unwrap();
                fs::write(old.join("apps/cli/lib/bin.js"), b"older CLI").unwrap();
                fs::write(old.join("user-data.txt"), b"keep old data").unwrap();
                old
            })
            .collect();
        Self {
            _directory: directory,
            app,
            source,
            target,
            cli,
            node,
            manifest,
            old_trees,
        }
    }

    fn assert_old_trees_unchanged(&self) {
        for old in &self.old_trees {
            assert_eq!(
                fs::read(old.join("apps/cli/lib/bin.js")).unwrap(),
                b"older CLI"
            );
            assert_eq!(
                fs::read(old.join("user-data.txt")).unwrap(),
                b"keep old data"
            );
            assert!(old.join("node_modules/.pnpm").is_dir());
        }
    }

    fn ready(&self) -> Result<bool, String> {
        bootstrap_manifest_ready(&self.manifest, &self.source, &self.target, &self.cli)
    }
}

#[test]
fn failed_current_seed_preserves_existing_trees_and_retry_finishes_current_target() {
    let f = Fixture::new();
    assert!(f.ready().unwrap());
    let previous_manifest = fs::read(&f.manifest).unwrap();
    let missing_source = f.source.join("missing");
    assert!(prepare_harness_tree(&missing_source, &f.app, &f.target, true).is_err());
    assert_eq!(fs::read(&f.cli).unwrap(), b"existing current CLI");
    assert_eq!(fs::read(&f.manifest).unwrap(), previous_manifest);
    assert!(!f.ready().unwrap());
    f.assert_old_trees_unchanged();

    let selected = prepare_harness_tree(&f.source, &f.app, &f.target, true).unwrap();
    assert_eq!(selected, f.target);
    assert_eq!(fs::read(&f.cli).unwrap(), b"current CLI");
    assert_eq!(
        fs::read(f.target.join("retained.txt")).unwrap(),
        b"current target data"
    );
    assert!(!f.ready().unwrap());
    finish_harness_install(Ok(()), &f.target, true).unwrap();
    finish_bootstrap_provision(&f.manifest, &f.source, &f.node, &f.target, &f.cli).unwrap();
    assert!(f.ready().unwrap());
    f.assert_old_trees_unchanged();
}

#[test]
fn failed_install_with_partial_store_is_not_ready_or_recovered() {
    let f = Fixture::new();
    prepare_harness_tree(&f.source, &f.app, &f.target, true).unwrap();
    for error in ["pnpm exited 1", "Access is denied. (os error 5)"] {
        assert_eq!(
            finish_harness_install(Err(error.into()), &f.target, true).unwrap_err(),
            error
        );
        assert!(!f.ready().unwrap());
    }
    f.assert_old_trees_unchanged();
}

#[test]
fn manifest_write_failure_keeps_pending_until_successful_retry() {
    let f = Fixture::new();
    prepare_harness_tree(&f.source, &f.app, &f.target, true).unwrap();
    let blocked = f.app.join("manifest-directory");
    fs::create_dir_all(&blocked).unwrap();
    let previous_manifest = fs::read(&f.manifest).unwrap();
    assert!(finish_bootstrap_provision(&blocked, &f.source, &f.node, &f.target, &f.cli).is_err());
    assert_eq!(fs::read(&f.manifest).unwrap(), previous_manifest);
    assert!(!f.ready().unwrap());
    f.assert_old_trees_unchanged();
    finish_bootstrap_provision(&f.manifest, &f.source, &f.node, &f.target, &f.cli).unwrap();
    assert!(f.ready().unwrap());
    f.assert_old_trees_unchanged();
}

#[test]
fn marker_io_failures_are_errors_without_reporting_ready() {
    let f = Fixture::new();
    let marker = f.target.join(BOOTSTRAP_PROVISIONING_MARKER);
    fs::create_dir_all(&marker).unwrap();
    assert!(prepare_harness_tree(&f.source, &f.app, &f.target, true)
        .unwrap_err()
        .contains("start provisioning"));
    assert_eq!(fs::read(&f.cli).unwrap(), b"existing current CLI");
    assert!(
        finish_bootstrap_provision(&f.manifest, &f.source, &f.node, &f.target, &f.cli)
            .unwrap_err()
            .contains("finish provisioning")
    );
    assert!(!f.ready().unwrap());
    // Unix reports ENOTDIR here; Windows may map the missing child to NotFound.
    #[cfg(unix)]
    assert!(
        bootstrap_manifest_ready(&f.manifest, &f.source, &f.node, &f.cli)
            .unwrap_err()
            .contains("read provisioning marker")
    );
    f.assert_old_trees_unchanged();
}

#[test]
fn dependency_retry_quarantines_without_deleting_files() {
    let f = Fixture::new();
    let modules = f.target.join("node_modules");
    fs::write(modules.join("user-file.txt"), b"retain me").unwrap();
    preserve_bootstrap_directory(&f.target, "node_modules", ".bootstrap-dependencies-").unwrap();
    assert!(!modules.exists());
    let preserved = fs::read_dir(&f.target)
        .unwrap()
        .flatten()
        .map(|entry| entry.path())
        .find(|path| {
            path.file_name()
                .unwrap()
                .to_string_lossy()
                .starts_with(".bootstrap-dependencies-")
        })
        .unwrap();
    assert_eq!(
        fs::read(preserved.join("node_modules/user-file.txt")).unwrap(),
        b"retain me"
    );
    assert!(preserved.join("node_modules/.pnpm").is_dir());
    preserve_bootstrap_directory(&f.target, "node_modules", ".bootstrap-dependencies-").unwrap();
    assert!(preserved.exists());
    f.assert_old_trees_unchanged();
}

#[test]
fn unusable_pnpm_replacement_preserves_previous_tool_and_retry_output() {
    let f = Fixture::new();
    let runtime = f.app.join("runtime");
    let pnpm = runtime.join("pnpm-global");
    for contents in [b"old tool".as_slice(), b"failed retry".as_slice()] {
        fs::create_dir_all(&pnpm).unwrap();
        fs::write(pnpm.join("retained.txt"), contents).unwrap();
        preserve_bootstrap_directory(&runtime, "pnpm-global", ".bootstrap-pnpm-").unwrap();
        assert!(!pnpm.exists());
    }
    let mut retained: Vec<_> = fs::read_dir(&runtime)
        .unwrap()
        .flatten()
        .map(|entry| fs::read(entry.path().join("pnpm-global/retained.txt")).unwrap())
        .collect();
    retained.sort();
    assert_eq!(
        retained,
        vec![b"failed retry".to_vec(), b"old tool".to_vec()]
    );
    f.assert_old_trees_unchanged();
}

// Unix PATH uses ':' as a separator; Windows cannot create the legacy directory name.
#[cfg(unix)]
#[tokio::test]
async fn fallback_node_prepares_path_safe_cache_and_retries_without_touching_legacy_data() {
    let f = Fixture::new();
    let root = f.app.join("components");
    let script = b"#!/bin/sh\nprintf 'bundled-node-from-path'\n";
    let mut archive = tar::Builder::new(Vec::new());
    let mut header = tar::Header::new_gnu();
    header.set_size(script.len() as u64);
    header.set_mode(0o755);
    header.set_cksum();
    archive
        .append_data(&mut header, "bin/node", script.as_slice())
        .unwrap();
    let tar = archive.into_inner().unwrap();
    let bytes = zstd::stream::encode_all(tar.as_slice(), 1).unwrap();
    let manager = super::super::components::node_seed_fixture(&root, &bytes);
    let spec = &manager.catalog().components["node"];
    let legacy = root.join("node/22.19.0:darwin-arm64");
    fs::create_dir_all(legacy.join("bin")).unwrap();
    fs::write(legacy.join("bin/node"), script).unwrap();
    fs::write(legacy.join(".complete"), format!("{}\n", spec.sha256)).unwrap();
    write_manifest(
        &f.manifest,
        &f.source,
        &legacy.join("bin/node"),
        &f.target,
        &f.cli,
    )
    .unwrap();
    let previous_manifest = fs::read(&f.manifest).unwrap();
    assert!(!f.ready().unwrap());
    assert!(add_node_to_path(&mut Command::new("pnpm"), &legacy.join("bin/node")).is_err());
    assert!(manager.installed("node").unwrap().is_none());

    prepare_harness_tree(&f.source, &f.app, &f.target, true).unwrap();

    // This is the component fallback used when host discovery found no compatible Node.
    let node_root = manager.ensure("node").await.unwrap();
    let node = node_binary_path(&node_root);
    assert_eq!(node_root, root.join("node/22.19.0%3Adarwin-arm64"));
    assert_eq!(fs::read(&node).unwrap(), script);
    assert_eq!(
        fs::read(node_root.join(".complete")).unwrap(),
        format!("{}\n", spec.sha256).as_bytes()
    );
    assert_eq!(fs::read(&f.manifest).unwrap(), previous_manifest);
    assert!(!f.ready().unwrap());

    // Exercise the production install command's PATH, with no host Node entry available.
    let mut command = Command::new("/bin/sh");
    configure_pnpm_install(&mut command, &node, &f.target, None).unwrap();
    let path = command
        .get_envs()
        .find(|(key, _)| *key == "PATH")
        .unwrap()
        .1
        .unwrap();
    let selected = std::env::split_paths(path).next().unwrap();
    let output = Command::new("/bin/sh")
        .args(["-c", "node"])
        .env_clear()
        .env("PATH", selected)
        .output()
        .unwrap();
    assert!(output.status.success());
    assert_eq!(output.stdout, b"bundled-node-from-path");
    assert_eq!(manager.ensure("node").await.unwrap(), node_root);
    finish_bootstrap_provision(&f.manifest, &f.source, &node, &f.target, &f.cli).unwrap();
    assert!(f.ready().unwrap());
    assert_eq!(
        recorded_node_path(&f.manifest).unwrap(),
        node.to_str().unwrap()
    );
    assert_eq!(fs::read(legacy.join("bin/node")).unwrap(), script);
    assert_eq!(
        fs::read(legacy.join(".complete")).unwrap(),
        format!("{}\n", spec.sha256).as_bytes()
    );
    assert_eq!(
        manager.catalog().components["node"].id,
        "node:22.19.0:darwin-arm64"
    );
    f.assert_old_trees_unchanged();
}
