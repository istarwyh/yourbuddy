import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createYourBuddyComponentInventory } from './yourbuddy-component-inventory.ts'

const temporaryRoots: string[] = []

function write(root: string, path: string, value: string | Record<string, unknown>): void {
  const destination = join(root, path)
  mkdirSync(dirname(destination), { recursive: true })
  writeFileSync(destination, typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`)
}

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'yourbuddy-inventory-'))
  temporaryRoots.push(root)
  write(root, '.bundle-manifest.json', { harnessVersion: '0.2.0', contentSha256: 'a'.repeat(64) })
  write(root, 'pnpm-workspace.yaml', 'packages:\n  - apps/cli\n  - packages/*\n')
  write(root, 'apps/cli/package.json', { name: 'cli', version: '1.0.0', dependencies: { tool: 'workspace:*' } })
  write(root, 'packages/tool/package.json', { name: 'tool', version: '1.0.0',
    peerDependencies: { shared: 'workspace:*' }, optionalDependencies: { absent: 'workspace:*', native: 'workspace:*' },
    dsh: { client: { inject: ['shared'] }, bundle: { patch: './cordis.patch.yml' } } })
  write(root, 'packages/tool/cordis.patch.yml', '- insert:\n    - id: tool\n      name: tool\n')
  write(root, 'packages/shared/package.json', { name: 'shared', version: '1.0.0' })
  write(root, 'packages/native/package.json', { name: 'native', version: '1.0.0' })
  write(root, 'packages/native/driver.node', 'native fixture')
  write(root, 'packages/native/command', '#!/bin/sh\nexit 0\n')
  chmodSync(join(root, 'packages/native/command'), 0o755)
  write(root, 'packages/unused/package.json', { name: 'unused', version: '1.0.0' })
  return root
}

function inspect(root: string) {
  return createYourBuddyComponentInventory({ harnessRoot: root, platform: 'darwin' })
}

function release(root: string): string {
  const components = join(root, 'release/yourbuddy-components-0.4.9.json')
  const archive = 'yourbuddy-harness-fixture.tar.zst'
  const bytes = Buffer.from('archive byte measurement fixture')
  write(root, `release/${archive}`, bytes.toString())
  write(root, 'release/yourbuddy-components-0.4.9.json', { appVersion: '0.4.9', platform: 'darwin', arch: 'arm64', components: {
    harness: { id: 'sha256:fixture', archive, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length, activation: 'startup' },
  } })
  return components
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('YourBuddy prepared component inventory', () => {
  it('reports the production closure and staged file sizes without inventing download costs', async () => {
    const root = fixture()
    const report = await inspect(root)
    expect(report.counts).toEqual({ stagedPackages: 5, selectedPackages: 4, stagedOutsideSelectedClosure: 1 })
    expect(report.packages.filter(pkg => pkg.selected).map(pkg => pkg.name)).toEqual(['cli', 'native', 'shared', 'tool'])
    expect(report.costs).toEqual({ archives: null, installedBytes: null, networkDownloadedBytes: null })
    expect(report.packages.find(pkg => pkg.name === 'native')?.stagedFiles.nodeAddons).toEqual(['packages/native/driver.node'])
    if (process.platform !== 'win32') {
      expect(report.packages.find(pkg => pkg.name === 'native')?.stagedFiles.executableFiles).toContain('packages/native/command')
    }
    expect(report.packages.find(pkg => pkg.name === 'tool')?.patches).toEqual([
      { path: 'packages/tool/cordis.patch.yml', presets: [], packages: ['tool'] },
    ])
    expect(await inspect(root)).toEqual(report)
    expect(JSON.stringify(report)).not.toContain(root)
  })

  it('rejects a missing required workspace peer rather than classifying it as an external', async () => {
    const root = fixture()
    rmSync(join(root, 'packages/shared'), { recursive: true })
    await expect(inspect(root)).rejects.toThrow('tool requires unpacked package shared')
  })

  it('rejects a Loader plugin omitted from the selected package closure even when staged', async () => {
    const root = fixture()
    write(root, 'packages/tool/cordis.patch.yml', '- insert:\n    - id: omitted\n      name: unused\n')
    await expect(inspect(root)).rejects.toThrow('packages/tool/cordis.patch.yml references unused outside the selected package closure')
  })

  it('rejects a Client injection omitted from the package closure', async () => {
    const root = fixture()
    const path = join(root, 'packages/tool/package.json')
    const manifest = JSON.parse(readFileSync(path, 'utf8')) as { dsh: { client: { inject: string[] } } }
    manifest.dsh.client.inject = ['unused']
    write(root, 'packages/tool/package.json', manifest)
    await expect(inspect(root)).rejects.toThrow('tool Client injection references unused outside the selected package closure')
  })

  it.each(['Loader', 'Client'])('rejects an absent optional workspace package referenced by %s', async (kind) => {
    const root = fixture()
    write(root, 'apps/cli/package.json', { name: 'cli', version: '1.0.0',
      optionalDependencies: { missing: 'workspace:*' },
      dsh: kind === 'Loader' ? { bundle: { patch: './cordis.patch.yml' } } : { client: { inject: ['missing'] } } })
    write(root, 'apps/cli/cordis.patch.yml', '- insert:\n    - name: missing\n')
    await expect(inspect(root)).rejects.toThrow('references missing outside the selected package closure')
  })

  it('does not treat fields on a Loader insertion operation as entry conditions', async () => {
    const root = fixture()
    write(root, 'packages/tool/cordis.patch.yml', '- disabled: true\n  insert:\n    - name: missing\n')
    await expect(inspect(root)).rejects.toThrow('references missing outside the selected package closure')
  })

  it.each(['preset', 'group'])('retains a disabled %s ancestor around preset plugin references', async (owner) => {
    const root = fixture()
    const preset = { name: '@deepseek-ai/dsh-agent-preset', disabled: owner === 'preset',
      config: { id: 'optional', plugins: [{ name: 'missing' }] } }
    const entries = owner === 'group' ? [{ group: true, disabled: true, config: [preset] }] : [preset]
    write(root, 'packages/tool/cordis.patch.yml', JSON.stringify([{ insert: entries }]))
    await expect(inspect(root)).resolves.toHaveProperty('platform', 'darwin')
  })

  it('reuses target-platform conditions while keeping unknown expressions conservatively active', async () => {
    const root = fixture()
    write(root, 'packages/tool/cordis.patch.yml', `- insert:
    - id: windows
      name: missing-windows
      disabled: !!js process.platform !== 'win32'
    - id: disabled
      name: missing-disabled
      disabled: true
`)
    await expect(inspect(root)).resolves.toHaveProperty('platform', 'darwin')
    await expect(createYourBuddyComponentInventory({ harnessRoot: root, platform: 'win32' })).rejects.toThrow('references missing-windows')
    write(root, 'packages/tool/cordis.patch.yml', `- insert:
    - id: conditional
      name: missing-conditional
      disabled: !!js (() => { throw new Error('must not execute'); })()
`)
    await expect(inspect(root)).rejects.toThrow('references missing-conditional')
  })

  it('checks active plugins nested inside a declared Agent preset', async () => {
    const root = fixture()
    write(root, 'packages/tool/package.json', { name: 'tool', version: '1.0.0',
      dependencies: { '@deepseek-ai/dsh-agent-preset': 'workspace:*' }, dsh: { bundle: { patch: ['./cordis.patch.yml'] } } })
    write(root, 'packages/preset/package.json', { name: '@deepseek-ai/dsh-agent-preset', version: '1.0.0' })
    write(root, 'packages/tool/cordis.patch.yml', `- insert:
    - id: preset
      name: '@deepseek-ai/dsh-agent-preset'
      config:
        id: example
        plugins:
          - id: omitted
            name: missing-preset-plugin
`)
    await expect(inspect(root)).rejects.toThrow('references missing-preset-plugin')
  })

  it('measures supplied archive bytes and refuses altered artifacts', async () => {
    const root = fixture()
    const componentsManifest = release(root)
    const options = { harnessRoot: root, platform: 'darwin' as const, componentsManifest }
    const report = await createYourBuddyComponentInventory(options)
    expect(report.costs.archives?.archives[0]).toMatchObject({ component: 'harness', measuredBytes: 32, activation: 'startup' })
    expect(report.costs.networkDownloadedBytes).toBeNull()
    write(root, 'release/yourbuddy-harness-fixture.tar.zst', 'x'.repeat(32))
    await expect(createYourBuddyComponentInventory(options)).rejects.toThrow('measured archive does not match component manifest')
  })

  it('rejects empty package discovery and duplicate package identities', async () => {
    const root = fixture()
    write(root, 'packages/duplicate/package.json', { name: 'tool', version: '1.0.0' })
    await expect(inspect(root)).rejects.toThrow('duplicate prepared package tool')
    write(root, 'pnpm-workspace.yaml', 'packages:\n  - absent/*\n')
    await expect(inspect(root)).rejects.toThrow('prepared workspace contains no package manifests')
  })

  it('runs the inventory entry point twice with identical JSON and leaves input files unchanged', () => {
    const root = fixture()
    const manifestPath = join(root, '.bundle-manifest.json')
    const before = readFileSync(manifestPath)
    const argv = ['--import', 'tsx', resolve(import.meta.dirname, 'yourbuddy-component-inventory.ts'), '--harness', root]
    const options = { cwd: resolve(import.meta.dirname, '..'), encoding: 'utf8' as const, timeout: 30_000 }
    const first = execFileSync(process.execPath, argv, options)
    expect(execFileSync(process.execPath, argv, options)).toBe(first)
    const report = JSON.parse(first) as { counts: { selectedPackages: number } }
    expect(report.counts.selectedPackages).toBe(4)
    expect(readFileSync(manifestPath)).toEqual(before)
  })
})
