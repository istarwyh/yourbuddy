# Agent Note: Remove duplicate plugin build approval from YourBuddy

Status: implemented

English | [中文](2026-09-16-yourbuddy-plugin-build-approval.zh.md)

## Problem

YourBuddy installs optional plugins into its isolated Web Profile after the user confirms an installation or runs a copied `dsh plugin add` command. pnpm 11 aborts the first installation when a new dependency has a lifecycle script but the Profile has no matching build approval. The failed command already writes the dependency, so users must run `pnpm approve-builds` and repeat the original command before DSH can add the Bundle to the Profile.

## Decision

The repository workspace and YourBuddy's isolated `web` Profile own `dangerouslyAllowAllBuilds: true`. Installing the declared repository dependencies or explicitly installing a plugin already authorizes their lifecycle scripts, so pnpm does not request a second approval. Generic DSH Profiles retain their independent build policies.

Native startup creates the Web Profile workspace settings before the Host starts when they are absent. For an existing Profile, it preserves every other pnpm setting and any explicit `allowBuilds` entries while adding or enabling the product-owned key. When startup changes the key and the Profile manifest exists, Profile repair runs one installation pass even if every dependency directory already resolves; this completes lifecycle scripts left pending by an earlier pnpm error and lets the standard DSH reconciliation add the installed Bundle.

## Alternatives considered

**Keep the manual `pnpm approve-builds` recovery.** Rejected because it duplicates the user's explicit plugin-install decision, exposes a package-manager implementation detail, and turns a one-command product action into a failure-recovery procedure.

**Allowlist only currently known dependency scripts.** Rejected because the optional plugin catalog is intentionally open-ended. A static product allowlist would recreate the same first-install failure whenever a plugin introduced another lifecycle-script dependency.

**Change the generic DSH Profile template.** Rejected because other DSH distributions retain their own package-install policy instead of inheriting the repository or YourBuddy product decision.

## Consequences

Repository dependency installation, a recommended-plugin command, and a Marketplace installation run lifecycle scripts without a separate approval. An application upgrade repairs YourBuddy Profiles left by the former approval error and finishes their pending installation before the Host starts. Dependency lifecycle scripts run with the same user authority as the installed package; users and contributors remain responsible for selecting dependencies, and installed community code retains full Host privileges. Focused Rust tests cover missing, existing, disabled, and already-enabled Profile policies, while a pnpm 11 install probe verifies that the resulting workspace runs the previously blocked `protobufjs` script without an ignored-build error.
