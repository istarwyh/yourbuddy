import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import test from 'node:test'

const source = readFileSync(new URL('../product/ego-browser/lib/index.js', import.meta.url), 'utf8')
const start = source.indexOf('name: "ego_login_import"')
const end = source.indexOf('/** The structured action tools', start)
const registration = source.slice(start, end)

test('login import output declares the source-browser close status it returns', () => {
  assert.notEqual(start, -1)
  assert.notEqual(end, -1)
  assert.match(registration, /closedSource: \{ type: "boolean" \}/u)
  assert.match(source, /closedSource,\n\s+totalRead:/u)
})

test('POSIX source detection ignores the Agent Browser profile', async () => {
  const functionStart = source.indexOf('async function sourceBrowserPids')
  const functionEnd = source.indexOf('/**\n* Gracefully close the source browser', functionStart)
  const definition = source.slice(functionStart, functionEnd)
  const commands = new Map([
    [101, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
    [202, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome --user-data-dir=/Users/test/.local/share/ego-lite-linux/profile'],
  ])
  const execFile = async (command, args) => {
    if (command === 'pgrep') return { stdout: '101\n202\n' }
    if (command === 'ps') return { stdout: commands.get(Number(args[1])) ?? '' }
    throw new Error(`unexpected command: ${command}`)
  }
  const sourceBrowserPids = new Function('execFile$1', 'basename', `${definition}; return sourceBrowserPids`)(execFile, basename)

  assert.deepEqual(await sourceBrowserPids('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', null, 'darwin'), [101])
  assert.deepEqual(await sourceBrowserPids('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Users/test/.local/share/ego-lite-linux/profile', 'darwin'), [202])
})
