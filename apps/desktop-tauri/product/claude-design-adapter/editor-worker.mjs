/** Run the upstream editor in an owned child; acknowledge comments only after Host persistence. */
import { pathToFileURL } from 'node:url'
import { acquireEditorLock } from './editor-lock.mjs'

const [script, root] = process.argv.slice(2)
const pending = new Map()
let next = 0
process.on('message', message => {
  const receipt = pending.get(message.id)
  if (!receipt) return
  pending.delete(message.id)
  if (Object.hasOwn(message, 'error')) receipt.reject(new Error(message.error))
  else receipt.resolve()
})
process.on('disconnect', () => process.kill(process.pid, 'SIGTERM'))
const send = (kind, value) => new Promise((resolve, reject) => {
  const id = ++next
  pending.set(id, { resolve, reject })
  if (!process.connected) return reject(new Error('The YourBuddy Host disconnected.'))
  process.send({ type: 'comment', id, kind, value }, error => {
    if (error) { pending.delete(id); reject(error) }
  })
})
try {
  const ownership = await acquireEditorLock(root)
  process.once('exit', () => { void ownership })
  const server = await import(pathToFileURL(script).href)
  server.useYourBuddyLocalOnly()
  if (await server.runningServer(root)) throw new Error('An editor already owns this folder. Close it before opening it in YourBuddy.')
  const state = await server.serveForeground({
    root, host: '127.0.0.1', port: 0, portGiven: true,
    agentHook: { thread: value => send('thread', value), request: value => send('request', value) },
  })
  process.send({ type: 'ready', url: state.url })
} catch (error) {
  process.send({ type: 'failed', error: error instanceof Error ? error.message : String(error) }, () => process.exit(1))
}
