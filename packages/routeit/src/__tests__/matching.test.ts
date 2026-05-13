/**
 * Route matching — URL pattern semantics and route table compilation.
 * Tests run through the router to validate end-to-end matching behaviour.
 */
import { createMemoryHistory, createRouter } from '../router';
import { settle } from './test-utils';

describe('path patterns', () => {
  it('matches the root path', async () => {
    const handler = vi.fn();
    const router = createRouter({ history: createMemoryHistory('/'), routes: { home: { handler, path: '/' } } });

    await settle();

    expect(handler).toHaveBeenCalled();
    router.dispose();
  });

  it('matches static paths exactly', async () => {
    const handler = vi.fn();
    const router = createRouter({
      history: createMemoryHistory('/about'),
      routes: { about: { handler, path: '/about' } },
    });

    await settle();

    expect(handler).toHaveBeenCalled();
    router.dispose();
  });

  it('extracts a single named param', async () => {
    const handler = vi.fn();
    const router = createRouter({
      history: createMemoryHistory('/users/123'),
      routes: { user: { handler, path: '/users/:id' } },
    });

    await settle();

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ params: { id: '123' } }));
    router.dispose();
  });

  it('extracts multiple named params', async () => {
    const handler = vi.fn();
    const router = createRouter({
      history: createMemoryHistory('/users/123/posts/456'),
      routes: { post: { handler, path: '/users/:userId/posts/:postId' } },
    });

    await settle();

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ params: { postId: '456', userId: '123' } }));
    router.dispose();
  });

  it('decodes percent-encoded param values', async () => {
    const handler = vi.fn();
    const router = createRouter({
      history: createMemoryHistory('/search/hello%20world'),
      routes: { search: { handler, path: '/search/:query' } },
    });

    await settle();

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ params: { query: 'hello world' } }));
    router.dispose();
  });

  it('matches bare wildcard * (any path)', async () => {
    const handler = vi.fn();
    const router = createRouter({
      history: createMemoryHistory('/a/b/c'),
      routes: { catchAll: { handler, path: '*' } },
    });

    await settle();

    expect(handler).toHaveBeenCalled();
    router.dispose();
  });

  it('matches static wildcard suffix /docs/*', async () => {
    const handler = vi.fn();
    const router = createRouter({
      history: createMemoryHistory('/docs/guide/intro'),
      routes: { docs: { handler, path: '/docs/*' } },
    });

    await settle();

    expect(handler).toHaveBeenCalled();
    router.dispose();
  });

  it('captures a named wildcard across multiple segments', async () => {
    const handler = vi.fn();
    const router = createRouter({
      history: createMemoryHistory('/files/one/two/three'),
      routes: { files: { handler, path: '/files/:rest*' } },
    });

    await settle();

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ params: { rest: 'one/two/three' } }));
    router.dispose();
  });

  it('captures an empty string for named wildcard when no tail remains', async () => {
    const handler = vi.fn();
    const router = createRouter({
      history: createMemoryHistory('/files/'),
      routes: { files: { handler, path: '/files/:rest*' } },
    });

    await settle();

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ params: { rest: '' } }));
    router.dispose();
  });

  it('does not run a route when the URL does not match', async () => {
    const handler = vi.fn();
    const router = createRouter({
      history: createMemoryHistory('/nope'),
      routes: { other: { handler, path: '/other' } },
    });

    await settle();

    expect(handler).not.toHaveBeenCalled();
    router.dispose();
  });
});

describe('route table', () => {
  it('uses the route object key as the route name', () => {
    const router = createRouter({ routes: { postDetail: { path: '/posts/:id' } } });

    expect(router.url('postDetail', { id: '99' })).toBe('/posts/99');
    router.dispose();
  });

  it('object key order determines match precedence for ambiguous patterns', async () => {
    const first = vi.fn();
    const second = vi.fn();
    const router = createRouter({
      history: createMemoryHistory('/a/42'),
      routes: {
        byParam: { handler: first, path: '/a/:id' },
        byStatic: { handler: second, path: '/a/42' },
      },
    });

    await settle();

    expect(first).toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();
    router.dispose();
  });

  it('stores route meta on the matched branch node', async () => {
    const router = createRouter({
      history: createMemoryHistory('/page'),
      routes: { page: { meta: { title: 'Page' }, path: '/page' } },
    });

    await settle();

    expect(router.state.matches.at(-1)?.meta).toEqual({ title: 'Page' });
    router.dispose();
  });

  it('uses wildcard routes as not-found fallbacks', async () => {
    const fallback = vi.fn();
    const router = createRouter({
      history: createMemoryHistory('/missing'),
      routes: {
        fallback: { handler: fallback, path: '*' },
        home: { path: '/' },
      },
    });

    await settle();

    expect(fallback).toHaveBeenCalled();
    router.dispose();
  });

  it('throws when a route defines both index and path', () => {
    expect(() =>
      createRouter({
        routes: {
          broken: { index: true, path: '/broken' } as never,
        },
      }),
    ).toThrow('cannot define both index and path');
  });

  it('throws when a non-index route omits path', () => {
    expect(() =>
      createRouter({
        routes: {
          broken: { handler: vi.fn() } as never,
        },
      }),
    ).toThrow('must define path or set index: true');
  });

  it('throws when wildcard is not the final path segment', () => {
    expect(() =>
      createRouter({
        routes: {
          broken: { path: '/files/*/download' },
        },
      }),
    ).toThrow('Wildcard "*" must be the final segment');
  });

  it('throws when wildcard params are not the final path segment', () => {
    expect(() =>
      createRouter({
        routes: {
          broken: { path: '/files/:rest*/download' },
        },
      }),
    ).toThrow('Wildcard param must be final segment');
  });

  it('throws when a param name contains non-word characters', () => {
    expect(() =>
      createRouter({
        routes: {
          // `:user-id` has a hyphen which is not a \w character
          user: { path: '/users/:user-id' },
        },
      }),
    ).toThrow('Invalid param name ":user-id"');
  });

  it('throws when a greedy param name contains non-word characters', () => {
    expect(() =>
      createRouter({
        routes: {
          files: { path: '/files/:file-path*' },
        },
      }),
    ).toThrow('Invalid param name ":file-path"');
  });

  it('throws on duplicate route names from dot-notation collision', () => {
    expect(() =>
      createRouter({
        routes: {
          // top-level key 'a.b' collides with nested 'a' -> 'b'
          'a.b': { path: '/ab' },
          a: {
            children: {
              b: { path: '/a/b' },
            },
            path: '/a',
          },
        },
      }),
    ).toThrow('Duplicate route name: "a.b"');
  });
});
