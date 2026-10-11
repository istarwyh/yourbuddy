/** Exercise a signed current Offline application through native installation and three cold boots. */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync, spawn, spawnSync } from 'node:child_process'
import { once } from 'node:events'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { pathToFileURL } from 'node:url'

const BOOT_TIMEOUT_MS = 10 * 60_000
const PROCESS_TIMEOUT_MS = 30_000
const read = path => existsSync(path) ? readFileSync(path, 'utf8') : ''
const sha256 = path => createHash('sha256').update(readFileSync(path)).digest('hex')
const apple = source => execFileSync('/usr/bin/osascript', ['-e', source], { encoding: 'utf8', timeout: 15_000 }).trim()

/** Build an allowlisted environment whose user-owned state is entirely temporary. */
export function isolatedEnvironment(world, node = process.execPath) {
  const home = join(world, 'home')
  return {
    PATH: `${dirname(node)}:/usr/bin:/bin:/usr/sbin:/sbin`,
    HOME: home,
    USERPROFILE: home,
    TMPDIR: join(world, 'tmp'),
    XDG_CONFIG_HOME: join(home, '.config'),
    XDG_CACHE_HOME: join(home, '.cache'),
    XDG_DATA_HOME: join(home, '.local', 'share'),
    CODEX_HOME: join(home, '.codex'),
    GH_CONFIG_DIR: join(home, '.config', 'gh'),
    YOURBUDDY_APP_DATA_DIR: join(world, 'app-data'),
    LANG: 'en_US.UTF-8',
    LC_ALL: 'en_US.UTF-8',
  }
}

/** Reject a different version or an incomplete native readiness sequence. */
export function inspectBoot(log, active, manifest, version) {
  assert.equal(manifest.appVersion, version, 'signed channel must be the requested current version')
  assert.equal(manifest.releaseTag, `yourbuddy-v${version}`)
  const start = log.indexOf('=== boot session started ===')
  const spawn = log.indexOf('spawning dsh web ')
  const ready = log.indexOf('authenticated readiness passed url=')
  const complete = log.indexOf('boot complete')
  assert(start >= 0 && spawn > start && ready > spawn && complete > ready,
    'native boot must spawn the real Host, authenticate, and complete in that order')
  assert.doesNotMatch(log, /ERROR |plugins disabled by rescue patch|retrying with it disabled/,
    'a rescued or failed Host is not release acceptance')
  assert.equal(active.appVersion, version)
  assert.equal(active.components.harness.id, manifest.components.harness.id)
  for (const [name, component] of Object.entries(active.components)) {
    assert.equal(component.id, manifest.components[name]?.id, `active ${name} must match the signed channel`)
  }
  assert.equal(active.components.harbor, undefined, 'optional Harbor must not be activated by startup')
  const match = log.match(/authenticated readiness passed url=(http:\/\/127\.0\.0\.1:\d+\/)/)
  assert(match, 'native readiness must record a credential-free loopback URL')
  return { webUrl: match[1] }
}

/** Remove ephemeral authentication values from retained diagnostics, even on failure. */
export function redactEvidence(text) {
  return text.replace(/([?&]token=)[^\s&"'<>]+/gi, '$1<redacted>')
    .replace(/(dsh-auth=)[^\s;"'<>]+/gi, '$1<redacted>')
}

/** Require the existing macOS Accessibility grant; never request or change it. */
export function requireAccessibility() {
  assert.equal(process.platform, 'darwin', 'native Offline smoke requires macOS')
  assert.equal(apple('tell application "System Events" to get UI elements enabled'), 'true',
    'BLOCKED: runner has no existing Accessibility permission; this test never grants it')
}

function inspectWindow(pid, close = false) {
  assert(Number.isSafeInteger(pid) && pid > 0)
  return apple(`tell application "System Events"
    set targetProcess to first application process whose unix id is ${pid}
    set allNodes to entire contents of window 1 of targetProcess
    set report to ""
    repeat with itemNode in allNodes
      set labelText to ""
      set valueText to ""
      try
        set labelText to name of itemNode as text
      end try
      try
        set valueText to value of itemNode as text
      end try
      set report to report & (role of itemNode as text) & tab & labelText & tab & valueText & linefeed
      ${close ? `if role of itemNode is "AXButton" and (labelText is "Close" or labelText is "关闭") then
        perform action "AXPress" of itemNode
        return "pressed"
      end if` : ''}
    end repeat
    return report
  end tell`)
}

async function until(label, operation, timeout = PROCESS_TIMEOUT_MS, retryErrors = false) {
  const deadline = Date.now() + timeout
  let lastError
  while (Date.now() < deadline) {
    try {
      const result = await operation()
      if (result) return result
    }
    catch (error) { if (!retryErrors) throw error; lastError = error }
    await delay(100)
  }
  throw new Error(`${label} did not complete: ${lastError?.message || 'condition unmet'}`)
}

/** Read a ps row without treating a reused PID as the originally observed process. */
export function parseProcessRecord(line) {
  const match = line.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+(.{24})\s+(.+)$/)
  assert(match, 'cannot read process identity from ps')
  return { pid: Number(match[1]), parent: Number(match[2]), group: Number(match[3]), started: match[4], command: match[5] }
}

function processRecord(pid) {
  const result = spawnSync('/bin/ps', ['-ww', '-p', String(pid), '-o', 'pid=,ppid=,pgid=,lstart=,command='], { encoding: 'utf8', timeout: 5_000, env: { LC_ALL: 'C' } })
  if (result.status === 1 && !result.stdout.trim()) return undefined
  assert.equal(result.error, undefined)
  assert.equal(result.signal, null)
  assert.equal(result.status, 0, 'ps must report process identity before cleanup')
  return parseProcessRecord(result.stdout)
}

/** Child handles that have exited never authorize a new lookup of their recycled PID. */
export function childIsActive(child) {
  return Number.isSafeInteger(child.pid) && child.pid > 0 && child.exitCode === null && child.signalCode === null
}

/** Match an observed process generation, including its creation time and command. */
export function sameProcessIdentity(expected, actual) {
  return actual !== undefined && expected.pid === actual.pid && expected.started === actual.started
    && expected.group === actual.group && expected.command === actual.command
}

/** Authorize only this temporary app-data tree's Host and its own process group. */
export function isOwnedHost(record, child, appData) {
  if (!record) return false
  const parentMatches = childIsActive(child) ? record.parent === child.pid : record.parent === 1
  return parentMatches && record.group === record.pid
    && record.command.includes(`${join(appData, 'harness-versions')}/`)
}

function ownedHost(child, appData) {
  if (!Number.isSafeInteger(child.pid)) return undefined
  const [rawPid] = read(join(appData, 'host.pid')).trim().split('\n')
  const pid = Number(rawPid)
  if (!Number.isSafeInteger(pid) || pid <= 0) return undefined
  const record = processRecord(pid)
  if (!record) return undefined
  assert(isOwnedHost(record, child, appData),
    'cleanup may only own this app child and its isolated Host process group')
  return record
}

/** Select only descendants of this smoke's still-owned application PID. */
export function descendantPids(processes, rootPid) {
  const found = new Set([rootPid])
  let changed = true
  while (changed) {
    changed = false
    for (const { pid, parent } of processes) {
      if (found.has(parent) && !found.has(pid)) {
        found.add(pid)
        changed = true
      }
    }
  }
  found.delete(rootPid)
  return [...found].reverse()
}

/** Require the same owned application generation immediately before lookup or signalling. */
export function ownsApplicationProcess(child, application, current) {
  return childIsActive(child) && application !== undefined && sameProcessIdentity(application, current)
    && application.parent === current.parent
}

/** A reused application PID cannot acquire ownership of an unrelated process tree. */
export function ownedProcessDescendants(rows, child, application) {
  const current = rows.find(row => row.pid === child.pid)
  if (!ownsApplicationProcess(child, application, current)) return []
  return descendantPids(rows, child.pid).map(pid => rows.find(row => row.pid === pid))
}

function ownedDescendants(child, application) {
  if (!childIsActive(child) || !application) return []
  const rows = execFileSync('/bin/ps', ['-ww', '-axo', 'pid=,ppid=,pgid=,lstart=,command='], { encoding: 'utf8', timeout: 5_000, env: { LC_ALL: 'C' } })
    .trim().split('\n').map(parseProcessRecord)
  return ownedProcessDescendants(rows, child, application)
}

function killOwned(record, child, appData, group = false) {
  const current = processRecord(record.pid)
  if (!sameProcessIdentity(record, current)) return
  if (group) assert(isOwnedHost(current, child, appData), 'Host ownership changed before signalling its process group')
  try { process.kill(group ? -record.pid : record.pid, 'SIGKILL') }
  catch (error) { if (error.code !== 'ESRCH') throw error }
}

async function cleanupOwned(child, ended, capturedHost, appData, application) {
  const errors = []
  let descendants = []
  let host = capturedHost
  try { descendants = ownedDescendants(child, application) }
  catch (error) { errors.push(error) }
  try { host = ownedHost(child, appData) || capturedHost }
  catch (error) { errors.push(error) }
  if (host) {
    try { killOwned(host, child, appData, true) }
    catch (error) { errors.push(error) }
  }
  for (const record of descendants) {
    try { killOwned(record, child, appData) }
    catch (error) { errors.push(error) }
  }
  if (childIsActive(child)) {
    if (ownsApplicationProcess(child, application, processRecord(child.pid))) child.kill('SIGKILL')
    await until('application exit after cleanup', () => !childIsActive(child))
    await ended
  }
  await until('owned process cleanup', () => [...descendants, ...(host ? [host] : [])]
    .every(record => !sameProcessIdentity(record, processRecord(record.pid))))
  if (errors.length) throw new AggregateError(errors, 'Could not verify every owned process during cleanup')
}

async function refuseExternalRequests() {
  let attempts = 0
  const sockets = new Set()
  const server = createServer((_request, response) => {
    attempts++
    response.writeHead(503, { 'content-length': '0', connection: 'close' }).end()
  })
  server.on('connect', (_request, socket) => {
    attempts++
    socket.end('HTTP/1.1 503 Offline acceptance\r\nContent-Length: 0\r\nConnection: close\r\n\r\n')
  })
  server.on('connection', socket => {
    sockets.add(socket)
    socket.on('close', () => sockets.delete(socket))
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    attempts: () => attempts,
    async close() {
      const closed = new Promise((resolveClose, reject) => server.close(error => error ? reject(error) : resolveClose()))
      for (const socket of sockets) socket.destroy()
      await closed
    },
  }
}

/** Run unmodified application code against signed Offline seeds without publishing anything. */
export async function smokeOfflineStartup(executable, outputRoot, version) {
  requireAccessibility()
  assert(/^\d+\.\d+\.\d+$/.test(version), 'expected version must be X.Y.Z')
  executable = resolve(executable)
  outputRoot = resolve(outputRoot)
  mkdirSync(outputRoot, { recursive: true })
  const evidence = join(outputRoot, 'evidence')
  mkdirSync(evidence, { mode: 0o700 })
  const world = mkdtempSync(join(tmpdir(), 'yourbuddy-offline-acceptance-'))
  let proxy
  let worldSafeToRemove = true
  try {
    const env = isolatedEnvironment(world)
    for (const path of [env.HOME, env.TMPDIR, env.YOURBUDDY_APP_DATA_DIR]) mkdirSync(path, { recursive: true, mode: 0o700 })
    const appData = env.YOURBUDDY_APP_DATA_DIR
    const resources = resolve(dirname(executable), '..', 'Resources')
    const manifestPath = join(resources, 'component-channel', 'components.json')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    assert.equal(manifest.appVersion, version, 'do not accept an old signed fixture as current release evidence')
    const bundleVersion = execFileSync('/usr/libexec/PlistBuddy', ['-c', 'Print :CFBundleShortVersionString', resolve(resources, '..', 'Info.plist')], { encoding: 'utf8' }).trim()
    assert.equal(bundleVersion, version, 'app and signed components must have the same version')
    for (const component of Object.values(manifest.components)) {
      assert(existsSync(join(resources, 'component-seeds', component.archive)), 'Offline bundle must retain every signed release seed')
    }
    execFileSync(executable, ['--yourbuddy-component-helper', 'verify-channel'], { cwd: world, env, timeout: 30_000, stdio: 'pipe' })
    proxy = await refuseExternalRequests()
    writeFileSync(join(appData, 'desktop-settings.json'), JSON.stringify({
      closeAction: 'exit', agentEnvironment: 'windows',
      networkProxy: { version: 1, mode: 'custom', httpProxy: proxy.url, httpsProxy: proxy.url, noProxy: '', caCertificatePath: '' },
      shellEnvironment: { mode: 'desktopOnly', shellPath: null },
    }))
    const summary = {
      version, appSha256: sha256(executable), signedManifestSha256: sha256(manifestPath),
      platform: `${process.platform}-${process.arch}`, componentSource: 'signed Offline seeds',
      network: 'local rejecting proxy; production TLS verification unchanged; no enterprise proxy claim',
      boots: [],
    }
    let activeBefore
    for (let round = 1; round <= 3; round++) {
      const startedAt = Date.now()
      const offset = read(join(appData, 'boot.log')).length
      let stdio = ''
      let host
      let launchError
      let application
      const child = spawn(executable, [], { cwd: world, env, stdio: ['ignore', 'pipe', 'pipe'] })
      worldSafeToRemove = false
      const ended = new Promise(resolveEnd => {
        child.once('error', error => { launchError = error; resolveEnd({ error }) })
        child.once('exit', (code, signal) => resolveEnd({ code, signal }))
      })
      const capture = chunk => { stdio = `${stdio}${chunk}`.slice(-128_000) }
      child.stdout.on('data', capture)
      child.stderr.on('data', capture)
      const currentLog = () => read(join(appData, 'boot.log')).slice(offset)
      try {
        application = processRecord(child.pid)
        assert(application && application.command === executable && application.parent === process.pid,
          'the application identity must belong to this launch')
        await until('real native Host authenticated readiness', () => {
          assert.equal(launchError, undefined, 'application process must start')
          assert(child.exitCode === null && child.signalCode === null, 'application exited before readiness')
          host ??= ownedHost(child, appData)
          const activePath = join(appData, 'components', 'active.json')
          if (existsSync(activePath)) {
            const active = readFileSync(activePath, 'utf8')
            JSON.parse(active)
            if (round === 1) assert.match(currentLog(), /authenticated readiness passed url=/,
              'active record appeared before real Host authentication')
            else assert.equal(active, activeBefore, 'cold startup must retain the same active components')
          }
          const log = currentLog()
          assert.doesNotMatch(log, /ERROR |plugins disabled by rescue patch|retrying with it disabled/)
          return log.includes('boot complete')
        }, BOOT_TIMEOUT_MS)
        const activeText = read(join(appData, 'components', 'active.json'))
        const active = JSON.parse(activeText)
        const { webUrl } = inspectBoot(currentLog(), active, manifest, version)
        assert(host, 'native app must own a real Host process')
        assert(active.components.pnpmStore, 'empty isolated HOME must exercise the signed offline Store fallback')
        assert(!existsSync(join(appData, 'components', 'downloads')), 'Offline startup must not download release components')
        const view = await until('authenticated workbench in the native WebView', () => {
          const value = inspectWindow(child.pid)
          return /AXButton\tCodex\b/.test(value) && /\t(?:Settings|设置)\t/.test(value) && value
        }, 60_000, true)
        writeFileSync(join(evidence, `boot-${round}-accessibility.txt`), redactEvidence(view))
        assert.equal(inspectWindow(child.pid, true), 'pressed', 'close through the real native window command')
        await until('native close', () => child.exitCode !== null || child.signalCode !== null)
        const outcome = await ended
        assert.equal(outcome.error, undefined)
        assert.equal(outcome.signal, null, 'a signalled application is not a successful native close')
        assert.equal(outcome.code, 0)
        await until('Host process exit after native close', () => !sameProcessIdentity(host, processRecord(host.pid)))
        assert(!existsSync(join(appData, 'host.pid')), 'native close must remove its Host record')
        summary.boots.push({ round, appPid: child.pid, hostPid: host.pid, durationMs: Date.now() - startedAt, authenticated: true, nativeWorkbench: true, cleanExit: true, webUrl })
        activeBefore = activeText
      }
      finally {
        try {
          writeFileSync(join(evidence, `boot-${round}.log`), redactEvidence(currentLog()))
          writeFileSync(join(evidence, `boot-${round}-stdio.log`), redactEvidence(stdio))
        }
        finally {
          await cleanupOwned(child, ended, host, appData, application)
          worldSafeToRemove = true
        }
      }
    }
    summary.blockedExternalRequests = proxy.attempts()
    summary.active = JSON.parse(activeBefore)
    // Paths are within the throwaway HOME and are unnecessary in the retained result.
    for (const component of Object.values(summary.active.components)) delete component.path
    writeFileSync(join(evidence, 'result.json'), `${JSON.stringify(summary, null, 2)}\n`)
    console.log(`native Offline startup: signed ${version}, real install/authenticated workbench, and two subsequent cold boots passed`)
  }
  finally {
    if (proxy) await proxy.close()
    if (worldSafeToRemove) rmSync(world, { recursive: true, force: true })
    else console.error(`Unsettled application state retained at ${world}`)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv[2] === '--preflight') requireAccessibility()
  else await smokeOfflineStartup(process.argv[2], process.argv[3], process.argv[4])
}
