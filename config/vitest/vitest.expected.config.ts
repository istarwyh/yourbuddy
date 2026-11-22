import { fileURLToPath } from 'node:url'
import { availableParallelism } from 'node:os'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'
import { standardDecoratorPlugin, vitestExecArgv } from './vitest.shared.ts'

/** Owner-local assembled expected-output tests that do not use a recorded session as their input. */
export default defineConfig({
  root: fileURLToPath(new URL('../../', import.meta.url)),
  plugins: [tsconfigPaths({ projects: [fileURLToPath(new URL('../../tsconfig.base.json', import.meta.url))] }), standardDecoratorPlugin()],
  test: {
    execArgv: vitestExecArgv,
    setupFiles: ['./scripts/test-proxy-environment.ts'],
    include: [
      'apps/cli/tests/**/*.expected.e2e.ts',
    ],
    testTimeout: 120_000,
    hookTimeout: 30_000,
    maxWorkers: Math.min(5, availableParallelism()),
  },
})
