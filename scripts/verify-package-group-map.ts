/** Verify that the package-group map covers every non-empty workspace group exactly once. */

import { globSync, readFileSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import { parseMarkdown, visitMarkdown } from './markdown.ts'

const root = resolve(import.meta.dirname, '..')
const MAP_PATH = 'packages/README.md'

/** Package-group map audit result. */
export interface PackageGroupMapAudit {
  /** Non-empty groups discovered from package manifests. */
  readonly groups: readonly string[]
  /** Groups in their reader-facing map order. */
  readonly mapped: readonly string[]
  /** Missing, duplicate, or stale map entries. */
  readonly violations: readonly string[]
}

/** Normalize one filesystem glob result to repository slash form. */
function normalize(path: string): string {
  return path.split(sep).join('/')
}

/**
 * Discover non-empty `packages/<group>/` directories from package manifests.
 * @param scanRoot - Repository root containing `packages/`.
 * @returns Sorted package-group names.
 */
export function discoverPackageGroups(scanRoot: string = root): string[] {
  return [...new Set(
    globSync('packages/*/*/package.json', { cwd: scanRoot })
      .map(normalize)
      .map((path) => {
        const group = path.split('/')[1]
        if (group === undefined || group.length === 0) throw new Error(`invalid package path: ${path}`)
        return group
      }),
  )].sort()
}

/**
 * Read direct group-README links from the top-level package map.
 * @param source - Markdown source of `packages/README.md`.
 * @returns Package groups in reader-facing document order.
 */
export function packageGroupMapOrder(source: string): string[] {
  const groups: string[] = []
  visitMarkdown(parseMarkdown(source), (node) => {
    if (node.type !== 'link') return
    const match = /^([^/]+)\/README\.md$/.exec(node.url)
    const group = match?.[1]
    if (group !== undefined) groups.push(group)
  })
  return groups
}

/**
 * Audit the top-level package map against the non-empty package groups.
 * @param scanRoot - Repository root containing the package map and manifests.
 * @returns Discovered groups, mapped order, and violations.
 */
export function auditPackageGroupMap(scanRoot: string = root): PackageGroupMapAudit {
  const groups = discoverPackageGroups(scanRoot)
  const source = readFileSync(resolve(scanRoot, MAP_PATH), 'utf8')
  const mapped = packageGroupMapOrder(source)
  const counts = new Map<string, number>()
  for (const group of mapped) counts.set(group, (counts.get(group) ?? 0) + 1)

  const violations: string[] = []
  for (const group of groups) {
    const count = counts.get(group) ?? 0
    if (count === 0) violations.push(`${MAP_PATH}: missing package group link: ${group}/README.md`)
    if (count > 1) violations.push(`${MAP_PATH}: duplicate package group link: ${group}/README.md`)
  }
  const actual = new Set(groups)
  for (const group of [...counts.keys()].sort()) {
    if (!actual.has(group)) violations.push(`${MAP_PATH}: stale package group link: ${group}/README.md`)
  }
  return { groups, mapped, violations }
}

/**
 * Return the validated reader-facing package-group order.
 * @param scanRoot - Repository root containing the package map and manifests.
 * @returns Package groups in reader-facing document order.
 */
export function readPackageGroupOrder(scanRoot: string = root): string[] {
  const audit = auditPackageGroupMap(scanRoot)
  if (audit.violations.length > 0) {
    throw new Error(`package group map is stale:\n${audit.violations.map(item => `  ${item}`).join('\n')}`)
  }
  return [...audit.mapped]
}

function main(): void {
  const audit = auditPackageGroupMap()
  if (audit.violations.length > 0) {
    console.error('verify-package-group-map: package map violations found:')
    for (const violation of audit.violations) console.error(`  ${violation}`)
    process.exit(1)
  }
  console.log(`verify-package-group-map: ${String(audit.groups.length)} package group(s) mapped exactly once.`)
}

if (process.argv[1] && import.meta.filename === resolve(process.argv[1])) main()
