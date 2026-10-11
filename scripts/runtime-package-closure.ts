/** Select local runtime packages using the Desktop release's production dependency rules. */

/** A package manifest accompanied by caller-owned source or archive metadata. */
export interface RuntimePackageInput {
  readonly manifest: Readonly<Record<string, unknown>>
}

/**
 * Read sorted dependency names from one package-manifest section.
 * @param manifest Parsed package manifest.
 * @param section Dependency section to inspect.
 * @param label Diagnostic prefix for invalid manifest data.
 * @returns Sorted package names; an absent section contributes no names.
 */
export function runtimeDependencyNames(
  manifest: Readonly<Record<string, unknown>>, section: string, label: string,
): string[] {
  const value = manifest[section]
  if (value === undefined) return []
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label}: ${String(manifest.name)} has invalid ${section}`)
  }
  return Object.keys(value).sort()
}

/**
 * Select required local dependencies and peers plus available optional packages.
 * @param available Local package inputs indexed by npm name.
 * @param roots Packages whose runtime closure is required.
 * @param workspaceNames Names owned by the workspace, including omitted inputs.
 * @param label Diagnostic prefix.
 * @returns Selected inputs sorted by package name. Missing required workspace packages fail;
 * external packages remain the package manager's responsibility.
 */
export function selectRuntimePackageClosure<T extends RuntimePackageInput>(
  available: ReadonlyMap<string, T>, roots: readonly string[], workspaceNames: ReadonlySet<string>, label: string,
): T[] {
  const selected = new Map<string, T>()
  const visit = (name: string): void => {
    if (selected.has(name)) return
    const input = available.get(name)
    if (input === undefined) throw new Error(`${label}: packed inputs omit required package ${name}`)
    selected.set(name, input)
    for (const section of ['dependencies', 'peerDependencies']) {
      for (const dependency of runtimeDependencyNames(input.manifest, section, label)) {
        if (available.has(dependency)) visit(dependency)
        else if (workspaceNames.has(dependency)) {
          throw new Error(`${label}: ${name} requires unpacked package ${dependency}`)
        }
      }
    }
    for (const dependency of runtimeDependencyNames(input.manifest, 'optionalDependencies', label)) {
      if (available.has(dependency)) visit(dependency)
    }
  }
  for (const name of roots) {
    if (!available.has(name)) throw new Error(`${label}: packed inputs omit ${name}`)
    visit(name)
  }
  return [...selected.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([, input]) => input)
}
