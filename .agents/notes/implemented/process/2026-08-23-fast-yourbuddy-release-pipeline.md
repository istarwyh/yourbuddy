# Agent Note: Fast YourBuddy release pipeline

Status: implemented

English | [中文](2026-08-23-fast-yourbuddy-release-pipeline.zh.md)

## Problem

The macOS tag workflow repeated the Node, Python, and Rust test suites after the change had already passed focused development and pull-request checks. It also built the App bundle twice and relayed roughly one gigabyte of release assets from the macOS build job through GitHub artifact storage to a separate Ubuntu publish job. These steps delayed ordinary product delivery without increasing confidence in the exact downloadable artifact.

## Decision

An exact `yourbuddy-vX.Y.Z` tag remains the release source and builds the macOS arm64 artifact from that tag. Product refresh and the committed `stable-else-rc` DeepSeek Harness selection are pre-release responsibilities; tagged CI consumes the committed source records and frozen lockfile without resolving channels again. Manual dispatch can retry an existing unpublished tag after a failed run. The workflow refuses a tag that already has a GitHub Release. It keeps the version/tag consistency check, frozen dependency installation, full Harness build, Tauri App and DMG build, Tauri updater signing, a smoke test against the runtime extracted from the updater archive, SHA-256 verification, updater manifest generation, and direct GitHub Release publication.

Node, Python, and Rust test suites are pre-release responsibilities and do not run again in the tag workflow. Local release preparation resolves the DSH policy, verifies the selected tag commit, prepares an uncommitted upstream merge in a clean worktree, retargets approved product peer metadata, refreshes external products, and requires the assembled Host and Client compatibility smoke to pass. Peer corrections and removals of obsolete runtime peers or Client injections are scoped to one exact external-product version and the selected DSH release. A removal must match exactly one declared item when first applied; a later same-version preparation accepts the already-absent item only when the verified snapshot source record contains that exact removal, while a new or unrecorded candidate still fails. A later failure aborts the owned DSH merge, restores managed product inputs, and treats an absent generated bundle as already clean during recovery. The Tauri App is built once; the DMG is bundled from that App and the updater archive is used directly for relocated-runtime verification, removing the third App rebundle. Cargo registry, Git, fingerprints, build scripts, and dependency objects are cached by the Rust lockfile. The checksum-bound compressed offline pnpm Store is cached separately by its frozen product lockfile; its metadata and archive digest are verified before reuse, while a miss still performs the complete fetch and packaging path. Publishing happens in the macOS build job, so the large DMG and updater archive no longer make a round trip through workflow artifact storage. Version-specific assets are created once; only the stable updater-channel manifest is replaced when a new version is published.

The repository-level `release:yourbuddy` command owns the final developer handoff after targeted checks and review. It accepts an explicit version, validates the committed release archive and Git state without repeating tests or builds, then rejects a dirty, divergent, or already-tagged candidate. It atomically pushes the clean `master` candidate and annotated release tag; GitHub Actions remains responsible for building and publishing the artifacts.

## Alternatives considered

**Keep every test on the tag.** This maximizes duplicated signal but adds several minutes after the same source has already been checked before tagging.

**Keep a separate publish job.** This isolates release permissions and permits publish-only retries, but transfers the large artifact set twice and makes the common successful path slower.

**Promote a previously built artifact without rebuilding.** This is the fastest tag path, but it requires a durable, SHA-addressed prebuild and attestation pipeline that the repository does not yet have.

**Follow the newest prerelease or `master`.** This minimizes delay between upstream development and YourBuddy adoption, but it makes alpha APIs and untagged changes ordinary release inputs. The stable-first, RC-fallback channel keeps a bounded preview path without adopting alpha or branch heads.

**Resolve and merge DSH inside the tag build.** This makes the build use the newest upstream at execution time, but the tag no longer identifies all source inputs and an old release cannot be rebuilt independently of later GitHub state. Release preparation owns mutation; tag CI verifies a new tag, while a failed unpublished tag can be retried from its committed inputs.

## Consequences

The post-tag critical path consists of dependency installation, the Harness and Tauri builds, packaged-runtime smoke, checksums, manifest generation, and upload. Correctness depends explicitly on focused checks and the reviewed DSH merge before the tag, while artifact-specific checks remain in the release workflow. A newer upstream release after preparation does not invalidate the committed candidate; an incompatible candidate blocks the next preparation rather than the current tag build. A publication failure before a GitHub Release exists can rerun the build for the same tag. Once published, changed bytes require a new version. Apple code signing and notarization remain outside this optimization.
