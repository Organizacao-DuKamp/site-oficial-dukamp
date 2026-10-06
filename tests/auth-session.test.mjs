import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
const code = stripTypeScriptTypes(readFileSync(new URL('../src/lib/auth-session.ts', import.meta.url), 'utf8'));
const { createAuthSessionHandler } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
const session = (id, token = 'initial') => ({ user: { id }, access_token: token });
const tick = () => new Promise(resolve => setImmediate(resolve));

function setup() {
  const scheduled = [], pending = [], loading = [];
  const state = { session: null, profile: null, period: 202505, mounted: true };
  const handler = createAuthSessionHandler({
    setSession: value => { state.session = value; },
    setLoading: value => { loading.push(value); if (value) { state.mounted = false; state.period = null; } else state.mounted = true; },
    clearProfile: () => { state.profile = null; },
    loadProfile: (next, isCurrent) => new Promise(resolve => pending.push(() => { if (isCurrent()) state.profile = next.user.id; resolve(); })),
    onError: error => { throw error; },
  }, work => scheduled.push(work));
  const flush = () => { while (scheduled.length) scheduled.shift()(); };
  return { handler, state, loading, pending, flush };
}

test('same-user focus/sign-in and token refresh retain the mounted page and chosen month', async () => {
  const f = setup();
  f.handler.handle(session('admin')); f.flush(); f.pending.shift()(); await tick();
  f.state.period = 202505; f.loading.length = 0;
  for (const token of ['same-sign-in', 'refreshed-token']) {
    f.handler.handle(session('admin', token)); f.flush();
    assert.equal(f.state.mounted, true);
    assert.equal(f.state.period, 202505);
    assert.equal(f.state.profile, 'admin');
    assert.equal(f.state.session.access_token, token);
    f.pending.shift()(); await tick();
  }
  assert.ok(!f.loading.includes(true));
});

test('switching account clears permissions and blocks until the new profile loads', async () => {
  const f = setup();
  f.handler.handle(session('admin')); f.flush(); f.pending.shift()(); await tick();
  f.handler.handle(session('different-account')); f.flush();
  assert.equal(f.state.profile, null);
  assert.equal(f.state.mounted, false);
  f.pending.shift()(); await tick();
  assert.equal(f.state.profile, 'different-account');
  assert.equal(f.state.mounted, true);
});

test('sign-out invalidates an in-flight profile response', async () => {
  const f = setup();
  f.handler.handle(session('admin')); f.flush();
  f.handler.handle(null);
  f.pending.shift()(); await tick();
  assert.equal(f.state.profile, null);
  assert.equal(f.state.session, null);
});

test('superseded or disposed profile requests cannot apply stale permissions', async () => {
  const f = setup();
  f.handler.handle(session('old-account')); f.flush();
  f.handler.handle(session('new-account')); f.flush();
  f.pending.shift()(); await tick();
  assert.equal(f.state.profile, null);
  f.handler.dispose(); f.pending.shift()(); await tick();
  assert.equal(f.state.profile, null);
});
