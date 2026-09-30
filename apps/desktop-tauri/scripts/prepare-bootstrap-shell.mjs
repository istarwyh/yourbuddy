/** Prepare only resources that are intentionally embedded in the Bootstrap application. */

import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
mkdirSync(dist, { recursive: true })
for (const name of ['splash.html', 'shell.html', 'desktop-i18n.js', 'app-icon.png']) {
  cpSync(join(root, name), join(dist, name))
}

const pnpmSource = join(root, 'bundled', 'toolchain', 'pnpm-11.7.0.tgz')
const channel = join(root, 'component-channel')
for (const name of ['components.json', 'components.json.sig']) {
  if (!existsSync(join(channel, name))) throw new Error(`signed Bootstrap channel input is missing: component-channel/${name}`)
}
if (!existsSync(pnpmSource)) throw new Error('fixed pnpm package is missing; run prepare:dist first')
mkdirSync(channel, { recursive: true })
cpSync(pnpmSource, join(channel, 'pnpm-11.7.0.tgz'))
