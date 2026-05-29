import { s } from '../index';

describe('Schema.parseEach()', () => {
  it('yields ParseResult for each item in a sync iterable', () => {
    const schema = s.number().int();
    const results = [...schema.parseEach([1, 'two', 3, null])];

    expect(results).toHaveLength(4);
    expect(results[0].success).toBe(true);
    expect(results[1].success).toBe(false);
    expect(results[2].success).toBe(true);
    expect(results[3].success).toBe(false);
  });

  it('is lazy — does not eagerly validate all items', () => {
    const schema = s.number();
    let callCount = 0;

    const tracked = schema.preprocess((v) => {
      callCount++;

      return v;
    });

    const gen = tracked.parseEach([1, 2, 3]);

    expect(callCount).toBe(0);
    gen.next();
    expect(callCount).toBe(1);
    gen.next();
    expect(callCount).toBe(2);
  });

  it('works with a Set as input', () => {
    const schema = s.string();
    const results = [...schema.parseEach(new Set(['a', 1, 'b']))];

    expect(results[0].success).toBe(true);
    expect(results[1].success).toBe(false);
    expect(results[2].success).toBe(true);
  });

  it('returns data on success items', () => {
    const schema = s.string().trim().min(1);
    const results = [...schema.parseEach(['  hello  ', '', '  world'])];

    expect(results[0].success && results[0].data).toBe('hello');
    expect(results[1].success).toBe(false);
    expect(results[2].success && results[2].data).toBe('world');
  });
});

describe('Schema.parseEachAsync()', () => {
  it('yields ParseResult for each item asynchronously', async () => {
    const schema = s.string().check(async (s) => s.length > 0 || 'Empty');
    const results: unknown[] = [];

    for await (const result of schema.parseEachAsync(['hello', '', 'world'])) {
      results.push(result.success);
    }

    expect(results).toEqual([true, false, true]);
  });

  it('accepts an async iterable', async () => {
    async function* asyncItems() {
      yield 1;
      yield 'two';
      yield 3;
    }

    const schema = s.number();
    const results: boolean[] = [];

    for await (const result of schema.parseEachAsync(asyncItems())) {
      results.push(result.success);
    }

    expect(results).toEqual([true, false, true]);
  });
});
