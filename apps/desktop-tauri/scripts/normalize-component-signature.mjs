/** Convert Tauri's base64 signature wrapper into minisign text for the native verifier. */

import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

/**
 * Return the raw minisign document accepted by `minisign-verify`.
 * @param {string} input Tauri signer output or an already-normalized minisign document.
 * @returns {string} Raw minisign text with one trailing newline.
 */
export function normalizeComponentSignature(input) {
  const trimmed = input.trim()
  const decoded = trimmed.startsWith('untrusted comment:')
    ? trimmed
    : Buffer.from(trimmed, 'base64').toString('utf8').trim()
  if (!decoded.startsWith('untrusted comment:') || !decoded.includes('\ntrusted comment:')) {
    throw new Error('component signature is not a minisign document')
  }
  return `${decoded}\n`
}

function main() {
  const [source, destination = source] = process.argv.slice(2)
  if (source === undefined) throw new Error('usage: normalize-component-signature.mjs <source> [destination]')
  writeFileSync(destination, normalizeComponentSignature(readFileSync(source, 'utf8')))
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main()
