# Release notes and verification archives

English | [中文](README.zh.md)

This reference defines the repository record delivered with each release. It adds user-facing notes and reviewable evidence to the existing release procedures; it does not redefine versions, tags, build commands, registries, or approval settings.

## Version index

Add the newest release first after its archive exists in the tagged commit. Link the release identifier to its archived `README.md`, not to a moving branch.

| Release | Channel | User notes | Verification archive | Product status |
|---|---|---|---|---|
| [yourbuddy-v0.3.2](yourbuddy-v0.3.2/README.md) | YourBuddy desktop | Included | Source and public artifact evidence included; verification download and live website evidence pending | Published and independently verified |
| [yourbuddy-v0.3.1](yourbuddy-v0.3.1/README.md) | YourBuddy desktop | Included | Complete; immutable evidence and verification download available | Published and independently verified |
| [yourbuddy-v0.3.0](yourbuddy-v0.3.0/README.md) | YourBuddy desktop | Included | Pre-publication and failure evidence retained | Failed before artifact publication; superseded by 0.3.1 |

Use the [copyable release directory](_template/README.md) for the first entry.

## Existing release channels

The channel owners remain authoritative for versions, commands, and publication. Name an archive directory after the exact release tag so independent version lines cannot collide: `docs/releases/<release-tag>/`.

| Channel | Release identifier | Existing procedure | Publication to verify |
|---|---|---|---|
| YourBuddy desktop | `yourbuddy-vX.Y.Z` | [Desktop release guide](../../apps/desktop-tauri/README.md) and [macOS workflow](../../.github/workflows/desktop-release.yml) | GitHub Release DMG, signed updater archive and signature, `SHA256SUMS.txt`, and the stable updater manifest |
| DSH packages and documentation | `dsh-vX.Y.Z` | [npm pack workflow](../../.github/workflows/release.yml), [manual npm publication](../../.github/workflows/release-publish.yml), and [documentation deployment](../../.github/workflows/docs-pages.yml) | Published npm versions and files, an installed-package smoke, and the reachable documentation site |
| Vendored Cordis packages | `vendor-<package>-vX.Y.Z` | [Vendor pack workflow](../../.github/workflows/release-vendor.yml) and [manual npm publication](../../.github/workflows/release-vendor-publish.yml) | Each intended npm package version and its registry integrity |
| Landlock launcher packages | `landlock-run-vX.Y.Z` | [Landlock release guide](../../native/landlock-run/docs/release.md) and [release workflow](../../.github/workflows/landlock-run-release.yml) | Every intended platform and entry package on npm, including the expected dist-tag |
| Python SDK and runtime | `python-vX.Y.Z` | [Python contributor guide](../../python/development.md), [GitHub publication](../../.github/workflows/python-release.yml), and [GitLab publication](../../.gitlab-ci.yml) | The SDK and all intended runtime wheels in each selected PyPI registry, followed by an installed-wheel smoke |

A channel that is not part of a release is marked not applicable in that version page. Do not run unrelated release families to make the archive appear complete.

Every YourBuddy desktop release includes [product website synchronization](../product-website.md#release-synchronization). Prepare content before tagging, then publish verified availability after checking the public assets. The product website and SDK documentation use separate workflows; neither is evidence that the desktop installer is available.

## Per-release archive

Copy `docs/releases/_template/` to `docs/releases/<release-tag>/` before final validation. Keep `README.md`, `README.zh.md`, and their pairing record together; create `screenshots/` and `evidence/` only when they contain useful material.

```text
docs/releases/<release-tag>/
  README.md
  README.zh.md
  README.i18n.yaml
  screenshots/
  evidence/
```

The version page is the source of truth for the complete verification report. A channel-specific release note may repeat the short user summary that its UI needs, then links to this archive at the immutable evidence commit.

## User-facing release notes

Lead with four answers: what changed, what user problem it solves, where the user finds it, and how to experience it. Use product language and observable behavior before implementation names or commit history.

When applicable, state installation or upgrade steps, supported platforms and versions, migration or data effects, compatibility constraints, and known limitations. Omitting a section means it is not applicable, not that it was silently verified.

## Evidence record

Each verification scenario records:

- date, local time, and time zone;
- exact release identifier, version, and commit;
- environment, including OS, architecture, relevant dependencies, and external services;
- build under test: source checkout, locally built package, release candidate, or formally published product;
- evidence origin: this release's run or clearly labelled historical material;
- data classification: synthetic or sanitized real data;
- model or service classification: mock, controlled service, or named real provider;
- numbered actions, expected result, actual result, and status;
- relative evidence links and any failure, recovery action, skip reason, or unverified scope.

Use `passed`, `failed`, `skipped`, or `not verified` as scenario status. A source test does not validate a formal installer, a mock does not validate a real provider, and a component test does not validate the complete product journey. State only the claim directly supported by the recorded observation.

## Screenshots, logs, and sensitive data

Capture useful states such as before the action, in progress, the result, and failure recovery when they help another person assess the journey. There is no screenshot quota: non-UI changes may rely on command output, logs, checksums, package metadata, or downloadable artifact evidence instead.

Use readable PNG or WebP files with short captions and relative links. Store bounded text logs with the command, exit status, and relevant output; link source and CI runs with commit- or run-specific URLs. Historical screenshots remain labelled historical and never count as a current run.

Inspect every file before commit or upload. Credentials, tokens, account identifiers, personal information, private business content, proxy credentials, and private paths must not enter Git history or release attachments. Create a sanitized derivative outside the repository and add only that derivative; never add a sensitive original and attempt to remove it later.

## Publication and immutable links

Before tagging, complete the version archive, update this index, check every relative link and rendered image, and confirm that an extracted download contains the documented files. The existing documentation checks may help with Markdown integrity, but they do not prove the release or the recorded product behavior.

Use the existing channel's attachment mechanism for a dedicated `<release-tag>-verification.zip` when one exists. Otherwise, link the automatically downloadable source archive for the immutable tag and state that the verification folder is inside it. The public release page links the gallery and archive at the commit that contains them; it does not link a moving branch.

After publication, verify the product at its actual destination: download and inspect or install desktop assets, query and install npm or PyPI packages, and open the deployed documentation as applicable. Record the public URLs, filenames, versions, hashes, updater metadata, and installed behavior that were actually checked. A green workflow or an uploaded workflow artifact alone is not publication proof.

Never move a public tag or replace a published installer to repair its archive. Publish a new version when released bytes or user-visible claims need correction.

## Delivery status

Every version page and handoff reports these independently:

- **Product publication status:** which channels and product files are actually downloadable or installable, failed, or not applicable.
- **Verification archive status:** complete, partial, or missing, with the evidence commit and download location when available; a partial or missing archive lists each outstanding item and its next step when known.
- **Website synchronization status:** for YourBuddy, pending, deployed but not verified, deployed and verified, or failed, with the site commit, workflow run, live URLs, and outstanding checks; mark unrelated channels not applicable.
- **Unverified scope:** every skipped, failed, historical-only, source-only, platform-specific, mock-only, or otherwise untested claim.

The checklist belongs to the copied version page. Keep the shared [_template](_template/README.md) unchecked so it never masquerades as evidence for a release.

## Process scope

This is a documentation and evidence convention. It adds no custom validation script, CI requirement, manual approval, credential flow, or duplicate release command.
