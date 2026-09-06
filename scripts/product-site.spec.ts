/** Product projection tests exercise bilingual routes, source ownership, and invalid publication input. */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { projectProductSite } from './product-site.ts'
import { verifyProductSite } from './verify-product-site.ts'

const roots: string[] = []
function fixture(): string {
  const root = mkdtempSync(resolve(tmpdir(), 'yourbuddy-site-'))
  roots.push(root)
  const files = {
    'website/product-pages.json': JSON.stringify({ pages: [
      { source: 'docs/user/product/home.md', route: '', weight: 0, section: true },
      { source: 'docs/user/product/start.md', route: 'docs/start', weight: 10, section: false },
    ] }),
    'apps/desktop-tauri/app-icon.svg': '<svg xmlns="http://www.w3.org/2000/svg"/>',
    'README.md': '# Source\n',
    'docs/user/product/home.md': '# YourBuddy\n\nEnglish | [中文](home.zh.md)\n\n[Start](start.md) and [source](../../../README.md).\n',
    'docs/user/product/home.zh.md': '# YourBuddy\n\n[English](home.md) | 中文\n\n[开始](start.zh.md)与[源码](../../../README.md)。\n',
    'docs/user/product/start.md': '# Start\n\nEnglish | [中文](start.zh.md)\n\nA task.\n',
    'docs/user/product/start.zh.md': '# 开始\n\n[English](start.md) | 中文\n\n完成任务。\n',
  }
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(resolve(root, path)), { recursive: true })
    writeFileSync(resolve(root, path), text)
  }
  return root
}
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }) })

describe('YourBuddy publication', () => {
  it('maps both languages below a deployment subpath and preserves canonical source ownership', () => {
    const root = fixture()
    expect(projectProductSite(root, 'https://example.org/workbench/')).toBe(4)
    const chinese = readFileSync(resolve(root, 'website/product/.generated/content/_index.zh.md'), 'utf8')
    const english = readFileSync(resolve(root, 'website/product/.generated/content/_index.en.md'), 'utf8')
    expect(chinese).toContain('[开始](/workbench/docs/start/)')
    expect(english).toContain('[Start](/workbench/en/docs/start/)')
    expect(english).toContain('https://github.com/istarwyh/yourbuddy/blob/master/README.md')
    expect(chinese).toContain('docs/user/product/home.zh.md')
    expect(chinese).not.toContain('[English]')
    expect(english).not.toContain('[中文]')
  })

  it('refuses a missing translation instead of publishing a fallback language', () => {
    const root = fixture()
    rmSync(resolve(root, 'docs/user/product/start.zh.md'))
    expect(() => projectProductSite(root, 'https://example.org/')).toThrow('Missing product source')
  })

  it('publishes an existing user tutorial in both languages without copying its source', () => {
    const root = fixture()
    const manifest = resolve(root, 'website/product-pages.json')
    const source = 'docs/user/develop/basic/index.md'
    writeFileSync(manifest, JSON.stringify({ pages: [
      { source: 'docs/user/product/home.md', route: 'docs', weight: 0, section: true },
      { source: 'docs/user/product/start.md', route: 'docs/develop', weight: 10, section: true },
      { source, route: 'docs/develop/first-plugin', weight: 20, section: false },
    ] }))
    mkdirSync(dirname(resolve(root, source)), { recursive: true })
    writeFileSync(resolve(root, source), '# First plugin\n\nEnglish | [中文](index.zh.md)\n\nCreate a plugin.\n')
    writeFileSync(resolve(root, source.replace('.md', '.zh.md')), '# 第一个插件\n\n[English](index.md) | 中文\n\n创建插件。\n')
    expect(projectProductSite(root, 'https://example.org/y8/')).toBe(6)
    for (const language of ['en', 'zh']) {
      const output = readFileSync(resolve(root, `website/product/.generated/content/docs/develop/first-plugin.${language}.md`), 'utf8')
      expect(output).toContain(language === 'en' ? source : source.replace('.md', '.zh.md'))
      const section = readFileSync(resolve(root, `website/product/.generated/content/docs/develop/_index.${language}.md`), 'utf8')
      const metadata: unknown = JSON.parse(section.split('---')[1]!)
      expect(metadata).toMatchObject({ outputs: ['HTML', 'markdown', 'print'] })
    }
    for (const invalid of ['docs/architecture.md', 'docs/user/../architecture.md', '/docs/user/start.md']) {
      writeFileSync(manifest, JSON.stringify({ pages: [{ source: invalid, route: 'docs/start', weight: 1, section: false }] }))
      expect(() => projectProductSite(root, 'https://example.org/')).toThrow('Invalid product page')
    }
  })

  it('refuses ambiguous or escaping routes', () => {
    const root = fixture()
    const path = resolve(root, 'website/product-pages.json')
    writeFileSync(path, JSON.stringify({ pages: [
      { source: 'docs/user/product/home.md', route: '', weight: 0, section: true },
      { source: 'docs/user/product/start.md', route: '', weight: 1, section: true },
    ] }))
    expect(() => projectProductSite(root, 'https://example.org/')).toThrow('Duplicate product route')
    writeFileSync(path, JSON.stringify({ pages: [{ source: 'docs/user/product/home.md', route: '../escape', weight: 0, section: false }] }))
    expect(() => projectProductSite(root, 'https://example.org/')).toThrow('Invalid product page')
  })

  it('refuses broken prose links and malformed base URLs', () => {
    const root = fixture()
    writeFileSync(resolve(root, 'docs/user/product/start.md'), '# Start\n\n[Missing](missing.md)\n')
    expect(() => projectProductSite(root, 'https://example.org/')).toThrow('missing path')
    expect(() => projectProductSite(root, 'file:///tmp/')).toThrow('base URL')
    expect(() => projectProductSite(root, 'https://example.org/subpath')).toThrow('base URL')
  })
})

describe('product artifacts', () => {
  it('rejects broken links, missing fragments, escaped base paths, and absent raw Markdown', () => {
    const root = fixture()
    writeFileSync(resolve(root, 'index.html'), '<main><a href="missing/">Missing</a><a href="#absent">Anchor</a><img src="/outside.svg"></main>')
    const report = verifyProductSite(root, 'https://example.org/product/')
    expect(report.errors).toContain('/product/: missing missing/')
    expect(report.errors).toContain('/product/: missing anchor #absent')
    expect(report.errors).toContain('/product/: URL escapes base path: /outside.svg')
    expect(report.errors).toContain('/product/: missing raw Markdown')
  })

  it('accepts local fragments and ignores external hosts while checking source actions', () => {
    const root = fixture()
    writeFileSync(resolve(root, 'index.html'), '<main id="valid"><a href="#valid">Here</a><a href="https://other.example/">External</a><a href="https://github.com/wrong/repo/edit/master/temp.md">Edit</a><a href="https://github.com/istarwyh/yourbuddy/edit/master/docs/user/develop/basic/index.md">Tutorial source</a><a href="https://github.com/istarwyh/yourbuddy/edit/master/docs/user/develop/basic/index.zh.md">中文源文件</a></main>')
    writeFileSync(resolve(root, 'index.md'), '# Home\n')
    const report = verifyProductSite(root, 'https://example.org/')
    expect(report.errors.filter(error => error.startsWith('/:'))).toEqual(['/: incorrect canonical edit URL'])
  })
})
