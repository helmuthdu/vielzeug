import { effect } from '@vielzeug/ripple';

import { createCursorSource } from '../cursorSource';
import { createInfiniteSource } from '../infiniteSource';
import { createLocalSource } from '../localSource';
import { createRemoteSource } from '../remoteSource';
import { toCursorSignals, toInfiniteSignals, toSignals } from '../signals';

describe('toSignals', () => {
  it('current signal reflects source current', () => {
    const source = createLocalSource(['a', 'b', 'c'], { limit: 10 });
    const { current, dispose } = toSignals(source);

    expect(current.value).toEqual(['a', 'b', 'c']);
    dispose();
  });

  it('meta signal reflects source meta', () => {
    const source = createLocalSource(['a', 'b', 'c'], { limit: 2 });
    const { dispose, meta } = toSignals(source);

    expect(meta.value.totalItems).toBe(3);
    expect(meta.value.pageCount).toBe(2);
    dispose();
  });

  it('signals update when source changes', async () => {
    const source = createLocalSource(['a', 'b', 'c'], { limit: 2 });
    const { current, dispose, meta } = toSignals(source);

    const currentValues: Array<readonly string[]> = [];
    const metaValues: number[] = [];

    const stop = effect(() => {
      currentValues.push(current.value);
      metaValues.push(meta.value.pageNumber);
    });

    await source.goTo(2);

    expect(currentValues.at(-1)).toEqual(['c']);
    expect(metaValues.at(-1)).toBe(2);

    stop.dispose();
    dispose();
  });

  it('dispose stops signal updates', async () => {
    const source = createLocalSource(['a', 'b', 'c', 'd'], { limit: 2 });
    const { current, dispose } = toSignals(source);

    const seen: Array<readonly string[]> = [];
    const stop = effect(() => {
      seen.push(current.value);
    });

    dispose(); // unsubscribe + release computed

    await source.goTo(2);

    // No additional update should have fired after dispose.
    expect(seen).toHaveLength(1);

    stop.dispose();
  });

  it('works with a remote source', async () => {
    const fetch = vi.fn(async () => ({ items: ['x', 'y'], total: 2 }));
    const source = createRemoteSource({ autoFetch: false, fetch });
    const { current, dispose, meta } = toSignals(source);

    expect(current.value).toEqual([]);

    await source.refresh();

    expect(current.value).toEqual(['x', 'y']);
    expect(meta.value.totalItems).toBe(2);
    dispose();
  });
});

describe('toCursorSignals', () => {
  it('current and meta signals reflect cursor source state', async () => {
    const fetch = vi.fn(async () => ({
      items: ['p1-a', 'p1-b'],
      nextCursor: 'c1',
      total: 4,
    }));
    const source = createCursorSource({ autoFetch: false, fetch });
    const { current, dispose, meta } = toCursorSignals(source);

    expect(current.value).toEqual([]);

    await source.refresh();

    expect(current.value).toEqual(['p1-a', 'p1-b']);
    expect(meta.value.hasNextPage).toBe(true);
    expect(meta.value.hasPrevPage).toBe(false);
    dispose();
  });

  it('signals update on navigation', async () => {
    const fetch = vi.fn(async ({ after }: { after?: string }) => {
      if (after === 'c1') return { items: ['p2-a'], nextCursor: undefined, prevCursor: 'c0', total: 3 };

      return { items: ['p1-a'], nextCursor: 'c1', total: 3 };
    });
    const source = createCursorSource({ autoFetch: false, fetch });
    const { current, dispose, meta } = toCursorSignals(source);

    await source.refresh();
    expect(current.value).toEqual(['p1-a']);

    await source.next();
    expect(current.value).toEqual(['p2-a']);
    expect(meta.value.hasPrevPage).toBe(true);
    expect(meta.value.hasNextPage).toBe(false);
    dispose();
  });
});

describe('toInfiniteSignals', () => {
  it('all and meta signals reflect infinite source state', async () => {
    const fetch = vi.fn(async () => ({ items: ['a', 'b'], total: 5 }));
    const source = createInfiniteSource({ autoFetch: false, fetch, limit: 2 });
    const { all, dispose, meta } = toInfiniteSignals(source);

    expect(all.value).toEqual([]);

    await source.reset();

    expect(all.value).toEqual(['a', 'b']);
    expect(meta.value.hasMore).toBe(true);
    expect(meta.value.totalItems).toBe(5);
    dispose();
  });

  it('all signal updates on loadMore', async () => {
    const pages = [['a', 'b'], ['c']];
    const fetch = vi.fn(async ({ page }: { page: number }) => ({
      items: pages[page - 1] ?? [],
      total: 3,
    }));
    const source = createInfiniteSource({ autoFetch: false, fetch, limit: 2 });
    const { all, dispose } = toInfiniteSignals(source);

    await source.reset();
    expect(all.value).toEqual(['a', 'b']);

    await source.loadMore();
    expect(all.value).toEqual(['a', 'b', 'c']);
    dispose();
  });
});
