/** Count reachable production registry snapshots for a target, including peer variants. */
export function expectedRegistryPackageCount(lock, { os, cpu }) {
  const visited = new Set()
  function supports(constraints, target) {
    return !constraints?.length || (!constraints.includes(`!${target}`)
      && (constraints.includes(target) || constraints.every(value => value.startsWith('!'))))
  }
  function visit(name, version) {
    if (version.startsWith('link:') || version.startsWith('file:')) return
    const named = `${name}@${version}`
    // npm aliases store the actual package name in the version reference.
    const key = Object.hasOwn(lock.snapshots, named) ? named : version
    const snapshot = lock.snapshots[key]
    const pkg = lock.packages[key.split('(')[0]]
    if (!snapshot || !pkg) throw new Error(`Unresolved production lock reference: ${name}@${version}`)
    if (!supports(pkg.os, os) || !supports(pkg.cpu, cpu) || visited.has(key)) return
    visited.add(key)
    for (const section of ['dependencies', 'optionalDependencies']) {
      for (const [child, reference] of Object.entries(snapshot[section] ?? {})) visit(child, reference)
    }
  }
  for (const importer of Object.values(lock.importers)) {
    for (const section of ['dependencies', 'optionalDependencies']) {
      for (const [name, reference] of Object.entries(importer[section] ?? {})) visit(name, reference.version)
    }
  }
  return visited.size
}
