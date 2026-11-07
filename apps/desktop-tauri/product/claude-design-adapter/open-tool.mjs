/** Product design-opening tool definition using the current Host schema DSL. */
/** @param execute - Session-owned artifact opener. @returns The definition compiled by defineTool. */
export function designOpenToolDefinition(execute) {
  return {
    name: 'yourbuddy_design_open',
    description: 'Open a Claude Design artifact from this Session workspace in YourBuddy. The Artifacts sidebar is the in-app editor entry.',
    parameters: { root: { type: 'string', required: true, description: 'Artifact folder containing project/canvas.json, within this Session workspace.' } },
    output: {
      schema: {
        type: 'object', additionalProperties: false,
        properties: { url: { type: 'string', required: true }, root: { type: 'string', required: true } },
      },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    execute,
    presentCall: args => ({ card: 'generic', title: 'Open design', kind: 'other', rawInput: args.root }),
  }
}
