import { deriveSource } from '../derive';
import { createLocalSource } from '../localSource';

describe('deriveSource', () => {
  it('applies transform to parent current immediately', () => {
    const parent = createLocalSource([1, 2, 3, 4, 5]);
    const even = deriveSource(parent, (items) => items.filter((n) => n % 2 === 0));

    expect(even.current).toEqual([2, 4]);
  });

  it('mirrors parent meta unchanged', () => {
    const parent = createLocalSource([1, 2, 3], { limit: 2 });
    const derived = deriveSource(parent, (items) => items.map(String));

    expect(derived.meta).toStrictEqual(parent.meta);
  });

  it('reacts to parent changes', async () => {
    const parent = createLocalSource(['apple', 'banana', 'cherry'], { limit: 10 });
    const upper = deriveSource(parent, (items) => items.map((s) => s.toUpperCase()));

    const listener = vi.fn();

    upper.subscribe(listener);

    // setData triggers a recompute and notifies subscribers.
    await parent.setData(['apple', 'banana', 'cherry', 'date']);

    expect(listener).toHaveBeenCalled();
    expect(upper.current).toEqual(['APPLE', 'BANANA', 'CHERRY', 'DATE']);
  });

  it('notifies own subscribers when parent changes', async () => {
    const parent = createLocalSource([1, 2, 3], { limit: 2 });
    const doubled = deriveSource(parent, (items) => items.map((n) => n * 2));

    const seen: Array<readonly number[]> = [];

    doubled.subscribe(() => seen.push(doubled.current));

    await parent.goTo(2);

    expect(seen).toHaveLength(1);
    expect(seen[0]).toEqual([6]);
  });

  it('dispose stops listening to parent', async () => {
    const parent = createLocalSource([1, 2, 3]);
    const derived = deriveSource(parent, (items) => [...items].reverse());
    const listener = vi.fn();

    derived.subscribe(listener);
    derived.dispose();

    // setData triggers parent notification; derived is unsubscribed.
    await parent.setData([4, 5, 6]);

    expect(listener).not.toHaveBeenCalled();
  });

  it('dispose clears all own listeners', () => {
    const parent = createLocalSource([1, 2, 3]);
    const derived = deriveSource(parent, (items) => items);
    const listener = vi.fn();

    derived.subscribe(listener);
    derived.dispose();

    // After dispose, no listeners remain.
    expect(listener).not.toHaveBeenCalled();
  });

  it('subscribe returns working unsubscribe', () => {
    const parent = createLocalSource([1, 2, 3]);
    const derived = deriveSource(parent, (items) => items);
    const listener = vi.fn();

    const unsubscribe = derived.subscribe(listener);

    unsubscribe();

    // Listener should have been removed.
    expect(listener).not.toHaveBeenCalled();
  });

  it('throws when initial transform throws', () => {
    const parent = createLocalSource([1, 2, 3]);

    expect(() =>
      deriveSource(parent, () => {
        throw new Error('bad transform');
      }),
    ).toThrow('bad transform');
  });

  it('throws when transform throws on update', () => {
    let shouldThrow = false;
    const parent = createLocalSource([1, 2, 3]);
    const derived = deriveSource(parent, (items) => {
      if (shouldThrow) throw new Error('bad');

      return items.map((n) => n * 2);
    });

    expect(derived.current).toEqual([2, 4, 6]);

    shouldThrow = true;

    expect(() => parent.setData([4, 5, 6])).toThrow('bad');
    derived.dispose();
  });

  it('Symbol.dispose calls dispose()', () => {
    const parent = createLocalSource([1, 2, 3]);
    const derived = deriveSource(parent, (items) => items);
    const listener = vi.fn();

    derived.subscribe(listener);
    derived[Symbol.dispose]();

    expect(listener).not.toHaveBeenCalled();
  });

  it('meta proxy reflects live parent meta updates', async () => {
    const source = createLocalSource([1, 2, 3, 4, 5], { limit: 2 });
    const derived = deriveSource(source, (items) => items.map(String));

    expect(derived.meta.pageNumber).toBe(1);
    expect(derived.meta.totalItems).toBe(5);

    await source.goTo(2);

    // Meta should now reflect page 2 of the parent.
    expect(derived.meta.pageNumber).toBe(2);
    expect(derived.meta.totalItems).toBe(5);

    await source.setData([10, 20]);

    expect(derived.meta.totalItems).toBe(2);
    expect(derived.meta.pageNumber).toBe(1);
  });
});
