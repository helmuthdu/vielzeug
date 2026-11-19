import { describe, expect, it } from 'vitest';
import { AtlasConfigError } from '../errors.js';
import {
  findPath,
  type GridTopology,
  hexKey,
  hexTopology,
  reachable,
  squareTopology,
  type TileCoord,
  tileKey,
} from '../grid/index.js';

const square = squareTopology();
const diagonal = squareTopology({ diagonal: true });
const open: GridTopology<TileCoord>['distance'] extends never ? never : (c: TileCoord) => boolean = () => true;

const at = (col: number, row: number): TileCoord => ({ col, row });

describe('square topology', () => {
  it('is 4-way by default with Manhattan distance', () => {
    expect(square.neighbors(at(0, 0))).toHaveLength(4);
    expect(square.distance(at(0, 0), at(3, 2))).toBe(5);
    expect(square.key(at(3, -1))).toBe('3:-1');
  });

  it('is 8-way with Chebyshev distance when diagonal', () => {
    expect(diagonal.neighbors(at(0, 0))).toHaveLength(8);
    expect(diagonal.distance(at(0, 0), at(3, 2))).toBe(3);
  });

  it('walks a supercover line through touched corner tiles', () => {
    const line = square.line(at(0, 0), at(2, 2)).map(tileKey);
    // The exact diagonal touches the corners of (1,0) and (0,1) too.
    expect(line).toContain('1:0');
    expect(line).toContain('0:1');
    expect(line).toContain('2:2');
  });

  it('is symmetric under reversal', () => {
    const forward = square.line(at(-2, 0), at(3, 4)).map(tileKey);
    expect(square.line(at(3, 4), at(-2, 0)).map(tileKey)).toEqual([...forward].reverse());
  });

  it('includes the single tile for a degenerate same-tile line', () => {
    expect(square.line(at(3, 3), at(3, 3)).map(tileKey)).toEqual(['3:3']);
  });
});

describe('findPath', () => {
  it('walks around a wall on a square grid', () => {
    const wall = new Set(['1:0', '1:1', '1:2', '1:3']);
    const path = findPath(at(0, 0), at(2, 0), {
      passable: (c) => !wall.has(tileKey(c)),
      topology: square,
    });
    expect(path).not.toBeNull();
    expect(path?.[0]).toEqual(at(0, 0));
    expect(path?.at(-1)).toEqual(at(2, 0));
    // Around the wall's end at row -1: up, across, back down.
    expect(path).toHaveLength(5);
  });

  it('returns null when the goal is walled off', () => {
    // A finite world: passable bounds the search space as well as the walls.
    const ring = new Set(['1:2', '3:2', '2:1', '2:3']);
    const path = findPath(at(0, 0), at(2, 2), {
      passable: (c) => Math.abs(c.col) <= 6 && Math.abs(c.row) <= 6 && !ring.has(tileKey(c)),
      topology: square,
    });
    expect(path).toBeNull();
  });

  it('returns null when an endpoint is impassable', () => {
    expect(findPath(at(0, 0), at(1, 0), { passable: (c) => c.col !== 1, topology: square })).toBeNull();
    expect(findPath(at(0, 0), at(1, 0), { passable: (c) => c.col !== 0, topology: square })).toBeNull();
  });

  it('returns the start alone for a zero-length route', () => {
    expect(findPath(at(2, 2), at(2, 2), { passable: open, topology: square })).toEqual([at(2, 2)]);
  });

  it('stops when the route exceeds maxCost', () => {
    const options = { passable: open, topology: square };
    expect(findPath(at(0, 0), at(3, 0), { ...options, maxCost: 3 })).toHaveLength(4);
    expect(findPath(at(0, 0), at(3, 0), { ...options, maxCost: 2 })).toBeNull();
  });

  it('prefers the cheap route around difficult terrain', () => {
    // The swamp at (1,0) costs 5 to enter; the detour around it costs 4 total.
    const path = findPath(at(0, 0), at(2, 0), {
      cost: (c) => (c.col === 1 && c.row === 0 ? 5 : 1),
      passable: open,
      topology: square,
    });
    expect(path?.map(tileKey)).toEqual(['0:0', '0:-1', '1:-1', '2:-1', '2:0']);
  });

  it('works on hexes', () => {
    const wall = new Set(['1:0', '1:-1']);
    const path = findPath(
      { q: 0, r: 0 },
      { q: 2, r: -1 },
      {
        passable: (c) => !wall.has(hexKey(c)),
        topology: hexTopology,
      },
    );
    expect(path).not.toBeNull();
    expect(path?.[0]).toEqual({ q: 0, r: 0 });
    expect(path?.at(-1)).toEqual({ q: 2, r: -1 });
    for (let i = 1; i < (path?.length ?? 0); i += 1) {
      const a = path?.[i - 1];
      const b = path?.[i];
      expect(a && b && hexTopology.distance(a, b)).toBe(1);
    }
  });

  it('rejects a negative budget and non-positive costs', () => {
    expect(() => findPath(at(0, 0), at(1, 0), { maxCost: -1, passable: open, topology: square })).toThrow(
      AtlasConfigError,
    );
    expect(() => findPath(at(0, 0), at(1, 0), { cost: () => 0, passable: open, topology: square })).toThrow(
      AtlasConfigError,
    );
  });
});

describe('reachable', () => {
  it('floods exactly the budgeted area on an open square grid', () => {
    const seen = reachable(at(0, 0), 3, { passable: open, topology: square });
    // 1 + 2n(n+1) cells within Manhattan distance n.
    expect(seen.size).toBe(25);
    expect(seen.get('0:0')).toEqual({ cost: 0, prev: null });
    expect(seen.get('3:0')?.cost).toBe(3);
    expect(seen.get('4:0')).toBeUndefined();
  });

  it('rebuilds a route by walking prev back to the start', () => {
    const seen = reachable(at(0, 0), 4, { passable: open, topology: square });
    const route: TileCoord[] = [];
    let entry = seen.get('2:2');
    while (entry && entry.prev) {
      route.push(entry.prev);
      entry = seen.get(tileKey(entry.prev));
    }
    expect(route.at(-1)).toEqual(at(0, 0));
    expect(route).toHaveLength(4);
  });

  it('respects blockers and expensive terrain', () => {
    const wall = new Set(['1:0', '1:1', '1:2']);
    const seen = reachable(at(0, 0), 2, {
      passable: (c) => !wall.has(tileKey(c)),
      topology: square,
    });
    expect(seen.has('1:0')).toBe(false);
    expect(seen.has('0:2')).toBe(true);

    const costly = reachable(at(0, 0), 3, {
      cost: (c) => (c.col === 1 ? 3 : 1),
      passable: open,
      topology: square,
    });
    expect(costly.get('1:0')?.cost).toBe(3);
    expect(costly.get('2:0')).toBeUndefined();
  });

  it('reaches nothing but the start when the start is impassable', () => {
    const seen = reachable(at(0, 0), 5, { passable: (c) => c.col !== 0, topology: square });
    expect([...seen.keys()]).toEqual(['0:0']);
  });

  it('counts hex rings by 1 + 3n(n+1)', () => {
    const seen = reachable({ q: 0, r: 0 }, 2, { passable: () => true, topology: hexTopology });
    expect(seen.size).toBe(19);
  });

  it('rejects a non-finite budget', () => {
    expect(() => reachable(at(0, 0), Number.POSITIVE_INFINITY, { passable: open, topology: square })).toThrow(
      AtlasConfigError,
    );
  });
});
