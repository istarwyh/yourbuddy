/** Exercise the packaged Codex Auth Host against a real OS advisory lock. */
import assert from 'node:assert/strict'
import { lstat, mkdtemp, open, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { test } from 'node:test'

const harnessRoot = process.env.YOURBUDDY_AUTH_TEST_HARNESS
  ?? fileURLToPath(new URL('../bundled/harness/', import.meta.url))
const entry = pathToFileURL(join(harnessRoot, 'packages/product/dsh-codex-auth/lib/index.js'))
const require = createRequire(entry)
const { Context } = await import(pathToFileURL(require.resolve('@deepseek-ai/cordis')))
const { tryLockExclusive } = await import(pathToFileURL(require.resolve('@deepseek-ai/node-addon-system/flock')))
const { apply, Config } = await import(entry)

test('packaged Codex Auth reads through the persistent sidecar and reports refresh lock contention', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'yourbuddy-codex-auth-'))
  const authPath = join(dir, 'auth.json')
  const lockPath = `${authPath}.lock`
  const ctx = new Context()
  t.after(async () => {
    await ctx.fiber.dispose()
    await rm(dir, { recursive: true, force: true })
  })

  apply(ctx, Config({ authJsonPath: authPath, llmEnabled: false, codexCommand: 'no-codex-test-command' }))
  assert.equal(await ctx.codexAuth.credential(), undefined)
  await writeFile(authPath, '{', { mode: 0o600 })
  await assert.rejects(ctx.codexAuth.credential(), { code: 'CODEX_AUTH_READ_FAILED' })

  const tokens = { access_token: 'fixture-access', refresh_token: 'fixture-refresh' }
  await writeFile(authPath, JSON.stringify({ tokens, last_refresh: new Date().toISOString() }))
  const lock = await open(lockPath, 'a+', 0o600)
  try {
    // Both Codex and the plugin lock the same inode. Fresh reads do not need it.
    await tryLockExclusive(lock.fd)
    const before = await lock.stat()
    assert.equal((await ctx.codexAuth.credential())?.accessToken, tokens.access_token)

    const stalePath = join(dir, 'stale.json')
    await writeFile(stalePath, JSON.stringify({ tokens, last_refresh: '2020-01-01T00:00:00Z' }), { mode: 0o600 })
    const staleLock = await open(`${stalePath}.lock`, 'a+', 0o600)
    const staleCtx = new Context()
    try {
      await tryLockExclusive(staleLock.fd)
      apply(staleCtx, Config({ authJsonPath: stalePath, llmEnabled: false, codexCommand: 'no-codex-test-command' }))
      await assert.rejects(staleCtx.codexAuth.credential(), { code: 'CODEX_AUTH_LOCK_TIMEOUT' })
    } finally {
      await staleCtx.fiber.dispose()
      await staleLock.close()
    }

    const after = await stat(lockPath)
    assert.equal(after.ino, before.ino)
    assert.equal(after.size, 0)
  } finally {
    await lock.close()
  }
})

test('refresh commits to the resolved auth file and keeps Codex’s sidecar', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'yourbuddy-codex-refresh-'))
  const authPath = join(dir, 'auth.json')
  const target = join(dir, 'shared-auth.json')
  const lockPath = `${target}.lock`
  const ctx = new Context()
  t.after(async () => {
    await ctx.fiber.dispose()
    await rm(dir, { recursive: true, force: true })
  })

  const tokens = { access_token: 'fixture-old-access', refresh_token: 'fixture-old-refresh' }
  await writeFile(target, JSON.stringify({ tokens, last_refresh: '2020-01-01T00:00:00Z' }), { mode: 0o600 })
  await symlink(target, authPath)
  await writeFile(lockPath, '', { mode: 0o600 })
  const before = await stat(lockPath)
  const fetch = t.mock.method(globalThis, 'fetch', async () =>
    Response.json({ access_token: 'fixture-new-access', refresh_token: 'fixture-new-refresh' }))
  apply(ctx, Config({ authJsonPath: authPath, llmEnabled: false, codexCommand: 'no-codex-test-command' }))

  const results = await Promise.all([ctx.codexAuth.credential(), ctx.codexAuth.credential()])
  assert.deepEqual(results.map(result => result?.accessToken), ['fixture-new-access', 'fixture-new-access'])
  assert.equal(fetch.mock.callCount(), 1)
  assert.equal(JSON.parse(await readFile(target, 'utf8')).tokens.refresh_token, 'fixture-new-refresh')
  assert.ok((await lstat(authPath)).isSymbolicLink())
  const after = await stat(lockPath)
  assert.equal(after.ino, before.ino)
  assert.equal(after.size, 0)
})
