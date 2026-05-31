/**
 * createMemoryHistory — in-memory history driver used by the router.
 */
import { createBrowserHistory, createMemoryHistory, createRouter } from '../';
import { boot, disposeRouter, mockLocation, resetMocks } from './setup';
import { settle } from './test-utils';

describe('createMemoryHistory', () => {
  it('starts at the given initial path', () => {
    const h = createMemoryHistory('/about');

    expect(h.location.pathname).toBe('/about');
  });

  it('defaults to /', () => {
    const h = createMemoryHistory();

    expect(h.location.pathname).toBe('/');
  });

  it('push updates location silently (no listener notification)', () => {
    const h = createMemoryHistory('/');
    const listener = vi.fn();

    h.subscribe(listener);
    h.push('/about');

    expect(h.location.pathname).toBe('/about');
    expect(listener).not.toHaveBeenCalled(); // mirrors browser pushState — no popstate event
  });

  it('replace updates location silently without stacking a new entry', () => {
    const h = createMemoryHistory('/a');
    const listener = vi.fn();

    h.subscribe(listener);
    h.push('/b');
    h.replace('/c');

    expect(h.location.pathname).toBe('/c');
    expect(listener).not.toHaveBeenCalled(); // silent, like replaceState
  });

  it('back() moves to the previous entry and notifies subscribers', () => {
    const h = createMemoryHistory('/');

    h.push('/about'); // silent — stack: [/, /about], cursor=1

    const listener = vi.fn();

    h.subscribe(listener);
    h.back();

    expect(h.location.pathname).toBe('/');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('back() has no effect when at the first entry', () => {
    const h = createMemoryHistory('/');
    const listener = vi.fn();

    h.subscribe(listener);
    h.back();

    expect(h.location.pathname).toBe('/');
    expect(listener).not.toHaveBeenCalled();
  });

  it('subscribe returns an unsubscribe function that stops further notifications', () => {
    const h = createMemoryHistory('/');
    const listener = vi.fn();
    const unsub = h.subscribe(listener);

    unsub();
    h.push('/a'); // silent; now at /a
    h.push('/b'); // silent; now at /b, cursor=2
    h.back(); // would notify if listener still active, but it was unsubscribed

    expect(listener).not.toHaveBeenCalled();
  });

  it('stores and exposes history entry state', () => {
    const h = createMemoryHistory('/');

    h.push('/page', { from: 'home' });

    expect(h.location.state).toEqual({ from: 'home' });
  });

  it('works as a drop-in for createRouter', async () => {
    const data = vi.fn();
    const router = createRouter({
      history: createMemoryHistory('/about'),
      routes: { about: { data, path: '/about' }, home: { path: '/' } },
    });

    await settle();

    expect(data).toHaveBeenCalled();
    router.dispose();
  });
});

describe('createBrowserHistory', () => {
  beforeEach(resetMocks);
  afterEach(disposeRouter);

  it('reads state from window.history.state, not window.location', () => {
    const history = createBrowserHistory();

    history.push('/page', { token: 'abc' });

    // mockHistory.state was set by the pushState mock; window.location has no .state
    expect(history.location.state).toEqual({ token: 'abc' });
  });

  it('updates state correctly on replace', () => {
    const history = createBrowserHistory();

    history.push('/page', { step: 1 });
    history.replace('/page', { step: 2 });

    expect(history.location.state).toEqual({ step: 2 });
  });

  it('router.getSnapshot().location.historyState reflects push state', async () => {
    const router = createRouter({
      routes: { home: { path: '/' }, page: { path: '/page' } },
    });

    mockLocation.pathname = '/';
    await boot(router);

    await router.navigate({ path: '/page' }, { state: { from: 'home' } });

    expect(router.getSnapshot().location.historyState).toEqual({ from: 'home' });
  });
});
