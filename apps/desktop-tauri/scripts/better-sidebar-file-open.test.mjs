import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import ts from 'typescript'

const desktopRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const snapshotRoot = join(desktopRoot, 'product', 'dsh-better-sidebar')
const bundleNames = ['client.js', 'client-registry.js']

function loadNativeFileOpen(bundleName) {
  const bundle = readFileSync(join(snapshotRoot, 'lib', bundleName), 'utf8')
  const start = bundle.indexOf('function openNativeFile(')
  const end = bundle.indexOf('\n\t\t/**\n\t\t* One plugin tab rendered', start)
  assert.notEqual(start, -1)
  assert.notEqual(end, -1)
  const openNativeFile = Function(
    'fileAddressFor',
    `${bundle.slice(start, end)}; return openNativeFile`,
  )((sessionId, cwd, path) => `file:${sessionId}:${cwd}:${path}`)
  return { bundle, openNativeFile }
}

for (const bundleName of bundleNames) {
  test(`${bundleName} opens files through the owning native tab occurrence`, () => {
    const { bundle, openNativeFile } = loadNativeFileOpen(bundleName)
    const calls = []
    const info = {
      tab: {
        actions: {
          openResource: (...args) => { calls.push(args) },
        },
      },
    }

    const parsed = ts.createSourceFile(bundleName, bundle, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
    const body = findSyntaxNode(parsed, node => ts.isFunctionDeclaration(node) && node.name?.text === 'NativeTabBody')
    assert.ok(body)
    for (const name of ['onOpenFile', 'onOpenFileInPlace', 'onOpenFileSide']) {
      const property = findSyntaxNode(body, node => ts.isPropertyAssignment(node) && node.name.getText(parsed) === name)
      assert.ok(property)
      const callback = Function('openNativeFile', 'info', 'scopeSessionId', 'cwd', `return ${property.initializer.getText(parsed)}`)(
        openNativeFile, info, 'owner-session', '/workspace',
      )
      callback('notes/readme.md')
    }
    assert.deepEqual(calls, [
      ['file:owner-session:/workspace:notes/readme.md', { revealIfOpened: true }],
      ['file:owner-session:/workspace:notes/readme.md', { replaceTab: true, revealIfOpened: false }],
      ['file:owner-session:/workspace:notes/readme.md', { toSide: true, revealIfOpened: false }],
    ])
    assert.match(bundle, /pending\.filter\(\(entry\) => !place\(entry\)\)/u)
    assert.match(bundle, /onSessionAdopted\(flushPending\)/u)
    assert.match(bundle, /id: "image",[\s\S]*?fetchStrategy: "mediaUrl"/u)
  })
}

test('published declarations expose native file actions and editor callbacks', () => {
  const path = join(snapshotRoot, 'lib', 'types', 'native-file-actions.fixture.ts')
  const fixture = `
import { openNativeFile, type NativeTabInfo } from './client/native/tab-adapter.js'
import type { TabComponentProps } from './client/service.js'
import type { EditorHost } from './client/EditorHost.js'
declare const info: NativeTabInfo
info.tab.actions.openResource('file:notes', { toSide: true, revealIfOpened: false })
// @ts-expect-error native side placement is boolean
info.tab.actions.openResource('file:notes', { toSide: 'side' })
openNativeFile(info, 'session', '/workspace', 'notes', 'side')
// @ts-expect-error only declared native placements are accepted
openNativeFile(info, 'session', '/workspace', 'notes', 'other')
type Callbacks = 'onOpenFile' | 'onOpenFileInPlace' | 'onOpenFileSide'
const callbacks: Pick<TabComponentProps, Callbacks> = {
  onOpenFile: (path: string) => {},
  onOpenFileInPlace: (path: string) => {},
  onOpenFileSide: (path: string) => {},
}
const editor: Pick<Parameters<typeof EditorHost>[0], Callbacks> = callbacks
// @ts-expect-error editor file callbacks receive a path string
editor.onOpenFile?.(123)
`
  const options = {
    noEmit: true, strict: true, skipLibCheck: true,
    target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler, jsx: ts.JsxEmit.ReactJSX,
    allowImportingTsExtensions: true,
    paths: {
      '@deepseek-ai/dsh-client-ui-sidebar-right/client': [join(desktopRoot, '../../packages/client/ui-sidebar-right/lib/types/client/index.d.ts')],
    },
  }
  const host = ts.createCompilerHost(options)
  const readSource = host.getSourceFile.bind(host)
  host.getSourceFile = (name, languageVersion, onError, shouldCreateNewSourceFile) => name === path
    ? ts.createSourceFile(name, fixture, languageVersion, true)
    : readSource(name, languageVersion, onError, shouldCreateNewSourceFile)
  const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram([path], options, host))
  assert.deepEqual(diagnostics.map(diagnostic => `${diagnostic.file?.getLineAndCharacterOfPosition(diagnostic.start ?? 0).line}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`), [])
})

/** Locate the actual function or statement emitted from the owning source. */
function findSyntaxNode(root, predicate) {
  if (predicate(root)) return root
  return ts.forEachChild(root, child => findSyntaxNode(child, predicate))
}

function sourceTabOptions() {
  const source = readFileSync(join(snapshotRoot, 'src', 'client', 'sidebar', 'TabContent.tsx'), 'utf8')
  const parsed = ts.createSourceFile('TabContent.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const owner = findSyntaxNode(parsed, node => ts.isFunctionDeclaration(node) && node.name?.text === 'buildNewTabOptions')
  assert.ok(owner)
  const emitted = ts.transpileModule(owner.getText(parsed), {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.CommonJS },
  }).outputText
  return Function('exports', `${emitted}; return exports.buildNewTabOptions`)({})
}

function optionsScenario(optionsFor) {
  const calls = []
  const descriptor = {
    id: 'custom', title: 'Custom',
    available: (_ctx, scope, state) => {
      calls.push([scope.sessionId, state.enabled])
      return scope.sessionId === 'session-a' && state.enabled
    },
  }
  const ctx = { get: () => ({ getTabs: () => [descriptor], isTabEnabled: () => true }) }
  const empty = optionsFor(undefined, ctx, undefined)
  assert.deepEqual(empty.map(row => [row.id, row.disabled]), [['custom', true]])
  assert.deepEqual(calls, [])
  const activeState = { enabled: true }
  const first = optionsFor(activeState, ctx, 'session-a')
  assert.deepEqual(first.map(row => [row.id, row.disabled]), [['custom', false]])
  const switched = optionsFor(activeState, ctx, 'session-b')
  assert.deepEqual(switched.map(row => [row.id, row.disabled]), [['custom', true]])
  assert.deepEqual(calls, [['session-a', true], ['session-b', true]])
  return { empty, first }
}

test('source workbench options stay visible before a Session and reevaluate after Session changes', () => {
  const options = sourceTabOptions()
  optionsScenario((state, ctx, sessionId) => options(state, ctx, sessionId === undefined ? undefined : { sessionId }))
})

for (const bundleName of bundleNames) {
  test(`${bundleName} initializes sessionless workbench cards and follows Session changes`, () => {
    const bundle = readFileSync(join(snapshotRoot, 'lib', bundleName), 'utf8')
    const parsed = ts.createSourceFile(bundleName, bundle, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
    const optionOwner = findSyntaxNode(parsed, node => ts.isFunctionDeclaration(node) && node.name?.text === 'buildNewTabOptions')
    const sidebar = findSyntaxNode(parsed, node => ts.isFunctionDeclaration(node) && node.name?.text === 'Sidebar')
    assert.ok(optionOwner)
    assert.ok(sidebar)
    const memo = findSyntaxNode(sidebar, node => ts.isVariableStatement(node)
      && node.declarationList.declarations.some(declaration => ts.isIdentifier(declaration.name) && declaration.name.text === 'newTabOptions'))
    const emptyBranch = findSyntaxNode(sidebar, node => ts.isIfStatement(node)
      && /state === void 0 \|\| sessionId === void 0/u.test(node.expression.getText(parsed))
      && node.thenStatement.getText(parsed).includes('data-dsh-panel-host'))
    assert.ok(memo)
    assert.ok(emptyBranch)
    const options = Function(`${optionOwner.getText(parsed)}; return buildNewTabOptions`)()
    const readMemo = Function('state', 'ctx', 'sessionId', 'cwd', 'buildNewTabOptions', 'react', 'shellScope', 'tabsVersion',
      `${memo.getText(parsed)}; return newTabOptions`)
    let previousDependencies
    let previousOptions
    const react = {
      useMemo(callback, dependencies) {
        if (previousDependencies === undefined
          || dependencies.some((value, index) => !Object.is(value, previousDependencies[index]))) {
          previousOptions = callback()
          previousDependencies = [...dependencies]
        }
        return previousOptions
      },
    }
    const { empty } = optionsScenario((state, ctx, sessionId) => readMemo(
      state, ctx, sessionId, '/workspace', options, react,
      sessionId === undefined ? undefined : { sessionId, cwd: '/workspace' }, 0,
    ))
    const cards = () => {}
    const renderBranch = Function(
      'state', 'sessionId', 'primaryWorkbench', 'osFileDragShield', 'react_jsx_runtime',
      'sidebar_module_css_default', 'clsx', 'newTabOptions', 'PaneEmptyCards',
      `${emptyBranch.getText(parsed)}; return 'active-session'`,
    )
    const render = (state, sessionId, slot) => renderBranch(
      state, sessionId, slot, {}, { jsx: (type, props) => ({ type, props }) },
      { bottomPanel: 'panel', bottomPanelSlot: 'slot', panelBody: 'body' },
      (...classes) => classes.join(' '), empty, cards,
    )
    const slot = render(undefined, undefined, true)
    const renderedCards = slot.props.children.props.children.props.children
    assert.equal(renderedCards.type, cards)
    assert.equal(renderedCards.props.newTabOptions, empty)
    assert.equal(render(undefined, undefined, false).props.children, false)
    assert.equal(render({}, 'session-a', true), 'active-session')
    assert.equal(render({}, 'session-b', true), 'active-session')
  })
}

/** Read the actual locale object without loading its host application. */
function localeDictionary(source, name) {
  const parsed = ts.createSourceFile('locales.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const declaration = findSyntaxNode(parsed, node => ts.isVariableDeclaration(node)
    && ts.isIdentifier(node.name) && node.name.text === name)
  assert.ok(declaration?.initializer)
  const emitted = ts.transpileModule(`const labels = ${declaration.initializer.getText(parsed)}`, {
    compilerOptions: { target: ts.ScriptTarget.ES2023 },
  }).outputText
  return Function(`${emitted}; return labels`)()
}

test('image viewer source has its existing label key in every supported dictionary', () => {
  for (const [file, name, label] of [
    ['locales.ts', 'zh', '图片'], ['locales.ts', 'en', 'Image'],
    ['locales-ja.ts', 'ja', '画像'], ['locales-ko.ts', 'ko', '이미지'],
  ]) {
    const source = readFileSync(join(snapshotRoot, 'src', 'client', file), 'utf8')
    assert.equal(localeDictionary(source, name).viewerImage, label)
  }
})

for (const bundleName of bundleNames) {
  test(`${bundleName} renders image viewer labels instead of the missing raw key`, () => {
    const source = readFileSync(join(snapshotRoot, 'lib', bundleName), 'utf8')
    const extraLocales = readFileSync(join(snapshotRoot, 'lib', 'client-locale.js'), 'utf8')
    const zh = localeDictionary(source, 'zh')
    const en = localeDictionary(source, 'en')
    const ja = localeDictionary(extraLocales, 'ja')
    const ko = localeDictionary(extraLocales, 'ko')
    const parsed = ts.createSourceFile(bundleName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
    const translator = findSyntaxNode(parsed, node => ts.isFunctionDeclaration(node) && node.name?.text === 't')
    assert.ok(translator)
    assert.match(source, /title: \(\) => t\("viewerImage"\)/u)
    for (const [active, override, expected] of [
      ['zh', undefined, '图片'], ['en', undefined, 'Image'],
      ['en', ja, '画像'], ['en', ko, '이미지'],
    ]) {
      const translate = Function('zh', 'en', 'localeService', 'betterLocaleStore', 'activeLocale', 'LOCALE_NS',
        `${translator.getText(parsed)}; return t`)(
        zh, en, { getSnapshot: () => ({ active }) },
        { getOverride: (_active, _namespace, key) => override?.[key] }, () => active, 'betterSidebar',
      )
      assert.equal(translate('viewerImage'), expected)
    }
  })
}
