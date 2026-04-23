import { createRouter, defineRoutes } from '../router';
import { boot, disposeRouter, mockLocation, resetMocks } from './setup';

describe('Path matching', () => {
  beforeEach(() => {
    resetMocks();
  });

  afterEach(() => {
    disposeRouter();
  });

  it('matches the root path', async () => {
    const handler = vi.fn();

    mockLocation.pathname = '/';
    await boot(
      createRouter({
        routes: defineRoutes({
          home: { handler, path: '/' },
        }),
      }),
    );

    expect(handler).toHaveBeenCalled();
  });

  it('matches static paths exactly', async () => {
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

  it('matches named params', async () => {
    const handler = vi.fn();

    mockLocation.pathname = '/users/123';
    await boot(
      createRouter({
        routes: defineRoutes({
          userDetail: { handler, path: '/users/:id' },
        }),
      }),
    );

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ params: { id: '123' } }));
  });

  it('matches multiple named params in one pattern', async () => {
    const handler = vi.fn();

    mockLocation.pathname = '/users/123/posts/456';
    await boot(
      createRouter({
        routes: defineRoutes({
          postDetail: { handler, path: '/users/:userId/posts/:postId' },
        }),
      }),
    );

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ params: { postId: '456', userId: '123' } }));
  });

  it('decodes percent-encoded path params', async () => {
    const handler = vi.fn();

    mockLocation.pathname = '/search/hello%20world';
    await boot(
      createRouter({
        routes: defineRoutes({
          search: { handler, path: '/search/:query' },
        }),
      }),
    );

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ params: { query: 'hello world' } }));
  });

  it('matches bare wildcard routes', async () => {
    const handler = vi.fn();

    mockLocation.pathname = '/something';
    await boot(
      createRouter({
        routes: defineRoutes({
          catchAll: { handler, path: '*' },
        }),
      }),
    );

    expect(handler).toHaveBeenCalled();
  });

  it('matches static wildcard suffixes', async () => {
    const handler = vi.fn();

    mockLocation.pathname = '/docs/guide/intro';
    await boot(
      createRouter({
        routes: defineRoutes({
          docs: { handler, path: '/docs/*' },
        }),
      }),
    );

    expect(handler).toHaveBeenCalled();
  });

  it('captures named wildcard params across multiple segments', async () => {
    const handler = vi.fn();

    mockLocation.pathname = '/files/one/two/three';
    await boot(
      createRouter({
        routes: defineRoutes({
          files: { handler, path: '/files/:rest*' },
        }),
      }),
    );

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ params: { rest: 'one/two/three' } }));
  });

  it('captures empty strings for named wildcard params when no tail segments remain', async () => {
    const handler = vi.fn();

    mockLocation.pathname = '/files/';
    await boot(
      createRouter({
        routes: defineRoutes({
          files: { handler, path: '/files/:rest*' },
        }),
      }),
    );

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ params: { rest: '' } }));
  });

  it('does not run unrelated routes when nothing matches', async () => {
    const handler = vi.fn();

    mockLocation.pathname = '/nope';
    await boot(
      createRouter({
        routes: defineRoutes({
          other: { handler, path: '/other' },
        }),
      }),
    );

    expect(handler).not.toHaveBeenCalled();
  });
});
