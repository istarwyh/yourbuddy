/** YourBuddy Capability Pack reconciliation for explicitly declared plugin CLI and Skill surfaces. */

import { constants } from 'node:fs'
import { access, chmod, mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { delimiter, join, resolve } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type { ProfileContext } from '@deepseek-ai/dsh-app-boot'
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver'
import type {} from '@deepseek-ai/dsh-plugin-manager'
import bundledDeclarations from '../capability-packs.json'

const LEDGER_FILE = '.yourbuddy-capability-packs.json'
const SHIM_MARKER = '# yourbuddy-capability-pack:'
const COMMAND_NAME = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/

/** One terminal command explicitly exposed by a Capability Pack. */
export interface CapabilityCommandDeclaration {
  readonly name: string
  readonly entry: string
  readonly versionArgs: readonly string[]
}

/** Capability Pack fields accepted from a package or the bundled product registry. */
export interface CapabilityPackDeclaration {
  readonly cli: { readonly commands: readonly CapabilityCommandDeclaration[] }
  readonly skills: readonly string[]
}

/** One command's reconciled terminal state. */
export interface CapabilityCommandState extends CapabilityCommandDeclaration {
  readonly status: 'exposed' | 'conflict' | 'missing' | 'unsupported'
  readonly detail?: string
}

/** Same-version Package, CLI, Skill, and UI diagnostic recorded for one pack. */
export interface CapabilityPackState {
  readonly packageName: string
  readonly version: string
  readonly commands: readonly CapabilityCommandState[]
  readonly skills: readonly { readonly path: string; readonly status: 'registered' | 'missing' }[]
  readonly ui: 'loaded' | 'headless'
}

interface OwnershipEntry {
  readonly packageName: string
  readonly entry: string
}

export interface CapabilityLedger {
  readonly formatVersion: 1
  readonly commands: Readonly<Record<string, OwnershipEntry>>
  readonly packs: readonly CapabilityPackState[]
}

interface PackageManifest {
  readonly name?: string
  readonly version?: string
  readonly dsh?: { readonly client?: object }
  readonly yourbuddy?: { readonly capabilityPack?: unknown }
}

/** Return a declared pack only when every command and Skill field is usable. */
export function parseCapabilityPack(value: unknown): CapabilityPackDeclaration | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
  const record = value as { cli?: unknown; skills?: unknown }
  if (record.cli === null || typeof record.cli !== 'object' || Array.isArray(record.cli)) return undefined
  const commands = (record.cli as { commands?: unknown }).commands
  if (!Array.isArray(commands) || !Array.isArray(record.skills)) return undefined
  const parsed: CapabilityCommandDeclaration[] = []
  for (const command of commands) {
    if (command === null || typeof command !== 'object' || Array.isArray(command)) return undefined
    const item = command as { name?: unknown; entry?: unknown; versionArgs?: unknown }
    if (typeof item.name !== 'string' || !COMMAND_NAME.test(item.name)
      || typeof item.entry !== 'string' || !item.entry.startsWith('./')
      || !Array.isArray(item.versionArgs) || item.versionArgs.some(argument => typeof argument !== 'string')) return undefined
    parsed.push({ name: item.name, entry: item.entry, versionArgs: item.versionArgs as string[] })
  }
  if (record.skills.some(skill => typeof skill !== 'string' || !skill.startsWith('./'))) return undefined
  return { cli: { commands: parsed }, skills: record.skills as string[] }
}

function quote(value: string): string {
  return `'${value.replaceAll("'", `'"'"'`)}'`
}

function shimBody(
  packageName: string,
  version: string,
  node: string,
  entry: string,
  versionArgs: readonly string[],
): string {
  const versionCheck = versionArgs.length === 0
    ? ''
    : `if [ "$#" -eq ${versionArgs.length} ]${versionArgs.map((argument, index) => ` && [ "$${index + 1}" = ${quote(argument)} ]`).join('')}; then\n  printf '%s\\n' ${quote(`${packageName}@${version}`)}\n  exit 0\nfi\n`
  return `#!/bin/sh\n${SHIM_MARKER}${packageName}\n${versionCheck}exec ${quote(node)} ${quote(entry)} "$@"\n`
}

async function readableFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile()
  }
  catch {
    return false
  }
}

async function readableDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory()
  }
  catch {
    return false
  }
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, 'utf8'))
}

async function readLedger(binDir: string): Promise<CapabilityLedger> {
  try {
    const value = await readJson(join(binDir, LEDGER_FILE))
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const ledger = value as { formatVersion?: unknown; commands?: unknown; packs?: unknown }
      if (ledger.formatVersion === 1 && ledger.commands !== null && typeof ledger.commands === 'object'
        && !Array.isArray(ledger.commands) && Array.isArray(ledger.packs)) return value as CapabilityLedger
    }
  }
  catch {
    // A missing or obsolete ledger owns no commands; reconciliation starts from the filesystem.
  }
  return { formatVersion: 1, commands: {}, packs: [] }
}

async function writeJsonAtomic(path: string, value: unknown): Promise<void> {
  const temporary = `${path}.${process.pid}.tmp`
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 })
  await rename(temporary, path)
}

async function externalCommand(command: string, binDir: string): Promise<string | undefined> {
  for (const directory of (process.env.PATH ?? '').split(delimiter)) {
    if (!directory || resolve(directory) === resolve(binDir)) continue
    const candidate = join(directory, command)
    try {
      await access(candidate, constants.X_OK)
      return candidate
    }
    catch {
      // Keep looking; an absent or non-executable path is not a command conflict.
    }
  }
  return undefined
}

function packageDirectory(profileDir: string, packageName: string): string {
  return join(profileDir, 'node_modules', ...packageName.split('/'))
}

function registeredDeclaration(packageName: string): unknown {
  return (bundledDeclarations as Readonly<Record<string, unknown>>)[packageName]
}

/** Reconcile every installed explicit Capability Pack into YourBuddy's stable command directory. */
export async function synchronizeCapabilityPacks(
  profile: Pick<ProfileContext, 'dir'>,
  binDir: string,
  nodeBinary: string,
): Promise<CapabilityLedger> {
  await mkdir(binDir, { recursive: true })
  const profileManifest = await readJson(join(profile.dir, 'package.json')) as { dependencies?: Record<string, string> }
  const previous = await readLedger(binDir)
  const desiredOwners: Record<string, OwnershipEntry> = {}
  const packs: CapabilityPackState[] = []

  for (const packageName of Object.keys(profileManifest.dependencies ?? {}).sort()) {
    const packageDir = packageDirectory(profile.dir, packageName)
    let manifest: PackageManifest
    try {
      manifest = await readJson(join(packageDir, 'package.json')) as PackageManifest
    }
    catch {
      continue
    }
    const declaration = parseCapabilityPack(manifest.yourbuddy?.capabilityPack ?? registeredDeclaration(packageName))
    if (declaration === undefined || typeof manifest.version !== 'string') continue
    const commands: CapabilityCommandState[] = []
    for (const command of declaration.cli.commands) {
      const entry = resolve(packageDir, command.entry)
      if (!entry.startsWith(`${resolve(packageDir)}/`) || !await readableFile(entry)) {
        commands.push({ ...command, status: 'missing', detail: entry })
        continue
      }
      if (process.platform !== 'darwin') {
        commands.push({ ...command, status: 'unsupported', detail: process.platform })
        continue
      }
      const claimed = desiredOwners[command.name]
      const external = await externalCommand(command.name, binDir)
      if (claimed !== undefined && claimed.packageName !== packageName) {
        commands.push({ ...command, status: 'conflict', detail: claimed.packageName })
        continue
      }
      if (external !== undefined) {
        commands.push({ ...command, status: 'conflict', detail: external })
        continue
      }
      const destination = join(binDir, command.name)
      const temporary = `${destination}.${process.pid}.tmp`
      await writeFile(temporary, shimBody(packageName, manifest.version, nodeBinary, entry, command.versionArgs), { mode: 0o755 })
      await chmod(temporary, 0o755)
      await rename(temporary, destination)
      desiredOwners[command.name] = { packageName, entry }
      commands.push({ ...command, status: 'exposed' })
    }
    const skills = await Promise.all(declaration.skills.map(async path => ({
      path,
      status: await readableDirectory(resolve(packageDir, path)) ? 'registered' as const : 'missing' as const,
    })))
    packs.push({
      packageName,
      version: manifest.version,
      commands,
      skills,
      ui: manifest.dsh?.client === undefined ? 'headless' : 'loaded',
    })
  }

  for (const [command, owner] of Object.entries(previous.commands)) {
    if (desiredOwners[command] !== undefined) continue
    const destination = join(binDir, command)
    try {
      const body = await readFile(destination, 'utf8')
      if (body.includes(`${SHIM_MARKER}${owner.packageName}`)) await rm(destination)
    }
    catch {
      // A missing or user-replaced shim is not owned anymore and is left alone.
    }
  }
  const ledger: CapabilityLedger = { formatVersion: 1, commands: desiredOwners, packs }
  await writeJsonAtomic(join(binDir, LEDGER_FILE), ledger)
  return ledger
}

/** Keep managed commands synchronized after startup and every plugin-manager operation. */
export function installCapabilityPackReconciler(ctx: Context, profile: ProfileContext): void {
  const binDir = process.env.YOURBUDDY_BIN_DIR
  const nodeBinary = process.env.YOURBUDDY_NODE_BINARY
  if (!binDir || !nodeBinary) return
  const sync = (): void => {
    void synchronizeCapabilityPacks(profile, binDir, nodeBinary).catch((error: unknown) => {
      ctx.logger.warn('Could not reconcile YourBuddy Capability Packs', error)
    })
  }
  sync()
  ctx.on('plugin-manager/changed', sync)
}

/** Same-origin read route for the Plugins page's four-surface diagnostics. */
export function createCapabilityPackRoute(binDir: string): WebRoute {
  return {
    kind: 'exact',
    path: '/api/yourbuddy/capability-packs',
    handler: async (request, response) => {
      if (request.method !== 'GET') {
        response.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
        response.end(JSON.stringify({ ok: false, error: 'method-not-allowed' }))
        return
      }
      const ledger = await readLedger(binDir)
      response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
      response.end(JSON.stringify({ ok: true, value: ledger.packs }))
    },
  }
}
