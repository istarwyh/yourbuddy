/** Real interactive shells preserve startup files and distinguish prompts from running jobs. */
import { existsSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { performance } from 'node:perf_hooks'
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it, onTestFailed } from 'vitest'
import LocalSubprocessRuntime from '../src/index.ts'
import { createProcessInspector } from '../src/process-inspector.ts'
import type { ProcessInspector } from '../src/process-inspector.ts'

const cleanups: Array<() => Promise<void>> = []
afterEach(async () => { for (const cleanup of cleanups.splice(0).reverse()) await cleanup() })

async function shell(path: string, rc = '', envFile = '') {
  const home = await mkdtemp(join(tmpdir(), 'dsh-shell-activity-test-'))
  cleanups.push(() => rm(home, { recursive: true, force: true }))
  await writeFile(join(home, '.zshenv'), envFile)
  await writeFile(join(home, '.zshrc'), `PROMPT='READY> '\n${rc}\n`)
  await writeFile(join(home, '.bashrc'), `PS1='READY> '\n${rc}\n`)
  const ctx = new Context()
  cleanups.push(async () => { await ctx.fiber.dispose() })
  await ctx.plugin(LocalSubprocessRuntime)
  const handle = await ctx.subprocess.spawnTerminal({ argv: [path, '-i'], cwd: home, env: { HOME: home, ZDOTDIR: home }, rows: 24, cols: 80, terminalType: 'xterm-256color', graceMs: 200, shellActivity: true })
  cleanups.push(() => handle.terminate())
  let output = ''
  handle.output.on('data', (data: Buffer) => { output += data.toString('utf8') })
  await expect.poll(() => output).toContain('READY>')
  return { handle, home, output: () => output, activity: async () => (await handle.inspectActivity()).state }
}

/** A busy preexec hook is not evidence that a child owns the terminal foreground group. */
async function foregroundChild(h: Awaited<ReturnType<typeof shell>>, inspector: ProcessInspector) {
  const foreground = await h.handle.inspectForeground()
  const children = inspector.snapshot().tree(h.handle.pid).filter(member => member.pid !== h.handle.pid)
  return {
    ownedChildren: children.length,
    foregroundIsShell: foreground?.processGroupId === h.handle.pid,
    foregroundIsOwnedChild: foreground !== undefined && foreground.processGroupId !== h.handle.pid
      && children.some(member => member.pid === foreground.processGroupId),
  }
}

/** Report the last owned transition without exposing terminal contents or the process table. */
function stoppedJobStages() {
  const started = performance.now()
  let stage = 'spawn-shell'
  let relationship: Awaited<ReturnType<typeof foregroundChild>> | undefined
  onTestFailed(() => {
    console.error(`stopped-job phases: ${JSON.stringify({ stage, elapsedMs: Math.round(performance.now() - started), ...relationship })}`)
  })
  return {
    mark(next: string): void { stage = next; relationship = undefined },
    observe(value: Awaited<ReturnType<typeof foregroundChild>>): void { relationship = value },
  }
}

describe.skipIf(process.platform === 'win32' || !existsSync('/bin/zsh'))('Zsh terminal activity', () => {
  it('keeps silent foreground work, builtin loops, read, and background jobs busy until a new prompt is idle', async () => {
    const h = await shell('/bin/zsh')
    await expect.poll(h.activity).toBe('idle')
    for (const command of ['sleep 600', 'while :; do :; done', 'read answer', 'sleep 600 &']) {
      await h.handle.write(`${command}\r`)
      await expect.poll(h.activity).toBe('busy')
      await h.handle.write(command.endsWith('&') ? 'kill %1\r' : '\x03')
      await expect.poll(h.activity).toBe('idle')
    }
  })

  it('does not confuse vared or multiline editing with a top-level empty prompt', async () => {
    const h = await shell('/bin/zsh')
    await expect.poll(h.activity).toBe('idle')
    await h.handle.write('value=abc; vared value\r')
    await expect.poll(h.activity).toBe('busy')
    await h.handle.write('\x03')
    await expect.poll(h.activity).toBe('idle')
    await h.handle.write('if true; then\r')
    await expect.poll(h.activity).toBe('busy')
    await h.handle.write('fi\r')
    await expect.poll(h.activity).toBe('idle')
    await h.handle.write('partial')
    expect(await h.activity()).toBe('unknown')
  })

  it('preserves startup options and ZDOTDIR and supports noclobber status updates', async () => {
    const h = await shell('/bin/zsh', 'setopt noclobber\nprint RC-LOADED', 'print ENV-LOADED')
    expect(h.output()).toContain('ENV-LOADED')
    expect(h.output()).toContain('RC-LOADED')
    await expect.poll(h.activity).toBe('idle')
    await h.handle.write('print -r -- "DIRECTORY:$ZDOTDIR"\r')
    await expect.poll(() => h.output()).toContain(`DIRECTORY:${h.home}`)
    await expect.poll(h.activity).toBe('idle')
    expect(h.output()).not.toContain('file exists')
  })

  it('protects a stopped job even after the shell returns to the prompt', async () => {
    const stages = stoppedJobStages()
    const h = await shell('/bin/zsh')
    const inspector = createProcessInspector()
    stages.mark('waiting-idle')
    await expect.poll(h.activity).toBe('idle')
    await h.handle.write('sleep 600\r')
    stages.mark('waiting-owned-foreground-child')
    await expect.poll(async () => {
      const relationship = await foregroundChild(h, inspector)
      stages.observe(relationship)
      return relationship.foregroundIsOwnedChild
    }).toBe(true)
    stages.mark('waiting-busy')
    await expect.poll(h.activity).toBe('busy')
    await h.handle.write('\x1a')
    stages.mark('waiting-suspended')
    await expect.poll(() => h.output().includes('suspended')).toBe(true)
    expect(await h.activity()).toBe('busy')
    await h.handle.write('kill -KILL %1\r')
    stages.mark('waiting-reaped-and-idle')
    await expect.poll(h.activity).toBe('idle')
    expect((await foregroundChild(h, inspector)).ownedChildren).toBe(0)
    stages.mark('complete')
  })

  it('rejects preexec busy as child readiness before delivering Ctrl-Z to an owned foreground job', async () => {
    const stages = stoppedJobStages()
    const root = await mkdtemp(join(tmpdir(), 'dsh-stopped-job-barrier-'))
    cleanups.push(() => rm(root, { recursive: true, force: true }))
    const release = join(root, 'release')
    const quoted = `'${release.replaceAll("'", "'\\''")}'`
    const h = await shell('/bin/zsh', `preexec() { if [[ $1 == 'sleep 600' ]]; then print PREEXEC-BARRIER; while [[ ! -e ${quoted} ]]; do :; done; fi }`)
    cleanups.push(() => writeFile(release, 'release'))
    const inspector = createProcessInspector()
    await expect.poll(h.activity).toBe('idle')
    await h.handle.write('sleep 600\r')
    stages.mark('waiting-preexec-barrier')
    await expect.poll(() => h.output().includes('PREEXEC-BARRIER')).toBe(true)
    stages.mark('waiting-preexec-busy')
    await expect.poll(h.activity).toBe('busy')
    const early = await foregroundChild(h, inspector)
    stages.observe(early)
    expect(early).toEqual({ ownedChildren: 0, foregroundIsShell: true, foregroundIsOwnedChild: false })
    await writeFile(release, 'release')
    stages.mark('waiting-owned-foreground-child')
    await expect.poll(async () => {
      const relationship = await foregroundChild(h, inspector)
      stages.observe(relationship)
      return relationship.foregroundIsOwnedChild
    }).toBe(true)
    expect(h.output().includes('suspended')).toBe(false)
    expect(await h.activity()).toBe('busy')
    await h.handle.write('\x1a')
    stages.mark('waiting-suspended-after-child-ready')
    await expect.poll(() => h.output().includes('suspended')).toBe(true)
    expect(await h.activity()).toBe('busy')
    await h.handle.write('kill -KILL %1\r')
    stages.mark('waiting-reaped-and-idle')
    await expect.poll(h.activity).toBe('idle')
    expect((await foregroundChild(h, inspector)).ownedChildren).toBe(0)
    stages.mark('complete')
  })

  it('refuses idle evidence when custom signal traps may run without terminal input', async () => {
    const h = await shell('/bin/zsh', "trap ':' USR1")
    expect(await h.activity()).toBe('unknown')
    await h.handle.write('trap - USR1\r')
    await expect.poll(h.activity).toBe('idle')
  })

  it('leaves disabled startup files disabled and restores ZDOTDIR immediately', async () => {
    const h = await shell('/bin/zsh', 'print UNEXPECTED-RC', "unsetopt rcs\nPROMPT='READY> '")
    expect(h.output()).not.toContain('UNEXPECTED-RC')
    await h.handle.write('print -r -- "DIRECTORY:$ZDOTDIR"\r')
    await expect.poll(() => h.output()).toContain(`DIRECTORY:${h.home}`)
  })
})

describe.skipIf(process.platform === 'win32' || !existsSync('/bin/bash'))('Bash terminal activity', () => {
  it('preserves scalar prompt hooks and uses unknown on shells without PS0', async () => {
    const h = await shell('bash', "PROMPT_COMMAND='printf HOOK; # user comment'\nset -C")
    expect(h.output()).toContain('HOOK')
    await h.handle.write('printf "VERSION:%s\\n" "$BASH_VERSION"\r')
    await expect.poll(() => h.output()).toContain('VERSION:')
    await expect.poll(() => /VERSION:\d+\.\d+/u.test(h.output())).toBe(true)
    const version = /VERSION:(\d+)\.(\d+)/u.exec(h.output())
    const supported = Number(version?.[1]) > 4 || Number(version?.[1]) === 4 && Number(version?.[2]) >= 4
    if (!supported) { expect(await h.activity()).toBe('unknown'); return }
    await expect.poll(h.activity).toBe('idle')
    for (const command of ['sleep 600', 'while :; do :; done', 'read answer']) {
      await h.handle.write(`${command}\r`)
      await expect.poll(h.activity, { message: command }).toBe('busy')
      await h.handle.write('\x03')
      await expect.poll(h.activity).toBe('idle')
    }
    expect(h.output()).not.toContain('syntax error')
    expect(h.output()).not.toContain('file exists')
  })
})
