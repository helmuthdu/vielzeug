import { createRouter } from '../router';
import { boot, disposeRouter, mockLocation, resetMocks } from './setup';

describe('Path matching', () => {
  beforeEach(() => {
    resetMocks();
  });

  afterEach(() => {
    disposeRouter();
  });

  it('matches root path /', async () => {
    const handler = vi.fn();

    mockLocation.pathname = '/';
    await boot(createRouter().on('/', handler));
    expect(handler).toHaveBeenCalled();
  });

  it('matches a static path exactly', async () => {
    const handler = vi.fn();

    mockLocation.pathname = '/about';
    await boot(createRouter().on('/about', handler));
    expect(handler).toHaveBeenCalled();
  });

  it('matches a single :param and injects it into ctx.params', async () => {
    const handler = vi.fn();

    mockLocation.pathname = '/users/123';
    await boot(createRouter().on('/users/:id', handler));
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ params: { id: '123' } }));
  });

  it('matches multiple :params in a single pattern', async () => {
    const handler = vi.fn();

    mockLocation.pathname = '/users/123/posts/456';
    await boot(createRouter().on('/users/:userId/posts/:postId', handler));
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ params: { postId: '456', userId: '123' } }));
  });

  it('URL-decodes percent-encoded path parameters', async () => {
    const handler = vi.fn();

    mockLocation.pathname = '/search/hello%20world';
    await boot(createRouter().on('/search/:query', handler));
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ params: { query: 'hello world' } }));
  });

  it('wildcard /docs/* matches any sub-path', async () => {
    const handler = vi.fn();

    mockLocation.pathname = '/docs/guide/intro';
    await boot(createRouter().on('/docs/*', handler));
    expect(handler).toHaveBeenCalled();
  });

  it('bare * matches any path globally', async () => {
    const handler = vi.fn();

    mockLocation.pathname = '/something';
    await boot(createRouter().on('*', handler));
    expect(handler).toHaveBeenCalled();
  });

  it('named wildcard :param* captures a multi-segment path as a named param', async () => {
    const handler = vi.fn();

    mockLocation.pathname = '/files/one/two/three';
    await boot(createRouter().on('/files/:rest*', handler));
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ params: { rest: 'one/two/three' } }));
  });

  it('named wildcard :param* captures a single segment', async () => {
    const handler = vi.fn();

    mockLocation.pathname = '/files/one';
    await boot(createRouter().on('/files/:rest*', handler));
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ params: { rest: 'one' } }));
  });

  it('named wildcard :param* with trailing slash matches (capturing empty string)', async () => {
    const handler = vi.fn();

    mockLocation.pathname = '/files/';
    await boot(createRouter().on('/files/:rest*', handler));
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ params: { rest: '' } }));
  });

  it('bare /static/* matches without exposing a named param', async () => {
    const handler = vi.fn();

    mockLocation.pathname = '/static/anything';
    await boot(createRouter().on('/static/*', handler));
    expect(handler).toHaveBeenCalled();
  });

  it('first registered route wins on ambiguous pattern match', async () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    const router = createRouter();

    router.on('/a/:id', handler1);
    router.on('/a/42', handler2);

    mockLocation.pathname = '/a/42';
    await boot(router);
    expect(handler1).toHaveBeenCalled();
    expect(handler2).not.toHaveBeenCalled();
  });

  it('no handler fires when no route matches', async () => {
    const handler = vi.fn();

    mockLocation.pathname = '/nope';
    await boot(createRouter().on('/other', handler));
    expect(handler).not.toHaveBeenCalled();
  });

  it('treats an empty pathname as root /', async () => {
    const handler = vi.fn();

    mockLocation.pathname = '';
    await boot(createRouter().on('/', handler));
    expect(handler).toHaveBeenCalled();
  });
});
