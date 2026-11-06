/** Keep the pinned skill's platform-correct shell syntax while replacing its detached open instructions. */
export function designRuntimeInstructions(runtimeSection, skillDirectory, node, platform) {
  const upstream = runtimeSection({ name: 'claude-design' }, skillDirectory, { path: node }, platform, false)
  const at = upstream.indexOf('`open` prints')
  if (at < 0) throw new Error('The pinned Claude Design runtime instructions changed.')
  return upstream.slice(0, at) + 'For opening or reopening an editor, always call yourbuddy_design_open with the artifact root instead of running open, serve, share, or comments --wait in a shell. YourBuddy owns the server and delivers comments into this Session after persistence. Tell the user to choose the artifact from Artifacts in the sidebar; a chat URL opens the external browser. Use the managed command above for check, tree, comments and comment-reply.\n'
}
