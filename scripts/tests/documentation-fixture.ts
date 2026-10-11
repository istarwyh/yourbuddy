/** Isolated filesystem fixtures for documentation ownership audits. */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { onTestFinished } from 'vitest'

/**
 * Allocate a test-owned directory and register its cleanup immediately.
 * @param prefix Temporary directory prefix identifying the audit.
 * @returns Absolute fixture directory.
 */
export function documentationFixture(prefix: string): string {
  const root = mkdtempSync(join(tmpdir(), prefix))
  onTestFinished(() => { rmSync(root, { recursive: true, force: true }) })
  return root
}

/**
 * Write one fixture source, creating its parent directory when needed.
 * @param root Fixture directory.
 * @param path Relative source path.
 * @param source Complete file content.
 */
export function writeDocumentationFixture(root: string, path: string, source: string): void {
  const absolute = join(root, path)
  mkdirSync(dirname(absolute), { recursive: true })
  writeFileSync(absolute, source)
}
