import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'

const DOCKER_DESKTOP_BIN = '/Applications/Docker.app/Contents/Resources/bin'

/**
 * On macOS, Docker Desktop keeps `docker-credential-desktop` (and the other
 * credential helpers) inside the app bundle, outside the default PATH that a
 * GUI-launched Harness inherits. A missing helper makes `docker build`/`pull`
 * fail with `exec: "docker-credential-desktop": executable file not found in
 * $PATH` even though the CLI and daemon are reachable. Prepend that directory
 * to PATH for every child process we spawn so Harbor inherits a resolvable
 * helper. The change is macOS-only, existence-checked, and idempotent.
 */
export function dockerDesktopAwareEnv(env, {
  platform = process.platform,
  pathExists = existsSync,
} = {}) {
  const base = env ?? process.env
  if (platform !== 'darwin') return base
  if (!pathExists(DOCKER_DESKTOP_BIN)) return base
  const current = String(base.PATH ?? '')
  const segments = current.split(path.delimiter).filter(Boolean)
  if (segments.includes(DOCKER_DESKTOP_BIN)) return base
  return { ...base, PATH: [DOCKER_DESKTOP_BIN, ...segments].join(path.delimiter) }
}

export function runProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: dockerDesktopAwareEnv(options.env ?? process.env),
      shell: false,
      stdio: [options.input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    let outputExceeded = false
    const maxOutputBytes = options.maxOutputBytes ?? 64 * 1024 * 1024
    const append = (current, chunk) => {
      const next = current + chunk
      if (Buffer.byteLength(next) <= maxOutputBytes) return next
      outputExceeded = true
      child.kill('SIGTERM')
      return next.slice(0, maxOutputBytes)
    }
    const timeout = setTimeout(() => {
      child.kill('SIGTERM')
      reject(new Error(`Command timed out after ${options.timeoutMs}ms: ${command}`))
    }, options.timeoutMs ?? 1_800_000)
    child.stdout.on('data', chunk => { stdout = append(stdout, chunk) })
    child.stderr.on('data', chunk => { stderr = append(stderr, chunk) })
    if (options.input !== undefined) child.stdin.end(options.input)
    child.on('error', error => {
      clearTimeout(timeout)
      reject(error)
    })
    child.on('close', code => {
      clearTimeout(timeout)
      const result = { command, args, code, stdout, stderr }
      if (outputExceeded) {
        reject(Object.assign(new Error(`Command output exceeded ${maxOutputBytes} bytes: ${command}`), { result }))
        return
      }
      const allowedExitCodes = options.allowedExitCodes ?? [0]
      if (allowedExitCodes.includes(code)) resolve(result)
      else reject(Object.assign(new Error(`Command failed with exit code ${code}: ${command}`), { result }))
    })
  })
}
