import type { RouteContext } from '../types';

import { createRouter } from '../router';
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
        routes: {
          about: { handler, path: '/about' },
        },
      }),
    );

    expect(handler).toHaveBeenCalled();
  });

  it('uses route keys as route names for url generation', () => {
    const router = createRouter({
      routes: {
        postDetail: { path: '/posts/:id' },
      },
    });

    expect(router.url('postDetail', { id: '99' })).toBe('/posts/99');
  });

  it('preserves route meta on match state', async () => {
    mockLocation.pathname = '/home';

    const router = await boot(
      createRouter({
        routes: {
          home: { handler: vi.fn(), meta: { title: 'Home' }, path: '/home' },
        },
      }),
    );

    expect(router.state.matches.at(-1)?.meta).toEqual({ title: 'Home' });
  });

  it('runs middleware-only routes without requiring a handler', async () => {
    const middleware = vi.fn(async (_ctx: RouteContext, next: () => Promise<void>) => next());

    mockLocation.pathname = '/hook';
    await boot(
      createRouter({
        routes: {
          hook: { middleware: [middleware], path: '/hook' },
        },
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
        routes: {
          paramFirst: { handler: paramHandler, path: '/a/:id' },
          staticSecond: { handler: staticHandler, path: '/a/42' },
        },
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
        routes: {
          home: { handler: vi.fn(), path: '/' },
          notFound: { handler: fallback, path: '*' },
        },
      }),
    );

    expect(fallback).toHaveBeenCalled();
  });
});
