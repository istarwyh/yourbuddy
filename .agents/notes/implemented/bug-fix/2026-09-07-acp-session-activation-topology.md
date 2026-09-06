# Agent Note: Publish ACP sessions after stable configuration discovery

Status: implemented

English | [中文](2026-09-07-acp-session-activation-topology.zh.md)

## Problem

ACP session creation and resumption inserted the session into the active-session map before configuration discovery completed. An `llm/adapters-updated` event during that interval could publish `config_option_update` before the `session/new` or `session/resume` response. The response already carried the complete initial options, and event timing made the extra notification nondeterministic across hosts.

## Decision

Session creation and resumption keep their records private until configuration discovery succeeds and the session is ready for client requests. The bridge counts provider-topology commits. If the count changes while initial options are being discovered, discovery repeats; creation also rechecks the count after empty-session materialization. Only the stable option state is returned in the activation response.

After activation, provider-topology commits continue to publish complete configuration updates through the existing per-session update path.

## Verification

- ACP bridge tests pause model discovery, change provider topology, and prove that the activation response includes the new provider without an early session update.
- A separate test pauses initial persistence and proves that a topology change in that interval triggers a fresh option read.
- The keyless ACP transcript corpus fixes `session/new` as the first carrier of initial configuration options while retaining post-activation topology-update coverage.

## Alternatives considered

**Accept either wire order in snapshots.** Rejected because clients should not observe session updates before the request that publishes the session has completed.

**Ignore topology changes during activation.** Rejected because the returned option state could already be stale when activation completes.

## Consequences

An ACP session is addressable only after its activation response is ready. Frequent topology changes can extend configuration discovery, while post-activation changes retain their existing asynchronous notification behavior.
