/** Project canonical YourBuddy pages and run the pinned Hugo product-site builder. */
import { spawn, spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, watch, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { DocsPage } from '../website/docs.ts'
import { publishableImage, rewriteMarkdown } from './project-doc-site.ts'

interface ProductPage { source: string; route: string; weight: number; section: boolean }

function parseManifest(input: unknown): ProductPage[] {
  if (typeof input !== 'object' || input === null || !('pages' in input) || !Array.isArray(input.pages) || input.pages.length === 0) {
    throw new Error('Product manifest requires pages')
  }
  return input.pages.map((entry: unknown) => {
    if (typeof entry !== 'object' || entry === null
      || !('source' in entry) || typeof entry.source !== 'string' || !/^docs\/user\/product\/(?:[a-z-]+\/)*[a-z-]+\.md$/.test(entry.source)
      || !('route' in entry) || typeof entry.route !== 'string' || !/^(?:[a-z-]+(?:\/[a-z-]+)*)?$/.test(entry.route)
      || !('weight' in entry) || typeof entry.weight !== 'number' || !Number.isInteger(entry.weight) || entry.weight < 0
      || !('section' in entry) || typeof entry.section !== 'boolean') throw new Error('Invalid product page')
    return { source: entry.source, route: entry.route, weight: entry.weight, section: entry.section }
  })
}
const repository = 'https://github.com/istarwyh/yourbuddy'
const root = resolve(import.meta.dirname, '..')

/**
 * Build bilingual Hugo input from the product allowlist; reject missing or ambiguous pages.
 * @param repoRoot Repository containing canonical sources and the publication manifest.
 * @param baseURL Absolute website URL including an optional deployment subdirectory.
 * @returns Number of generated language-specific pages.
 */
export function projectProductSite(repoRoot: string, baseURL: string): number {
  const url = new URL(baseURL)
  if (!['http:', 'https:'].includes(url.protocol) || !url.pathname.endsWith('/')) {
    throw new Error('Product site base URL must be HTTP(S) and end in /')
  }
  const entries = parseManifest(JSON.parse(readFileSync(resolve(repoRoot, 'website/product-pages.json'), 'utf8')))
  for (const key of ['source', 'route'] as const) {
    if (new Set(entries.map(entry => entry[key])).size !== entries.length) throw new Error(`Duplicate product ${key}`)
  }
  const pages: DocsPage[] = entries.flatMap(entry => (['root', 'en'] as const).map(locale => ({
    locale, contentLocale: locale === 'root' ? 'zh-CN' : 'en-US',
    source: locale === 'root' ? entry.source.replace(/\.md$/, '.zh.md') : entry.source,
    route: `${locale === 'en' ? 'en/' : ''}${entry.route === '' ? '' : `${entry.route}/`}index.md`,
    label: entry.route, sidebar: null, section: entry.route.split('/')[0] ?? '', order: entry.weight,
  })))
  for (const page of pages) {
    if (!existsSync(resolve(repoRoot, page.source))) throw new Error(`Missing product source: ${page.source}`)
  }
  const generated = resolve(repoRoot, 'website/product/.generated')
  const content = resolve(generated, 'content')
  rmSync(content, { recursive: true, force: true })
  for (const folder of ['content', 'assets/icons', 'static/media']) mkdirSync(resolve(generated, folder), { recursive: true })
  const logo = resolve(repoRoot, 'apps/desktop-tauri/app-icon.svg')
  copyFileSync(logo, resolve(generated, 'assets/icons/logo.svg'))
  copyFileSync(logo, resolve(generated, 'static/favicon.svg'))
  const ref = process.env.DOCS_REPOSITORY_REF ?? 'master'
  for (const [index, entry] of entries.entries()) {
    for (const page of pages.slice(index * 2, index * 2 + 2)) {
      const source = readFileSync(resolve(repoRoot, page.source), 'utf8')
      const title = source.match(/^# (.+)\n/)?.[1]
      if (title === undefined) throw new Error(`Missing product H1: ${page.source}`)
      const body = source.replace(/^# .+\n\n[^\n]*(?:English|中文)[^\n]*\n\n/, '')
      const projected = rewriteMarkdown(body, {
        locale: page.locale, sourcePath: page.source, route: page.route, pages, repoRoot,
        repositoryRef: ref, repositoryUrl: repository,
        publishedUrl: route => `${url.pathname}${route.replace(/index\.md$/, '')}`,
        placeImage: (imagePath) => {
          const image = publishableImage(imagePath, repoRoot)
          if (image === undefined) throw new Error(`Invalid product image: ${imagePath}`)
          const name = imagePath.slice(repoRoot.length + 1).replaceAll('/', '_')
          copyFileSync(image, resolve(generated, 'static/media', name))
          return `${url.pathname}media/${name}`
        },
      })
      const language = page.locale === 'root' ? 'zh' : 'en'
      const filename = entry.section ? `${entry.route === '' ? '' : `${entry.route}/`}_index` : entry.route
      const target = resolve(content, `${filename}.${language}.md`)
      mkdirSync(dirname(target), { recursive: true })
      const metadata = {
        title, linkTitle: title, weight: entry.weight,
        no_list: entry.section,
        github_branch: ref,
        description: projected.split('\n\n')[0],
        ...(entry.route === '' ? {} : { type: 'docs', ...(entry.section ? { cascade: { type: 'docs' } } : {}) }),
        path_base_for_github_subdir: { from: '^.*\\.generated/content/.*$', to: page.source },
      }
      const remaining = projected.slice((metadata.description?.length ?? 0) + 2)
      writeFileSync(target, `---\n${JSON.stringify(metadata, null, 2)}\n---\n\n${remaining}`)
    }
  }
  return pages.length
}

async function main(): Promise<void> {
  const mode = process.argv[2] ?? 'build'
  if (!['build', 'dev'].includes(mode)) throw new Error(`Unknown product site mode: ${mode}`)
  const baseURL = process.env.PRODUCT_SITE_BASE_URL ?? 'http://localhost:4174/'
  const hugo = process.env.HUGO_BIN ?? 'hugo'
  const version = spawnSync(hugo, ['version'], { encoding: 'utf8' })
  if (version.error !== undefined || version.status !== 0 || !/v0\.165\.0(?:-[\da-f]+)?\+extended\b/.test(version.stdout)) {
    throw new Error('Install Hugo Extended 0.165.0 and Go 1.27.x; HUGO_BIN may select the Hugo executable.')
  }
  console.log(`Projected ${projectProductSite(root, baseURL)} YourBuddy pages`)
  const args = ['--baseURL', baseURL, '--panicOnWarning', '--cleanDestinationDir']
  if (mode === 'dev') args.unshift('server', '--bind', '127.0.0.1', '--port', '4174', '--disableFastRender')
  else args.push('--minify')
  const child = spawn(hugo, args, { cwd: resolve(root, 'website/product'), stdio: 'inherit' })
  const watchers = mode === 'dev' ? [
    watch(resolve(root, 'docs/user/product'), { recursive: true }, changed),
    watch(resolve(root, 'website/product-pages.json'), changed),
  ] : []
  let timer: ReturnType<typeof setTimeout> | undefined
  function changed(): void {
    clearTimeout(timer)
    timer = setTimeout(() => {
      try { projectProductSite(root, baseURL) } catch (error) { console.error(error) }
    }, 150)
  }
  const stop = (): void => {
    for (const watcher of watchers) watcher.close()
    clearTimeout(timer)
    child.kill('SIGTERM')
  }
  process.once('SIGINT', stop)
  process.once('SIGTERM', stop)
  try {
    const code = await new Promise<number>((done, reject) => {
      child.once('error', reject)
      child.once('exit', (status) => { done(status ?? 1) })
    })
    process.exitCode = code
  } finally {
    for (const watcher of watchers) watcher.close()
    clearTimeout(timer)
    process.removeListener('SIGINT', stop)
    process.removeListener('SIGTERM', stop)
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main()
}
