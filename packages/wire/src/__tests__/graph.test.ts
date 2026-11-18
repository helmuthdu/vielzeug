import { describe, expect, it } from 'vitest';
import { WireGraphError } from '../errors.js';
import { findCyclicGroups, topologicalOrder } from '../graph.js';

describe('topologicalOrder', () => {
  it('orders a chain', () => {
    expect(
      topologicalOrder(
        ['c', 'a', 'b'],
        [
          { from: 'a', to: 'b' },
          { from: 'b', to: 'c' },
        ],
      ),
    ).toEqual(['a', 'b', 'c']);
  });

  it('breaks ties by input order', () => {
    expect(topologicalOrder(['z', 'y', 'x'], [])).toEqual(['z', 'y', 'x']);
    expect(
      topologicalOrder(
        ['root', 'b', 'a'],
        [
          { from: 'root', to: 'b' },
          { from: 'root', to: 'a' },
        ],
      ),
    ).toEqual(['root', 'b', 'a']);
  });

  it('tolerates parallel edges', () => {
    expect(
      topologicalOrder(
        ['a', 'b'],
        [
          { from: 'a', to: 'b' },
          { from: 'a', to: 'b' },
        ],
      ),
    ).toEqual(['a', 'b']);
  });

  it('throws on cycles and self-loops', () => {
    expect(() =>
      topologicalOrder(
        ['a', 'b'],
        [
          { from: 'a', to: 'b' },
          { from: 'b', to: 'a' },
        ],
      ),
    ).toThrow(WireGraphError);
    expect(() => topologicalOrder(['a'], [{ from: 'a', to: 'a' }])).toThrow(WireGraphError);
  });

  it('throws on unknown endpoints and duplicate nodes', () => {
    expect(() => topologicalOrder(['a'], [{ from: 'a', to: 'ghost' }])).toThrow(WireGraphError);
    expect(() => topologicalOrder(['ghost'], [{ from: 'ghost', to: 'a' }])).toThrow(WireGraphError);
    expect(() => topologicalOrder(['a', 'a'], [])).toThrow(WireGraphError);
  });

  it('handles thousands of nodes without recursion limits', () => {
    const ids: string[] = [];
    for (let i = 0; i < 50_000; i++) ids.push(`n${i}`);
    const edges = ids.slice(1).map((id, i) => ({ from: `n${i}`, to: id }));
    const order = topologicalOrder(ids, edges);
    expect(order).toHaveLength(50_000);
    expect(order[0]).toBe('n0');
    expect(order[49_999]).toBe('n49999');
  });

  it('keeps a wide graph in input order', () => {
    const ids: string[] = [];
    for (let i = 0; i < 50_000; i++) ids.push(`n${i}`);
    expect(topologicalOrder(ids, [])).toEqual(ids);
  });
});

describe('findCyclicGroups', () => {
  it('returns empty for acyclic graphs', () => {
    expect(
      findCyclicGroups(
        ['a', 'b', 'c'],
        [
          { from: 'a', to: 'b' },
          { from: 'b', to: 'c' },
        ],
      ),
    ).toEqual([]);
  });

  it('finds a two-node cycle ordered by input position', () => {
    expect(
      findCyclicGroups(
        ['x', 'a', 'b'],
        [
          { from: 'b', to: 'a' },
          { from: 'a', to: 'b' },
        ],
      ),
    ).toEqual([['a', 'b']]);
  });

  it('finds self-loops but not single edges', () => {
    expect(
      findCyclicGroups(
        ['a', 'b'],
        [
          { from: 'a', to: 'a' },
          { from: 'a', to: 'b' },
        ],
      ),
    ).toEqual([['a']]);
  });

  it('reports each disjoint cycle once, sorted deterministically', () => {
    const cycles = findCyclicGroups(
      ['d', 'c', 'b', 'a', 'x', 'y'],
      [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'a' },
        { from: 'c', to: 'd' },
        { from: 'd', to: 'c' },
        { from: 'x', to: 'y' },
        { from: 'y', to: 'x' },
      ],
    );
    // Members sorted by input position; cycles ordered by their first member: d(0) < b(2) < x(4).
    expect(cycles).toEqual([
      ['d', 'c'],
      ['b', 'a'],
      ['x', 'y'],
    ]);
  });

  it('throws on unknown endpoints', () => {
    expect(() => findCyclicGroups(['a'], [{ from: 'ghost', to: 'a' }])).toThrow(WireGraphError);
  });
});
