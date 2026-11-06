import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'
import { standardDecoratorPlugin, vitestExecArgv } from '../../../../vitest.shared.ts'

export default defineConfig({
  plugins: [tsconfigPaths({ loose: true, projects: ['./tsconfig.base.json'] }), standardDecoratorPlugin()],
  test: {
    pool: 'forks',
    execArgv: vitestExecArgv,
    include: ['apps/desktop-tauri/product/claude-design-adapter/*.spec.ts'],
  },
})
