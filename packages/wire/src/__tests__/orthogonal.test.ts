import { describe, expect, it } from 'vitest';
import { WireConfigError } from '../errors.js';
import { orthogonalRoute } from '../orthogonal.js';
import type { Point, Rect } from '../types.js';

const axisAligned = (points: readonly Point[]): boolean => {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1] as Point;
    const b = points[i] as Point;
    if (a.x !== b.x && a.y !== b.y) return false;
  }
  return true;
};

/** Indices of the segments that pass through the interior of `rect`. */
const interiorCrossings = (points: readonly Point[], rect: Rect): number[] => {
  const hits: number[] = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1] as Point;
    const b = points[i] as Point;
    const xLow = Math.min(a.x, b.x);
    const xHigh = Math.max(a.x, b.x);
    const yLow = Math.min(a.y, b.y);
    const yHigh = Math.max(a.y, b.y);
    if (yLow === yHigh && yLow > rect.y && yLow < rect.y + rect.height && xLow < rect.x + rect.width && rect.x < xHigh)
      hits.push(i);
    else if (
      xLow === xHigh &&
      xLow > rect.x &&
      xLow < rect.x + rect.width &&
      yLow < rect.y + rect.height &&
      rect.y < yHigh
    )
      hits.push(i);
  }
  return hits;
};

describe('orthogonalRoute', () => {
  it('routes a straight line when nothing blocks the way', () => {
    const route = orthogonalRoute({ side: 'right', x: 0, y: 0 }, { side: 'left', x: 100, y: 0 });
    expect(route).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ]);
  });

  it('returns a single point for coincident ports', () => {
    expect(orthogonalRoute({ side: 'right', x: 5, y: 5 }, { side: 'left', x: 5, y: 5 })).toEqual([{ x: 5, y: 5 }]);
  });

  it('routes around an obstacle without crossing it', () => {
    const obstacle = { height: 40, width: 40, x: 30, y: -20 };
    const route = orthogonalRoute(
      { side: 'right', x: 0, y: 0 },
      { side: 'left', x: 120, y: 0 },
      { obstacles: [obstacle] },
    );
    expect(route).not.toBeNull();
    const points = route as Point[];
    expect(points[0]).toEqual({ x: 0, y: 0 });
    expect(points[points.length - 1]).toEqual({ x: 120, y: 0 });
    expect(axisAligned(points)).toBe(true);
    expect(interiorCrossings(points, obstacle)).toEqual([]);
  });

  it('prefers fewer bends among equal-length routes', () => {
    // L-shaped target: one bend is possible and must win over zigzags.
    const route = orthogonalRoute({ side: 'right', x: 0, y: 0 }, { side: 'top', x: 50, y: 50 }) as Point[];
    expect(route).toHaveLength(3);
    expect(route[1]).toEqual({ x: 50, y: 0 });
  });

  it('exempts the obstacles that own a port for that port exit', () => {
    // Both ports sit on their own node's boundary, so each node owns one endpoint.
    const source = { height: 40, width: 100, x: 0, y: -20 };
    const target = { height: 40, width: 100, x: 300, y: -20 };
    const route = orthogonalRoute(
      { side: 'right', x: 100, y: 0 },
      { side: 'left', x: 300, y: 0 },
      { obstacles: [source, target] },
    );
    expect(route).toEqual([
      { x: 100, y: 0 },
      { x: 300, y: 0 },
    ]);
  });

  it('never re-enters its own node after the exit segment', () => {
    const source = { height: 40, width: 100, x: 0, y: -20 };
    const target = { height: 40, width: 100, x: 300, y: 80 };
    const route = orthogonalRoute(
      { side: 'right', x: 100, y: 0 },
      { side: 'left', x: 300, y: 80 },
      { obstacles: [source, target] },
    ) as Point[];
    expect(axisAligned(route)).toBe(true);
    // The searched route never enters any padded obstacle interior, so it never
    // touches the raw interior of either endpoint node either.
    expect(interiorCrossings(route, source)).toEqual([]);
    expect(interiorCrossings(route, target)).toEqual([]);
  });

  it('escapes an owning obstacle even when the stub is shorter than the padding', () => {
    const source = { height: 40, width: 100, x: 0, y: -20 };
    const route = orthogonalRoute(
      { side: 'right', x: 100, y: 0 },
      { side: 'left', x: 300, y: 80 },
      { obstacles: [source], stub: 0 },
    ) as Point[];
    // Without the forced escape the tip would land inside the padded obstacle and
    // the search would fail outright. With stubs off, the port still leaves
    // horizontally and the first waypoint clears the padded boundary (100 + 8).
    expect(route[0]).toEqual({ x: 100, y: 0 });
    expect((route[1] as Point).y).toBe(0);
    expect((route[1] as Point).x).toBeGreaterThanOrEqual(108);
  });

  it('returns null when an obstacle blocks a port exit', () => {
    // Wall right in front of the source port: the exit segment is unusable and the
    // port is walled in, so no route exists.
    const wall = { height: 200, width: 10, x: 8, y: -100 };
    expect(
      orthogonalRoute({ side: 'right', x: 0, y: 0 }, { side: 'left', x: 100, y: 0 }, { obstacles: [wall] }),
    ).toBeNull();
  });

  it('is deterministic across runs', () => {
    const obstacles = [
      { height: 30, width: 30, x: 20, y: -40 },
      { height: 30, width: 30, x: 20, y: 10 },
    ];
    const first = orthogonalRoute({ side: 'right', x: 0, y: 0 }, { side: 'left', x: 80, y: 0 }, { obstacles });
    const second = orthogonalRoute({ side: 'right', x: 0, y: 0 }, { side: 'left', x: 80, y: 0 }, { obstacles });
    expect(second).toEqual(first);
  });

  it('validates options', () => {
    expect(() => orthogonalRoute({ side: 'right', x: 0, y: 0 }, { side: 'left', x: 1, y: 1 }, { padding: -1 })).toThrow(
      WireConfigError,
    );
    expect(() =>
      orthogonalRoute({ side: 'right', x: 0, y: 0 }, { side: 'left', x: 1, y: 1 }, { bendPenalty: Number.NaN }),
    ).toThrow(WireConfigError);
    expect(() => orthogonalRoute({ side: 'right', x: 0, y: 0 }, { side: 'left', x: 1, y: 1 }, { stub: -1 })).toThrow(
      WireConfigError,
    );
  });

  it('stubs straight out of a sided source port before bending', () => {
    const route = orthogonalRoute({ side: 'right', x: 0, y: 0 }, { side: 'left', x: 50, y: 50 }) as Point[];
    expect(axisAligned(route)).toBe(true);
    expect(route[0]).toEqual({ x: 0, y: 0 });
    // First segment leaves the right-facing port horizontally, never vertically.
    expect((route[1] as Point).y).toBe(0);
    expect((route[1] as Point).x).toBeGreaterThan(0);
    // Final segment enters the left-facing port horizontally from the left.
    const last = route[route.length - 1] as Point;
    const before = route[route.length - 2] as Point;
    expect(last).toEqual({ x: 50, y: 50 });
    expect(before.y).toBe(50);
    expect(before.x).toBeLessThan(50);
  });

  it('keeps a straight route straight when ports face each other', () => {
    const route = orthogonalRoute({ side: 'right', x: 0, y: 0 }, { side: 'left', x: 100, y: 0 }) as Point[];
    expect(route).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ]);
  });

  it('honors a custom stub length', () => {
    const route = orthogonalRoute(
      { side: 'right', x: 0, y: 0 },
      { side: 'left', x: 200, y: 100 },
      { stub: 30 },
    ) as Point[];
    expect(axisAligned(route)).toBe(true);
    const first = route[1] as Point;
    expect(first.y).toBe(0);
    expect(first.x).toBeGreaterThanOrEqual(30);
  });

  it('treats stub 0 as no stubs', () => {
    const route = orthogonalRoute({ side: 'right', x: 0, y: 0 }, { side: 'top', x: 50, y: 50 }, { stub: 0 }) as Point[];
    expect(route).toHaveLength(3);
    expect(route[1]).toEqual({ x: 50, y: 0 });
  });
});
