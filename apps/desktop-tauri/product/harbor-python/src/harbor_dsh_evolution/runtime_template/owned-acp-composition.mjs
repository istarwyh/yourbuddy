import Timer from '@deepseek-ai/cordis-plugin-timer'
import LlmRuntime from '@deepseek-ai/dsh-llm'
import SessionStore from '@deepseek-ai/dsh-session'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import AgentRegistry from '@deepseek-ai/dsh-agent'
import AgentLoop from '@deepseek-ai/dsh-agent-loop'
import Persistence from '@deepseek-ai/dsh-session-persistence-jsonl'
import * as checkpoint from '@deepseek-ai/dsh-session-checkpoint-policy'
import * as acp from '@deepseek-ai/dsh-acp'

export const name = 'harbor-owned-acp-composition'

export async function apply(ctx, config) {
  // Activate dependencies before their consumers. The reverse disposal order
  // closes ACP and checkpoints before removing persistence or core services.
  await ctx.effect(async function* () {
    const core = ctx.plugin({
      name: 'harbor-owned-acp-core',
      apply(ctx) {
        ctx.plugin(Timer)
        ctx.plugin(LlmRuntime)
        ctx.plugin(SessionStore)
        ctx.plugin(SystemPrompt, { persona: config.persona, includeRuntimeContext: false })
        ctx.plugin(ToolRuntime, { mode: 'native' })
        ctx.plugin(AgentRegistry)
        ctx.plugin(AgentLoop, { agents: [] })
      },
    })
    await core
    yield core.dispose

    const persistence = ctx.plugin(Persistence, {
      root: config.persistenceRoot,
      compression: 'none',
      packChunks: false,
    })
    await persistence
    yield persistence.dispose

    const barrier = ctx.plugin(checkpoint)
    await barrier
    yield barrier.dispose

    const transport = ctx.plugin(acp, { provider: config.provider, model: config.model })
    await transport
    yield transport.dispose
  }, 'harbor-owned-acp.lifecycle')
}
