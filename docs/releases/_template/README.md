# <Product name> <version>

English | [中文](README.zh.md)

Copy this directory to `docs/releases/<release-tag>/`, replace every placeholder, and keep this shared template unchecked.

- Release identifier: `<exact tag>`
- Product channel: `<desktop / dsh npm and docs / vendor npm / Landlock npm / Python>`
- Archive state: `<draft / published / partial>`
- Evidence commit: `<immutable commit permalink used from the public release page>`
- Evidence gallery: `<relative screenshots path or not applicable>`
- Evidence download: `<dedicated archive URL or immutable tag source archive URL>`

## User release notes

### What changed

<Describe the user-visible change.>

### Problem solved

<Describe the user problem and the improved outcome.>

### Where to use it

<Name the product area, command, setting, package, or documentation page.>

### How to try it

<Give the shortest observable journey.>

### Install or upgrade

<State the real installation or upgrade path, or mark not applicable.>

### Compatibility, migration, and limitations

<State supported systems and versions, migrations or data effects, compatibility constraints, known limitations, and anything not applicable.>

## Verification summary

| Scenario | Status | Build under test | Environment | Evidence |
|---|---|---|---|---|
| `<scenario>` | `<passed / failed / skipped / not verified>` | `<source / local package / release candidate / published product>` | `<OS, architecture, dependencies>` | `<relative links>` |

## Scenario: <name>

- Status: `<passed / failed / skipped / not verified>`
- Date and time: `<YYYY-MM-DD HH:MM UTC offset and time-zone name>`
- Release and commit: `<release identifier, version, full commit>`
- Build under test: `<source checkout / local package / release candidate / formally published product, with hash or URL>`
- Environment: `<OS, version, architecture, application/runtime versions, dependencies, external services>`
- Evidence origin: `<this release run / historical material dated ...>`
- Data: `<synthetic / sanitized real data>`
- Model or service: `<mock / controlled service / named real provider and model>`

### Steps

1. <Record an exact user or operator action.>
2. <Record the next action.>

### Expected

<State the observable expected result.>

### Actual

<State the observed result, including errors and partial behavior.>

### Evidence

- Before: `<relative screenshot or log link and caption, or not captured with reason>`
- In progress: `<relative screenshot or log link and caption, or not captured with reason>`
- Result: `<relative screenshot, log, checksum, artifact listing, or run link and caption>`
- Failure and recovery: `<relative evidence and recovery outcome, or not applicable>`

### Scope limits

<State what this scenario does not prove.>

## Delivery status

- Product publication status: `<published channels and verified files / failed / not applicable>`
- Verification archive status: `<complete / partial / missing, evidence commit, gallery, download, and itemized follow-ups>`
- Website synchronization status: `<pending / deployed but not verified / deployed and verified / failed / not applicable; website commit, workflow run, checked URLs and date, and outstanding checks>`
- Unverified scope: `<all failed, skipped, historical-only, source-only, platform-specific, mock-only, or otherwise untested claims>`

## Delivery checklist

- [ ] The release identifier and every version source match the existing channel procedure.
- [ ] The opening notes answer what changed, the problem solved, where to use it, and how to try it.
- [ ] Installation or upgrade, compatibility, migration, and known limitations are stated when applicable.
- [ ] Every scenario records date, time zone, commit, environment, build under test, evidence origin, data type, and model or service type.
- [ ] Steps, expected result, actual result, status, and scope limits match what was observed.
- [ ] Useful before, in-progress, result, failure, and recovery states are retained without imposing a screenshot quota.
- [ ] Source-only, historical-only, synthetic-data, mock, skipped, failed, and unverified evidence is labelled explicitly.
- [ ] Screenshots are readable, captioned, and linked relatively; logs and source references are bounded and traceable.
- [ ] Only sanitized derivatives are tracked or attached; credentials, personal information, private content, and sensitive originals are absent.
- [ ] The release entry was added to `docs/releases/README.md` and both language files were confirmed consistent.
- [ ] Relative links and images render, and every referenced local file exists.
- [ ] The downloadable evidence archive was extracted and its documented contents were opened successfully.
- [ ] The public release page links to the evidence commit, gallery, and download without relying on a moving branch.
- [ ] The actual product destination was checked independently of CI and temporary workflow artifacts.
- [ ] Published filenames, versions, hashes, registry metadata, updater metadata, and installed behavior are recorded as applicable.
- [ ] For YourBuddy, [release website synchronization](../../product-website.md#release-synchronization) covers both languages, actual download links, affected guides and plugins, and the observed live deployment; unrelated channels are marked not applicable.
- [ ] Product publication status, verification archive status, website synchronization, and unverified scope are reported separately.
- [ ] Public tags and installers were not moved or overwritten; corrections use a new version.
