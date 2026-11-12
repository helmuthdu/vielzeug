import { computed } from '@vielzeug/ripple';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createMemoryHistory,
  createQueryState,
  createRouter,
  createRouteSignals,
  param,
  WayfinderConfigError,
} from '../';
import { settle } from './test-utils';

const routes = { home: { path: '/' }, search: { path: '/search' } };

const spec = {
  flag: param.boolean(),
  page: param.number(1),
  q: param.string(),
  sort: param.pick(['price', 'name'] as const, 'price'),
  tags: param.list(),
};

const makeRouter = (initial = '/') => createRouter({ history: createMemoryHistory(initial), routes });

describe('createQueryState', () => {
  let router = makeRouter();
  beforeEach(() => {
    router = makeRouter();
  });

  it('reads defaults when the URL carries no params', async () => {
    await settle();
    const state = createQueryState(router, spec);
    expect(state.query.value).toEqual({ flag: false, page: 1, q: '', sort: 'price', tags: [] });
  });

  it('decodes typed values from the URL', async () => {
    router = makeRouter('/search?page=3&sort=name&tags=a&tags=b&q=boots&flag=1');
    await settle();
    const state = createQueryState(router, spec);
    expect(state.query.value).toEqual({ flag: true, page: 3, q: 'boots', sort: 'name', tags: ['a', 'b'] });
  });

  it('falls back to defaults for malformed URL values', async () => {
    router = makeRouter('/search?page=abc&sort=bogus');
    await settle();
    const state = createQueryState(router, spec);
    expect(state.params.page.value).toBe(1);
    expect(state.query.value.sort).toBe('price');
  });

  it('writes through the router, preserving undeclared params and the hash', async () => {
    router = makeRouter('/search?page=1&keep=me#frag');
    await settle();
    const state = createQueryState(router, spec);
    state.set({ page: 2 });
    await settle();
    expect(router.getSnapshot().location.query).toEqual({ keep: 'me', page: '2' });
    expect(router.getSnapshot().location.hash).toBe('frag');
  });

  it('removes a param when written back to its default', async () => {
    router = makeRouter('/search?page=2');
    await settle();
    const state = createQueryState(router, spec);
    state.set({ page: 1 });
    await settle();
    expect(router.getSnapshot().location.query).toEqual({});
  });

  it('applies a multi-key patch as a single replace navigation', async () => {
    router = makeRouter('/search');
    await settle();
    const notifications = vi.fn();
    router.subscribe(notifications);
    const state = createQueryState(router, spec);
    state.set({ page: 2, q: 'shoes' });
    await settle();
    expect(router.getSnapshot().location.query).toEqual({ page: '2', q: 'shoes' });
    expect(notifications).toHaveBeenCalledTimes(1);
  });

  it('forwards navigation options from construction and per-call overrides', async () => {
    router = makeRouter('/search');
    await settle();
    const calls: unknown[] = [];
    const actual = router.navigate.bind(router);
    vi.spyOn(router, 'navigate').mockImplementation(((href: never, opts?: unknown) => {
      calls.push(opts);
      return actual(href, opts as never);
    }) as never);
    const state = createQueryState(router, spec, { viewTransition: false });

    state.set({ page: 2 });
    await settle();
    state.set({ page: 3 }, { viewTransition: true });
    await settle();

    expect(calls).toEqual([
      { replace: true, viewTransition: false },
      { replace: true, viewTransition: true },
    ]);
    expect(router.getSnapshot().location.query.page).toBe('3');
  });

  it('defaults to replace so filters do not stack history entries', async () => {
    router = makeRouter('/search');
    await settle();
    const state = createQueryState(router, spec);
    state.set({ page: 2 });
    await settle();
    state.set({ page: 3 });
    await settle();
    expect(router.getSnapshot().location.query.page).toBe('3');

    state.set({ page: 4 }, { replace: false });
    await settle();
    expect(router.getSnapshot().location.query.page).toBe('4');
  });

  it('reacts to external navigation and back/forward', async () => {
    const history = createMemoryHistory('/');
    router = createRouter({ history, routes });
    await settle();
    const state = createQueryState(router, spec);
    const doubled = computed(() => state.query.value.page * 2);

    await router.navigate('/search?page=5');
    expect(state.params.page.value).toBe(5);
    expect(doubled.value).toBe(10);

    history.back();
    await settle();
    expect(state.query.value.page).toBe(1);
  });

  it('encodes list params as repeated keys and clears them on reset', async () => {
    router = makeRouter('/search?keep=me');
    await settle();
    const state = createQueryState(router, spec);
    state.set({ flag: true, tags: ['a', 'b'] });
    await settle();
    expect(router.getSnapshot().location.query).toEqual({ flag: '1', keep: 'me', tags: ['a', 'b'] });

    state.reset();
    await settle();
    expect(router.getSnapshot().location.query).toEqual({ keep: 'me' });
  });

  it('treats a default-true boolean as present-zero when false', async () => {
    router = makeRouter('/search');
    await settle();
    const state = createQueryState(router, { notify: param.boolean(true) });
    expect(state.query.value.notify).toBe(true);
    state.set({ notify: false });
    await settle();
    expect(router.getSnapshot().location.query).toEqual({ notify: '0' });
  });

  it('does not navigate when the URL already matches the written value', async () => {
    router = makeRouter('/search?page=2');
    await settle();
    const notifications = vi.fn();
    router.subscribe(notifications);
    const state = createQueryState(router, spec);
    state.set({ page: 2 });
    await settle();
    expect(notifications).not.toHaveBeenCalled();
  });

  it('throws when patching an undeclared param', async () => {
    await settle();
    const state = createQueryState(router, spec);
    expect(() => state.set({ nope: 1 } as never)).toThrow(WayfinderConfigError);
  });

  it('composes with createRouteSignals on the same router', async () => {
    router = makeRouter('/search?page=7');
    await settle();
    const signals = createRouteSignals(router);
    const state = createQueryState(router, spec);
    expect(signals.query.value.page).toBe('7');
    expect(state.query.value.page).toBe(7);
  });
});

describe('param.pick without a default', () => {
  const optionalSpec = { badge: param.pick(['new', 'sale'] as const) };

  it('decodes absent or unknown values to undefined', async () => {
    const router = makeRouter('/search?badge=clearance');
    await settle();
    const state = createQueryState(router, optionalSpec);
    expect(state.params.badge.value).toBeUndefined();
  });

  it('omits the param when writing undefined', async () => {
    const history = createMemoryHistory('/search?badge=sale&q=x');
    const router = createRouter({ history, routes });
    await settle();
    const state = createQueryState(router, optionalSpec);
    expect(state.params.badge.value).toBe('sale');
    await state.set({ badge: undefined });
    await settle();
    expect(history.location.search).not.toContain('badge');
    expect(history.location.search).toContain('q=x');
  });
});
