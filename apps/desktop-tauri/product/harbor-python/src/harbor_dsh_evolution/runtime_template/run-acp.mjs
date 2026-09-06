import { isAbsolute } from 'node:path'
import { parseArgs } from 'node:util'
import { boot, installFailLoud } from '@deepseek-ai/dsh-app-boot'

installFailLoud('harbor-owned-acp')
const { values } = parseArgs({ options: { config: { type: 'string' } } })
if (!values.config || !isAbsolute(values.config)) {
  throw new Error('harbor-owned-acp requires an explicit absolute --config path')
}

// Mount only the Candidate configuration supplied by the adapter. Do not load
// .env files, Host profiles, optional user patches, or a package-selected app.
const ctx = await boot('harbor-owned-acp', values.config)
let closing
function close() {
  closing ??= ctx.fiber.dispose().then(() => { process.exitCode = 0 })
  return closing
}

// Do not force process.exit(): persistence/checkpoint I/O must drain on EOF
// and cancellation before the process may exit.
process.stdin.once('end', () => { void close() })
process.once('SIGTERM', () => { void close() })
process.once('SIGINT', () => { void close() })
if (process.stdin.readableEnded) void close()
