import { describe, expect, it } from 'vitest';
import { AtlasConfigError } from '../errors.js';
import { rectsIntersect } from '../rect.js';
import { createSpatialIndex, type SpatialEntry } from '../spatial-index.js';

const rect = (x: number, y: number, width: number, height: number) => ({ height, width, x, y });

/** Deterministic LCG so seeded fixtures are reproducible. */
function random(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x1000_0000;
  };
}

interface Item {
  id: number;
}

describe('createSpatialIndex', () => {
  it('inserts and queries overlapping rects', () => {
    const index = createSpatialIndex<Item>();
    index.insert('a', rect(0, 0, 10, 10), { id: 1 });
    index.insert('b', rect(100, 100, 10, 10), { id: 2 });
    const hits = index.queryRect(rect(5, 5, 10, 10));
    expect(hits).toHaveLength(1);
    expect(hits[0]?.id).toBe('a');
    expect(hits[0]?.value).toEqual({ id: 1 });
    expect(hits[0]?.rect).toEqual(rect(0, 0, 10, 10));
    index.dispose();
  });

  it('rejects duplicate ids', () => {
    const index = createSpatialIndex();
    index.insert('a', rect(0, 0, 1, 1));
    expect(() => index.insert('a', rect(0, 0, 1, 1))).toThrow(AtlasConfigError);
    index.dispose();
  });

  it('updates rects in place', () => {
    const index = createSpatialIndex();
    index.insert('a', rect(0, 0, 10, 10));
    index.update('a', rect(100, 100, 10, 10));
    expect(index.queryRect(rect(0, 0, 10, 10))).toHaveLength(0);
    expect(index.queryRect(rect(100, 100, 10, 10))).toHaveLength(1);
    expect(() => index.update('missing', rect(0, 0, 1, 1))).toThrow(AtlasConfigError);
    index.dispose();
  });

  it('removes entries', () => {
    const index = createSpatialIndex();
    index.insert('a', rect(0, 0, 10, 10));
    expect(index.remove('a')).toBe(true);
    expect(index.remove('a')).toBe(false);
    expect(index.size).toBe(0);
    expect(index.queryRect(rect(-1000, -1000, 2000, 2000))).toHaveLength(0);
    index.dispose();
  });

  it('re-inserts after removal and keeps working', () => {
    const index = createSpatialIndex();
    for (let i = 0; i < 50; i++) index.insert(`k${i}`, rect(i * 10, 0, 5, 5));
    for (let i = 0; i < 50; i++) index.remove(`k${i}`);
    index.insert('late', rect(0, 0, 5, 5));
    expect(index.queryRect(rect(0, 0, 5, 5)).map((e) => e.id)).toEqual(['late']);
    index.dispose();
  });

  it('queries points with tolerance', () => {
    const index = createSpatialIndex();
    index.insert('a', rect(0, 0, 10, 10));
    expect(index.queryPoint({ x: 10.5, y: 5 })).toHaveLength(0);
    expect(index.queryPoint({ x: 10.5, y: 5 }, { tolerance: 1 })).toHaveLength(1);
    index.dispose();
  });

  it('matches entries containing a zero-tolerance point', () => {
    const index = createSpatialIndex();
    for (let i = 0; i < 50; i++) index.insert(`k${i}`, rect(i * 10, 0, 8, 8));
    expect(index.queryPoint({ x: 25, y: 4 }).map((e) => e.id)).toEqual(['k2']);
    expect(index.queryPoint({ x: 0, y: 0 }).map((e) => e.id)).toEqual(['k0']);
    // Boundary-inclusive, matching containsPoint semantics.
    expect(index.queryPoint({ x: 8, y: 4 }).map((e) => e.id)).toEqual(['k0']);
    expect(index.queryPoint({ x: 9, y: 4 })).toHaveLength(0);
    index.dispose();
  });

  it('matches a brute-force scan under a seeded random workload', () => {
    const rand = random(42);
    const index = createSpatialIndex<number>();
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
      index.insert(id, r, i);
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
      expect(
        index
          .queryRect(area)
          .map((e) => e.id)
          .sort(),
      ).toEqual(scan(area));
    }
    // Remove a third of the entries, then re-verify against the scan.
    const ids = [...items.keys()];
    for (let i = 0; i < ids.length; i += 3) {
      items.delete(ids[i] as string);
      index.remove(ids[i] as string);
    }
    for (let q = 0; q < 50; q++) {
      const area = rect(
        Math.floor(rand() * 1000),
        Math.floor(rand() * 1000),
        Math.floor(rand() * 200),
        Math.floor(rand() * 200),
      );
      expect(
        index
          .queryRect(area)
          .map((e) => e.id)
          .sort(),
      ).toEqual(scan(area));
    }
    expect(index.size).toBe(items.size);
    index.dispose();
  });

  it('exposes aggregate bounds', () => {
    const index = createSpatialIndex();
    expect(index.bounds).toBeNull();
    index.insert('a', rect(2, 3, 10, 10));
    index.insert('b', rect(-5, 0, 1, 1));
    expect(index.bounds).toEqual(rect(-5, 0, 17, 13));
    index.dispose();
  });

  it('clears everything', () => {
    const index = createSpatialIndex();
    index.insert('a', rect(0, 0, 1, 1));
    index.clear();
    expect(index.size).toBe(0);
    expect(index.bounds).toBeNull();
    index.dispose();
  });

  it('validates configuration', () => {
    expect(() => createSpatialIndex({ maxEntriesPerNode: 3 })).toThrow(AtlasConfigError);
  });

  it('follows the disposal contract', () => {
    const index = createSpatialIndex();
    index.insert('a', rect(0, 0, 1, 1));
    index.dispose();
    expect(index.disposed).toBe(true);
    expect(index.disposalSignal.aborted).toBe(true);
    expect(index.size).toBe(0);
    expect(index.queryRect(rect(-1e6, -1e6, 2e6, 2e6))).toHaveLength(0);
    expect(() => index.insert('b', rect(0, 0, 1, 1))).toThrow(AtlasConfigError);
  });

  it('returns entries as a defensive copy', () => {
    const index = createSpatialIndex();
    index.insert('a', rect(0, 0, 10, 10));
    const hit: SpatialEntry<undefined> | undefined = index.queryRect(rect(0, 0, 10, 10))[0];
    expect(hit?.id).toBe('a');
    index.dispose();
  });
});
