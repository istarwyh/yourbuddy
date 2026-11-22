import { globSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { resolveConfig } from 'vitest/node'

const root = resolve(import.meta.dirname, '..')

describe('repository configuration layout', () => {
  it('keeps every test lane rooted at the repository through the default discovery entry', async () => {
    expect(globSync('vitest*.ts', { cwd: root })).toEqual(['vitest.config.ts'])
    const files = globSync('config/vitest/vitest*.ts', { cwd: root }).sort()
    expect(files).toHaveLength(9)
    const lanes = new Map<string, Awaited<ReturnType<typeof resolveConfig>>>()
    for (const file of files.filter(file => file.endsWith('.config.ts'))) {
      const config = await resolveConfig({ root, config: file })
      expect(resolve(config.viteConfig.root)).toBe(root)
      expect(resolve(config.vitestConfig.root)).toBe(root)
      lanes.set(file.replaceAll('\\', '/'), config)
    }
    const unit = lanes.get('config/vitest/vitest.config.ts')!.vitestConfig
    const discovered = (await resolveConfig({ root })).vitestConfig
    expect(discovered.include).toEqual(unit.include)
    expect(discovered.setupFiles).toEqual(unit.setupFiles)
    expect(unit.include).toContain('scripts/**/*.spec.ts')
    expect(unit.setupFiles).toContain(resolve(root, 'scripts/test-proxy-environment.ts').replaceAll('\\', '/'))
    expect(lanes.get('config/vitest/vitest.e2e.config.ts')!.vitestConfig.include).toContain('apps/cli/tests/**/*.e2e.ts')
    expect(lanes.get('config/vitest/vitest.web.config.ts')!.vitestConfig.include).toContain('apps/web/tests/**/*.e2e.ts')
  })

  it('selects the relocated build config for both faces without changing the process directory', () => {
    const { scripts } = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>
    }
    expect(scripts['build:lib:host']).toContain('scripts/compile-referenced-projects.ts host-libraries')
    expect(scripts['build:lib:client']).toContain('tsdown --config-loader native --config config/build/tsdown.config.ts --env.DSH_BUILD_FACE client')
    const libraryBuild = readFileSync(resolve(root, 'scripts/compile-referenced-projects.ts'), 'utf8')
    for (const face of ['host', 'client']) {
      expect(libraryBuild).toContain(`'--config', 'config/build/tsdown.config.ts', '--env.DSH_BUILD_FACE', '${face}'`)
    }
    expect(readFileSync(resolve(root, 'tsdown.config.ts'), 'utf8'))
      .toContain("export { default } from './config/build/tsdown.config.ts'")
    const config = readFileSync(resolve(root, 'config/build/tsdown.config.ts'), 'utf8')
    expect(config).toContain("const root = fileURLToPath(new URL('../../', import.meta.url))")
    expect(config).not.toContain('process.chdir')
    const wine = readFileSync(resolve(root, 'scripts/wine-windows-gates.sh'), 'utf8')
    for (const face of ['host', 'client']) {
      expect(wine).toContain(`"$tsdown_js" --config-loader native --config config/build/tsdown.config.ts --env.DSH_BUILD_FACE ${face}`)
    }
    expect(scripts.test).toContain('vitest run --config config/vitest/vitest.config.ts')
    expect(scripts['test:coverage']).toContain('vitest run --config config/vitest/vitest.config.ts --coverage')
  })
})
