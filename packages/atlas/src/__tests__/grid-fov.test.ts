import { describe, expect, it } from 'vitest';
import { AtlasConfigError } from '../errors.js';
import { computeFov, createFog, tileKey } from '../grid/index.js';

const origin = { col: 0, row: 0 };

describe('computeFov', () => {
  it('always includes the origin', () => {
    expect(computeFov(origin, 0)).toEqual(new Set(['0:0']));
    expect(() => computeFov(origin, -1)).toThrow(AtlasConfigError);
  });

  it('opens a full 3x3 square at radius 1', () => {
    const fov = computeFov(origin, 1);
    expect(fov.size).toBe(9);
    for (let col = -1; col <= 1; col += 1) {
      for (let row = -1; row <= 1; row += 1) {
        expect(fov.has(tileKey({ col, row })), `${col},${row}`).toBe(true);
      }
    }
  });

  it('is symmetric in the open', () => {
    const fov = computeFov(origin, 5);
    for (const key of fov) {
      const [col, row] = key.split(':').map(Number) as [number, number];
      expect(fov.has(tileKey({ col: -col, row })), `mirror ${key}`).toBe(true);
      expect(fov.has(tileKey({ col: row, row: col })), `transpose ${key}`).toBe(true);
    }
  });

  it('keeps tiles behind a wall hidden but the wall itself visible', () => {
    const wall = { col: 1, row: 0 };
    const fov = computeFov(origin, 4, { blocks: (c) => c.col === wall.col && c.row === wall.row });
    expect(fov.has(tileKey(wall))).toBe(true);
    expect(fov.has(tileKey({ col: 2, row: 0 }))).toBe(false);
    expect(fov.has(tileKey({ col: 3, row: 0 }))).toBe(false);
    // Adjacent open tiles stay lit.
    expect(fov.has(tileKey({ col: 1, row: 1 }))).toBe(true);
    expect(fov.has(tileKey({ col: 1, row: -1 }))).toBe(true);
  });

  it('casts a shadow wedge behind a wall', () => {
    const blocks = (c: { col: number; row: number }) => c.col === 2 && Math.abs(c.row) <= 1;
    const fov = computeFov(origin, 6, { blocks });
    // The wall band itself is visible.
    expect(fov.has(tileKey({ col: 2, row: 0 }))).toBe(true);
    expect(fov.has(tileKey({ col: 2, row: 1 }))).toBe(true);
    // Directly behind the wall band: hidden.
    expect(fov.has(tileKey({ col: 4, row: 0 }))).toBe(false);
    expect(fov.has(tileKey({ col: 5, row: 1 }))).toBe(false);
    // Rays that clear the band's top edge stay lit.
    expect(fov.has(tileKey({ col: 4, row: 5 }))).toBe(true);
  });
});

describe('createFog', () => {
  it('tracks unseen → visible → seen transitions', () => {
    const fog = createFog();
    const a = tileKey({ col: 1, row: 2 });
    expect(fog.state(a)).toBe('unseen');
    fog.update([a]);
    expect(fog.state(a)).toBe('visible');
    fog.update([]);
    expect(fog.state(a)).toBe('seen');
    fog.update([a]);
    expect(fog.state(a)).toBe('visible');
  });

  it('applies a computeFov result directly', () => {
    const fog = createFog();
    fog.update(computeFov({ col: 1, row: 1 }, 0));
    expect(fog.state(tileKey({ col: 1, row: 1 }))).toBe('visible');
  });

  it('exposes visible keys as a readonly set with a size', () => {
    const fog = createFog();
    fog.update(['0:0', '1:0']);
    expect(fog.visible.size).toBe(2);
    expect(fog.visible.has('0:0')).toBe(true);
  });

  it('round-trips through export/import', () => {
    const fog = createFog();
    fog.update(['0:0', '1:0']);
    fog.update(['2:2']);
    const snapshot = fog.exportState();
    const restored = createFog();
    restored.importState(snapshot);
    expect(restored.state('1:0')).toBe('seen');
    expect(restored.state('2:2')).toBe('visible');
    expect(restored.state('9:9')).toBe('unseen');
    expect([...restored.visible]).toEqual(['2:2']);
  });
});
