import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import ts from 'typescript'

const clientRoot = join(import.meta.dirname, '../product/dsh-better-sidebar/src/client')

/** Compile dependency-free source helpers, including their private constants. */
function sourceModule(file) {
  const emitted = ts.transpileModule(readFileSync(join(clientRoot, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
  }).outputText
  return Function('exports', `${emitted}; return exports`)({})
}

function findNode(root, predicate) {
  if (predicate(root)) return root
  return ts.forEachChild(root, child => findNode(child, predicate))
}

/** Read an actual component callback without creating a parallel routing implementation. */
function sourceCallback(file, name, dependencies = {}) {
  const source = readFileSync(join(clientRoot, file), 'utf8')
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const declaration = findNode(parsed, node => ((ts.isVariableDeclaration(node) || ts.isPropertyAssignment(node))
    && node.name.getText(parsed) === name) || (ts.isBinaryExpression(node)
    && node.operatorToken.kind === ts.SyntaxKind.EqualsToken && node.left.getText(parsed) === name))
  const callback = declaration && (ts.isBinaryExpression(declaration) ? declaration.right : declaration.initializer)
  assert.ok(callback, `${file}: ${name}`)
  const emitted = ts.transpileModule(`const callback = ${callback.getText(parsed)}`, {
    compilerOptions: { target: ts.ScriptTarget.ES2023 },
  }).outputText
  return Function(...Object.keys(dependencies), `${emitted}; return callback`)(...Object.values(dependencies))
}

/** Evaluate an owning source declaration without booting the browser application. */
function sourceFunction(file, name, dependencies = {}) {
  const source = readFileSync(join(clientRoot, file), 'utf8')
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const declaration = parsed.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name)
  assert.ok(declaration, `${file}: ${name}`)
  const emitted = ts.transpileModule(declaration.getText(parsed), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
  }).outputText
  return Function('exports', ...Object.keys(dependencies), `${emitted}; return ${name}`)(
    {}, ...Object.values(dependencies),
  )
}

const { isNativeDocumentPath } = sourceModule('native/file-types.ts')
const { fileAddressFor } = sourceModule('resource-address.ts')
const { baseName, resolveSidebarPath } = sourceModule('paths.ts')
const openSidebarFile = sourceFunction('sidebar-file.ts', 'openSidebarFile', { resolveSidebarPath })

function routingScenario({ preferWorkbench = true, onNativeDocumentOpen } = {}) {
  const native = []
  const workbench = []
  const intents = []
  const documents = []
  const createService = sourceFunction('service.ts', 'createBetterSidebarService', {
    isNativeDocumentPath,
    baseNameOf: sourceFunction('service.ts', 'baseNameOf'),
    brandString: value => value,
    SIDEBAR_SERVICE_VERSION: 1,
    SIDEBAR_FEATURES: [],
    openTabInBottomPane() {},
    safeCall: callback => callback(),
  })
  const store = {
    getPrefs: () => ({ tabsEnabled: {}, viewersEnabled: {} }),
    getSnapshot: () => ({ sessionId: 'current', state: {} }),
    reduce: reducer => { workbench.push(reducer) },
    reduceFor: (_sessionId, reducer) => { workbench.push(reducer) },
  }
  const service = createService(store, {
    preferWorkbench: () => preferWorkbench,
    onOpenIntent: intent => { intents.push(intent) },
    onNativeDocumentOpen: intent => { documents.push(intent); onNativeDocumentOpen?.(intent) },
  })
  service.registerTab({ id: 'editor', title: 'Files', component() {} })
  const surface = {
    fileAddress: fileAddressFor,
    openResource: request => { native.push(request) },
    openTab: request => { native.push(request) },
  }
  service.setSurface(surface)
  return { service, surface, native, workbench, intents, documents }
}

function agentFeed(scenario, { expanded = false, width = 600, mountedSession = 'current', accepts = true } = {}) {
  let columnExpanded = expanded
  let toggles = 0
  const column = {
    isExpanded: () => columnExpanded,
    toggleExpanded: () => { columnExpanded = !columnExpanded; toggles += 1 },
  }
  scenario.service.setSurface({
    ...scenario.surface,
    openResource: request => {
      scenario.native.push(request)
      if (accepts && request.sessionId === mountedSession) columnExpanded = true
    },
  })
  const ctx = {
    sessions: { list: { getSnapshot: () => ({ byId: { current: { cwd: '/workspace' } } }) } },
    get: name => name === 'sidebarRight' ? column : scenario.service,
  }
  const receive = sourceCallback('sidebar/use-host-feeds.ts', 'socket.onmessage', {
    ctx, sessionId: 'current', store: { getPrefs: () => ({ agentOpenTools: true }) },
    isNativeDocumentPath, mountedSessionId: () => mountedSession,
    isNarrowWidth: sourceFunction('breakpoints.ts', 'isNarrowWidth', { NARROW_MAX_WIDTH: 768 }),
    window: { innerWidth: width },
  })
  return { ctx, receive, expanded: () => columnExpanded, toggles: () => toggles }
}

test('product workbench routes PDF, Word, PowerPoint and Excel files to existing native readers', () => {
  const scenario = routingScenario()
  for (const extension of ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx']) {
    scenario.service.openTab({ type: 'editor', path: `/workspace/report.${extension}` })
  }
  assert.equal(scenario.native.length, 7)
  assert.equal(scenario.workbench.length, 0)
  assert.deepEqual(scenario.documents, Array(7).fill('user'))
})

test('document matching handles mixed case and Windows paths without claiming directory names or dotfiles', () => {
  for (const path of ['/work/Report.PdF', 'C:\\work\\Report.DoCx', 'slides.PPTX', 'budget.XLS']) {
    assert.equal(isNativeDocumentPath(path), true, path)
  }
  for (const path of ['.pdf', '/work/.xlsx', '/report.docx/readme', 'C:\\report.pptx\\readme', 'report.xlsx.tmp']) {
    assert.equal(isNativeDocumentPath(path), false, path)
  }
})

test('document opens retain Session-scoped identity and request native deduplication', () => {
  const scenario = routingScenario()
  const path = '/workspace/预算 #1.XLSX'
  const current = { sessionId: 'current', cwd: '/workspace' }
  scenario.service.openFile(current, path)
  scenario.service.openFile(current, path)
  scenario.service.openFile({ sessionId: 'other', cwd: '/workspace' }, path)
  const address = fileAddressFor('current', '/workspace', path)
  assert.deepEqual(scenario.native, [
    { sessionId: 'current', address, revealIfOpened: true },
    { sessionId: 'current', address, revealIfOpened: true },
    { sessionId: 'other', address: fileAddressFor('other', '/workspace', path), revealIfOpened: true },
  ])
  assert.deepEqual(scenario.intents, ['user', 'user'])
  assert.deepEqual(scenario.documents, ['user', 'user'])
})

test('agent-open feed and workbench tree share one document resource identity', () => {
  const scenario = routingScenario()
  const { ctx, receive } = agentFeed(scenario)
  const path = '/workspace/预算 #1.DOCX'
  receive({ data: JSON.stringify({ kind: 'file', target: path }) })
  openSidebarFile(ctx, 'current', path)
  assert.equal(scenario.native.length, 2)
  assert.equal(scenario.native[0].address, scenario.native[1].address)
  assert.equal(scenario.native[0].revealIfOpened, true)
  assert.equal(scenario.native[1].revealIfOpened, true)
  assert.deepEqual(scenario.intents, ['background', 'user'])
})

test('background document feed leaves a collapsed narrow native column parked', () => {
  const scenario = routingScenario()
  const feed = agentFeed(scenario)
  feed.receive({ data: JSON.stringify({ kind: 'file', target: '/workspace/report.pdf' }) })
  assert.equal(scenario.native.length, 1)
  assert.equal(feed.expanded(), false)
  assert.equal(feed.toggles(), 1)
})

test('background document parking preserves expanded columns, other Sessions and queued opens', () => {
  for (const options of [
    { expanded: true }, { mountedSession: 'other' }, { accepts: false }, { width: 1200 },
  ]) {
    const scenario = routingScenario()
    const feed = agentFeed(scenario, options)
    feed.receive({ data: JSON.stringify({ kind: 'file', target: '/workspace/report.xlsx' }) })
    assert.equal(scenario.native.length, 1)
    assert.equal(feed.toggles(), 0)
    assert.equal(feed.expanded(), options.expanded === true || options.width === 1200)
  }
})

test('the product reveals the Session region only for explicit current-Session document opens', () => {
  const expanded = []
  const onNativeDocumentOpen = sourceCallback('index.tsx', 'onNativeDocumentOpen', {
    ctx: { get: () => ({ setSessionExpanded: value => { expanded.push(value) } }) },
  })
  const scenario = routingScenario({ onNativeDocumentOpen })
  scenario.service.openFile({ sessionId: 'current' }, '/report.docx', undefined, 'background')
  scenario.service.openFile({ sessionId: 'other' }, '/report.docx', undefined, 'user')
  assert.deepEqual(expanded, [])
  scenario.service.openFile({ sessionId: 'current' }, '/report.docx', undefined, 'user')
  assert.deepEqual(expanded, [true])
  assert.deepEqual(scenario.intents, ['background', 'user'])
  assert.deepEqual(scenario.documents, ['background', 'user'])
})

test('workbench file opens keep text, images, unsupported formats and document-named directories in place', () => {
  const scenario = routingScenario()
  for (const path of ['notes.md', 'notes.txt', 'page.html', 'photo.png', 'template.docm', 'backup.xlsx.tmp']) {
    scenario.service.openTab({ type: 'editor', path })
  }
  scenario.service.openTab({ type: 'editor' })
  scenario.service.openTab({ type: 'editor', path: '/archive.docx', meta: { dir: true } })
  assert.equal(scenario.native.length, 0)
  assert.equal(scenario.workbench.length, 8)
  assert.deepEqual(scenario.documents, [])
})

test('explicit workbench placement still uses a document reader and leaves non-product native routing intact', () => {
  const product = routingScenario()
  product.service.openTab({ type: 'editor', path: '/report.pdf', target: 'bottom' })
  assert.equal(product.native.length, 1)
  assert.equal(product.workbench.length, 0)
  const native = routingScenario({ preferWorkbench: false })
  native.service.openTab({ type: 'editor', path: '/notes.md' })
  native.service.openTab({ type: 'editor', path: '/report.pdf', target: 'bottom' })
  assert.equal(native.native.length, 1)
  assert.equal(native.workbench.length, 1)
})

test('missing native surfaces retain the existing fallback and failed opens do not report success', () => {
  const scenario = routingScenario()
  scenario.service.setSurface(undefined)
  scenario.service.openTab({ type: 'editor', path: '/report.pdf' })
  assert.equal(scenario.workbench.length, 1)
  assert.deepEqual(scenario.documents, [])
  scenario.service.setSurface({ ...scenario.surface, openResource() { throw new Error('reader unavailable') } })
  assert.throws(() => scenario.service.openTab({ type: 'editor', path: '/report.pdf' }), /reader unavailable/u)
  assert.deepEqual(scenario.intents, [])
  assert.deepEqual(scenario.documents, [])
})

function editorScenario(overrides = {}) {
  const scenario = routingScenario()
  const changes = []
  const splits = []
  const ctx = {
    sessions: { list: { getSnapshot: () => ({ byId: { current: { cwd: '/workspace' } } }) } },
    get: () => ({ ...scenario.service, updateTab: (...args) => { changes.push(args) } }),
  }
  const dependencies = {
    ctx, scope: { sessionId: 'current' }, tab: { id: 'files' }, inPlace: true,
    onOpenFile: undefined, onOpenFileInPlace: undefined, onOpenFileSide: undefined,
    isNativeDocumentPath, openSidebarFile, baseName,
    store: { reduce: reducer => { splits.push(reducer) } },
    ...overrides,
  }
  return {
    ...scenario, changes, splits,
    open: sourceCallback('EditorHost.tsx', 'openFile', dependencies),
    newTab: sourceCallback('EditorHost.tsx', 'openFileNewTab', dependencies),
    side: sourceCallback('EditorHost.tsx', 'openFileSide', dependencies),
  }
}

test('merged tree, new-tab and side actions open documents without replacing the workbench file tree', () => {
  const scenario = editorScenario()
  for (const extension of ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx']) {
    for (const open of [scenario.open, scenario.newTab, scenario.side]) open(`/workspace/report.${extension}`)
  }
  assert.equal(scenario.native.length, 21)
  assert.equal(scenario.workbench.length, 0)
  assert.deepEqual(scenario.changes, [])
  assert.deepEqual(scenario.splits, [])
})

test('merged text edits and text side splits retain their original workbench behavior', () => {
  const scenario = editorScenario()
  scenario.open('/workspace/notes.md')
  scenario.side('/workspace/notes.md')
  assert.deepEqual(scenario.changes, [['files', { path: '/workspace/notes.md', title: 'notes.md' }]])
  assert.equal(scenario.splits.length, 1)
  assert.deepEqual(scenario.native, [])
})

test('native file actions keep their occurrence-bound replacement and side placement', () => {
  const calls = []
  const scenario = editorScenario({
    onOpenFile: path => { calls.push(['new', path]) },
    onOpenFileInPlace: path => { calls.push(['replace', path]) },
    onOpenFileSide: path => { calls.push(['side', path]) },
  })
  scenario.open('/report.pdf')
  scenario.newTab('/report.pdf')
  scenario.side('/report.pdf')
  assert.deepEqual(calls, [['replace', '/report.pdf'], ['new', '/report.pdf'], ['side', '/report.pdf']])
  assert.deepEqual(scenario.native, [])
})
