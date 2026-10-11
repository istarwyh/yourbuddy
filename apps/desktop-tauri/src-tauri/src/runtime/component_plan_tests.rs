use super::*;

fn manifest() -> ComponentManifest {
    parse_manifest(include_bytes!("tests/fixtures/component-manifest-v2.json")).unwrap()
}

#[test]
fn preparation_and_leases_share_storage_aliases_and_safe_relative_paths() {
    for (name, family) in [
        ("harness", "harness"),
        ("pnpmStore", "stores"),
        ("node", "node"),
        ("harbor", "harbor"),
        ("pomodoro", "packs/pomodoro"),
    ] {
        for id in ["abc", "sha256:abc", "node:abc"] {
            assert_eq!(
                component_storage_path(name, id).unwrap(),
                PathBuf::from(family).join("abc")
            );
        }
    }
    assert!(component_storage_path("../pomodoro", "abc").is_err());
    assert!(component_storage_path("pomodoro", "sha256:..").is_err());
    assert!(component_storage_path("pomodoro", "../abc").is_err());
}

#[test]
fn release_producer_and_native_reader_share_positive_and_negative_contract_cases() {
    let corpus: serde_json::Value = serde_json::from_slice(include_bytes!(
        "tests/fixtures/component-manifest-v2-cases.json"
    ))
    .unwrap();
    for case in corpus["valid"].as_array().unwrap() {
        assert!(
            parse_manifest(&serde_json::to_vec(&case["manifest"]).unwrap()).is_ok(),
            "{}",
            case["name"]
        );
    }
    for case in corpus["invalid"].as_array().unwrap() {
        assert!(
            parse_manifest(&serde_json::to_vec(&case["manifest"]).unwrap()).is_err(),
            "{}",
            case["name"]
        );
    }
}

#[test]
fn authentic_old_schema_is_rejected_before_deserializing_current_fields() {
    assert_eq!(
        parse_manifest(br#"{"schemaVersion":1}"#).unwrap_err(),
        "unsupported component manifest schema 1"
    );
}

#[test]
fn startup_does_not_eagerly_install_fallbacks_or_capabilities() {
    let plan = plan_installation(
        &manifest(),
        &PlanRequest::Startup,
        &VerifiedInstallations::default(),
    )
    .unwrap();
    assert_eq!(
        plan.components
            .iter()
            .map(|entry| entry.component.as_str())
            .collect::<Vec<_>>(),
        ["harness"]
    );
    assert_eq!(plan.prepare_archive_bytes, 100);
}

#[test]
fn explicit_capability_plan_is_dependency_first_and_deterministic() {
    let manifest = manifest();
    let request = PlanRequest::Capability("harbor".into());
    let first = plan_installation(&manifest, &request, &VerifiedInstallations::default()).unwrap();
    assert_eq!(
        first
            .components
            .iter()
            .map(|entry| entry.component.as_str())
            .collect::<Vec<_>>(),
        ["harness", "harbor"]
    );
    assert_eq!(first.prepare_archive_bytes, 500);
    assert_eq!(
        first,
        plan_installation(&manifest, &request, &VerifiedInstallations::default()).unwrap()
    );
}

#[test]
fn only_exact_verified_installations_are_reused() {
    let manifest = manifest();
    let mut installed = VerifiedInstallations::default();
    installed.insert_verified("harness".into(), manifest.components["harness"].id.clone());
    installed.insert_verified("harbor".into(), "sha256:old".into());
    let plan = plan_installation(
        &manifest,
        &PlanRequest::Capability("harbor".into()),
        &installed,
    )
    .unwrap();
    assert_eq!(plan.components[0].action, PlanAction::Reuse);
    assert_eq!(plan.components[1].action, PlanAction::Prepare);
    assert_eq!(plan.prepare_archive_bytes, 400);
}

#[test]
fn fallbacks_require_an_explicit_matching_request() {
    let manifest = manifest();
    let plan = plan_installation(
        &manifest,
        &PlanRequest::Fallback("node".into()),
        &VerifiedInstallations::default(),
    )
    .unwrap();
    assert_eq!(plan.components.len(), 1);
    assert_eq!(plan.components[0].component, "node");
    for request in [
        PlanRequest::Capability("node".into()),
        PlanRequest::Optional("harbor".into()),
        PlanRequest::Fallback("missing".into()),
    ] {
        assert!(plan_installation(&manifest, &request, &VerifiedInstallations::default()).is_err());
    }
}

#[test]
fn shared_dependencies_appear_once_and_do_not_inflate_archive_bytes() {
    let mut manifest = manifest();
    let mut other = manifest.components["harbor"].clone();
    other.id = "sha256:other".into();
    other
        .depends_on
        .insert("harbor".into(), manifest.components["harbor"].id.clone());
    manifest.components.insert("other".into(), other);
    let plan = plan_installation(
        &manifest,
        &PlanRequest::Capability("other".into()),
        &VerifiedInstallations::default(),
    )
    .unwrap();
    assert_eq!(
        plan.components
            .iter()
            .map(|entry| entry.component.as_str())
            .collect::<Vec<_>>(),
        ["harness", "harbor", "other"]
    );
    assert_eq!(plan.prepare_archive_bytes, 900);
}

#[test]
fn optional_components_only_enter_the_plan_when_requested() {
    let mut manifest = manifest();
    let mut optional = manifest.components["harbor"].clone();
    optional.kind = ComponentKind::Optional;
    optional.id = "sha256:diagnostics".into();
    manifest.components.insert("diagnostics".into(), optional);
    let facts = VerifiedInstallations::default();
    let startup = plan_installation(&manifest, &PlanRequest::Startup, &facts).unwrap();
    assert_eq!(startup.components.len(), 1);
    let requested = plan_installation(
        &manifest,
        &PlanRequest::Optional("diagnostics".into()),
        &facts,
    )
    .unwrap();
    assert_eq!(
        requested
            .components
            .iter()
            .map(|entry| entry.component.as_str())
            .collect::<Vec<_>>(),
        ["harness", "diagnostics"]
    );
}
