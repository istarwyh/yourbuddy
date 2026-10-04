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
var HOST_NETWORK_PROXY_TEST_PATH = "/api/yourbuddy/network-proxy/test";
var CHATGPT_REACHABILITY_URL = "https://chatgpt.com/";
var HOST_PROXY_TEST_TIMEOUT_MS = 15e3;
var ENVIRONMENT_PROXY_DISPATCHER_MARK = /* @__PURE__ */ Symbol.for(
  "@deepseek-ai/dsh.environment-proxy-dispatcher"
);
function hasProxyEnvironment(environment) {
  return [
    environment.https_proxy,
    environment.HTTPS_PROXY,
    environment.http_proxy,
    environment.HTTP_PROXY
  ].some((value) => value !== void 0 && value.length > 0);
}
function hasEnvironmentProxyDispatcher() {
  return Reflect.get(globalThis, ENVIRONMENT_PROXY_DISPATCHER_MARK) === true;
}
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
async function testHostNetworkProxy(fetcher = globalThis.fetch, environment = process.env, dispatcherInstalled = hasEnvironmentProxyDispatcher()) {
  const proxyConfigured = hasProxyEnvironment(environment);
  const proxied = proxyConfigured && dispatcherInstalled;
  const policy = activePolicy(environment);
  if (proxyConfigured && !dispatcherInstalled) {
    return {
      ok: false,
      status: 0,
      proxied,
      errorCode: "ENV_PROXY_DISPATCHER_MISSING",
      ...policy
    };
  }
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
function createHostNetworkProxyRoute(fetcher = globalThis.fetch, environment = process.env, dispatcherInstalled = hasEnvironmentProxyDispatcher()) {
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
      const result = await testHostNetworkProxy(fetcher, environment, dispatcherInstalled);
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

// src/index.ts
var name = "personal-workbench";
var Config = WorkbenchSettingsSchema;
function apply(ctx) {
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
