/** Rebuild the vendored sidebar twice in owned staging; never replace the product snapshot. */
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import {
  closeSync, copyFileSync, cpSync, existsSync, globSync, lstatSync, mkdirSync,
  openSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, unlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const stagingRoot = '/tmp/yourbuddy-sidebar-build'
const upstreamCommit = 'd641d2e2117c427f8373f37b786ea0613455bf28'
const upstreamBase = `https://raw.githubusercontent.com/omdsh-dev/DSH-better-sidebar/${upstreamCommit}`
const pinnedInputs = {
  'package.json': '5fe8d7c087a042c55a261dabd8781897fcfaccac2e2094ec60cab27e6292a101',
  'pnpm-lock.yaml': '2626aabffd165a5bdca9049e07e33f572b2ad61d1a0c697b7f57552dd0dcc518',
  'pnpm-workspace.yaml': '0bb08c9a394750402a5dd1dd72f529a4b0c6af6886b463c14ef97c7d30d22ae5',
  'tsconfig.build.json': 'aea8aa2fac726d12317d4bd77e5cbdf8f6747ad57909d862aad8ca51c20cefe8',
  'tsconfig.json': '71ffa32d2eeb083c41b2d8c11dbeb8d13b049b54e6cb7196065aa2dd4040b9d7',
  'tsdown.config.ts': '4bda643a4ac602bf6dfe7f27da80ae531691160b7fec01924bdfc36bb51bc42c',
}
const sortedConfigHash = '1b030bf09b5c6dc989606b35a39ab57b95370e2f784292fab9065689b802eedf'
const inlineOwners = new Set(['@deepseek-ai/dsh-brand', '@deepseek-ai/dsh-session'])
const sourceEntries = ['src', 'locale', 'cordis.patch.yml', 'icon.svg']
const markerName = '.yourbuddy-sidebar-build.json'

function digest(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}

function removeEntry(path) {
  const stat = lstatSync(path, { throwIfNoEntry: false })
  if (!stat) return
  if (stat.isSymbolicLink()) unlinkSync(path)
  else rmSync(path, { recursive: stat.isDirectory(), force: true })
}

/**
 * Claim one staging directory and hold its exclusive lock through the callback.
 * An existing unmarked directory or another checkout's marker is never adopted.
 * @param {string} root Staging path, fixed by the CLI and unique per test.
 * @param {string} repo Repository owning this staging directory.
 * @param {() => Promise<unknown>} work Work completed before releasing the lock.
 * @returns {Promise<unknown>} The callback result.
 */
export async function withSidebarStaging(root, repo, work) {
  const identity = { script: 'rebuild-better-sidebar.mjs', repository: realpathSync(repo), version: 1 }
  if (!lstatSync(root, { throwIfNoEntry: false })) {
    mkdirSync(root, { mode: 0o700 })
    writeFileSync(join(root, markerName), `${JSON.stringify(identity)}\n`, { flag: 'wx', mode: 0o600 })
  }
  const marker = join(root, markerName)
  if (!lstatSync(root).isDirectory() || lstatSync(marker, { throwIfNoEntry: false })?.isSymbolicLink()
    || !existsSync(marker) || readFileSync(marker, 'utf8') !== `${JSON.stringify(identity)}\n`) {
    throw new Error(`Refusing unowned sidebar staging: ${root}; move it aside before running this recipe`)
  }
  const lock = join(root, '.build-lock')
  const handle = openSync(lock, 'wx', 0o600)
  try {
    return await work()
  }
  finally {
    closeSync(handle)
    unlinkSync(lock)
  }
}

/**
 * Sort only the existing CSS class-map entries, preserving CSS and class names.
 * @param {string} source Original upstream tsdown configuration.
 * @returns {string} Configuration with the sole approved reproducibility edit.
 */
export function stabilizeSidebarCss(source) {
  const before = 'Object.entries(cssExports ?? {})'
  if (source.split(before).length !== 2) throw new Error('Expected one upstream CSS export-map loop')
  return source.replace(before, `${before}.sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)`)
}

/**
 * Hash every file under a directory, including source maps and linked declarations.
 * @param {string} root Directory to fingerprint.
 * @returns {Record<string, string>} Sorted relative paths and SHA-256 values.
 */
export function sidebarFileHashes(root) {
  const result = {}
  function walk(path, prefix) {
    for (const entry of readdirSync(path, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
      const name = `${prefix}${entry.name}`
      if (entry.isDirectory()) walk(join(path, entry.name), `${name}/`)
      else result[name] = digest(readFileSync(join(path, entry.name)))
    }
  }
  walk(root, '')
  return result
}

/**
 * Link every current DSH/Cordis owner; copy inline runtime files at stable paths.
 * Inline declarations retain the same workspace realpaths as other owner imports.
 * @param {string} repo Current repository with built owner lib directories.
 * @param {string} root Owned staging directory with an installed dependency tree.
 * @returns {object[]} Owner versions, locations, content hashes and file modes.
 */
export function stageSidebarOwners(repo, root) {
  const owners = []
  for (const manifestPath of globSync(['packages/*/*/package.json', 'vendor/*/package.json'], { cwd: repo }).sort()) {
    const source = realpathSync(dirname(join(repo, manifestPath)))
    const manifest = JSON.parse(readFileSync(join(source, 'package.json'), 'utf8'))
    if (!manifest.name.startsWith('@deepseek-ai/')) continue
    const destination = join(root, 'node_modules', manifest.name)
    mkdirSync(dirname(destination), { recursive: true })
    const existing = lstatSync(destination, { throwIfNoEntry: false })
    if (existing && !existing.isSymbolicLink()) throw new Error(`Expected an installed owner link: ${manifest.name}`)
    if (existing) unlinkSync(destination)
    const owner = { name: manifest.name, version: manifest.version, license: manifest.license, source: relative(repo, source).split(sep).join('/'), mode: 'link' }
    if (!inlineOwners.has(manifest.name)) symlinkSync(source, destination, 'dir')
    else {
      owner.mode = 'inline-runtime'
      owner.files = []
      const files = ['package.json', 'LICENSE', ...Object.keys(sidebarFileHashes(join(source, 'lib'))).map(name => `lib/${name}`)]
      for (const name of files) {
        const from = name === 'LICENSE' ? join(repo, 'LICENSE') : join(source, name)
        const target = join(destination, name)
        mkdirSync(dirname(target), { recursive: true })
        if (name.endsWith('.d.ts')) {
          const linkTarget = realpathSync(from)
          const withinOwner = relative(source, linkTarget)
          if (isAbsolute(withinOwner) || withinOwner === '..' || withinOwner.startsWith(`..${sep}`)) {
            throw new Error(`Declaration is outside its workspace owner: ${manifest.name}/${name}`)
          }
          symlinkSync(linkTarget, target, 'file')
          owner.files.push({ path: name, mode: 'link', target: relative(repo, linkTarget).split(sep).join('/'), sha256: digest(readFileSync(from)) })
        }
        else {
          copyFileSync(from, target)
          owner.files.push({ path: name, mode: 'copy', sha256: digest(readFileSync(target)) })
        }
      }
    }
    owners.push(owner)
  }
  for (const name of inlineOwners) {
    if (!owners.some(owner => owner.name === name)) throw new Error(`Missing workspace owner: ${name}`)
  }
  return owners
}

function inputHashes(repo, root, owners) {
  const staged = Object.fromEntries(Object.keys(pinnedInputs).map(name => [name, digest(readFileSync(join(root, name)))]))
  for (const name of sourceEntries) {
    const path = join(root, name)
    staged[name] = lstatSync(path).isDirectory() ? sidebarFileHashes(path) : digest(readFileSync(path))
  }
  const workspace = owners.map(owner => {
    const source = join(repo, owner.source)
    return {
      name: owner.name,
      package: digest(readFileSync(join(source, 'package.json'))),
      lib: digest(JSON.stringify(sidebarFileHashes(join(source, 'lib')))),
    }
  })
  const inline = [...inlineOwners].map(name => ({ name, files: sidebarFileHashes(join(root, 'node_modules', name)) }))
  return { staged, workspace, inline }
}

/**
 * Run the original clean build twice and require unchanged inputs and equal full lib trees.
 * @param {string} root Owned staging directory; evidence is written only here.
 * @param {() => void} build Original package build command, synchronous until child exit.
 * @param {() => object} inputs Current build-input fingerprints.
 * @returns {Record<string, string>} Verified output file hashes.
 */
export function verifySidebarRepeatBuild(root, build, inputs) {
  const evidence = join(root, '.build-evidence')
  mkdirSync(evidence, { recursive: true })
  const before = inputs()
  writeJson(join(evidence, 'inputs.json'), before)
  const outputs = []
  for (const number of [1, 2]) {
    build()
    if (JSON.stringify(inputs()) !== JSON.stringify(before)) throw new Error(`Sidebar inputs changed during build ${number}`)
    const hashes = sidebarFileHashes(join(root, 'lib'))
    if (Object.keys(hashes).length === 0) throw new Error(`Sidebar build ${number} emitted no files`)
    writeJson(join(evidence, `build-${number}.json`), hashes)
    outputs.push(hashes)
  }
  if (JSON.stringify(outputs[0]) !== JSON.stringify(outputs[1])) {
    throw new Error(`Sidebar clean builds differ; inspect ${evidence}`)
  }
  return outputs[1]
}

/**
 * Preserve proxy routing while removing credentials and NODE_ENV from build children.
 * The original bundler defaults to production; installation still includes its dev tools.
 * @param {Record<string, string | undefined>} environment Parent environment.
 * @returns {Record<string, string | undefined>} Build subprocess environment.
 */
export function sidebarBuildEnvironment(environment) {
  return {
    ...Object.fromEntries(Object.entries(environment).filter(([name]) =>
      !/key|secret|token|password/i.test(name) && name !== 'NODE_ENV'
      && !/^npm_config_(registry|userconfig|globalconfig|store_dir)$/i.test(name))),
    CI: 'true',
    COREPACK_NPM_REGISTRY: 'https://registry.npmjs.org',
    npm_config_registry: 'https://registry.npmjs.org',
  }
}

async function rebuildSidebar() {
  if (process.platform === 'win32') throw new Error('This fixed-/tmp build recipe requires a POSIX host')
  await withSidebarStaging(stagingRoot, repositoryRoot, async () => {
    for (const name of [...sourceEntries, 'lib', 'node_modules', '.build-evidence']) removeEntry(join(stagingRoot, name))
    for (const [name, expected] of Object.entries(pinnedInputs)) {
      const response = await fetch(`${upstreamBase}/${name}`, { redirect: 'error' })
      if (!response.ok) throw new Error(`Upstream input download failed: ${name} (${response.status})`)
      const bytes = Buffer.from(await response.arrayBuffer())
      if (digest(bytes) !== expected) throw new Error(`Pinned upstream input differs: ${name}`)
      writeFileSync(join(stagingRoot, name), bytes)
    }
    const config = join(stagingRoot, 'tsdown.config.ts')
    const sortedConfig = stabilizeSidebarCss(readFileSync(config, 'utf8'))
    if (digest(sortedConfig) !== sortedConfigHash) throw new Error('Unexpected sorted CSS configuration')
    writeFileSync(config, sortedConfig)
    const product = join(repositoryRoot, 'apps/desktop-tauri/product/dsh-better-sidebar')
    for (const name of sourceEntries) cpSync(join(product, name), join(stagingRoot, name), { recursive: true })
    const env = sidebarBuildEnvironment(process.env)
    env.COREPACK_HOME = join(stagingRoot, '.corepack')
    env.npm_config_store_dir = join(stagingRoot, '.pnpm-store')
    for (const kind of ['userconfig', 'globalconfig']) {
      const path = join(stagingRoot, `.npm-${kind}`)
      writeFileSync(path, '')
      env[`npm_config_${kind}`] = path
    }
    const pnpm = (args, capture = false) => {
      const child = spawnSync('corepack', ['pnpm@11.8.0', ...args], {
        cwd: stagingRoot, env, encoding: 'utf8', stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
      })
      if (child.error || child.signal || child.status !== 0) {
        throw new Error(`Pinned pnpm ${args[0]} failed (exit ${child.status}, signal ${child.signal}, spawn ${child.error?.code ?? 'ok'})`)
      }
      return child.stdout?.trim()
    }
    if (pnpm(['--version'], true) !== '11.8.0') throw new Error('Expected pnpm 11.8.0')
    pnpm(['install', '--frozen-lockfile', '--ignore-scripts', '--store-dir', env.npm_config_store_dir])
    for (const [name, version] of Object.entries({ typescript: '5.6.2', tsdown: '0.22.14', lightningcss: '1.33.0' })) {
      const manifest = JSON.parse(readFileSync(join(stagingRoot, 'node_modules', name, 'package.json'), 'utf8'))
      if (manifest.version !== version) throw new Error(`Expected ${name}@${version}, found ${manifest.version}`)
    }
    if (digest(readFileSync(join(stagingRoot, 'pnpm-lock.yaml'))) !== pinnedInputs['pnpm-lock.yaml']) throw new Error('Frozen sidebar lockfile changed')
    const owners = stageSidebarOwners(repositoryRoot, stagingRoot)
    mkdirSync(join(stagingRoot, '.build-evidence'))
    writeJson(join(stagingRoot, '.build-evidence/owners.json'), owners)
    const outputs = verifySidebarRepeatBuild(stagingRoot, () => pnpm(['run', 'build']), () => inputHashes(repositoryRoot, stagingRoot, owners))
    writeJson(join(stagingRoot, '.build-evidence/result.json'), {
      upstreamCommit, originalInputs: pinnedInputs, sortedConfigSha256: sortedConfigHash,
      node: process.version, pnpm: '11.8.0', typescript: '5.6.2', tsdown: '0.22.14', lightningcss: '1.33.0',
      environment: { nodeEnv: 'unset', registry: 'https://registry.npmjs.org', npmConfigs: 'empty staging files', credentialVariables: 'removed', proxyRouting: 'inherited' },
      workspaceOwners: owners.length, identicalCleanBuilds: true, outputFiles: Object.keys(outputs).length,
    })
    console.log(`Two identical sidebar builds: ${stagingRoot}/lib (${Object.keys(outputs).length} files); evidence: ${stagingRoot}/.build-evidence`)
  })
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.length > 2) throw new Error('Usage: node apps/desktop-tauri/scripts/rebuild-better-sidebar.mjs')
  await rebuildSidebar()
}
