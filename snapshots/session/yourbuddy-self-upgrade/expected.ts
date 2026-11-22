/** Fresh runtime-context expectation for the immutable upgrade replay recording. */
import { expect } from 'vitest'

interface JsonObject {
  [key: string]: unknown
}

const sandbox = {
  name: 'sandbox:policy',
  text: 'Current DSH file policy: danger-full-access. The DSH file sandbox does not restrict file modifications by available operations.',
}
const approval = {
  name: 'approval:policy',
  text: 'Approval prompts are disabled in this session: actions that require approval are rejected automatically — do not request sandbox escalation (do not set `sandbox_permissions`).',
}
const historicalText = `Current runtime context. This snapshot supersedes earlier runtime-context snapshots.\n\n${sandbox.text}\n\n${approval.text}`

/**
 * Adapt only the freshly assembled runtime context, retaining every upgrade event.
 * @param recording - Normalized immutable recording records.
 * @returns Independent records with the current root-agent runtime-context expectation.
 */
export function yourbuddySelfUpgradeExpected(recording: readonly JsonObject[]): JsonObject[] {
  const expected = structuredClone([...recording])
  const contexts = expected.filter(event => event.type === 'user/message'
    && ((event.data as JsonObject).source as JsonObject).kind === 'runtime-context')
  expect(contexts, 'yourbuddy-self-upgrade historical runtime context count').toHaveLength(1)
  const message = contexts[0]!.data as JsonObject
  expect(message.source, 'yourbuddy-self-upgrade historical runtime context source').toEqual({
    kind: 'runtime-context', form: 'snapshot', sections: [sandbox, approval],
  })
  expect(message.content, 'yourbuddy-self-upgrade historical runtime context text').toEqual([
    { type: 'text', text: historicalText },
  ])
  const sections = [
    { name: 'working-directory:current', text: 'Current working directory: "{{cwd}}".' },
    sandbox,
    approval,
    {
      name: 'subagent:identity',
      text: 'You are the root agent. Your name is "lead".\n\nTo message other agents, use send_message({ agent: "<agent-name>", message: "..." }).\nUse list_agents({}) to find your collaborator agents and their names.',
    },
  ]
  message.source = { kind: 'runtime-context', form: 'snapshot', sections }
  message.content = [{
    type: 'text',
    text: `<system-reminder>\nThe following information describes your current session:\n\n${sections.map(section => section.text).join('\n\n')}\n</system-reminder>`,
  }]
  return expected
}
