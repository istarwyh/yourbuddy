# Agent Note: Windows coverage resource determinism

Status: implemented

English | [中文](2026-09-08-windows-coverage-resource-determinism.zh.md)

## Problem

The Windows coverage lane exposed two independent test assumptions after the YourBuddy change itself passed. The Inspector port-selection case occupied an operating-system-assigned port and assumed the next integer could bind. Windows can reserve an adjacent port and report `EACCES`, so the Worker stopped even though a later loopback port remained usable. The archived projection-cache fixture appended the rewrite events and polled the JSON file for five seconds even though the public cache write already provides an exact durability promise. Coverage load could exceed that local polling deadline and leave the earlier `null` title in the last observation.

These are a platform-owned resource condition and load-sensitive synchronization, not evidence that retrying the same workflow is sufficient. CI run 34147385017 is retained as the negative control: 15,437 tests passed, while the two cases failed with `EACCES` and a stale polled value.

## Decision

Inspector sequential port selection treats both `EADDRINUSE` and `EACCES` as candidate-local unavailability when the caller supplied a nonzero starting port. It continues upward until a port binds or the range ends. Port `0` remains a single operating-system allocation request, and every other listen failure remains fatal. The package documentation now describes occupied and operating-system-reserved candidates separately.

The archived projection fixture still creates a live Session and appends the title and `turn/end` events, then awaits `SessionProjectionCache.write(session)` before reading the rewritten file once. This uses the cache owner's durability signal instead of scheduler-dependent polling. The cache package's dedicated policy suite remains responsible for proving the automatic creation, `turn/end`, threshold, interval, and disposal triggers.

## Verification

The Inspector regression keeps the real occupied-port Worker path and adds direct classification cases for `EADDRINUSE`, `EACCES`, an unrelated network error, and a non-Error value. The focused Inspector and projection-cache suites must pass locally. The complete Windows coverage lane must then pass on a new commit because macOS cannot reproduce Windows excluded-port behavior.

## Alternatives considered

**Retry the failed workflow.** A passing retry would not remove either assumption and would not explain why the same commit can vary with Windows port reservations or coverage load.

**Increase the projection polling timeout.** A larger deadline would still use time as the completion condition even though the public cache write already reports durability.

**Skip the Inspector case on Windows.** Port selection is cross-platform product behavior. Windows supplies the missing negative control for reserved candidates and should remain in the blocking lane.

**Find and preflight an adjacent free port in the test.** Availability checking followed by a later bind is a race with other host processes and cannot reserve the candidate for the Worker.

## Consequences

Inspector can pass Windows excluded port ranges without hiding unrelated listen failures. The archived cache migration fixture waits for owned persistence rather than elapsed time. The release record must preserve both failed CI runs and distinguish the original Codex teardown correction from these independent repository-test failures.
