import { _ as isPlainRecord, f as encodeCodexNativeCheckpoint, g as isPlainJsonTree, i as CODEX_NATIVE_CHECKPOINT_ESTIMATOR, l as MAX_CODEX_NATIVE_CHECKPOINT_BYTES, n as CODEX_NATIVE_CHECKPOINT_CODEC, o as CODEX_NATIVE_CHECKPOINT_RETENTION_POLICY, p as hashCodexAccountIdentity, t as CODEX_NATIVE_CHECKPOINT_BLOCK_TYPE, u as codexNativeCheckpointCompatibilityDigest, v as serializedJsonBytes, y as utf8ByteLength } from "./native-checkpoint-BGT6whVM.js";
import { isAgentLoopRequest } from "@deepseek-ai/dsh-llm";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
//#region src/native-compaction-breaker.ts
const TRANSIENT_FAILURE_WINDOW_MS = 3e5;
const TRANSIENT_OPEN_MS = 6e5;
const PROTOCOL_OPEN_MS = 36e5;
const MAX_RATE_LIMIT_OPEN_MS = 36e5;
const CODEX_NATIVE_DEFAULT_RATE_LIMIT_OPEN_MS = 6e4;
var NativeCompactionFailure = class extends Error {
	kind;
	retryAfterMs;
	constructor(kind, retryAfterMs) {
		super(`Codex native compaction ${kind} failure`);
		this.kind = kind;
		this.retryAfterMs = retryAfterMs;
	}
};
/** Process-local failure gate; it never retries or affects Portable operations. */
var NativeCompactionBreaker = class {
	states = /* @__PURE__ */ new Map();
	acquire(key, now = Date.now()) {
		this.pruneStaleTransientStates(now);
		let state = this.states.get(key);
		if (state === void 0) {
			state = {
				transientFailures: [],
				openUntil: 0,
				halfOpenProbe: false,
				inFlight: 0
			};
			this.states.set(key, state);
		}
		if (state.openUntil > now || state.halfOpenProbe) return void 0;
		const halfOpen = state.openUntil > 0;
		if (halfOpen) state.halfOpenProbe = true;
		const activeState = state;
		activeState.inFlight += 1;
		let settled = false;
		return {
			state: halfOpen ? "half-open" : "closed",
			succeed: () => {
				if (settled) return;
				settled = true;
				activeState.inFlight -= 1;
				activeState.openUntil = 0;
				activeState.halfOpenProbe = false;
				activeState.transientFailures.length = 0;
				if (activeState.inFlight === 0 && this.states.get(key) === activeState) this.states.delete(key);
			},
			fail: (failure) => {
				if (!settled) {
					settled = true;
					activeState.inFlight -= 1;
					this.recordFailure(key, activeState, failure, halfOpen, Date.now());
				}
				return activeState.openUntil > Date.now() ? "open" : "closed";
			},
			ignore: () => {
				if (settled) return;
				settled = true;
				activeState.inFlight -= 1;
				this.releaseIgnoredState(key, activeState);
			}
		};
	}
	releaseIgnoredState(key, state) {
		state.halfOpenProbe = false;
		if (state.inFlight === 0 && state.openUntil === 0 && state.transientFailures.length === 0 && this.states.get(key) === state) this.states.delete(key);
	}
	pruneStaleTransientStates(now) {
		for (const [key, state] of this.states) if (state.inFlight === 0 && state.openUntil === 0 && !state.halfOpenProbe && state.transientFailures.length > 0 && state.transientFailures.every((timestamp) => now - timestamp > TRANSIENT_FAILURE_WINDOW_MS)) this.states.delete(key);
	}
	recordFailure(key, state, failure, halfOpen, now) {
		state.halfOpenProbe = false;
		if (failure.kind === "size") {
			this.releaseIgnoredState(key, state);
			return;
		}
		if (failure.kind === "auth") {
			if (state.inFlight === 0 && (halfOpen || state.transientFailures.length === 0) && this.states.get(key) === state) this.states.delete(key);
			return;
		}
		if (failure.kind === "rate-limit") {
			const requested = failure.retryAfterMs ?? 6e4;
			state.openUntil = now + Math.min(Math.max(0, requested), MAX_RATE_LIMIT_OPEN_MS);
			state.transientFailures.length = 0;
			return;
		}
		if (failure.kind === "protocol") {
			state.openUntil = now + PROTOCOL_OPEN_MS;
			state.transientFailures.length = 0;
			return;
		}
		const recent = state.transientFailures.filter((timestamp) => now - timestamp <= TRANSIENT_FAILURE_WINDOW_MS);
		state.transientFailures.splice(0, state.transientFailures.length, ...recent, now);
		if (halfOpen || state.transientFailures.length >= 3) {
			state.openUntil = now + TRANSIENT_OPEN_MS;
			state.transientFailures.length = 0;
		}
	}
};
function nativeCompactionBreakerKey(accountHash, model, endpoint) {
	return JSON.stringify([
		accountHash,
		model,
		endpoint,
		CODEX_NATIVE_CHECKPOINT_CODEC,
		1
	]);
}
const nativeCompactionBreaker = new NativeCompactionBreaker();
//#endregion
//#region src/codex-turn-state.ts
const TURN_STATE_HEADER = "x-codex-turn-state";
/** Provider-confirmed continuation lifetime from the issue contract. */
const CODEX_TURN_STATE_TTL_MS = 6e4;
/** One immutable prepared-Adapter generation with mutable retirement state. */
var CodexAdapterGeneration = class {
	active = true;
};
/**
* Host-only one-shot handoff from inline native compaction to one loop request.
* The original GenerateOptions identity is observed before LlmRuntime projects
* or clones it; adapter code consumes only this request scope.
*/
var CodexTurnStateContinuity = class {
	requestStorage = new AsyncLocalStorage();
	generationStorage = new AsyncLocalStorage();
	pendingBySession = /* @__PURE__ */ new Map();
	createGeneration() {
		return new CodexAdapterGeneration();
	}
	/** Retire a route snapshot and synchronously erase every continuation it owns. */
	retireGeneration(generation) {
		if (!generation.active) return;
		generation.active = false;
		for (const pending of this.pendingBySession.values()) if (pending.generation === generation) this.discard(pending);
	}
	/**
	* Read the exact waterfall request, call next() without projecting or replacing
	* it, and keep the resulting identity around every lazy iterator advancement.
	*/
	observeLlmStream(options, next) {
		if (!isAgentLoopRequest(options) || options.sessionId === void 0) return next();
		const sessionId = String(options.sessionId);
		let candidate = this.pendingBySession.get(sessionId);
		if (candidate !== void 0 && (this.expired(candidate) || candidate.provider !== options.provider || candidate.model !== options.model)) {
			this.discard(candidate);
			candidate = void 0;
		}
		const scope = {
			sessionId,
			provider: options.provider,
			model: options.model,
			...candidate === void 0 ? {} : { candidate },
			accountHash: void 0,
			settled: false
		};
		return this.scopedStream(this.requestStorage, scope, next, () => {
			try {
				if (!scope.settled && scope.candidate !== void 0) this.discard(scope.candidate);
			} finally {
				scope.accountHash = void 0;
				scope.settled = true;
			}
		});
	}
	/** Bind one prepared Adapter generation around its lazy provider dispatch. */
	withAdapterGeneration(generation, dispatch) {
		return this.scopedStream(this.generationStorage, generation, dispatch);
	}
	currentGeneration() {
		return this.generationStorage.getStore();
	}
	/** Record only a domain-separated account hash in the loop request scope. */
	noteAccount(accountId) {
		const scope = this.requestStorage.getStore();
		if (scope === void 0) return;
		scope.accountHash = accountId === void 0 ? void 0 : hashCodexAccountIdentity(accountId);
	}
	/**
	* Consume a matching continuation immediately before the provider stream is
	* created. Any account/generation/request mismatch erases it without sending.
	*/
	applyProviderOptions(options, provider, model) {
		const scope = this.requestStorage.getStore();
		const generation = this.generationStorage.getStore();
		const candidate = scope?.candidate;
		if (scope === void 0 || candidate === void 0 || scope.settled) return options;
		const sessionId = options?.sessionId;
		if (!(this.pendingBySession.get(scope.sessionId) === candidate && candidate.turnState.length > 0 && !this.expired(candidate) && generation !== void 0 && generation.active && candidate.generation === generation && scope.provider === provider && scope.model === model && sessionId === scope.sessionId && scope.accountHash !== void 0 && candidate.accountHash === scope.accountHash)) {
			this.discard(candidate);
			scope.settled = true;
			return options;
		}
		const turnState = candidate.turnState;
		this.discard(candidate);
		scope.settled = true;
		return {
			...options,
			headers: {
				...options?.headers,
				[TURN_STATE_HEADER]: turnState
			}
		};
	}
	/** Arm only after Basic reports the inline Dual Checkpoint commit as successful. */
	arm(input) {
		if (!input.generation.active || input.turnState.length === 0) return;
		const previous = this.pendingBySession.get(input.sessionId);
		if (previous !== void 0) this.discard(previous);
		const expiresAt = Date.now() + CODEX_TURN_STATE_TTL_MS;
		let pending;
		const timer = setTimeout(() => this.discard(pending), CODEX_TURN_STATE_TTL_MS);
		timer.unref();
		pending = {
			sessionId: input.sessionId,
			provider: input.provider,
			model: input.model,
			accountHash: input.accountHash,
			generation: input.generation,
			expiresAt,
			timer,
			turnState: input.turnState
		};
		this.pendingBySession.set(input.sessionId, pending);
	}
	expired(pending) {
		return Date.now() >= pending.expiresAt;
	}
	discard(pending) {
		clearTimeout(pending.timer);
		if (this.pendingBySession.get(pending.sessionId) === pending) this.pendingBySession.delete(pending.sessionId);
		pending.turnState = "";
	}
	async *scopedStream(storage, scope, dispatch, cleanup) {
		let iterator;
		try {
			iterator = storage.run(scope, () => dispatch()[Symbol.asyncIterator]());
			while (true) {
				const result = await storage.run(scope, () => iterator.next());
				if (result.done === true) return;
				yield result.value;
			}
		} finally {
			cleanup?.();
			if (iterator?.return !== void 0) await storage.run(scope, () => iterator.return());
		}
	}
};
const codexTurnStateContinuity = new CodexTurnStateContinuity();
//#endregion
//#region src/native-compaction-retention.ts
const CODEX_NATIVE_RETENTION_TOKEN_BUDGET = 64e3;
/** Retain newest eligible text-only user groups and one safe boundary prefix. */
function retainRecentCodexUserMessages(inputWithTrigger, budgetTokens = CODEX_NATIVE_RETENTION_TOKEN_BUDGET) {
	const input = inputWithTrigger.slice(0, -1);
	const retainedNewestFirst = [];
	for (let index = input.length - 1; index >= 0; index -= 1) {
		const item = input[index];
		if (item === void 0 || !isRetainableUserItem(item)) continue;
		const cloned = structuredClone(item);
		if (estimateRetainedTokens([...retainedNewestFirst, cloned]) <= budgetTokens) {
			retainedNewestFirst.push(cloned);
			continue;
		}
		const truncated = truncateUserItem(cloned, retainedNewestFirst, budgetTokens);
		if (truncated !== void 0) retainedNewestFirst.push(truncated);
		break;
	}
	return retainedNewestFirst.reverse();
}
/** Canonical JSON UTF-8 estimate used for retained text-only items. */
function estimateCodexJsonTokens(value) {
	return Math.ceil(serializedJsonBytes(value) / 4);
}
function estimateRetainedTokens(items) {
	return items.reduce((total, item) => total + estimateCodexJsonTokens(item), 0);
}
/**
* Versioned replay estimate matching Codex's pinned model-visible compaction
* heuristic: retained items use canonical JSON, while opaque base64 first pays
* the provider's 650-byte envelope deduction before four-bytes-per-token.
*/
function estimateCodexReplayTokens(retainedItems, artifact) {
	const retainedTokens = estimateRetainedTokens(retainedItems);
	const encodedLength = typeof artifact.encrypted_content === "string" ? artifact.encrypted_content.length : 0;
	const opaqueModelVisibleBytes = Math.max(Math.floor(encodedLength * 3 / 4) - 650, 0);
	return retainedTokens + Math.ceil(opaqueModelVisibleBytes / 4);
}
function truncateUserItem(item, newerItems, budgetTokens) {
	if (budgetTokens <= 0) return void 0;
	const textLength = typeof item.content === "string" ? item.content.length : Array.isArray(item.content) ? item.content.reduce((total, part) => total + (isPlainRecord(part) && typeof part.text === "string" ? part.text.length : 0), 0) : 0;
	if (textLength === 0) return void 0;
	let low = 1;
	let high = textLength;
	let accepted;
	while (low <= high) {
		const length = Math.floor((low + high) / 2);
		const candidate = retainItemTextPrefix(item, length);
		if (candidate !== void 0 && estimateRetainedTokens([...newerItems, candidate]) <= budgetTokens) {
			accepted = candidate;
			low = length + 1;
		} else high = length - 1;
	}
	return accepted;
}
function retainItemTextPrefix(item, codeUnits) {
	if (typeof item.content === "string") return {
		...item,
		content: safeUnicodePrefix(item.content, codeUnits)
	};
	if (!Array.isArray(item.content)) return void 0;
	let remaining = codeUnits;
	const retained = [];
	for (const part of item.content) {
		if (remaining <= 0) break;
		if (!isPlainRecord(part) || typeof part.text !== "string") continue;
		const text = part.text.length <= remaining ? part.text : safeUnicodePrefix(part.text, remaining);
		retained.push({
			...part,
			text
		});
		remaining -= Math.min(part.text.length, remaining);
	}
	if (retained.length === 0) return void 0;
	return {
		...item,
		content: retained
	};
}
function safeUnicodePrefix(text, codeUnits) {
	let end = Math.min(text.length, codeUnits);
	if (end > 0) {
		const code = text.charCodeAt(end - 1);
		if (code >= 55296 && code <= 56319) end -= 1;
	}
	return text.slice(0, end);
}
function isRetainableUserItem(value) {
	if (!isPlainRecord(value) || value.type !== void 0 && value.type !== "message" || value.role !== "user") return false;
	if (typeof value.content === "string") return value.content.length > 0;
	return Array.isArray(value.content) && value.content.length > 0 && value.content.every((part) => isPlainRecord(part) && part.type === "input_text" && typeof part.text === "string" && part.text.length > 0);
}
//#endregion
//#region src/native-compaction-transport.ts
const DEFAULT_CODEX_BASE_URL = "https://chatgpt.com/backend-api";
const MAX_NATIVE_SSE_BYTES = MAX_CODEX_NATIVE_CHECKPOINT_BYTES + 262144;
const PROCESS_INSTALLATION_ID = randomUUID();
/** One no-retry v2 request using the existing Host fetch and timeout policy. */
async function sendCodexNativeCompaction(request, credential, operation, body, signal) {
	const headerTimeout = new AbortController();
	const headerTimer = request.timeoutMs > 0 ? setTimeout(() => headerTimeout.abort(new NativeCompactionFailure("transient")), request.timeoutMs) : void 0;
	const fetchSignal = headerTimer === void 0 ? signal : AbortSignal.any([signal, headerTimeout.signal]);
	let response;
	try {
		response = await awaitWithSignal(request.fetchImpl(codexResponsesUrl(request.baseUrl), {
			method: "POST",
			headers: buildCompactHeaders(request, credential, operation),
			body: JSON.stringify(body),
			signal: fetchSignal
		}), fetchSignal);
	} catch {
		signal.throwIfAborted();
		throw new NativeCompactionFailure("transient");
	} finally {
		if (headerTimer !== void 0) clearTimeout(headerTimer);
	}
	signal.throwIfAborted();
	if (!response.ok) throw httpFailure(response);
	try {
		const decoded = await decodeNativeResponse(response, signal, request.streamIdleTimeoutMs);
		const turnState = response.headers.get("x-codex-turn-state");
		return turnState === null || turnState.length === 0 ? decoded : {
			...decoded,
			turnState
		};
	} catch (error) {
		signal.throwIfAborted();
		if (error instanceof NativeCompactionFailure) throw error;
		throw new NativeCompactionFailure("protocol");
	}
}
function awaitWithSignal(value, signal) {
	signal.throwIfAborted();
	return new Promise((resolve, reject) => {
		let settled = false;
		const finish = (complete) => {
			if (settled) return;
			settled = true;
			signal.removeEventListener("abort", onAbort);
			complete();
		};
		const onAbort = () => finish(() => reject(signal.reason));
		signal.addEventListener("abort", onAbort, { once: true });
		if (signal.aborted) {
			onAbort();
			return;
		}
		Promise.resolve(value).then((result) => finish(() => resolve(result)), (error) => finish(() => reject(error)));
	});
}
function codexResponsesUrl(baseUrl) {
	const normalized = (baseUrl?.trim() || DEFAULT_CODEX_BASE_URL).replace(/\/+$/u, "");
	if (normalized.endsWith("/codex/responses")) return normalized;
	if (normalized.endsWith("/codex")) return `${normalized}/responses`;
	return `${normalized}/codex/responses`;
}
function buildCompactHeaders(request, credential, operation) {
	const headers = new Headers({
		accept: "text/event-stream",
		authorization: `Bearer ${credential.accessToken}`,
		"chatgpt-account-id": credential.accountId,
		"content-type": "application/json",
		"openai-beta": request.publicHeaders["openai-beta"] ?? "responses=experimental",
		originator: "dsh-codex-auth",
		"session-id": operation.sessionId,
		"user-agent": "dsh-codex-auth (DeepSeek Harness)",
		"x-client-request-id": operation.sessionId,
		"x-codex-installation-id": PROCESS_INSTALLATION_ID,
		"x-codex-turn-metadata": JSON.stringify({
			installation_id: PROCESS_INSTALLATION_ID,
			session_id: operation.sessionId,
			thread_id: operation.sessionId,
			window_id: operation.windowId,
			request_kind: "compaction",
			compaction: {
				trigger: "manual",
				reason: "manual",
				implementation: "remote",
				phase: "pre_commit",
				strategy: "memento"
			}
		}),
		"x-codex-window-id": operation.windowId,
		"x-openai-subagent": "compact"
	});
	const betaFeatures = request.publicHeaders["x-codex-beta-features"];
	if (betaFeatures !== void 0) headers.set("x-codex-beta-features", betaFeatures);
	return headers;
}
async function decodeNativeResponse(response, signal, streamIdleTimeoutMs) {
	if (response.body === null) throw new NativeCompactionFailure("protocol");
	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";
	let bytes = 0;
	let completed = 0;
	let lastEventType;
	let usage;
	let ignoredOutputItems = 0;
	const compactions = [];
	const acceptEvent = (data) => {
		if (data === "[DONE]") return;
		let parsed;
		try {
			parsed = JSON.parse(data);
		} catch {
			throw new NativeCompactionFailure("protocol");
		}
		if (!isPlainJsonTree(parsed) || !isPlainRecord(parsed) || typeof parsed.type !== "string") throw new NativeCompactionFailure("protocol");
		lastEventType = parsed.type;
		if (parsed.type === "error" || parsed.type === "response.failed") throw new NativeCompactionFailure("protocol");
		if (parsed.type === "response.output_item.done") {
			if (!isPlainRecord(parsed.item)) throw new NativeCompactionFailure("protocol");
			if (parsed.item.type === "compaction") {
				if (typeof parsed.item.encrypted_content !== "string" || parsed.item.encrypted_content.length === 0) throw new NativeCompactionFailure("protocol");
				compactions.push(structuredClone(parsed.item));
			} else ignoredOutputItems += 1;
			return;
		}
		if (parsed.type === "response.completed") {
			completed += 1;
			if (completed !== 1 || isPlainRecord(parsed.response) && parsed.response.status !== void 0 && parsed.response.status !== "completed") throw new NativeCompactionFailure("protocol");
			usage = responseUsage(parsed.response);
		}
	};
	try {
		while (true) {
			signal.throwIfAborted();
			const part = await readWithIdleTimeout(reader, signal, streamIdleTimeoutMs);
			if (part.done) break;
			bytes += part.value.byteLength;
			if (bytes > MAX_NATIVE_SSE_BYTES) throw new NativeCompactionFailure("size");
			buffer += decoder.decode(part.value, { stream: true });
			buffer = consumeSseEvents(buffer, acceptEvent);
		}
		buffer += decoder.decode();
		if (buffer.trim().length > 0) consumeSseEvents(`${buffer}\n\n`, acceptEvent);
	} catch (error) {
		reader.cancel(error).catch(() => void 0);
		signal.throwIfAborted();
		if (error instanceof NativeCompactionFailure) throw error;
		throw new NativeCompactionFailure("transient");
	} finally {
		reader.releaseLock();
	}
	if (completed !== 1 || lastEventType !== "response.completed" || compactions.length !== 1) throw new NativeCompactionFailure("protocol");
	return {
		artifact: compactions[0],
		...usage === void 0 ? {} : { usage },
		ignoredOutputItems
	};
}
async function readWithIdleTimeout(reader, signal, timeoutMs) {
	signal.throwIfAborted();
	if (timeoutMs <= 0) return awaitWithSignal(reader.read(), signal);
	const idleTimeout = new AbortController();
	const timer = setTimeout(() => idleTimeout.abort(new NativeCompactionFailure("transient")), timeoutMs);
	try {
		return await awaitWithSignal(reader.read(), AbortSignal.any([signal, idleTimeout.signal]));
	} finally {
		clearTimeout(timer);
	}
}
function consumeSseEvents(buffer, accept) {
	let remaining = buffer.replaceAll("\r\n", "\n");
	while (true) {
		const boundary = remaining.indexOf("\n\n");
		if (boundary === -1) return remaining;
		const block = remaining.slice(0, boundary);
		remaining = remaining.slice(boundary + 2);
		const data = block.split("\n").filter((line) => line.startsWith("data:")).map((line) => line.slice(5).replace(/^ /u, "")).join("\n");
		if (data.length > 0) accept(data);
	}
}
function responseUsage(value) {
	if (!isPlainRecord(value) || !isPlainRecord(value.usage)) return void 0;
	const usage = value.usage;
	if (!nonnegativeInteger(usage.input_tokens) || !nonnegativeInteger(usage.output_tokens)) return;
	const inputDetails = isPlainRecord(usage.input_tokens_details) ? usage.input_tokens_details : void 0;
	const outputDetails = isPlainRecord(usage.output_tokens_details) ? usage.output_tokens_details : void 0;
	return {
		source: "reported",
		inputTokens: usage.input_tokens,
		outputTokens: usage.output_tokens,
		...nonnegativeInteger(inputDetails?.cached_tokens) ? { cacheReadTokens: inputDetails.cached_tokens } : {},
		...nonnegativeInteger(outputDetails?.reasoning_tokens) ? { reasoningTokens: outputDetails.reasoning_tokens } : {}
	};
}
function httpFailure(response) {
	if (response.status === 401 || response.status === 403) return new NativeCompactionFailure("auth");
	if (response.status === 429) return new NativeCompactionFailure("rate-limit", parseRetryAfterMs(response.headers.get("retry-after")));
	if (response.status >= 500) return new NativeCompactionFailure("transient");
	return new NativeCompactionFailure("protocol");
}
function parseRetryAfterMs(value) {
	if (value === null) return CODEX_NATIVE_DEFAULT_RATE_LIMIT_OPEN_MS;
	const seconds = Number(value);
	if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1e3;
	const date = Date.parse(value);
	if (!Number.isFinite(date)) return CODEX_NATIVE_DEFAULT_RATE_LIMIT_OPEN_MS;
	return Math.max(0, date - Date.now());
}
function nonnegativeInteger(value) {
	return typeof value === "number" && Number.isInteger(value) && value >= 0;
}
//#endregion
//#region src/native-compaction.ts
const CODEX_ROUTE = "openai-codex";
/**
* Host-only coordinator joining one inherited Basic operation to the exact
* Codex payload and credential resolved by its successful Portable summary.
*/
var CodexNativeCompactionCoordinator = class {
	storage = new AsyncLocalStorage();
	boundaryStorage = new AsyncLocalStorage();
	/** Install read-only wrappers before Basic registers its automatic listeners. */
	installAutomaticBoundaries(ctx) {
		ctx.on("agent/pre-step", (payload, next) => this.boundaryStorage.run({
			agent: payload.agent,
			trigger: "pressure"
		}, next));
		ctx.on("agent/request-error", (payload, next) => this.boundaryStorage.run({
			agent: payload.agent,
			trigger: "context-overflow"
		}, next));
	}
	runManual(input, task) {
		return this.runOperation({
			...input,
			trigger: "manual",
			inline: false
		}, task);
	}
	/** Scope pressure/overflow without taking any lifecycle work away from Basic. */
	runAutomatic(input, task) {
		const boundary = this.boundaryStorage.getStore();
		return this.runOperation({
			sessionId: String(input.agent.session.id),
			target: input.target,
			signal: input.signal,
			diagnostic: input.diagnostic,
			trigger: input.trigger,
			inline: boundary?.agent === input.agent && boundary.trigger === input.trigger
		}, task);
	}
	/** Arm only after the inherited automatic transaction reports a Dual commit. */
	commitAutomaticContinuation(committedNative) {
		const operation = this.storage.getStore();
		const continuation = operation?.continuation;
		if (operation === void 0 || continuation === void 0) return;
		operation.continuation = void 0;
		if (committedNative && operation.inline && operation.trigger !== "manual") codexTurnStateContinuity.arm(continuation);
	}
	runOperation(input, task) {
		const operation = {
			sessionId: input.sessionId,
			target: input.target,
			callerSignal: input.signal,
			diagnostic: input.diagnostic,
			trigger: input.trigger,
			inline: input.inline,
			windowId: randomUUID(),
			compactionId: void 0,
			continuation: void 0,
			phase: void 0
		};
		return this.storage.run(operation, async () => {
			try {
				return await task();
			} finally {
				clearOperation(operation);
			}
		});
	}
	noteCompactionId(compactionId) {
		const operation = this.storage.getStore();
		if (operation !== void 0) operation.compactionId = compactionId;
	}
	noteStrictShrink(model) {
		const operation = this.storage.getStore();
		if (operation === void 0) return;
		operation.continuation = void 0;
		emitDiagnostic(operation, model, {
			event: "fallback",
			breakerState: "closed",
			reason: "strict-shrink"
		});
	}
	noteResult(model, result) {
		const operation = this.storage.getStore();
		if (operation !== void 0) emitDiagnostic(operation, model, {
			event: "result",
			result
		});
	}
	/** Capture the one inherited Portable call made inside the active Basic operation. */
	async withPortableCapture(input, signal, reasoningEffort, task) {
		const operation = this.storage.getStore();
		if (operation === void 0) return task();
		operation.continuation = void 0;
		if (operation.phase !== void 0) throw new Error("codex native compaction: nested Portable summarization is unsupported");
		const phase = {
			input,
			signal,
			reasoningEffort,
			credential: void 0,
			providerRequest: void 0,
			instructionText: void 0,
			payload: void 0
		};
		operation.phase = phase;
		try {
			return await task();
		} finally {
			if (operation.phase === phase) operation.phase = void 0;
			clearPhase(phase);
		}
	}
	/** Capture Basic's appended instruction and align its omitted explicit reasoning control. */
	preparePortableCall(options) {
		const operation = this.storage.getStore();
		if (operation === void 0) return options;
		const phase = operation.phase;
		if (phase === void 0 || options.purpose !== "compaction" || options.messages.length !== phase.input.length + 1 || !phase.input.every((message, index) => isDeepStrictEqual(message, options.messages[index]))) return options;
		const finalMessage = options.messages.at(-1);
		const finalBlock = finalMessage?.content[0];
		if (finalMessage?.role !== "user" || finalMessage.content.length !== 1 || finalBlock?.type !== "text" || finalBlock.text.length === 0) return options;
		phase.instructionText = finalBlock.text;
		if (phase.reasoningEffort === void 0 || options.reasoningEffort !== void 0 || operation.target?.provider !== options.provider || operation.target.model !== options.model) return options;
		return {
			...options,
			reasoningEffort: phase.reasoningEffort
		};
	}
	/** Retain the already resolved Codex Login State only for this request scope. */
	noteCredential(accessToken, accountId) {
		const phase = this.storage.getStore()?.phase;
		if (phase === void 0) return;
		phase.credential = {
			accessToken,
			...accountId === void 0 ? {} : { accountId }
		};
	}
	/** Retain public provider routing inputs and the existing transport policy in memory. */
	noteProviderRequest(input) {
		const phase = this.storage.getStore()?.phase;
		const adapterGeneration = codexTurnStateContinuity.currentGeneration();
		if (phase === void 0 || adapterGeneration === void 0) return;
		phase.providerRequest = {
			provider: input.provider,
			model: input.model,
			adapterGeneration,
			...input.baseUrl === void 0 ? {} : { baseUrl: input.baseUrl },
			...input.sessionId === void 0 ? {} : { sessionId: input.sessionId },
			publicHeaders: capturePublicHeaders(input.modelHeaders, input.headers),
			fetchImpl: input.fetchImpl,
			timeoutMs: input.timeoutMs,
			streamIdleTimeoutMs: input.streamIdleTimeoutMs
		};
	}
	/** Compose final payload capture after marker restoration and all existing callbacks. */
	payloadCallback(previous) {
		const operation = this.storage.getStore();
		const phase = operation?.phase;
		if (operation === void 0 || phase === void 0) return previous;
		return async (payload, model) => {
			const returned = await previous?.(payload, model);
			const effective = returned === void 0 ? payload : returned;
			const wirePayload = normalizeWirePayload(effective);
			if (wirePayload === void 0) throw new Error("codex native compaction: final Portable payload is not lossless JSON");
			phase.payload = wirePayload;
			return effective;
		};
	}
	/**
	* After Portable success, make at most one dedicated v2 request and return a
	* credential-free block. Every ordinary native failure is a Portable fallback.
	*/
	async createCheckpoint(input, portableProvider, portableModel, signal) {
		const operation = this.storage.getStore();
		const phase = operation?.phase;
		if (operation === void 0 || phase === void 0 || phase.input !== input) return void 0;
		const operationSignal = signal ?? phase.signal ?? operation.callerSignal;
		operationSignal.throwIfAborted();
		let lease;
		let startedAt;
		try {
			const eligible = eligibleCapture(operation, phase, portableProvider, portableModel);
			if (eligible === void 0) {
				emitDiagnostic(operation, portableModel, {
					event: "eligibility",
					eligibility: "ineligible"
				});
				return;
			}
			emitDiagnostic(operation, portableModel, {
				event: "eligibility",
				eligibility: "eligible"
			});
			const accountHash = hashCodexAccountIdentity(eligible.credential.accountId);
			lease = nativeCompactionBreaker.acquire(nativeCompactionBreakerKey(accountHash, portableModel, codexResponsesUrl(eligible.providerRequest.baseUrl)));
			if (lease === void 0) {
				emitDiagnostic(operation, portableModel, {
					event: "fallback",
					breakerState: "open",
					reason: "circuit-open"
				});
				return;
			}
			const nativeRequest = deriveNativeRequest(eligible.payload, portableModel, eligible.instructionText);
			if (nativeRequest === void 0) {
				emitDiagnostic(operation, portableModel, {
					event: "fallback",
					breakerState: lease.fail(new NativeCompactionFailure("protocol")),
					reason: "unsupported-payload"
				});
				return;
			}
			emitDiagnostic(operation, portableModel, {
				event: "attempt",
				breakerState: lease.state,
				requestBytes: serializedJsonBytes(nativeRequest.body)
			});
			startedAt = performance.now();
			const response = await sendCodexNativeCompaction(eligible.providerRequest, eligible.credential, operation, nativeRequest.body, operationSignal);
			operationSignal.throwIfAborted();
			const opaqueContent = response.artifact.encrypted_content;
			if (typeof opaqueContent !== "string") throw new NativeCompactionFailure("protocol");
			emitDiagnostic(operation, portableModel, {
				event: "response",
				durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
				outputItems: response.ignoredOutputItems + 1,
				ignoredOutputItems: response.ignoredOutputItems,
				artifactBytes: serializedJsonBytes(response.artifact),
				opaqueBytes: utf8ByteLength(opaqueContent),
				usageAvailability: response.usage?.source ?? "unavailable"
			});
			const retained = retainRecentCodexUserMessages(nativeRequest.body.input, CODEX_NATIVE_RETENTION_TOKEN_BUDGET);
			const replacementItems = [...retained, response.artifact];
			const checkpoint = {
				schemaVersion: 1,
				codec: {
					kind: CODEX_NATIVE_CHECKPOINT_CODEC,
					generation: 1
				},
				retention: {
					policy: CODEX_NATIVE_CHECKPOINT_RETENTION_POLICY,
					generation: 1
				},
				provenance: {
					provider: CODEX_ROUTE,
					model: portableModel,
					accountHash
				},
				compatibilityDigest: codexNativeCheckpointCompatibilityDigest({
					provider: CODEX_ROUTE,
					model: portableModel,
					accountHash,
					instructions: nativeRequest.semanticInput.instructions,
					tools: nativeRequest.semanticInput.tools,
					parallelToolCalls: nativeRequest.semanticInput.parallelToolCalls,
					toolChoice: nativeRequest.semanticInput.toolChoice,
					reasoning: nativeRequest.semanticInput.reasoning,
					text: nativeRequest.semanticInput.text,
					serviceTier: nativeRequest.semanticInput.serviceTier
				}),
				replay: {
					estimator: CODEX_NATIVE_CHECKPOINT_ESTIMATOR,
					estimatedTokens: estimateCodexReplayTokens(retained, response.artifact)
				},
				...response.usage === void 0 ? {} : { usage: response.usage },
				replacementItems
			};
			const checkpointBytes = serializedJsonBytes({
				type: CODEX_NATIVE_CHECKPOINT_BLOCK_TYPE,
				text: "",
				state: JSON.stringify(checkpoint)
			});
			if (checkpointBytes > 2097152) {
				lease.ignore();
				emitDiagnostic(operation, portableModel, {
					event: "fallback",
					breakerState: lease.state,
					durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
					reason: "size"
				});
				return;
			}
			const block = encodeCodexNativeCheckpoint(checkpoint);
			emitDiagnostic(operation, portableModel, {
				event: "candidate",
				checkpointBytes,
				replayTokens: checkpoint.replay.estimatedTokens
			});
			lease.succeed();
			if (operation.inline && operation.trigger !== "manual" && response.turnState !== void 0) operation.continuation = {
				sessionId: operation.sessionId,
				provider: CODEX_ROUTE,
				model: portableModel,
				accountHash,
				generation: eligible.providerRequest.adapterGeneration,
				turnState: response.turnState
			};
			return block;
		} catch (error) {
			if (operationSignal.aborted) {
				lease?.ignore();
				operationSignal.throwIfAborted();
			}
			const failure = error instanceof NativeCompactionFailure ? error : new NativeCompactionFailure("protocol");
			if (failure.kind === "size") {
				lease?.ignore();
				emitDiagnostic(operation, portableModel, {
					event: "fallback",
					breakerState: lease?.state ?? "not-acquired",
					...startedAt === void 0 ? {} : { durationMs: Math.max(0, Math.round(performance.now() - startedAt)) },
					reason: "size"
				});
				return;
			}
			emitDiagnostic(operation, portableModel, {
				event: "fallback",
				breakerState: lease?.fail(failure) ?? "not-acquired",
				...startedAt === void 0 ? {} : { durationMs: Math.max(0, Math.round(performance.now() - startedAt)) },
				reason: failure.kind
			});
			return;
		}
	}
};
function eligibleCapture(operation, phase, portableProvider, portableModel) {
	const target = operation.target;
	const credential = phase.credential;
	const request = phase.providerRequest;
	const instructionText = phase.instructionText;
	const payload = phase.payload;
	if (target?.provider !== CODEX_ROUTE || target.model !== portableModel || portableProvider !== CODEX_ROUTE || phase.input.length === 0 || messagesHaveImages(phase.input) || credential === void 0 || typeof credential.accountId !== "string" || credential.accountId.length === 0 || credential.accessToken.length === 0 || request?.provider !== CODEX_ROUTE || request.model !== portableModel || request.sessionId !== operation.sessionId || instructionText === void 0 || payload === void 0) return void 0;
	return {
		credential: {
			accessToken: credential.accessToken,
			accountId: credential.accountId
		},
		providerRequest: request,
		instructionText,
		payload
	};
}
function deriveNativeRequest(captured, expectedModel, instructionText) {
	if (captured.model !== expectedModel || typeof captured.instructions !== "string" || !Array.isArray(captured.input) || captured.input.length < 2 || typeof captured.parallel_tool_calls !== "boolean" || captured.tool_choice !== "auto" || captured.tools !== void 0 && !Array.isArray(captured.tools) || captured.reasoning !== void 0 && !isPlainRecord(captured.reasoning) || captured.text !== void 0 && !isPlainRecord(captured.text) || captured.service_tier !== void 0 && typeof captured.service_tier !== "string" || captured.prompt_cache_key !== void 0 && typeof captured.prompt_cache_key !== "string") return;
	const input = captured.input.map(cloneJson);
	if (!isCapturedCompactionInstruction(input.pop(), instructionText) || input.length === 0 || wireInputHasImage(input)) return;
	const tools = captured.tools === void 0 ? null : cloneJson(captured.tools);
	const reasoning = captured.reasoning === void 0 ? null : cloneJson(captured.reasoning);
	const text = captured.text === void 0 ? null : cloneJson(captured.text);
	const serviceTier = captured.service_tier ?? null;
	return {
		body: {
			model: expectedModel,
			input: [...input, { type: "compaction_trigger" }],
			instructions: captured.instructions,
			...captured.tools === void 0 ? {} : { tools },
			parallel_tool_calls: captured.parallel_tool_calls,
			tool_choice: "auto",
			...captured.reasoning === void 0 ? {} : { reasoning },
			...captured.text === void 0 ? {} : { text },
			...captured.service_tier === void 0 ? {} : { service_tier: serviceTier },
			...captured.prompt_cache_key === void 0 ? {} : { prompt_cache_key: captured.prompt_cache_key },
			store: false,
			stream: true,
			include: ["reasoning.encrypted_content"]
		},
		semanticInput: {
			instructions: captured.instructions,
			tools,
			parallelToolCalls: captured.parallel_tool_calls,
			toolChoice: "auto",
			reasoning,
			text,
			serviceTier
		}
	};
}
function isCapturedCompactionInstruction(value, instructionText) {
	return isPlainRecord(value) && value.role === "user" && Object.keys(value).every((key) => key === "role" || key === "content") && Array.isArray(value.content) && value.content.length === 1 && isPlainRecord(value.content[0]) && Object.keys(value.content[0]).every((key) => key === "type" || key === "text") && value.content[0].type === "input_text" && value.content[0].text === instructionText;
}
function messagesHaveImages(messages) {
	return messages.some((message) => message.content.some((block) => block.type === "image"));
}
function wireInputHasImage(input) {
	return input.some((item) => containsType(item, "input_image"));
}
function containsType(value, type) {
	if (Array.isArray(value)) return value.some((item) => containsType(item, type));
	if (!isPlainRecord(value)) return false;
	const record = value;
	return record.type === type || Object.values(record).some((item) => containsType(item, type));
}
function capturePublicHeaders(modelHeaders, requestHeaders) {
	const source = new Headers(modelHeaders);
	for (const [name, value] of Object.entries(requestHeaders ?? {})) if (value === null) source.delete(name);
	else source.set(name, value);
	const captured = {};
	for (const name of ["openai-beta", "x-codex-beta-features"]) {
		const value = source.get(name);
		if (value !== null) captured[name] = value;
	}
	return Object.freeze(captured);
}
function cloneJson(value) {
	return structuredClone(value);
}
function normalizeWirePayload(value) {
	try {
		const normalized = JSON.parse(JSON.stringify(value));
		if (!isPlainJsonTree(normalized) || !isPlainRecord(normalized)) return void 0;
		return normalized;
	} catch {
		return;
	}
}
function emitDiagnostic(operation, model, detail) {
	try {
		operation.diagnostic({
			codec: CODEX_NATIVE_CHECKPOINT_CODEC,
			codecGeneration: 1,
			compactionId: operation.compactionId ?? "unavailable",
			model,
			trigger: operation.trigger,
			...detail
		});
	} catch {}
}
function clearPhase(phase) {
	phase.credential = void 0;
	phase.providerRequest = void 0;
	phase.instructionText = void 0;
	phase.payload = void 0;
}
function clearOperation(operation) {
	if (operation.phase !== void 0) clearPhase(operation.phase);
	operation.compactionId = void 0;
	operation.continuation = void 0;
	operation.phase = void 0;
}
const codexNativeCompactionCoordinator = new CodexNativeCompactionCoordinator();
//#endregion
export { codexTurnStateContinuity as n, codexNativeCompactionCoordinator as t };
