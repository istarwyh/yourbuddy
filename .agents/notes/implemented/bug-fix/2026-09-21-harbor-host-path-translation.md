# Agent Note: Harbor Host path translation is idempotent

Status: implemented

English | [中文](2026-09-21-harbor-host-path-translation.zh.md)

## Problem

The bundled Harbor Historical Session adapter resolves logical container paths before passing its Python command to the Host execution provider. The provider also translates logical path fragments inside commands. A resolved Trial path contains `/opt/harbor-dsh` below `.host-environment`, so translating it again inserts the Trial Host Root twice and makes the frozen Session Observation unreadable. Every Trial then stops at the Adapter and the Workbench reports infrastructure failure instead of a score.

## Decision

Harbor Host command translation protects every mapped Host path with a collision-free placeholder before replacing logical roots, then restores the protected paths. Commands may therefore contain logical Harbor paths, resolved Host paths, or both; each logical path is translated exactly once.

The reviewed Harbor snapshot and Python Adapter remain a matched stable-release pair under the [YourBuddy product workbench distribution](../feature/2026-08-22-yourbuddy-product-workbench.md). The bundled regression creates a valid frozen Session Observation, runs `SessionObservationAgent` through the real `HostEnvironment`, and verifies its Digest and Trial Artifact.

## Alternatives considered

**Remove path resolution from SessionObservationAgent only.** Rejected because Candidate execution uses the same resolved-path convention. Fixing one caller would leave the Host provider non-idempotent and preserve the same failure mode for other commands.

**Accept infrastructure failures as unscored Trials.** Rejected because the Adapter did not produce an Observation Artifact. Reclassifying the failure would weaken score validity and hide a broken execution path.

**Rewrite the failed Job.** Rejected because Harbor Jobs and Trials are immutable evidence. Verification creates a fresh Historical Job after the corrected release is installed.

## Consequences

Historical Session Observation and Candidate commands can share the Host path resolver without duplicate Trial roots. The translation helper performs a bounded protection and restore pass over configured mappings before its existing logical-root substitution. Source tests prove Adapter completion without invoking a model; a fresh packaged Historical Job remains required to verify Renderer and Judge completion with the installed desktop runtime.
