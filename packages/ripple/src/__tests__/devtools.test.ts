import { computed, effect, getDevToolsHook, signal, store } from '../';
import { debugEffect, installDevTools } from '../devtools';

describe('DevTools hook', () => {
  let savedHook: ReturnType<typeof getDevToolsHook>;

  beforeEach(() => {
    savedHook = getDevToolsHook();
  });
  afterEach(() => {
    installDevTools(savedHook);
  });

  it('getDevToolsHook returns null when not installed', () => {
    installDevTools(null);
    expect(getDevToolsHook()).toBeNull();
  });

  it('installDevTools stores the hook and getDevToolsHook returns it', () => {
    const hook = { write: vi.fn() };

    installDevTools(hook);
    expect(getDevToolsHook()).toBe(hook);
  });

  it('globalThis.__RIPPLE_DEVTOOLS__ mirrors the installed hook', () => {
    const hook = { write: vi.fn() };

    installDevTools(hook);
    expect((globalThis as Record<string, unknown>)['__RIPPLE_DEVTOOLS__']).toBe(hook);
    installDevTools(null);
    expect((globalThis as Record<string, unknown>)['__RIPPLE_DEVTOOLS__']).toBeUndefined();
  });

  it('write event fires with name, oldValue, and newValue on signal write', () => {
    const events: Array<{ name: string | undefined; newValue: unknown; oldValue: unknown }> = [];

    installDevTools({ write: (e) => events.push({ name: e.name, newValue: e.newValue, oldValue: e.oldValue }) });

    const n = signal(0, { name: 'devtest' });

    n.value = 42;
    n.dispose();
    expect(events).toEqual(expect.arrayContaining([{ name: 'devtest', newValue: 42, oldValue: 0 }]));
  });

  it('write event fires with name:undefined for unnamed signal', () => {
    const events: Array<{ name: string | undefined; newValue: unknown; oldValue: unknown }> = [];

    installDevTools({ write: (e) => events.push({ name: e.name, newValue: e.newValue, oldValue: e.oldValue }) });

    const n = signal(0);

    n.value = 1;
    n.dispose();
    expect(events[0]?.name).toBeUndefined();
    expect(events[0]?.oldValue).toBe(0);
    expect(events[0]?.newValue).toBe(1);
  });

  it('compute event fires on computed recompute', () => {
    const names: Array<string | undefined> = [];

    installDevTools({ compute: (e) => names.push(e.name) });

    const n = signal(0);
    const c = computed(() => n.value * 2, { name: 'doubled' });

    void c.value;
    n.value = 1;
    void c.value;
    c.dispose();
    n.dispose();
    expect(names).toContain('doubled');
  });

  it('run event fires with name when effect runs', () => {
    const names: Array<string | undefined> = [];

    installDevTools({ run: (e) => names.push(e.name) });

    const stop = effect(() => {}, { name: 'myEffect' });

    stop.dispose();
    expect(names).toContain('myEffect');
  });

  it('dispose event fires with kind:effect when effect is disposed', () => {
    const events: Array<{ kind: string; name: string | undefined }> = [];

    installDevTools({ dispose: (e) => events.push(e) });

    const stop = effect(() => {}, { name: 'myEffect' });

    stop.dispose();
    expect(events).toContainEqual({ kind: 'effect', name: 'myEffect' });
  });

  it('dispose event fires with kind:signal when signal is disposed', () => {
    const events: Array<{ kind: string; name: string | undefined }> = [];

    installDevTools({ dispose: (e) => events.push(e) });

    const n = signal(0, { name: 'sig' });

    n.dispose();
    expect(events).toContainEqual({ kind: 'signal', name: 'sig' });
  });

  it('dispose event fires with kind:computed when computed is disposed', () => {
    const events: Array<{ kind: string; name: string | undefined }> = [];

    installDevTools({ dispose: (e) => events.push(e) });

    const c = computed(() => 1, { name: 'comp' });

    c.dispose();
    expect(events).toContainEqual({ kind: 'computed', name: 'comp' });
  });

  it('dispose event fires with name:undefined for unnamed nodes', () => {
    const events: Array<{ kind: string; name: string | undefined }> = [];

    installDevTools({ dispose: (e) => events.push(e) });

    const n = signal(0);
    const c = computed(() => n.value);
    const stop = effect(() => {});

    n.dispose();
    c.dispose();
    stop.dispose();
    expect(events.filter((e) => e.kind === 'signal')[0]?.name).toBeUndefined();
    expect(events.filter((e) => e.kind === 'computed')[0]?.name).toBeUndefined();
    expect(events.filter((e) => e.kind === 'effect')[0]?.name).toBeUndefined();
  });

  it('mutate event fires with kind:patch on store.patch()', () => {
    const events: Array<{ kind: string; name: string | undefined }> = [];

    installDevTools({ mutate: (e) => events.push(e) });

    const s = store({ x: 0 }, { name: 'myStore' });

    s.patch({ x: 1 });
    expect(events).toContainEqual({ kind: 'patch', name: 'myStore' });
  });

  it('mutate event fires with kind:replace on store.replace()', () => {
    const events: Array<{ kind: string; name: string | undefined }> = [];

    installDevTools({ mutate: (e) => events.push(e) });

    const s = store({ x: 0 }, { name: 'myStore' });

    s.replace((st) => ({ ...st, x: 99 }));
    expect(events).toContainEqual({ kind: 'replace', name: 'myStore' });
  });

  it('mutate event fires with kind:reset on store.reset()', () => {
    const events: Array<{ kind: string; name: string | undefined }> = [];

    installDevTools({ mutate: (e) => events.push(e) });

    const s = store({ x: 5 }, { name: 'myStore' });

    s.reset();
    expect(events).toContainEqual({ kind: 'reset', name: 'myStore' });
  });

  it('mutate event fires with kind:lens and correct path on top-level lens write', () => {
    const events: Array<{ kind: string; name: string | undefined; path?: string }> = [];

    installDevTools({ mutate: (e) => events.push(e) });

    const s = store({ x: 0 }, { name: 'myStore' });
    const xLens = s.lens('x');

    xLens.value = 7;
    expect(events).toContainEqual({ kind: 'lens', name: 'myStore', path: 'x' });
  });

  it('mutate event fires with kind:lens and correct path on nested lens write', () => {
    const events: Array<{ kind: string; name: string | undefined; path?: string }> = [];

    installDevTools({ mutate: (e) => events.push(e) });

    const s = store({ a: { b: 0 } }, { name: 'nested' });
    const bLens = s.lens('a.b');

    bLens.value = 99;
    expect(events).toContainEqual({ kind: 'lens', name: 'nested', path: 'a.b' });
  });
});
