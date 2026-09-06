import { d as decodeCodexNativeCheckpoint, g as isPlainJsonTree, m as isCodexNativeReplayRuntimeCompatible, p as hashCodexAccountIdentity, t as CODEX_NATIVE_CHECKPOINT_BLOCK_TYPE, u as codexNativeCheckpointCompatibilityDigest } from "./native-checkpoint-BGT6whVM.js";
import { n as codexTurnStateContinuity, t as codexNativeCompactionCoordinator } from "./native-compaction-DO9ObxWA.js";
import z from "@deepseek-ai/schemastery";
import { settingsNamespace } from "@deepseek-ai/dsh-settings";
import { homedir } from "node:os";
import { join } from "node:path";
import { open, readFile, stat } from "node:fs/promises";
import { writeFileAtomic } from "@deepseek-ai/dsh-atomic-write";
import { builtinProviders } from "@earendil-works/pi-ai/providers/all";
import { LlmError, freezeMessage, resolveRetryPolicy } from "@deepseek-ai/dsh-llm";
import { PiAiAdapter } from "@deepseek-ai/dsh-llm-pi-ai";
import { AsyncLocalStorage } from "node:async_hooks";
import { createHash, randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
//#region src/codex-auth.ts
/**
* Codex CLI login-state access for the DeepSeek Harness: read, refresh, and
* atomically persist the ChatGPT OAuth token set in the codex auth file
* (`~/.codex/auth.json`, or `$CODEX_HOME/auth.json` when CODEX_HOME is set).
*
* The file is the codex CLI's own. This module only (a) reads the current
* access token for a request, (b) refreshes it through the official OAuth
* refresh endpoint when it is about to expire, writing the result back with
* the same atomic-write discipline the codex CLI itself uses, and (c) reads
* status facts for configuration surfaces. No token value is ever logged or
* emitted by the status path.
*
* @module dsh-codex-auth/codex-auth
*/
/** The OAuth client id the official Codex CLI registers against auth.openai.com. */
const CODEX_OAUTH_CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
/** The OAuth token endpoint the codex CLI refreshes through. */
const CODEX_OAUTH_TOKEN_URL = "https://auth.openai.com/oauth/token";
/** Default lead time before the access token expires that a refresh is triggered. */
const DEFAULT_REFRESH_LEAD_MS = 3e5;
/** Refresh when the last recorded refresh is older than this (the codex CLI's own TOKEN_REFRESH_INTERVAL). */
const MAX_REFRESH_AGE_MS = 6912e5;
/** The auth file path for the current environment (CODEX_HOME overrides ~/.codex). */
function defaultAuthJsonPath(env = process.env) {
	const home = env.CODEX_HOME;
	return home !== void 0 && home.length > 0 ? join(home, "auth.json") : join(homedir(), ".codex", "auth.json");
}
/**
* Decode the JWT payload of a codex access token without verifying it. The
* chatgpt_account_id claim is the one pi-ai's codex provider extracts to set
* the `chatgpt-account-id` request header.
*/
function decodeAccessToken(token) {
	try {
		const parts = token.split(".");
		if (parts.length !== 3) return {};
		const payload = JSON.parse(Buffer.from(parts[1] ?? "", "base64url").toString("utf8"));
		const auth = payload["https://api.openai.com/auth"];
		return {
			...typeof payload.exp === "number" && Number.isFinite(payload.exp) ? { expSeconds: payload.exp } : {},
			...typeof auth?.chatgpt_account_id === "string" ? { chatgptAccountId: auth.chatgpt_account_id } : {},
			...typeof auth?.chatgpt_plan_type === "string" ? { chatgptPlanType: auth.chatgpt_plan_type } : {}
		};
	} catch {
		return {};
	}
}
/**
* Read and parse the codex auth file. Absence answers `undefined`; a malformed
* document throws — a file that exists but cannot be trusted must never read
* as "no login" on the settings page.
*/
async function readAuthFile(path) {
	let text;
	try {
		text = await readFile(path, "utf8");
	} catch (error) {
		if (isNotFound(error)) return void 0;
		throw error;
	}
	return parseAuthFile(path, text);
}
/**
* Read auth bytes and version facts from one open file descriptor. Atomic
* replacement after the open leaves this snapshot bound to the old inode, so
* a later path stat reliably invalidates it instead of pairing old bytes with
* a new file's timestamp.
*/
async function readAuthSnapshot(path) {
	let handle;
	try {
		handle = await open(path, "r");
	} catch (error) {
		if (isNotFound(error)) return void 0;
		throw error;
	}
	try {
		const before = versionFromStat(await handle.stat({ bigint: true }));
		const text = await handle.readFile("utf8");
		const after = versionFromStat(await handle.stat({ bigint: true }));
		if (!sameAuthFileVersion(before, after)) throw new Error(`codex-auth: ${path} changed while it was being read`);
		return {
			file: parseAuthFile(path, text),
			version: after
		};
	} finally {
		await handle.close();
	}
}
/** Read only the current path version for a cheap credential-cache check. */
async function readAuthFileVersion(path) {
	try {
		return versionFromStat(await stat(path, { bigint: true }));
	} catch (error) {
		if (isNotFound(error)) return void 0;
		throw error;
	}
}
/** Exact equality for the inode and freshness fields used by the auth cache. */
function sameAuthFileVersion(left, right) {
	return left.dev === right.dev && left.ino === right.ino && left.size === right.size && left.mtimeNs === right.mtimeNs && left.ctimeNs === right.ctimeNs;
}
function versionFromStat(value) {
	return {
		dev: value.dev,
		ino: value.ino,
		size: value.size,
		mtimeNs: value.mtimeNs,
		ctimeNs: value.ctimeNs
	};
}
function parseAuthFile(path, text) {
	const parsed = JSON.parse(text);
	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new TypeError(`codex-auth: ${path} must be a JSON object`);
	return parsed;
}
function isNotFound(error) {
	return error?.code === "ENOENT";
}
/** The current access-token facts of one auth file. */
function authState(file) {
	const accessToken = typeof file?.tokens?.access_token === "string" && file.tokens.access_token.length > 0 ? file.tokens.access_token : void 0;
	const expSeconds = accessToken === void 0 ? void 0 : decodeAccessToken(accessToken).expSeconds;
	return {
		file,
		accessToken,
		accessTokenExpiresAt: expSeconds === void 0 ? void 0 : expSeconds * 1e3
	};
}
/** Whether the access token is stale enough to warrant a refresh before use. */
function needsRefresh(state, leadMs) {
	return state.accessTokenExpiresAt !== void 0 && state.accessTokenExpiresAt - Date.now() < leadMs;
}
/** Whether the recorded refresh is old enough that codex itself would refresh (TOKEN_REFRESH_INTERVAL). */
function refreshTooOld(file, maxAgeMs) {
	if (typeof file?.last_refresh !== "string" || file.last_refresh.length === 0) return false;
	const at = Date.parse(file.last_refresh);
	return Number.isFinite(at) && Date.now() - at > maxAgeMs;
}
/**
* Refresh the token set through the official OAuth endpoint. The request
* mirrors the codex CLI's own wire format (JSON body, same client_id), so
* behaviour tracks the primary source exactly.
*/
async function refreshTokens(refreshToken, fetchImpl = fetch, signal) {
	const response = await fetchImpl(CODEX_OAUTH_TOKEN_URL, {
		method: "POST",
		...signal === void 0 ? {} : { signal },
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			client_id: CODEX_OAUTH_CLIENT_ID,
			grant_type: "refresh_token",
			refresh_token: refreshToken
		})
	});
	if (!response.ok) throw new Error(`codex-auth: token refresh answered ${response.status}`);
	const parsed = await response.json();
	if (typeof parsed !== "object" || parsed === null) throw new Error("codex-auth: token refresh reply is not a JSON object");
	const reply = parsed;
	if (typeof reply.access_token !== "string" || reply.access_token.length === 0) throw new Error("codex-auth: token refresh reply carries no access_token");
	return {
		access_token: reply.access_token,
		...typeof reply.refresh_token === "string" ? { refresh_token: reply.refresh_token } : {},
		...typeof reply.id_token === "string" ? { id_token: reply.id_token } : {},
		...typeof reply.account_id === "string" ? { account_id: reply.account_id } : {}
	};
}
/** Fold a refresh reply into the auth document, preserving every unknown field. */
function mergeRefreshed(file, reply) {
	return {
		...file,
		tokens: {
			...file.tokens,
			access_token: reply.access_token,
			...reply.refresh_token === void 0 ? {} : { refresh_token: reply.refresh_token },
			...reply.id_token === void 0 ? {} : { id_token: reply.id_token },
			...reply.account_id === void 0 ? {} : { account_id: reply.account_id }
		},
		last_refresh: (/* @__PURE__ */ new Date()).toISOString()
	};
}
/** Persist an auth document atomically at 0600, matching the codex CLI's own writes. */
async function writeAuthFile(path, file) {
	await writeFileAtomic(path, `${JSON.stringify(file, null, 2)}\n`, {
		mode: 384,
		dirMode: 448
	});
}
//#endregion
//#region src/codex-context.ts
/** Durable settings namespace for Codex LLM route preferences. */
const CODEX_LLM_SETTINGS_NAMESPACE = settingsNamespace("codex-llm");
/** Explicit opt-in budget matching Codex's documented one-million-token configuration. */
const CODEX_LONG_CONTEXT_WINDOW = 1e6;
const LONG_CONTEXT_MODEL_IDS = /* @__PURE__ */ new Set([
	"gpt-5.6-luna",
	"gpt-5.6-sol",
	"gpt-5.6-terra"
]);
const CodexLlmSettingsConfig = z.object({ longContextEnabled: z.boolean().default(false) });
/**
* Apply the plugin's narrow context policy without mutating pi-ai's generated
* catalog. Enabling the policy changes only the known GPT-5.6 family; every
* other descriptor and every non-capacity field remains provider-owned.
*/
function applyCodexContextPolicy(models, settings) {
	if (!settings.longContextEnabled) return models;
	return models.map((model) => LONG_CONTEXT_MODEL_IDS.has(model.id) ? {
		...model,
		contextWindow: CODEX_LONG_CONTEXT_WINDOW
	} : model);
}
//#endregion
//#region src/native-checkpoint-replay.ts
/**
* Host-only request scope that carries a Native candidate around pi-ai's
* provider-neutral message conversion and restores it at the Responses payload.
*
* @module dsh-codex-auth/native-checkpoint-replay
*/
const CODEX_ROUTE$1 = "openai-codex";
const MARKER_PREFIX = "[[dsh-codex-native-checkpoint:";
/** Pinned rc.2 Basic frame digests; source text remains owned by Basic. */
const BASIC_CHECKPOINT_OPEN_SHA256 = "7986ebcdf3457b678a1d08a59d9ec746ade700b5a5cb036c72284169103aca2d";
const BASIC_CHECKPOINT_CLOSE_SHA256 = "396eac8b7d03e4f0b95511caeeb28c11c88c7e09d2e0d2fabe9c01f7d8e357a5";
/**
* One Adapter-owned coordinator. AsyncLocalStorage is used only while advancing
* the lazy upstream iterator, so concurrent calls never share candidates.
*/
var CodexNativeCheckpointReplay = class {
	storage = new AsyncLocalStorage();
	generation = 0;
	/** Capture the replay generation owned by one prepared Adapter call. */
	captureGeneration() {
		return this.generation;
	}
	/** Invalidate request-local Native candidates while leaving durable messages untouched. */
	invalidate() {
		this.generation += 1;
	}
	/** Record the current request's hashed account after the auth coordinator resolves it. */
	noteAccount(accountId) {
		const scope = this.storage.getStore();
		if (scope === void 0) return;
		scope.accountHash = accountId === void 0 ? void 0 : hashCodexAccountIdentity(accountId);
	}
	/**
	* Clone checkpoint-bearing messages before pi-ai can flatten the custom block,
	* then bind the resulting plan to every advancement of the lazy stream.
	*/
	stream(options, dispatch, generation = this.generation) {
		const prepared = this.prepare(options, generation);
		if (prepared.scope === void 0) return dispatch(prepared.options);
		return this.scopedStream(prepared.scope, prepared.options, dispatch);
	}
	/** Restore before prior callbacks, then choose the final compatible representation. */
	payloadCallback(previous) {
		const scope = this.storage.getStore();
		if (scope === void 0) return previous;
		return async (payload, model) => {
			const restored = this.restorePayload(scope, payload);
			const returned = await previous?.(restored.payload, model);
			const effective = returned === void 0 ? restored.payload : returned;
			const finalized = this.finalizePayload(scope, restored.entries, effective);
			this.validateFinalPayload(scope, finalized.entries, finalized.payload);
			return finalized.payload;
		};
	}
	prepare(options, generation) {
		const entries = /* @__PURE__ */ new Map();
		const reservedText = options.messages.flatMap((message) => message.content.flatMap((block) => block.type === "text" ? [block.text] : []));
		let changed = false;
		let runtimeCompatible;
		const messages = options.messages.map((message) => {
			if (message.role !== "user") return message;
			const nativeBlocks = message.content.filter((block) => block.type === CODEX_NATIVE_CHECKPOINT_BLOCK_TYPE);
			if (nativeBlocks.length === 0) return message;
			changed = true;
			const portable = textOnlyMessage(message);
			runtimeCompatible ??= isCodexNativeReplayRuntimeCompatible();
			if (generation !== this.generation || !runtimeCompatible || !isCompleteBasicCheckpoint(message) || nativeBlocks.length !== 1) return portable;
			const decoded = decodeCodexNativeCheckpoint(nativeBlocks[0]);
			if (!decoded.ok) return portable;
			const marker = uniqueMarker(entries, reservedText);
			entries.set(marker, {
				marker,
				portableText: portable.content.map((block) => block.type === "text" ? block.text : "").join(""),
				checkpoint: decoded.checkpoint
			});
			return freezeMessage({
				...message,
				content: [{
					type: "text",
					text: marker
				}]
			});
		});
		if (!changed) return { options };
		const detached = {
			...options,
			messages
		};
		if (entries.size === 0) return { options: detached };
		return {
			options: detached,
			scope: {
				provider: options.provider,
				model: options.model,
				generation,
				entries,
				accountHash: void 0
			}
		};
	}
	async *scopedStream(scope, options, dispatch) {
		let iterator;
		try {
			iterator = this.storage.run(scope, () => dispatch(options)[Symbol.asyncIterator]());
			while (true) {
				const result = await this.storage.run(scope, () => iterator.next());
				if (result.done === true) return;
				yield result.value;
			}
		} finally {
			scope.accountHash = void 0;
			scope.entries.clear();
			if (iterator?.return !== void 0) await this.storage.run(scope, () => iterator.return());
		}
	}
	restorePayload(scope, payload) {
		const body = payloadRecord(payload);
		const input = body.input;
		if (!Array.isArray(input)) throw replayError("provider payload has no input array");
		const consumed = /* @__PURE__ */ new Set();
		const restoredEntries = [];
		const restoredInput = [];
		for (const item of input) {
			const marker = exactMarkerItem(item, scope.entries);
			if (marker === void 0) {
				restoredInput.push(item);
				continue;
			}
			if (consumed.has(marker)) throw replayError("duplicate checkpoint marker");
			consumed.add(marker);
			const entry = scope.entries.get(marker);
			if (entry === void 0) throw replayError("unknown checkpoint marker");
			const { usedNative, items: replacementItems } = this.materialize(scope, body, entry);
			restoredEntries.push({
				...entry,
				usedNative,
				inputIndex: restoredInput.length,
				expectedItems: structuredClone(replacementItems)
			});
			restoredInput.push(...replacementItems);
		}
		if (consumed.size !== scope.entries.size) throw replayError("missing, embedded, or unconsumed checkpoint marker");
		const restored = {
			...body,
			input: restoredInput
		};
		assertNoMarkers(scope, restored);
		return {
			payload: restored,
			entries: restoredEntries
		};
	}
	materialize(scope, payload, entry) {
		const usedNative = this.isCompatible(scope, payload, entry.checkpoint);
		return {
			usedNative,
			items: usedNative ? entry.checkpoint.replacementItems.map((item) => structuredClone(item)) : [portableUserItem(entry.portableText)]
		};
	}
	isCompatible(scope, payload, checkpoint) {
		if (scope.generation !== this.generation || scope.provider !== CODEX_ROUTE$1 || checkpoint.provenance.provider !== scope.provider || scope.accountHash === void 0 || checkpoint.provenance.accountHash !== scope.accountHash) return false;
		const input = compatibilityInput(scope, scope.accountHash, payload);
		if (input === void 0 || checkpoint.provenance.model !== input.model) return false;
		try {
			return checkpoint.compatibilityDigest === codexNativeCheckpointCompatibilityDigest(input);
		} catch {
			return false;
		}
	}
	finalizePayload(scope, entries, payload) {
		const body = payloadRecord(payload);
		const input = body.input;
		if (!Array.isArray(input)) throw replayError("final provider payload has no input array");
		const finalizedEntries = [];
		const finalizedInput = [];
		let cursor = 0;
		for (const entry of entries) {
			if (!sequenceAt(input, entry.inputIndex, entry.expectedItems)) throw replayError("provider callback erased or moved a checkpoint representation");
			finalizedInput.push(...input.slice(cursor, entry.inputIndex));
			const { usedNative, items: expectedItems } = this.materialize(scope, body, entry);
			finalizedEntries.push({
				...entry,
				usedNative,
				inputIndex: finalizedInput.length,
				expectedItems: structuredClone(expectedItems)
			});
			finalizedInput.push(...expectedItems);
			cursor = entry.inputIndex + entry.expectedItems.length;
		}
		finalizedInput.push(...input.slice(cursor));
		return {
			payload: {
				...body,
				input: finalizedInput
			},
			entries: finalizedEntries
		};
	}
	validateFinalPayload(scope, entries, payload) {
		if (!isPlainJsonTree(payload, { allowUndefinedObjectProperties: true })) throw invalidFinalPayload();
		const body = payloadRecord(payload);
		if (!Array.isArray(body.input)) throw replayError("final provider payload has no input array");
		assertNoMarkers(scope, body);
		const expectedPortableCounts = /* @__PURE__ */ new Map();
		const expectedNativeCounts = /* @__PURE__ */ new Map();
		for (const entry of entries) {
			const previousPortable = expectedPortableCounts.get(entry.portableText) ?? 0;
			expectedPortableCounts.set(entry.portableText, previousPortable + (entry.usedNative ? 0 : 1));
			const nativeArtifact = entry.checkpoint.replacementItems.at(-1);
			const identity = nativeArtifactIdentity(nativeArtifact);
			if (identity === void 0) throw replayError("native checkpoint lost terminal artifact");
			const previousNative = expectedNativeCounts.get(identity);
			expectedNativeCounts.set(identity, {
				count: (previousNative?.count ?? 0) + (entry.usedNative ? 1 : 0),
				artifact: nativeArtifact
			});
		}
		for (const [portableText, expectedCount] of expectedPortableCounts) if (body.input.filter((item) => portableItemMatches(item, portableText)).length !== expectedCount) throw replayError("checkpoint representations coexist or were duplicated");
		for (const { count: expectedCount, artifact } of expectedNativeCounts.values()) if (body.input.filter((item) => sameNativeArtifact(item, artifact)).length !== expectedCount) throw replayError("checkpoint representations coexist or were duplicated");
		for (const entry of entries) {
			if (!sequenceAt(body.input, entry.inputIndex, entry.expectedItems)) throw replayError("provider callback erased or moved a checkpoint representation");
			if (!entry.usedNative) continue;
			if (scope.accountHash === void 0) throw replayError("native replay lost account identity");
			const input = compatibilityInput(scope, scope.accountHash, body);
			if (input === void 0 || codexNativeCheckpointCompatibilityDigest(input) !== entry.checkpoint.compatibilityDigest) throw replayError("provider callback changed native compatibility controls");
		}
	}
};
function textOnlyMessage(message) {
	const content = message.content.filter((block) => block.type === "text");
	return freezeMessage({
		...message,
		content
	});
}
function sha256Text(text) {
	return createHash("sha256").update(text).digest("hex");
}
function isCompleteBasicCheckpoint(message) {
	const source = message.source;
	const sourceRecord = source;
	if (message.role !== "user" || source.kind !== "plugin" || source.plugin !== "compact" || typeof sourceRecord.compactionId !== "string") return false;
	if (message.content.length < 4 || message.content.some((block) => block.type !== "text" && block.type !== "codex-native-checkpoint")) return false;
	const first = message.content[0];
	const last = message.content.at(-1);
	if (first?.type !== "text" || sha256Text(first.text) !== BASIC_CHECKPOINT_OPEN_SHA256 || last?.type !== "text" || sha256Text(last.text) !== BASIC_CHECKPOINT_CLOSE_SHA256) return false;
	return message.content.slice(1, -1).some((block) => block.type === "text" && block.text.trim().length > 0);
}
function payloadRecord(payload) {
	if (!isRecord(payload)) throw replayError("provider payload is not an object");
	return payload;
}
function uniqueMarker(entries, reservedText) {
	const entropy = randomUUID();
	let marker = `${MARKER_PREFIX}${entropy}]]`;
	let collision = 0;
	while (entries.has(marker) || reservedText.some((text) => text.includes(marker))) {
		collision += 1;
		marker = `${MARKER_PREFIX}${entropy}:${collision}]]`;
	}
	return marker;
}
function exactMarkerItem(item, entries) {
	if (!isRecord(item) || !hasOnlyKeys(item, ["role", "content"]) || item.role !== "user" || !Array.isArray(item.content) || item.content.length !== 1) return void 0;
	const content = item.content[0];
	if (!isRecord(content) || !hasOnlyKeys(content, ["type", "text"]) || content.type !== "input_text" || typeof content.text !== "string" || !entries.has(content.text)) return void 0;
	return content.text;
}
function portableUserItem(text) {
	return {
		role: "user",
		content: [{
			type: "input_text",
			text
		}]
	};
}
function sequenceAt(input, start, expected) {
	return start >= 0 && start + expected.length <= input.length && expected.every((item, offset) => isDeepStrictEqual(input[start + offset], item));
}
/** The opaque bytes, not forward-extensible metadata, identify native state. */
function nativeArtifactIdentity(value) {
	return isRecord(value) && value.type === "compaction" && typeof value.encrypted_content === "string" ? value.encrypted_content : void 0;
}
function sameNativeArtifact(actual, expected) {
	const identity = nativeArtifactIdentity(expected);
	return identity !== void 0 && nativeArtifactIdentity(actual) === identity;
}
/** Match a complete Portable item without treating an ordinary quotation as replay state. */
function portableItemMatches(item, text) {
	if (!isRecord(item) || item.role !== "user" || text.length === 0) return false;
	if (typeof item.content === "string") return item.content === text;
	if (!Array.isArray(item.content)) return false;
	let joined = "";
	for (const content of item.content) {
		if (!isRecord(content) || content.type !== "input_text" || typeof content.text !== "string") return false;
		joined += content.text;
	}
	return joined === text;
}
function compatibilityInput(scope, accountHash, payload) {
	if (typeof payload.model !== "string" || payload.model.length === 0 || typeof payload.instructions !== "string" || typeof payload.parallel_tool_calls !== "boolean") return void 0;
	try {
		return {
			provider: scope.provider,
			model: payload.model,
			accountHash,
			instructions: payload.instructions,
			tools: jsonOrNull(payload.tools),
			parallelToolCalls: payload.parallel_tool_calls,
			toolChoice: jsonOrNull(payload.tool_choice),
			reasoning: jsonOrNull(payload.reasoning),
			text: jsonOrNull(payload.text),
			serviceTier: jsonOrNull(payload.service_tier)
		};
	} catch {
		return;
	}
}
function jsonOrNull(value) {
	if (value === void 0) return null;
	JSON.stringify(value);
	return value;
}
function invalidFinalPayload() {
	return replayError("final provider payload is not a plain JSON-compatible value");
}
function assertNoMarkers(scope, value) {
	if (typeof value === "string") {
		for (const marker of scope.entries.keys()) if (value.includes(marker)) throw replayError("checkpoint marker leaked into provider payload");
		return;
	}
	if (Array.isArray(value)) {
		for (const nested of value) assertNoMarkers(scope, nested);
		return;
	}
	if (!isRecord(value)) return;
	for (const nested of Object.values(value)) assertNoMarkers(scope, nested);
}
function hasOnlyKeys(value, allowed) {
	return Object.keys(value).length === allowed.length && allowed.every((key) => Object.hasOwn(value, key));
}
function replayError(message) {
	return /* @__PURE__ */ new Error(`llm-codex-auth native replay: ${message}`);
}
function isRecord(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}
//#endregion
//#region src/codex-auth-adapter.ts
/**
* The LLM adapter half of the codex-auth plugin: registers the `openai-codex`
* route with a pi-ai-backed adapter that resolves the ChatGPT access token
* from the live codex auth file (refreshing through the official OAuth
* endpoint when it is about to expire) instead of through the credentials
* seam — which is single-provider by design and cannot be extended from a
* plugin.
*
* Everything provider-specific — the chatgpt.com/backend-api Responses
* protocol, tool calls, SSE/WebSocket transports, the model catalog — is the
* installed pi-ai `openai-codex` provider, wrapped by the harness's own
* `PiAiAdapter`; this package supplies the credential, route, and a narrow
* request-scoped replay, Portable-call capture, and one-shot automatic
* compaction turn continuity for Native Checkpoints.
*
* The route streams over SSE by default: pi-ai prefers a WebSocket connection
* (`wss://chatgpt.com/backend-api/codex/responses`) with a 15-second connect
* timeout and a per-session SSE fallback, but the WebSocket upgrade is
* unreliable through common HTTP proxies, and every new conversation pays the
* connect timeout again before the fallback engages. Pinning SSE removes that
* cliff (prompt caching via the `session-id`/`prompt_cache_key` still applies);
* `auto` and `websocket` remain selectable for networks where the WebSocket
* works.
*
* @module dsh-codex-auth/codex-auth-adapter
*/
/** The provider route this adapter registers. */
const CODEX_ROUTE = "openai-codex";
/** Default WebSocket connect timeout when a non-SSE transport is selected. */
const DEFAULT_WEBSOCKET_CONNECT_TIMEOUT_MS = 5e3;
/** Default request timeout: the SSE response-header phase, and the WebSocket message idle interval. */
const DEFAULT_REQUEST_TIMEOUT_MS = 12e4;
/** Provider-idle ceiling for one outstanding stream read, mirroring llm-pi-ai's default. */
const STREAM_IDLE_TIMEOUT_MS = 3e5;
/** rc1's default maximum encoded image payload for one pi-ai request. */
const MAX_REQUEST_IMAGE_BYTES = 20971520;
/** Default maximum pixel count for one normalized request image. */
const REQUEST_IMAGE_PIXEL_BUDGET = 4194304;
/** Default maximum encoded byte length for one normalized request image. */
const REQUEST_IMAGE_MAX_BYTES = 1048576;
/**
* Codex owns authentication in the Host-side coordinator and injects its token
* through `resolveApiKey` for each request. Pi-ai's login/storage surface must
* therefore remain deliberately inert: allowing it to discover or persist a
* second credential would break the single-source and secret-boundary rules.
*/
function codexAuthInjection() {
	return {
		credentials: {
			read: async () => void 0,
			list: async () => [],
			modify: async () => {
				throw new LlmError("llm-codex-auth: pi-ai credential persistence is disabled; use the Codex auth coordinator", "AUTH_PERSISTENCE_DISABLED");
			},
			delete: async () => {}
		},
		authContext: {
			env: async () => void 0,
			fileExists: async () => false
		}
	};
}
/**
* Api-key auth for a harness-authenticated route, mirroring llm-pi-ai's own
* helper: pi-ai honours a request's `apiKey` override only when the provider
* declares an api-key method, and the installed codex provider declares OAuth
* alone — so the method must be added beside it.
*/
function harnessApiKeyAuth(name) {
	return {
		name,
		resolve: ({ credential }) => Promise.resolve({
			auth: credential?.key === void 0 ? {} : { apiKey: credential.key },
			source: name
		})
	};
}
/** Apply one-shot continuity and both request observers before provider dispatch. */
function prepareCodexStreamOptions(provider, model, options, transport, configuredOnPayload, replay) {
	const continued = codexTurnStateContinuity.applyProviderOptions(options, provider.id, model.id);
	noteNativeCompactionRequest(provider, model, continued, transport);
	return withReplayPayload(continued, configuredOnPayload, replay);
}
/**
* The installed pi-ai catalog provider for the codex route, with the harness
* api-key method beside native OAuth and request-scoped payload restoration
* composed around both stream entry points. The catalog provider remains the
* owner of wire conversion and transport.
*/
function codexProvider(displayName, settings, replay, transport, configuredOnPayload) {
	const base = builtinProviders().find((candidate) => candidate.id === CODEX_ROUTE);
	if (base === void 0) throw new Error("llm-codex-auth: the installed pi-ai catalog ships no openai-codex provider");
	return {
		id: base.id,
		name: displayName,
		...base.baseUrl === void 0 ? {} : { baseUrl: base.baseUrl },
		auth: {
			...base.auth,
			apiKey: harnessApiKeyAuth(displayName)
		},
		getModels: () => applyCodexContextPolicy(base.getModels(), settings()),
		stream: (model, context, options) => base.stream(model, context, prepareCodexStreamOptions(base, model, options, transport, configuredOnPayload, replay)),
		streamSimple: (model, context, options) => base.streamSimple(model, context, prepareCodexStreamOptions(base, model, options, transport, configuredOnPayload, replay))
	};
}
function noteNativeCompactionRequest(provider, model, options, transport) {
	const baseUrl = model.baseUrl || provider.baseUrl;
	codexNativeCompactionCoordinator.noteProviderRequest({
		provider: provider.id,
		model: model.id,
		...baseUrl === void 0 ? {} : { baseUrl },
		...options?.sessionId === void 0 ? {} : { sessionId: options.sessionId },
		...options?.headers === void 0 ? {} : { headers: options.headers },
		...model.headers === void 0 ? {} : { modelHeaders: model.headers },
		fetchImpl: transport.fetchImpl,
		timeoutMs: transport.timeoutMs,
		streamIdleTimeoutMs: transport.streamIdleTimeoutMs
	});
}
function withReplayPayload(options, configured, replay) {
	const previous = composePayloadCallbacks(configured, options?.onPayload);
	const restored = replay.payloadCallback(previous);
	const onPayload = codexNativeCompactionCoordinator.payloadCallback(restored);
	return onPayload === void 0 ? options : {
		...options,
		onPayload
	};
}
function composePayloadCallbacks(first, second) {
	if (first === void 0) return second;
	if (second === void 0) return first;
	return async (payload, model) => {
		const firstResult = await first(payload, model);
		const afterFirst = firstResult === void 0 ? payload : firstResult;
		const secondResult = await second(afterFirst, model);
		return secondResult === void 0 ? afterFirst : secondResult;
	};
}
/**
* The codex-auth LLM adapter: one fixed `openai-codex` profile over the
* installed pi-ai provider, with the credential resolved from the codex auth
* file per request.
*/
var CodexAuthAdapter = class extends PiAiAdapter {
	nativeReplay;
	adapterGeneration;
	constructor(ctx, options) {
		const nativeReplay = new CodexNativeCheckpointReplay();
		const profile = {
			provider: CODEX_ROUTE,
			displayName: options.displayName,
			streamIdleTimeoutMs: STREAM_IDLE_TIMEOUT_MS,
			maxRequestImageBytes: MAX_REQUEST_IMAGE_BYTES,
			requestImagePixelBudget: REQUEST_IMAGE_PIXEL_BUDGET,
			requestImageMaxBytes: REQUEST_IMAGE_MAX_BYTES,
			retryPolicy: resolveRetryPolicy(void 0, `llm-codex-auth: provider "${CODEX_ROUTE}" retryPolicy`),
			piProvider: codexProvider(options.displayName, options.settings, nativeReplay, {
				fetchImpl: options.fetchImpl,
				timeoutMs: options.timeoutMs,
				streamIdleTimeoutMs: STREAM_IDLE_TIMEOUT_MS
			}, options.onPayload),
			configuredMaxTokens: /* @__PURE__ */ new Map(),
			transport: options.transport,
			websocketConnectTimeoutMs: options.websocketConnectTimeoutMs,
			timeoutMs: options.timeoutMs
		};
		const profiles = /* @__PURE__ */ new Map([[CODEX_ROUTE, profile]]);
		super({
			profiles: () => profiles,
			auth: codexAuthInjection(),
			resolveApiKey: async () => {
				const credential = await options.auth.credential();
				if (credential === void 0) throw new LlmError(`llm-codex-auth: no usable ChatGPT login for "${CODEX_ROUTE}"; run "codex login" (or use the "${options.credentialRef}" card on the Settings page) to sign in`, "MISSING_CREDENTIAL");
				nativeReplay.noteAccount(credential.accountId);
				codexTurnStateContinuity.noteAccount(credential.accountId);
				codexNativeCompactionCoordinator.noteCredential(credential.accessToken, credential.accountId);
				return credential.accessToken;
			},
			resolveAttachments: () => ctx.get("attachments")
		});
		this.nativeReplay = nativeReplay;
		this.adapterGeneration = codexTurnStateContinuity.createGeneration();
		ctx.on("llm/stream", (request, next) => codexTurnStateContinuity.observeLlmStream(request, next));
		ctx.effect(() => () => this.retireProcessLocalState(this.adapterGeneration), "llm-codex-auth: process-local replay cleanup");
	}
	retireProcessLocalState(generation) {
		codexTurnStateContinuity.retireGeneration(generation);
		this.nativeReplay.invalidate();
	}
	/** Discard prepared continuation and Native replay plans on route replacement. */
	replaceRouteGeneration() {
		const previous = this.adapterGeneration;
		this.adapterGeneration = codexTurnStateContinuity.createGeneration();
		this.retireProcessLocalState(previous);
	}
	async prepareCall(provider, model, signal) {
		const generation = this.adapterGeneration;
		const replayGeneration = this.nativeReplay.captureGeneration();
		const prepared = await super.prepareCall(provider, model, signal);
		return Object.freeze({
			...prepared,
			stream: (options) => codexTurnStateContinuity.withAdapterGeneration(generation, () => {
				const preparedOptions = codexNativeCompactionCoordinator.preparePortableCall(options);
				return this.nativeReplay.stream(preparedOptions, prepared.stream, replayGeneration);
			})
		});
	}
	stream(options) {
		const generation = this.adapterGeneration;
		return codexTurnStateContinuity.withAdapterGeneration(generation, () => {
			const preparedOptions = codexNativeCompactionCoordinator.preparePortableCall(options);
			return this.nativeReplay.stream(preparedOptions, (detached) => super.stream(detached));
		});
	}
};
//#endregion
//#region src/bounded-response.ts
async function readBoundedResponseText(response, maxBytes, signal, errors) {
	const declared = Number(response.headers.get("content-length"));
	if (Number.isFinite(declared) && declared > maxBytes) {
		await cancelResponseBody(response);
		throw errors.tooLarge();
	}
	if (response.body === null) return "";
	const reader = response.body.getReader();
	const chunks = [];
	let total = 0;
	try {
		while (true) {
			if (signal?.aborted === true && errors.cancelled !== void 0) throw errors.cancelled();
			const next = await reader.read();
			if (next.done) break;
			total += next.value.byteLength;
			if (total > maxBytes) {
				await reader.cancel();
				throw errors.tooLarge();
			}
			chunks.push(next.value);
		}
	} catch (error) {
		if (signal?.aborted === true && errors.cancelled !== void 0) throw errors.cancelled();
		throw error;
	} finally {
		reader.releaseLock();
	}
	const bytes = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return new TextDecoder().decode(bytes);
}
async function cancelResponseBody(response) {
	try {
		await response.body?.cancel();
	} catch {}
}
//#endregion
export { readAuthSnapshot as _, DEFAULT_WEBSOCKET_CONNECT_TIMEOUT_MS as a, sameAuthFileVersion as b, DEFAULT_REFRESH_LEAD_MS as c, decodeAccessToken as d, defaultAuthJsonPath as f, readAuthFileVersion as g, readAuthFile as h, DEFAULT_REQUEST_TIMEOUT_MS as i, MAX_REFRESH_AGE_MS as l, needsRefresh as m, CODEX_ROUTE as n, CODEX_LLM_SETTINGS_NAMESPACE as o, mergeRefreshed as p, CodexAuthAdapter as r, CodexLlmSettingsConfig as s, readBoundedResponseText as t, authState as u, refreshTokens as v, writeAuthFile as x, refreshTooOld as y };
