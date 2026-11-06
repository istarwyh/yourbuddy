/** YourBuddy's bundled Claude Design adapter. Upstream failures stay isolated from the workbench. */
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { realpath } from 'node:fs/promises'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { designOpenToolDefinition } from './open-tool.mjs'
import { isWithinWorkspace } from './workspace-path.mjs'
import z from '@deepseek-ai/schemastery'
import { registerCommentReceipts } from './comment-receipts.mjs'
import { EditorOwner, deliverComment } from './editor-owner.mjs'
import { designRuntimeInstructions } from './runtime-instructions.mjs'

export const name = 'yourbuddy-design'
export const inject = ['skills', 'tools', 'sessions', 'sessionController', 'agents', 'sessionProjections']
export const Config = z.object({ startupTimeoutMs: z.number().min(1).default(20000), stopTimeoutMs: z.number().min(1).default(5000) })

/** Mount the pinned upstream pair with product-owned process and persistence handling. */
export async function apply(ctx, config) {
  registerCommentReceipts(ctx)
  const require = createRequire(import.meta.url)
  const artifacts = await import('dsh-claude-artifacts')
  const design = await import('dsh-claude-design')
  const script = join(dirname(require.resolve('dsh-claude-design/package.json')), 'skills/claude-design/scripts/artifact.mjs')
  const owner = new EditorOwner({ ...config, deliver: (...args) => deliverComment(ctx, artifacts.commentMessage, ...args) })
  ctx.effect(() => () => owner.dispose(), 'yourbuddy-design: editors')
  const adapter = {
    open: (script, root, sessionId) => owner.open(script, root, sessionId),
    close: root => owner.close(root),
    runtimeInstructions: designRuntimeInstructions(design.runtimeSection, dirname(dirname(script)), process.execPath, process.platform),
  }
  ctx.provide('yourbuddyDesign', adapter)
  ctx.tools.register(defineTool(designOpenToolDefinition(async ({ root }, exec) => {
    exec.signal.throwIfAborted()
    if (!exec.agent) throw new Error('A Session is required to open a design.')
    const workspace = await realpath(exec.agent.session.header.cwd)
    const folder = await realpath(resolve(workspace, root))
    if (!isWithinWorkspace(workspace, folder)) throw new Error('The artifact must be inside this Session workspace.')
    const { url } = await owner.open(script, folder, exec.agent.id)
    artifacts.recordOpened('claude-design', 'dsh-claude-design', exec.agent.id, folder)
    return { url, root: folder }
  })))
}
