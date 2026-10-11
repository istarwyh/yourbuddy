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
