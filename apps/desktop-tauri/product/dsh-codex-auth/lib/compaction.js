import { h as installedPackageVersion } from "./native-checkpoint-BGT6whVM.js";
import { t as codexNativeCompactionCoordinator } from "./native-compaction-DO9ObxWA.js";
import { createUserMessage } from "@deepseek-ai/dsh-llm";
import { BasicCompactionEngine } from "@deepseek-ai/dsh-compaction-basic";
//#region src/compaction.ts
const DSH_RUNTIME_PACKAGES = [
	"@deepseek-ai/dsh-agent",
	"@deepseek-ai/dsh-compaction",
	"@deepseek-ai/dsh-compaction-basic",
	"@deepseek-ai/dsh-llm",
	"@deepseek-ai/dsh-session",
	"@deepseek-ai/dsh-token-meter"
];
/** Conservative allowance for Basic's private framing around returned summary blocks. */
const BASIC_FRAME_TOKEN_RESERVE = 256;
/** Exact runtime pair whose rc.2 framing and pi conversion behavior this Adapter uses. */
const CODEX_COMPACTION_COMPATIBILITY = Object.freeze({
	dsh: "0.1.1-rc.2",
	piAi: "0.82.1"
});
/** Read the installed versions that own the Basic transaction and pi conversion. */
function installedRuntimeVersions() {
	return {
		dsh: Object.fromEntries(DSH_RUNTIME_PACKAGES.map((specifier) => [specifier, installedPackageVersion(specifier, import.meta.url)])),
		piAi: installedPackageVersion("@earendil-works/pi-ai", import.meta.url)
	};
}
/**
* Refuse an unverified runtime before mounting the experimental Adapter.
* The stock DSH preset remains the supported fallback for every other pair.
*/
function assertCodexCompactionCompatibility(actual = installedRuntimeVersions()) {
	if (DSH_RUNTIME_PACKAGES.every((specifier) => actual.dsh[specifier] === CODEX_COMPACTION_COMPATIBILITY.dsh) && actual.piAi === CODEX_COMPACTION_COMPATIBILITY.piAi) return;
	const receivedDsh = DSH_RUNTIME_PACKAGES.map((specifier) => `${specifier}=${actual.dsh[specifier]}`).join(", ");
	throw new Error(`codex-compaction requires DSH ${CODEX_COMPACTION_COMPATIBILITY.dsh} across ${DSH_RUNTIME_PACKAGES.join(", ")} and @earendil-works/pi-ai ${CODEX_COMPACTION_COMPATIBILITY.piAi}; received ${receivedDsh}; @earendil-works/pi-ai=${actual.piAi}`);
}
/** Stable Loader id for the experimental custom-preset Adapter. */
const name = "codex-compaction";
/** Preserve Basic's dependency Interface at the custom Loader Seam. */
const inject = BasicCompactionEngine.inject;
/** Preserve Basic's validated configuration Interface. */
const Config = BasicCompactionEngine.Config;
function currentRoutedTarget(agent) {
	const latest = agent.session.requestHeader()?.config;
	if (latest !== void 0 && latest.provider.length > 0 && latest.model.length > 0) return {
		provider: latest.provider,
		model: latest.model
	};
	const { provider, model } = agent.options;
	if (provider === void 0 || provider.length === 0 || model === void 0 || model.length === 0) return void 0;
	return {
		provider,
		model
	};
}
/** Match Agent-loop replay semantics: inherit only a user-pinned reasoning effort. */
function currentExplicitReasoningEffort(agent) {
	const header = agent.session.requestHeader();
	return header?.adapterDefaults?.reasoningEffort === true ? void 0 : header?.config.reasoningEffort;
}
function currentCompactionId(agent) {
	for (let index = agent.session.events.length - 1; index >= 0; index -= 1) {
		const event = agent.session.events[index];
		if (event?.type === "compaction/start") return String(event.data.compactionId);
	}
}
function logNativeDiagnostic(ctx, diagnostic) {
	const identity = [
		diagnostic.compactionId,
		diagnostic.trigger,
		diagnostic.codec,
		diagnostic.codecGeneration,
		diagnostic.model
	];
	if (diagnostic.event === "eligibility") {
		ctx.logger.debug("codex-compaction: event=eligibility compactionId=%s trigger=%s codec=%s codecGeneration=%d model=%s eligibility=%s", ...identity, diagnostic.eligibility);
		return;
	}
	if (diagnostic.event === "attempt") {
		ctx.logger.debug("codex-compaction: event=attempt compactionId=%s trigger=%s codec=%s codecGeneration=%d model=%s breakerState=%s requestBytes=%d", ...identity, diagnostic.breakerState, diagnostic.requestBytes);
		return;
	}
	if (diagnostic.event === "response") {
		ctx.logger.debug("codex-compaction: event=response compactionId=%s trigger=%s codec=%s codecGeneration=%d model=%s durationMs=%d outputItems=%d ignoredOutputItems=%d artifactBytes=%d opaqueBytes=%d usageAvailability=%s", ...identity, diagnostic.durationMs, diagnostic.outputItems, diagnostic.ignoredOutputItems, diagnostic.artifactBytes, diagnostic.opaqueBytes, diagnostic.usageAvailability);
		return;
	}
	if (diagnostic.event === "candidate") {
		ctx.logger.debug("codex-compaction: event=candidate compactionId=%s trigger=%s codec=%s codecGeneration=%d model=%s checkpointBytes=%d replayTokens=%d", ...identity, diagnostic.checkpointBytes, diagnostic.replayTokens);
		return;
	}
	if (diagnostic.event === "result") {
		ctx.logger.debug("codex-compaction: event=result compactionId=%s trigger=%s codec=%s codecGeneration=%d model=%s result=%s", ...identity, diagnostic.result);
		return;
	}
	if (diagnostic.reason === "auth") {
		ctx.logger.warn("codex-compaction: event=fallback compactionId=%s trigger=%s codec=%s codecGeneration=%d model=%s breakerState=%s durationMs=%s reason=auth; run \"codex login\"; retaining the Portable Checkpoint", ...identity, diagnostic.breakerState, diagnostic.durationMs === void 0 ? "unavailable" : String(diagnostic.durationMs));
		return;
	}
	ctx.logger.debug("codex-compaction: event=fallback compactionId=%s trigger=%s codec=%s codecGeneration=%d model=%s breakerState=%s durationMs=%s reason=%s", ...identity, diagnostic.breakerState, diagnostic.durationMs === void 0 ? "unavailable" : String(diagnostic.durationMs), diagnostic.reason);
}
function classifyCommit(result) {
	const committedNative = result?.summary.some((block) => block.type === "codex-native-checkpoint") ?? false;
	return {
		committedNative,
		diagnostic: result === null ? "no-commit" : committedNative ? "dual-committed" : "portable-committed"
	};
}
function dualSummaryClearlyShrinks(input, summary, estimateMessage) {
	const shadowedEstimate = input.messages.reduce((total, message) => total + estimateMessage(message), 0);
	return estimateMessage(createUserMessage({
		content: [...summary],
		source: {
			kind: "plugin",
			plugin: name
		}
	})) + BASIC_FRAME_TOKEN_RESERVE < shadowedEstimate;
}
/**
* Basic-derived Adapter that preserves Basic's transaction while augmenting one
* eligible manual or automatic Portable summary with a Native Checkpoint.
*/
var CodexCompactionEngine = class extends BasicCompactionEngine {
	lifecycleController = new AbortController();
	constructor(ctx, config = {}) {
		assertCodexCompactionCompatibility();
		super(ctx, config);
		ctx.effect(() => () => this.lifecycleController.abort(/* @__PURE__ */ new Error("codex native compaction: Adapter realm disposed")), "codex-compaction: active request cleanup");
	}
	operationSignal(signal) {
		return AbortSignal.any([signal, this.lifecycleController.signal]);
	}
	compactNow(agent, signal, sourceCommandId) {
		const operationSignal = this.operationSignal(signal);
		const target = currentRoutedTarget(agent);
		const diagnosticModel = target?.model ?? "unrouted";
		return codexNativeCompactionCoordinator.runManual({
			sessionId: String(agent.session.id),
			target,
			signal: operationSignal,
			diagnostic: (diagnostic) => logNativeDiagnostic(this.ctx, diagnostic)
		}, async () => {
			try {
				const result = await super.compactNow(agent, operationSignal, sourceCommandId);
				const commit = classifyCommit(result);
				codexNativeCompactionCoordinator.noteResult(diagnosticModel, commit.diagnostic);
				return result;
			} catch (error) {
				codexNativeCompactionCoordinator.noteResult(diagnosticModel, "failed");
				throw error;
			}
		});
	}
	compactIfNeeded(agent, trigger, signal) {
		const operationSignal = this.operationSignal(signal);
		const target = currentRoutedTarget(agent);
		const diagnosticModel = target?.model ?? "unrouted";
		return codexNativeCompactionCoordinator.runAutomatic({
			agent,
			trigger,
			target,
			signal: operationSignal,
			diagnostic: (diagnostic) => logNativeDiagnostic(this.ctx, diagnostic)
		}, async () => {
			try {
				const result = await super.compactIfNeeded(agent, trigger, operationSignal);
				const commit = classifyCommit(result);
				codexNativeCompactionCoordinator.commitAutomaticContinuation(commit.committedNative);
				codexNativeCompactionCoordinator.noteResult(diagnosticModel, commit.diagnostic);
				return result;
			} catch (error) {
				codexNativeCompactionCoordinator.commitAutomaticContinuation(false);
				codexNativeCompactionCoordinator.noteResult(diagnosticModel, "failed");
				throw error;
			}
		});
	}
	summarize(input, agent, signal) {
		const compactionId = currentCompactionId(agent);
		if (compactionId !== void 0) codexNativeCompactionCoordinator.noteCompactionId(compactionId);
		return codexNativeCompactionCoordinator.withPortableCapture(input.messages, signal, currentExplicitReasoningEffort(agent), async () => {
			const portable = await super.summarize(input, agent, signal);
			const native = await codexNativeCompactionCoordinator.createCheckpoint(input.messages, portable.provider, portable.model, signal);
			if (native === void 0) return portable;
			const summary = [...portable.summary, native];
			if (!dualSummaryClearlyShrinks(input, summary, (message) => this.ctx.tokenMeter.estimateMessage(message))) {
				codexNativeCompactionCoordinator.noteStrictShrink(portable.model);
				return portable;
			}
			return {
				...portable,
				summary
			};
		});
	}
};
/** Mount the experimental Adapter inside a user-authored custom preset realm. */
function apply(ctx, config = {}) {
	codexNativeCompactionCoordinator.installAutomaticBoundaries(ctx);
	new CodexCompactionEngine(ctx, config);
}
//#endregion
export { CODEX_COMPACTION_COMPATIBILITY, CodexCompactionEngine, Config, apply, assertCodexCompactionCompatibility, inject, name };
