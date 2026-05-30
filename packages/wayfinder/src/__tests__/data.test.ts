/**
 * data() loaders — passing results to handlers, context shape, loading state.
 */
import { createMemoryHistory, createRouter } from '../';
import { boot, disposeRouter, mockLocation, resetMocks } from './setup';
import { settle } from './test-utils';

describe('data() loader', () => {
  beforeEach(resetMocks);
  afterEach(disposeRouter);

  it('passes the resolved value to the handler as ctx.data', async () => {
    const handler = vi.fn();

    mockLocation.pathname = '/profile';
    await boot(
      createRouter({
        routes: {
          profile: {
            data: async () => ({ user: 'alice' }),
            handler,
            path: '/profile',
          },
        },
      }),
    );

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ data: { user: 'alice' } }));
  });

  it('receives params, query, and an AbortSignal', async () => {
    const dataFn = vi.fn(async () => null);

    mockLocation.pathname = '/users/42';
    mockLocation.search = '?tab=posts';
    await boot(
      createRouter({
        routes: {
          userDetail: {
            data: dataFn,
            handler: vi.fn(),
            path: '/users/:id',
          },
        },
      }),
    );

    expect(dataFn).toHaveBeenCalledWith(
      expect.objectContaining({
        params: { id: '42' },
        query: { tab: 'posts' },
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('stores the data result in the leaf node of router.getSnapshot().matches', async () => {
    mockLocation.pathname = '/items/7';

    const router = await boot(
      createRouter({
        routes: {
          item: {
            data: async ({ params }) => ({ id: params.id }),
            handler: vi.fn(),
            path: '/items/:id',
          },
        },
      }),
    );

    expect(router.getSnapshot().matches.at(-1)?.data).toEqual({ id: '7' });
  });

  it('emits loading state to subscribers while data is in-flight', async () => {
    const history = createMemoryHistory('/');
    let release: (() => void) | undefined;
    const dataStarted = new Promise<void>((resolve) => {
      release = resolve;
    });
    const router = createRouter({
      history,
      routes: {
        home: { path: '/' },
        page: {
          data: async () => {
            await dataStarted;

            return { ok: true };
          },
          path: '/page',
        },
      },
    });
    const statuses: string[] = [];

    await settle();
    router.subscribe((state) => statuses.push(state.status));

    const pendingNavigation = router.navigate({ path: '/page' });

    await new Promise<void>((r) => setTimeout(r, 0));
    expect(statuses).toContain('loading');

    release?.();
    await pendingNavigation;
    expect(statuses.at(-1)).toBe('idle');
    router.dispose();
  });
});
