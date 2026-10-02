import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { afterEach, describe, expect, it } from 'vitest'
import { parseCapabilityPack, synchronizeCapabilityPacks } from '../src/capability-pack.ts'

const exec = promisify(execFile)
const roots: string[] = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

async function fixture(): Promise<{ root: string; profile: string; bin: string; packageDir: string }> {
  const root = await mkdtemp(join(tmpdir(), 'yourbuddy-capability-pack-'))
  roots.push(root)
  const profile = join(root, 'profile')
  const bin = join(root, 'bin')
  const packageDir = join(profile, 'node_modules', 'example-pack')
  await mkdir(join(packageDir, 'bin'), { recursive: true })
  await mkdir(join(packageDir, 'skills', 'example'), { recursive: true })
  await writeFile(join(profile, 'package.json'), JSON.stringify({ dependencies: { 'example-pack': '1.2.3' } }))
  await writeFile(join(packageDir, 'bin', 'example.mjs'), 'console.log("run")\n')
  await writeFile(join(packageDir, 'package.json'), JSON.stringify({
    name: 'example-pack',
    version: '1.2.3',
    dsh: { client: { platform: 'web' } },
    yourbuddy: { capabilityPack: {
      cli: { commands: [{ name: 'example-cli', entry: './bin/example.mjs', versionArgs: ['--version'] }] },
      skills: ['./skills/example'],
    } },
  }))
  return { root, profile, bin, packageDir }
}

describe('Capability Pack reconciliation', () => {
  it('accepts only explicit command and Skill declarations', () => {
    expect(parseCapabilityPack({ cli: { commands: [{ name: 'demo', entry: './bin/demo.mjs', versionArgs: ['--version'] }] }, skills: ['./skills/demo'] }))
      .toEqual({ cli: { commands: [{ name: 'demo', entry: './bin/demo.mjs', versionArgs: ['--version'] }] }, skills: ['./skills/demo'] })
    expect(parseCapabilityPack({ cli: { commands: [{ name: '../demo', entry: '/tmp/demo', versionArgs: [] }] }, skills: [] })).toBeUndefined()
  })

  it.runIf(process.platform === 'darwin')('exposes one same-version CLI and removes only its owned shim', async () => {
    const { profile, bin, packageDir } = await fixture()
    const originalPath = process.env.PATH
    process.env.PATH = '/usr/bin:/bin'
    try {
      const ledger = await synchronizeCapabilityPacks({ dir: profile }, bin, process.execPath)
      expect(ledger.packs).toEqual([{ packageName: 'example-pack', version: '1.2.3', commands: [{
        name: 'example-cli', entry: './bin/example.mjs', versionArgs: ['--version'], status: 'exposed',
      }], skills: [{ path: './skills/example', status: 'registered' }], ui: 'loaded' }])
      await expect(exec(join(bin, 'example-cli'), ['--version'])).resolves.toMatchObject({ stdout: 'example-pack@1.2.3\n' })

      await writeFile(join(profile, 'package.json'), JSON.stringify({ dependencies: {} }))
      await synchronizeCapabilityPacks({ dir: profile }, bin, process.execPath)
      await expect(readFile(join(bin, 'example-cli'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' })

      await writeFile(join(profile, 'package.json'), JSON.stringify({ dependencies: { 'example-pack': '1.2.3' } }))
      await synchronizeCapabilityPacks({ dir: profile }, bin, process.execPath)
      await writeFile(join(bin, 'example-cli'), '#!/bin/sh\necho user-owned\n')
      await writeFile(join(profile, 'package.json'), JSON.stringify({ dependencies: {} }))
      await synchronizeCapabilityPacks({ dir: profile }, bin, process.execPath)
      expect(await readFile(join(bin, 'example-cli'), 'utf8')).toContain('user-owned')
      expect(await readFile(join(packageDir, 'package.json'), 'utf8')).toContain('example-pack')
    }
    finally {
      process.env.PATH = originalPath
    }
  })
})
