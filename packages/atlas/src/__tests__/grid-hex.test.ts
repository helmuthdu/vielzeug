import { describe, expect, it } from 'vitest';
import { AtlasConfigError } from '../errors.js';
import {
  computeHexFov,
  type HexLayout,
  hexCorners,
  hexDistance,
  hexKey,
  hexLine,
  hexNeighbors,
  hexRange,
  hexToWorld,
  visibleHexes,
  worldToHex,
} from '../grid/index.js';

const pointy: HexLayout = { orientation: 'pointy', size: 32 };
const flat: HexLayout = { orientation: 'flat', size: 32 };

describe('hex conversion', () => {
  for (const layout of [pointy, flat]) {
    it(`round-trips world centers (${layout.orientation})`, () => {
      for (let q = -6; q <= 6; q += 1) {
        for (let r = -6; r <= 6; r += 1) {
          const hex = { q, r };
          expect(worldToHex(hexToWorld(hex, layout), layout)).toEqual(hex);
        }
      }
    });

    it(`maps neighbours to adjacent world points (${layout.orientation})`, () => {
      const center = hexToWorld({ q: 2, r: -3 }, layout);
      const centers = hexNeighbors({ q: 2, r: -3 }).map((n) => hexToWorld(n, layout));
      for (const other of centers) {
        const d = Math.hypot(other.x - center.x, other.y - center.y);
        expect(d).toBeCloseTo(layout.size * Math.sqrt(3), 6);
      }
    });
  }

  it('places pointy hexes in rows offset by half a width', () => {
    expect(hexToWorld({ q: 1, r: 0 }, pointy)).toEqual({ x: 32 * Math.sqrt(3), y: 0 });
    expect(hexToWorld({ q: 0, r: 1 }, pointy)).toEqual({ x: 16 * Math.sqrt(3), y: 48 });
  });

  it('draws six corners at the layout radius', () => {
    for (const layout of [pointy, flat]) {
      const corners = hexCorners({ q: 0, r: 0 }, layout);
      expect(corners).toHaveLength(6);
      for (const corner of corners) {
        expect(Math.hypot(corner.x, corner.y)).toBeCloseTo(layout.size, 6);
      }
    }
  });

  it('rejects bad layouts and fractional hexes', () => {
    expect(() => hexToWorld({ q: 0, r: 0 }, { orientation: 'pointy', size: 0 })).toThrow(AtlasConfigError);
    expect(() => hexToWorld({ q: 0.5, r: 0 }, pointy)).toThrow(AtlasConfigError);
  });
});

describe('hex distance, neighbours, and range', () => {
  it('measures steps through the derived cube axis', () => {
    expect(hexDistance({ q: 0, r: 0 }, { q: 3, r: -1 })).toBe(3);
    expect(hexDistance({ q: 0, r: 0 }, { q: -2, r: 5 })).toBe(5);
    expect(hexDistance({ q: 2, r: 2 }, { q: 2, r: 2 })).toBe(0);
  });

  it('lists six unique neighbours', () => {
    const seen = new Set(hexNeighbors({ q: 1, r: 1 }).map(hexKey));
    expect(seen.size).toBe(6);
    for (const key of seen) expect(hexDistance({ q: 1, r: 1 }, fromKey(key))).toBe(1);
  });

  it('ranges grow by 1 + 3n(n+1)', () => {
    for (const n of [0, 1, 2, 5]) {
      expect(hexRange({ q: -1, r: 2 }, n)).toHaveLength(1 + 3 * n * (n + 1));
    }
    expect(hexRange({ q: 0, r: 0 }, 0)).toEqual([{ q: 0, r: 0 }]);
  });

  it('rejects fractional radii', () => {
    expect(() => hexRange({ q: 0, r: 0 }, 1.5)).toThrow(AtlasConfigError);
  });
});

function fromKey(key: string): { q: number; r: number } {
  const [q, r] = key.split(':').map(Number);
  return { q: q as number, r: r as number };
}

describe('hex lines', () => {
  it('walks straight rows and diagonals exactly', () => {
    expect(hexLine({ q: 0, r: 0 }, { q: 3, r: 0 }).map(hexKey)).toEqual(['0:0', '1:0', '2:0', '3:0']);
    expect(hexLine({ q: 0, r: 0 }, { q: 0, r: 3 }).map(hexKey)).toEqual(['0:0', '0:1', '0:2', '0:3']);
    expect(hexLine({ q: 0, r: 0 }, { q: 2, r: -2 }).map(hexKey)).toEqual(['0:0', '1:-1', '2:-2']);
  });

  it('is symmetric under reversal', () => {
    const pairs: [HexCoordish, HexCoordish][] = [
      [
        { q: 0, r: 0 },
        { q: 4, r: -2 },
      ],
      [
        { q: -3, r: 1 },
        { q: 2, r: 4 },
      ],
      [
        { q: 0, r: 0 },
        { q: 3, r: 3 },
      ],
      [
        { q: 1, r: -4 },
        { q: -2, r: 5 },
      ],
    ];
    for (const [a, b] of pairs) {
      const forward = hexLine(a, b).map(hexKey);
      const backward = hexLine(b, a).map(hexKey).reverse();
      expect(forward).toEqual(backward);
      expect(forward[0]).toBe(hexKey(a));
      expect(forward.at(-1)).toBe(hexKey(b));
      expect(forward).toHaveLength(hexDistance(a, b) + 1);
    }
  });

  it('steps through adjacent hexes only', () => {
    for (const line of [hexLine({ q: 0, r: 0 }, { q: 5, r: -3 }), hexLine({ q: -2, r: -2 }, { q: 4, r: 1 })]) {
      for (let i = 1; i < line.length; i += 1) {
        const a = line[i - 1];
        const b = line[i];
        expect(a && b && hexDistance(a, b)).toBe(1);
      }
    }
  });

  it('returns the origin for a zero-length line', () => {
    expect(hexLine({ q: 2, r: 2 }, { q: 2, r: 2 })).toEqual([{ q: 2, r: 2 }]);
  });
});

type HexCoordish = { q: number; r: number };

describe('visible hexes', () => {
  it('covers a rect around the origin with slack', () => {
    const view = { height: 100, width: 100, x: -50, y: -50 };
    const keys = new Set(visibleHexes(view, pointy).map(hexKey));
    expect(keys.has('0:0')).toBe(true);
    // A hex whose center sits just outside the rect is still included.
    const outside = { q: 2, r: -1 };
    const center = hexToWorld(outside, pointy);
    expect(center.x).toBeGreaterThan(view.x + view.width);
    expect(keys.has(hexKey(outside))).toBe(true);
  });

  it('includes the hex containing each corner', () => {
    const view = { height: 200, width: 300, x: 40, y: -90 };
    const keys = new Set(visibleHexes(view, flat).map(hexKey));
    for (const corner of [
      { x: view.x, y: view.y },
      { x: view.x + view.width, y: view.y + view.height },
    ]) {
      expect(keys.has(hexKey(worldToHex(corner, flat)))).toBe(true);
    }
  });
});

describe('hex field of view', () => {
  it('is the full range when nothing blocks', () => {
    const lit = computeHexFov({ q: 0, r: 0 }, 3);
    expect(lit.size).toBe(hexRange({ q: 0, r: 0 }, 3).length);
  });

  it('shadows hexes behind a blocker but keeps the blocker', () => {
    const wall = { q: 2, r: 0 };
    const lit = computeHexFov({ q: 0, r: 0 }, 4, { blocks: (c) => hexKey(c) === hexKey(wall) });
    expect(lit.has(hexKey(wall))).toBe(true);
    // The hex directly behind the wall along the same row is shadowed.
    expect(lit.has(hexKey({ q: 3, r: 0 }))).toBe(false);
    expect(lit.has(hexKey({ q: 0, r: 4 }))).toBe(true);
  });

  it('always includes the origin and rejects bad radii', () => {
    expect(computeHexFov({ q: 5, r: -2 }, 0)).toEqual(new Set(['5:-2']));
    expect(() => computeHexFov({ q: 0, r: 0 }, -1)).toThrow(AtlasConfigError);
  });
});
