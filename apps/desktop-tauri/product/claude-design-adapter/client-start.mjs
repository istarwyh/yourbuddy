/** Start an unsent design draft using the desktop's existing Session services. */
export async function startDesignDraft(ctx, prompt, agentPreset) {
  // Pending is not an empty installation. The UI enables creation after both baselines arrive.
  if (ctx.workspaces.list.getSnapshot().phase !== 'ready'
    || ctx.sessions.list.getSnapshot().phase !== 'ready') return;
  const navigation = ctx.layout.beginNavigation();
  const catalog = ctx.sessions.list.getSnapshot();
  const current = Object.values(catalog.byId).find(item => (item.retainedBy.mainView ?? 0) > 0);
  const workspaces = ctx.workspaces.list.getSnapshot().items;
  let workspace = workspaces.find(item => item.sessionIds.includes(current?.id));
  workspace ??= [...workspaces].sort((left, right) => {
    const activity = item => Math.max(Date.parse(item.updatedAt) || 0,
      ...item.sessionIds.map(id => catalog.byId[id]?.updatedAt ?? 0));
    return activity(right) - activity(left);
  })[0];
  if (workspace === undefined) workspace = await ctx.workspaces.initializeDefault(navigation);
  if (navigation.aborted) return;
  if (workspace === undefined) throw new Error('No workspace is available for the design draft.');
  const preset = agentPreset ?? current?.projectionValues?.agentPreset;
  // Always create: workspace navigation may otherwise reuse an existing unsent draft.
  const sessionId = await ctx.sessions.create({ workspaceId: workspace.workspaceId });
  if (navigation.aborted) return;
  if (typeof preset === 'string') {
    const selected = await ctx.remote.agentPresets.select(sessionId, preset);
    if (!selected.ok) throw selected.error;
  }
  if (navigation.aborted) return;
  await ctx.sessions.using(sessionId, { source: 'controllerOperation', signal: navigation }, async reference => {
    await reference.ready;
    if (navigation.aborted) return;
    const input = ctx.conversation.input.for(reference.binding.ctx);
    input.setDraft(prompt);
    // openSession retains the new main view before using() releases its reference.
    ctx.uiWorkspace.openSession(sessionId);
    input.focus();
  });
  return sessionId;
}
