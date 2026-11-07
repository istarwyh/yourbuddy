import { defineConfig } from 'vitest/config'
import { createRequire } from 'node:module'
import tsconfigPaths from 'vite-tsconfig-paths'
import { standardDecoratorPlugin, vitestExecArgv } from '../../../../vitest.shared.ts'

export default defineConfig({
  resolve: { alias: {
    'react-dom/client': createRequire(new URL('../../../../apps/web/package.json', import.meta.url)).resolve('react-dom/client'),
  } },
  plugins: [tsconfigPaths({ loose: true, projects: ['./tsconfig.base.json'] }), standardDecoratorPlugin()],
  test: {
    pool: 'forks',
    execArgv: vitestExecArgv,
    include: ['apps/desktop-tauri/product/claude-design-adapter/*.spec.ts'],
  },
})
