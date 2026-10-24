/** Verify the prepared YourBuddy product graph through its installed runtime and Web Host. */
import { createHash } from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, dirname, isAbsolute, join, relative, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

import {
  assertBundledProductPeerLinks,
  isBundledRuntimePackage,
  readWorkspacePackageVersions,
} from './product-plugin-compatibility.mjs'
import { removeWorkspaceInstallState } from './prepare-harness-offline-store.mjs'
import { verifyWorkbenchBranding } from './workbench-branding-smoke.mjs'
import { redactEvidence } from './smoke-offline-startup-macos.mjs'

const desktopRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const harnessRoot = join(desktopRoot, 'bundled', 'harness')
const runtimeRoot = join(desktopRoot, 'bundled', 'yourbuddy-runtime')
const installedChromiumExecutable = process.env.YOURBUDDY_RELEASE_CHROMIUM_EXECUTABLE ?? chromium.executablePath()
const desktopShellSource = readFileSync(join(desktopRoot, 'shell.html'), 'utf8')
const desktopI18nSource = readFileSync(join(desktopRoot, 'desktop-i18n.js'), 'utf8')
const desktopAppIcon = readFileSync(join(desktopRoot, 'app-icon.png'))
const desktopUpdateSmokeResult = 'Development build smoke does not check desktop updates'
const creatorPublishSmokeTitle = '发布验收样例'
const desktopProxySystemSettings = {
  version: 1,
  mode: 'system',
  httpProxy: '',
  httpsProxy: '',
  noProxy: '',
  caCertificatePath: '/Users/example/company-root.pem',
}
const desktopProxySnapshot = {
  settings: { ...desktopProxySystemSettings, mode: 'direct', caCertificatePath: '' },
  system: {
    supported: true,
    configured: true,
    httpProxy: 'http://127.0.0.1:7890',
    httpsProxy: 'http://127.0.0.1:7890',
    noProxy: 'localhost,127.0.0.1,::1,*.local',
    autoConfigUrl: '',
    error: '',
  },
  effective: {
    mode: 'direct',
    httpProxy: '',
    httpsProxy: '',
    noProxy: 'localhost,127.0.0.1,::1',
    caCertificatePath: '',
    caSource: 'system',
  },
  effectiveError: '',
}
const missingMarketplaceRepository = 'missing-npm-package'
const validMarketplaceRepository = 'verified-plugin-repository'
const validMarketplacePackage = '@yourbuddy-test/verified-plugin'
const missingMarketplacePackage = '@yourbuddy-test/repository-sdk'
const validMarketplaceNonPluginPackage = '@yourbuddy-test/verified-sdk'
const desktopExternalLinkSmokeUrl = 'https://github.com/gitroomhq/postiz-app'
const desktopBetterSidebarPluginUrl = 'https://github.com/HuanLinOTO/dsh-plugin-better-sidebar-plugin-office'
const syntheticInstallFailure = 'synthetic install failure'
const syntheticHostProxy = 'http://127.0.0.1:9'

/** Product Client packages that must execute during the assembled Web smoke. */
export const PRODUCT_CLIENT_IDS = [
  'dsh-codex-auth',
  'dsh-better-sidebar',
  'dsh-ego-browser',
  'dsh-context-doctor',
  'dsh-plugin-marketplace',
  'dsh-personal-workbench',
  '@xiaohui-wang/dsh-pomodoro',
  'dsh-oil-creator',
  'dsh-harbor-evolution',
]

/** Product Clients available before any optional component is installed. */
export const CORE_PRODUCT_CLIENT_IDS = [
  'dsh-codex-auth',
  'dsh-better-sidebar',
  'dsh-ego-browser',
  'dsh-context-doctor',
  'dsh-plugin-marketplace',
  'dsh-personal-workbench',
  '@xiaohui-wang/dsh-pomodoro',
  'dsh-oil-creator',
]

/** Required optional packages; missing artifacts never reduce release coverage. */
export const RELEASE_CAPABILITIES = [
  { key: 'harborPlugin', packageName: 'dsh-harbor-evolution', requires: ['harbor'] },
]

const LIGHTWEIGHT_CLIENT_ENTRIES = {
  '@deepseek-ai/dsh-client-ui-sidebar-browser': 'ui-sidebar-browser',
  '@deepseek-ai/dsh-client-ui-sidebar-documentpreview': 'ui-sidebar-documentpreview',
}

const PRODUCT_CLIENT_ENTRY_IDS = {
  'dsh-codex-auth': 'llm-codex-auth',
  'dsh-better-sidebar': 'better-sidebar',
  'dsh-ego-browser': 'ego-browser',
  'dsh-context-doctor': 'context-doctor',
  'dsh-plugin-marketplace': 'plugin-marketplace',
  'dsh-personal-workbench': 'personal-workbench',
  '@xiaohui-wang/dsh-pomodoro': 'dsh-pomodoro',
  'dsh-oil-creator': 'dsh-oil-creator',
  'dsh-harbor-evolution': 'harbor-evolution',
}

/**
 * Record product Client artifacts from individual or DSH combo resource URLs.
 * @param {Record<string, number>} target
 * @param {string} responseUrl
 * @param {number} status
 */
export function recordProductClientResponse(target, responseUrl, status) {
  const url = new URL(responseUrl)
  const resource = `${url.pathname}${url.search}`
  for (const [id, entryId] of Object.entries({ ...PRODUCT_CLIENT_ENTRY_IDS, ...LIGHTWEIGHT_CLIENT_ENTRIES })) {
    if (resource.includes(`${id}/client.js`) || resource.includes(`${entryId}/client.js`)) {
      target[id] = status
    }
  }
}

/**
 * Validate the GPT Auth status response returned through its dedicated Connection channel.
 * @param {{ status: number, body: unknown }} probe
 * @returns {void}
 */
export function assertCodexAuthStatusProbe(probe) {
  if (probe.status !== 200) {
    throw new Error(`GPT Auth status RPC returned HTTP ${probe.status}`)
  }
  const response = probe.body
  if (response === null || typeof response !== 'object' || Array.isArray(response)) {
    throw new Error('GPT Auth status RPC returned a non-object response')
  }
  const result = response.result
  const status = result?.value?.status
  if (response.type !== 'server-response'
    || response.rpcId !== 'yourbuddy-release-codex-auth-status'
    || result?.ok !== true
    || status === null
    || typeof status !== 'object'
    || typeof status.available !== 'boolean'
    || typeof status.configured !== 'boolean') {
    throw new Error(`GPT Auth status RPC returned an invalid response: ${JSON.stringify(response)}`)
  }
}

/**
 * Validate Codex discovery through the Session-independent Host model catalog.
 * @param {{ status: number, body: unknown }} probe
 * @returns {void}
 */
export function assertCodexModelCatalogProbe(probe) {
  if (probe.status !== 200) {
    throw new Error(`Codex model catalog RPC returned HTTP ${probe.status}`)
  }
  const response = probe.body
  const catalog = response?.result?.value
  const group = Array.isArray(catalog?.groups)
    ? catalog.groups.find(candidate => candidate?.id === 'openai-codex')
    : undefined
  const model = Array.isArray(group?.models)
    ? group.models.find(candidate => candidate?.id === 'gpt-5.6-sol')
    : undefined
  const failed = Array.isArray(catalog?.failures)
    && catalog.failures.some(candidate => candidate?.id === 'openai-codex')
  if (response?.type !== 'server-response'
    || response.rpcId !== 'yourbuddy-release-codex-model-catalog'
    || response.result?.ok !== true
    || group?.name !== 'OpenAI Codex (chatgpt)'
    || model?.name !== 'GPT-5.6 Sol'
    || failed) {
    throw new Error(`Codex model catalog RPC returned an invalid response: ${JSON.stringify(response)}`)
  }
}

/**
 * Build the isolated environment used to execute unreviewed release candidates.
 *
 * @param {string} root
 * @param {string} productRuntimeRoot
 * @param {NodeJS.ProcessEnv} parentEnvironment
 * @returns {NodeJS.ProcessEnv}
 */
export function createReleaseChildEnvironment(
  root,
  productRuntimeRoot,
  parentEnvironment = process.env,
) {
  const home = join(root, 'home')
  const temporary = join(root, 'tmp')
  const directories = {
    HOME: home,
    USERPROFILE: home,
    XDG_CACHE_HOME: join(home, '.cache'),
    XDG_CONFIG_HOME: join(home, '.config'),
    XDG_DATA_HOME: join(home, '.local', 'share'),
    XDG_STATE_HOME: join(home, '.local', 'state'),
    APPDATA: join(home, 'AppData', 'Roaming'),
    LOCALAPPDATA: join(home, 'AppData', 'Local'),
    TMPDIR: temporary,
    TMP: temporary,
    TEMP: temporary,
    UV_CACHE_DIR: join(root, 'uv-cache'),
    DSH_HOME: join(root, 'dsh-home'),
    DSH_AGENTS_HOME: join(root, 'agents'),
  }
  for (const directory of new Set(Object.values(directories))) mkdirSync(directory, { recursive: true })

  const inherited = {}
  for (const name of ['LANG', 'LC_ALL', 'LC_CTYPE', 'SystemRoot', 'WINDIR', 'COMSPEC', 'PATHEXT']) {
    if (parentEnvironment[name] !== undefined) inherited[name] = parentEnvironment[name]
  }
  const runtimeBin = join(productRuntimeRoot, 'venv', process.platform === 'win32' ? 'Scripts' : 'bin')
  const systemPath = process.platform === 'win32'
    ? [
        dirname(process.execPath),
        runtimeBin,
        ...(parentEnvironment.SystemRoot ? [join(parentEnvironment.SystemRoot, 'System32')] : []),
      ]
    : [dirname(process.execPath), runtimeBin, '/usr/bin', '/bin', '/usr/sbin', '/sbin']
  return {
    ...inherited,
    ...directories,
    PATH: [...new Set(systemPath)].join(delimiter),
    DEEPSEEK_API_KEY: 'yourbuddy-release-smoke-no-model-call',
    PYTHONUTF8: '1',
  }
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', ...options })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} failed with exit ${result.status ?? 'unknown'}\n${result.stdout ?? ''}${result.stderr ?? ''}`,
    )
  }
  return result.stdout ?? ''
}

/**
 * Require a package from one product plugin and verify its entry is inside the expected workspace package.
 *
 * @param {string} pluginRoot
 * @param {string} pluginName
 * @param {string} packageName
 * @param {string} expectedRoot
 */
export function assertResolvedWorkspacePackage(pluginRoot, pluginName, packageName, expectedRoot) {
  let resolved
  try {
    resolved = createRequire(join(pluginRoot, 'package.json')).resolve(packageName)
  }
  catch (error) {
    throw new Error(`${pluginName} did not resolve bundled peer ${packageName}`, { cause: error })
  }
  const actualEntry = realpathSync(resolved)
  const expectedPackageRoot = realpathSync(expectedRoot)
  const pathFromExpectedRoot = relative(expectedPackageRoot, actualEntry)
  if (isAbsolute(pathFromExpectedRoot)
    || pathFromExpectedRoot === '..'
    || pathFromExpectedRoot.startsWith(`..${sep}`)) {
    throw new Error(`${pluginName} installed a second ${packageName}: ${actualEntry}`)
  }
}

/**
 * Verify installed product peers resolve to the same workspace packages as the Host.
 *
 * @param {string} root
 * @returns {number}
 */
export function assertInstalledProductPeerLinks(root) {
  const workspace = readWorkspacePackageVersions(root)
  const productRoot = join(root, 'packages', 'product')
  let checked = 0
  for (const plugin of ['dsh-codex-auth', 'dsh-better-sidebar', 'ego-browser', 'context-doctor', 'plugin-marketplace', 'personal-workbench', 'pomodoro', 'oil-creator']) {
    const pluginRoot = join(productRoot, plugin)
    const manifest = JSON.parse(readFileSync(join(pluginRoot, 'package.json'), 'utf8'))
    for (const name of Object.keys(manifest.peerDependencies ?? {})) {
      if (!isBundledRuntimePackage(name)) continue
      const expected = workspace.get(name)
      if (!expected) throw new Error(`${manifest.name} has no bundled workspace target for ${name}`)
      assertResolvedWorkspacePackage(pluginRoot, manifest.name, name, expected.root)
      checked += 1
    }
  }
  if (checked === 0) throw new Error('no installed YourBuddy product peer links were checked')
  return checked
}

/**
 * Require exactly the core product packages in the prepared Harness.
 * @param {string} root Prepared Harness directory.
 * @returns {void}
 */
export function assertCoreProductComposition(root) {
  const productRoot = join(root, 'packages', 'product')
  const names = readdirSync(productRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => JSON.parse(readFileSync(join(productRoot, entry.name, 'package.json'), 'utf8')).name)
  if (JSON.stringify(names.sort()) !== JSON.stringify([...CORE_PRODUCT_CLIENT_IDS].sort())) {
    throw new Error(`core product package roster differs: ${JSON.stringify(names)}`)
  }
}

/**
 * Resolve the prepared Harbor package input and reject missing entries or private runtime copies.
 * This checks prepared payloads; it does not replace signed component admission.
 * @param {object[]} capabilities Actual prepareCapabilityComponents results.
 * @returns {object[]} Complete inputs in release dependency order.
 */
export function readReleaseCapabilities(capabilities) {
  if (capabilities.length !== RELEASE_CAPABILITIES.length) throw new Error('release requires the prepared Harbor capability')
  return RELEASE_CAPABILITIES.map(expected => {
    const matches = capabilities.filter(entry => entry.key === expected.key)
    if (matches.length !== 1) throw new Error(`release capability is missing or duplicated: ${expected.key}`)
    const entry = matches[0]
    if (entry.packageName !== expected.packageName
      || JSON.stringify(entry.requires ?? []) !== JSON.stringify(expected.requires ?? [])) {
      throw new Error(`release capability descriptor differs: ${expected.key}`)
    }
    const manifest = JSON.parse(readFileSync(join(entry.root, 'package.json'), 'utf8'))
    if (manifest.name !== expected.packageName || manifest.version !== entry.version) {
      throw new Error(`release capability package identity differs: ${expected.key}`)
    }
    for (const file of [manifest.main, manifest.dsh?.bundle?.patch, 'lib/client.js']) {
      if (typeof file !== 'string' || !existsSync(join(entry.root, file))) {
        throw new Error(`release capability entry is missing: ${expected.key}/${file}`)
      }
    }
    const modules = join(entry.root, 'node_modules')
    for (const name of Object.keys(manifest.dependencies ?? {})) {
      if (!existsSync(join(modules, name, 'package.json'))) throw new Error(`release capability dependency is missing: ${expected.key}/${name}`)
    }
    const visit = current => {
      for (const item of readdirSync(current, { withFileTypes: true })) {
        const path = join(current, item.name)
        if (item.isSymbolicLink()) throw new Error(`release capability contains an unmaterialized link: ${path}`)
        if (item.isDirectory()) visit(path)
        else if (item.name === 'package.json') {
          const name = JSON.parse(readFileSync(path, 'utf8')).name ?? ''
          if (isBundledRuntimePackage(name) || name === 'react' || name === 'react-dom') {
            throw new Error(`release capability contains a private core peer: ${name}`)
          }
        }
      }
    }
    if (existsSync(modules)) visit(modules)
    return entry
  })
}

/**
 * Verify the prepared Python interpreter and both Harbor commands before Node activation.
 * @param {string} root Prepared Harbor runtime.
 * @param {string} version Installed Harbor Node version.
 * @param {string} cwd Isolated command directory.
 * @param {NodeJS.ProcessEnv} env Isolated child environment.
 * @returns {void}
 */
export function assertHarborPythonReady(root, version, cwd, env) {
  const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'))
  if (manifest.integrationVersion !== version || manifest.platform !== process.platform || manifest.arch !== process.arch) {
    throw new Error('Harbor Python runtime does not match this platform and Node capability version')
  }
  const bin = join(root, 'venv', 'bin')
  const actual = run(join(bin, 'python'), ['-c',
    'import importlib.metadata; import harbor; import harbor_dsh_evolution; print(importlib.metadata.version("harbor-dsh-evolution"))',
  ], { cwd, env }).trim()
  if (actual !== version) throw new Error(`Harbor Python package version differs: ${actual}`)
  for (const [command, args] of [['harbor', ['--version']], ['harbor-dsh', ['--help']]]) {
    if (run(join(bin, command), args, { cwd, env }).trim() === '') throw new Error(`Harbor Python command returned no readiness output: ${command}`)
  }
  console.log(`verify-product-release: Harbor Python ${actual} interpreter and commands ready`)
}

/**
 * Build a diagnostic that runs inside the real Profile resolution hook.
 * @param {string} root Prepared Harness.
 * @param {object[]} capabilities Actually installed optional packages.
 * @returns {string} Diagnostic plugin declarations.
 */
export function buildCapabilityPeerProbe(root, capabilities) {
  const workspace = readWorkspacePackageVersions(root)
  const inputs = capabilities.map(entry => {
    const manifest = JSON.parse(readFileSync(join(entry.root, 'package.json'), 'utf8'))
    const peers = Object.keys(manifest.peerDependencies ?? {}).map(name => {
      const target = workspace.get(name)
      if (!target && isBundledRuntimePackage(name)) throw new Error(`capability has no core peer target: ${name}`)
      if (target && manifest.peerDependencies[name] !== target.version) throw new Error(`capability core peer is not pinned: ${entry.key}/${name}`)
      return { name, root: target?.root }
    })
    return { root: entry.root, packageName: entry.packageName, peers, dependencies: Object.keys(manifest.dependencies ?? {}) }
  })
  return `import { realpathSync } from 'node:fs'
import { join, relative, isAbsolute, sep } from 'node:path'
${assertResolvedWorkspacePackage.toString()}
function verifyCapabilityPeers() {
  let checked = 0
  for (const entry of ${JSON.stringify(inputs)}) {
    const plugin = createRequire(join(entry.root, 'package.json'))
    for (const peer of entry.peers) {
      if (peer.root) assertResolvedWorkspacePackage(entry.root, entry.packageName, peer.name, peer.root)
      else if (realpathSync(plugin.resolve(peer.name)) !== realpathSync(require.resolve(peer.name))) {
        throw new Error(entry.packageName + ' installed a second core peer: ' + peer.name)
      }
      checked += 1
    }
    for (const name of entry.dependencies) {
      assertResolvedWorkspacePackage(entry.root, entry.packageName, name, join(entry.root, 'node_modules', name))
    }
  }
  if (${inputs.length} > 0 && checked === 0) throw new Error('no installed capability peers were checked')
  console.log('verify-product-release: active Profile capability peer links=' + checked)
}
`
}

function installReleaseCapabilities(root, productRuntimeRoot, capabilities, world, env) {
  const harbor = capabilities.find(entry => entry.key === 'harborPlugin')
  assertHarborPythonReady(productRuntimeRoot, harbor.version, world, env)
  const pnpm = join(desktopRoot, '..', '..', 'node_modules', 'pnpm', 'bin', 'pnpm.mjs')
  if (run(process.execPath, [pnpm, '--version'], { cwd: world, env }).trim() !== '11.7.0') {
    throw new Error('release capability installation requires pnpm 11.7.0')
  }
  const bin = join(world, 'bin')
  mkdirSync(bin)
  const quote = value => `'${value.replaceAll("'", "'\\''")}'`
  writeFileSync(join(bin, 'pnpm'), `#!/bin/sh
exec ${quote(process.execPath)} ${quote(pnpm)} --pm-on-fail=ignore "$@"
`, { mode: 0o700 })
  const installEnv = { ...env, PATH: `${bin}${delimiter}${env.PATH}`, CI: 'true' }
  for (const entry of capabilities) {
    const output = run(process.execPath, [join(root, 'apps', 'cli', 'lib', 'bin.js'),
      'plugin', '--profile', 'web', 'add', '--offline', '--ignore-scripts',
      `--rollback-package=${entry.packageName}`, '--rollback-expected={"dependency":null,"link":null}',
      `link:${entry.root}`,
    ], { cwd: world, env: installEnv, timeout: 660_000 })
    console.log(`verify-product-release: Profile installed ${entry.packageName}@${entry.version}\n${output}`)
  }
  const profile = join(env.DSH_HOME, 'profiles', 'web')
  const manifest = JSON.parse(readFileSync(join(profile, 'package.json'), 'utf8'))
  for (const entry of capabilities) {
    if (!manifest.dsh?.profile?.bundles?.includes(entry.packageName)
      || realpathSync(join(profile, 'node_modules', entry.packageName)) !== realpathSync(entry.root)) {
      throw new Error(`Profile did not install and activate the prepared capability: ${entry.key}`)
    }
  }
}

/**
 * Restrict the smoke overlay to local diagnostics and installed Harbor paths.
 * Product rows, preset defaults, and lightweight services come from shipped bundles.
 * @param {string} workspace Isolated working directory.
 * @param {string} productRuntimeRoot Prepared Harbor Python directory.
 * @param {string} proxyVerifier Diagnostic plugin path.
 * @param {'core' | 'installed'} phase Selected product graph.
 * @returns {string} Loader patch.
 */
export function buildProductSmokeOverlay(workspace, productRuntimeRoot, proxyVerifier, phase = 'core') {
  const harbor = phase === 'installed' ? `- id: harbor-evolution
  config:
    projectRoot: ${JSON.stringify(workspace)}
    jobsDir: "jobs"
    harborBin: ${JSON.stringify(join(productRuntimeRoot, 'venv', 'bin', 'harbor'))}
    harborDshBin: ${JSON.stringify(join(productRuntimeRoot, 'venv', 'bin', 'harbor-dsh'))}
    pythonPath: ""

` : ''
  return `${harbor}- insert:
    - id: yourbuddy-release-proxy-verifier
      name: ${JSON.stringify(proxyVerifier)}
`
}

/**
 * Observe a child close without collapsing its exit code, signal, and timeout.
 *
 * @param {import('node:child_process').ChildProcess} child
 * @param {number} milliseconds
 * @returns {Promise<{code: number | null, signal: NodeJS.Signals | null, timedOut: boolean}>}
 */
export function waitForClose(child, milliseconds) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve({ code: child.exitCode, signal: child.signalCode, timedOut: false })
  }
  return new Promise(resolveClose => {
    const onClose = (code, signal) => {
      clearTimeout(timer)
      resolveClose({ code, signal, timedOut: false })
    }
    const timer = setTimeout(() => {
      child.off('close', onClose)
      resolveClose({ code: child.exitCode, signal: child.signalCode, timedOut: true })
    }, milliseconds)
    child.once('close', onClose)
  })
}

/**
 * Request graceful Host shutdown, escalating once while preserving the outcome.
 *
 * @param {import('node:child_process').ChildProcess} child
 * @param {{gracefulMilliseconds?: number, forcedMilliseconds?: number}} options
 * @returns {Promise<{code: number | null, signal: NodeJS.Signals | null, timedOut: boolean, forced: boolean}>}
 */
export async function stopChild(child, options = {}) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return { code: child.exitCode, signal: child.signalCode, timedOut: false, forced: false }
  }
  child.kill('SIGTERM')
  const graceful = await waitForClose(child, options.gracefulMilliseconds ?? 10_000)
  if (!graceful.timedOut) return { ...graceful, forced: false }
  if (child.exitCode !== null || child.signalCode !== null) {
    return {
      code: child.exitCode,
      signal: child.signalCode,
      timedOut: true,
      forced: false,
    }
  }
  child.kill('SIGKILL')
  const forced = await waitForClose(child, options.forcedMilliseconds ?? 10_000)
  return { ...forced, timedOut: true, forced: true }
}

/**
 * Reject any Host teardown other than a normal code-zero process exit.
 *
 * @param {{code: number | null, signal: NodeJS.Signals | null, timedOut: boolean, forced: boolean}} outcome
 * @param {string} stdout
 * @param {string} stderr
 */
export function assertCleanChildExit(outcome, stdout = '', stderr = '') {
  if (!outcome.timedOut && !outcome.forced && outcome.code === 0 && outcome.signal === null) return
  const status = [
    `code=${outcome.code ?? 'null'}`,
    `signal=${outcome.signal ?? 'null'}`,
    `timedOut=${String(outcome.timedOut)}`,
    `forced=${String(outcome.forced)}`,
  ].join(', ')
  throw new Error(`YourBuddy product Host did not dispose cleanly (${status})\nstdout:\n${stdout}\nstderr:\n${stderr}`)
}

async function fetchOk(url, init = {}) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(15_000) })
  if (!response.ok) throw new Error(`release smoke request failed: ${url} returned ${response.status}`)
  return response
}

/**
 * Exchange the one-time URL printed by `dsh web` for its authority-bound browser cookie.
 * @param {string} launchUrl
 * @returns {Promise<{baseUrl: string, cookie: string}>}
 */
export async function authenticateHost(launchUrl) {
  const response = await fetch(launchUrl, {
    redirect: 'manual',
    signal: AbortSignal.timeout(15_000),
  })
  if (response.status !== 303 || response.headers.get('location') !== './') {
    throw new Error(`release smoke Host authentication returned ${response.status}`)
  }
  const setCookie = response.headers.get('set-cookie')
  if (setCookie === null) throw new Error('release smoke Host authentication did not issue a cookie')
  return {
    baseUrl: new URL(launchUrl).origin,
    cookie: setCookie.split(';', 1)[0],
  }
}

/**
 * Project the Host's authority cookie into the same-site desktop WebView form.
 * @param {string} launchUrl
 * @param {string} cookiePair
 * @returns {{name: string, value: string, domain: string, path: string, httpOnly: true, secure: false, sameSite: 'Strict'}}
 */
export function desktopWebviewCookie(launchUrl, cookiePair) {
  const url = new URL(launchUrl)
  const separator = cookiePair.indexOf('=')
  const name = cookiePair.slice(0, separator)
  const value = cookiePair.slice(separator + 1)
  const suffix = name.startsWith('dsh-auth-') ? name.slice('dsh-auth-'.length) : ''
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.port === ''
    || url.pathname !== '/' || url.searchParams.size !== 1 || !url.searchParams.has('token')
    || separator <= 0 || suffix.length !== 43 || !/^[A-Za-z0-9_-]+$/u.test(suffix)
    || value === '' || value.length > 4096) {
    throw new Error('release smoke received an invalid desktop Host authentication result')
  }
  return {
    name,
    value,
    domain: url.hostname,
    path: '/',
    httpOnly: true,
    secure: false,
    sameSite: 'Strict',
  }
}

/**
 * Reject an assembled page that did not execute every product Client cleanly.
 *
 * @param {{
 *   clientResponses: Record<string, number>,
 *   pageErrors: string[],
 *   consoleErrors: string[],
 *   bootFailureCount: number,
 *   frameCount: number,
 * }} result
 * @param {'core' | 'installed'} phase Expected installed product graph.
 */
export function assertProductClientBoot(result, phase = 'installed') {
  const failures = []
  if (result.bootFailureCount > 0) failures.push('the Web boot page reported a plugin activation failure')
  if (result.frameCount === 0) failures.push('the assembled Web application frame never mounted')
  const expected = phase === 'core' ? CORE_PRODUCT_CLIENT_IDS : PRODUCT_CLIENT_IDS
  for (const id of [...expected, ...Object.keys(LIGHTWEIGHT_CLIENT_ENTRIES)]) {
    const status = result.clientResponses[id]
    if (status === undefined) failures.push(`${id} Client bundle was not requested`)
    else if (status !== 200) failures.push(`${id} Client bundle returned HTTP ${status}`)
  }
  if (phase === 'core') {
    for (const id of PRODUCT_CLIENT_IDS.filter(id => !CORE_PRODUCT_CLIENT_IDS.includes(id))) {
      if (Object.hasOwn(result.clientResponses, id)) failures.push(`${id} optional Client was requested by core`)
    }
  }
  for (const error of result.pageErrors) failures.push(`pageerror: ${error}`)
  for (const error of result.consoleErrors) failures.push(`console error: ${error}`)
  if (failures.length > 0) {
    throw new Error(`YourBuddy product Client boot failed:\n${failures.map(failure => `- ${failure}`).join('\n')}`)
  }
}

async function exerciseMarketplace(settings, { openExternalLinks = false } = {}) {
  const missingCard = settings.getByRole('button').filter({ hasText: `YourBuddy-test/${missingMarketplaceRepository}` }).first()
  await missingCard.click()
  const missingHint = settings.getByText(
    'No npm package both links to this repository and declares dsh.bundle.patch. Follow the repository README instead.',
    { exact: true },
  )
  await missingHint.waitFor({ timeout: 10_000 })
  const unavailable = settings.getByRole('button', { name: 'One-click unavailable', exact: true })
  await unavailable.waitFor({ timeout: 10_000 })
  if (await unavailable.isEnabled()) {
    throw new Error('Marketplace enabled one-click install for a repository without an npm package')
  }

  await missingCard.click()
  await missingHint.waitFor({ state: 'detached', timeout: 10_000 })
  const validCard = settings.getByRole('button').filter({ hasText: `YourBuddy-test/${validMarketplaceRepository}` }).first()
  await validCard.click()
  try {
    await settings.getByText(
      `Installable npm package: ${validMarketplacePackage}@1.2.3`,
      { exact: true },
    ).waitFor({ timeout: 10_000 })
  }
  catch (error) {
    const body = await settings.page().locator('body').textContent({ timeout: 1_000 }).catch(() => '<unavailable>')
    throw new Error(`Marketplace package verification was not visible; dialog: ${JSON.stringify(body)}`, { cause: error })
  }
  if (openExternalLinks) {
    await settings.getByRole('link', { name: 'Open GitHub repo ↗', exact: true }).click()
    await settings.getByRole('link', { name: 'Search npm ↗', exact: true }).click()
  }
  const install = settings.getByRole('button', { name: 'Install', exact: true })
  try {
    await install.waitFor({ timeout: 10_000 })
    if (!await install.isEnabled()) {
      throw new Error('Marketplace did not enable one-click install for a verified npm package')
    }
  }
  catch (error) {
    const body = await settings.page().locator('body').textContent({ timeout: 1_000 }).catch(() => '<unavailable>')
    throw new Error(`Marketplace install action was not ready; dialog: ${JSON.stringify(body)}`, { cause: error })
  }
  await install.click()
  await settings.getByRole('button', {
    name: `Install ${validMarketplacePackage}?`,
    exact: true,
  }).waitFor({ timeout: 10_000 })
}

async function exerciseBetterSidebarExternalLink(settings, surface = settings) {
  await settings.getByRole('button', { name: 'Side card', exact: true }).click()
  await settings.getByText('Add preview plugins', { exact: true }).click()
  const officePreview = surface.getByRole('button', { name: /^(?:Open|跳转):/u }).first()
  await officePreview.waitFor({ timeout: 10_000 })
  await officePreview.click()
  await surface.getByRole('button', { name: 'Done', exact: true }).last().click()
}

async function clickOnboardingAction(page, name, waitMilliseconds) {
  const action = page.getByRole('button', { name, exact: true })
  const deadline = Date.now() + waitMilliseconds
  while (Date.now() < deadline) {
    if (await action.count() > 0 && await action.isVisible()) {
      await action.click()
      await action.waitFor({ state: 'detached', timeout: 10_000 })
      return true
    }
    await new Promise(resolvePoll => { setTimeout(resolvePoll, 100) })
  }
  return false
}

async function completeProductOnboarding(page) {
  await clickOnboardingAction(page, 'Continue', 5_000)
  await clickOnboardingAction(page, 'Configure later', 5_000)
}

async function createAndOpenReleaseSmokeSession(page) {
  const created = await page.evaluate(async () => {
    const response = await fetch('/api/session/create', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type: 'client-request',
        rpcId: 'yourbuddy-release-create-session',
        method: 'session/create',
        payload: { args: { request: {} } },
      }),
    })
    const body = await response.text()
    return { status: response.status, body: response.ok ? JSON.parse(body) : body }
  })
  if (created.status !== 200
    || created.body?.type !== 'server-response'
    || created.body.rpcId !== 'yourbuddy-release-create-session'
    || created.body.result?.ok !== true
    || typeof created.body.result.value?.sessionId !== 'string') {
    throw new Error(`release smoke could not create a blank Session: ${JSON.stringify(created)}`)
  }
  await page.evaluate((sessionId) => {
    localStorage.setItem('dsh.sessions.current', JSON.stringify({ sessionId }))
  }, created.body.result.value.sessionId)
  await page.reload({ waitUntil: 'load', timeout: 30_000 })
  await page.locator('[class*="frame"]').first().waitFor({ timeout: 30_000 })
  await completeProductOnboarding(page)
}

/** Synthetic files covering the fallback, Editor, and existing DSH PDF/Office/Excel viewers. */
export const RELEASE_DOCUMENT_PREVIEWS = [
  { file: 'release-core-preview.fods', selector: '[data-document-preview]', text: 'YourBuddy prepared core document preview' },
  { file: 'release-editor-preview.txt', selector: '[data-dsh-native-tab-host] .cm-content', text: 'YourBuddy prepared editor document preview' },
  { file: 'release-office-preview.pdf', viewer: 'pdf', pages: 2, text: 'Selectable PDF text' },
  { file: 'release-office-preview.docx', viewer: 'office', pages: 2, text: 'Office preview', additionalText: '中文文档' },
  { file: 'release-office-preview.pptx', viewer: 'office', pages: 2, text: 'Office preview', additionalText: '中文文档' },
  { file: 'release-office-preview.xlsx', viewer: 'excel', sheets: [
    { name: '季度预算', text: 'DeepSeek · 项目预算' },
    { name: '公式与格式', text: '=_xlfn.XLOOKUP(1,{1},{42})' },
  ] },
]

/**
 * Copy real synthetic Office bytes, never renamed text, into the isolated release workspace.
 * @param {string} workspace Destination owned by the release smoke.
 * @param {string} fixtureDirectory Fixtures from the same revision as the verifier.
 */
export function writeDocumentPreviewFixtures(workspace, fixtureDirectory = join(desktopRoot, 'scripts', 'fixtures')) {
  for (const preview of RELEASE_DOCUMENT_PREVIEWS) {
    writeFileSync(join(workspace, preview.file), preview.viewer
      ? readFileSync(join(fixtureDirectory, preview.file))
      : `${preview.text}\n`)
  }
}

async function requireOfficePreviewContent(sidebar, preview) {
  const document = sidebar.locator(`[data-textpreview-url$="/${preview.file}"][data-document-preview="@deepseek-ai/dsh-client-ui-sidebar-documentpreview/${preview.viewer}"]`)
  await document.waitFor({ state: 'visible', timeout: 60_000 })
  if (preview.viewer === 'excel') {
    const excel = document.locator('[data-excel-preview]')
    await excel.locator('canvas').first().waitFor({ state: 'visible', timeout: 30_000 })
    for (const sheet of preview.sheets) {
      await excel.locator('.luckysheet-sheets-item-name').getByText(sheet.name, { exact: true }).click()
      await excel.locator('.fortune-sheet-overlay').click({ position: { x: 70, y: 30 } })
      await excel.locator('.fortune-fx-input').getByText(sheet.text, { exact: true }).waitFor({ timeout: 15_000 })
    }
  } else {
    for (let number = 1; number <= preview.pages; number += 1) {
      const page = document.locator(`[data-pdf-page="${number}"]`)
      await page.scrollIntoViewIfNeeded({ timeout: 60_000 })
      const canvas = page.getByRole('img', { name: `PDF page ${number}`, exact: true })
      await canvas.waitFor({ state: 'visible', timeout: 60_000 })
      for (const text of [preview.text, preview.additionalText].filter(Boolean)) {
        await page.locator('[data-pdf-text]').getByText(text, { exact: false }).first().waitFor({ timeout: 15_000 })
      }
      const painted = await canvas.evaluate(node => {
        const context = node.getContext('2d')
        if (!context) return false
        const pixels = context.getImageData(0, 0, node.width, node.height).data
        for (let index = 0; index < pixels.length; index += 4) {
          if (pixels[index + 3] > 0 && Math.min(pixels[index], pixels[index + 1], pixels[index + 2]) < 200) return true
        }
        return false
      })
      if (!painted) throw new Error(`${preview.file} page ${number} has no rendered content`)
    }
    const pageCount = await document.locator('[data-pdf-page]').count()
    if (pageCount !== preview.pages) throw new Error(`${preview.file} rendered ${pageCount} pages instead of ${preview.pages}`)
  }
  return document
}

/** Require real viewer content and close/reopen behavior through the shipped workbench file tree. */
export async function exerciseDocumentPreviews(sidebar, workbench) {
  const openFile = async file => {
    await sidebar.getByRole('button', { name: 'New tab', exact: true }).click()
    await sidebar.locator('[data-sidebar-right-guide-entry="files"]').click()
    await sidebar.getByText(file, { exact: true }).click()
  }
  await workbench.getByRole('button', { name: 'Files', exact: true }).click()
  for (const preview of RELEASE_DOCUMENT_PREVIEWS) {
    if (!preview.viewer) {
      await openFile(preview.file)
      await sidebar.locator(preview.selector).getByText(preview.text, { exact: true }).waitFor({ timeout: 15_000 })
      continue
    }
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await workbench.getByText(preview.file, { exact: true }).click()
      const document = await requireOfficePreviewContent(sidebar, preview)
      await workbench.getByText('release-editor-preview.txt', { exact: true }).waitFor({ state: 'visible', timeout: 15_000 })
      if (await workbench.locator('div[draggable="true"][title="Files"]').count() !== 1
        || await workbench.locator(`div[draggable="true"][title="${preview.file}"]`).count() !== 0) {
        throw new Error(`${preview.file} replaced the workbench Files tab instead of opening the DSH viewer`)
      }
      await sidebar.locator('[data-dockkit-tab]').filter({ hasText: preview.file })
        .locator('[data-dockkit-tab-close]').click()
      await document.waitFor({ state: 'detached', timeout: 15_000 })
    }
  }
}

/** Exercise the middle workbench only after the desktop bridge has mounted its slot. */
export async function exerciseWorkbenchDocumentPreviews(page) {
  const sidebar = page.locator('[data-sidebar-right-panel]').first()
  const startedCollapsed = await sidebar.getAttribute('aria-hidden') === 'true'
  if (startedCollapsed) await page.getByRole('button', { name: 'Open right sidebar', exact: true }).click()
  await exerciseDocumentPreviews(sidebar,
    page.locator('[data-workbench-surface="core"] [data-dsh-panel-host][data-dsh-presentation="slot"]'))
  // Preserve a failed preview for evidence; restore only after content and reopen checks pass.
  if (startedCollapsed) {
    await sidebar.getByRole('button', { name: 'Collapse right sidebar', exact: true }).click()
    await page.locator('[data-sidebar-right-panel][aria-hidden="true"]').first()
      .waitFor({ state: 'attached', timeout: 10_000 })
  }
}

/** Retain only sidebar and document-read request paths and outcomes; never headers, query strings or bodies. */
export function recordPreviewNetworkEvent(events, url, event, outcome = {}) {
  const path = new URL(url).pathname
  if (path.startsWith('/sidebar/api/') || path.startsWith('/sidebar/bundle/')
    || path.startsWith('/api/officeToPdf/') || path.startsWith('/api/workspaceFiles/')) {
    events.push({ event, path, ...outcome })
  }
}

/** Capture early preview failures before closing Chromium without replacing the original error. */
export async function saveBrowserFailure(page, directory, diagnostics) {
  if (!directory) return
  try {
    writeFileSync(join(directory, `${diagnostics.phase}-browser-failure.json`),
      `${JSON.stringify(diagnostics, (_key, value) => typeof value === 'string'
        ? redactEvidence(value).replace(/(dsh-auth-[a-z0-9_-]+=)[^\s;"'<>]+/gi, '$1<redacted>')
        : value, 2)}\n`)
  } catch (error) { void error /* Preserve the acceptance error when evidence storage fails. */ }
  try {
    await page?.screenshot({ path: join(directory, `${diagnostics.phase}-browser-failure.png`), timeout: 5_000 })
  } catch (error) { void error /* A failed screenshot must not replace the acceptance error. */ }
}

/** Exercise lightweight services without leaking sidebar expansion into the desktop phase. */
export async function exerciseLightweightServices(page) {
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    response.end('<p>YourBuddy lightweight browser is running</p>')
  })
  await new Promise((resolveListen, rejectListen) => {
    server.once('error', rejectListen)
    server.listen(0, '127.0.0.1', resolveListen)
  })
  try {
    const address = server.address()
    if (address === null || typeof address === 'string') throw new Error('lightweight browser smoke did not bind a port')
    const sidebar = page.locator('[data-sidebar-right-panel]').first()
    const startedCollapsed = await sidebar.getAttribute('aria-hidden') === 'true'
    if (startedCollapsed) {
      await page.getByRole('button', { name: 'Open right sidebar', exact: true }).click()
    }
    const browser = sidebar.locator('[data-sidebar-right-guide-entry="browser"]')
    if (!await browser.isVisible()) await sidebar.getByRole('button', { name: 'New tab', exact: true }).click()
    await browser.click()
    const input = sidebar.getByRole('textbox', { name: 'Enter an HTTP(S) address', exact: true })
    await input.fill(`http://127.0.0.1:${address.port}/`)
    await input.press('Enter')
    await sidebar.frameLocator('iframe[data-sidebar-browser-frame]')
      .getByText('YourBuddy lightweight browser is running', { exact: true }).waitFor({ timeout: 15_000 })
    // The same Session reopens in the desktop iframe; restore its persisted expanded state.
    // Keep a failed preview visible for the failure screenshot instead of restoring in finally.
    if (startedCollapsed) {
      await sidebar.getByRole('button', { name: 'Collapse right sidebar', exact: true }).click()
      await page.locator('[data-sidebar-right-panel][aria-hidden="true"]').first()
        .waitFor({ state: 'attached', timeout: 10_000 })
    }
  } finally {
    await closeDesktopBridgeSmokeServer(server)
  }
}

function buildDesktopBridgeSmokeShell(webUrl) {
  const externalI18n = '<script src="desktop-i18n.js"></script>'
  if (desktopShellSource.split(externalI18n).length !== 2) {
    throw new Error('desktop shell must contain exactly one desktop-i18n.js script')
  }
  if (/<\/script/iu.test(desktopI18nSource)) {
    throw new Error('desktop-i18n.js cannot be embedded safely in the release smoke')
  }
  const encodedBaseUrl = JSON.stringify(`${new URL(webUrl).origin}/`).replaceAll('<', '\\u003c')
  const bootstrap = `<script>
    window.__DSH_WEB_URL__ = ${encodedBaseUrl}
    window.__DSH_HOST_COOKIE_READY__ = true
    window.__DSH_LOCALE__ = 'en'
    window.__DSH_CHROME__ = { os: 'macos', left: ['close', 'minimize', 'maximize'], right: [] }
    window.__YOURBUDDY_DESKTOP_COMMANDS__ = []
    window.__YOURBUDDY_NATIVE_PROXY_TEST_RESULT__ = {
      native: {
        ok: true,
        status: 204,
        proxied: true,
        errorCode: '',
        proxyMode: 'system',
        caSource: 'custom',
      },
      node: {
        ok: true,
        status: 403,
        proxied: true,
        errorCode: '',
        proxyMode: 'system',
        caSource: 'custom',
      },
    }
    window.__TAURI__ = {
      core: {
        invoke: async (command, args) => {
          if (command !== 'run_first_party_command') throw new Error('unexpected Tauri invocation: ' + command)
          command = args.command
          args = args.payload
          window.__YOURBUDDY_DESKTOP_COMMANDS__.push({ command, args })
          if (command === 'open_external_url') return
          if (command === 'open_marketplace_url') return
          if (command === 'check_for_updates') return ${JSON.stringify(desktopUpdateSmokeResult)}
          if (command === 'get_network_proxy_settings') return ${JSON.stringify(desktopProxySnapshot)}
          if (command === 'get_shell_environment') return {
            settings: { mode: 'inherit', shellPath: null },
            status: { state: 'ready', source: 'loginShell', shellPath: '/bin/zsh', durationMs: 1, variableCount: 1, pathEntryCount: 1, errorCode: '' },
            restartRequired: false,
            overriddenNames: [],
            tools: [],
          }
          if (command === 'get_macos_permissions') return []
          if (command === 'select_ca_certificate') return ${JSON.stringify(desktopProxySystemSettings.caCertificatePath)}
          if (command === 'test_network_proxy_settings') return window.__YOURBUDDY_NATIVE_PROXY_TEST_RESULT__
          if (command === 'save_network_proxy_settings') return {
            saved: true,
            preflight: window.__YOURBUDDY_NATIVE_PROXY_TEST_RESULT__,
            snapshot: {
              ...${JSON.stringify(desktopProxySnapshot)},
              settings: args.settings,
              effective: {
                mode: args.settings.mode,
                caCertificatePath: args.settings.caCertificatePath,
                httpProxy: ${JSON.stringify(desktopProxySnapshot.system.httpProxy)},
                httpsProxy: ${JSON.stringify(desktopProxySnapshot.system.httpsProxy)},
                noProxy: ${JSON.stringify(desktopProxySnapshot.system.noProxy)},
                caSource: 'custom',
              },
            },
          }
          if (command === 'restart_app') return new Promise(() => {})
          throw new Error('unexpected desktop command: ' + command)
        },
      },
    }
  </script>
  <script>${desktopI18nSource}</script>`
  return desktopShellSource.replace(externalI18n, bootstrap)
}

async function startDesktopBridgeSmokeServer(webUrl) {
  const html = buildDesktopBridgeSmokeShell(webUrl)
  const server = createServer((request, response) => {
    if (request.url === '/app-icon.png' || request.url === '/favicon.ico') {
      response.writeHead(200, {
        'cache-control': 'no-store',
        'content-type': 'image/png',
      })
      response.end(desktopAppIcon)
      return
    }
    if (request.url !== '/') {
      response.writeHead(404).end()
      return
    }
    response.writeHead(200, {
      'cache-control': 'no-store',
      'content-type': 'text/html; charset=utf-8',
    })
    response.end(html)
  })
  await new Promise((resolveListen, rejectListen) => {
    const onError = error => { rejectListen(error) }
    server.once('error', onError)
    server.listen(0, '127.0.0.1', () => {
      server.off('error', onError)
      resolveListen()
    })
  })
  const address = server.address()
  if (address === null || typeof address === 'string') {
    server.close()
    throw new Error('desktop bridge smoke server did not bind a TCP port')
  }
  return { server, url: `http://127.0.0.1:${address.port}/` }
}

function closeDesktopBridgeSmokeServer(server) {
  return new Promise((resolveClose, rejectClose) => {
    server.close(error => {
      if (error) rejectClose(error)
      else resolveClose()
    })
  })
}

async function runBrowserSmoke(baseUrl, env, phase) {
  let browser
  let page
  const pageErrors = []
  const consoleErrors = []
  const previewRequests = []
  let desktopBridgeServer
  let failure
  try {
    if (!existsSync(installedChromiumExecutable)) {
      throw new Error(
        `Playwright Chromium is not installed: ${installedChromiumExecutable}; run pnpm --dir apps/desktop-tauri exec playwright install chromium`,
      )
    }
    browser = await chromium.launch({
      headless: true,
      env,
      executablePath: installedChromiumExecutable,
    })
    console.log(`verify-product-release: ${phase} browser ${browser.version()} (${installedChromiumExecutable})`)
    const releaseVideoDir = process.env.YOURBUDDY_RELEASE_VIDEO_DIR
    if (releaseVideoDir) mkdirSync(releaseVideoDir, { recursive: true })
    const context = await browser.newContext({
      viewport: { width: 1680, height: 1000 },
      locale: 'en-US',
      ...(releaseVideoDir ? { recordVideo: { dir: releaseVideoDir, size: { width: 1344, height: 800 } } } : {}),
    })
    page = await context.newPage()
    await page.addInitScript(() => {
      window.__YOURBUDDY_COPIED_LINKS__ = []
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async value => { window.__YOURBUDDY_COPIED_LINKS__.push(value) },
        },
      })
    })
    const clientResponses = {}
    page.on('pageerror', error => { pageErrors.push(String(error)) })
    page.on('console', message => {
      if (message.type() === 'error') {
        const url = message.location().url
        const path = url ? new URL(url, baseUrl).pathname : ''
        consoleErrors.push(`${message.text()}${path ? ` (${path})` : ''}`)
      }
    })
    page.on('request', request => {
      recordPreviewNetworkEvent(previewRequests, request.url(), 'request', { method: request.method() })
    })
    page.on('requestfailed', request => {
      recordPreviewNetworkEvent(previewRequests, request.url(), 'failed', { error: request.failure()?.errorText })
    })
    page.on('response', response => {
      recordProductClientResponse(clientResponses, response.url(), response.status())
      recordPreviewNetworkEvent(previewRequests, response.url(), 'response', { status: response.status() })
    })
    await page.route('https://api.github.com/**', route => {
      const pathname = new URL(route.request().url()).pathname
      if (pathname === '/search/repositories') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            total_count: 2,
            items: [missingMarketplaceRepository, validMarketplaceRepository].map((name, index) => ({
              full_name: `YourBuddy-test/${name}`,
              description: `Release smoke repository ${name}`,
              stargazers_count: 2 - index,
              updated_at: '2026-08-30T00:00:00Z',
              language: 'JavaScript',
              html_url: `https://github.com/YourBuddy-test/${name}`,
            })),
          }),
        })
      }
      if (pathname.endsWith('/readme')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ content: Buffer.from('Release smoke README').toString('base64') }),
        })
      }
      return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' })
    })
    await page.route('https://registry.npmjs.org/**', route => {
      const url = new URL(route.request().url())
      if (url.pathname === '/-/v1/search') {
        const repository = url.searchParams.get('text')
        const names = repository === validMarketplaceRepository
          ? [validMarketplacePackage, validMarketplaceNonPluginPackage]
          : repository === missingMarketplaceRepository ? [missingMarketplacePackage] : []
        const objects = names.map(name => ({
          package: {
            name,
            links: { repository: `git+https://github.com/YourBuddy-test/${repository}.git` },
          },
        }))
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ objects, total: objects.length }),
        })
      }
      if (route.request().headers().accept !== 'application/json') {
        return route.fulfill({
          status: 406,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'release smoke requires npm latest metadata as standard JSON' }),
        })
      }
      if (decodeURIComponent(url.pathname) === `/${validMarketplacePackage}/latest`) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            name: validMarketplacePackage,
            version: '1.2.3',
            dsh: {
              bundle: { patch: './cordis.patch.yml' },
              smoke: { upstreamRepository: `https://github.com/YourBuddy-test/${validMarketplaceRepository}` },
            },
          }),
        })
      }
      if (decodeURIComponent(url.pathname) === `/${validMarketplaceNonPluginPackage}/latest`
        || decodeURIComponent(url.pathname) === `/${missingMarketplacePackage}/latest`) {
        const name = decodeURIComponent(url.pathname).slice(1, -'/latest'.length)
        const repository = name === missingMarketplacePackage ? missingMarketplaceRepository : validMarketplaceRepository
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            name,
            version: '1.2.3',
            repository: `git+https://github.com/YourBuddy-test/${repository}.git`,
          }),
        })
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    })

    const navigation = await page.goto(baseUrl, { waitUntil: 'load', timeout: 30_000 })
    if (navigation === null || navigation.status() !== 200) {
      throw new Error(`YourBuddy Web navigation returned HTTP ${navigation?.status() ?? 'no response'}`)
    }
    await page.waitForFunction(
      () => document.querySelector('[class*="frame"]') !== null
        || document.body.textContent?.includes('Failed to load plugins') === true,
      undefined,
      { timeout: 30_000 },
    )
    const frameCount = await page.locator('[class*="frame"]').count()
    if (frameCount > 0) {
      await page.evaluate(() => new Promise(resolveFrame => {
        requestAnimationFrame(() => requestAnimationFrame(resolveFrame))
      }))
    }
    assertProductClientBoot({
      clientResponses,
      pageErrors,
      consoleErrors,
      bootFailureCount: await page.getByText('Failed to load plugins', { exact: true }).count(),
      frameCount,
    }, phase)
    await completeProductOnboarding(page)
    const presetButton = page.getByRole('button', { name: 'Codex', exact: true })
    await presetButton.waitFor({ timeout: 10_000 })
    await presetButton.click()
    const creatorPreset = page.getByRole('menuitem', { name: /内容创作/ })
    await creatorPreset.waitFor({ timeout: 10_000 })
    await page.keyboard.press('Escape')
    await page.getByRole('region', { name: 'Library', exact: true }).waitFor({ state: 'visible', timeout: 10_000 })
    const codexModelCatalogProbe = await page.evaluate(async () => {
      const response = await fetch('/api/session/modelCatalog', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'client-request',
          rpcId: 'yourbuddy-release-codex-model-catalog',
          method: 'session/modelCatalog',
          payload: { args: {} },
        }),
      })
      const body = await response.text()
      return { status: response.status, body: response.ok ? JSON.parse(body) : body }
    })
    assertCodexModelCatalogProbe(codexModelCatalogProbe)
    await createAndOpenReleaseSmokeSession(page)
    await exerciseLightweightServices(page)
    await page.getByRole('button', { name: 'Access mode, current: Full access', exact: true })
      .waitFor({ timeout: 10_000 })
    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    const settings = page.getByRole('dialog', { name: 'Settings' })
    await settings.waitFor({ timeout: 10_000 })
    const update = settings.getByRole('button', { name: 'Check and update', exact: true })
    await update.waitFor({ timeout: 10_000 })
    if (await update.isEnabled()) {
      throw new Error('standalone YourBuddy Web exposed the desktop-only update action as enabled')
    }
    const restart = settings.getByRole('button', { name: 'Restart YourBuddy', exact: true })
    await restart.waitFor({ timeout: 10_000 })
    if (await restart.isEnabled()) {
      throw new Error('standalone YourBuddy Web exposed the desktop-only restart action as enabled')
    }
    const proxyTest = settings.getByRole('button', { name: 'Test ChatGPT connection', exact: true })
    await proxyTest.waitFor({ timeout: 10_000 })
    if (await proxyTest.isEnabled()) {
      throw new Error('standalone YourBuddy Web exposed desktop network proxy testing as enabled')
    }
    const proxySave = settings.getByRole('button', { name: 'Save and restart YourBuddy', exact: true })
    await proxySave.waitFor({ timeout: 10_000 })
    if (await proxySave.isEnabled()) {
      throw new Error('standalone YourBuddy Web exposed desktop network proxy persistence as enabled')
    }
    await settings.getByRole('button', { name: 'Plugin Marketplace', exact: true }).click()
    await settings.getByPlaceholder('Search plugins (keyword, or empty to browse all)…', { exact: true }).waitFor({ timeout: 10_000 })
    await exerciseMarketplace(settings)
    await settings.getByRole('button', { name: 'General', exact: true }).click()
    assertProductClientBoot({
      clientResponses,
      pageErrors,
      consoleErrors,
      bootFailureCount: await page.getByText('Failed to load plugins', { exact: true }).count(),
      frameCount,
    }, phase)
    await settings.getByRole('button', { name: 'Close', exact: true }).click()

    await page.context().clearCookies()
    const desktopAuthentication = await authenticateHost(baseUrl)
    await page.context().addCookies([
      desktopWebviewCookie(baseUrl, desktopAuthentication.cookie),
    ])
    const desktopBridge = await startDesktopBridgeSmokeServer(desktopAuthentication.baseUrl)
    desktopBridgeServer = desktopBridge.server
    const shellNavigation = await page.goto(desktopBridge.url, { waitUntil: 'load', timeout: 30_000 })
    if (shellNavigation === null || shellNavigation.status() !== 200) {
      throw new Error(`YourBuddy desktop shell navigation returned HTTP ${shellNavigation?.status() ?? 'no response'}`)
    }
    const embedded = page.frameLocator('#app')
    try {
      await embedded.locator('[class*="frame"]').first().waitFor({ timeout: 30_000 })
    }
    catch (error) {
      const frameUrls = page.frames().map(frame => frame.url())
      throw new Error(
        `assembled Host did not mount inside the desktop shell; frames=${JSON.stringify(frameUrls)}, pageErrors=${JSON.stringify(pageErrors)}, consoleErrors=${JSON.stringify(consoleErrors)}`,
        { cause: error },
      )
    }
    const embeddedFrame = page.frames().find(frame => frame.parentFrame() === page.mainFrame())
    const embeddedUrl = embeddedFrame?.url()
    const cleanBaseUrl = `${new URL(baseUrl).origin}/`
    if (embeddedUrl !== cleanBaseUrl) {
      throw new Error(`desktop Host token exchange did not reach the clean root URL: ${embeddedUrl ?? 'no frame'}`)
    }
    if (embeddedFrame === undefined) throw new Error('desktop Host frame is unavailable for the GPT Auth status probe')
    const codexAuthStatusProbe = await embeddedFrame.evaluate(async () => {
      const response = await fetch('/codex-auth/status', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'client-request',
          rpcId: 'yourbuddy-release-codex-auth-status',
          method: 'status',
          payload: {},
        }),
      })
      const body = await response.text()
      return { status: response.status, body: response.ok ? JSON.parse(body) : body }
    })
    assertCodexAuthStatusProbe(codexAuthStatusProbe)
    await completeProductOnboarding(embedded)
    const workbenchFrame = embedded.locator('[data-dsh-frame][data-workbench-primary]').first()
    await workbenchFrame.waitFor({ timeout: 10_000 })
    await embedded.locator('body[data-dsh-better-sidebar-presentation="slot"]').waitFor({ timeout: 10_000 })
    const workbenchTracks = await workbenchFrame.evaluate(element =>
      getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/u))
    if (workbenchTracks.length !== 4) {
      throw new Error(`YourBuddy workbench-primary layout rendered ${workbenchTracks.length} tracks: ${workbenchTracks.join(' ')}`)
    }
    const productWorkbench = embedded.locator('[data-product-workbench]').first()
    await productWorkbench.waitFor({ state: 'visible', timeout: 10_000 })
    const coreSurface = productWorkbench.locator('[data-workbench-surface="core"]')
    const contentSurface = productWorkbench.locator('[data-workbench-surface="content"]')
    if (await coreSurface.getAttribute('hidden') !== null || await coreSurface.getAttribute('inert') !== null) {
      throw new Error('YourBuddy core workbench did not start as the interactive middle surface')
    }
    if (await contentSurface.getAttribute('hidden') === null || await contentSurface.getAttribute('inert') === null) {
      throw new Error('YourBuddy Content workbench did not remain mounted and inactive by default')
    }
    const creatorInspector = contentSurface.locator('[data-plugin="dsh-oil-creator"][data-surface="inspector"]')
    const creatorLibrary = embedded.getByRole('region', { name: 'Library', exact: true })
    await creatorLibrary.waitFor({ state: 'visible', timeout: 10_000 })
    await creatorLibrary.getByText(creatorPublishSmokeTitle, { exact: true }).click()
    await creatorInspector.waitFor({ state: 'visible', timeout: 10_000 })
    await creatorInspector.locator('button.close').last().click()
    await coreSurface.waitFor({ state: 'visible', timeout: 10_000 })
    const betterSidebarWorkbench = embedded.locator('[data-dsh-bottom-panel]').first()
    await betterSidebarWorkbench.waitFor({ state: 'visible', timeout: 10_000 })
    const workbenchGeometry = await betterSidebarWorkbench.evaluate((panel) => {
      const host = panel.parentElement
      if (!(host instanceof HTMLElement)) throw new Error('Better Sidebar workbench has no element host')
      const hostRect = host.getBoundingClientRect()
      const panelRect = panel.getBoundingClientRect()
      return {
        host: { width: hostRect.width, height: hostRect.height },
        panel: { width: panelRect.width, height: panelRect.height },
      }
    })
    if (Math.abs(workbenchGeometry.host.width - workbenchGeometry.panel.width) > 2
      || Math.abs(workbenchGeometry.host.height - workbenchGeometry.panel.height) > 2) {
      throw new Error(`Better Sidebar did not fill the primary workbench slot: ${JSON.stringify(workbenchGeometry)}`)
    }
    await exerciseWorkbenchDocumentPreviews(embedded)
    const newTabControl = coreSurface.getByRole('button', { name: 'New tab', exact: true }).first()
    await newTabControl.click()
    await embedded.getByRole('menu').last().waitFor({ state: 'visible', timeout: 10_000 })
    await page.keyboard.press('Escape')
    if (releaseVideoDir) await page.waitForTimeout(700)
    await workbenchFrame.locator('.dpw-workbench-session-collapse').click()
    await workbenchFrame.locator('.dpw-session-restore').waitFor({ state: 'visible', timeout: 10_000 })
    if (releaseVideoDir) await page.waitForTimeout(1_000)
    const collapsedTracks = await workbenchFrame.evaluate(element => ({
      collapsed: element.hasAttribute('data-session-region-collapsed'),
      tracks: getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/u),
      rightbarHidden: element.querySelector('[data-sidebar-right-panel]')?.getAttribute('aria-hidden'),
      conversationHidden: element.querySelector('#dsh-session-region')?.getAttribute('aria-hidden'),
    }))
    if (!collapsedTracks.collapsed
      || collapsedTracks.tracks.length !== 4
      || Number.parseFloat(collapsedTracks.tracks[2]) !== 0
      || Number.parseFloat(collapsedTracks.tracks[3]) !== 0
      || collapsedTracks.rightbarHidden !== 'true'
      || collapsedTracks.conversationHidden !== 'true') {
      throw new Error(`YourBuddy Session collapse did not produce two hidden zero tracks: ${JSON.stringify(collapsedTracks)}`)
    }
    await workbenchFrame.locator('.dpw-session-restore').click()
    await workbenchFrame.locator('.dpw-workbench-session-collapse').waitFor({ state: 'visible', timeout: 10_000 })
    if (releaseVideoDir) await page.waitForTimeout(1_000)
    if (await workbenchFrame.getAttribute('data-session-region-collapsed') !== null) {
      throw new Error('YourBuddy Session restore left the aggregate region collapsed')
    }
    const releaseScreenshot = process.env.YOURBUDDY_RELEASE_SCREENSHOT
    if (releaseScreenshot) {
      await workbenchFrame.evaluate(frame => {
        const root = document.createElement('div')
        root.dataset.yourbuddyReleaseEvidence = 'workbench-layout'
        root.style.cssText = 'position:fixed;inset:0;z-index:2147483646;pointer-events:none;font:600 13px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'
        const annotate = (target, label, color) => {
          if (!(target instanceof HTMLElement)) return
          const rect = target.getBoundingClientRect()
          const outline = document.createElement('div')
          outline.style.cssText = `position:fixed;left:${rect.left + 4}px;top:${rect.top + 4}px;width:${Math.max(0, rect.width - 8)}px;height:${Math.max(0, rect.height - 8)}px;border:2px solid ${color};border-radius:10px;box-sizing:border-box`
          const badge = document.createElement('div')
          badge.textContent = label
          badge.style.cssText = `position:absolute;left:14px;top:14px;padding:7px 10px;border-radius:8px;background:${color};color:white;box-shadow:0 2px 10px #0003`
          outline.append(badge)
          root.append(outline)
        }
        annotate(frame.children[1], 'Better Sidebar · Primary Workbench / 主工作区', '#2563eb')
        annotate(frame.querySelector('#dsh-session-region'), 'DSH Conversation / 对话区', '#7c3aed')
        document.body.append(root)
      })
      mkdirSync(dirname(releaseScreenshot), { recursive: true })
      await page.screenshot({ path: releaseScreenshot, type: 'png' })
      console.log(`verify-product-release: captured workbench-primary screenshot at ${releaseScreenshot}`)
    }
    const externalLink = embedded.locator('#yourbuddy-external-link-smoke')
    await embedded.locator('body').evaluate((body, url) => {
      const anchor = document.createElement('a')
      anchor.id = 'yourbuddy-external-link-smoke'
      anchor.href = url
      anchor.target = '_blank'
      anchor.rel = 'noopener noreferrer'
      anchor.textContent = 'Postiz external link smoke'
      anchor.style.cssText = 'position:fixed;left:300px;top:120px;z-index:2147483646;padding:8px;background:white;color:blue'
      body.append(anchor)
    }, desktopExternalLinkSmokeUrl)
    await externalLink.hover()
    if (await externalLink.getAttribute('title') !== desktopExternalLinkSmokeUrl) {
      throw new Error('desktop Markdown external link did not expose its destination on hover')
    }
    await externalLink.click({ button: 'right' })
    await embedded.getByRole('menuitem', { name: 'Copy link address', exact: true }).click()
    await embedded.getByText('Link address copied', { exact: true }).waitFor({ timeout: 10_000 })
    const copiedLinks = await embedded.locator('body').evaluate(() => window.__YOURBUDDY_COPIED_LINKS__)
    if (JSON.stringify(copiedLinks) !== JSON.stringify([desktopExternalLinkSmokeUrl])) {
      throw new Error(`desktop link menu copied unexpected destinations: ${JSON.stringify(copiedLinks)}`)
    }
    await page.keyboard.press('Escape')
    await externalLink.click()
    await page.waitForFunction(
      url => window.__YOURBUDDY_DESKTOP_COMMANDS__?.some(
        entry => entry.command === 'open_external_url' && entry.args?.url === url,
      ) === true,
      desktopExternalLinkSmokeUrl,
      { timeout: 10_000 },
    )
    await embedded.getByRole('button', { name: 'Settings', exact: true }).click()
    const embeddedSettings = embedded.getByRole('dialog', { name: 'Settings' })
    await embeddedSettings.waitFor({ timeout: 10_000 })
    await embeddedSettings.getByRole('button', { name: 'GPT Auth', exact: true }).click()
    try {
      await embeddedSettings.getByRole('heading', { name: 'GPT Auth', exact: true }).waitFor({ timeout: 10_000 })
    }
    catch (error) {
      const body = await embedded.locator('body').textContent({ timeout: 1_000 }).catch(() => '<unavailable>')
      const markup = await embeddedSettings.evaluate(element => element.innerHTML.slice(0, 8_000)).catch(() => '<unavailable>')
      const settingsView = await embedded.locator('body').evaluate(async () => {
        const response = await fetch('/api/settings/describe', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            type: 'client-request',
            rpcId: 'yourbuddy-release-codex-settings',
            method: 'settings/describe',
            payload: { args: {} },
          }),
        })
        return await response.json()
      }).catch(() => '<unavailable>')
      throw new Error(`desktop GPT Auth settings did not open; body=${JSON.stringify(body)}; dialog=${JSON.stringify(markup)}; settings=${JSON.stringify(settingsView)}; pageErrors=${JSON.stringify(pageErrors)}; consoleErrors=${JSON.stringify(consoleErrors)}`, { cause: error })
    }
    await embeddedSettings.getByRole('status', { name: 'codex CLI not available', exact: true }).waitFor({ timeout: 10_000 })
    if (await embeddedSettings.getByText(/transport failure for \/codex-auth\/status/u).count() !== 0) {
      throw new Error('desktop GPT Auth settings displayed a status transport failure')
    }
    await embeddedSettings.getByRole('button', { name: 'Plugin Marketplace', exact: true }).click()
    await embeddedSettings.getByPlaceholder('Search plugins (keyword, or empty to browse all)…', { exact: true }).waitFor({ timeout: 10_000 })
    await exerciseMarketplace(embeddedSettings, { openExternalLinks: true })
    await exerciseBetterSidebarExternalLink(embeddedSettings, embedded)
    await page.waitForFunction(
      url => window.__YOURBUDDY_DESKTOP_COMMANDS__?.some(
        entry => entry.command === 'open_external_url' && entry.args?.url === url,
      ) === true,
      desktopBetterSidebarPluginUrl,
      { timeout: 10_000 },
    )
    await embeddedSettings.getByRole('button', { name: 'General', exact: true }).click()
    const embeddedUpdate = embeddedSettings.getByRole('button', { name: 'Check and update', exact: true })
    await embeddedUpdate.waitFor({ timeout: 10_000 })
    if (!await embeddedUpdate.isEnabled()) {
      throw new Error('desktop YourBuddy shell did not enable the application update action')
    }
    await embeddedUpdate.click()
    await embeddedSettings.getByText(desktopUpdateSmokeResult, { exact: true }).waitFor({ timeout: 10_000 })
    const embeddedRestart = embeddedSettings.getByRole('button', { name: 'Restart YourBuddy', exact: true })
    await embeddedRestart.waitFor({ timeout: 10_000 })
    if (!await embeddedRestart.isEnabled()) {
      throw new Error('desktop YourBuddy shell did not enable the application restart action')
    }
    await embeddedRestart.click()
    await embeddedSettings.getByText(
      'Stopping the private Host and restarting YourBuddy…',
      { exact: true },
    ).waitFor({ timeout: 10_000 })
    await page.waitForFunction(
      () => window.__YOURBUDDY_DESKTOP_COMMANDS__?.some(entry => entry.command === 'restart_app') === true,
      undefined,
      { timeout: 10_000 },
    )
    const lifecycleCommands = await page.evaluate(() => window.__YOURBUDDY_DESKTOP_COMMANDS__)
    const expectedLifecycleCommands = [
      {
        command: 'open_external_url',
        args: { url: desktopExternalLinkSmokeUrl },
      },
      { command: 'get_network_proxy_settings' },
      { command: 'get_shell_environment' },
      { command: 'get_macos_permissions' },
      {
        command: 'open_marketplace_url',
        args: { url: `https://github.com/YourBuddy-test/${validMarketplaceRepository}` },
      },
      {
        command: 'open_marketplace_url',
        args: { url: `https://www.npmjs.com/package/${validMarketplacePackage}` },
      },
      {
        command: 'open_external_url',
        args: { url: desktopBetterSidebarPluginUrl },
      },
      { command: 'get_network_proxy_settings' },
      { command: 'get_shell_environment' },
      { command: 'get_macos_permissions' },
      { command: 'check_for_updates' },
      { command: 'restart_app' },
    ]
    if (JSON.stringify(lifecycleCommands) !== JSON.stringify(expectedLifecycleCommands)) {
      throw new Error(`desktop lifecycle controls invoked unexpected commands: ${JSON.stringify(lifecycleCommands)}`)
    }
    assertProductClientBoot({
      clientResponses,
      pageErrors,
      consoleErrors,
      bootFailureCount: await embedded.getByText('Failed to load plugins', { exact: true }).count(),
      frameCount: await embedded.locator('[class*="frame"]').count(),
    }, phase)

    const proxyPage = await page.context().newPage()
    const proxyClientResponses = {}
    let hostProxyDiagnosticRequests = 0
    let hostProxyDiagnosticResult = {
      ok: true,
      status: 200,
      proxied: false,
      errorCode: '',
      proxyMode: 'direct',
      caSource: 'system',
    }
    proxyPage.on('pageerror', error => { pageErrors.push(String(error)) })
    proxyPage.on('console', message => {
      if (message.type() === 'error') {
        const url = message.location().url
        const path = url ? new URL(url, baseUrl).pathname : ''
        consoleErrors.push(`${message.text()}${path ? ` (${path})` : ''}`)
      }
    })
    proxyPage.on('response', response => {
      recordProductClientResponse(proxyClientResponses, response.url(), response.status())
    })
    await proxyPage.route('**/api/yourbuddy/network-proxy/test', route => {
      const request = route.request()
      if (request.method() !== 'POST'
        || request.headers()['content-type'] !== 'application/json') {
        return route.fulfill({ status: 400, contentType: 'application/json', body: '{}' })
      }
      hostProxyDiagnosticRequests += 1
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(hostProxyDiagnosticResult),
      })
    })
    const proxyShellNavigation = await proxyPage.goto(desktopBridge.url, { waitUntil: 'load', timeout: 30_000 })
    if (proxyShellNavigation === null || proxyShellNavigation.status() !== 200) {
      throw new Error(`YourBuddy proxy shell navigation returned HTTP ${proxyShellNavigation?.status() ?? 'no response'}`)
    }
    const proxyEmbedded = proxyPage.frameLocator('#app')
    await proxyEmbedded.locator('[class*="frame"]').first().waitFor({ timeout: 30_000 })
    await completeProductOnboarding(proxyEmbedded)
    await proxyEmbedded.getByRole('button', { name: 'Settings', exact: true }).click()
    const proxySettings = proxyEmbedded.getByRole('dialog', { name: 'Settings' })
    await proxySettings.waitFor({ timeout: 10_000 })
    await proxySettings.getByRole('button', { name: 'General', exact: true }).click()
    const proxyMode = proxySettings.getByLabel('Connection mode', { exact: true })
    try {
      await proxyMode.waitFor({ timeout: 10_000 })
    }
    catch (error) {
      throw new Error(`desktop proxy settings did not render the connection mode; text=${JSON.stringify(await proxySettings.textContent())}`, { cause: error })
    }
    await proxyMode.selectOption('system')
    await proxySettings.getByText('HTTP_PROXY=http://127.0.0.1:7890', { exact: true }).waitFor({ timeout: 10_000 })
    await proxySettings.getByRole('button', { name: 'Choose .pem / .crt', exact: true }).click()
    await proxySettings.getByText('/Users/example/company-root.pem', { exact: true }).waitFor({ timeout: 10_000 })
    const embeddedProxyTest = proxySettings.getByRole('button', { name: 'Test ChatGPT connection', exact: true })
    await embeddedProxyTest.click()
    await proxySettings.getByText(
      'Desktop draft: HTTP 204 (macOS system proxy; system CAs + custom CA); bundled Node draft: HTTP 403 (macOS system proxy; system CAs + custom CA); current Node Host: HTTP 200 (direct; system CAs). The Node Host proxy mode or CA source still reflects the previous launch. Save, restart, and test again.',
      { exact: true },
    ).waitFor({ timeout: 10_000 })
    if (hostProxyDiagnosticRequests !== 1) {
      throw new Error(`desktop proxy test sent ${hostProxyDiagnosticRequests} Node Host diagnostic requests`)
    }
    await proxyPage.evaluate(() => {
      window.__YOURBUDDY_NATIVE_PROXY_TEST_RESULT__ = {
        native: {
          ok: false,
          status: 0,
          proxied: true,
          errorCode: 'UNKNOWN_ISSUER',
          proxyMode: 'system',
          caSource: 'custom',
        },
        node: {
          ok: false,
          status: 0,
          proxied: true,
          errorCode: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
          proxyMode: 'system',
          caSource: 'custom',
        },
      }
    })
    hostProxyDiagnosticResult = {
      ok: false,
      status: 0,
      proxied: true,
      errorCode: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
      proxyMode: 'direct',
      caSource: 'system',
    }
    await embeddedProxyTest.click()
    await proxySettings.getByText(
      'Desktop draft: failed: UNKNOWN_ISSUER (macOS system proxy; system CAs + custom CA); bundled Node draft: failed: UNABLE_TO_VERIFY_LEAF_SIGNATURE (macOS system proxy; system CAs + custom CA); current Node Host: failed: UNABLE_TO_VERIFY_LEAF_SIGNATURE (direct; system CAs). The Node Host proxy mode or CA source still reflects the previous launch. Save, restart, and test again. A TLS certificate trust error was detected. Trust the enterprise root in the macOS Keychain or select its PEM CA; YourBuddy does not disable certificate verification.',
      { exact: true },
    ).waitFor({ timeout: 10_000 })
    if (hostProxyDiagnosticRequests !== 2) {
      throw new Error(`desktop proxy tests sent ${hostProxyDiagnosticRequests} Node Host diagnostic requests`)
    }
    await proxyPage.evaluate(() => {
      window.__YOURBUDDY_NATIVE_PROXY_TEST_RESULT__ = {
        native: {
          ok: true,
          status: 204,
          proxied: true,
          errorCode: '',
          proxyMode: 'system',
          caSource: 'custom',
        },
        node: {
          ok: true,
          status: 403,
          proxied: true,
          errorCode: '',
          proxyMode: 'system',
          caSource: 'custom',
        },
      }
    })
    const embeddedProxySave = proxySettings.getByRole('button', { name: 'Save and restart YourBuddy', exact: true })
    await embeddedProxySave.click()
    await proxySettings.getByText(
      'Settings saved. Stopping the private Host and restarting YourBuddy…',
      { exact: true },
    ).waitFor({ timeout: 10_000 })
    const proxyCommands = await proxyPage.evaluate(() => window.__YOURBUDDY_DESKTOP_COMMANDS__)
    const expectedProxyCommands = [
      { command: 'get_network_proxy_settings' },
      { command: 'get_shell_environment' },
      { command: 'get_macos_permissions' },
      { command: 'select_ca_certificate' },
      {
        command: 'test_network_proxy_settings',
        args: { settings: desktopProxySystemSettings },
      },
      {
        command: 'test_network_proxy_settings',
        args: { settings: desktopProxySystemSettings },
      },
      {
        command: 'save_network_proxy_settings',
        args: { settings: desktopProxySystemSettings },
      },
      { command: 'restart_app' },
    ]
    if (JSON.stringify(proxyCommands) !== JSON.stringify(expectedProxyCommands)) {
      throw new Error(`desktop proxy controls invoked unexpected commands: ${JSON.stringify(proxyCommands)}`)
    }
    assertProductClientBoot({
      clientResponses: proxyClientResponses,
      pageErrors,
      consoleErrors,
      bootFailureCount: await proxyEmbedded.getByText('Failed to load plugins', { exact: true }).count(),
      frameCount: await proxyEmbedded.locator('[class*="frame"]').count(),
    }, phase)

    const brandingNavigation = await page.goto(baseUrl, { waitUntil: 'load', timeout: 30_000 })
    if (brandingNavigation === null || brandingNavigation.status() !== 200) {
      throw new Error(`YourBuddy branding navigation returned HTTP ${brandingNavigation?.status() ?? 'no response'}`)
    }
    await page.locator('[class*="frame"]').first().waitFor({ timeout: 30_000 })
    await verifyWorkbenchBranding(page)
  }
  catch (error) {
    failure = error
    await saveBrowserFailure(page, process.env.YOURBUDDY_RELEASE_EVIDENCE_DIR, {
      phase, error: error.stack ?? String(error), pageErrors, consoleErrors, previewRequests,
    })
  }

  const closeFailures = []
  try {
    await browser?.close()
  }
  catch (error) {
    closeFailures.push(error)
  }
  try {
    if (desktopBridgeServer !== undefined) {
      await closeDesktopBridgeSmokeServer(desktopBridgeServer)
    }
  }
  catch (error) {
    closeFailures.push(error)
  }
  const closeFailure = closeFailures.length > 1
    ? new AggregateError(closeFailures, 'YourBuddy desktop shell and browser teardown both failed')
    : closeFailures[0]
  if (failure && closeFailure) {
    throw new AggregateError([failure, closeFailure], 'YourBuddy product browser smoke and teardown both failed')
  }
  if (failure) throw failure
  if (closeFailure) throw closeFailure
}

async function runHostSmoke(root, productRuntimeRoot, desktopOverlayPath, world, lifetime, phase, capabilities = []) {
  const overlay = join(world, 'product.overlay.yml')
  const proxyVerifier = join(world, 'proxy-dispatcher-verifier.mjs')
  const proxyPackage = pathToFileURL(join(
    root,
    'apps',
    'cli',
    'package.json',
  )).href
  writeFileSync(proxyVerifier, `import { createRequire } from 'node:module'

const require = createRequire(${JSON.stringify(proxyPackage)})
const { proxyRouteFor } = require('@deepseek-ai/dsh-http-proxy')
${buildCapabilityPeerProbe(root, capabilities)}

export const name = 'yourbuddy-release-proxy-verifier'

export async function apply() {
  verifyCapabilityPeers()
  const route = proxyRouteFor(new URL('https://example.com/'))
  if (!route.proxied || route.proxy !== ${JSON.stringify(syntheticHostProxy)}) {
    throw new Error('application proxy policy is not active')
  }
  if (typeof route.dispatcher.dispatch !== 'function') {
    throw new Error('application proxy policy did not provide a Dispatcher')
  }
}
`)
  writeFileSync(overlay, buildProductSmokeOverlay(world, productRuntimeRoot, proxyVerifier, phase))
  const env = createReleaseChildEnvironment(world, productRuntimeRoot)
  if (phase === 'installed') installReleaseCapabilities(root, productRuntimeRoot, capabilities, world, env)
  const creatorEpisode = join(env.HOME, 'Movies', '视频项目', `2026-09-30_${creatorPublishSmokeTitle}`)
  mkdirSync(creatorEpisode, { recursive: true })
  writeFileSync(join(creatorEpisode, `${creatorPublishSmokeTitle}_subtitled.mp4`), 'release-smoke-video')
  writeFileSync(join(creatorEpisode, `${creatorPublishSmokeTitle}.srt`), '1\n00:00:00,000 --> 00:00:01,000\n发布验收\n')
  const cover = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')
  writeFileSync(join(creatorEpisode, `${creatorPublishSmokeTitle}_3x4.png`), cover)
  writeFileSync(join(creatorEpisode, `${creatorPublishSmokeTitle}_4x3.png`), cover)
  writeFileSync(join(creatorEpisode, 'publish-package.json'), `${JSON.stringify({ title: creatorPublishSmokeTitle, tags: ['验收'] }, null, 2)}\n`)
  const hostEnv = {
    ...env,
    HTTP_PROXY: syntheticHostProxy,
    HTTPS_PROXY: syntheticHostProxy,
    NO_PROXY: 'localhost,127.0.0.1,::1',
    http_proxy: syntheticHostProxy,
    https_proxy: syntheticHostProxy,
    no_proxy: 'localhost,127.0.0.1,::1',
    NODE_USE_ENV_PROXY: '1',
  }
  const webProfile = join(env.DSH_HOME, 'profiles', 'web')
  mkdirSync(webProfile, { recursive: true })
  writeFileSync(join(webProfile, 'cordis.patch.yml'), `- id: plugin-marketplace
  config:
    install:
      pkg: ""
      ts: 0
    installState:
      status: error
      message: ${syntheticInstallFailure}
      ts: 1
      pkg: ${missingMarketplaceRepository}
    aiExplain:
      repo: ""
      desc: ""
      readme: ""
      ts: 0
    aiExplainResult:
      status: idle
      text: ""
      repo: ""
      ts: 0
`)
  const child = spawn(process.execPath, [
    join(root, 'apps', 'cli', 'lib', 'bin.js'),
    'web',
    '--patch', desktopOverlayPath,
    '--patch', overlay,
    '--no-open',
    '--host', '127.0.0.1',
    '--port', '0',
  ], { cwd: world, env: hostEnv, stdio: ['ignore', 'pipe', 'pipe'] })
  let stdout = ''
  let stderr = ''
  const append = (current, chunk) => `${current}${chunk}`.slice(-32_000)
  child.stdout.setEncoding('utf8')
  child.stderr.setEncoding('utf8')
  child.stdout.on('data', chunk => { stdout = append(stdout, chunk) })
  child.stderr.on('data', chunk => { stderr = append(stderr, chunk) })

  let failure
  try {
    const baseUrl = await new Promise((resolveReady, rejectReady) => {
      const deadline = setTimeout(() => {
        rejectReady(new Error(`YourBuddy product Host did not become ready within 60s\nstdout:\n${stdout}\nstderr:\n${stderr}`))
      }, 60_000)
      const inspect = () => {
        const match = stdout.match(/dsh web: (http:\/\/[^\s]+)/u)
        if (!match) return
        clearTimeout(deadline)
        resolveReady(match[1])
      }
      child.stdout.on('data', inspect)
      child.once('error', error => {
        clearTimeout(deadline)
        rejectReady(error)
      })
      child.once('close', (code, signal) => {
        clearTimeout(deadline)
        rejectReady(new Error(
          `YourBuddy product Host exited before readiness (code=${code ?? 'null'}, signal=${signal ?? 'null'})\nstdout:\n${stdout}\nstderr:\n${stderr}`,
        ))
      })
    })

    const peerReport = stdout.match(/verify-product-release: active Profile capability peer links=(\d+)/u)
    if (!peerReport || (phase === 'installed' && Number(peerReport[1]) === 0)) {
      throw new Error('the active Host did not execute its Profile peer verification')
    }
    console.log(`verify-product-release: ${phase} Host peer diagnostic completed (${peerReport[1]} capability links)`)
    const authenticated = await authenticateHost(baseUrl)
    const headers = { cookie: authenticated.cookie }
    await fetchOk(authenticated.baseUrl, { headers })
    for (const path of ['/api/context-doctor/audit?detail=developer', '/api/pomodoro/config']) {
      const body = await (await fetchOk(`${authenticated.baseUrl}${path}`, { headers })).json()
      if (body?.ok !== true) throw new Error(`default product Host returned an invalid response: ${path}`)
    }
    const browser = await (await fetchOk(`${authenticated.baseUrl}/ego/api/ffmpeg-status`, {
      method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: '{}',
    })).json()
    if (browser?.ok !== true) throw new Error('default Browser Host returned an invalid response')
    const harborResponse = await fetch(`${authenticated.baseUrl}/_dsh/harbor-evolution/dashboard`, {
      headers, signal: AbortSignal.timeout(15_000),
    })
    if (phase === 'core') {
      if (harborResponse.status !== 404) throw new Error(`default product unexpectedly serves the optional Harbor Host: HTTP ${harborResponse.status}`)
    } else {
      const harbor = await harborResponse.json()
      if (harborResponse.status !== 200 || harbor?.ok !== true) throw new Error('installed Harbor Host returned an invalid response')
    }
    await runBrowserSmoke(baseUrl, env, phase)
  }
  catch (error) {
    failure = error
  }

  let exitFailure
  let outcome
  try {
    outcome = await stopChild(child)
    assertCleanChildExit(outcome, stdout, stderr)
  }
  catch (error) {
    exitFailure = error
  }
  if (exitFailure && (outcome === undefined || (outcome.code === null && outcome.signal === null))) {
    lifetime.preserve = true
    exitFailure = new Error(`${exitFailure.message}\nrelease smoke state preserved at ${world}`, { cause: exitFailure })
  }
  if (failure && exitFailure) {
    throw new AggregateError(
      [failure, exitFailure],
      `YourBuddy product smoke failed: ${failure.message}; Host teardown failed: ${exitFailure.message}`,
    )
  }
  if (failure) {
    throw new Error(`${failure.message}\nstdout:\n${stdout}\nstderr:\n${stderr}`, { cause: failure })
  }
  if (exitFailure) throw exitFailure
}

function verifyOfflineArchive(root) {
  const manifest = JSON.parse(readFileSync(join(root, '.bundle-manifest.json'), 'utf8'))
  const archive = join(root, manifest.offlineStore?.path ?? '')
  if (!existsSync(archive)) throw new Error(`prepared offline Store archive is missing: ${archive}`)
  const actual = createHash('sha256').update(readFileSync(archive)).digest('hex')
  if (actual !== manifest.offlineStore.archiveSha256) {
    throw new Error(`prepared offline Store archive digest mismatch: expected ${manifest.offlineStore.archiveSha256}, found ${actual}`)
  }
}

/**
 * Resolve a Settings schema result whether it is a plain value or a volatile proxy.
 *
 * @template T
 * @param {(input: T) => T | {get: () => T}} schema
 * @param {T} input
 * @returns {T}
 */
export function resolveSettingsConfig(schema, input) {
  const parsed = schema(input)
  return typeof parsed?.get === 'function' ? parsed.get() : parsed
}

async function verifyMarketplaceHostContract(root) {
  const entry = join(root, 'packages', 'product', 'plugin-marketplace', 'index.js')
  const marketplace = await import(`${pathToFileURL(entry).href}?verify=${Date.now()}`)
  const parsed = resolveSettingsConfig(marketplace.Config, {
    installState: {
      status: 'error',
      message: syntheticInstallFailure,
      ts: 1,
      pkg: missingMarketplaceRepository,
    },
  })
  if (parsed.installState.pkg !== missingMarketplaceRepository) {
    throw new Error('Plugin Marketplace installState schema discarded its package identity')
  }
  const diagnostic = marketplace.installFailureMessage({
    code: 1,
    stdout: 'ERR_PNPM_FETCH_404 GET https://registry.npmjs.org/missing-npm-package: Not Found - 404',
    stderr: 'dsh: pnpm failed in profile directory /tmp/profile',
  })
  if (!diagnostic.includes('ERR_PNPM_FETCH_404') || diagnostic.includes('profile directory')) {
    throw new Error(`Plugin Marketplace hid the actionable pnpm diagnostic: ${diagnostic}`)
  }
}

/**
 * Run every default feature, then install optional Harbor into that same isolated Profile and restart.
 * Signed native download/install admission is a separate candidate gate.
 * @param {string} root Prepared and installed Harness.
 * @param {string} productRuntimeRoot Prepared Harbor Python runtime.
 * @param {{capabilities?: object[], desktopOverlayPath?: string, documentFixtureDirectory?: string}} options Prepared packages, the real Rust-rendered desktop overlay, and verifier-owned synthetic fixtures.
 * @returns {Promise<void>}
 */
export async function verifyPreparedProduct(root = harnessRoot, productRuntimeRoot = runtimeRoot, options = {}) {
  const desktopOverlayPath = options.desktopOverlayPath ?? process.env.YOURBUDDY_RELEASE_DESKTOP_OVERLAY
  if (!desktopOverlayPath || !existsSync(desktopOverlayPath)) {
    throw new Error('release verification requires the desktop overlay rendered by the native product implementation')
  }
  const world = mkdtempSync(join(tmpdir(), 'yourbuddy-release-smoke-'))
  const lifetime = { preserve: false }
  let preparedRootVerified = false
  try {
    verifyOfflineArchive(root)
    preparedRootVerified = true
    assertCoreProductComposition(root)
    const lockPeers = assertBundledProductPeerLinks(root)
    const installedPeers = assertInstalledProductPeerLinks(root)
    if (lockPeers !== installedPeers) {
      throw new Error(`product peer verification count changed after install: lock=${lockPeers}, installed=${installedPeers}`)
    }
    await verifyMarketplaceHostContract(root)
    writeDocumentPreviewFixtures(world, options.documentFixtureDirectory)
    await runHostSmoke(root, productRuntimeRoot, desktopOverlayPath, world, lifetime, 'core')
    console.log(`verify-product-release: default product passed (${CORE_PRODUCT_CLIENT_IDS.length} product Clients, Codex default, lightweight browser, PDF/DOCX/PPTX/XLSX viewing and reopen in Chromium)`)
    const capabilities = readReleaseCapabilities(options.capabilities ?? RELEASE_CAPABILITIES.map(entry => {
      const packageRoot = join(desktopRoot, 'bundled', 'capabilities', entry.key)
      const manifest = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'))
      return { ...entry, root: packageRoot, version: manifest.version }
    }))
    await runHostSmoke(root, productRuntimeRoot, desktopOverlayPath, world, lifetime, 'installed', capabilities)
    console.log(`verify-product-release: optional Harbor installed phase passed (${installedPeers} core peer links, ${PRODUCT_CLIENT_IDS.length} assembled product Clients, real Profile installation and Harbor Python readiness)`)
  }
  finally {
    if (!lifetime.preserve) {
      if (preparedRootVerified) removeWorkspaceInstallState(root)
      rmSync(world, { recursive: true, force: true })
    }
  }
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isDirectRun) {
  verifyPreparedProduct().catch(error => {
    console.error(`verify-product-release: ${error.stack ?? error.message}`)
    process.exitCode = 1
  })
}
