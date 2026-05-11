import { createMemoryHistory, createRouter } from '../router';

async function settle(): Promise<void> {
  await new Promise<void>((r) => setTimeout(r, 10));
}

describe('createMemoryHistory', () => {
  it('starts at the given initial path', () => {
    const h = createMemoryHistory('/about');

    expect(h.location.pathname).toBe('/about');
  });

  it('defaults to /', () => {
    const h = createMemoryHistory();

    expect(h.location.pathname).toBe('/');
  });

  it('push updates location and notifies subscribers', async () => {
    const h = createMemoryHistory('/');
    const listener = vi.fn();

    h.subscribe(listener);
    h.push('/about');

    expect(h.location.pathname).toBe('/about');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('replace updates location without stacking entries', () => {
    const h = createMemoryHistory('/a');

    h.push('/b');
    h.replace('/c');

    expect(h.location.pathname).toBe('/c');
  });

  it('subscribe returns an unsubscribe function', () => {
    const h = createMemoryHistory('/');
    const listener = vi.fn();
    const unsub = h.subscribe(listener);

    unsub();
    h.push('/other');

    expect(listener).not.toHaveBeenCalled();
  });

  it('stores and exposes history state', () => {
    const h = createMemoryHistory('/');

    h.push('/page', { from: 'home' });

    expect(h.location.state).toEqual({ from: 'home' });
  });

  it('works as a drop-in for createRouter', async () => {
    const handler = vi.fn();
    const history = createMemoryHistory('/about');
    const router = createRouter({
      history,
      routes: {
        about: { handler, path: '/about' },
        home: { path: '/' },
      },
    });

    await settle();
    expect(handler).toHaveBeenCalled();
    router.dispose();
  });
});
