import { toFilterPredicate, toSearchFn } from '../adapters';
import { createIndex } from '../scout-index';

type Product = { id: number; sku: string; title: string };

const PRODUCTS: Product[] = [
  { id: 1, sku: 'WGT-001', title: 'Widget Pro' },
  { id: 2, sku: 'GAD-002', title: 'Gadget Plus' },
  { id: 3, sku: 'WGT-003', title: 'Widget Lite' },
  { id: 4, sku: 'TOL-004', title: 'Tool Kit' },
];

const index = createIndex(PRODUCTS, { fields: ['title', 'sku'] });

describe('toSearchFn', () => {
  test('returns a function', () => {
    expect(typeof toSearchFn(index)).toBe('function');
  });

  test('empty query returns all items', () => {
    const fn = toSearchFn(index);
    const results = fn(PRODUCTS, '');

    expect(results).toHaveLength(4);
  });

  test('filters items matching the query', () => {
    const fn = toSearchFn(index);
    const results = fn(PRODUCTS, 'widget') as Product[];

    expect(results.length).toBeGreaterThan(0);
    expect(results.some((item) => item.title.toLowerCase().includes('widget'))).toBe(true);
  });

  test('returns plain items (not SearchResult wrappers)', () => {
    const fn = toSearchFn(index);
    const results = fn(PRODUCTS, 'gadget') as Product[];

    expect(results[0]).not.toHaveProperty('score');
    expect(results[0]).toHaveProperty('title');
  });

  test('ignores the passed items array — uses index as source', () => {
    const fn = toSearchFn(index);
    const results = fn([], 'widget') as Product[];

    expect(results.length).toBeGreaterThan(0);
  });

  test('respects options.limit', () => {
    const fn = toSearchFn(index, { limit: 1 });
    const results = fn(PRODUCTS, '');

    expect(results).toHaveLength(1);
  });

  // 'widget' is a *complete* prefix word of 'Widget Pro'/'Widget Lite' — every one of its
  // trigrams is found in the title, which now correctly scores as a perfect match (1.0) under
  // the overlap coefficient. Use a near-miss (extra trailing letter) to exercise a genuinely
  // partial match instead, so this test still verifies `threshold` actually excludes something.
  test('respects options.threshold', () => {
    const fn = toSearchFn(index, { threshold: 0.99 });
    const results = fn(PRODUCTS, 'widgetzz');

    expect(results).toHaveLength(0);
  });

  test('returns items in score order (best first)', () => {
    const fn = toSearchFn(index);
    const results = fn(PRODUCTS, 'widget') as Product[];

    expect(results[0].title).toMatch(/widget/i);
  });
});

describe('toFilterPredicate', () => {
  test('returns a function', () => {
    expect(typeof toFilterPredicate(index, 'widget')).toBe('function');
  });

  test('predicate returns true for matching item', () => {
    const pred = toFilterPredicate(index, 'widget');

    expect(pred(PRODUCTS[0])).toBe(true);
  });

  test('predicate returns false for non-matching item', () => {
    const pred = toFilterPredicate(index, 'widget');

    expect(pred(PRODUCTS[3])).toBe(false);
  });

  test('filters an array correctly', () => {
    const pred = toFilterPredicate(index, 'widget');
    const results = PRODUCTS.filter(pred);

    expect(results.length).toBeGreaterThan(0);
    expect(results.some((item) => item.title.toLowerCase().includes('widget'))).toBe(true);
  });

  test('empty query matches all items', () => {
    const pred = toFilterPredicate(index, '');
    const results = PRODUCTS.filter(pred);

    expect(results).toHaveLength(4);
  });

  // See the matching comment on `toSearchFn`'s "respects options.threshold" test above.
  test('respects threshold option', () => {
    const pred = toFilterPredicate(index, 'widgetzz', { threshold: 0.99 });
    const results = PRODUCTS.filter(pred);

    expect(results).toHaveLength(0);
  });

  test('respects limit option', () => {
    const pred = toFilterPredicate(index, '', { limit: 1 });
    const results = PRODUCTS.filter(pred);

    expect(results).toHaveLength(1);
  });
});
