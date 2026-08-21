import { toFilterPredicate, toSearchMatcher } from '../adapters';
import { createIndex, type ScoutIndex } from '../scout-index';

type Product = { id: number; sku: string; title: string };

const products: Product[] = [
  { id: 1, sku: 'WGT-001', title: 'Widget Pro' },
  { id: 2, sku: 'GAD-002', title: 'Gadget Plus' },
  { id: 3, sku: 'WGT-003', title: 'Widget Lite' },
  { id: 4, sku: 'TOL-004', title: 'Tool Kit' },
];

const index = createIndex(products, { fields: ['title', 'sku'] });

describe('toSearchMatcher', () => {
  test('adapts indexed results to a local source matcher', () => {
    const match = toSearchMatcher(index);

    expect(products.filter((item) => match(item, 'widget'))).toContain(products[0]);
    expect(products.filter((item) => match(item, 'gadget'))).toContain(products[1]);
  });

  test('respects search constraints', () => {
    const match = toSearchMatcher(index, { threshold: 0.99 });

    expect(products.filter((item) => match(item, 'widgetzz'))).toEqual([]);
  });

  test('accepts a structural ScoutIndex without private metadata', () => {
    const item = { title: 'Alpha' };
    const index: ScoutIndex<typeof item> = {
      add() {},
      get items() {
        return [item];
      },
      onMutate() {
        return () => {};
      },
      reindex() {},
      remove() {},
      revision: 0,
      search(query) {
        return query === 'alpha' ? [{ item, matches: [], score: 1 }] : [];
      },
      setItems() {},
      get size() {
        return 1;
      },
    };

    expect(toSearchMatcher(index)(item, 'alpha')).toBe(true);
  });

  test('recomputes a cached query after index mutation', () => {
    const items = [{ title: 'Alpha' }];
    const dynamicIndex = createIndex(items, { fields: ['title'] });
    const match = toSearchMatcher(dynamicIndex);
    const added = { title: 'Alphabet' };

    expect(match(added, 'alpha')).toBe(false);

    dynamicIndex.add(added);

    expect(match(added, 'alpha')).toBe(true);

    dynamicIndex.remove(added);

    expect(match(added, 'alpha')).toBe(false);

    dynamicIndex.setItems([added]);

    expect(match(added, 'alpha')).toBe(true);
  });
});

describe('toFilterPredicate', () => {
  test('returns indexed matches', () => {
    expect(products.filter(toFilterPredicate(index, 'widget'))).toContain(products[0]);
  });
});
