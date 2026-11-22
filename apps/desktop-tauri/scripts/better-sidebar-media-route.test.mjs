import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

const desktopRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const snapshotRoot = join(desktopRoot, 'product', 'dsh-better-sidebar')

function sourcePaths() {
  const config = pathToFileURL(join(snapshotRoot, 'src', 'config.ts')).href
  const paths = pathToFileURL(join(snapshotRoot, 'src', 'path-security.ts')).href
  const workspace = resolve(tmpdir(), 'sidebar-workspace')
  const outside = resolve(tmpdir(), 'sidebar-outside', 'movie.mp4')
  const result = spawnSync(process.execPath, ['--import', 'tsx/esm', '--input-type=module', '-e', `
    import { Config } from ${JSON.stringify(config)}
    import { ensureWorkspacePath, ensureWorkspaceWritePath } from ${JSON.stringify(paths)}
    const workspace = ${JSON.stringify(workspace)}
    const outside = ${JSON.stringify(outside)}
    console.log(JSON.stringify({
      mediaDeclared: Object.hasOwn(Config.dict, 'mediaLimit'),
      fenceDeclared: Object.hasOwn(Config.dict, 'workspaceFence'),
      read: await ensureWorkspacePath(workspace, outside),
      write: await ensureWorkspaceWritePath(workspace, outside),
    }))
  `], { cwd: join(desktopRoot, '../..'), encoding: 'utf8', timeout: 30_000 })
  assert.equal(result.error, undefined)
  assert.equal(result.signal, null)
  assert.equal(result.status, 0, result.stderr)
  return { ...JSON.parse(result.stdout), outside }
}

function findSyntaxNode(root, predicate) {
  if (predicate(root)) return root
  return ts.forEachChild(root, child => findSyntaxNode(child, predicate))
}

function mediaHandler(dependencies) {
  const source = readFileSync(join(snapshotRoot, 'lib', 'index.js'), 'utf8')
  const parsed = ts.createSourceFile('index.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
  const route = findSyntaxNode(parsed, node => ts.isObjectLiteralExpression(node)
    && node.properties.some(property => ts.isPropertyAssignment(property)
      && property.name.getText(parsed) === 'path'
      && ts.isStringLiteral(property.initializer) && property.initializer.text === '/sidebar/file'))
  assert.ok(route)
  const handler = route.properties.find(property => ts.isPropertyAssignment(property) && property.name.getText(parsed) === 'handler')
  assert.ok(handler)
  return Function(...Object.keys(dependencies), `return ${handler.initializer.getText(parsed)}`)(...Object.values(dependencies))
}

test('generic file routes stream large media without a transfer size cap', async () => {
  const size = 2 ** 40
  const path = resolve(tmpdir(), 'sidebar-outside', 'movie.mp4')
  const streamed = []
  const handler = mediaHandler({
    fence: () => true,
    ctx: {},
    sessionCwdOf: async () => resolve(tmpdir(), 'sidebar-workspace'),
    activeWorktreeRootOf: async (_ctx, _id, cwd) => cwd,
    ensureWorkspacePath: async (_cwd, target) => target,
    statFileForRoute: async () => ({ isFile: () => true, size }),
    mediaTypeForPath: () => 'video/mp4',
    basename,
    byteRangeOf: () => undefined,
    streamFileToResponse: async (...args) => { streamed.push(args) },
    writeError: (_res, error) => { throw error },
  })
  const response = {}
  const query = new URLSearchParams({ sessionId: 'session', path })
  await handler({ method: 'GET', url: `/sidebar/file?${query}`, headers: {} }, response)
  assert.equal(streamed.length, 1)
  assert.deepEqual(streamed[0].slice(0, 3), [path, size, response])
  assert.equal(streamed[0][3]['accept-ranges'], 'bytes')
  assert.equal(streamed[0][3]['content-type'], 'video/mp4')
})

test('file route configuration and resolution accept absolute host paths outside the workspace', () => {
  const result = sourcePaths()
  assert.equal(result.mediaDeclared, false)
  assert.equal(result.fenceDeclared, false)
  assert.equal(result.read, result.outside)
  assert.equal(result.write, result.outside)
})
