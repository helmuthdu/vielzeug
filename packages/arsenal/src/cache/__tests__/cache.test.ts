import { cache } from '../cache';

describe('cache', () => {
  it('uses key identity without hashing collisions', () => {
    const first = { id: 1 };
    const second = { id: 1 };
    const values = cache<object, string>();

    values.set(first, 'first');
    values.set(second, 'second');

    expect(values.get(first)).toBe('first');
    expect(values.get(second)).toBe('second');
  });

  it('expires entries lazily with an injected clock', () => {
    let time = 0;
    const values = cache<string, number>({ now: () => time, ttlMs: 100 });

    values.set('count', 1);
    time = 100;

    expect(values.get('count')).toBeUndefined();
  });

  it('deduplicates concurrent loads', async () => {
    let resolve!: (value: string) => void;
    const values = cache<string, string>();
    const load = vi.fn(() => new Promise<string>((done) => (resolve = done)));

    const first = values.getOrLoad('user:1', load);
    const second = values.getOrLoad('user:1', load);

    expect(load).toHaveBeenCalledOnce();
    resolve('Alice');

    await expect(first).resolves.toBe('Alice');
    await expect(second).resolves.toBe('Alice');
    expect(values.get('user:1')).toBe('Alice');
  });

  it('does not restore a deleted in-flight load', async () => {
    let resolve!: (value: string) => void;
    const values = cache<string, string>();
    const result = values.getOrLoad('user:1', () => new Promise<string>((done) => (resolve = done)));

    values.delete('user:1');
    resolve('Alice');

    await expect(result).resolves.toBe('Alice');
    expect(values.get('user:1')).toBeUndefined();
  });

  it('evicts the oldest entry when capacity is exceeded', () => {
    const values = cache<string, string>({ capacity: 2 });

    values.set('first', 'a');
    values.set('second', 'b');
    values.set('third', 'c');

    expect(values.get('first')).toBeUndefined();
    expect(values.get('second')).toBe('b');
    expect(values.get('third')).toBe('c');
  });

  it('rejects invalid options', () => {
    expect(() => cache({ capacity: 0 })).toThrow(RangeError);

    const values = cache<string, string>();

    expect(() => values.set('key', 'value', { ttlMs: -1 })).toThrow(RangeError);
  });
});
