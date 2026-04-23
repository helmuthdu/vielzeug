import type { RouteContext } from '../types';

import { createRouter, defineRoutes } from '../router';
import { boot, disposeRouter, mockLocation, resetMocks } from './setup';

describe('Route table', () => {
  beforeEach(() => {
    resetMocks();
  });

  afterEach(() => {
    disposeRouter();
  });

  it('runs the matching handler from the declarative route table', async () => {
    const handler = vi.fn();

    mockLocation.pathname = '/about';
    await boot(
      createRouter({
        routes: defineRoutes({
          about: { handler, path: '/about' },
        }),
      }),
    );

    expect(handler).toHaveBeenCalled();
  });

  it('uses route keys as route names for url generation', () => {
    const router = createRouter({
      routes: defineRoutes({
        postDetail: { path: '/posts/:id' },
      }),
    });

    expect(router.url('postDetail', { id: '99' })).toBe('/posts/99');
  });

  it('passes route meta into the handler context', async () => {
    const handler = vi.fn();

    mockLocation.pathname = '/home';
    await boot(
      createRouter({
        routes: defineRoutes({
          home: { handler, meta: { title: 'Home' }, path: '/home' },
        }),
      }),
    );

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ meta: { title: 'Home' } }));
  });

  it('runs middleware-only routes without requiring a handler', async () => {
    const middleware = vi.fn(async (_ctx: RouteContext, next: () => Promise<void>) => next());

    mockLocation.pathname = '/hook';
    await boot(
      createRouter({
        routes: defineRoutes({
          hook: { middleware, path: '/hook' },
        }),
      }),
    );

    expect(middleware).toHaveBeenCalled();
  });

  it('preserves object key order for ambiguous matches', async () => {
    const paramHandler = vi.fn();
    const staticHandler = vi.fn();

    mockLocation.pathname = '/a/42';
    await boot(
      createRouter({
        routes: defineRoutes({
          paramFirst: { handler: paramHandler, path: '/a/:id' },
          staticSecond: { handler: staticHandler, path: '/a/42' },
        }),
      }),
    );

    expect(paramHandler).toHaveBeenCalled();
    expect(staticHandler).not.toHaveBeenCalled();
  });

  it('uses wildcard routes as not-found fallbacks', async () => {
    const fallback = vi.fn();

    mockLocation.pathname = '/missing';
    await boot(
      createRouter({
        routes: defineRoutes({
          home: { handler: vi.fn(), path: '/' },
          notFound: { handler: fallback, path: '*' },
        }),
      }),
    );

    expect(fallback).toHaveBeenCalled();
  });
});
