import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const desktopRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const repositoryRoot = join(desktopRoot, '..', '..')
const browserRoot = join(repositoryRoot, 'packages', 'client', 'ui-sidebar-browser')
const desktopShellRoot = join(repositoryRoot, 'apps', 'desktop', 'src')

function readBrowserSource(relativePath) {
  return readFileSync(join(browserRoot, 'src', 'client', relativePath), 'utf8')
}

test('Web Browser tabs default to the documented DSH sandbox and expose a per-tab disable control', () => {
  const presentation = readBrowserSource(join('view', 'IframePresentation.ts'))
  const frame = readBrowserSource(join('browser', 'IframeImpl.ts'))
  const body = readBrowserSource(join('view', 'BrowserBody.tsx'))
  const readme = readFileSync(join(browserRoot, 'README.md'), 'utf8')
  const sandbox = presentation.match(/export const WEB_BROWSER_SANDBOX = '([^']+)'/u)?.[1]

  assert.equal(
    sandbox,
    'allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox',
  )
  assert.equal(readme.includes(`Web uses \`sandbox="${sandbox}"\` by default.`), true)
  assert.match(presentation, /if \(current\.sandboxed\) element\.setAttribute\('sandbox', WEB_BROWSER_SANDBOX\)/u)
  assert.match(frame, /private sandboxed = true/u)
  assert.match(frame, /readonly sandbox: BrowserSandboxControl = \{ setEnabled:/u)
  assert.match(body, /\{sandboxed !== undefined && <button/u)
  assert.match(body, /onClick=\{\(\) => \{ setSandbox\(tab\.id, !sandboxed\) \}\}/u)
  assert.match(body, /\{sandboxed === false && <div[^>]+role="status"/u)
})

test('Desktop Browser tabs select the native DSH browser bridge instead of the Web iframe', () => {
  const client = readBrowserSource('index.ts')
  const electronFrame = readBrowserSource(join('electron', 'ElectronWebViewImpl.ts'))
  const preloadApp = readFileSync(join(desktopShellRoot, 'preload-app.ts'), 'utf8')
  const preloadBrowser = readFileSync(join(desktopShellRoot, 'preload-browser.ts'), 'utf8')
  const main = readFileSync(join(desktopShellRoot, 'main.ts'), 'utf8')

  assert.match(client, /const desktop = carrier\?\.protocolVersion === 1 \? carrier\.browser : undefined/u)
  assert.match(client, /if \(desktop === undefined\) installFrames\(ctx, \(\) => createIframePage\)/u)
  assert.match(client, /createElectronPage\(options, desktop,/u)
  assert.match(electronFrame, /constructor\([^]*private readonly bridge: DesktopBrowserBridge,/u)
  assert.match(electronFrame, /this\.store = createSnapshotStore\(emptyBrowserFrame\(\)\)/u)
  assert.match(preloadApp, /browser: createDesktopBrowserBridge\(\)/u)
  assert.match(preloadBrowser, /acquire: workspace => ipcRenderer\.invoke\(DESKTOP_IPC\.browserAcquire, workspace\)/u)
  assert.match(preloadBrowser, /release: lease => ipcRenderer\.invoke\(DESKTOP_IPC\.browserRelease, lease\)/u)
  assert.match(main, /ipcMain\.handle\(DESKTOP_IPC\.browserAcquire,/u)
  assert.match(main, /ipcMain\.handle\(DESKTOP_IPC\.browserRelease,/u)
})
