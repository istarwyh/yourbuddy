/**
 * Prepare the frontend, core, capabilities, and offline release inputs.
 */
import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import { assertPreparedCapability, CAPABILITY_COMPONENTS } from './prepare-capability-components.mjs'

const desktopRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Prepare release inputs in dependency order, stopping before later stages on failure.
 * @param {string} root Desktop product directory.
 * @returns {number} Preparation subprocess exit status.
 */
export function prepareDist(root = desktopRoot) {
  const dist = join(root, 'dist')
  mkdirSync(dist, { recursive: true })
  cpSync(join(root, 'splash.html'), join(dist, 'splash.html'))
  cpSync(join(root, 'shell.html'), join(dist, 'shell.html'))
  cpSync(join(root, 'desktop-i18n.js'), join(dist, 'desktop-i18n.js'))
  cpSync(join(root, 'splash-state.js'), join(dist, 'splash-state.js'))
  cpSync(join(root, 'app-icon.png'), join(dist, 'app-icon.png'))

  const bundleScript = join(root, 'scripts', 'bundle-harness-source.mjs')
  const result = spawnSync(process.execPath, [bundleScript], { stdio: 'inherit', cwd: root })
  if (result.status !== 0) {
    return result.status ?? 1
  }

  const capabilitiesScript = join(root, 'scripts', 'prepare-capability-components.mjs')
  const capabilities = spawnSync(process.execPath, [capabilitiesScript], { stdio: 'inherit', cwd: root })
  if (capabilities.status !== 0) {
    return capabilities.status ?? 1
  }
  for (const { key } of CAPABILITY_COMPONENTS) {
    assertPreparedCapability(join(root, 'bundled', 'capabilities', key))
  }

  const offlineStoreScript = join(root, 'scripts', 'prepare-harness-offline-store.mjs')
  const offlineStore = spawnSync(process.execPath, [offlineStoreScript], { stdio: 'inherit', cwd: root })
  if (offlineStore.status !== 0) {
    return offlineStore.status ?? 1
  }

  const toolchainScript = join(root, 'scripts', 'prepare-managed-toolchain.mjs')
  const toolchain = spawnSync(process.execPath, [toolchainScript], { stdio: 'inherit', cwd: root })
  if (toolchain.status !== 0) {
    return toolchain.status ?? 1
  }

  const productRuntimeScript = join(root, 'scripts', 'prepare-yourbuddy-runtime.mjs')
  const productRuntime = spawnSync(process.execPath, [productRuntimeScript], { stdio: 'inherit', cwd: root })
  if (productRuntime.status !== 0) {
    return productRuntime.status ?? 1
  }

  if (!existsSync(join(root, 'bundled', 'harness', '.bundle-manifest.json'))) {
    throw new Error('bundled harness manifest missing after bundle-harness-source.mjs')
  }
  if (!existsSync(join(root, 'bundled', 'yourbuddy-runtime', 'manifest.json'))) {
    throw new Error('YourBuddy runtime manifest missing after prepare-yourbuddy-runtime.mjs')
  }
  if (!existsSync(join(root, 'bundled', 'harness', 'yourbuddy-pnpm-store.tar.gz'))) {
    throw new Error('offline pnpm store archive missing after prepare-harness-offline-store.mjs')
  }
  if (!existsSync(join(root, 'bundled', 'toolchain', 'manifest.json'))) {
    throw new Error('managed Node/pnpm toolchain missing after prepare-managed-toolchain.mjs')
  }

  const componentChannel = join(root, 'component-channel')
  mkdirSync(componentChannel, { recursive: true })
  cpSync(
    join(root, 'bundled', 'toolchain', 'pnpm-11.7.0.tgz'),
    join(componentChannel, 'pnpm-11.7.0.tgz'),
  )
  return 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = prepareDist()
}
