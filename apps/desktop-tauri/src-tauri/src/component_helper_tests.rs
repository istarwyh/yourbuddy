use super::*;
use std::ffi::OsString;

#[test]
fn only_declared_helper_verbs_and_entries_are_accepted() {
    for args in [
        vec![],
        vec!["exec", "/bin/sh"],
        vec!["run", "node"],
        vec!["install", "../harbor"],
        vec!["verify-channel", "/arbitrary/channel"],
    ] {
        let args: Vec<OsString> = args.iter().map(OsString::from).collect();
        let error = run_args(&args).unwrap_err();
        assert!(error.contains("accepts"), "{error}");
    }
}

#[test]
fn a_real_bundle_never_falls_back_to_an_ancestor_channel() {
    let temp = tempfile::tempdir().unwrap();
    std::fs::create_dir(temp.path().join("component-channel")).unwrap();
    let exe = temp.path().join("YourBuddy.app/Contents/MacOS/YourBuddy");
    let resources = temp.path().join("YourBuddy.app/Contents/Resources");
    let error = resource_dir_for(&exe).unwrap_err();
    assert!(error.contains(&resources.display().to_string()));
    std::fs::create_dir_all(resources.join("component-channel")).unwrap();
    assert_eq!(resource_dir_for(&exe).unwrap(), resources);
    assert!(verify_component_channel(&resources).is_err());
    assert_eq!(
        resource_dir_for(&temp.path().join("developer/binary")).unwrap(),
        temp.path()
    );
}

#[test]
fn harbor_entries_are_confined_to_the_verified_component() {
    let temp = tempfile::tempdir().unwrap();
    let root = temp.path().join("harbor");
    std::fs::create_dir_all(root.join("venv/bin")).unwrap();
    let entry = root.join("venv/bin/harbor");
    std::fs::write(&entry, b"entry").unwrap();
    assert_eq!(
        declared_harbor_entry(&root, "venv/bin/harbor").unwrap(),
        entry
    );
    for value in ["", "..", "../outside", "/bin/sh", "venv/../bin/harbor"] {
        assert!(declared_harbor_entry(&root, value).is_err(), "{value}");
    }
    #[cfg(unix)]
    {
        let outside = temp.path().join("outside");
        std::fs::write(&outside, b"user data").unwrap();
        std::os::unix::fs::symlink(&outside, root.join("escape")).unwrap();
        assert!(declared_harbor_entry(&root, "escape").is_err());
        assert_eq!(std::fs::read(outside).unwrap(), b"user data");
    }
}
