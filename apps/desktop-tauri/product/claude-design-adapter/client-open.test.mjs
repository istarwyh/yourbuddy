import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { openDesignThread } from './client-open.mjs';

function fixture() {
  let navigation = new AbortController();
  const listeners = new Set();
  const opened = [];
  let ready = true;
  const services = {
    layout: { beginNavigation() { navigation.abort(); navigation = new AbortController(); return navigation.signal; } },
    uiWorkspace: { openSession(id) { opened.push(['session', id]); navigation.abort(); } },
    sidebarRightTabs: { get: () => ({}) },
    sidebarRight: {
      openTabIn(id, kind, options) { if (!ready) return false; opened.push(['tab', id, kind, options]); return true; },
      onSessionAdopted(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    },
  };
  return { ctx: { get: key => services[key] }, services, listeners, opened,
    notReady() { ready = false; }, adopt() { ready = true; for (const listener of [...listeners]) listener('original'); } };
}

test('uses the published managed open route and new URL on the original session', async t => {
  const { ctx, opened } = fixture();
  let request;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    request = [url, options.method];
    return Response.json({ url: 'http://127.0.0.1:43210/editor/', sessionId: 'other' });
  });
  const url = await openDesignThread(ctx, 'original', '/work/design a', 'comment-1');
  assert.deepEqual(request, ['api/baoyu-design.artifacts.open?root=%2Fwork%2Fdesign+a', 'POST']);
  assert.equal(url, 'http://127.0.0.1:43210/editor/?comment=comment-1');
  assert.deepEqual(opened, [['session', 'original'], ['tab', 'original', 'browser', { params: { url } }]]);
});

test('waits for adoption and removes its observer after opening', async t => {
  const f = fixture(); f.notReady();
  t.mock.method(globalThis, 'fetch', async () => Response.json({ url: 'http://127.0.0.1:43210/' }));
  const opening = openDesignThread(f.ctx, 'original', '/design', 'c1');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.listeners.size, 1);
  f.adopt();
  assert.match(await opening, /comment=c1/);
  assert.equal(f.listeners.size, 0);
  assert.equal(f.opened.filter(([kind]) => kind === 'tab').length, 1);
});

test('later navigation cancels adoption without opening a stale tab', async t => {
  const f = fixture(); f.notReady();
  t.mock.method(globalThis, 'fetch', async () => Response.json({ url: 'http://127.0.0.1:43210/' }));
  const opening = openDesignThread(f.ctx, 'original', '/design', 'c1');
  await new Promise(resolve => setImmediate(resolve));
  f.services.layout.beginNavigation();
  assert.equal(await opening, undefined);
  f.adopt();
  assert.deepEqual(f.opened, [['session', 'original']]);
  assert.equal(f.listeners.size, 0);
});

test('missing Browser support and managed server failures are explicit errors', async t => {
  const f = fixture();
  f.services.sidebarRightTabs.get = () => undefined;
  await assert.rejects(openDesignThread(f.ctx, 'original', '/design', 'c1'), /Enable the Browser/);
  f.services.sidebarRightTabs.get = () => ({});
  t.mock.method(globalThis, 'fetch', async () => Response.json({ error: 'Artifact folder missing' }, { status: 404 }));
  await assert.rejects(openDesignThread(f.ctx, 'original', '/design', 'c1'), /Artifact folder missing/);
  assert.deepEqual(f.opened, []);
});

test('source LayoutController supersession prevents a late managed response from opening', () => {
  const source = new URL('../../../../packages/client/ui-layout/src/client/service.ts', import.meta.url);
  execFileSync(process.execPath, ['--experimental-transform-types', '--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import { LayoutController } from ${JSON.stringify(source.href)};
    import { openDesignThread } from ${JSON.stringify(new URL('./client-open.mjs', import.meta.url).href)};
    const fixture = ${fixture.toString()};
    const f = fixture();
    f.services.layout = new LayoutController({ selectPanel() {} }, () => true, {});
    let finish;
    globalThis.fetch = () => new Promise(resolve => { finish = resolve; });
    const opening = openDesignThread(f.ctx, 'original', '/design', 'c1');
    f.services.layout.selectPanel('settings');
    finish(Response.json({ url: 'http://127.0.0.1:43210/' }));
    assert.equal(await opening, undefined);
    assert.deepEqual(f.opened, []);
    f.services.layout.dispose();
  `], { stdio: 'pipe' });
});
