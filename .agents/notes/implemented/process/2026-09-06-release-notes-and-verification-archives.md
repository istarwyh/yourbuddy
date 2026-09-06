# Agent Note: Versioned release notes and verification archives

Status: implemented

English | [中文](2026-09-06-release-notes-and-verification-archives.zh.md)

## Problem

This repository publishes independently versioned desktop, DSH, vendored Cordis, Landlock, Python, and documentation products. Their existing procedures define reproducible builds and protected publication, but no durable record connects a release's user-visible changes to the exact environment, journey, failures, and published files that were actually checked. CI success, source tests, temporary workflow artifacts, and current-branch documentation can therefore be mistaken for a complete product release.

Release notes also need to serve users. A list of commits or internal mechanisms does not tell a user what changed, what problem it solves, where to find it, or how to experience it, while screenshots copied from an older version can make an unverified journey look current.

## Decision

[`docs/releases/README.md`](../../../../docs/releases/README.md) is the single repository reference for user-facing release notes and verification archives. Each published tag has one `docs/releases/<release-tag>/` directory copied from the checked-in template. The exact tag is the directory key because the repository's release families use independent version lines.

The version page leads with the user outcome and records scenario-level evidence. Each scenario distinguishes source from a formal package, current evidence from historical material, synthetic from sanitized real data, and mock or controlled services from named real providers. Failed, skipped, and unverified states remain in the report; evidence supports only the claim its recorded environment and actions directly observe.

Screenshots are optional. A useful UI journey retains relevant before, in-progress, result, and failure-recovery states, while non-UI work may use bounded logs, checksums, registry metadata, or artifact listings. Only sanitized derivatives enter Git or release attachments.

The tagged commit contains the archive and version index. A public release page links to that immutable evidence commit and to a downloadable archive supplied by the existing channel or the tag's source archive. Once public, tags and installers remain immutable; a correction that changes released bytes or user-visible claims uses a new version.

Product publication, verification-archive completeness, website synchronization, and unverified scope are independent statuses. Maintainers verify the actual GitHub Release, updater channel, npm registry, PyPI registry, or documentation URL involved in that release instead of inferring publication from a green workflow.

YourBuddy release delivery includes the [product website synchronization procedure](../../../../docs/product-website.md#release-synchronization), surfaced through the desktop guide and documentation skill. Public availability follows verified release assets; committed website content deploys through the existing `master` workflow. Recording the site commit and live observations prevents a published installer with stale download guidance from appearing fully delivered. A website failure remains separate from product publication, and follow-up evidence never moves the release tag.

Existing channel documents and workflows continue to own version sources, release commands, registries, and credentials. This convention adds no custom script, CI requirement, approval, or publication path.

## Alternatives considered

**Use a conventional changelog alone.** A changelog can summarize user-visible changes but cannot preserve scenario environments, intermediate and failed states, artifact hashes, or the distinction between source and installed-product validation.

**Store evidence only in CI artifacts or release comments.** Temporary artifacts expire, comments can move or be edited without the tagged source, and neither provides a reviewable bilingual repository record before publication.

**Generate and enforce a release evidence schema in CI.** Mechanical completeness cannot establish that a screenshot is current or that a real product journey occurred. A new gate would also duplicate existing release procedures and add maintenance cost without validating the central truthfulness judgement.

## Consequences

Release preparation includes a small manual documentation step before tagging and a destination check after publication. The template makes expected fields and the per-release checklist discoverable, while the version archive remains reviewable with the code it describes.

The convention does not retroactively validate releases that predate it. The index remains empty until a release contains a complete or explicitly partial archive, and later evidence may describe an older version only when it is labelled with its actual date, build, and limitations.

Existing Markdown and translation checks can detect broken repository links and inconsistent bilingual files, but no automated check certifies the truth or completeness of release evidence. Reviewers and release operators retain that responsibility.
