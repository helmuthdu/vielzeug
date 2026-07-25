import { debugSource } from '../devtools';
import { createLocalSource } from '../localSource';
import { mergeSource } from '../merge';
import { createRemoteSource } from '../remoteSource';

describe('debugSource', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('logs nothing on attach — only observes changes from here on', () => {
    const source = createLocalSource([1, 2, 3]);

    debugSource(source);

    expect(consoleSpy).not.toHaveBeenCalled();

    source.dispose();
  });

  it('logs a distinct line per changed meta field', async () => {
    const source = createLocalSource([1, 2, 3, 4, 5], { limit: 2 });

    debugSource(source, { label: 'todos' });

    await source.goTo(2);

    expect(consoleSpy).toHaveBeenCalledWith('[sourcerer:devtools:todos] meta.pageNumber:', 1, '→', 2);

    source.dispose();
  });

  it('logs a distinct line when the item count changes', async () => {
    const source = createLocalSource([1, 2, 3, 4, 5], { limit: 10 });

    debugSource(source);
    await source.search('9', { immediate: true });

    expect(consoleSpy).toHaveBeenCalledWith('[sourcerer:devtools:source] current:', 5, '→', 0, 'items');

    source.dispose();
  });

  it('defaults the label to "source" when not provided', async () => {
    const source = createLocalSource([1, 2], { limit: 1 });

    debugSource(source);
    await source.goTo(2);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[sourcerer:devtools:source]'), 1, '→', 2);

    source.dispose();
  });

  it('stops logging once the returned unsubscribe is called', async () => {
    const source = createLocalSource([1, 2], { limit: 1 });

    const detach = debugSource(source);

    detach();
    await source.goTo(2);

    expect(consoleSpy).not.toHaveBeenCalled();

    source.dispose();
  });

  it('works with a differently-shaped meta (a remote source, not just local)', async () => {
    const fetch = vi.fn(async () => ({ items: ['a', 'b'], total: 20 }));
    const source = createRemoteSource({ autoFetch: false, fetch, limit: 5 });

    debugSource(source);
    await source.goTo(2);

    expect(consoleSpy).toHaveBeenCalledWith('[sourcerer:devtools:source] meta.pageNumber:', 1, '→', 2);

    source.dispose();
  });

  it('works with mergeSource() results — no meta field, but still logs current item-count changes', () => {
    const a = createLocalSource([1, 2]);
    const b = createLocalSource([3, 4]);
    const merged = mergeSource([a, b], (all) => all.flat());

    debugSource(merged, { label: 'merged' });
    a.setData([1]);

    expect(consoleSpy).toHaveBeenCalledWith('[sourcerer:devtools:merged] current:', 4, '→', 3, 'items');
    expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('meta.'), expect.anything());

    a.dispose();
    b.dispose();
    merged.dispose();
  });

  it('is silent in production builds (__SOURCERER_PROD__ set)', async () => {
    vi.stubGlobal('__SOURCERER_PROD__', true);
    vi.resetModules();

    const { debugSource: debugSourceProd } = await import('../devtools');
    const source = createLocalSource([1, 2], { limit: 1 });

    const detach = debugSourceProd(source);

    await source.goTo(2);

    expect(consoleSpy).not.toHaveBeenCalled();

    detach();
    source.dispose();
    vi.unstubAllGlobals();
    vi.resetModules();
  });
});
