---
description: "Complete technical plan for a small YourBuddy Bootstrap DMG, reusable runtime components, on-demand Harbor activation, and one-tag release delivery."
---

# YourBuddy Bootstrap release plan

English | [中文](bootstrap-release-plan.zh.md)

## Summary

YourBuddy publishes a small Bootstrap DMG as the default macOS download and retains a separately labelled Offline DMG for disconnected installation. The Bootstrap application contains the signed Tauri shell, bootstrap UI, desktop overlay, fixed pnpm executable, component manifest, and updater configuration; it does not contain the offline pnpm Store, Node archive, Harness tree, or Harbor Python runtime.

The native component manager resolves the exact release components into content-addressed application-data directories. It reuses compatible Host Node and a complete local pnpm Store before downloading missing components. Ordinary work never downloads Harbor. The first Harbor action installs the fixed Harbor component through a user-visible, cancellable operation and then retries the requested action against the installed runtime.

This document defines one complete release delivery. Bootstrap publication, Offline publication, component generation, runtime activation, migration, updater behavior, release evidence, and user documentation land in the same release; none is deferred to a later packaging phase.

Status: implementation contract for the 0.4.0 delivery, adopted on 2026-10-01. Release acceptance treats 30,000,000 bytes as the inclusive Bootstrap DMG ceiling.

## Table of Contents

- [Measured baseline](#baseline)
- [Delivery outcome](#outcome)
- [Release artifacts](#artifacts)
- [Component manifest](#manifest)
- [Bootstrap and dependency installation](#bootstrap)
- [On-demand Harbor runtime](#harbor)
- [Component storage and lifecycle](#storage)
- [Updates and Offline installation](#updates)
- [Failure and recovery](#recovery)
- [Code ownership and changes](#changes)
- [Release workflow](#workflow)
- [Verification and acceptance](#verification)
- [Single-delivery implementation order](#order)
- [Documentation and operations](#operations)
- [Dev Note](#dev-note)

<a id="baseline"></a>
## Measured baseline

The checked-out 0.3.23 preparation tree contains the following uncompressed resources. These measurements explain the design; release acceptance records the sizes produced by the implementation rather than treating these values as permanent limits.

| Resource | Measured size | Main contents |
|---|---:|---|
| `bundled/harness` | 636 MB | 412 MB compressed offline pnpm Store, 200 MB package artifacts, 21 MB application artifacts, lockfile and metadata |
| `bundled/toolchain` | 50 MB | 46 MB Node archive and 4.4 MB pnpm archive |
| `bundled/yourbuddy-runtime` | 301 MB | 85 MB portable CPython and 216 MB Harbor virtual environment |

The Harbor package itself is approximately 8.8 MB and the DSH adapter is approximately 1.4 MB. The largest Python dependency is LiteLLM at approximately 85 MB; its general provider support brings botocore, tokenizers, Hugging Face libraries, native extensions, proxy assets, and provider metadata. The portable Python tree also retains Tcl/Tk, headers, ensurepip, pip, source files, and compiled bytecode. The Harness tree retains approximately 68 MB of source maps.

The current application already reuses a compatible Host Node at runtime, but every DMG still transports the Node archive, pinned pnpm, offline Store, and Harbor runtime. A successful first launch expands the Store and constructs another `node_modules` tree under application data. The download and installed disk costs therefore remain even when a machine already has compatible tools or package content.

<a id="outcome"></a>
## Delivery outcome

The release has one signed application identity and two installation experiences.

| Experience | Intended use | Installer contents | Network requirement |
|---|---|---|---|
| Bootstrap DMG | Default download and automatic updates | Shell, bootstrap UI, pinned pnpm, manifest, overlay, icons and sounds | Required only for missing release components |
| Offline DMG | Air-gapped or controlled installation | The Bootstrap application plus release-matched component seed archives | None for first launch |

Both installations produce the same active component identities and the same Host command line. The Offline DMG seeds the same cache that Bootstrap downloads; it does not install a second runtime layout. Automatic updates always install the Bootstrap updater artifact. An Offline installation remains usable after that update because its component cache is outside the application bundle.

The Bootstrap DMG succeeds only when all of these behaviors ship together:

- The application starts from a clean machine through native bootstrap UI without requiring an existing DSH process.
- Compatible Host Node and complete pnpm package content are reused without adopting a global pnpm executable or arbitrary `node_modules` tree.
- Missing core components download through the configured application network policy and install atomically.
- Harbor remains visible as an available product capability without requiring its Python runtime for ordinary startup.
- The first Harbor use presents download size and progress, supports cancellation and retry, and activates the requested operation after installation.
- A failed component update leaves the previous bootable Harness and Harbor components untouched.
- One tag publishes Bootstrap, Offline, component assets, hashes, signatures, manifests, release notes, and the updater manifest.

<a id="artifacts"></a>
## Release artifacts

The tag workflow publishes the following immutable assets. Filenames contain the application version for human use and a digest or component version where cache identity requires it.

| Asset | Purpose |
|---|---|
| `yourbuddy-<version>-bootstrap-macos-arm64.dmg` | Default interactive installer |
| `yourbuddy-<version>-bootstrap-macos-arm64.app.tar.gz` and `.sig` | Signed automatic-update payload |
| `yourbuddy-<version>-offline-macos-arm64.dmg` | Bootstrap application plus all release seed components |
| `yourbuddy-components-<version>.json` and `.sig` | Signed component selection and download metadata |
| `yourbuddy-harness-<bundle-id>-macos-arm64.tar.zst` | Trimmed, built Harness and product plugin tree without `node_modules` or source maps |
| `yourbuddy-pnpm-store-<lock-id>-macos-arm64.tar.zst` | Exact production Store fallback for machines without complete local package content |
| `yourbuddy-node-<node-version>-darwin-arm64.tar.zst` | Fixed Node fallback for incompatible or missing Host Node |
| `yourbuddy-harbor-<runtime-id>-darwin-arm64.tar.zst` | Relocatable Python and Harbor runtime |
| `yourbuddy-debug-<version>.tar.zst` | Optional Harness source maps and native diagnostic files, excluded from runtime components |
| `SHA256SUMS.txt` | Hashes for every public release asset |
| `latest.json` | Stable updater manifest pointing only to the Bootstrap updater payload |

The pinned pnpm archive stays inside the Bootstrap application because it is small and owns Store-format and install behavior. YourBuddy never adopts a global pnpm executable. The component manager may use the Store directory that pinned pnpm normally resolves for the user, but it invokes only the bundled pnpm and installs only the committed production lockfile.

The GitHub Release marks the Bootstrap DMG as the default download and labels the Offline DMG with its larger size and offline purpose. Stable website download links continue to target the latest Release; the release page and product download page must distinguish both filenames rather than presenting two unlabeled DMGs.

<a id="manifest"></a>
## Component manifest

`yourbuddy-components-<version>.json` is the release's single component-selection source. The application embeds the expected manifest URL, manifest signature, release tag, and signing public key. The updater payload and both DMGs use the same values.

```json
{
  "schemaVersion": 1,
  "appVersion": "0.4.0",
  "releaseTag": "yourbuddy-v0.4.0",
  "platform": "darwin",
  "arch": "arm64",
  "components": {
    "harness": {
      "id": "sha256:<bundle-id>",
      "archive": "yourbuddy-harness-<bundle-id>-macos-arm64.tar.zst",
      "sha256": "<archive-sha256>",
      "bytes": 0,
      "activation": "startup"
    },
    "pnpmStore": {
      "id": "sha256:<lock-id>",
      "archive": "yourbuddy-pnpm-store-<lock-id>-macos-arm64.tar.zst",
      "sha256": "<archive-sha256>",
      "bytes": 0,
      "activation": "startup-fallback"
    },
    "node": {
      "id": "node:22.19.0:darwin-arm64",
      "archive": "yourbuddy-node-22.19.0-darwin-arm64.tar.zst",
      "sha256": "<archive-sha256>",
      "bytes": 0,
      "activation": "startup-fallback"
    },
    "harbor": {
      "id": "sha256:<runtime-id>",
      "archive": "yourbuddy-harbor-<runtime-id>-darwin-arm64.tar.zst",
      "sha256": "<archive-sha256>",
      "bytes": 0,
      "activation": "on-demand"
    }
  }
}
```

The manifest parser accepts only its supported schema version, current platform and architecture, fixed HTTPS GitHub Release asset URLs derived from `releaseTag` and `archive`, non-negative byte counts, and SHA-256 digests. Archive extraction retains the existing entry-count, expanded-byte, path-containment, and symlink rules. The component manager trusts the first-party manifest fields after these wire and filesystem checks; it does not duplicate package-level validation already performed by release generation.

The release script generates the manifest after every archive exists, signs its exact bytes with the existing updater signing identity, regenerates `SHA256SUMS.txt`, and refuses publication when any manifest size or digest differs from the staged asset. Public assets are immutable after publication; a correction uses a new application version and tag.

<a id="bootstrap"></a>
## Bootstrap and dependency installation

The native splash becomes a complete bootstrap view. It can show the required download, current component, transferred and total bytes, install activity, network error, retry, cancellation, and the location of `boot.log`. It reads the saved direct/system/custom proxy and enterprise-CA policy before any component request. When no saved policy exists, it uses the current system policy and offers the existing network-settings inputs without starting the Node Host.

Startup follows this order:

1. Acquire the application-wide component lock and read the embedded release coordinates.
2. Reuse a completed Harness component whose id equals the manifest id; otherwise download and install the Harness archive into staging.
3. Scan the application-managed and Host Node paths with the existing version and CPU checks. Reuse a compatible Host Node; otherwise install the manifest's Node component.
4. Run the bundled pnpm against a fresh staging Harness tree with `--prod --frozen-lockfile --offline --trust-lockfile` and its normal user Store path. Success means the machine already has every required package and no Store component is downloaded.
5. If the offline install reports missing package content, discard the partial `node_modules`, install the manifest's pnpm Store into a YourBuddy-owned content-addressed Store directory, and repeat the exact offline install with `--store-dir` pointing to that directory.
6. Run the existing CLI-entry and assembled Host checks against staging. Write the runtime manifest and atomically activate the Harness directory only after every check passes.
7. Start `dsh web --no-open` through the existing private Node process tree and load the unchanged authenticated workbench exchange.

The first offline attempt is a capability check, not an error shown to the user. Authentication, proxy, certificate, HTTP, digest, extraction, disk, and install failures after fallback selection are terminal for that attempt and remain visible with a retry action. Cancellation stops network and child-process work, removes staging data, and preserves any previously active runtime.

The Harness component generator removes runtime-unneeded source maps and publishes them in the debug archive. It retains every `lib/`, package manifest, license, patch, native package, Web asset, product snapshot, Skill, and loader dependency needed by the production lockfile and raw/Web resolver manifests. A clean-tree assembly test must reject any removed file that the built startup or plugin loader reads.

<a id="harbor"></a>
## On-demand Harbor runtime

The desktop no longer resolves `yourbuddy-runtime` from Tauri resources during application startup. The product overlay configures Harbor with a component id and the absolute path of a small YourBuddy component helper instead of fixed `harbor` and `harbor-dsh` executable paths.

The Tauri executable exposes a headless component-helper mode used only by the application-owned Host process. The helper accepts a literal component name, reads the embedded channel coordinates, uses the same component lock and network policy as bootstrap, emits bounded JSON progress on stdout, and returns the activated component root. It never accepts an arbitrary URL, archive path, command, or destination.

The Harbor Node plugin adds one runtime provider that owns a shared `ensureHarborRuntime()` Promise. Harbor views may read component status without starting an installation. The following actions call the provider before spawning Python:

- opening a Harbor workbench action that requires live Harbor data;
- invoking `harbor` or `harbor-dsh` from an Agent tool;
- starting evaluation, initialization, diagnostics, or historical-generation work;
- an explicit **Install Harbor runtime** action in Harbor settings.

The first interactive action shows the archive size and asks the user to install. After confirmation, every concurrent caller observes the same installation and progress. Cancellation returns Harbor to `not-installed`; retry starts a new staging attempt. A successful installation resolves the two entry points from the component manifest, runs relocated `harbor --version` and `harbor-dsh --help` smokes, publishes `ready`, and resumes the initiating UI action. Agent tools do not initiate an unapproved background download: they return `HARBOR_RUNTIME_NOT_READY` with the user action required, and the failure remains model-visible through the normal tool result.

Harbor's Node plugin, Client UI, Skills, and configuration stay in the Harness component, so users can discover the capability and read its guidance before installing Python. The Python component contains no user project, job, credential, model route, or mutable Harbor data. Those continue to live in the selected workspace and existing YourBuddy data roots.

The component build also reduces Harbor's installed bytes in the same delivery. Harbor upstream exposes a runtime dependency set for the Host-broker/OpenAI-compatible path rather than requiring all LiteLLM provider and proxy features. The release installs that set and excludes unused proxy UI, Swagger snapshots, provider extras, development headers, Tcl/Tk, idle, ensurepip, pip, tests, caches, and duplicate source/bytecode representations. The relocated executable smokes and representative evaluation acceptance determine what can be removed; the packaging script never deletes an installed module merely because a size scan labels it large.

<a id="storage"></a>
## Component storage and lifecycle

All mutable component state lives below the existing YourBuddy application-data root.

```text
components/
  manifests/<app-version>/components.json
  harness/<bundle-id>/
  stores/<lock-id>/
  node/<node-version>-darwin-arm64/
  harbor/<runtime-id>/
  downloads/<asset>.partial
  staging/<operation-id>/
  active.json
  component.lock
```

`active.json` records the active ids, resolved Host Node path, Harness CLI entry, Harbor state, and last successful manifest version. It contains no credentials or URLs with credentials. A directory becomes eligible for activation only after archive digest, extraction, component manifest, executable presence, and component smoke checks complete.

Download uses a `.partial` file and records the expected digest, byte count, URL, ETag, and transferred length. A retry resumes with HTTP Range only when the server confirms the same ETag and range; otherwise it deletes the partial file and restarts. Extraction occurs under `staging`; activation uses a same-volume rename. The application never edits an active component in place.

Garbage collection keeps the active component, one last-known-good component of each kind, and any component referenced by a running Host or in-progress operation. It removes older unreferenced directories after successful startup, never during download or recovery. The Offline seed importer uses the same staging and activation functions and never overwrites a matching completed component.

The component cache is shared across application versions but not across macOS users. It does not use project-local `node_modules`, Python environments, shell profiles, or another DSH home. The pinned pnpm may reuse content from its normal per-user Store only through a successful frozen offline install; it never resolves an application package from an arbitrary existing `node_modules` tree.

<a id="updates"></a>
## Updates and Offline installation

`latest.json` points to the Bootstrap updater archive. An update replaces only the signed application bundle; the component cache remains in application data. On first launch after an update, the new embedded component manifest selects exact component ids. Unchanged ids activate without download, while changed required components install before the Host starts. Harbor updates remain deferred until Harbor use unless an active Harbor operation requires the old component to remain retained.

The Offline DMG contains seed archives and the signed component manifest under a dedicated Tauri resource directory. Its first launch imports each seed into the same cache and then follows the ordinary Bootstrap path with networking disabled. The installed application identity and updater configuration match Bootstrap, so later automatic updates are small and reuse the seeded components.

An existing self-contained YourBuddy installation upgrades directly to Bootstrap. Existing `harness-versions`, managed Node, DSH home, sessions, settings, credentials, and workspaces remain in place. The bootstrap resolver recognizes a bootable Harness tree whose bundle digest matches the new manifest and registers it without copying. An embedded Harbor runtime from the replaced application bundle is not assumed to survive; Harbor downloads on first use. Users who require a no-network transition install the Offline DMG, which seeds the Harbor component before replacing normal operation.

Bootstrap and Offline use the same bundle identifier, data root, session format, and updater channel. They are distribution choices, not separate editions, feature tiers, or license states.

<a id="recovery"></a>
## Failure and recovery

| Failure | User-visible result | Recovery |
|---|---|---|
| Manifest unavailable and required component cached | Start with the cached component selected by the last successful signed manifest | Retry manifest refresh after startup |
| Manifest unavailable and no required component cached | Bootstrap shows the network failure and does not start a partial Host | Change network settings, retry, or install Offline DMG |
| Download cancelled or interrupted | Keep `.partial` only when safe resume metadata exists; active components remain unchanged | Resume or restart from Bootstrap |
| Digest, signature, or archive check fails | Reject staging and name the failed asset | Publish a new release if the public asset is wrong; retry only for local corruption |
| Disk is insufficient | Show required and available bytes before extraction | Free space or choose Offline installation on another volume only if the product later supports it explicitly |
| Frozen install cannot use Host Store | Select the release pnpm Store component without treating the miss as corruption | Download or import the Store and retry offline install |
| New Harness smoke fails | Preserve and start last-known-good Harness when available; mark the new component failed | Report diagnostics and wait for a new release |
| Harbor installation fails | Ordinary YourBuddy stays usable; Harbor shows failed state and retry | Correct network or disk issue, then retry |
| Update installs but component activation fails | Start last-known-good required components when compatible with the new app; otherwise remain in Bootstrap | Install the matching Offline DMG or a corrected newer release |

The application never silently switches to registry versions, a different Harbor runtime, an older manifest selected from the network, or a user Python environment. Recovery may reuse only locally recorded completed components and existing bootable Harness trees. Diagnostics report component ids, release tag, paths, byte counts, and failure categories without including credentials, proxy passwords, session content, or signed download query parameters.

<a id="changes"></a>
## Code ownership and changes

| Owner | Required change |
|---|---|
| [`src-tauri/src/runtime/provision.rs`](../../../apps/desktop-tauri/src-tauri/src/runtime/provision.rs) | Split provisioning into component resolution, Node selection, Store reuse/fallback, staged frozen install, activation, and recovery while retaining one owner for startup state |
| `src-tauri/src/runtime/components/` | Add manifest types, signed-manifest loader, downloader, resumable partials, archive extraction, component lock, activation, seed import, garbage collection, and helper-mode output |
| [`src-tauri/src/product.rs`](../../../apps/desktop-tauri/src-tauri/src/product.rs) | Replace mandatory bundled Harbor resolution with component identity and status; resolve executable paths only after activation |
| [`src-tauri/src/overlay.rs`](../../../apps/desktop-tauri/src-tauri/src/overlay.rs) | Pass the component helper and Harbor component id instead of application-resource executable paths |
| Native bootstrap UI and locale dictionary | Add download decision, component progress, cancellation, retry, network-settings recovery, Offline status, and disk diagnostics |
| Harbor Evolution product plugin | Add the shared runtime provider, status/installation UI, explicit install action, tool-not-ready result, activation retry, and entry-point resolution |
| [`bundle-harness-source.mjs`](../../../apps/desktop-tauri/scripts/bundle-harness-source.mjs) | Produce the source-map-free Harness component plus optional debug archive and retain exact runtime file ownership |
| Packaging scripts | Produce compressed components, deterministic manifests, signatures, Offline seeds, two Tauri resource configurations, size reports, and release notes |
| [`desktop-release.yml`](../../../.github/workflows/desktop-release.yml) | Build components once, build Bootstrap and Offline DMGs, run both acceptance paths, publish the complete asset set, and promote only Bootstrap to `latest.json` |
| Desktop README and product guides | Describe installation choices, first-launch network and disk behavior, Harbor installation, cache cleanup, proxy/CA recovery, and Offline use |

The component manager remains desktop-owned because it must run before the Node Host. Harbor-specific readiness remains owned by the Harbor product plugin because only that plugin knows which actions require Python and how to present its state. The component helper is the narrow process interface between these owners; neither side duplicates download or activation logic.

The implementation updates every consumer of `ProductRuntime` and the overlay in the same change. It adds no second desktop launcher, alternate DSH home, direct package bin, or public SDK argument escape.

<a id="workflow"></a>
## Release workflow

The tag workflow performs these operations in one job unless independent build jobs pass component artifacts through GitHub Actions with hashes fixed before application signing:

1. Verify the release tag and every version source, and refuse an existing GitHub Release.
2. Install workspace dependencies and build Harness from the tagged source.
3. Generate the trimmed Harness archive, production Store archive, Node fallback archive, minimized Harbor archive, and debug archive.
4. Run archive-local smokes, compute ids, sizes and SHA-256 values, and generate the component manifest.
5. Sign the manifest and component archives with the release signing identity used by the desktop updater.
6. Build the Bootstrap App, updater archive and DMG with only bootstrap resources.
7. Build the Offline DMG from the same App sources plus exact seed archives; do not publish an Offline updater payload.
8. Exercise clean Bootstrap, reused Store, Node fallback, Harbor-not-installed, first Harbor installation, relocated Harbor, and Offline no-network paths.
9. Stage every asset, regenerate `SHA256SUMS.txt`, check every hash and signature, and generate `latest.json` for the Bootstrap updater only.
10. Create one GitHub Release, mark Bootstrap as the primary download in release notes, upload the stable updater manifest, and leave all bytes immutable.

The workflow emits a machine-readable size report containing compressed and expanded bytes for each component and both DMGs. The release archive records the report instead of copying a hand-maintained size table into standing documentation.

The existing `pnpm release:yourbuddy -- X.Y.Z` entry remains the only tag publisher. Local preparation updates both distribution descriptions and component schema release notes but does not upload components. A failed tagged workflow may retry only the same unpublished tag; a published correction requires a new version.

<a id="verification"></a>
## Verification and acceptance

Focused unit and integration coverage owns deterministic component behavior:

- manifest parsing, platform selection, derived asset URLs, signature and digest failures;
- partial download resume, ETag mismatch restart, cancellation, proxy and enterprise-CA application;
- archive path and expanded-size limits, staging cleanup, same-volume activation, and concurrent component locking;
- compatible Host Node reuse and incompatible Node component fallback;
- successful frozen install from an already complete user Store without downloading the Store component;
- Store miss followed by release Store download and successful offline install;
- last-known-good Harness recovery and garbage collection with active-process retention;
- Harbor status without installation, shared concurrent install, cancel/retry, tool-not-ready result, relocated entry points, and ordinary chat without Harbor bytes;
- Offline seed import with network disabled and automatic update from Offline to Bootstrap while retaining components.

Packaged acceptance uses the real signed-candidate layout rather than a source-only mock:

| Scenario | Required observation |
|---|---|
| Clean Bootstrap | The DMG excludes all four heavyweight resources, downloads required startup components, and opens the workbench |
| Warm Bootstrap | A second launch performs no component download and starts the same component ids |
| Existing dependencies | A machine with complete pinned-pnpm Store content downloads neither Store nor Node and produces a bootable Harness |
| Missing dependencies | The Store fallback downloads once, remains cached, and supports the next Harness install |
| Ordinary task | A user completes a normal task without downloading Harbor |
| First Harbor use | The UI discloses bytes, cancellation works, retry succeeds, and the initiating action resumes after relocated smokes |
| Offline installation | With outbound network disabled, seed import opens the workbench and Harbor runs |
| Interrupted update | The previous Harness remains bootable and no staging directory becomes active |
| Public release | Anonymous downloads match `SHA256SUMS.txt`; manifest URLs, signatures, updater metadata, tag commit and release notes agree |

Acceptance fails if the Bootstrap application contains `yourbuddy-pnpm-store`, the Node archive, `harness-source`, or `yourbuddy-runtime`; if ordinary startup downloads Harbor; if a Store miss falls back to mutable dependency resolution; if `latest.json` points to the Offline payload; or if either installer produces a different active component set for the same tag.

Run the relevant desktop script tests, Rust tests, product release smoke, build checks, documentation checks, and the packaged scenarios above. Follow [testing policy](../../testing.md) for the smallest source coverage and retain packaged tests because component correctness depends on final resource layout, signatures, relocation, and public URLs.

<a id="order"></a>
## Single-delivery implementation order

This order is one implementation dependency graph, not a phased product rollout. The release is not eligible for publication until every row is complete.

| Order | Deliverable | Completion condition |
|---:|---|---|
| 1 | Component format and builders | Deterministic Harness, Store, Node, Harbor and debug archives produce stable ids, manifests and size reports |
| 2 | Native component manager | Startup components support cache reuse, network policy, cancellation, activation, fallback and cleanup |
| 3 | Bootstrap resource configuration | The signed App and updater omit heavyweight resources and start through downloaded or cached components |
| 4 | Harbor on-demand integration | Discovery works without Python; explicit installation, tool behavior, progress, cancellation and retry use the shared manager |
| 5 | Offline seed configuration | The Offline DMG imports the exact release components and works with network disabled |
| 6 | Updater and migration | Bootstrap is the stable updater payload; existing data and cached Harness survive direct upgrade |
| 7 | CI and release publication | One tag builds, checks and publishes every artifact with public hashes, signatures and updater metadata |
| 8 | Product documentation | Download choice, network/disk needs, Harbor activation, recovery and cache behavior are bilingual and live |

Implementation may use separate commits or dependent pull requests, but the public release contains the complete set. A source-only component manager, an unpublished Offline path, or Harbor that still blocks startup does not satisfy this plan.

<a id="operations"></a>
## Documentation and operations

Update the [desktop README](../../../apps/desktop-tauri/README.md) as the runtime owner and the product installation, settings, Harbor, troubleshooting, and release pages as user-facing projections. The website download page identifies Bootstrap as recommended and Offline as larger but self-contained. The application lifecycle settings show application version, component manifest version, active component ids, total component disk use, **Install Harbor runtime**, **Retry failed component**, and **Remove unused components** without exposing destructive removal of an active or fallback component.

Release notes report application changes separately from component changes. The [release archive](../../releases/README.md) records both DMGs, component assets, hashes, signatures, public anonymous downloads, updater selection, compressed and expanded sizes, Store-reuse observation, Offline no-network result, Harbor lazy-install result, website state, and unverified scope. CI success alone does not establish public availability.

Operational diagnostics retain `boot.log` and add a bounded component event log with timestamps, component ids, byte counts and status transitions. Support instructions ask for these sanitized logs and active ids, not the user's package Store, credentials, Sessions, or complete application-data directory.

<a id="dev-note"></a>
## Dev Note

The size measurements are local observations from the 2026-09-30 checkout and are not release claims. The scheme deliberately keeps a fixed pnpm and exact release components while removing heavyweight bytes from the default DMG. Harbor dependency minimization requires an upstream installable dependency set for the actual Host-broker path; the implementation must not prune imported Python modules after installation without the packaged Harbor acceptance described above.
