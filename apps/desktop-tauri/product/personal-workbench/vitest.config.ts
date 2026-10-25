import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'
import { standardDecoratorPlugin } from '../../../../vitest.shared.ts'

export default defineConfig({
  root: import.meta.dirname,
  plugins: [standardDecoratorPlugin(), tsconfigPaths({ projects: ['../../../../tsconfig.base.json'] })],
  test: {
    include: ['tests/**/*.spec.ts', 'tests/**/*.spec.tsx'],
  },
})
