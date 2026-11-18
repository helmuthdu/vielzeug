import { describe, expect, it } from 'vitest';
import { AtlasConfigError } from '../errors.js';
import { iterateTileRange, tileCenter, tileKey, tileToRect, visibleTileRange, worldToTile } from '../grid/index.js';

const grid = { tileSize: 32 };

describe('tile conversion', () => {
  it('floors world coordinates into tiles, including negatives', () => {
    expect(worldToTile({ x: 0, y: 0 }, grid)).toEqual({ col: 0, row: 0 });
    expect(worldToTile({ x: 31.9, y: 64 }, grid)).toEqual({ col: 0, row: 2 });
    expect(worldToTile({ x: -0.1, y: -32 }, grid)).toEqual({ col: -1, row: -1 });
  });

  it('round-trips tile rects and centers', () => {
    const coord = { col: -2, row: 3 };
    const rect = tileToRect(coord, grid);
    expect(worldToTile({ x: rect.x, y: rect.y }, grid)).toEqual(coord);
    expect(worldToTile(tileCenter(coord, grid), grid)).toEqual(coord);
    expect(tileCenter(coord, grid)).toEqual({ x: -48, y: 112 });
  });

  it('rejects non-positive tile sizes', () => {
    expect(() => worldToTile({ x: 0, y: 0 }, { tileSize: 0 })).toThrow(AtlasConfigError);
  });
});

describe('visible ranges and keys', () => {
  it('covers a world rect inclusively', () => {
    const range = visibleTileRange({ height: 80, width: 80, x: -8, y: 0 }, grid);
    expect(range).toEqual({ maxCol: 2, maxRow: 2, minCol: -1, minRow: 0 });
    const coords = [...iterateTileRange(range)];
    expect(coords).toHaveLength(12);
    expect(coords[0]).toEqual({ col: -1, row: 0 });
  });

  it('formats tile keys', () => {
    expect(tileKey({ col: 3, row: -1 })).toBe('3:-1');
  });
});
