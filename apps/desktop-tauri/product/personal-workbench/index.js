// src/index.ts
import Schema3 from "@deepseek-ai/schemastery";

// src/capability-pack.ts
import { constants } from "node:fs";
import { access, chmod, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { delimiter, join, resolve } from "node:path";

// capability-packs.json
var capability_packs_default = {
  "dsh-harbor-evolution": {
    cli: {
      commands: [
        {
          name: "dsh-harbor",
          entry: "./bin/dsh-harbor.mjs",
          versionArgs: ["--version"]
        }
      ]
    },
    skills: ["./skills/evolve-agent-with-harbor"]
  }
};

// src/capability-pack.ts
var LEDGER_FILE = ".yourbuddy-capability-packs.json";
var SHIM_MARKER = "# yourbuddy-capability-pack:";
var COMMAND_NAME = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
function parseCapabilityPack(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return void 0;
  const record = value;
  if (record.cli === null || typeof record.cli !== "object" || Array.isArray(record.cli)) return void 0;
  const commands = record.cli.commands;
  if (!Array.isArray(commands) || !Array.isArray(record.skills)) return void 0;
  const parsed = [];
  for (const command of commands) {
    if (command === null || typeof command !== "object" || Array.isArray(command)) return void 0;
    const item = command;
    if (typeof item.name !== "string" || !COMMAND_NAME.test(item.name) || typeof item.entry !== "string" || !item.entry.startsWith("./") || !Array.isArray(item.versionArgs) || item.versionArgs.some((argument) => typeof argument !== "string")) return void 0;
    parsed.push({ name: item.name, entry: item.entry, versionArgs: item.versionArgs });
  }
  if (record.skills.some((skill) => typeof skill !== "string" || !skill.startsWith("./"))) return void 0;
  return { cli: { commands: parsed }, skills: record.skills };
}
function quote(value) {
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}
function shimBody(packageName, version, node, entry, versionArgs) {
  const versionCheck = versionArgs.length === 0 ? "" : `if [ "$#" -eq ${versionArgs.length} ]${versionArgs.map((argument, index) => ` && [ "$${index + 1}" = ${quote(argument)} ]`).join("")}; then
  printf '%s\\n' ${quote(`${packageName}@${version}`)}
  exit 0
fi
`;
  return `#!/bin/sh
${SHIM_MARKER}${packageName}
${versionCheck}exec ${quote(node)} ${quote(entry)} "$@"
`;
}
async function readableFile(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}
async function readableDirectory(path) {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}
async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}
async function readLedger(binDir) {
  try {
    const value = await readJson(join(binDir, LEDGER_FILE));
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      const ledger = value;
      if (ledger.formatVersion === 1 && ledger.commands !== null && typeof ledger.commands === "object" && !Array.isArray(ledger.commands) && Array.isArray(ledger.packs)) return value;
    }
  } catch {
  }
  return { formatVersion: 1, commands: {}, packs: [] };
}
async function writeJsonAtomic(path, value) {
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}
`, { mode: 384 });
  await rename(temporary, path);
}
async function externalCommand(command, binDir) {
  for (const directory of (process.env.PATH ?? "").split(delimiter)) {
    if (!directory || resolve(directory) === resolve(binDir)) continue;
    const candidate = join(directory, command);
    try {
      await access(candidate, constants.X_OK);
      return candidate;
    } catch {
    }
  }
  return void 0;
}
function packageDirectory(profileDir, packageName) {
  return join(profileDir, "node_modules", ...packageName.split("/"));
}
function registeredDeclaration(packageName) {
  return capability_packs_default[packageName];
}
async function synchronizeCapabilityPacks(profile, binDir, nodeBinary) {
  await mkdir(binDir, { recursive: true });
  const profileManifest = await readJson(join(profile.dir, "package.json"));
  const previous = await readLedger(binDir);
  const desiredOwners = {};
  const packs = [];
  for (const packageName of Object.keys(profileManifest.dependencies ?? {}).sort()) {
    const packageDir = packageDirectory(profile.dir, packageName);
    let manifest;
    try {
      manifest = await readJson(join(packageDir, "package.json"));
    } catch {
      continue;
    }
    const declaration = parseCapabilityPack(manifest.yourbuddy?.capabilityPack ?? registeredDeclaration(packageName));
    if (declaration === void 0 || typeof manifest.version !== "string") continue;
    const commands = [];
    for (const command of declaration.cli.commands) {
      const entry = resolve(packageDir, command.entry);
      if (!entry.startsWith(`${resolve(packageDir)}/`) || !await readableFile(entry)) {
        commands.push({ ...command, status: "missing", detail: entry });
        continue;
      }
      if (process.platform !== "darwin") {
        commands.push({ ...command, status: "unsupported", detail: process.platform });
        continue;
      }
      const claimed = desiredOwners[command.name];
      const external = await externalCommand(command.name, binDir);
      if (claimed !== void 0 && claimed.packageName !== packageName) {
        commands.push({ ...command, status: "conflict", detail: claimed.packageName });
        continue;
      }
      if (external !== void 0) {
        commands.push({ ...command, status: "conflict", detail: external });
        continue;
      }
      const destination = join(binDir, command.name);
      const temporary = `${destination}.${process.pid}.tmp`;
      await writeFile(temporary, shimBody(packageName, manifest.version, nodeBinary, entry, command.versionArgs), { mode: 493 });
      await chmod(temporary, 493);
      await rename(temporary, destination);
      desiredOwners[command.name] = { packageName, entry };
      commands.push({ ...command, status: "exposed" });
    }
    const skills = await Promise.all(declaration.skills.map(async (path) => ({
      path,
      status: await readableDirectory(resolve(packageDir, path)) ? "registered" : "missing"
    })));
    packs.push({
      packageName,
      version: manifest.version,
      commands,
      skills,
      ui: manifest.dsh?.client === void 0 ? "headless" : "loaded"
    });
  }
  for (const [command, owner] of Object.entries(previous.commands)) {
    if (desiredOwners[command] !== void 0) continue;
    const destination = join(binDir, command);
    try {
      const body = await readFile(destination, "utf8");
      if (body.includes(`${SHIM_MARKER}${owner.packageName}`)) await rm(destination);
    } catch {
    }
  }
  const ledger = { formatVersion: 1, commands: desiredOwners, packs };
  await writeJsonAtomic(join(binDir, LEDGER_FILE), ledger);
  return ledger;
}
function installCapabilityPackReconciler(ctx, profile) {
  const binDir = process.env.YOURBUDDY_BIN_DIR;
  const nodeBinary = process.env.YOURBUDDY_NODE_BINARY;
  if (!binDir || !nodeBinary) return;
  const sync = () => {
    void synchronizeCapabilityPacks(profile, binDir, nodeBinary).catch((error) => {
      ctx.logger.warn("Could not reconcile YourBuddy Capability Packs", error);
    });
  };
  sync();
  ctx.on("plugin-manager/changed", sync);
}
function createCapabilityPackRoute(binDir) {
  return {
    kind: "exact",
    path: "/api/yourbuddy/capability-packs",
    handler: async (request, response) => {
      if (request.method !== "GET") {
        response.writeHead(405, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
        response.end(JSON.stringify({ ok: false, error: "method-not-allowed" }));
        return;
      }
      const ledger = await readLedger(binDir);
      response.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      response.end(JSON.stringify({ ok: true, value: ledger.packs }));
    }
  };
}

// src/host-network-proxy.ts
import { proxyRouteFor } from "@deepseek-ai/dsh-http-proxy";
var HOST_NETWORK_PROXY_TEST_PATH = "/api/yourbuddy/network-proxy/test";
var CHATGPT_REACHABILITY_URL = "https://chatgpt.com/";
var HOST_PROXY_TEST_TIMEOUT_MS = 15e3;
function activePolicy(environment) {
  const proxyMode = ["inherit", "direct", "system", "custom"].includes(
    environment.YOURBUDDY_NETWORK_PROXY_MODE ?? ""
  ) ? environment.YOURBUDDY_NETWORK_PROXY_MODE : "unknown";
  const managedCaSource = environment.YOURBUDDY_NETWORK_CA_SOURCE;
  const caSource = ["system", "environment", "custom"].includes(managedCaSource ?? "") ? managedCaSource : environment.NODE_EXTRA_CA_CERTS ? "custom" : environment.NODE_OPTIONS?.split(/\s+/u).includes("--use-system-ca") === true ? "system" : "unknown";
  return { proxyMode, caSource };
}
function safeErrorCode(error) {
  let current = error;
  for (let depth = 0; depth < 5 && current !== void 0; depth += 1) {
    if (current !== null && typeof current === "object") {
      const value = current;
      if (typeof value.code === "string" && /^[A-Z0-9_]{1,64}$/.test(value.code)) {
        return value.code;
      }
      if (typeof value.name === "string" && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(value.name)) {
        if (value.name !== "Error" && value.name !== "TypeError") return value.name;
      }
      current = value.cause;
      continue;
    }
    break;
  }
  return "UNKNOWN";
}
async function testHostNetworkProxy(fetcher = globalThis.fetch, environment = process.env) {
  const { proxied } = proxyRouteFor(new URL(CHATGPT_REACHABILITY_URL));
  const policy = activePolicy(environment);
  try {
    const response = await fetcher(CHATGPT_REACHABILITY_URL, {
      signal: AbortSignal.timeout(HOST_PROXY_TEST_TIMEOUT_MS)
    });
    if (response.status === 407 || response.status >= 500) {
      return {
        ok: false,
        status: response.status,
        proxied,
        errorCode: `HTTP_${response.status}`,
        ...policy
      };
    }
    return { ok: true, status: response.status, proxied, errorCode: "", ...policy };
  } catch (error) {
    return { ok: false, status: 0, proxied, errorCode: safeErrorCode(error), ...policy };
  }
}
function writeJson(response, status, value) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(value));
}
function createHostNetworkProxyRoute(fetcher = globalThis.fetch, environment = process.env) {
  return {
    kind: "exact",
    path: HOST_NETWORK_PROXY_TEST_PATH,
    handler: async (request, response) => {
      if (request.method !== "POST") {
        writeJson(response, 405, { ok: false, error: "method-not-allowed" });
        return;
      }
      const mediaType = request.headers["content-type"]?.split(";", 1)[0]?.trim().toLowerCase();
      if (mediaType !== "application/json") {
        writeJson(response, 415, { ok: false, error: "application-json-required" });
        return;
      }
      const result = await testHostNetworkProxy(fetcher, environment);
      writeJson(response, 200, result);
    }
  };
}

// src/settings.ts
import Schema from "@deepseek-ai/schemastery";

// src/constants.ts
var WORKBENCH_SETTINGS_NAMESPACE = "personal-workbench";

// src/settings.ts
var WorkbenchSettingsSchema = Schema.object({
  enabled: Schema.boolean().default(false).volatile(),
  name: Schema.string().default("").volatile(),
  logo: Schema.string().default("").volatile(),
  heroHeadline: Schema.string().default("").volatile(),
  heroBadge: Schema.string().default("").volatile(),
  showHeroBadge: Schema.boolean().default(true).volatile()
});

// src/self-upgrade.ts
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import Schema2 from "@deepseek-ai/schemastery";
import { brandString } from "@deepseek-ai/dsh-brand";
import { defineTool } from "@deepseek-ai/dsh-tools";
import { isJsonValue } from "@deepseek-ai/dsh-util-values";
var UPGRADE_STATUS_PATH = "/api/yourbuddy/upgrade/status";
var UpgradePolicySchema = Schema2.object({
  receiptTimeoutMs: Schema2.number().step(1).min(1).default(3e4),
  statusRetryMs: Schema2.number().step(1).min(1).default(1e3)
}).default({ receiptTimeoutMs: 3e4, statusRetryMs: 1e3 });
function nativeCommand(installation) {
  return (arguments_, signal) => new Promise((resolve2, reject) => {
    signal.throwIfAborted();
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/KEY|SECRET|TOKEN|PASSWORD/iu.test(key)));
    const child = execFile(installation.executable, ["--yourbuddy-installer", ...arguments_], {
      env,
      encoding: "utf8",
      maxBuffer: 1024 * 1024
    }, (error, stdout, stderr) => {
      signal.removeEventListener("abort", cancel);
      if (signal.aborted) {
        reject(signal.reason);
        return;
      }
      if (error !== null) {
        reject(new Error(stderr.trim() || error.message));
        return;
      }
      try {
        const value = JSON.parse(stdout);
        if (!isJsonValue(value)) throw new Error("YourBuddy installer returned non-JSON output");
        resolve2(value);
      } catch (parseError) {
        reject(parseError);
      }
    });
    const cancel = () => {
      child.kill();
    };
    signal.addEventListener("abort", cancel, { once: true });
    if (signal.aborted) cancel();
  });
}
function operationRecord(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value) || typeof value.id !== "string" || typeof value.phase !== "string") {
    throw new Error("YourBuddy installer did not return an operation record");
  }
  return { id: brandString(value.id), phase: value.phase };
}
function isTerminal(phase) {
  return ["succeeded", "unchanged", "failed", "needsUserAction"].includes(phase);
}
function carriesReceipt(content, id) {
  return content.some((block) => {
    if (block.type !== "text") return false;
    let value;
    try {
      value = JSON.parse(block.text);
    } catch (_error) {
      return false;
    }
    if (value === null || typeof value !== "object" || !("status" in value) || value.status !== "accepted" || !("operation" in value) || value.operation === null || typeof value.operation !== "object") return false;
    return "id" in value.operation && value.operation.id === id;
  });
}
function installSelfUpgrade(ctx, installation, policy, command = nativeCommand(installation)) {
  const lifetime = new AbortController();
  const executions = /* @__PURE__ */ new Map();
  const commands = /* @__PURE__ */ new Set();
  let transaction;
  const logger = ctx.logger("yourbuddy-upgrade");
  const runCommand = (arguments_, signal) => {
    const pending = command(arguments_, arguments_.includes("--wait") ? signal : AbortSignal.any([signal, AbortSignal.timeout(policy.receiptTimeoutMs)]));
    commands.add(pending);
    return pending.finally(() => {
      commands.delete(pending);
    });
  };
  const busy = (initiator, token) => {
    const agents = ctx.agents.list();
    const ancestors = /* @__PURE__ */ new Set();
    let execution = executions.get(token);
    while (execution !== void 0) {
      ancestors.add(execution.token);
      execution = execution.parent === void 0 ? void 0 : executions.get(execution.parent);
    }
    return agents.some((agent) => agent !== initiator && agent.status === "running" || agent.inbox.nextTurn.length > 0 || agent.inbox.nextStep.length > 0) || [...executions.keys()].some((key) => !ancestors.has(key)) || [void 0, ...agents].some((agent) => ctx.jobs.list(agent?.id).some((job) => job.status === "running" || job.status === "stopping"));
  };
  const flush = async (session) => {
    if (!await ctx.sessions.flush(session)) throw new Error("YourBuddy upgrade requires durable Session storage");
  };
  ctx.on("connection/request", async (request, response, next) => {
    if (request.method === "GET" && new URL(request.url ?? "/", "http://localhost").pathname === UPGRADE_STATUS_PATH) {
      try {
        const result = await runCommand(["status", "--app", installation.app], lifetime.signal);
        if (transaction?.operation !== void 0) {
          const operation = operationRecord(result);
          if (operation.id === transaction.operation && isTerminal(operation.phase)) transaction = void 0;
        }
        response.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
        response.end(JSON.stringify(result));
      } catch (error) {
        response.writeHead(503, { "Content-Type": "application/json", "Cache-Control": "no-store" });
        response.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
      }
      return;
    }
    if (transaction === void 0) return next();
    response.writeHead(503, { "Retry-After": "5" });
    response.end("YourBuddy upgrade is restarting this application");
  });
  ctx.on("agent/pre-step", async (_payload, next) => transaction === void 0 ? next() : { kind: "reject" });
  ctx.on("tools/execute", async (exec, next) => {
    if (transaction !== void 0) throw new Error("YourBuddy upgrade is pending; new tool work is paused");
    executions.set(exec.token, exec);
    try {
      return await next();
    } finally {
      executions.delete(exec.token);
    }
  });
  ctx.on("session/event", (session, event) => {
    const pending = transaction;
    if (pending === void 0 || pending.agent.session !== session || pending.operation === void 0) return;
    if (event.type === "tool/result" && event.data.message.toolCallId === pending.rootCallId) {
      pending.resultRecorded = event.data.message.isError !== true;
      if (pending.callId === pending.rootCallId) pending.receiptRecorded = carriesReceipt(event.data.message.content, pending.operation);
    }
    if (event.type === "tool/ptc-dispatch" && event.data.subCallId === pending.callId) {
      pending.receiptRecorded = !event.data.isError && carriesReceipt(event.data.content, pending.operation);
    }
    if (event.type !== "turn/end" || pending.committing !== void 0) return;
    const id = pending.operation;
    pending.committing = (async () => {
      try {
        if (!pending.resultRecorded || !pending.receiptRecorded) throw new Error("The upgrade acceptance was not recorded as a successful tool result");
        await flush(session);
        if (busy(pending.agent, pending.token)) throw new Error("Other work arrived before the upgrade handoff");
        await runCommand(["handoff", "--operation", id], lifetime.signal);
      } catch (error) {
        if (lifetime.signal.aborted) return;
        logger.error("Session upgrade handoff failed: %s", error);
        try {
          await runCommand(["cancel", "--operation", id, "--reason", "session-handoff-not-committed"], lifetime.signal);
          if (transaction === pending) transaction = void 0;
          return;
        } catch (cancelError) {
          logger.error("Upgrade cancellation was not confirmed; awaiting the installer result: %s", cancelError);
        }
      }
      let reportedFailure = false;
      while (transaction === pending && !lifetime.signal.aborted) {
        try {
          const result = await runCommand(["status", "--operation", id, "--wait"], lifetime.signal);
          if (!isTerminal(operationRecord(result).phase)) throw new Error("YourBuddy installer status wait returned before settlement");
          if (transaction === pending) transaction = void 0;
        } catch (error) {
          if (lifetime.signal.aborted) return;
          if (!reportedFailure) logger.error("Upgrade status reader failed; retrying without permitting new work: %s", error);
          reportedFailure = true;
          await delay(policy.statusRetryMs, void 0, { signal: lifetime.signal });
        }
      }
    })().catch((error) => {
      if (!lifetime.signal.aborted) logger.error("Upgrade status is unavailable; inspect the saved installer operation: %s", error);
    });
  });
  ctx.effect(() => async () => {
    lifetime.abort(new Error("YourBuddy upgrade plugin stopped"));
    await transaction?.committing;
    await Promise.allSettled(commands);
  });
  ctx.effect(() => ctx.tools.register(defineTool({
    name: "yourbuddy_upgrade",
    description: "Upgrade this running YourBuddy application to the latest release or a specified version. Requires every other task and background job to be idle. Saves this conversation before restarting. Returns an accepted operation, not completed installation. Ends this turn; previous tools are never replayed automatically. Use yourbuddy_upgrade_status after restart to read the final result.",
    parameters: { version: { type: "string", description: "latest or an exact release version; defaults to latest." } },
    output: {
      schema: { type: "json" },
      render: (_args, value) => [{ type: "text", text: JSON.stringify(value) }],
      presentationMeta: (_args, value) => value
    },
    presentCall: (args) => ({ card: "generic", title: "yourbuddy_upgrade", input: args.version ?? "latest" }),
    async execute(args, exec) {
      const agent = exec.agent;
      if (agent === void 0) throw new Error("YourBuddy upgrade requires a current Session");
      if (transaction !== void 0 || busy(agent, exec.token)) throw new Error("Other tasks are active; wait until they finish before upgrading YourBuddy");
      const pending = { agent, rootCallId: exec.rootCallId, callId: exec.callId, token: exec.token, resultRecorded: false, receiptRecorded: false };
      transaction = pending;
      try {
        await flush(agent.session);
        exec.signal.throwIfAborted();
        if (busy(agent, exec.token)) throw new Error("Other tasks became active before the upgrade request was saved");
        const requestId = createHash("sha256").update(JSON.stringify([agent.id, exec.callId])).digest("hex");
        const result = await runCommand([
          "install",
          "--app",
          installation.app,
          "--version",
          args.version ?? "latest",
          "--request-id",
          requestId,
          "--session-id",
          agent.id,
          "--defer-stop"
        ], AbortSignal.any([exec.signal, lifetime.signal]));
        const operation = operationRecord(result);
        if (isTerminal(operation.phase)) {
          transaction = void 0;
          return { status: ["succeeded", "unchanged"].includes(operation.phase) ? "no-change" : operation.phase, operation: result };
        }
        pending.operation = operation.id;
        exec.concludeTurn();
        return { status: "accepted", operation: result, statusPath: UPGRADE_STATUS_PATH, continuation: "No previous tool is automatically rerun." };
      } catch (error) {
        if (transaction === pending) transaction = void 0;
        throw error;
      }
    }
  })));
  ctx.effect(() => ctx.tools.register(defineTool({
    name: "yourbuddy_upgrade_status",
    description: "Read a saved YourBuddy upgrade operation. Succeeded means the target version and its Host and workbench are ready; accepted does not mean completed.",
    parameters: { operation_id: { type: "string", description: "Operation ID returned by yourbuddy_upgrade; omit for this application\u2019s latest operation." } },
    output: { schema: { type: "json" }, render: (_args, value) => [{ type: "text", text: JSON.stringify(value) }] },
    presentCall: (args) => ({ card: "generic", title: "yourbuddy_upgrade_status", input: args.operation_id ?? installation.app }),
    execute: (args, exec) => runCommand(args.operation_id === void 0 ? ["status", "--app", installation.app] : ["status", "--operation", args.operation_id], AbortSignal.any([exec.signal, lifetime.signal]))
  })));
}

// src/index.ts
var name = "personal-workbench";
var Config = Schema3.object({ ...WorkbenchSettingsSchema.dict, upgrade: UpgradePolicySchema });
function apply(ctx, config) {
  const executable = process.env.YOURBUDDY_DESKTOP_EXECUTABLE;
  const app = process.env.YOURBUDDY_DESKTOP_APP;
  if (executable !== void 0 && app !== void 0) {
    ctx.inject(["agents", "tools", "sessions", "sessionPersistence", "jobs"], (upgradeCtx) => {
      installSelfUpgrade(upgradeCtx, { executable, app }, config.upgrade);
    });
  }
  const profile = ctx.get("profileContext");
  if (profile !== void 0) installCapabilityPackReconciler(ctx, profile);
  ctx.inject(["webServer"], (webCtx) => {
    webCtx.effect(
      () => webCtx.webServer.register(createHostNetworkProxyRoute()),
      "personal-workbench: Host network proxy diagnostic"
    );
    const binDir = process.env.YOURBUDDY_BIN_DIR;
    if (binDir !== void 0) {
      webCtx.effect(
        () => webCtx.webServer.register(createCapabilityPackRoute(binDir)),
        "personal-workbench: Capability Pack diagnostics"
      );
    }
  });
}
export {
  Config,
  WORKBENCH_SETTINGS_NAMESPACE,
  WorkbenchSettingsSchema,
  apply,
  name
};
