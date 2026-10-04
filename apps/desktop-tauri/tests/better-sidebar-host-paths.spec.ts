import { access, mkdtemp, mkdir, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { renameWorkspaceEntry, removeWorkspaceEntry } from '../product/dsh-better-sidebar/src/fs-operations.ts'
import { ensureWorkspacePath, ensureWorkspaceWritePath } from '../product/dsh-better-sidebar/src/path-security.ts'

const roots: string[] = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { force: true, recursive: true })))
})

describe('YourBuddy Better Sidebar host paths', () => {
  it('resolves read and write paths outside the Session workspace', async () => {
    const root = await mkdtemp(join(tmpdir(), 'yourbuddy-sidebar-paths-'))
    roots.push(root)
    const workspace = join(root, 'workspace')
    const external = join(root, 'external')
    const externalFile = join(external, 'SKILL.md')
    await mkdir(workspace)
    await mkdir(external)
    await writeFile(externalFile, '# Skill\n', 'utf8')

    await expect(ensureWorkspacePath(workspace, externalFile)).resolves.toBe(await realpath(externalFile))
    await expect(ensureWorkspaceWritePath(workspace, join(external, 'new.md'))).resolves.toBe(join(await realpath(external), 'new.md'))

    const localFile = join(workspace, 'local.md')
    await writeFile(localFile, '# Local\n', 'utf8')
    await expect(ensureWorkspacePath(workspace, 'local.md')).resolves.toBe(await realpath(localFile))
    await expect(ensureWorkspaceWritePath(workspace, 'new-local.md')).resolves.toBe(join(await realpath(workspace), 'new-local.md'))

    await expect(renameWorkspaceEntry({ cwd: workspace, path: 'local.md', name: 'renamed.md' })).resolves.toEqual({ path: join(await realpath(workspace), 'renamed.md') })
    await expect(removeWorkspaceEntry({ cwd: workspace, path: 'renamed.md' })).resolves.toEqual({ path: join(workspace, 'renamed.md') })
    await expect(access(join(workspace, 'renamed.md'))).rejects.toMatchObject({ code: 'ENOENT' })
  })
})
