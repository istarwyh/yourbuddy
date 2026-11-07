import { _ as refreshTokens, a as DEFAULT_REQUEST_TIMEOUT_MS, b as writeAuthFile, c as MAX_REFRESH_AGE_MS, d as defaultAuthJsonPath, f as mergeRefreshed, g as readAuthSnapshot, h as readAuthFileVersion, i as CodexAuthAdapter, l as authState, m as readAuthFile, n as readBoundedResponseText, o as DEFAULT_WEBSOCKET_CONNECT_TIMEOUT_MS, p as needsRefresh, r as CODEX_ROUTE, s as DEFAULT_REFRESH_LEAD_MS, t as liveValue, u as decodeAccessToken, v as refreshTooOld, y as sameAuthFileVersion } from "./volatile-config-DNSIaT45.js";
import { t as CODEX_NATIVE_CHECKPOINT_BLOCK_TYPE } from "./native-checkpoint-DaSMABQ8.js";
import z from "@deepseek-ai/schemastery";
import { credentialRef } from "@deepseek-ai/dsh-credentials";
import { withFileLock } from "@deepseek-ai/dsh-atomic-write";
import { spawn } from "node:child_process";
import { Service } from "@deepseek-ai/cordis";
import { EnvHttpProxyAgent, setGlobalDispatcher } from "undici";
import { clientRequestSchema } from "@deepseek-ai/dsh-client-connection";
//#region src/codex-auth-service.ts
/**
* The `codexAuth` service: login status and login-flow startup for the web
* surface. Status is value-free (no token material ever leaves this service),
* and login only spawns the official codex CLI, which owns the whole flow —
* browser PKCE by default, device-code on request.
*
* Authenticated operations resolve credentials through an in-memory cache
* that is validated per call with a single stat: a fresh token with an
* untouched auth file is served without any file read or cross-process lock.
* Refresh happens proactively in the background (ahead of expiry and of the
* codex CLI's 8-day refresh age), so the request path only refreshes
* synchronously when a token is genuinely needed — after long process-down
* idle, or when a refresh failed and the token is still required.
*
* @module dsh-codex-auth/codex-auth-service
*/
/** How long a resolved credential may be served from memory without re-reading the auth file. */
const CREDENTIAL_CACHE_MAX_AGE_MS = 6e5;
/** How long a computed status may be served without re-reading the auth file. */
const STATUS_CACHE_TTL_MS = 2e3;
/** Lead before a refresh threshold at which the background refresh timer fires. */
const REFRESH_GRACE_MS = 6e4;
/** Retry interval after a failed background refresh. */
const BACKGROUND_REFRESH_RETRY_MS = 3e5;
/** Maximum unload wait after signalling cancellation to abortable auth work. */
const DISPOSE_TIMEOUT_MS = 5e3;
/** Floor for a background refresh that is not yet due; avoids a zero-delay re-arm loop. */
const BACKGROUND_REFRESH_MIN_DELAY_MS = 6e4;
/** Ceiling for one setTimeout delay (Node's 32-bit signed millisecond cap). */
const MAX_TIMER_DELAY_MS = 2 ** 31 - 1;
/** Codex CLI version probe timeout. */
const PROBE_TIMEOUT_MS = 5e3;
/** Grace before a stopping CLI probe is detached and force-killed. */
const PROBE_STOP_TIMEOUT_MS = 500;
/** Read-only ChatGPT backend endpoint answering the account's usage windows. */
const CODEX_USAGE_ENDPOINT = "https://chatgpt.com/backend-api/wham/usage";
/** Hard cap for the usage envelope; the real payload is a few hundred bytes. */
const CODEX_USAGE_MAX_BYTES = 65536;
/** Host-owned deadline so a stalled private endpoint cannot pin the RPC forever. */
const CODEX_USAGE_TIMEOUT_MS = 1e4;
/** Codex's subscription window is identified by duration, not primary/secondary position. */
const WEEKLY_USAGE_WINDOW_SECONDS = 604800;
/**
* The codexAuth service. Constructing it registers it as `codexAuth`; this
* package's dedicated Connection RPC channel is its only browser transport.
*/
var CodexAuthService = class extends Service {
	options;
	codexVersion;
	lastStatus;
	statusListeners = /* @__PURE__ */ new Set();
	cachedCredential;
	refreshTimer;
	credentialFlight;
	backgroundRefreshFlight;
	commitFlights = /* @__PURE__ */ new Set();
	lifecycleAbort = new AbortController();
	disposed = false;
	statusReadAt = 0;
	constructor(ctx, options) {
		super(ctx, "codexAuth");
		this.options = options;
		this.probeCodex();
		this.ctx.effect(() => () => this.disposeOperations(), "codex-auth: operations");
	}
	async disposeOperations() {
		if (this.disposed) return;
		this.disposed = true;
		this.clearRefreshTimer();
		this.statusListeners.clear();
		this.cachedCredential = void 0;
		this.lifecycleAbort.abort(/* @__PURE__ */ new Error("codex-auth: auth operation cancelled during disposal"));
		const foreground = this.credentialFlight;
		const background = this.backgroundRefreshFlight;
		const operations = [...foreground === void 0 ? [] : [foreground], ...background === void 0 ? [] : [background]];
		if (operations.length > 0) {
			const timeoutMs = this.options.disposeTimeoutMs ?? DISPOSE_TIMEOUT_MS;
			if (!await waitForSettlement(Promise.allSettled(operations).then(() => {}), timeoutMs)) this.ctx.logger.warn("codex-auth: abortable auth work did not stop within %dms; disposal will continue", timeoutMs);
		}
		this.credentialFlight = void 0;
		if (this.commitFlights.size > 0) await Promise.allSettled(this.commitFlights);
	}
	/** Whether the codex CLI resolved at startup. */
	get available() {
		return this.codexVersion !== void 0;
	}
	/** Last locally observed value-free status, when one has been read. */
	get cachedStatus() {
		return this.lastStatus;
	}
	/** Observe locally verified status changes without exposing credentials. */
	watchStatus(listener) {
		this.statusListeners.add(listener);
		return () => {
			this.statusListeners.delete(listener);
		};
	}
	/**
	* Resolve credentials for one authenticated operation. A fresh cached
	* credential with an untouched auth file is served directly (one stat, no
	* read, no lock); everything else shares one in-process flight, which
	* re-reads under the cross-process writer lock before deciding whether to
	* refresh.
	*/
	async credential(signal) {
		throwIfAborted(signal);
		if (this.disposed) return void 0;
		const cached = this.cachedCredential;
		if (cached !== void 0) {
			const fresh = await this.cachedCredentialFresh(cached);
			if (this.disposed) return void 0;
			if (fresh) return cached.credential;
		}
		let flight = this.credentialFlight;
		if (flight === void 0) {
			flight = this.resolveCredential(this.lifecycleAbort.signal).finally(() => {
				if (this.credentialFlight === flight) this.credentialFlight = void 0;
			});
			this.credentialFlight = flight;
		}
		return waitForCredential(flight, signal, this.lifecycleAbort.signal);
	}
	/**
	* Whether a cached credential may still be served: the token must remain
	* comfortably valid, the entry must be younger than the cache ceiling, and
	* the auth file must not have changed under it (a `codex login` re-run or
	* another process's refresh). The file check is one stat — no read, no lock.
	*/
	async cachedCredentialFresh(cached) {
		const leadMs = this.options.refreshLeadMs ?? 3e5;
		if (cached.accessTokenExpiresAt !== void 0 && cached.accessTokenExpiresAt - Date.now() < leadMs) return false;
		if (Date.now() - cached.cachedAt >= CREDENTIAL_CACHE_MAX_AGE_MS) return false;
		try {
			const current = await readAuthFileVersion(this.options.authJsonPath);
			return current !== void 0 && sameAuthFileVersion(current, cached.fileVersion);
		} catch {
			return false;
		}
	}
	/** Describe the current login state without exposing any token material. */
	async status() {
		if (this.lastStatus !== void 0 && Date.now() - this.statusReadAt < STATUS_CACHE_TTL_MS) return this.lastStatus;
		let file;
		try {
			file = await readAuthFile(this.options.authJsonPath);
		} catch (error) {
			if (!this.disposed) this.warnCredentialFailure("status could not read the Codex Login State", error);
		}
		const status = statusFromFile(file, this.available, this.codexVersion, this.options.credentialRef);
		if (this.disposed) return status;
		this.statusReadAt = Date.now();
		return this.publishStatus(status);
	}
	/**
	* Read-only weekly usage snapshot for the settings login block. The ChatGPT
	* backend's `/wham/usage` endpoint answers multiple account windows; the
	* seven-day window is selected by duration rather than field position. The
	* probe never throws: a failure answers an empty view, which the settings
	* card renders as dashes instead of erroring the whole login block.
	*/
	async usage(signal) {
		const bounded = boundedSignal([signal, this.lifecycleAbort.signal], this.options.usageTimeoutMs ?? CODEX_USAGE_TIMEOUT_MS);
		try {
			throwIfAborted(bounded.signal);
			const credential = await this.credential(bounded.signal);
			if (credential === void 0) return {};
			return await waitForAbort(probeUsage(this.options.fetchImpl ?? fetch, credential, bounded.signal), bounded.signal);
		} catch {
			return {};
		} finally {
			bounded.cleanup();
		}
	}
	/** Start the official codex login flow in the background. */
	login(mode) {
		if (!this.available) return Promise.reject(/* @__PURE__ */ new Error(`codex-auth: the codex CLI ("${this.options.codexCommand}") is not on PATH; install it (or adjust the plugin's codexCommand config) before logging in`));
		const args = mode === "device" ? ["login", "--device-auth"] : ["login"];
		try {
			(this.options.spawnImpl ?? spawn)(this.options.codexCommand, args, {
				detached: true,
				stdio: "ignore"
			}).unref();
			return Promise.resolve({ started: true });
		} catch (error) {
			return Promise.reject(/* @__PURE__ */ new Error(`codex-auth: failed to start ${this.options.codexCommand} login: ${error instanceof Error ? error.message : String(error)}`));
		}
	}
	/** Resolve from the latest locked document and refresh at most once. */
	async resolveCredential(signal) {
		let observed;
		try {
			observed = await readAuthFile(this.options.authJsonPath);
			if (isAborted(signal)) return void 0;
		} catch (error) {
			if (isAborted(signal)) return void 0;
			this.warnCredentialFailure("pre-lock read could not inspect the Codex Login State", error);
		}
		try {
			const decision = await withFileLock(this.options.authJsonPath, () => this.decideRefreshLocked());
			if (isAborted(signal)) return void 0;
			if (decision.mode === "absent") {
				this.publishStatus(statusFromFile(decision.file, this.available, this.codexVersion, this.options.credentialRef));
				return;
			}
			if (decision.mode === "ready") {
				this.publishStatus(statusFromFile(decision.snapshot.file, this.available, this.codexVersion, this.options.credentialRef));
				this.recordResolved(decision.snapshot);
				return credentialFromFile(decision.snapshot.file);
			}
			try {
				const reply = await refreshTokens(decision.refreshToken, this.options.fetchImpl ?? fetch, signal);
				if (isAborted(signal)) return void 0;
				const adopted = await withFileLock(this.options.authJsonPath, () => this.adoptRefreshedLocked(decision.snapshot.file, reply, signal));
				if (isAborted(signal) || adopted === void 0) return void 0;
				this.publishStatus(statusFromFile(adopted.file, this.available, this.codexVersion, this.options.credentialRef));
				this.recordResolved(adopted);
				return credentialFromFile(adopted.file);
			} catch (error) {
				if (isAborted(signal)) return void 0;
				const replacement = await readAuthSnapshot(this.options.authJsonPath);
				if (isAborted(signal)) return void 0;
				const leadMs = this.options.refreshLeadMs ?? 3e5;
				if (canAdoptReplacement(decision.snapshot.file, replacement?.file, leadMs)) {
					this.publishStatus(statusFromFile(replacement.file, this.available, this.codexVersion, this.options.credentialRef));
					this.recordResolved(replacement);
					return credentialFromFile(replacement.file);
				}
				this.warnCredentialFailure("token refresh failed; run `codex login` to restore the Codex Login State", error, decision.snapshot.file);
				this.publishStatus(statusFromFile(replacement?.file, this.available, this.codexVersion, this.options.credentialRef));
				return;
			}
		} catch (error) {
			if (isAborted(signal)) return void 0;
			this.warnCredentialFailure("could not coordinate the Codex Login State", error, observed);
			return;
		}
	}
	/**
	* Under the writer lock, read the auth file and return a side-effect-free
	* refresh decision. Callers publish/cache only after their lifecycle check.
	*/
	async decideRefreshLocked() {
		const snapshot = await readAuthSnapshot(this.options.authJsonPath);
		if (snapshot === void 0) return {
			mode: "absent",
			file: void 0
		};
		const file = snapshot.file;
		const state = authState(file);
		if (state.accessToken === void 0) return {
			mode: "absent",
			file
		};
		const leadMs = this.options.refreshLeadMs ?? 3e5;
		if (!needsRefresh(state, leadMs) && !refreshTooOld(file, 6912e5)) return {
			mode: "ready",
			snapshot
		};
		const refreshToken = file.tokens?.refresh_token;
		if (typeof refreshToken !== "string" || refreshToken.length === 0) return {
			mode: "absent",
			file
		};
		return {
			mode: "refresh",
			snapshot,
			refreshToken
		};
	}
	/**
	* Under the writer lock: fold a refresh reply into the current document,
	* preserving unknown fields — unless another writer already refreshed while
	* the OAuth round trip was in flight, in which case its newer document wins.
	* Returns the document to serve, or `undefined` when the login is gone.
	*/
	async adoptRefreshedLocked(previous, reply, signal) {
		if (isAborted(signal)) return void 0;
		const current = await readAuthSnapshot(this.options.authJsonPath);
		if (isAborted(signal) || current === void 0) return void 0;
		const leadMs = this.options.refreshLeadMs ?? 3e5;
		if (!needsRefresh(authState(current.file), leadMs) && !refreshTooOld(current.file, 6912e5)) return current;
		if (!sameRefreshLineage(previous, current.file, reply)) {
			this.publishStatus(statusFromFile(current.file, this.available, this.codexVersion, this.options.credentialRef));
			return;
		}
		if (!await this.commitAuthFile(mergeRefreshed(current.file, reply), signal)) return void 0;
		if (isAborted(signal)) return void 0;
		const persisted = await readAuthSnapshot(this.options.authJsonPath);
		if (persisted === void 0 || needsRefresh(authState(persisted.file), leadMs) || refreshTooOld(persisted.file, 6912e5)) return void 0;
		return persisted;
	}
	/** Commit one non-cancellable atomic write while keeping teardown joined. */
	async commitAuthFile(file, signal) {
		if (isAborted(signal)) return false;
		const writer = this.options.authFileWriter ?? writeAuthFile;
		const commit = Promise.resolve().then(() => writer(this.options.authJsonPath, file));
		this.commitFlights.add(commit);
		try {
			await commit;
			return !isAborted(signal);
		} finally {
			this.commitFlights.delete(commit);
		}
	}
	/**
	* Populate the in-memory credential cache from a version-bound snapshot and
	* arm the next background refresh. A snapshot failure never produces a cache
	* entry, so filesystem uncertainty fails closed.
	*/
	recordResolved(snapshot) {
		if (this.disposed) return;
		const credential = credentialFromFile(snapshot.file);
		if (credential === void 0) {
			this.cachedCredential = void 0;
			return;
		}
		this.cachedCredential = {
			credential,
			accessTokenExpiresAt: authState(snapshot.file).accessTokenExpiresAt,
			cachedAt: Date.now(),
			fileVersion: snapshot.version
		};
		this.scheduleBackgroundRefresh(snapshot.file);
	}
	/**
	* Arm one background refresh at the earlier of (access-token expiry minus
	* the refresh lead) and (the codex 8-day refresh age), each with a grace
	* lead, and never closer than the minimum delay unless a refresh is already
	* due (then it fires immediately). The timer is unref'd so it never keeps
	* the process alive, and is cleared on dispose.
	*/
	scheduleBackgroundRefresh(file) {
		this.clearRefreshTimer();
		if (this.disposed) return;
		const refreshToken = file.tokens?.refresh_token;
		if (typeof refreshToken !== "string" || refreshToken.length === 0) return;
		const now = Date.now();
		const leadMs = this.options.refreshLeadMs ?? 3e5;
		const state = authState(file);
		let delayMs = Number.POSITIVE_INFINITY;
		if (state.accessTokenExpiresAt !== void 0) delayMs = Math.min(delayMs, state.accessTokenExpiresAt - now - leadMs - REFRESH_GRACE_MS);
		const lastRefreshAt = typeof file.last_refresh === "string" && file.last_refresh.length > 0 ? Date.parse(file.last_refresh) : NaN;
		if (Number.isFinite(lastRefreshAt)) delayMs = Math.min(delayMs, lastRefreshAt + MAX_REFRESH_AGE_MS - now - REFRESH_GRACE_MS);
		if (!Number.isFinite(delayMs)) return;
		const delay = needsRefresh(state, leadMs) || refreshTooOld(file, 6912e5) ? 0 : Math.max(BACKGROUND_REFRESH_MIN_DELAY_MS, Math.min(delayMs, MAX_TIMER_DELAY_MS));
		const timer = setTimeout(() => {
			this.refreshTimer = void 0;
			return this.startBackgroundRefresh();
		}, delay);
		timer.unref?.();
		this.refreshTimer = timer;
	}
	/** Start or join the one lifecycle-tracked background refresh flight. */
	startBackgroundRefresh() {
		if (this.disposed) return Promise.resolve();
		if (this.backgroundRefreshFlight !== void 0) return this.backgroundRefreshFlight;
		const flight = this.refreshInBackground(this.lifecycleAbort.signal).finally(() => {
			if (this.backgroundRefreshFlight === flight) this.backgroundRefreshFlight = void 0;
		});
		this.backgroundRefreshFlight = flight;
		return flight;
	}
	/**
	* Refresh the token set ahead of the request path when the auth file says it
	* is due. The request path still refreshes synchronously when a token is
	* genuinely needed, but this pre-arms it while the process is alive, so the
	* common case never waits on the OAuth round trip. Like the request path,
	* the OAuth round trip happens outside the writer lock (short critical
	* sections only), so a slow token endpoint never blocks other readers;
	* failures are logged and retried later.
	*/
	async refreshInBackground(signal) {
		let retry = false;
		try {
			if (isAborted(signal)) return;
			const decision = await withFileLock(this.options.authJsonPath, () => this.decideRefreshLocked());
			if (isAborted(signal)) return;
			if (decision.mode === "absent") {
				this.publishStatus(statusFromFile(decision.file, this.available, this.codexVersion, this.options.credentialRef));
				return;
			}
			if (decision.mode === "ready") {
				this.publishStatus(statusFromFile(decision.snapshot.file, this.available, this.codexVersion, this.options.credentialRef));
				this.recordResolved(decision.snapshot);
				return;
			}
			try {
				const reply = await refreshTokens(decision.refreshToken, this.options.fetchImpl ?? fetch, signal);
				if (isAborted(signal)) return;
				const adopted = await withFileLock(this.options.authJsonPath, () => this.adoptRefreshedLocked(decision.snapshot.file, reply, signal));
				if (isAborted(signal)) return;
				if (adopted === void 0) retry = true;
				else {
					this.publishStatus(statusFromFile(adopted.file, this.available, this.codexVersion, this.options.credentialRef));
					this.recordResolved(adopted);
				}
			} catch (error) {
				if (isAborted(signal)) return;
				const replacement = await readAuthSnapshot(this.options.authJsonPath);
				if (isAborted(signal)) return;
				const leadMs = this.options.refreshLeadMs ?? 3e5;
				if (canAdoptReplacement(decision.snapshot.file, replacement?.file, leadMs)) {
					this.publishStatus(statusFromFile(replacement.file, this.available, this.codexVersion, this.options.credentialRef));
					this.recordResolved(replacement);
					return;
				}
				this.warnCredentialFailure("background token refresh failed; will retry later", error, decision.snapshot.file);
				retry = true;
			}
		} catch (error) {
			if (isAborted(signal)) return;
			this.warnCredentialFailure("background token refresh could not coordinate; will retry later", error);
			retry = true;
		}
		if (retry && !this.disposed) this.scheduleBackgroundRetry();
	}
	clearRefreshTimer() {
		if (this.refreshTimer === void 0) return;
		clearTimeout(this.refreshTimer);
		this.refreshTimer = void 0;
	}
	/** Re-arm the background refresh after a failure. */
	scheduleBackgroundRetry() {
		if (this.disposed || this.refreshTimer !== void 0) return;
		const timer = setTimeout(() => {
			this.refreshTimer = void 0;
			return this.startBackgroundRefresh();
		}, BACKGROUND_REFRESH_RETRY_MS);
		timer.unref?.();
		this.refreshTimer = timer;
	}
	publishStatus(status) {
		if (this.disposed || sameStatus(this.lastStatus, status)) return status;
		this.lastStatus = status;
		for (const listener of this.statusListeners) try {
			listener();
		} catch {}
		return status;
	}
	warnCredentialFailure(message, error, file) {
		this.ctx.logger.warn("codex-auth: %s (%s)", message, safeDiagnostic(error, file));
	}
	/**
	* Probe the codex CLI once at startup without blocking the event loop;
	* failures (missing binary, timeout, non-zero exit) leave the service
	* unavailable.
	*/
	probeCodex() {
		this.ctx.effect(() => {
			let child;
			let settled = false;
			let spawned = false;
			let terminal = false;
			let stopRequested = false;
			let stopSpawnedFlight;
			let resolveSpawnOutcome;
			let resolveClosed;
			const spawnOutcome = new Promise((resolve) => {
				resolveSpawnOutcome = resolve;
			});
			const closed = new Promise((resolve) => {
				resolveClosed = resolve;
			});
			const stopTimeoutMs = this.options.probeStopTimeoutMs ?? PROBE_STOP_TIMEOUT_MS;
			const markTerminal = () => {
				if (terminal) return;
				terminal = true;
				resolveSpawnOutcome();
				resolveClosed();
			};
			const detach = () => {
				try {
					child?.stdout?.destroy();
				} catch {}
				try {
					child?.stderr?.destroy();
				} catch {}
				try {
					child?.unref();
				} catch {}
			};
			const kill = (signal) => {
				try {
					return child?.kill(signal) === true;
				} catch {
					return false;
				}
			};
			const stopSpawned = () => {
				if (stopSpawnedFlight !== void 0) return stopSpawnedFlight;
				stopSpawnedFlight = (async () => {
					if (terminal) return;
					kill("SIGTERM");
					if (await waitForSettlement(closed, stopTimeoutMs)) return;
					kill("SIGKILL");
					detach();
					await waitForSettlement(closed, stopTimeoutMs);
				})();
				return stopSpawnedFlight;
			};
			const stop = async () => {
				stopRequested = true;
				if (!spawned && !terminal && !await waitForSettlement(spawnOutcome, stopTimeoutMs)) {
					detach();
					return;
				}
				if (spawned && !terminal) await stopSpawned();
			};
			const finish = (version) => {
				if (settled) return;
				settled = true;
				clearTimeout(timer);
				if (!this.disposed) this.codexVersion = version;
			};
			const timer = setTimeout(() => {
				finish(void 0);
				stop();
			}, PROBE_TIMEOUT_MS);
			timer.unref?.();
			try {
				child = (this.options.spawnImpl ?? spawn)(this.options.codexCommand, ["--version"], { stdio: [
					"ignore",
					"pipe",
					"pipe"
				] });
				let output = "";
				child.stdout?.on("data", (chunk) => {
					output += String(chunk);
				});
				child.stderr?.on("data", (chunk) => {
					output += String(chunk);
				});
				child.on("spawn", () => {
					spawned = true;
					resolveSpawnOutcome();
					if (stopRequested) stopSpawned();
				});
				child.on("error", () => {
					finish(void 0);
					if (spawned) stopSpawned();
					else markTerminal();
				});
				child.on("close", (code) => {
					markTerminal();
					const line = code === 0 ? output.trim().split("\n")[0] : void 0;
					finish(typeof line === "string" && line.length > 0 ? line : void 0);
				});
			} catch {
				markTerminal();
				finish(void 0);
			}
			return async () => {
				settled = true;
				clearTimeout(timer);
				await stop();
			};
		}, "codex-auth: CLI probe");
	}
};
async function probeUsage(fetchImpl, credential, signal) {
	const response = await fetchImpl(CODEX_USAGE_ENDPOINT, {
		headers: {
			authorization: `Bearer ${credential.accessToken}`,
			...credential.accountId === void 0 ? {} : { "chatgpt-account-id": credential.accountId },
			"content-type": "application/json",
			"user-agent": "dsh-codex-auth/0.1.0"
		},
		signal
	});
	if (!response.ok) {
		try {
			await response.body?.cancel();
		} catch {}
		return {};
	}
	const text = await readBoundedResponseText(response, CODEX_USAGE_MAX_BYTES, signal, {
		tooLarge: () => /* @__PURE__ */ new Error("usage response exceeded the encoded size limit"),
		cancelled: () => /* @__PURE__ */ new Error("usage probe was cancelled")
	});
	return usageFromPayload(JSON.parse(text));
}
function credentialFromFile(file) {
	const accessToken = file.tokens?.access_token;
	if (typeof accessToken !== "string" || accessToken.length === 0) return void 0;
	const accessFacts = decodeAccessToken(accessToken);
	const idFacts = typeof file.tokens?.id_token === "string" ? decodeAccessToken(file.tokens.id_token) : {};
	const accountId = nonBlank(file.tokens?.account_id) ?? accessFacts.chatgptAccountId ?? idFacts.chatgptAccountId;
	const planType = idFacts.chatgptPlanType ?? accessFacts.chatgptPlanType;
	return {
		accessToken,
		...accountId === void 0 ? {} : { accountId },
		...planType === void 0 ? {} : { planType }
	};
}
function statusFromFile(file, available, codexVersion, credentialReference) {
	const state = authState(file);
	const credential = file === void 0 ? void 0 : credentialFromFile(file);
	const authMode = nonBlank(file?.auth_mode);
	const lastRefreshAt = nonBlank(file?.last_refresh);
	return {
		available,
		configured: state.accessToken !== void 0,
		...authMode === void 0 ? {} : { authMode },
		...codexVersion === void 0 ? {} : { codexVersion },
		...state.accessTokenExpiresAt === void 0 ? {} : { tokenExpiresAt: new Date(state.accessTokenExpiresAt).toISOString() },
		...lastRefreshAt === void 0 ? {} : { lastRefreshAt },
		...credential?.accountId === void 0 ? {} : { accountId: credential.accountId },
		...credential?.planType === void 0 ? {} : { planType: credential.planType },
		credentialRef: credentialReference,
		authFileExists: file !== void 0
	};
}
function sameRefreshLineage(previous, current, reply) {
	const previousRefreshToken = nonBlank(previous.tokens?.refresh_token);
	const currentRefreshToken = nonBlank(current.tokens?.refresh_token);
	if (previousRefreshToken === void 0 || currentRefreshToken !== previousRefreshToken) return false;
	const knownAccountIds = [
		credentialFromFile(previous)?.accountId,
		credentialFromFile(current)?.accountId,
		nonBlank(reply.account_id)
	].filter((accountId) => accountId !== void 0);
	return knownAccountIds.every((accountId) => accountId === knownAccountIds[0]);
}
function canAdoptReplacement(previous, replacement, refreshLeadMs) {
	if (replacement === void 0) return false;
	const before = credentialFromFile(previous);
	const after = credentialFromFile(replacement);
	if (before === void 0 || after === void 0 || before.accessToken === after.accessToken) return false;
	if (before.accountId === void 0 || after.accountId === void 0 || before.accountId !== after.accountId) return false;
	return !needsRefresh(authState(replacement), refreshLeadMs);
}
function nonBlank(value) {
	return typeof value === "string" && value.length > 0 ? value : void 0;
}
/** Extract the settings-relevant facts from a `/wham/usage` payload, or none. */
function usageFromPayload(value) {
	if (!isRecord$1(value)) return {};
	const planType = nonBlank(typeof value.plan_type === "string" ? value.plan_type : void 0);
	const rateLimit = isRecord$1(value.rate_limit) ? value.rate_limit : void 0;
	const weekly = rateLimit === void 0 ? void 0 : [rateLimit.primary_window, rateLimit.secondary_window].find((candidate) => isRecord$1(candidate) && candidate.limit_window_seconds === WEEKLY_USAGE_WINDOW_SECONDS);
	let weeklyRemainingPercent;
	let weeklyResetAt;
	if (isRecord$1(weekly) && typeof weekly.used_percent === "number" && Number.isFinite(weekly.used_percent)) weeklyRemainingPercent = Math.min(100, Math.max(0, Math.round(100 - weekly.used_percent)));
	if (isRecord$1(weekly) && Number.isSafeInteger(weekly.reset_at) && weekly.reset_at > 0) {
		const reset = /* @__PURE__ */ new Date(weekly.reset_at * 1e3);
		if (Number.isFinite(reset.getTime())) weeklyResetAt = reset.toISOString();
	}
	return {
		...planType === void 0 ? {} : { planType },
		...weeklyRemainingPercent === void 0 ? {} : { weeklyRemainingPercent },
		...weeklyResetAt === void 0 ? {} : { weeklyResetAt }
	};
}
function isRecord$1(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function safeDiagnostic(error, _file) {
	const name = error instanceof Error && error.name.length > 0 ? error.name : "Error";
	const message = error instanceof Error ? error.message : "";
	const status = /(?:HTTP\s*)?([45]\d\d)\b/iu.exec(message)?.[1];
	return status === void 0 ? name.slice(0, 80) : `${name.slice(0, 64)} (HTTP ${status})`;
}
function sameStatus(left, right) {
	if (left === void 0) return false;
	return left.available === right.available && left.configured === right.configured && left.authMode === right.authMode && left.codexVersion === right.codexVersion && left.tokenExpiresAt === right.tokenExpiresAt && left.lastRefreshAt === right.lastRefreshAt && left.accountId === right.accountId && left.planType === right.planType && left.credentialRef === right.credentialRef && left.authFileExists === right.authFileExists;
}
function waitForSettlement(task, timeoutMs) {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => resolve(false), Math.max(1, timeoutMs));
		timer.unref?.();
		task.then(() => {
			clearTimeout(timer);
			resolve(true);
		}, (error) => {
			clearTimeout(timer);
			reject(error);
		});
	});
}
function boundedSignal(parents, timeoutMs) {
	const controller = new AbortController();
	const active = parents.filter((parent) => parent !== void 0);
	const onParentAbort = () => {
		controller.abort(active.find((parent) => parent.aborted)?.reason);
	};
	const aborted = active.find((parent) => parent.aborted);
	if (aborted !== void 0) controller.abort(aborted.reason);
	else for (const parent of active) parent.addEventListener("abort", onParentAbort, { once: true });
	const timer = setTimeout(() => controller.abort(/* @__PURE__ */ new Error(`usage probe timed out after ${String(timeoutMs)}ms`)), Math.max(1, timeoutMs));
	timer.unref?.();
	return {
		signal: controller.signal,
		cleanup: () => {
			clearTimeout(timer);
			for (const parent of active) parent.removeEventListener("abort", onParentAbort);
		}
	};
}
function isAborted(signal) {
	return signal?.aborted === true;
}
function throwIfAborted(signal) {
	if (signal?.aborted === true) throw signal.reason;
}
function waitForAbort(task, signal) {
	throwIfAborted(signal);
	return new Promise((resolve, reject) => {
		const onAbort = () => {
			signal.removeEventListener("abort", onAbort);
			reject(signal.reason);
		};
		signal.addEventListener("abort", onAbort, { once: true });
		task.then((value) => {
			signal.removeEventListener("abort", onAbort);
			resolve(value);
		}, (error) => {
			signal.removeEventListener("abort", onAbort);
			reject(error);
		});
	});
}
function waitForCredential(flight, signal, lifecycleSignal) {
	throwIfAborted(signal);
	if (lifecycleSignal.aborted) return Promise.resolve(void 0);
	return new Promise((resolve, reject) => {
		const cleanup = () => {
			signal?.removeEventListener("abort", onCallerAbort);
			lifecycleSignal.removeEventListener("abort", onLifecycleAbort);
		};
		const onCallerAbort = () => {
			cleanup();
			reject(signal?.reason);
		};
		const onLifecycleAbort = () => {
			cleanup();
			resolve(void 0);
		};
		signal?.addEventListener("abort", onCallerAbort, { once: true });
		lifecycleSignal.addEventListener("abort", onLifecycleAbort, { once: true });
		flight.then((value) => {
			cleanup();
			resolve(value);
		}, (error) => {
			cleanup();
			reject(error);
		});
	});
}
//#endregion
//#region src/env-proxy.ts
/**
* Environment HTTP proxy installation for the running host process.
*
* Node's built-in fetch (undici) does not honour `HTTP_PROXY`/`HTTPS_PROXY`
* environment variables, while this machine's other tools (curl, python,
* the codex CLI) all route through the local proxy — so on such a network
* every LLM request from this plugin would fail with a connect timeout.
* Installing an `EnvHttpProxyAgent` as the global dispatcher makes the host
* behave like the rest of the system: proxy variables are honoured (with
* `NO_PROXY` bypassing for localhost and friends), and on a machine with no
* proxy variables set this is a no-op.
*
* @module dsh-codex-auth/env-proxy
*/
let installed = false;
/**
* Install the env-proxy dispatcher once, when the process environment names
* a proxy. Safe to call at any plugin load; repeated calls are no-ops.
* @param log - diagnostic sink (never receives proxy credentials).
*/
function installEnvHttpProxy(log) {
	if (installed) return;
	installed = true;
	const proxy = process.env.HTTPS_PROXY ?? process.env.https_proxy ?? process.env.HTTP_PROXY ?? process.env.http_proxy;
	if (proxy === void 0 || proxy.length === 0) return;
	try {
		setGlobalDispatcher(new EnvHttpProxyAgent());
		log("llm-codex-auth: routing outbound requests through the environment HTTP proxy");
	} catch (error) {
		log(error);
	}
}
//#endregion
//#region src/loopback-rpc.ts
const LOOPBACK_REQUIRED_MESSAGE = "Codex account controls require a loopback-bound DSH Host";
/**
* Decide the account RPC activation from the public WebServer bind. Only an
* explicitly loopback-bound Web service is enabled; a missing, non-loopback,
* or unknown bind is blocked because absence of WebServer is not proof of an
* owned carrier.
*
* This is a Host activation policy, not a per-request source check. DSH
* 0.1.2-alpha.5 exposes no public method-level or carrier authority context.
*/
function loopbackMode(webServerHost) {
	return webServerHost === "127.0.0.1" ? "enabled" : "blocked";
}
/** Command-entry denial shown when the Host exposes the commands seam beyond loopback. */
const ACCOUNT_COMMAND_DENIED_MESSAGE = "Codex account commands require a local DSH Host (no WebServer or 127.0.0.1-bound)";
/**
* Decide slash-command activation for one Host composition. The account
* command is the local-terminal login entry point: a composition with no
* WebServer can only dispatch through local UI adapters, and a loopback-bound
* WebServer is the same machine, so both are enabled. Any other WebServer bind
* exposes the shared commands seam to remote callers, and DSH 0.1.2-alpha.5
* command invocations carry no caller/carrier authority with which to exempt
* the local terminal, so those compositions fail closed for every caller.
*
* This is a Host activation policy, not a per-request source check.
*/
function commandAccountMode(webServer) {
	if (webServer === void 0) return "enabled";
	return loopbackMode(webServer.host);
}
/**
* Select the real RPC dispatcher only for an explicitly loopback-bound Web
* service; any other composition registers a value-free inert dispatcher that
* never calls the delegate.
*/
function createLoopbackRpcGuard(webServerHost, delegate) {
	if (loopbackMode(webServerHost) === "blocked") return {
		mode: "blocked",
		handler: async () => ({
			ok: false,
			error: {
				code: "loopback-required",
				message: LOOPBACK_REQUIRED_MESSAGE,
				details: {}
			}
		})
	};
	return {
		mode: "enabled",
		handler: delegate
	};
}
//#endregion
//#region src/auth-command.ts
function errorMessage(error) {
	return error instanceof Error ? error.message : String(error);
}
function formatStatus(status) {
	const parts = [status.configured ? "configured" : "not configured", status.available ? "CLI available" : "CLI unavailable"];
	if (status.planType !== void 0) parts.push(`plan ${status.planType}`);
	if (status.codexVersion !== void 0) parts.push(status.codexVersion);
	return `Codex auth: ${parts.join("; ")}`;
}
/**
* Build the slash command shared by every interactive DSH surface.
* @param service - the shared Host auth service.
* @param accountMode - live account-control activation for this Host
* composition (enabled on a local terminal Host with no WebServer or a
* loopback-bound WebServer, blocked on a public Web bind); when blocked the
* command denies every operation without touching the auth service.
*/
function createCodexAuthCommand(service, accountMode) {
	return {
		name: "codex-auth",
		description: "Inspect or start the Codex ChatGPT login",
		input: { hint: "[status|login]" },
		handler: async ({ rawInput }) => {
			if (accountMode() === "blocked") return {
				kind: "error",
				text: ACCOUNT_COMMAND_DENIED_MESSAGE
			};
			const operation = rawInput.trim() || "status";
			if (operation === "status") try {
				return {
					kind: "success",
					text: formatStatus(await service.status())
				};
			} catch (error) {
				return {
					kind: "error",
					text: `reading Codex auth status failed: ${errorMessage(error)}`
				};
			}
			if (operation === "login") try {
				return (await service.login("browser")).started ? {
					kind: "success",
					text: "Codex browser login started; run /codex-auth status after authorization completes."
				} : {
					kind: "error",
					text: "Codex browser login did not start."
				};
			} catch (error) {
				return {
					kind: "error",
					text: `starting Codex browser login failed: ${errorMessage(error)}`
				};
			}
			return {
				kind: "error",
				text: `unknown operation "${operation}" (available: status, login)`
			};
		}
	};
}
//#endregion
//#region src/account-routes.ts
/** Plugin-owned account RPC carried by Connection's authenticated /api routes. */
/** Register exact routes without creating a separate physical RPC carrier. */
function registerAccountRoutes(connection, namespace, endpoints, handler) {
	const disposers = endpoints.map((endpoint) => connection.fetch.register({
		path: `/api/${namespace}/${endpoint}`,
		methods: ["POST"],
		requestBody: "buffered",
		fetch: async (request) => {
			if (request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() !== "application/json") return new Response("content type must be application/json", { status: 415 });
			let body;
			try {
				body = await request.json();
			} catch {
				return new Response("invalid JSON", { status: 400 });
			}
			const envelope = clientRequestSchema.safeParse(body);
			if (!envelope.success) return new Response("invalid account request", { status: 400 });
			const { rpcId, method, payload } = envelope.data;
			const failure = (code, message) => ({
				ok: false,
				error: {
					code,
					message,
					details: {}
				}
			});
			let result;
			try {
				result = method === `${namespace}/${endpoint}` ? await handler(endpoint, payload, request.signal, connection.operator) : failure("bad-request", "Account request method does not match its endpoint");
			} catch {
				result = failure("internal", "Account request failed");
			}
			return Response.json({
				type: "server-response",
				rpcId,
				result
			});
		}
	}));
	return async () => {
		await Promise.all(disposers.map((dispose) => dispose()));
	};
}
//#endregion
//#region src/foreign-checkpoint-projection.ts
function projectForeignCheckpointRequest(options) {
	if (options.provider === "openai-codex") return options;
	let changed = false;
	const messages = options.messages.map((message) => {
		if (message.role !== "user" || !message.content.some((block) => block.type === "codex-native-checkpoint")) return message;
		changed = true;
		return {
			...message,
			content: message.content.filter((block) => block.type !== CODEX_NATIVE_CHECKPOINT_BLOCK_TYPE)
		};
	});
	return changed ? {
		...options,
		messages
	} : options;
}
/** Use the public LLM waterfall; recurse only once with a detached request. */
function installForeignCheckpointProjection(ctx) {
	return ctx.on("llm/stream", (options, next) => {
		const detached = projectForeignCheckpointRequest(options);
		return detached === options ? next() : ctx.llm.stream(detached);
	}, { prepend: true });
}
//#endregion
//#region src/rpc-contract.ts
const CODEX_AUTH_RPC_NAMESPACE = "codex-auth";
//#endregion
//#region src/rpc.ts
/** Dispatch a decoded Host request without ever exposing token material. */
async function handleCodexAuthRpc(service, endpoint, payload, signal) {
	if (endpoint === "status") {
		if (!isRecord(payload) || Object.keys(payload).length !== 0) return badRequest("status expects an empty payload");
		try {
			return {
				ok: true,
				value: { status: await service.status() }
			};
		} catch (error) {
			return internalError(error);
		}
	}
	if (endpoint === "usage") {
		if (!isRecord(payload) || Object.keys(payload).length !== 0) return badRequest("usage expects an empty payload");
		try {
			return {
				ok: true,
				value: { usage: await service.usage(signal) }
			};
		} catch (error) {
			return internalError(error);
		}
	}
	if (endpoint === "login") {
		if (!isRecord(payload) || !isLoginMode(payload.mode) || Object.keys(payload).some((key) => key !== "mode")) return badRequest("login expects { mode: \"browser\" | \"device\" }");
		try {
			return {
				ok: true,
				value: await service.login(payload.mode)
			};
		} catch (error) {
			return internalError(error);
		}
	}
	return badRequest(`unknown codex-auth endpoint ${JSON.stringify(endpoint)}`);
}
function badRequest(message) {
	return {
		ok: false,
		error: {
			code: "bad-request",
			message,
			details: { issues: [] }
		}
	};
}
function internalError(error) {
	return {
		ok: false,
		error: {
			code: "internal",
			message: error instanceof Error ? error.message : String(error),
			details: {}
		}
	};
}
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isLoginMode(value) {
	return value === "browser" || value === "device";
}
//#endregion
//#region src/index.ts
const name = "llm-codex-auth";
const inject = ["llm"];
const Config = z.object({
	llmEnabled: z.boolean().default(true),
	authJsonPath: z.string().default(""),
	credentialRef: z.string().default("CODEX_CHATGPT_TOKEN"),
	refreshLeadMs: z.number().min(0).default(DEFAULT_REFRESH_LEAD_MS),
	codexCommand: z.string().default("codex"),
	displayName: z.string().default("OpenAI Codex (chatgpt)"),
	longContextEnabled: z.boolean().default(false).volatile(),
	excludedModelIds: z.array(z.string()).default([]).volatile(),
	transport: z.union([
		z.const("auto"),
		z.const("sse"),
		z.const("websocket")
	]).default("sse"),
	websocketConnectTimeoutMs: z.natural().default(DEFAULT_WEBSOCKET_CONNECT_TIMEOUT_MS),
	timeoutMs: z.natural().default(DEFAULT_REQUEST_TIMEOUT_MS)
});
/** Mount the codex-auth adapter and service. */
function apply(ctx, config) {
	installForeignCheckpointProjection(ctx);
	installEnvHttpProxy((message) => {
		ctx.logger.warn(String(message));
	});
	const credentialReference = credentialRef(config.credentialRef);
	const authJsonPath = config.authJsonPath.length > 0 ? config.authJsonPath : defaultAuthJsonPath();
	const service = new CodexAuthService(ctx, {
		authJsonPath,
		codexCommand: config.codexCommand,
		credentialRef: credentialReference,
		refreshLeadMs: config.refreshLeadMs,
		fetchImpl: fetch
	});
	let accountMode = "enabled";
	ctx.inject(["commands"], (commandCtx) => {
		commandCtx.commands.register(createCodexAuthCommand(service, () => accountMode));
	});
	const currentSettings = () => ({
		longContextEnabled: liveValue(config.longContextEnabled),
		excludedModelIds: liveValue(config.excludedModelIds ?? [])
	});
	let announceModelPolicyChange = () => {};
	if (config.llmEnabled) {
		if (ctx.llm.listProviders().some((provider) => provider.id === "openai-codex")) throw new Error("dsh-codex-auth cannot own the \"openai-codex\" route because another plugin already registered it; dsh-codex-auth and dsh-codex are mutually exclusive, so uninstall or disable one bundle");
		const adapter = new CodexAuthAdapter(ctx, {
			auth: service,
			authJsonPath,
			credentialRef: credentialReference,
			refreshLeadMs: config.refreshLeadMs,
			fetchImpl: fetch,
			displayName: config.displayName,
			settings: () => currentSettings(),
			transport: config.transport,
			websocketConnectTimeoutMs: config.websocketConnectTimeoutMs,
			timeoutMs: config.timeoutMs
		});
		const registration = ctx.llm.registerAdapter([CODEX_ROUTE], adapter);
		announceModelPolicyChange = () => {
			adapter.replaceRouteGeneration();
			registration.replace([CODEX_ROUTE]);
		};
	}
	ctx.inject(["settings"], (settingsCtx) => {
		settingsCtx.effect(() => settingsCtx.settings.configure({ auto: false }, ctx.fiber));
	});
	ctx.on("loader/volatile-update", announceModelPolicyChange);
	ctx.inject(["connection"], (connectionCtx) => {
		const webServer = connectionCtx.get("webServer");
		accountMode = commandAccountMode(webServer);
		const guard = createLoopbackRpcGuard(webServer?.host, (endpoint, payload, signal) => handleCodexAuthRpc(service, endpoint, payload, signal));
		if (guard.mode === "blocked") connectionCtx.logger.warn("llm-codex-auth: account RPC is disabled because the WebServer is not loopback-bound");
		return registerAccountRoutes(connectionCtx.connection, CODEX_AUTH_RPC_NAMESPACE, [
			"status",
			"usage",
			"login"
		], guard.handler);
	});
	if (config.llmEnabled) ctx.logger.info("llm-codex-auth: route %s serving ChatGPT login from %s (transport %s, ws-connect %sms, request timeout %sms)", CODEX_ROUTE, authJsonPath, config.transport, config.websocketConnectTimeoutMs, config.timeoutMs);
	else ctx.logger.info("llm-codex-auth: shared Login State active at %s; LLM route disabled", authJsonPath);
}
//#endregion
export { Config, apply, inject, name };
