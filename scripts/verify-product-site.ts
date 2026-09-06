/** Validate local URLs and canonical source actions in the built YourBuddy website. */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { JSDOM } from 'jsdom'

/**
 * Inspect a complete Hugo artifact without making network requests.
 * @param output Hugo output directory.
 * @param baseURL Configured deployment URL, including its path prefix.
 * @returns Page count and each missing or incorrectly routed artifact reference.
 */
export function verifyProductSite(output: string, baseURL: string): { pages: number; errors: string[] } {
  const base = new URL(baseURL)
  const errors: string[] = []
  const documents = new Map<string, Document>()

  function scan(directory: string): void {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name)
      if (entry.isDirectory()) scan(path)
      else if (entry.name.endsWith('.html')) documents.set(path, new JSDOM(readFileSync(path, 'utf8')).window.document)
    }
  }

  if (!existsSync(output)) throw new Error('Build the product website before checking its output')
  scan(output)
  for (const [file, document] of documents) {
    const pageURL = new URL(relative(output, file).replace(/index\.html$/, ''), base)
    for (const element of document.querySelectorAll('[href], [src]')) {
      const value = element.getAttribute('href') ?? element.getAttribute('src')
      if (value === null || value === '') continue
      const target = new URL(value, pageURL)
      if (target.origin !== base.origin || !['http:', 'https:'].includes(target.protocol)) continue
      if (!target.pathname.startsWith(base.pathname)) {
        errors.push(`${pageURL.pathname}: URL escapes base path: ${value}`)
        continue
      }
      let path = resolve(output, decodeURIComponent(target.pathname.slice(base.pathname.length)))
      if (existsSync(path) && statSync(path).isDirectory()) path = resolve(path, 'index.html')
      if (!existsSync(path)) errors.push(`${pageURL.pathname}: missing ${value}`)
      else if (target.hash !== '' && documents.has(path)) {
        const id = decodeURIComponent(target.hash.slice(1))
        if (documents.get(path)?.getElementById(id) === null) errors.push(`${pageURL.pathname}: missing anchor ${value}`)
      }
    }
    // OINK's print bundles combine section pages; raw Markdown belongs to each canonical page.
    if (file.endsWith('index.html') && !pageURL.pathname.includes('/_print/') && document.querySelector('main') !== null && !existsSync(file.replace(/index\.html$/, 'index.md'))) {
      errors.push(`${pageURL.pathname}: missing raw Markdown`)
    }
    for (const link of document.querySelectorAll('a[href*="/edit/"]')) {
      if (!/^https:\/\/github\.com\/istarwyh\/yourbuddy\/edit\/.+\/docs\/user\/(?:[a-z-]+\/)*[a-z-]+(?:\.zh)?\.md$/.test(link.getAttribute('href') ?? '')) {
        errors.push(`${pageURL.pathname}: incorrect canonical edit URL`)
      }
    }
  }
  for (const locale of ['', 'en/']) {
    for (const file of ['index.html', 'llms.txt', 'navigation.json', 'docs/llms-full.txt', 'plugins/llms-full.txt', 'docs/start/index.html', 'plugins/index.html']) {
      if (!existsSync(resolve(output, locale, file))) errors.push(`Missing ${locale}${file}`)
    }
  }
  return { pages: documents.size, errors }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const report = verifyProductSite(resolve(import.meta.dirname, '../website/product/.dist'), process.env.PRODUCT_SITE_BASE_URL ?? 'http://localhost:4174/')
  if (report.errors.length > 0) throw new Error(report.errors.join('\n'))
  console.log(`Verified local links, assets, fragments, and source actions in ${report.pages} product HTML pages`)
}
