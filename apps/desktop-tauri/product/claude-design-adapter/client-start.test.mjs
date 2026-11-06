import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { startDesignDraft } from './client-start.mjs';

function fixture() {
  let navigation;
  const drafts = new Map([['old', 'Keep my unsent work']]);
  const calls = [];
  const ctx = {
    layout: { beginNavigation() { navigation?.abort(); navigation = new AbortController(); return navigation.signal; } },
    sessions: {
      list: { getSnapshot: () => ({ phase: 'ready', byId: { old: { id: 'old', retainedBy: { mainView: 1 }, projectionValues: { agentPreset: 'current-preset' } } } }) },
      async create(options) { calls.push(['create', options]); return 'new'; },
      async using(id, options, operation) {
        calls.push(['retain', id, options.source]);
        try { return await operation({ ready: Promise.resolve(), binding: { ctx: { id } } }); }
        finally { calls.push(['release', id]); }
      },
    },
    workspaces: { list: { getSnapshot: () => ({ phase: 'ready', items: [{ workspaceId: 'selected-workspace', sessionIds: ['old'], updatedAt: '2026-01-01' }] }) } },
    remote: { agentPresets: { async select(id, preset) { calls.push(['preset', id, preset]); return { ok: true }; } } },
    conversation: { input: { for: ({ id }) => ({ setDraft: text => drafts.set(id, text), focus: () => calls.push(['focus', id]) }) } },
    uiWorkspace: { openSession: id => calls.push(['open', id]) },
  };
  return { ctx, calls, drafts };
}

test('creates a fresh unsent draft in the selected workspace and preserves its preset', async () => {
  const { ctx, calls, drafts } = fixture();
  assert.equal(await startDesignDraft(ctx, '/claude-design'), 'new');
  assert.equal(drafts.get('old'), 'Keep my unsent work');
  assert.equal(drafts.get('new'), '/claude-design');
  assert.deepEqual(calls, [['create', { workspaceId: 'selected-workspace' }], ['preset', 'new', 'current-preset'],
    ['retain', 'new', 'controllerOperation'], ['open', 'new'], ['focus', 'new'], ['release', 'new']]);
});

test('does not navigate or overwrite drafts after a newer navigation', async () => {
  const { ctx, calls, drafts } = fixture();
  let finish;
  ctx.sessions.create = () => new Promise(resolve => { finish = resolve; });
  const pending = startDesignDraft(ctx, '/claude-design');
  ctx.layout.beginNavigation();
  finish('new');
  assert.equal(await pending, undefined);
  assert.equal(drafts.size, 1);
  assert.deepEqual(calls, []);
});

test('surfaces preset refusal without replacing the current conversation', async () => {
  const { ctx, calls, drafts } = fixture();
  const failure = new Error('Preset unavailable');
  ctx.remote.agentPresets.select = async () => ({ ok: false, error: failure });
  await assert.rejects(startDesignDraft(ctx, '/claude-design', 'explicit-preset'), failure);
  assert.equal(drafts.size, 1);
  assert.equal(calls.some(([operation]) => operation === 'open'), false);
});

test('the current source LayoutController cancels draft navigation on panel changes and disposal', () => {
  const source = new URL('../../../../packages/client/ui-layout/src/client/service.ts', import.meta.url);
  execFileSync(process.execPath, ['--experimental-transform-types', '--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import { LayoutController } from ${JSON.stringify(source.href)};
    import { startDesignDraft } from ${JSON.stringify(new URL('./client-start.mjs', import.meta.url).href)};
    const fixture = ${fixture.toString()};
    const selected = [];
    const layout = new LayoutController({ selectPanel: id => selected.push(id) }, () => true, {});
    const { ctx, calls, drafts } = fixture();
    ctx.layout = layout;
    let finish;
    ctx.sessions.create = () => new Promise(resolve => { finish = resolve; });
    const pending = startDesignDraft(ctx, '/claude-design');
    layout.selectPanel('settings');
    finish('new');
    assert.equal(await pending, undefined);
    assert.equal(drafts.size, 1);
    assert.deepEqual(calls, []);
    const second = layout.beginNavigation();
    layout.dispose();
    assert.equal(second.aborted, true);
    assert.deepEqual(selected, ['settings']);
  `], { stdio: 'pipe' });
});
