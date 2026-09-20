/** Regression coverage for the authoritative package-group map. */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, expect, it, onTestFinished } from 'vitest'
import { auditPackageGroupMap, packageGroupMapOrder } from './verify-package-group-map.ts'

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'dsh-package-group-map-'))
  onTestFinished(() => { rmSync(root, { recursive: true, force: true }) })
  return root
}

function write(root: string, path: string, source: string): void {
  const absolute = join(root, path)
  mkdirSync(dirname(absolute), { recursive: true })
  writeFileSync(absolute, source)
}

describe('package group map', () => {
  it('preserves the reader-facing link order', () => {
    expect(packageGroupMapOrder([
      '| Group | Role |',
      '|---|---|',
      '| [`beta/`](beta/README.md) | Beta |',
      '| [`alpha/`](alpha/README.md) | Alpha |',
      '',
    ].join('\n'))).toEqual(['beta', 'alpha'])
  })

  it('accepts every non-empty group exactly once', () => {
    const root = fixture()
    write(root, 'packages/alpha/a/package.json', '{}\n')
    write(root, 'packages/beta/b/package.json', '{}\n')
    write(root, 'packages/README.md', '[Beta](beta/README.md)\n[Alpha](alpha/README.md)\n')

    expect(auditPackageGroupMap(root)).toEqual({
      groups: ['alpha', 'beta'],
      mapped: ['beta', 'alpha'],
      violations: [],
    })
  })

  it('rejects missing, duplicate, and stale group links', () => {
    const root = fixture()
    write(root, 'packages/alpha/a/package.json', '{}\n')
    write(root, 'packages/beta/b/package.json', '{}\n')
    write(root, 'packages/README.md', [
      '[Alpha](alpha/README.md)',
      '[Alpha again](alpha/README.md)',
      '[Removed](removed/README.md)',
      '',
    ].join('\n'))

    expect(auditPackageGroupMap(root).violations).toEqual([
      'packages/README.md: duplicate package group link: alpha/README.md',
      'packages/README.md: missing package group link: beta/README.md',
      'packages/README.md: stale package group link: removed/README.md',
    ])
  })

  it('ignores nested package and translated README links', () => {
    expect(packageGroupMapOrder([
      '[leaf](alpha/pkg/README.md)',
      '[translation](alpha/README.zh.md)',
      '[group](alpha/README.md)',
      '',
    ].join('\n'))).toEqual(['alpha'])
  })
})
