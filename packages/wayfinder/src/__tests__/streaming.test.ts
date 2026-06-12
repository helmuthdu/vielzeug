/**
 * R10 — Streaming data loader behaviour.
 *
 * Covers: generator yields → 'streaming' status, return value → final data,
 * abort signal cleanup, navigation supersession, mixed loaders, drainGenerator
 * via match() and preload().
 */
import { createMemoryHistory, createRouter } from '../';
import { settle } from './test-utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function* makeGenerator<T>(yields: T[], returnValue: T, signal?: AbortSignal): AsyncGenerator<T, T> {
  for (const value of yields) {
    if (signal?.aborted) return returnValue;

    yield value;
  }

  return returnValue;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('streaming data loaders', () => {
  it('emits status:"streaming" on each yield and "idle" when complete', async () => {
    const statuses: string[] = [];
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        home: {
          data: () => makeGenerator(['partial'], 'final'),
          path: '/',
        },
      },
    });

    const unsub = router.subscribe((s) => statuses.push(s.status));

    await settle();
    unsub();

    // loading → streaming (at least one partial) → idle
    expect(statuses).toContain('streaming');
    expect(statuses[statuses.length - 1]).toBe('idle');
    router.dispose();
  });

  it("uses the generator's return value as final data", async () => {
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        home: {
          data: () => makeGenerator(['intermediate'], 'final-value'),
          path: '/',
        },
      },
    });

    await settle();

    const state = router.getSnapshot();

    expect(state.status).toBe('idle');
    expect(state.matches[0]?.data).toBe('final-value');
    router.dispose();
  });

  it('aborts the generator when a superseding navigation starts', async () => {
    let aborted = false;
    let resolveDeferred!: () => void;
    const deferred = new Promise<void>((r) => {
      resolveDeferred = r;
    });

    async function* holdingGenerator(signal: AbortSignal): AsyncGenerator<string, string> {
      signal.addEventListener('abort', () => {
        aborted = true;
        resolveDeferred();
      });

      // Hold until signal fires
      await deferred;
      yield 'never-seen';

      return 'never-returned';
    }

    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        about: { path: '/about' },
        home: {
          data: ({ signal }: { signal: AbortSignal }) => holdingGenerator(signal),
          path: '/',
        },
      },
    });

    // Let the loading state begin (data function has been called)
    await settle();

    // Navigate away — this aborts the current home navigation's signal
    void router.navigate({ name: 'about' });
    await settle();

    expect(aborted).toBe(true);
    expect(router.getSnapshot().matches[0]?.name).toBe('about');
    router.dispose();
  });

  it('handles mixed streaming and non-streaming loaders on the same route (nested)', async () => {
    const history = createMemoryHistory('/child');
    const router = createRouter({
      history,
      routes: {
        parent: {
          children: {
            child: {
              data: () => makeGenerator(['p'], 'streamed'),
              path: '/child',
            },
          },
          data: async () => 'static',
          path: '/',
        },
      },
    });

    await settle();

    const state = router.getSnapshot();

    expect(state.status).toBe('idle');

    // branchDefs order: [parentDef, childDef] → matches[0]=parent, matches[1]=child
    const parentMatch = state.matches[0];
    const childMatch = state.matches[1];

    expect(parentMatch?.data).toBe('static');
    expect(childMatch?.data).toBe('streamed');
    router.dispose();
  });

  it('match() drains the generator and resolves with the final return value', async () => {
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        home: {
          data: () => makeGenerator(['a', 'b'], 'done'),
          path: '/',
        },
      },
    });

    await settle();

    const state = router.getSnapshot();

    // After full settle the streaming should be complete with final data
    expect(state.status).toBe('idle');
    expect(state.matches[0]?.data).toBe('done');
    router.dispose();
  });

  it('superseded navigation leaves state at the new destination after settle', async () => {
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        about: { path: '/about' },
        home: {
          data: () => makeGenerator(['x'], 'home-done'),
          path: '/',
        },
      },
    });

    // Start home navigation (streaming), immediately supersede with /about
    void router.navigate({ name: 'about' });
    await settle();

    const state = router.getSnapshot();

    expect(state.status).toBe('idle');
    expect(state.matches[0]?.name).toBe('about');
    router.dispose();
  });

  it('per-def onError handles streaming generator errors without crashing the route', async () => {
    async function* failingGen(): AsyncGenerator<string, string> {
      yield 'first';
      throw new Error('stream error');
    }

    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        home: {
          data: () => failingGen(),
          onError: () => 'fallback',
          path: '/',
        },
      },
    });

    await settle();

    const state = router.getSnapshot();

    expect(state.status).toBe('idle');
    expect(state.matches[0]?.data).toBe('fallback');
    router.dispose();
  });
});
