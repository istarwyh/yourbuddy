# Agent Note: YourBuddy GPT Auth compatibility

Status: implemented

English | [中文](2026-09-20-yourbuddy-codex-auth-rpc-registration.zh.md)

## Problem

The GPT Auth Client calls a dedicated `/codex-auth` Connection channel for login status, usage, and login flows. Its Host registration injects `connection` alone, but `connection.rpc.handle()` registers the physical route through the caller Context's `webServer` service. Cordis traceable service calls preserve the feature's outer lifecycle Context across a nested optional injection, so the direct `owner.webServer` read also fails when only the nested fiber declares that service. The rest of the optional plugin fiber continues to boot. A status request falls through to the Web application's static handler as HTTP 405, and the settings page displays a red status even when the official Codex login file remains configured.

The assembled product smoke proves that the Codex Auth Client bundle loads, but it does not call the dedicated channel or open the GPT Auth settings section. A missing Host route can therefore pass release verification.

The same external snapshot constructs a `ResolvedPiAiProviderProfile` from an older `dsh-llm-pi-ai` contract. The bundled adapter now reads the per-model diagnostic map before resolving an exact model, but the snapshot omits `modelErrors`. Provider discovery can list Codex models, while catalog resolution and every prepared Codex call fail at `profile.modelErrors.get(model)` with `Cannot read properties of undefined (reading 'get')` before provider I/O.

## Decision

The YourBuddy Codex Auth snapshot carries a materialized compatibility patch that injects both `connection` and `webServer` before calling `connection.rpc.handle()`. The Connection service resolves the active Web Server with strict `owner.get('webServer')` while it keeps the route effect on the caller Context. The optional fiber therefore governs both service availability and disposal without forcing the complete Codex LLM adapter to require a Web carrier. The same patch supplies an empty `modelErrors` map because the fixed Codex profile has no configuration-derived model diagnostics; this satisfies the current `ResolvedPiAiProviderProfile` contract without changing model membership or request behavior. Refresh replays the digest-pinned product patch against the reviewed upstream artifact.

The assembled desktop browser smoke resolves the Codex model group through the real model selector without dispatching a model request. It also posts a real `status` request through `/codex-auth/status`, validates the Connection response envelope and public status fields, opens the GPT Auth settings section, and requires its unavailable-CLI state to render without a transport failure. The isolated release environment deliberately contains neither a Codex executable nor login credentials, so the checks prove adapter compatibility and route availability without reading or copying a user's authentication data.

## Alternatives considered

**Treat HTTP 405 as a signed-out state.** Rejected because the login, usage, and refresh actions still have no Host route, and hiding the transport failure would report a false authentication state.

**Move GPT Auth onto the shared `/api` channel.** Rejected because the plugin already owns a dedicated authenticated Connection channel, and changing its Client protocol is unnecessary.

**Bind every Connection RPC registration to the provider Context.** Rejected because caller-scoped effects let each consumer own and dispose its route with its plugin lifecycle. GPT Auth declares the services that its optional route registration uses, while Connection performs the topology-independent active-service lookup required inside its traceable call.

## Consequences

GPT Auth status, usage, and login routes mount only after both Connection and Web Server are available. The settings page can distinguish a missing Codex executable, a signed-out account, and a configured login instead of reporting an unrelated transport error. The Codex model group also resolves exact model metadata before a turn starts, so model selection and `prepareCall()` no longer fail on the missing diagnostic map. Future upstream refreshes must keep, update, or explicitly retire the materialized patch, and release verification now fails when either the dedicated route or the Codex catalog contract regresses.
