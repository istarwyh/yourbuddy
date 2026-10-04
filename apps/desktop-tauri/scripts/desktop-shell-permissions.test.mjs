import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { parse as parseToml } from 'smol-toml'

const desktopRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const shell = readFileSync(join(desktopRoot, 'shell.html'), 'utf8')
const rust = readFileSync(join(desktopRoot, 'src-tauri', 'src', 'lib.rs'), 'utf8')
const defaultCapability = JSON.parse(
  readFileSync(join(desktopRoot, 'src-tauri', 'capabilities', 'default.json'), 'utf8'),
)
const permissionPath = join(desktopRoot, 'src-tauri', 'permissions', 'desktop-shell.toml')

function uniqueSorted(values) {
  return [...new Set(values)].sort()
}

function shellInvokeCommands() {
  return [...shell.matchAll(/\binvoke\(\s*(['"])([a-z][a-z0-9_]*)\1/gu)].map(match => match[2])
}

function registeredCommands() {
  const body = rust.match(/\.invoke_handler\(tauri::generate_handler!\[([\s\S]*?)\]\)/u)?.[1]
  assert.notEqual(body, undefined, 'Tauri invoke handler is missing')
  return [...body.matchAll(/\b([a-z][a-z0-9_]*)\b/gu)].map(match => match[1])
}

function allowedDesktopShellCommands() {
  assert.equal(
    existsSync(permissionPath),
    true,
    'the remote desktop shell needs an application permission file',
  )
  const parsed = parseToml(readFileSync(permissionPath, 'utf8'))
  const permissions = parsed.permission
  assert.equal(Array.isArray(permissions), true, 'desktop-shell.toml must contain [[permission]]')
  const permission = permissions.find(entry => entry.identifier === 'allow-first-party-commands')
  assert.notEqual(permission, undefined, 'desktop shell application permission is missing')
  assert.equal(Array.isArray(permission.commands?.allow), true, 'desktop shell permission needs commands.allow')
  return permission.commands.allow
}

test('all desktop operations share one stable first-party framework permission', () => {
  const invoked = shellInvokeCommands()
  const allowed = allowedDesktopShellCommands()
  const registered = registeredCommands()

  assert.deepEqual(uniqueSorted(invoked), ['run_first_party_command'])
  assert.equal(allowed.every(command => typeof command === 'string'), true)
  assert.equal(new Set(allowed).size, allowed.length, 'application permissions must not contain duplicates')
  assert.deepEqual(uniqueSorted(allowed), uniqueSorted(invoked))
  assert.deepEqual(
    uniqueSorted(invoked.filter(command => !registered.includes(command))),
    [],
    'every permitted shell command must be registered by the Tauri invoke handler',
  )
})

test('the cross-origin Host iframe may request microphone access', () => {
  assert.match(shell, /<iframe\b[^>]*\ballow="microphone"/u)
})

test('the first-party command gateway is available to local and runtime-owned product surfaces', () => {
  assert.equal(defaultCapability.local ?? true, true)
  assert.equal(
    defaultCapability.permissions.includes('allow-first-party-commands'),
    true,
    'local first-party documents use the same stable command gateway',
  )
})
