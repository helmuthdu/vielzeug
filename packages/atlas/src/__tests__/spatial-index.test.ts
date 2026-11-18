import { describe, expect, it } from 'vitest';
import { AtlasConfigError } from '../errors.js';
import { rectsIntersect } from '../rect.js';
import { createSpatialIndex } from '../spatial-index.js';

const rect = (x: number, y: number, width: number, height: number) => ({ height, width, x, y });

/** Deterministic LCG so seeded fixtures are reproducible. */
function random(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x1000_0000;
  };
}

describe('createSpatialIndex', () => {
  it('inserts and queries overlapping rects', () => {
    const index = createSpatialIndex();
    index.set('a', rect(0, 0, 10, 10));
    index.set('b', rect(100, 100, 10, 10));
    const hits = index.queryRect(rect(5, 5, 10, 10));
    expect(hits).toEqual(['a']);
    expect(index.get('a')).toEqual(rect(0, 0, 10, 10));
    expect(index.has('a')).toBe(true);
    expect(index.has('b')).toBe(true);
    expect(index.get('missing')).toBeUndefined();
  });

  it('set upserts: moving an id re-indexes it', () => {
    const index = createSpatialIndex();
    index.set('a', rect(0, 0, 10, 10));
    index.set('a', rect(100, 100, 10, 10));
    expect(index.size).toBe(1);
    expect(index.queryRect(rect(0, 0, 10, 10))).toHaveLength(0);
    expect(index.queryRect(rect(100, 100, 10, 10))).toEqual(['a']);
  });

  it('set with an unchanged rect is a no-op', () => {
    const index = createSpatialIndex();
    const r = rect(0, 0, 10, 10);
    index.set('a', r);
    index.set('a', { ...r });
    expect(index.size).toBe(1);
    expect(index.queryRect(r)).toEqual(['a']);
  });

  it('deletes entries', () => {
    const index = createSpatialIndex();
    index.set('a', rect(0, 0, 10, 10));
    expect(index.delete('a')).toBe(true);
    expect(index.delete('a')).toBe(false);
    expect(index.size).toBe(0);
    expect(index.queryRect(rect(-1000, -1000, 2000, 2000))).toHaveLength(0);
  });

  it('deletes zero-area entries from a split tree', () => {
    // Removal prunes the descent by containment, not intersection, so a
    // zero-area leaf never stays in the tree as a phantom query hit.
    const index = createSpatialIndex();
    for (let i = 0; i < 40; i++) index.set(`k${i}`, rect(i * 10, (i % 7) * 10, 8, 8));
    index.set('zero', rect(100, 0, 0, 5));
    expect(index.queryPoint({ x: 100, y: 2 })).toContain('zero');
    expect(index.delete('zero')).toBe(true);
    expect(index.queryPoint({ x: 100, y: 2 })).not.toContain('zero');
    expect(index.queryRect(rect(99, -1, 3, 7))).not.toContain('zero');
  });

  it('finds zero-area entries with queryRect', () => {
    const index = createSpatialIndex();
    for (let i = 0; i < 50; i++) index.set(`k${i}`, rect(i * 10, 100, 8, 8));
    // A horizontal line crossing the row of entries.
    index.set('line', rect(0, 103, 500, 0));
    const hits = index.queryRect(rect(20, 102, 10, 2));
    expect(hits).toContain('line');
  });

  it('re-inserts after removal and keeps working', () => {
    const index = createSpatialIndex();
    for (let i = 0; i < 50; i++) index.set(`k${i}`, rect(i * 10, 0, 5, 5));
    for (let i = 0; i < 50; i++) index.delete(`k${i}`);
    index.set('late', rect(0, 0, 5, 5));
    expect(index.queryRect(rect(0, 0, 5, 5))).toEqual(['late']);
  });

  it('queries points with tolerance', () => {
    const index = createSpatialIndex();
    index.set('a', rect(0, 0, 10, 10));
    expect(index.queryPoint({ x: 10.5, y: 5 })).toHaveLength(0);
    expect(index.queryPoint({ x: 10.5, y: 5 }, { tolerance: 1 })).toEqual(['a']);
    expect(() => index.queryPoint({ x: 0, y: 0 }, { tolerance: -1 })).toThrow(AtlasConfigError);
  });

  it('matches entries containing a zero-tolerance point', () => {
    const index = createSpatialIndex();
    for (let i = 0; i < 50; i++) index.set(`k${i}`, rect(i * 10, 0, 8, 8));
    expect(index.queryPoint({ x: 25, y: 4 })).toEqual(['k2']);
    expect(index.queryPoint({ x: 0, y: 0 })).toEqual(['k0']);
    // Boundary-inclusive, matching containsPoint semantics.
    expect(index.queryPoint({ x: 8, y: 4 })).toEqual(['k0']);
    expect(index.queryPoint({ x: 9, y: 4 })).toHaveLength(0);
  });

  it('finds zero-area entries with queryPoint', () => {
    const index = createSpatialIndex();
    for (let i = 0; i < 50; i++) index.set(`k${i}`, rect(i * 10, 100, 8, 8));
    index.set('line', rect(0, 104, 500, 0));
    expect(index.queryPoint({ x: 25, y: 104 })).toContain('line');
    index.set('dot', rect(200, 200, 0, 0));
    expect(index.queryPoint({ x: 200, y: 200 })).toContain('dot');
  });

  it('matches a brute-force scan under a seeded random workload', () => {
    const rand = random(42);
    const index = createSpatialIndex();
    const items = new Map<string, ReturnType<typeof rect>>();
    for (let i = 0; i < 500; i++) {
      const id = `id-${i}`;
      const r = rect(
        Math.floor(rand() * 1000),
        Math.floor(rand() * 1000),
        1 + Math.floor(rand() * 40),
        1 + Math.floor(rand() * 40),
      );
      items.set(id, r);
      index.set(id, r);
    }
    const scan = (area: ReturnType<typeof rect>): string[] =>
      [...items.entries()]
        .filter(([, r]) => rectsIntersect(area, r))
        .map(([id]) => id)
        .sort();
    for (let q = 0; q < 50; q++) {
      const area = rect(
        Math.floor(rand() * 1000),
        Math.floor(rand() * 1000),
        Math.floor(rand() * 200),
        Math.floor(rand() * 200),
      );
      expect(index.queryRect(area).sort()).toEqual(scan(area));
    }
    // Remove a third of the entries, then re-verify against the scan.
    const ids = [...items.keys()];
    for (let i = 0; i < ids.length; i += 3) {
      items.delete(ids[i] as string);
      index.delete(ids[i] as string);
    }
    for (let q = 0; q < 50; q++) {
      const area = rect(
        Math.floor(rand() * 1000),
        Math.floor(rand() * 1000),
        Math.floor(rand() * 200),
        Math.floor(rand() * 200),
      );
      expect(index.queryRect(area).sort()).toEqual(scan(area));
    }
    expect(index.size).toBe(items.size);
  });

  it('supports non-string ids', () => {
    const index = createSpatialIndex<number>();
    index.set(7, rect(0, 0, 5, 5));
    expect(index.queryRect(rect(0, 0, 1, 1))).toEqual([7]);
    expect(index.has(7)).toBe(true);
    expect(index.delete(7)).toBe(true);
  });

  it('exposes aggregate bounds', () => {
    const index = createSpatialIndex();
    expect(index.bounds).toBeNull();
    index.set('a', rect(2, 3, 10, 10));
    index.set('b', rect(-5, 0, 1, 1));
    expect(index.bounds).toEqual(rect(-5, 0, 17, 13));
  });

  it('clears everything', () => {
    const index = createSpatialIndex();
    index.set('a', rect(0, 0, 1, 1));
    index.clear();
    expect(index.size).toBe(0);
    expect(index.bounds).toBeNull();
  });

  it('validates configuration', () => {
    expect(() => createSpatialIndex({ maxEntriesPerNode: 3 })).toThrow(AtlasConfigError);
  });

  it('defensively copies stored rects', () => {
    const index = createSpatialIndex();
    const mutable = rect(0, 0, 10, 10);
    index.set('a', mutable);
    mutable.x = 999;
    expect(index.get('a')).toEqual(rect(0, 0, 10, 10));
  });
});
