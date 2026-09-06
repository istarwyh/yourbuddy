/** Verify the prepared YourHarness product graph through its installed runtime and Web Host. */
import { createHash } from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import { createServer } from 'node:http'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

import {
  assertBundledProductPeerLinks,
  isBundledRuntimePackage,
  readWorkspacePackageVersions,
} from './product-plugin-compatibility.mjs'
import { removeWorkspaceInstallState } from './prepare-harness-offline-store.mjs'
import { verifyWorkbenchBranding } from './workbench-branding-smoke.mjs'

const desktopRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const harnessRoot = join(desktopRoot, 'bundled', 'harness')
const runtimeRoot = join(desktopRoot, 'bundled', 'yourharness-runtime')
const installedChromiumExecutable = chromium.executablePath()
const desktopShellSource = readFileSync(join(desktopRoot, 'shell.html'), 'utf8')
const desktopI18nSource = readFileSync(join(desktopRoot, 'desktop-i18n.js'), 'utf8')
const desktopAppIcon = readFileSync(join(desktopRoot, 'app-icon.png'))
const desktopUpdateSmokeResult = 'Development build smoke does not check desktop updates'
const desktopProxySystemSettings = {
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
  },
  effectiveError: '',
}
const missingMarketplaceRepository = 'missing-npm-package'
const validMarketplaceRepository = 'verified-plugin-repository'
const validMarketplacePackage = '@yourharness-test/verified-plugin'
const missingMarketplacePackage = '@yourharness-test/repository-sdk'
const validMarketplaceNonPluginPackage = '@yourharness-test/verified-sdk'
const desktopExternalLinkSmokeUrl = 'https://github.com/gitroomhq/postiz-app'
const syntheticInstallFailure = 'synthetic install failure'
const syntheticHostProxy = 'http://127.0.0.1:9'

/** Product Client packages that must execute during the assembled Web smoke. */
export const PRODUCT_CLIENT_IDS = [
  'dsh-codex-auth',
  'dsh-better-sidebar',
  'dsh-context-doctor',
  'dsh-plugin-marketplace',
  'dsh-personal-workbench',
  'dsh-harbor-evolution',
]

const PRODUCT_CLIENT_ENTRY_IDS = {
  'dsh-codex-auth': 'yourharness-release-codex-auth',
  'dsh-better-sidebar': 'yourharness-release-better-sidebar',
  'dsh-context-doctor': 'yourharness-release-context-doctor',
  'dsh-plugin-marketplace': 'yourharness-release-plugin-marketplace',
  'dsh-personal-workbench': 'yourharness-release-personal-workbench',
  'dsh-harbor-evolution': 'yourharness-release-harbor-evolution',
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
  for (const id of PRODUCT_CLIENT_IDS) {
    const entryId = PRODUCT_CLIENT_ENTRY_IDS[id]
    if (resource.includes(`${id}/client.js`) || resource.includes(`${entryId}/client.js`)) {
      target[id] = status
    }
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
    DEEPSEEK_API_KEY: 'yourharness-release-smoke-no-model-call',
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
 * Prove installed product peers point at the same workspace packages as the Host.
 *
 * @param {string} root
 * @returns {number}
 */
export function assertInstalledProductPeerLinks(root) {
  const workspace = readWorkspacePackageVersions(root)
  const productRoot = join(root, 'packages', 'product')
  let checked = 0
  for (const plugin of ['harbor-evolution', 'dsh-codex-auth', 'dsh-better-sidebar', 'context-doctor', 'plugin-marketplace', 'personal-workbench']) {
    const pluginRoot = join(productRoot, plugin)
    const manifest = JSON.parse(readFileSync(join(pluginRoot, 'package.json'), 'utf8'))
    for (const name of Object.keys(manifest.peerDependencies ?? {})) {
      if (!isBundledRuntimePackage(name)) continue
      const expected = workspace.get(name)
      if (!expected) throw new Error(`${manifest.name} has no bundled workspace target for ${name}`)
      const installed = join(pluginRoot, 'node_modules', ...name.split('/'))
      if (!existsSync(installed)) throw new Error(`${manifest.name} did not install bundled peer ${name}`)
      const actualRoot = realpathSync(installed)
      const expectedRoot = realpathSync(expected.root)
      if (actualRoot !== expectedRoot) {
        throw new Error(`${manifest.name} installed a second ${name}: ${actualRoot}`)
      }
      checked += 1
    }
  }
  if (checked === 0) throw new Error('no installed YourHarness product peer links were checked')
  return checked
}

/**
 * Build the isolated overlay used by the local release compatibility smoke.
 *
 * @param {string} workspace
 * @param {string} productRuntimeRoot
 * @param {string | undefined} proxyVerifier
 * @returns {string}
 */
export function buildProductSmokeOverlay(workspace, productRuntimeRoot, proxyVerifier) {
  const value = path => JSON.stringify(path)
  const proxyVerifierRow = proxyVerifier === undefined ? '' : `    - id: yourharness-release-proxy-verifier
      name: ${value(proxyVerifier)}
`
  return `- id: web
  config:
    searchProvider: codex

- id: agent-presets
  config:
    default: codex

- insert:
    - id: yourharness-release-subagent-codex
      name: '@deepseek-ai/dsh-subagent-codex'
    - id: yourharness-release-codex-auth
      name: dsh-codex-auth
    - id: yourharness-release-better-sidebar
      name: dsh-better-sidebar
    - id: yourharness-release-context-doctor
      name: dsh-context-doctor
    - id: yourharness-release-plugin-marketplace
      name: dsh-plugin-marketplace
    - id: yourharness-release-personal-workbench
      name: dsh-personal-workbench
${proxyVerifierRow}    - id: yourharness-release-harbor-evolution
      name: dsh-harbor-evolution
      config:
        projectRoot: ${value(workspace)}
        jobsDir: "jobs"
        harborBin: ${value(join(productRuntimeRoot, 'venv', 'bin', 'harbor'))}
        harborDshBin: ${value(join(productRuntimeRoot, 'venv', 'bin', 'harbor-dsh'))}
        pythonPath: ""
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
  throw new Error(`YourHarness product Host did not dispose cleanly (${status})\nstdout:\n${stdout}\nstderr:\n${stderr}`)
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
  if (response.status !== 303 || response.headers.get('location') !== '/') {
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
 * Reject an assembled page that did not execute every product Client cleanly.
 *
 * @param {{
 *   clientResponses: Record<string, number>,
 *   pageErrors: string[],
 *   consoleErrors: string[],
 *   bootFailureCount: number,
 *   frameCount: number,
 * }} result
 */
export function assertProductClientBoot(result) {
  const failures = []
  if (result.bootFailureCount > 0) failures.push('the Web boot page reported a plugin activation failure')
  if (result.frameCount === 0) failures.push('the assembled Web application frame never mounted')
  for (const id of PRODUCT_CLIENT_IDS) {
    const status = result.clientResponses[id]
    if (status === undefined) failures.push(`${id} Client bundle was not requested`)
    else if (status !== 200) failures.push(`${id} Client bundle returned HTTP ${status}`)
  }
  for (const error of result.pageErrors) failures.push(`pageerror: ${error}`)
  for (const error of result.consoleErrors) failures.push(`console error: ${error}`)
  if (failures.length > 0) {
    throw new Error(`YourHarness product Client boot failed:\n${failures.map(failure => `- ${failure}`).join('\n')}`)
  }
}

async function exerciseMarketplace(settings, { openExternalLinks = false } = {}) {
  await settings.getByText(`YourHarness-test/${missingMarketplaceRepository}`, { exact: true }).click()
  await settings.getByText(
    'No npm package both links to this repository and declares dsh.bundle.patch. Follow the repository README instead.',
    { exact: true },
  ).waitFor({ timeout: 10_000 })
  await settings.getByText(`Install failed: ${syntheticInstallFailure}`, { exact: true }).waitFor({ timeout: 10_000 })
  const unavailable = settings.getByRole('button', { name: 'One-click unavailable', exact: true })
  await unavailable.waitFor({ timeout: 10_000 })
  if (await unavailable.isEnabled()) {
    throw new Error('Marketplace enabled one-click install for a repository without an npm package')
  }

  await settings.getByText(`YourHarness-test/${validMarketplaceRepository}`, { exact: true }).click()
  await settings.getByText(
    `Installable npm package: ${validMarketplacePackage}@1.2.3`,
    { exact: true },
  ).waitFor({ timeout: 10_000 })
  if (openExternalLinks) {
    await settings.getByRole('link', { name: 'Open GitHub repo ↗', exact: true }).click()
    await settings.getByRole('link', { name: 'Search npm ↗', exact: true }).click()
  }
  const install = settings.getByRole('button', { name: 'Install', exact: true })
  await install.waitFor({ timeout: 10_000 })
  if (!await install.isEnabled()) {
    throw new Error('Marketplace did not enable one-click install for a verified npm package')
  }
  await install.click()
  await settings.getByRole('button', {
    name: `Install ${validMarketplacePackage}?`,
    exact: true,
  }).waitFor({ timeout: 10_000 })
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

function buildDesktopBridgeSmokeShell(baseUrl) {
  const externalI18n = '<script src="desktop-i18n.js"></script>'
  if (desktopShellSource.split(externalI18n).length !== 2) {
    throw new Error('desktop shell must contain exactly one desktop-i18n.js script')
  }
  if (/<\/script/iu.test(desktopI18nSource)) {
    throw new Error('desktop-i18n.js cannot be embedded safely in the release smoke')
  }
  const encodedBaseUrl = JSON.stringify(baseUrl).replaceAll('<', '\\u003c')
  const bootstrap = `<script>
    window.__DSH_WEB_URL__ = ${encodedBaseUrl}
    window.__DSH_LOCALE__ = 'en'
    window.__DSH_CHROME__ = { os: 'macos', titlebar_height: 32, left: [], right: [] }
    window.__YOURHARNESS_DESKTOP_COMMANDS__ = []
    window.__YOURHARNESS_NATIVE_PROXY_TEST_RESULT__ = {
      ok: true,
      status: 204,
      proxied: true,
      errorCode: '',
      proxyMode: 'system',
      caSource: 'custom',
    }
    window.__TAURI__ = {
      core: {
        invoke: async (command, args) => {
          window.__YOURHARNESS_DESKTOP_COMMANDS__.push({ command, args })
          if (command === 'open_external_url') return
          if (command === 'open_marketplace_url') return
          if (command === 'check_for_updates') return ${JSON.stringify(desktopUpdateSmokeResult)}
          if (command === 'get_network_proxy_settings') return ${JSON.stringify(desktopProxySnapshot)}
          if (command === 'select_ca_certificate') return ${JSON.stringify(desktopProxySystemSettings.caCertificatePath)}
          if (command === 'test_network_proxy_settings') return window.__YOURHARNESS_NATIVE_PROXY_TEST_RESULT__
          if (command === 'save_network_proxy_settings') return {
            ...${JSON.stringify(desktopProxySnapshot)},
            settings: args.settings,
            effective: {
              ...args.settings,
              httpProxy: ${JSON.stringify(desktopProxySnapshot.system.httpProxy)},
              httpsProxy: ${JSON.stringify(desktopProxySnapshot.system.httpsProxy)},
              noProxy: ${JSON.stringify(desktopProxySnapshot.system.noProxy)},
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

async function startDesktopBridgeSmokeServer(baseUrl) {
  const html = buildDesktopBridgeSmokeShell(baseUrl)
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

async function runBrowserSmoke(baseUrl, env) {
  let browser
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
    const page = await browser.newPage({ viewport: { width: 1680, height: 1000 }, locale: 'en-US' })
    await page.addInitScript(() => {
      window.__YOURHARNESS_COPIED_LINKS__ = []
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async value => { window.__YOURHARNESS_COPIED_LINKS__.push(value) },
        },
      })
    })
    const pageErrors = []
    const consoleErrors = []
    const clientResponses = {}
    page.on('pageerror', error => { pageErrors.push(String(error)) })
    page.on('console', message => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })
    page.on('response', response => {
      recordProductClientResponse(clientResponses, response.url(), response.status())
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
              full_name: `YourHarness-test/${name}`,
              description: `Release smoke repository ${name}`,
              stargazers_count: 2 - index,
              updated_at: '2026-08-30T00:00:00Z',
              language: 'JavaScript',
              html_url: `https://github.com/YourHarness-test/${name}`,
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
            links: { repository: `git+https://github.com/YourHarness-test/${repository}.git` },
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
              smoke: { upstreamRepository: `https://github.com/YourHarness-test/${validMarketplaceRepository}` },
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
            repository: `git+https://github.com/YourHarness-test/${repository}.git`,
          }),
        })
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    })

    const navigation = await page.goto(baseUrl, { waitUntil: 'load', timeout: 30_000 })
    if (navigation === null || navigation.status() !== 200) {
      throw new Error(`YourHarness Web navigation returned HTTP ${navigation?.status() ?? 'no response'}`)
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
    })
    await completeProductOnboarding(page)
    await verifyWorkbenchBranding(page)
    await page.getByRole('button', { name: 'Codex', exact: true }).waitFor({ timeout: 10_000 })
    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    const settings = page.getByRole('dialog', { name: 'Settings' })
    await settings.waitFor({ timeout: 10_000 })
    const update = settings.getByRole('button', { name: 'Check and update', exact: true })
    await update.waitFor({ timeout: 10_000 })
    if (await update.isEnabled()) {
      throw new Error('standalone YourHarness Web exposed the desktop-only update action as enabled')
    }
    const restart = settings.getByRole('button', { name: 'Restart YourHarness', exact: true })
    await restart.waitFor({ timeout: 10_000 })
    if (await restart.isEnabled()) {
      throw new Error('standalone YourHarness Web exposed the desktop-only restart action as enabled')
    }
    const proxyTest = settings.getByRole('button', { name: 'Test ChatGPT connection', exact: true })
    await proxyTest.waitFor({ timeout: 10_000 })
    if (await proxyTest.isEnabled()) {
      throw new Error('standalone YourHarness Web exposed desktop network proxy testing as enabled')
    }
    const proxySave = settings.getByRole('button', { name: 'Save and restart YourHarness', exact: true })
    await proxySave.waitFor({ timeout: 10_000 })
    if (await proxySave.isEnabled()) {
      throw new Error('standalone YourHarness Web exposed desktop network proxy persistence as enabled')
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
    })

    const desktopBridge = await startDesktopBridgeSmokeServer(baseUrl)
    desktopBridgeServer = desktopBridge.server
    const shellNavigation = await page.goto(desktopBridge.url, { waitUntil: 'load', timeout: 30_000 })
    if (shellNavigation === null || shellNavigation.status() !== 200) {
      throw new Error(`YourHarness desktop shell navigation returned HTTP ${shellNavigation?.status() ?? 'no response'}`)
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
    await completeProductOnboarding(embedded)
    const externalLink = embedded.locator('#yourharness-external-link-smoke')
    await embedded.locator('body').evaluate((body, url) => {
      const anchor = document.createElement('a')
      anchor.id = 'yourharness-external-link-smoke'
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
    const copiedLinks = await embedded.locator('body').evaluate(() => window.__YOURHARNESS_COPIED_LINKS__)
    if (JSON.stringify(copiedLinks) !== JSON.stringify([desktopExternalLinkSmokeUrl])) {
      throw new Error(`desktop link menu copied unexpected destinations: ${JSON.stringify(copiedLinks)}`)
    }
    await page.keyboard.press('Escape')
    await externalLink.click()
    await page.waitForFunction(
      url => window.__YOURHARNESS_DESKTOP_COMMANDS__?.some(
        entry => entry.command === 'open_external_url' && entry.args?.url === url,
      ) === true,
      desktopExternalLinkSmokeUrl,
      { timeout: 10_000 },
    )
    await embedded.getByRole('button', { name: 'Settings', exact: true }).click()
    const embeddedSettings = embedded.getByRole('dialog', { name: 'Settings' })
    await embeddedSettings.waitFor({ timeout: 10_000 })
    await embeddedSettings.getByRole('button', { name: 'Plugin Marketplace', exact: true }).click()
    await embeddedSettings.getByPlaceholder('Search plugins (keyword, or empty to browse all)…', { exact: true }).waitFor({ timeout: 10_000 })
    await exerciseMarketplace(embeddedSettings, { openExternalLinks: true })
    await embeddedSettings.getByRole('button', { name: 'General', exact: true }).click()
    const embeddedUpdate = embeddedSettings.getByRole('button', { name: 'Check and update', exact: true })
    await embeddedUpdate.waitFor({ timeout: 10_000 })
    if (!await embeddedUpdate.isEnabled()) {
      throw new Error('desktop YourHarness shell did not enable the application update action')
    }
    await embeddedUpdate.click()
    await embeddedSettings.getByText(desktopUpdateSmokeResult, { exact: true }).waitFor({ timeout: 10_000 })
    const embeddedRestart = embeddedSettings.getByRole('button', { name: 'Restart YourHarness', exact: true })
    await embeddedRestart.waitFor({ timeout: 10_000 })
    if (!await embeddedRestart.isEnabled()) {
      throw new Error('desktop YourHarness shell did not enable the application restart action')
    }
    await embeddedRestart.click()
    await embeddedSettings.getByText(
      'Stopping the private Host and restarting YourHarness…',
      { exact: true },
    ).waitFor({ timeout: 10_000 })
    await page.waitForFunction(
      () => window.__YOURHARNESS_DESKTOP_COMMANDS__?.some(entry => entry.command === 'restart_app') === true,
      undefined,
      { timeout: 10_000 },
    )
    const lifecycleCommands = await page.evaluate(() => window.__YOURHARNESS_DESKTOP_COMMANDS__)
    const expectedLifecycleCommands = [
      {
        command: 'open_external_url',
        args: { url: desktopExternalLinkSmokeUrl },
      },
      { command: 'get_network_proxy_settings' },
      {
        command: 'open_marketplace_url',
        args: { url: `https://github.com/YourHarness-test/${validMarketplaceRepository}` },
      },
      {
        command: 'open_marketplace_url',
        args: { url: `https://www.npmjs.com/package/${validMarketplacePackage}` },
      },
      { command: 'get_network_proxy_settings' },
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
    })

    const proxyPage = await browser.newPage({ viewport: { width: 1680, height: 1000 }, locale: 'en-US' })
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
      if (message.type() === 'error') consoleErrors.push(message.text())
    })
    proxyPage.on('response', response => {
      recordProductClientResponse(proxyClientResponses, response.url(), response.status())
    })
    await proxyPage.route('**/api/yourharness/network-proxy/test', route => {
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
      throw new Error(`YourHarness proxy shell navigation returned HTTP ${proxyShellNavigation?.status() ?? 'no response'}`)
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
      'Desktop draft: HTTP 204 (macOS system proxy; system CAs + custom CA); current Node Host: HTTP 200 (direct; system CAs). The Node Host proxy mode or CA source still reflects the previous launch. Save, restart, and test again.',
      { exact: true },
    ).waitFor({ timeout: 10_000 })
    if (hostProxyDiagnosticRequests !== 1) {
      throw new Error(`desktop proxy test sent ${hostProxyDiagnosticRequests} Node Host diagnostic requests`)
    }
    await proxyPage.evaluate(() => {
      window.__YOURHARNESS_NATIVE_PROXY_TEST_RESULT__ = {
        ok: false,
        status: 0,
        proxied: true,
        errorCode: 'UNKNOWN_ISSUER',
        proxyMode: 'system',
        caSource: 'custom',
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
      'Desktop draft: failed: UNKNOWN_ISSUER (macOS system proxy; system CAs + custom CA); current Node Host: failed: UNABLE_TO_VERIFY_LEAF_SIGNATURE (direct; system CAs). The Node Host proxy mode or CA source still reflects the previous launch. Save, restart, and test again. A TLS certificate trust error was detected. Trust the enterprise root in the macOS Keychain or select its PEM CA; YourHarness does not disable certificate verification.',
      { exact: true },
    ).waitFor({ timeout: 10_000 })
    if (hostProxyDiagnosticRequests !== 2) {
      throw new Error(`desktop proxy tests sent ${hostProxyDiagnosticRequests} Node Host diagnostic requests`)
    }
    const embeddedProxySave = proxySettings.getByRole('button', { name: 'Save and restart YourHarness', exact: true })
    await embeddedProxySave.click()
    await proxySettings.getByText(
      'Settings saved. Stopping the private Host and restarting YourHarness…',
      { exact: true },
    ).waitFor({ timeout: 10_000 })
    const proxyCommands = await proxyPage.evaluate(() => window.__YOURHARNESS_DESKTOP_COMMANDS__)
    const expectedProxyCommands = [
      { command: 'get_network_proxy_settings' },
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
    })
  }
  catch (error) {
    failure = error
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
    ? new AggregateError(closeFailures, 'YourHarness desktop shell and browser teardown both failed')
    : closeFailures[0]
  if (failure && closeFailure) {
    throw new AggregateError([failure, closeFailure], 'YourHarness product browser smoke and teardown both failed')
  }
  if (failure) throw failure
  if (closeFailure) throw closeFailure
}

async function runHostSmoke(root, productRuntimeRoot) {
  const world = mkdtempSync(join(tmpdir(), 'yourharness-release-smoke-'))
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
const { EnvHttpProxyAgent, getGlobalDispatcher } = require('undici')

export const name = 'yourharness-release-proxy-verifier'

export async function apply() {
  const deadline = Date.now() + 1_000
  while (!(getGlobalDispatcher() instanceof EnvHttpProxyAgent)) {
    if (Date.now() >= deadline) throw new Error('application proxy Dispatcher is not active')
    await new Promise(resolve => { setTimeout(resolve, 10) })
  }
}
`)
  writeFileSync(overlay, buildProductSmokeOverlay(world, productRuntimeRoot, proxyVerifier))
  const env = createReleaseChildEnvironment(world, productRuntimeRoot)
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
  writeFileSync(join(env.DSH_HOME, 'settings.yaml'), `plugin-marketplace:
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
        rejectReady(new Error(`YourHarness product Host did not become ready within 60s\nstdout:\n${stdout}\nstderr:\n${stderr}`))
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
          `YourHarness product Host exited before readiness (code=${code ?? 'null'}, signal=${signal ?? 'null'})\nstdout:\n${stdout}\nstderr:\n${stderr}`,
        ))
      })
    })

    const authenticated = await authenticateHost(baseUrl)
    const headers = { cookie: authenticated.cookie }
    await fetchOk(authenticated.baseUrl, { headers })
    const audit = await (await fetchOk(
      `${authenticated.baseUrl}/api/context-doctor/audit?detail=developer`,
      { headers },
    )).json()
    if (audit?.ok !== true) throw new Error('Context Doctor release smoke returned an invalid response')
    await runBrowserSmoke(baseUrl, env)
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
  if (outcome !== undefined && (outcome.code !== null || outcome.signal !== null)) {
    rmSync(world, { recursive: true, force: true })
  }
  else if (exitFailure) {
    exitFailure = new Error(`${exitFailure.message}\nrelease smoke state preserved at ${world}`, { cause: exitFailure })
  }
  if (failure && exitFailure) {
    throw new AggregateError([failure, exitFailure], 'YourHarness product smoke and Host teardown both failed')
  }
  if (failure) throw failure
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

async function verifyMarketplaceHostContract(root) {
  const entry = join(root, 'packages', 'product', 'plugin-marketplace', 'index.js')
  const marketplace = await import(`${pathToFileURL(entry).href}?verify=${Date.now()}`)
  const parsed = marketplace.Config({
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

/** Run the complete local release compatibility smoke. */
export async function verifyPreparedProduct(root = harnessRoot, productRuntimeRoot = runtimeRoot) {
  const commandWorld = mkdtempSync(join(tmpdir(), 'yourharness-release-command-'))
  const env = createReleaseChildEnvironment(commandWorld, productRuntimeRoot)
  try {
    verifyOfflineArchive(root)
    const lockPeers = assertBundledProductPeerLinks(root)
    const installedPeers = assertInstalledProductPeerLinks(root)
    if (lockPeers !== installedPeers) {
      throw new Error(`product peer verification count changed after install: lock=${lockPeers}, installed=${installedPeers}`)
    }
    await verifyMarketplaceHostContract(root)
    run(join(productRuntimeRoot, 'venv', 'bin', 'harbor'), ['--version'], { cwd: commandWorld, env })
    run(join(productRuntimeRoot, 'venv', 'bin', 'harbor-dsh'), ['--help'], { cwd: commandWorld, env })
    await runHostSmoke(root, productRuntimeRoot)
    console.log(`verify-product-release: ${installedPeers} bundled runtime peer links, ${PRODUCT_CLIENT_IDS.length} assembled Client plugins, external links, Plugin Marketplace, Network proxy, and Application lifecycle controls passed`)
  }
  finally {
    removeWorkspaceInstallState(root)
    rmSync(commandWorld, { recursive: true, force: true })
  }
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isDirectRun) {
  verifyPreparedProduct().catch(error => {
    console.error(`verify-product-release: ${error.message}`)
    process.exitCode = 1
  })
}
