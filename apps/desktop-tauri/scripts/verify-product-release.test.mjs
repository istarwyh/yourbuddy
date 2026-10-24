import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import {
  PRODUCT_CLIENT_IDS,
  RELEASE_DOCUMENT_PREVIEWS,
  writeDocumentPreviewFixtures,
  exerciseDocumentPreviews,
  exerciseLightweightServices,
  exerciseWorkbenchDocumentPreviews,
  recordPreviewNetworkEvent,
  saveBrowserFailure,
  CORE_PRODUCT_CLIENT_IDS,
  RELEASE_CAPABILITIES,
  assertCoreProductComposition,
  assertHarborPythonReady,
  buildCapabilityPeerProbe,
  readReleaseCapabilities,
  authenticateHost,
  assertCleanChildExit,
  assertCodexAuthStatusProbe,
  assertCodexModelCatalogProbe,
  assertProductClientBoot,
  assertResolvedWorkspacePackage,
  buildProductSmokeOverlay,
  createReleaseChildEnvironment,
  desktopWebviewCookie,
  recordProductClientResponse,
  resolveSettingsConfig,
  stopChild,
  verifyPreparedProduct,
} from './verify-product-release.mjs'

test('installed peer verification follows Node resolution without a plugin-local link', () => {
  const root = mkdtempSync(join(tmpdir(), 'yourbuddy-peer-resolution-'))
  try {
    const pluginRoot = join(root, 'packages', 'product', 'fixture-plugin')
    const expectedRoot = join(root, 'packages', 'runtime')
    const otherRoot = join(root, 'packages', 'other-runtime')
    mkdirSync(pluginRoot, { recursive: true })
    mkdirSync(expectedRoot, { recursive: true })
    mkdirSync(otherRoot, { recursive: true })
    mkdirSync(join(root, 'node_modules'), { recursive: true })
    writeFileSync(join(pluginRoot, 'package.json'), '{"name":"fixture-plugin","type":"module"}\n')
    writeFileSync(join(expectedRoot, 'package.json'), '{"name":"fixture-runtime","type":"module","main":"index.js"}\n')
    writeFileSync(join(expectedRoot, 'index.js'), 'export default {}\n')
    writeFileSync(join(otherRoot, 'index.js'), 'export default {}\n')
    symlinkSync(expectedRoot, join(root, 'node_modules', 'fixture-runtime'))

    assert.doesNotThrow(() => assertResolvedWorkspacePackage(
      pluginRoot,
      'fixture-plugin',
      'fixture-runtime',
      expectedRoot,
    ))
    assert.throws(
      () => assertResolvedWorkspacePackage(pluginRoot, 'fixture-plugin', 'fixture-runtime', otherRoot),
      /installed a second fixture-runtime/u,
    )
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('release smoke reads plain and volatile Settings schema results', () => {
  const input = { installState: { pkg: 'owner/repository' } }
  assert.equal(resolveSettingsConfig(value => value, input), input)
  assert.equal(resolveSettingsConfig(value => ({ get: () => value }), input), input)
})

test('release smoke accepts only a mounted GPT Auth status channel', () => {
  assert.doesNotThrow(() => assertCodexAuthStatusProbe({
    status: 200,
    body: {
      type: 'server-response',
      rpcId: 'yourbuddy-release-codex-auth-status',
      result: { ok: true, value: { status: { available: false, configured: false } } },
    },
  }))
  assert.throws(
    () => assertCodexAuthStatusProbe({ status: 405, body: {} }),
    /GPT Auth status RPC returned HTTP 405/u,
  )
  assert.throws(
    () => assertCodexAuthStatusProbe({
      status: 200,
      body: {
        type: 'server-response',
        rpcId: 'yourbuddy-release-codex-auth-status',
        result: { ok: true, value: { status: { configured: false } } },
      },
    }),
    /GPT Auth status RPC returned an invalid response/u,
  )
})

test('release smoke accepts the current Codex model through the Host catalog', () => {
  assert.doesNotThrow(() => assertCodexModelCatalogProbe({
    status: 200,
    body: {
      type: 'server-response',
      rpcId: 'yourbuddy-release-codex-model-catalog',
      result: {
        ok: true,
        value: {
          groups: [{
            id: 'openai-codex',
            name: 'OpenAI Codex (chatgpt)',
            models: [{ id: 'gpt-5.6-sol', name: 'GPT-5.6 Sol' }],
          }],
          failures: [],
        },
      },
    },
  }))
  assert.throws(
    () => assertCodexModelCatalogProbe({
      status: 200,
      body: {
        type: 'server-response',
        rpcId: 'yourbuddy-release-codex-model-catalog',
        result: {
          ok: true,
          value: {
            groups: [],
            failures: [{ id: 'openai-codex', name: 'OpenAI Codex (chatgpt)', message: 'failed' }],
          },
        },
      },
    }),
    /Codex model catalog RPC returned an invalid response/u,
  )
})

test('Codex Auth adapter profile satisfies the bundled Pi AI diagnostics contract', () => {
  const adapter = readFileSync(
    join(import.meta.dirname, '..', 'product', 'dsh-codex-auth', 'lib', 'bounded-response-CutNZ8kw.js'),
    'utf8',
  )
  assert.match(
    adapter,
    /modelErrors: \/\* @__PURE__ \*\/ new Map\(\),\s+configuredMaxTokens: \/\* @__PURE__ \*\/ new Map\(\),/u,
  )
})

test('Codex Auth binds settings forms to bundled profile entry ids', () => {
  const codexLib = join(import.meta.dirname, '..', 'product', 'dsh-codex-auth', 'lib')
  const client = readFileSync(join(codexLib, 'client.js'), 'utf8')
  assert.match(client, /const LLM_NAMESPACE = "llm-codex-auth";/u)
  assert.match(client, /const SEARCH_NAMESPACE = "codex-search";/u)
  assert.match(client, /const IMAGE_NAMESPACE = "codex-image";/u)
  assert.doesNotMatch(client, /const LLM_NAMESPACE = "codex-llm";/u)
  assert.match(client, /scope\.mutate\(\[\{/u)
  assert.doesNotMatch(client, /scope\.set\(/u)
  assert.match(client, /IconRefreshOutlineRegular/u)
  assert.match(client, /IconChevronDownOutlineRegular/u)
  assert.doesNotMatch(client, /Icon(?:RefreshOutline16|ChevronDownOutline14)/u)
  assert.match(readFileSync(join(codexLib, 'index.js'), 'utf8'), /longContextEnabled: z\.boolean\(\)\.default\(false\)\.volatile\(\)/u)
  assert.match(readFileSync(join(codexLib, 'search.js'), 'utf8'), /enabled: z\.boolean\(\)\.default\(true\)\.volatile\(\)/u)
  assert.match(readFileSync(join(codexLib, 'image.js'), 'utf8'), /enabled: z\.boolean\(\)\.default\(true\)\.volatile\(\)/u)
  const patch = readFileSync(join(import.meta.dirname, '..', 'product', 'patches', 'codex-auth-current-settings.patch'), 'utf8')
  assert.doesNotMatch(patch, /YOURBUDDY_UPSTREAM\.json/u)
  const settingsSource = readFileSync(join(
    import.meta.dirname,
    '..', '..', '..',
    'packages', 'settings', 'settings', 'src', 'index.ts',
  ), 'utf8')
  assert.match(settingsSource, /'codex-llm': 'llm-codex-auth'/u)
})

test('Oil Creator uses the current Plugins settings tab', () => {
  const oilLib = join(import.meta.dirname, '..', 'product', 'oil-creator', 'lib')
  const host = readFileSync(join(oilLib, 'index.js'), 'utf8')
  const client = readFileSync(join(oilLib, 'client.js'), 'utf8')
  assert.doesNotMatch(host, /registerCreatorSettingsNamespace|settings\.register\(/u)
  assert.match(client, /settings\.plugins\.tab/u)
  assert.doesNotMatch(client, /settings\.plugin\.item/u)
  assert.match(client, /ctx\.slots\.inject\("sidebar\.workspaces\.auxiliary"/u)
  assert.doesNotMatch(client, /ctx\.slots\.inject\("main"/u)
  assert.doesNotMatch(client, /ctx\.slots\.inject\("sidebar\.panellist"/u)
})

test('desktop shell projects window controls into the sidebar with a compact fallback', () => {
  const shell = readFileSync(join(import.meta.dirname, '..', 'shell.html'), 'utf8')
  assert.match(shell, /<body>\s*<aside id="window-chrome-fallback" data-tauri-drag-region>/u)
  assert.match(shell, /yourbuddy\.desktop\.window-controls/u)
  assert.match(shell, /type: 'layout-response'/u)
  assert.match(shell, /setWindowControlsFallbackVisible\(false\)/u)
  assert.doesNotMatch(shell, /id="window-rail"/u)
  assert.doesNotMatch(shell, /#window-chrome-fallback\s*\{[^}]*height:\s*100%/su)
  assert.doesNotMatch(shell, /id="titlebar"/u)
})

test('release smoke exchanges the printed launch token for an authority cookie', async () => {
  const server = createServer((request, response) => {
    assert.equal(request.url, '/?token=release-secret')
    response.writeHead(303, {
      location: './',
      'set-cookie': 'dsh_session=test-cookie; Path=/; HttpOnly; SameSite=Strict',
    })
    response.end()
  })
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  try {
    const address = server.address()
    if (address === null || typeof address === 'string') throw new Error('test server did not bind')
    assert.deepEqual(
      await authenticateHost(`http://127.0.0.1:${address.port}/?token=release-secret`),
      {
        baseUrl: `http://127.0.0.1:${address.port}`,
        cookie: 'dsh_session=test-cookie',
      },
    )
  }
  finally {
    await new Promise((resolve, reject) => {
      server.close(error => {
        if (error) reject(error)
        else resolve()
      })
    })
  }
})

test('release smoke preserves the strict cookie for the same-site desktop shell', () => {
  const suffix = 'A'.repeat(43)
  assert.deepEqual(
    desktopWebviewCookie(
      'http://127.0.0.1:17890/?token=release-secret',
      `dsh-auth-${suffix}=v1.payload.signature`,
    ),
    {
      name: `dsh-auth-${suffix}`,
      value: 'v1.payload.signature',
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Strict',
    },
  )
  assert.throws(
    () => desktopWebviewCookie(
      'http://localhost:17890/?token=release-secret',
      `dsh-auth-${suffix}=v1.payload.signature`,
    ),
    /invalid desktop Host authentication result/,
  )
})

class FakeChild extends EventEmitter {
  exitCode = null
  signalCode = null
  signals = []

  constructor(onSignal) {
    super()
    this.onSignal = onSignal
  }

  kill(signal) {
    this.signals.push(signal)
    this.onSignal(this, signal)
    return true
  }

  close(code, signal) {
    this.exitCode = code
    this.signalCode = signal
    setImmediate(() => { this.emit('close', code, signal) })
  }
}

test('release candidate children receive only an isolated allowlisted environment', () => {
  const root = mkdtempSync(join(tmpdir(), 'yourbuddy-release-env-test-'))
  try {
    const environment = createReleaseChildEnvironment(root, '/product-runtime', {
      PATH: '/credential-wrapper/bin',
      HOME: '/real-home',
      LANG: 'en_US.UTF-8',
      GH_TOKEN: 'gh-secret',
      OPENAI_API_KEY: 'openai-secret',
      AWS_ACCESS_KEY_ID: 'aws-id',
      AWS_SECRET_ACCESS_KEY: 'aws-secret',
      DSH_HOME: '/real-dsh',
      NODE_OPTIONS: '--require=/secret.js',
      SSH_AUTH_SOCK: '/real-agent.sock',
      UNRELATED_AMBIENT_VALUE: 'do-not-forward',
    })

    assert.equal(environment.LANG, 'en_US.UTF-8')
    assert.equal(environment.HOME, join(root, 'home'))
    assert.equal(environment.USERPROFILE, join(root, 'home'))
    assert.equal(environment.DSH_HOME, join(root, 'dsh-home'))
    assert.equal(environment.DSH_AGENTS_HOME, join(root, 'agents'))
    assert.equal(environment.DEEPSEEK_API_KEY, 'yourbuddy-release-smoke-no-model-call')
    assert.ok(environment.PATH.includes('/product-runtime/venv/bin'))
    assert.ok(!environment.PATH.includes('/credential-wrapper/bin'))
    for (const name of [
      'GH_TOKEN',
      'OPENAI_API_KEY',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      'NODE_OPTIONS',
      'SSH_AUTH_SOCK',
      'UNRELATED_AMBIENT_VALUE',
    ]) {
      assert.equal(environment[name], undefined, `${name} must not be inherited`)
    }
    for (const name of ['HOME', 'TMPDIR', 'XDG_CONFIG_HOME', 'DSH_HOME', 'DSH_AGENTS_HOME']) {
      assert.equal(existsSync(environment[name]), true, `${name} must exist`)
    }
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('Host teardown accepts only a normal code-zero exit', () => {
  assert.doesNotThrow(() => assertCleanChildExit({ code: 0, signal: null, timedOut: false, forced: false }))
  assert.throws(
    () => assertCleanChildExit({ code: null, signal: 'SIGTERM', timedOut: false, forced: false }),
    /signal=SIGTERM/,
  )
  assert.throws(
    () => assertCleanChildExit({ code: null, signal: 'SIGKILL', timedOut: true, forced: true }),
    /timedOut=true/,
  )
})

test('Host teardown preserves a graceful code-zero close', async () => {
  const child = new FakeChild((target, signal) => {
    if (signal === 'SIGTERM') target.close(0, null)
  })
  assert.deepEqual(await stopChild(child, {
    gracefulMilliseconds: 50,
    forcedMilliseconds: 50,
  }), {
    code: 0,
    signal: null,
    timedOut: false,
    forced: false,
  })
  assert.deepEqual(child.signals, ['SIGTERM'])
})

test('Host teardown records timeout and SIGKILL independently', async () => {
  const child = new FakeChild((target, signal) => {
    if (signal === 'SIGKILL') target.close(null, 'SIGKILL')
  })
  const outcome = await stopChild(child, {
    gracefulMilliseconds: 5,
    forcedMilliseconds: 50,
  })
  assert.deepEqual(outcome, {
    code: null,
    signal: 'SIGKILL',
    timedOut: true,
    forced: true,
  })
  assert.deepEqual(child.signals, ['SIGTERM', 'SIGKILL'])
  assert.throws(() => assertCleanChildExit(outcome), /forced=true/)
})

test('assembled Client boot requires every product response, mounted UI, and quiet runtime', () => {
  const clientResponses = Object.fromEntries([...PRODUCT_CLIENT_IDS, '@deepseek-ai/dsh-client-ui-sidebar-browser', '@deepseek-ai/dsh-client-ui-sidebar-documentpreview'].map(id => [id, 200]))
  const clean = {
    clientResponses,
    pageErrors: [],
    consoleErrors: [],
    bootFailureCount: 0,
    frameCount: 1,
  }
  assert.doesNotThrow(() => assertProductClientBoot(clean))
  assert.throws(
    () => assertProductClientBoot({
      ...clean,
      clientResponses: { ...clientResponses, 'dsh-context-doctor': 500 },
      pageErrors: ['ReferenceError: missing runtime'],
      consoleErrors: ['plugin activation failed'],
    }),
    /dsh-context-doctor Client bundle returned HTTP 500[\s\S]*pageerror:[\s\S]*console error:/,
  )
  const missing = { ...clientResponses }
  delete missing['dsh-harbor-evolution']
  assert.throws(
    () => assertProductClientBoot({ ...clean, clientResponses: missing, frameCount: 0 }),
    /assembled Web application frame never mounted[\s\S]*dsh-harbor-evolution Client bundle was not requested/,
  )
})

test('release smoke observes product Clients inside a DSH combo response', () => {
  const responses = {}
  recordProductClientResponse(
    responses,
    'http://127.0.0.1:3080/plugins/??llm-codex-auth/client.js,context-doctor/client.js&rev=abc123',
    200,
  )
  assert.deepEqual(responses, {
    'dsh-codex-auth': 200,
    'dsh-context-doctor': 200,
  })

  recordProductClientResponse(
    responses,
    'http://127.0.0.1:3080/plugins/dsh-harbor-evolution/client.js?rev=legacy',
    503,
  )
  recordProductClientResponse(
    responses,
    'http://127.0.0.1:3080/plugins/ego-browser/client.js?rev=browser',
    200,
  )
  assert.equal(responses['dsh-harbor-evolution'], 503)
  assert.equal(responses['dsh-ego-browser'], 200)
})

test('smoke diagnostics never inject product rows or change shipped defaults', () => {
  const core = buildProductSmokeOverlay('/tmp/workspace', '/tmp/runtime', '/tmp/proxy-verifier.mjs')
  assert.match(core, /id: yourbuddy-release-proxy-verifier/u)
  assert.doesNotMatch(core, /sandbox-policy|approval|agent-preset-registry|tool-skill|better-sidebar|harbor-evolution/u)
  for (const name of PRODUCT_CLIENT_IDS) assert.ok(!core.includes(`name: ${name}`))
  const installed = buildProductSmokeOverlay('/tmp/workspace', '/tmp/runtime', '/tmp/proxy-verifier.mjs', 'installed')
  assert.match(installed, /id: harbor-evolution/u)
  assert.match(installed, /harborBin: "\/tmp\/runtime\/venv\/bin\/harbor"/u)
  assert.doesNotMatch(installed, /name: dsh-harbor-evolution|default: codex|preset-creator/u)
})

test('core requires all eight default Clients and both lightweight services, and rejects optional Clients', () => {
  const clientResponses = Object.fromEntries([
    ...CORE_PRODUCT_CLIENT_IDS, '@deepseek-ai/dsh-client-ui-sidebar-browser', '@deepseek-ai/dsh-client-ui-sidebar-documentpreview',
  ].map(id => [id, 200]))
  const result = { clientResponses, frameCount: 1, bootFailureCount: 0, pageErrors: [], consoleErrors: [] }
  assert.doesNotThrow(() => assertProductClientBoot(result, 'core'))
  for (const name of Object.keys(clientResponses)) {
    const missing = { ...clientResponses }
    delete missing[name]
    assert.throws(() => assertProductClientBoot({ ...result, clientResponses: missing }, 'core'), /Client bundle was not requested/u)
  }
  assert.throws(() => assertProductClientBoot({ ...result, clientResponses: { ...clientResponses, 'dsh-harbor-evolution': 200 } }, 'core'), /optional Client was requested by core/u)
  assert.throws(() => assertProductClientBoot(result, 'installed'), /dsh-harbor-evolution Client bundle was not requested/u)
})

test('prepared core inventory rejects a missing core package and an included optional package', () => {
  const root = mkdtempSync(join(tmpdir(), 'yourbuddy-core-roster-'))
  try {
    for (const name of CORE_PRODUCT_CLIENT_IDS) {
      const dir = join(root, 'packages', 'product', name.replaceAll('/', '-'))
      mkdirSync(dir, { recursive: true })
      writeFileSync(join(dir, 'package.json'), JSON.stringify({ name }))
    }
    assert.doesNotThrow(() => assertCoreProductComposition(root))
    const extra = join(root, 'packages', 'product', 'extra')
    mkdirSync(extra)
    writeFileSync(join(extra, 'package.json'), JSON.stringify({ name: 'dsh-harbor-evolution' }))
    assert.throws(() => assertCoreProductComposition(root), /core product package roster differs/u)
    rmSync(extra, { recursive: true })
    rmSync(join(root, 'packages', 'product', CORE_PRODUCT_CLIENT_IDS[0]), { recursive: true })
    assert.throws(() => assertCoreProductComposition(root), /core product package roster differs/u)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('the optional Harbor input must carry its Python prerequisite, actual entries and ordinary dependencies', () => {
  const root = mkdtempSync(join(tmpdir(), 'yourbuddy-release-inputs-'))
  try {
    const entries = RELEASE_CAPABILITIES.map(entry => {
      const dir = join(root, entry.key)
      mkdirSync(join(dir, 'lib'), { recursive: true })
      writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: entry.packageName, version: '1.0.0', main: 'index.js', dsh: { bundle: { patch: 'cordis.patch.yml' } }, dependencies: { ordinary: '1.0.0' } }))
      for (const name of ['index.js', 'lib/client.js', 'cordis.patch.yml']) writeFileSync(join(dir, name), '')
      mkdirSync(join(dir, 'node_modules', 'ordinary'), { recursive: true })
      writeFileSync(join(dir, 'node_modules', 'ordinary', 'package.json'), '{"name":"ordinary","version":"1.0.0"}')
      return { ...entry, root: dir, version: '1.0.0' }
    })
    assert.deepEqual(readReleaseCapabilities(entries), entries)
    assert.throws(() => readReleaseCapabilities(entries.slice(1)), /prepared Harbor capability/u)
    assert.throws(() => readReleaseCapabilities(entries.map(entry => entry.key === 'harborPlugin' ? { ...entry, requires: [] } : entry)), /descriptor differs/u)
    rmSync(join(entries[0].root, 'lib', 'client.js'))
    assert.throws(() => readReleaseCapabilities(entries), /entry is missing/u)
    writeFileSync(join(entries[0].root, 'lib', 'client.js'), '')
    rmSync(join(entries[0].root, 'node_modules', 'ordinary'), { recursive: true })
    assert.throws(() => readReleaseCapabilities(entries), /dependency is missing/u)
    mkdirSync(join(entries[0].root, 'node_modules', 'ordinary'))
    writeFileSync(join(entries[0].root, 'node_modules', 'ordinary', 'package.json'), '{"name":"@deepseek-ai/cordis"}')
    assert.throws(() => readReleaseCapabilities(entries), /private core peer/u)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('the executable Profile peer diagnostic rejects duplicate peers and absent ordinary dependencies', () => {
  const root = mkdtempSync(join(tmpdir(), 'yourbuddy-runtime-peer-probe-'))
  try {
    const core = join(root, 'packages', 'runtime', 'peer')
    const capability = join(root, 'capability')
    const duplicate = join(root, 'duplicate')
    for (const dir of [core, duplicate, capability]) mkdirSync(dir, { recursive: true })
    for (const dir of [core, duplicate]) {
      writeFileSync(join(dir, 'package.json'), '{"name":"@deepseek-ai/dsh-probe","version":"1.0.0","main":"index.js"}')
      writeFileSync(join(dir, 'index.js'), 'module.exports = {}')
    }
    const ordinary = join(capability, 'node_modules', 'ordinary')
    mkdirSync(ordinary, { recursive: true })
    writeFileSync(join(ordinary, 'package.json'), '{"name":"ordinary","version":"1.0.0","main":"index.js"}')
    writeFileSync(join(ordinary, 'index.js'), 'module.exports = {}')
    writeFileSync(join(capability, 'package.json'), JSON.stringify({ name: 'capability', peerDependencies: { '@deepseek-ai/dsh-probe': '1.0.0' }, dependencies: { ordinary: '1.0.0' } }))
    mkdirSync(join(capability, 'node_modules', '@deepseek-ai'))
    const peerLink = join(capability, 'node_modules', '@deepseek-ai', 'dsh-probe')
    symlinkSync(core, peerLink, 'junction')
    const probe = join(root, 'probe.mjs')
    writeFileSync(probe, `import { createRequire } from 'node:module'\nconst require = createRequire(import.meta.url)\n${buildCapabilityPeerProbe(root, [{ root: capability, packageName: 'capability', key: 'probe' }])}\nverifyCapabilityPeers()\n`)
    const execute = () => {
      const result = spawnSync(process.execPath, [probe], { cwd: root, encoding: 'utf8', env: createReleaseChildEnvironment(root, root), timeout: 10_000 })
      assert.equal(result.error, undefined)
      assert.equal(result.signal, null)
      return result
    }
    const positive = execute()
    assert.equal(positive.status, 0, positive.stderr)
    assert.match(positive.stdout, /capability peer links=1/u)
    rmSync(peerLink)
    symlinkSync(duplicate, peerLink, 'junction')
    const duplicateResult = execute()
    assert.equal(duplicateResult.status, 1)
    assert.match(duplicateResult.stderr, /installed a second @deepseek-ai\/dsh-probe/u)
    rmSync(peerLink)
    symlinkSync(core, peerLink, 'junction')
    rmSync(ordinary, { recursive: true })
    const missing = execute()
    assert.equal(missing.status, 1)
    assert.match(missing.stderr, /did not resolve bundled peer ordinary/u)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('Harbor readiness refuses metadata alone without the real Python interpreter', () => {
  const root = mkdtempSync(join(tmpdir(), 'yourbuddy-harbor-readiness-'))
  try {
    writeFileSync(join(root, 'manifest.json'), JSON.stringify({ integrationVersion: '1.0.0', platform: process.platform, arch: process.arch }))
    assert.throws(() => assertHarborPythonReady(root, '2.0.0', root, {}), /does not match/u)
    assert.throws(() => assertHarborPythonReady(root, '1.0.0', root, {}), /ENOENT/u)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('Plugin Marketplace displays its packaged version in Settings', () => {
  const root = join(import.meta.dirname, '..', 'product', 'plugin-marketplace')
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  const client = readFileSync(join(root, 'client.js'), 'utf8')

  assert.match(client, new RegExp(`var PLUGIN_VERSION = ${JSON.stringify(manifest.version)};`))
  assert.match(client, /className: "__mp_identityName" }, "dsh-plugin-marketplace"/)
  assert.match(client, /className: "__mp_identityVersion" }, "v" \+ PLUGIN_VERSION/)
})


test('rejecting an unprepared input never removes its existing dependency tree', async () => {
  const root = mkdtempSync(join(tmpdir(), 'yourbuddy-release-unprepared-'))
  try {
    mkdirSync(join(root, 'node_modules'))
    writeFileSync(join(root, 'node_modules', 'keep'), 'existing checkout dependency')
    const overlay = join(root, 'native.overlay.yml')
    writeFileSync(overlay, '[]\n')
    await assert.rejects(verifyPreparedProduct(root, root, { desktopOverlayPath: overlay }), /bundle-manifest/u)
    assert.equal(readFileSync(join(root, 'node_modules', 'keep'), 'utf8'), 'existing checkout dependency')
  } finally { rmSync(root, { recursive: true, force: true }) }
})


function previewSidebar({ failFile, blankCanvas = false, missingPage = false, stuckClose = false, replacedTree = false, actions = [] } = {}) {
  const checked = []
  let selected
  const locator = (selector, text) => ({
    first() { return this },
    filter() { return this },
    locator: child => locator(`${selector} ${child}`),
    getByRole: (_role, { name }) => locator(`${selector} ${name}`),
    getByText: value => locator(selector, value),
    isVisible: async () => true,
    click: async () => {},
    scrollIntoViewIfNeeded: async () => { actions.push(`scroll:${selected}:${selector}`) },
    count: async () => selector.startsWith('workbench:')
      ? Number(selector.includes('[title="Files"]') && !replacedTree)
      : missingPage ? 1 : 2,
    evaluate: async callback => callback({
      width: 1, height: 1,
      getContext: () => ({ getImageData: () => ({ data: blankCanvas ? [255, 255, 255, 255] : [0, 0, 0, 255] }) }),
    }),
    waitFor: async wait => {
      if (text !== undefined) {
        assert.equal(wait.timeout, 15_000)
        checked.push({ file: selected, selector, text })
        actions.push(`content:${selected}`)
        if (selected === failFile) throw new Error('preview content missing')
      }
      if (wait.state === 'detached') {
        if (stuckClose) throw new Error('preview remained mounted after close')
        actions.push(`closed:${selected}`)
      }
    },
  })
  return {
    checked, actions,
    workbench: {
      getByRole: (_role, { name }) => ({ click: async () => { assert.equal(name, 'Files'); actions.push('workbench:Files') } }),
      getByText: file => ({
        click: async () => { selected = file; actions.push(`opened:${file}`, `workbench:${file}`) },
        waitFor: async () => { if (replacedTree) throw new Error('workbench tree disappeared') },
      }),
      locator: selector => locator(`workbench:${selector}`),
    },
    sidebar: {
      getByRole: () => ({ click: async () => {} }),
      getByText: file => ({ click: async () => { selected = file; actions.push(`opened:${file}`) } }),
      locator,
    },
  }
}

test('document preview fixtures contain real PDF and OOXML bytes rather than renamed text', () => {
  const root = mkdtempSync(join(tmpdir(), 'yourbuddy-office-fixtures-'))
  try {
    const oldTagFixtures = join(root, 'old-tag-fixtures')
    mkdirSync(oldTagFixtures)
    assert.throws(() => writeDocumentPreviewFixtures(root, oldTagFixtures), /ENOENT/u)
    writeDocumentPreviewFixtures(root)
    for (const preview of RELEASE_DOCUMENT_PREVIEWS) {
      const bytes = readFileSync(join(root, preview.file))
      if (!preview.viewer) assert.equal(bytes.toString(), `${preview.text}\n`)
      else {
        assert.deepEqual(bytes, readFileSync(join(import.meta.dirname, 'fixtures', preview.file)))
        assert.equal(bytes.subarray(0, preview.viewer === 'pdf' ? 5 : 4).toString(), preview.viewer === 'pdf' ? '%PDF-' : 'PK\u0003\u0004')
      }
    }
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('document preview smoke requires four native viewers, page or sheet content, and close/reopen', async () => {
  assert.deepEqual(RELEASE_DOCUMENT_PREVIEWS.map(preview => preview.file.split('.').at(-1)), ['fods', 'txt', 'pdf', 'docx', 'pptx', 'xlsx'])
  const run = async options => {
    const fixture = previewSidebar(options)
    await exerciseDocumentPreviews(fixture.sidebar, fixture.workbench)
    return fixture
  }
  const { checked, actions } = await run()
  for (const preview of RELEASE_DOCUMENT_PREVIEWS) {
    const content = checked.filter(entry => entry.file === preview.file)
    if (!preview.viewer) assert.deepEqual(content, [preview])
    else {
      assert.ok(content.every(entry => entry.selector.includes(`data-document-preview="@deepseek-ai/dsh-client-ui-sidebar-documentpreview/${preview.viewer}"`)))
      for (const text of preview.sheets?.map(sheet => sheet.text) ?? [preview.text, preview.additionalText].filter(Boolean)) {
        assert.equal(content.filter(entry => entry.text === text).length, preview.pages ? 4 : 2)
      }
      assert.equal(actions.filter(action => action === `opened:${preview.file}`).length, 2)
      assert.equal(actions.filter(action => action === `workbench:${preview.file}`).length, 2)
      assert.equal(actions.filter(action => action === `closed:${preview.file}`).length, 2)
      if (preview.pages) assert.equal(actions.filter(action => action.startsWith(`scroll:${preview.file}:`) && action.includes('data-pdf-page="2"')).length, 2)
    }
    await assert.rejects(run({ failFile: preview.file }), /preview content missing/u)
  }
  await assert.rejects(run({ blankCanvas: true }), /has no rendered content/u)
  await assert.rejects(run({ missingPage: true }), /rendered 1 pages instead of 2/u)
  await assert.rejects(run({ stuckClose: true }), /remained mounted after close/u)
  await assert.rejects(run({ replacedTree: true }), /workbench tree disappeared/u)
})

test('preview failure evidence retains request outcomes and errors without auth URLs', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'yourbuddy-preview-evidence-'))
  try {
    const events = []
    recordPreviewNetworkEvent(events, 'http://localhost/sidebar/api/fs.read?token=secret', 'request', { method: 'POST' })
    recordPreviewNetworkEvent(events, 'http://localhost/sidebar/api/fs.read?token=secret', 'response', { status: 200 })
    recordPreviewNetworkEvent(events, 'http://localhost/sidebar/bundle/editor.js?token=secret', 'failed', { error: 'net::ERR_FAILED' })
    recordPreviewNetworkEvent(events, 'http://localhost/api/officeToPdf/render?token=secret', 'response', { status: 200 })
    recordPreviewNetworkEvent(events, 'http://localhost/api/workspaceFiles/read?token=secret', 'response', { status: 200 })
    recordPreviewNetworkEvent(events, 'http://localhost/api/session/create?token=secret', 'request')
    assert.deepEqual(events, [
      { event: 'request', path: '/sidebar/api/fs.read', method: 'POST' },
      { event: 'response', path: '/sidebar/api/fs.read', status: 200 },
      { event: 'failed', path: '/sidebar/bundle/editor.js', error: 'net::ERR_FAILED' },
      { event: 'response', path: '/api/officeToPdf/render', status: 200 },
      { event: 'response', path: '/api/workspaceFiles/read', status: 200 },
    ])
    const diagnostics = { phase: 'core', pageErrors: ['Failed to fetch \"http://localhost/?token=secret\"'], consoleErrors: ['dsh-auth=secret', `dsh-auth-${'a'.repeat(43)}=secret`], previewRequests: events }
    const screenshots = []
    await saveBrowserFailure({ screenshot: async options => { screenshots.push(options) } }, directory, diagnostics)
    assert.deepEqual(screenshots, [{ path: join(directory, 'core-browser-failure.png'), timeout: 5_000 }])
    const retained = readFileSync(join(directory, 'core-browser-failure.json'), 'utf8')
    assert.doesNotMatch(retained, /secret/u)
    assert.deepEqual(JSON.parse(retained).previewRequests, events)
    await assert.doesNotReject(saveBrowserFailure({ screenshot: async () => { throw new Error('closed page') } }, join(directory, 'missing'), diagnostics))
  } finally { rmSync(directory, { recursive: true, force: true }) }
})


test('desktop workbench previews restore the sidebar after content succeeds; standalone browser needs no workbench', async () => {
  const run = async ({ initiallyCollapsed = true, previewFails = false, collapseFails = false, operation = exerciseWorkbenchDocumentPreviews } = {}) => {
    let collapsed = initiallyCollapsed
    const actions = []
    const button = name => ({ click: async () => {
      actions.push(name)
      if (name === 'Open right sidebar') collapsed = false
      if (name === 'Collapse right sidebar' && !collapseFails) collapsed = true
    } })
    const preview = previewSidebar({ failFile: previewFails ? RELEASE_DOCUMENT_PREVIEWS[0].file : undefined, actions })
    const sidebar = {
      ...preview.sidebar,
      getAttribute: async () => String(collapsed),
      getByRole: (role, { name }) => role === 'textbox'
        ? { fill: async () => {}, press: async () => {} }
        : button(name),
      frameLocator: () => ({ getByText: () => ({ waitFor: async () => {} }) }),
    }
    const page = {
      getByRole: (_role, { name }) => button(name),
      locator: selector => selector.includes('[data-workbench-surface="core"]') ? preview.workbench : ({ first: () => selector.includes('[aria-hidden="true"]')
        ? { waitFor: async options => {
          assert.deepEqual(options, { state: 'attached', timeout: 10_000 })
          if (!collapsed) throw new Error('sidebar did not collapse')
          actions.push('confirmed collapsed')
        } }
        : sidebar }),
    }
    try {
      await operation(page)
      return { actions, collapsed }
    } catch (error) { return { actions, collapsed, error } }
  }
  const restored = await run()
  assert.equal(restored.error, undefined)
  assert.equal(restored.collapsed, true)
  assert.deepEqual(restored.actions.slice(-3), [
    'closed:release-office-preview.xlsx', 'Collapse right sidebar', 'confirmed collapsed',
  ])
  const alreadyOpen = await run({ initiallyCollapsed: false })
  assert.equal(alreadyOpen.error, undefined)
  assert.equal(alreadyOpen.collapsed, false)
  assert.ok(!alreadyOpen.actions.includes('Collapse right sidebar'))
  const failedPreview = await run({ previewFails: true })
  assert.match(failedPreview.error.message, /preview content missing/u)
  assert.equal(failedPreview.collapsed, false)
  assert.ok(!failedPreview.actions.includes('Collapse right sidebar'))
  const failedRestore = await run({ collapseFails: true })
  assert.match(failedRestore.error.message, /sidebar did not collapse/u)
  const standalone = await run({ operation: exerciseLightweightServices })
  assert.equal(standalone.error, undefined)
  assert.equal(standalone.collapsed, true)
  assert.ok(!standalone.actions.some(action => action.startsWith('opened:')))
})
