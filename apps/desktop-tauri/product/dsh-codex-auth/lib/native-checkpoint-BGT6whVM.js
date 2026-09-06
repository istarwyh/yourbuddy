import { findPackageJSON } from "node:module";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
//#region src/json-tree.ts
/** Shared structural validation for detached JSON-shaped Host state. */
const TEXT_ENCODER = new TextEncoder();
/** Narrow one value to the plain string-keyed record shape used by JSON trees. */
function isPlainRecord(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}
/** Measure UTF-8 bytes without relying on JavaScript code-unit length. */
function utf8ByteLength(value) {
	return TEXT_ENCODER.encode(value).byteLength;
}
/** Measure the UTF-8 bytes of the JSON wire representation. */
function serializedJsonBytes(value) {
	const serialized = JSON.stringify(value);
	return serialized === void 0 ? 0 : utf8ByteLength(serialized);
}
/**
* Whether a value is a cycle-free tree of plain data properties that JSON can
* serialize without invoking accessors or rewriting numbers/array holes.
*/
function isPlainJsonTree(value, options = {}) {
	return visit(value, options.allowUndefinedObjectProperties === true, /* @__PURE__ */ new WeakSet());
}
function visit(value, allowUndefinedObjectProperties, ancestors) {
	if (value === null || typeof value === "string" || typeof value === "boolean") return true;
	if (typeof value === "number") return Number.isFinite(value) && !Object.is(value, -0);
	if (typeof value !== "object" || ancestors.has(value)) return false;
	ancestors.add(value);
	const valid = Array.isArray(value) ? validArray(value, allowUndefinedObjectProperties, ancestors) : validRecord(value, allowUndefinedObjectProperties, ancestors);
	ancestors.delete(value);
	return valid;
}
function validArray(value, allowUndefinedObjectProperties, ancestors) {
	const descriptors = Object.getOwnPropertyDescriptors(value);
	if (Reflect.ownKeys(descriptors).length !== value.length + 1) return false;
	for (let index = 0; index < value.length; index += 1) {
		const descriptor = descriptors[index];
		if (descriptor === void 0 || descriptor.enumerable !== true || !Object.hasOwn(descriptor, "value") || !visit(descriptor.value, allowUndefinedObjectProperties, ancestors)) return false;
	}
	return true;
}
function validRecord(value, allowUndefinedObjectProperties, ancestors) {
	const prototype = Object.getPrototypeOf(value);
	if (prototype !== Object.prototype && prototype !== null) return false;
	const descriptors = Object.getOwnPropertyDescriptors(value);
	for (const key of Reflect.ownKeys(descriptors)) {
		if (typeof key !== "string") return false;
		const descriptor = descriptors[key];
		if (descriptor === void 0 || descriptor.enumerable !== true || !Object.hasOwn(descriptor, "value")) return false;
		if (descriptor.value === void 0 && allowUndefinedObjectProperties) continue;
		if (!visit(descriptor.value, allowUndefinedObjectProperties, ancestors)) return false;
	}
	return true;
}
//#endregion
//#region src/package-version.ts
/** Resolve an installed package version without importing a private subpath. */
function installedPackageVersion(specifier, from) {
	try {
		const packagePath = findPackageJSON(specifier, from);
		if (packagePath === void 0) return "unresolved";
		const parsed = JSON.parse(readFileSync(packagePath, "utf8"));
		return typeof parsed.version === "string" ? parsed.version : "unreadable";
	} catch {
		return "unreadable";
	}
}
//#endregion
//#region src/native-checkpoint.ts
/**
* Versioned, provider-owned durable state for replaying Codex Responses v2
* compaction without widening DSH's core content vocabulary.
*
* @module dsh-codex-auth/native-checkpoint
*/
/** Stable declaration-merged content tag owned by this package. */
const CODEX_NATIVE_CHECKPOINT_BLOCK_TYPE = "codex-native-checkpoint";
/** Initial durable schema generation. */
const CODEX_NATIVE_CHECKPOINT_SCHEMA_VERSION = 1;
/** Provider codec interpreted by the Codex Adapter. */
const CODEX_NATIVE_CHECKPOINT_CODEC = "openai-responses-v2";
/** Initial provider codec generation. */
const CODEX_NATIVE_CHECKPOINT_CODEC_GENERATION = 1;
/** Retained-history policy pinned by the parent specification. */
const CODEX_NATIVE_CHECKPOINT_RETENTION_POLICY = "codex-v2-retained-message-groups";
/** Initial retained-history policy generation. */
const CODEX_NATIVE_CHECKPOINT_RETENTION_GENERATION = 1;
/** Replay estimate identity pinned by the parent specification. */
const CODEX_NATIVE_CHECKPOINT_ESTIMATOR = "codex-v2-retained-json-plus-opaque-base64-v1";
/** Serialized custom-block ceiling, including its JSON carrier. */
const MAX_CODEX_NATIVE_CHECKPOINT_BYTES = 2097152;
/** Exact runtime pair whose rc.2 message and pi payload conversion this replay uses. */
const CODEX_NATIVE_REPLAY_COMPATIBILITY = Object.freeze({
	dsh: "0.1.1-rc.2",
	piAi: "0.82.1"
});
/** Return false on an unobserved converter/runtime pair so callers can use Portable text. */
function isCodexNativeReplayRuntimeCompatible(actual = installedNativeReplayVersions()) {
	return actual.dshLlm === CODEX_NATIVE_REPLAY_COMPATIBILITY.dsh && actual.dshPiAi === CODEX_NATIVE_REPLAY_COMPATIBILITY.dsh && actual.piAi === CODEX_NATIVE_REPLAY_COMPATIBILITY.piAi;
}
/** Hash one non-secret account identity without persisting the raw identifier. */
function hashCodexAccountIdentity(accountId) {
	return sha256("dsh-codex-auth/account/v1", accountId);
}
/** Canonical compatibility identity for one effective Codex Responses request. */
function codexNativeCheckpointCompatibilityDigest(input) {
	if (!isPlainJsonTree(input)) throw new Error("Codex Native Checkpoint compatibility requires lossless JSON");
	return sha256("dsh-codex-auth/native-checkpoint-compatibility/v1", canonicalJson({
		accountHash: input.accountHash,
		codec: {
			generation: 1,
			kind: CODEX_NATIVE_CHECKPOINT_CODEC
		},
		instructions: input.instructions,
		model: input.model,
		parallelToolCalls: input.parallelToolCalls,
		provider: input.provider,
		reasoning: input.reasoning,
		retention: {
			generation: 1,
			policy: CODEX_NATIVE_CHECKPOINT_RETENTION_POLICY
		},
		serviceTier: input.serviceTier,
		text: input.text,
		toolChoice: input.toolChoice,
		tools: input.tools
	}));
}
/** Encode one validated v1 state into its opaque declaration-merged block. */
function encodeCodexNativeCheckpoint(checkpoint) {
	if (!isPlainJsonTree(checkpoint)) throw new Error("Codex Native Checkpoint requires lossless JSON");
	const block = Object.freeze({
		type: CODEX_NATIVE_CHECKPOINT_BLOCK_TYPE,
		text: "",
		state: JSON.stringify(checkpoint)
	});
	const decoded = decodeCodexNativeCheckpoint(block);
	if (!decoded.ok) throw new Error(`invalid Codex Native Checkpoint: ${decoded.reason}`);
	return block;
}
/** Decode and validate one candidate without exposing malformed state to replay. */
function decodeCodexNativeCheckpoint(block) {
	try {
		return decodeCodexNativeCheckpointUnchecked(block);
	} catch {
		return {
			ok: false,
			reason: "invalid checkpoint structure"
		};
	}
}
function decodeCodexNativeCheckpointUnchecked(block) {
	if (!isPlainJsonTree(block) || !isRecord(block) || !hasOnlyKeys(block, ["type", "state"]) && !hasOnlyKeys(block, [
		"type",
		"text",
		"state"
	]) || block.type !== "codex-native-checkpoint" || block.text !== void 0 && block.text !== "" || typeof block.state !== "string") return {
		ok: false,
		reason: "invalid content block"
	};
	if (serializedJsonBytes({
		type: "codex-native-checkpoint",
		...block.text === "" ? { text: "" } : {},
		state: block.state
	}) > 2097152) return {
		ok: false,
		reason: "serialized checkpoint exceeds 2 MiB"
	};
	let parsed;
	try {
		parsed = JSON.parse(block.state);
	} catch {
		return {
			ok: false,
			reason: "malformed checkpoint JSON"
		};
	}
	if (!isPlainJsonTree(parsed)) return {
		ok: false,
		reason: "checkpoint is not lossless JSON"
	};
	if (!isCheckpointV1(parsed)) return {
		ok: false,
		reason: "invalid checkpoint schema"
	};
	if (containsForbiddenCheckpointMaterial(parsed)) return {
		ok: false,
		reason: "checkpoint contains credentials, headers, or turn state"
	};
	return {
		ok: true,
		checkpoint: parsed
	};
}
function isCheckpointV1(value) {
	if (!isRecord(value) || !hasOnlyKeys(value, [
		"schemaVersion",
		"codec",
		"retention",
		"provenance",
		"compatibilityDigest",
		"replay",
		"usage",
		"replacementItems"
	]) || value.schemaVersion !== 1 || !isRecord(value.codec) || !hasOnlyKeys(value.codec, ["kind", "generation"]) || value.codec.kind !== "openai-responses-v2" || value.codec.generation !== 1 || !isRecord(value.retention) || !hasOnlyKeys(value.retention, ["policy", "generation"]) || value.retention.policy !== "codex-v2-retained-message-groups" || value.retention.generation !== 1 || !isRecord(value.provenance) || !hasOnlyKeys(value.provenance, [
		"provider",
		"model",
		"accountHash"
	]) || value.provenance.provider !== "openai-codex" || !nonemptyString(value.provenance.model) || !sha256Identity(value.provenance.accountHash) || !sha256Identity(value.compatibilityDigest) || !isRecord(value.replay) || !hasOnlyKeys(value.replay, ["estimator", "estimatedTokens"]) || value.replay.estimator !== "codex-v2-retained-json-plus-opaque-base64-v1" || !nonnegativeInteger(value.replay.estimatedTokens) || !Array.isArray(value.replacementItems) || !isCanonicalReplacementHistory(value.replacementItems)) return false;
	return value.usage === void 0 || isUsage(value.usage);
}
function isCanonicalReplacementHistory(items) {
	if (items.length === 0 || !isCanonicalCompactionItem(items.at(-1))) return false;
	return items.slice(0, -1).every(isCanonicalRetainedUserItem);
}
function isCanonicalCompactionItem(value) {
	return isRecord(value) && value.type === "compaction" && nonemptyString(value.encrypted_content);
}
function isCanonicalRetainedUserItem(value) {
	if (!isRecord(value) || value.type !== void 0 && value.type !== "message" || value.role !== "user") return false;
	if (nonemptyString(value.content)) return true;
	return Array.isArray(value.content) && value.content.length > 0 && value.content.every((part) => isRecord(part) && part.type === "input_text" && nonemptyString(part.text));
}
function isUsage(value) {
	return isRecord(value) && hasOnlyKeys(value, [
		"source",
		"inputTokens",
		"outputTokens",
		"cacheReadTokens",
		"cacheWriteTokens",
		"reasoningTokens"
	]) && (value.source === "reported" || value.source === "estimated") && nonnegativeInteger(value.inputTokens) && nonnegativeInteger(value.outputTokens) && optionalNonnegativeInteger(value.cacheReadTokens) && optionalNonnegativeInteger(value.cacheWriteTokens) && optionalNonnegativeInteger(value.reasoningTokens);
}
function hasOnlyKeys(value, allowed) {
	const allowedSet = new Set(allowed);
	return Object.keys(value).every((key) => allowedSet.has(key));
}
function nonnegativeInteger(value) {
	return Number.isSafeInteger(value) && value >= 0;
}
function optionalNonnegativeInteger(value) {
	return value === void 0 || nonnegativeInteger(value);
}
function nonemptyString(value) {
	return typeof value === "string" && value.length > 0;
}
function sha256Identity(value) {
	return typeof value === "string" && /^sha256:[a-f0-9]{64}$/u.test(value);
}
function sha256(domain, value) {
	return `sha256:${createHash("sha256").update(domain).update("\0").update(value).digest("hex")}`;
}
/** Stable key-sorted JSON independent of insertion order. */
function canonicalJson(value) {
	if (value === null || typeof value !== "object") return JSON.stringify(value);
	if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
	return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
}
const FORBIDDEN_STATE_KEYS = /* @__PURE__ */ new Set([
	"authorization",
	"accesstoken",
	"refreshtoken",
	"apikey",
	"token",
	"idtoken",
	"secret",
	"password",
	"clientsecret",
	"oauth",
	"oauthtoken",
	"auth",
	"cookie",
	"setcookie",
	"proxyauthorization",
	"proxyauthenticate",
	"wwwauthenticate",
	"authenticationinfo",
	"credential",
	"credentials",
	"header",
	"headers",
	"requestheaders",
	"responseheaders",
	"turnstate",
	"xcodexturnstate",
	"compactiontrigger",
	"accountid",
	"sessionid",
	"requestid",
	"requestids",
	"promptcachekey",
	"previousresponseid",
	"turnid",
	"proto",
	"prototype",
	"constructor"
]);
const FORBIDDEN_STATE_KEY_WORDS = /* @__PURE__ */ new Set([
	"auth",
	"authentication",
	"authorization",
	"bearer",
	"cookie",
	"cookies",
	"credential",
	"credentials",
	"header",
	"headers",
	"oauth",
	"password",
	"secret"
]);
/** Compact/camel wrappers whose normalized form still identifies sensitive state. */
const FORBIDDEN_STATE_KEY_COMPOUNDS = [
	"authorization",
	"authentication",
	"accesstoken",
	"refreshtoken",
	"idtoken",
	"authtoken",
	"apikey",
	"credential",
	"clientsecret",
	"secretkey",
	"setcookie",
	"proxyauthorization",
	"wwwauthenticate",
	"authenticationinfo",
	"turnstate",
	"accountid",
	"sessionid",
	"requestid",
	"promptcachekey",
	"previousresponseid",
	"turnid"
];
/** Scan everything except the one schema-validated terminal opaque byte string. */
function containsForbiddenCheckpointMaterial(checkpoint) {
	const replacementItems = [...checkpoint.replacementItems];
	const terminal = replacementItems.at(-1);
	if (terminal === void 0) return true;
	replacementItems[replacementItems.length - 1] = {
		...terminal,
		encrypted_content: ""
	};
	return containsForbiddenMaterial({
		...checkpoint,
		replacementItems
	});
}
function containsForbiddenStateKey(key, value) {
	const normalized = key.toLowerCase().replace(/[^a-z0-9]/gu, "");
	if (FORBIDDEN_STATE_KEYS.has(normalized) || FORBIDDEN_STATE_KEY_COMPOUNDS.some((compound) => normalized.includes(compound))) return true;
	const words = key.replace(/([a-z0-9])([A-Z])/gu, "$1 $2").toLowerCase().split(/[^a-z0-9]+/gu).filter((word) => word.length > 0);
	if (words.some((word) => FORBIDDEN_STATE_KEY_WORDS.has(word))) return true;
	return (words.includes("token") || words.includes("tokens")) && !nonnegativeInteger(value);
}
function hasForbiddenDiscriminator(value) {
	const associatedValue = value.value ?? value.data ?? value.content ?? value.count;
	for (const discriminator of [
		"name",
		"type",
		"key",
		"field"
	]) {
		const candidate = value[discriminator];
		if (typeof candidate === "string" && containsForbiddenStateKey(candidate, associatedValue)) return true;
	}
	return false;
}
/** Reject raw request/auth state at any remaining depth. */
function containsForbiddenMaterial(value) {
	if (typeof value === "string") return /^\s*Bearer\s+/iu.test(value) || /^[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}$/u.test(value);
	if (Array.isArray(value)) {
		if (typeof value[0] === "string" && containsForbiddenStateKey(value[0], value[1])) return true;
		return value.some(containsForbiddenMaterial);
	}
	if (!isRecord(value)) return false;
	if (hasForbiddenDiscriminator(value)) return true;
	for (const [nestedKey, nested] of Object.entries(value)) if (containsForbiddenStateKey(nestedKey, nested) || containsForbiddenMaterial(nested)) return true;
	return false;
}
function installedNativeReplayVersions() {
	return {
		dshLlm: installedPackageVersion("@deepseek-ai/dsh-llm", import.meta.url),
		dshPiAi: installedPackageVersion("@deepseek-ai/dsh-llm-pi-ai", import.meta.url),
		piAi: installedPackageVersion("@earendil-works/pi-ai", import.meta.url)
	};
}
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
//#endregion
export { isPlainRecord as _, CODEX_NATIVE_CHECKPOINT_RETENTION_GENERATION as a, CODEX_NATIVE_REPLAY_COMPATIBILITY as c, decodeCodexNativeCheckpoint as d, encodeCodexNativeCheckpoint as f, isPlainJsonTree as g, installedPackageVersion as h, CODEX_NATIVE_CHECKPOINT_ESTIMATOR as i, MAX_CODEX_NATIVE_CHECKPOINT_BYTES as l, isCodexNativeReplayRuntimeCompatible as m, CODEX_NATIVE_CHECKPOINT_CODEC as n, CODEX_NATIVE_CHECKPOINT_RETENTION_POLICY as o, hashCodexAccountIdentity as p, CODEX_NATIVE_CHECKPOINT_CODEC_GENERATION as r, CODEX_NATIVE_CHECKPOINT_SCHEMA_VERSION as s, CODEX_NATIVE_CHECKPOINT_BLOCK_TYPE as t, codexNativeCheckpointCompatibilityDigest as u, serializedJsonBytes as v, utf8ByteLength as y };
