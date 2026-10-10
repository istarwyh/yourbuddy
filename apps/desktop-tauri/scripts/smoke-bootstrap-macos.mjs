/** Exercise production splash commands in an ad-hoc packaged macOS WebView. */
import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const errorText = 'network-proxy-custom-http-and-https-required'
const apple = source => execFileSync('osascript', ['-e', source], { encoding: 'utf8', timeout: 10_000 }).trim()
assert.equal(process.platform, 'darwin', 'packaged smoke requires macOS')
assert.equal(apple('tell application "System Events" to get UI elements enabled'), 'true',
  'BLOCKED: runner has no existing Accessibility permission; this test never grants it')
if (process.argv[2] !== '--preflight') {
  const executable = resolve(process.argv[2])
  const root = resolve(process.argv[3])
  mkdirSync(root, { recursive: true })
  writeFileSync(`${root}/desktop-settings.json`, JSON.stringify({
    closeAction: 'exit', agentEnvironment: 'windows',
    networkProxy: { version: 1, mode: 'custom', httpProxy: '', httpsProxy: '', noProxy: '', caCertificatePath: '' },
    shellEnvironment: { mode: 'desktopOnly', shellPath: null },
  }))
  const pids = () => execFileSync('ps', ['-axo', 'pid=,command='], { encoding: 'utf8' })
    .split('\n').flatMap(line => {
      const match = line.trim().match(/^(\d+)\s+(.+)$/)
      return match && match[2] === executable ? [Number(match[1])] : []
    })
  const inspect = (pid, action = '') => apple(`
    tell application "System Events"
      set targetProcess to first application process whose unix id is ${pid}
      set allNodes to entire contents of window 1 of targetProcess
      set report to ""
      repeat with itemNode in allNodes
        set labelText to ""
        try
          set labelText to name of itemNode as text
        end try
        try
          set labelText to labelText & " " & value of itemNode as text
        end try
        set report to report & labelText & linefeed
        ${action ? `if role of itemNode is "AXButton" and (${action === 'copy'
    ? 'labelText contains "Copy diagnostics" or labelText contains "复制诊断信息"'
    : 'labelText contains "Retry startup" or labelText contains "重试启动"'}) then
          perform action "AXPress" of itemNode
          return "pressed"
        end if` : ''}
      end repeat
      return report
    end tell`)
  const until = async (label, operation) => {
    const deadline = Date.now() + 60_000
    let lastError
    while (Date.now() < deadline) {
      try { const result = operation(); if (result) return result }
      catch (error) { lastError = error }
      await delay(250)
    }
    throw new Error(`${label} did not complete: ${lastError?.message || 'condition unmet'}`)
  }
  const log = () => readFileSync(`${root}/boot.log`, 'utf8')
  const sessions = () => log().split('=== boot session started ===').length - 1
  const child = spawn(executable, [], { env: { ...process.env, NODE_EXTRA_CA_CERTS: undefined, YOURBUDDY_APP_DATA_DIR: root }, stdio: 'inherit' })
  child.on('error', error => { console.error(error) })
  try {
    const first = await until('initial packaged app', () => pids().find(pid => pid === child.pid))
    const firstView = await until('native retained error in packaged WebView', () => {
      const view = inspect(first)
      return view.includes(errorText) && view
    })
    assert.equal(sessions(), 1)
    writeFileSync(`${root}/splash-before.txt`, firstView)
    assert.equal(inspect(first, 'copy'), 'pressed')
    const copied = await until('native clipboard diagnostic', () => {
      const value = execFileSync('pbpaste', [], { encoding: 'utf8' })
      return value.includes(errorText) && value
    })
    assert.match(copied, /^(Startup failed|启动失败)\nnetwork-proxy-custom-http-and-https-required$/)
    writeFileSync(`${root}/clipboard.txt`, copied)
    assert.equal(inspect(first, 'retry'), 'pressed')
    const second = await until('one replacement process after native retry', () => {
      const running = pids()
      return running.length === 1 && running[0] !== first && sessions() === 2 && running[0]
    })
    const secondView = await until('retained failure after restart', () => {
      const view = inspect(second)
      return view.includes(errorText) && view
    })
    assert.equal(sessions(), 2)
    writeFileSync(`${root}/splash-after.txt`, secondView)
    writeFileSync(`${root}/result.json`, JSON.stringify({ first, second, sessions: sessions(), nativeError: errorText }))
    console.log('packaged Bootstrap: real native error replay, clipboard and retry passed')
  } finally {
    for (const pid of pids()) {
      try { process.kill(pid, 'SIGTERM') }
      catch (error) { if (error.code !== 'ESRCH') throw error }
    }
    await until('packaged process cleanup', () => pids().length === 0)
  }
}
