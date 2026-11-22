/** Download and verify the fixed macOS arm64 Node/pnpm first-run toolchain. */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const desktopRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const outRoot = join(desktopRoot, 'bundled', 'toolchain')

/** Fixed pnpm package embedded in Bootstrap and Offline resources. */
export const PNPM_ARTIFACT = {
  file: 'pnpm-11.28.5.tgz',
  url: 'https://registry.npmjs.org/pnpm/-/pnpm-11.28.5.tgz',
  algorithm: 'sha512',
  encoding: 'base64',
  digest: 'SEVj0wtMKtJ8tIqpT/KzAtvOvI/2vyiBbCWJiG4UbOf3bzVPO8GkOOb16XaMMCqgpvet2CMpA81M+BQmy8FNng==',
}

export const TOOLCHAIN_ARTIFACTS = [
  {
    file: 'node-v24.22.3-darwin-arm64.tar.gz',
    url: 'https://nodejs.org/dist/v24.22.3/node-v24.22.3-darwin-arm64.tar.gz',
    algorithm: 'sha256',
    encoding: 'hex',
    digest: 'ff6e17d4874b76d272212b908cc020d6e815fba5a6c7eaaa06add725840307fd',
  },
  PNPM_ARTIFACT,
]

export function artifactMatches(bytes, artifact) {
  return createHash(artifact.algorithm).update(bytes).digest(artifact.encoding) === artifact.digest
}

async function ensureArtifact(artifact) {
  const destination = join(outRoot, artifact.file)
  if (existsSync(destination) && artifactMatches(readFileSync(destination), artifact)) return destination
  rmSync(destination, { force: true })

  const response = await fetch(artifact.url, { redirect: 'follow' })
  if (!response.ok) throw new Error(`toolchain download failed: ${artifact.url} (${response.status})`)
  const bytes = Buffer.from(await response.arrayBuffer())
  if (!artifactMatches(bytes, artifact)) {
    throw new Error(`toolchain integrity mismatch: ${artifact.file}`)
  }
  const partial = `${destination}.part`
  writeFileSync(partial, bytes)
  renameSync(partial, destination)
  return destination
}

export async function prepareManagedToolchain() {
  mkdirSync(outRoot, { recursive: true })
  for (const artifact of TOOLCHAIN_ARTIFACTS) await ensureArtifact(artifact)
  const manifest = {
    platform: 'darwin-arm64',
    nodeVersion: '24.22.3',
    pnpmVersion: '11.28.5',
    artifacts: TOOLCHAIN_ARTIFACTS.map(({ file, url, algorithm, encoding, digest }) => ({
      file, url, algorithm, encoding, digest,
    })),
  }
  writeFileSync(join(outRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(`prepare-managed-toolchain: wrote ${outRoot}`)
  return manifest
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isDirectRun) await prepareManagedToolchain()
