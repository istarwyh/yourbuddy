# Agent Note: Windows coverage resource determinism

Status: implemented

English | [中文](2026-09-08-windows-coverage-resource-determinism.zh.md)

## Problem

The Windows coverage lane exposed two independent test assumptions after the YourBuddy change itself passed. The Inspector port-selection case occupied an operating-system-assigned port and assumed the next integer could bind. Windows can reserve an adjacent port and report `EACCES`, so the Worker stopped even though a later loopback port remained usable. The archived projection-cache fixture appended the rewrite events and polled the JSON file for five seconds even though the public cache write already provides an exact durability promise. Coverage load could exceed that local polling deadline and leave the earlier `null` title in the last observation.

These are a platform-owned resource condition and load-sensitive synchronization, not evidence that retrying the same workflow is sufficient. CI run 34147385017 is retained as the negative control: 15,437 tests passed, while the two cases failed with `EACCES` and a stale polled value.

A later documentation-only Pull Request exposed a separate weakness in the gate runner. Its Windows process-table sampler assumed the pid/ppid projection was an acyclic set. A duplicate or transient cyclic relationship could repeatedly append the same child list; the variadic array append eventually raised `RangeError: Maximum call stack size exceeded` and failed the coverage lane independently of the test subprocess. CI run 34158590912 is retained as this negative control.

## Decision

Inspector sequential port selection treats both `EADDRINUSE` and `EACCES` as candidate-local unavailability when the caller supplied a nonzero starting port. It continues upward until a port binds or the range ends. Port `0` remains a single operating-system allocation request, and every other listen failure remains fatal. The package documentation now describes occupied and operating-system-reserved candidates separately.

The archived projection fixture still creates a live Session and appends the title and `turn/end` events, then awaits `SessionProjectionCache.write(session)` before reading the rewritten file once. This uses the cache owner's durability signal instead of scheduler-dependent polling. The cache package's dedicated policy suite remains responsible for proving the automatic creation, `turn/end`, threshold, interval, and disposal triggers.

The gate runner's process-tree walk treats process-table rows as an observation rather than a guaranteed tree. It starts with the root marked as visited, enqueues every other pid at most once, and appends children iteratively instead of spreading an unbounded list onto the JavaScript call stack. Valid acyclic input retains breadth-first order.

## Verification

The Inspector regression keeps the real occupied-port Worker path and adds direct classification cases for `EADDRINUSE`, `EACCES`, an unrelated network error, and a non-Error value. The focused Inspector and projection-cache suites must pass locally. Process-tree regression cases cover duplicate rows, a cycle back to the root, and 100,000 direct children. The complete Windows coverage lane must then pass on a new commit because macOS cannot reproduce Windows excluded-port behavior or the hosted process-table observation.

## Alternatives considered

**Retry the failed workflow.** A passing retry would not remove either assumption and would not explain why the same commit can vary with Windows port reservations or coverage load.

**Trust the operating-system process table to be a strict tree.** Sampling races and provider projections are outside the runner's ownership. De-duplicating observed pids is inexpensive and preserves the only fact teardown needs: which unique processes may belong to the gate.

**Increase the projection polling timeout.** A larger deadline would still use time as the completion condition even though the public cache write already reports durability.

**Skip the Inspector case on Windows.** Port selection is cross-platform product behavior. Windows supplies the missing negative control for reserved candidates and should remain in the blocking lane.

**Find and preflight an adjacent free port in the test.** Availability checking followed by a later bind is a race with other host processes and cannot reserve the candidate for the Worker.

## Consequences

Inspector can pass Windows excluded port ranges without hiding unrelated listen failures. The archived cache migration fixture waits for owned persistence rather than elapsed time. Process sampling no longer crashes the orchestration process on duplicate, cyclic, or wide observations. The release record must preserve the failed CI runs and distinguish the original Codex teardown correction from these independent repository-test and runner failures.
