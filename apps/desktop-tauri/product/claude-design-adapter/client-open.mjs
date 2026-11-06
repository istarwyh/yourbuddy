/** Reopen the managed artifact and reveal a comment in its original conversation. */
export async function openDesignThread(ctx, sessionId, root, threadId) {
  const sidebar = ctx.get('sidebarRight');
  const tabs = ctx.get('sidebarRightTabs');
  if (sidebar === undefined || tabs?.get('browser') === undefined) {
    throw new Error('Enable the Browser sidebar tab to view this design comment.');
  }
  const layout = ctx.get('layout');
  const workspace = ctx.get('uiWorkspace');
  if (layout === undefined || workspace === undefined) {
    throw new Error('Open the desktop conversation view before viewing this design comment.');
  }
  const navigation = layout.beginNavigation();
  let response;
  let revealing = false;
  try {
    // Match the published artifacts route relative to the application's mount.
    response = await fetch(`api/baoyu-design.artifacts.open?${new URLSearchParams({ root })}`, {
      method: 'POST', signal: navigation,
    });
    const body = await response.json();
    if (navigation.aborted) return;
    if (!response.ok) throw new Error(body.error ?? `Cannot open the design artifact (HTTP ${response.status}).`);
    if (typeof body.url !== 'string') throw new Error('The design server did not return an editor URL.');
    const target = new URL(body.url);
    if (threadId !== undefined) target.searchParams.set('comment', threadId);
    revealing = true;
    workspace.openSession(sessionId);
    // Revealing our own conversation ends the previous layout navigation.
    const opening = layout.beginNavigation();
    const accepted = await openWhenAdopted(sidebar, sessionId, target.href, opening);
    return accepted ? target.href : undefined;
  } catch (error) {
    if (navigation.aborted && !revealing) return;
    throw error;
  }
}

/** Wait for the session's sidebar store, without retaining a stale navigation. */
function openWhenAdopted(sidebar, sessionId, url, signal) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let timer;
    let stop = () => {};
    const finish = (error, accepted = false) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      stop();
      signal.removeEventListener('abort', aborted);
      if (error) reject(error);
      else resolve(accepted);
    };
    const aborted = () => finish(undefined);
    const attempt = () => {
      if (settled) return;
      if (signal.aborted) return aborted();
      try {
        if (sidebar.openTabIn(sessionId, 'browser', { params: { url } })) finish(undefined, true);
      } catch (error) { finish(error); }
    };
    stop = sidebar.onSessionAdopted(id => { if (id === sessionId) attempt(); });
    signal.addEventListener('abort', aborted, { once: true });
    timer = setTimeout(() => finish(new Error('The conversation sidebar is not ready. Reopen the conversation and try View thread again.')), 5000);
    attempt();
  });
}
