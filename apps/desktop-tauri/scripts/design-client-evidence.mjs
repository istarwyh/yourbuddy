/** Capture bounded diagnostics from the isolated, keyless design acceptance browser. */
import { mkdir } from 'node:fs/promises'
import { saveBrowserFailure } from './verify-product-release.mjs'

/** Collect Client errors and network outcomes without headers, bodies, or URL credentials. */
export function observeDesignClient(page) {
  const evidence = { pageErrors: [], consoleErrors: [], requests: [] }
  const record = (entries, entry) => {
    if (entries.length < 100) entries.push(entry)
  }
  const requestPath = url => {
    const parsed = new URL(url)
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.pathname : parsed.protocol
  }
  page.on('pageerror', error => record(evidence.pageErrors, error.message.slice(0, 2000)))
  page.on('console', message => {
    if (['error', 'warning'].includes(message.type())) record(evidence.consoleErrors, message.text().slice(0, 2000))
  })
  page.on('requestfailed', request => record(evidence.requests, {
    path: requestPath(request.url()), failure: request.failure()?.errorText,
  }))
  page.on('response', response => {
    if (response.status() >= 400) record(evidence.requests, {
      path: requestPath(response.url()), status: response.status(),
    })
  })
  return evidence
}

/** Preserve failure evidence before teardown without replacing the original acceptance error. */
export async function saveDesignClientFailure(page, directory, diagnostics) {
  if (!directory) return
  try { await mkdir(directory, { recursive: true }) }
  catch (error) { void error /* Evidence storage is best effort. */ }
  let state, timer
  try {
    state = await Promise.race([
      page?.evaluate(() => ({
        path: location.pathname,
        title: document.title,
        text: document.body?.innerText.slice(0, 12000),
        composers: document.querySelectorAll('[data-composer-input]').length,
        artifactsPages: document.querySelectorAll('[data-testid="baoyu-design-artifacts"]').length,
        editorFrames: document.querySelectorAll('iframe[data-sidebar-browser-frame="iframe"]').length,
      })),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('DOM inspection timed out')), 1000)
      }),
    ])
  } catch (error) { state = { inspectionError: String(error) } }
  finally { clearTimeout(timer) }
  await saveBrowserFailure(page, directory, { ...diagnostics, state })
}
