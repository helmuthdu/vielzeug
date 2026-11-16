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

const crosses = (points: readonly Point[], rect: Rect): boolean => {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1] as Point;
    const b = points[i] as Point;
    const xLow = Math.min(a.x, b.x);
    const xHigh = Math.max(a.x, b.x);
    const yLow = Math.min(a.y, b.y);
    const yHigh = Math.max(a.y, b.y);
    if (yLow === yHigh && yLow > rect.y && yLow < rect.y + rect.height && xLow < rect.x + rect.width && rect.x < xHigh)
      return true;
    if (xLow === xHigh && xLow > rect.x && xLow < rect.x + rect.width && yLow < rect.y + rect.height && rect.y < yHigh)
      return true;
  }
  return false;
};

describe('orthogonalRoute', () => {
  it('routes a straight line when nothing blocks the way', () => {
    const route = orthogonalRoute({ x: 0, y: 0 }, { x: 100, y: 0 });
    expect(route).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ]);
  });

  it('returns a single point for coincident ports', () => {
    expect(orthogonalRoute({ x: 5, y: 5 }, { x: 5, y: 5 })).toEqual([{ x: 5, y: 5 }]);
  });

  it('routes around an obstacle without crossing it', () => {
    const obstacle = { height: 40, width: 40, x: 30, y: -20 };
    const route = orthogonalRoute({ x: 0, y: 0 }, { x: 80, y: 0 }, { obstacles: [obstacle] });
    expect(route).not.toBeNull();
    const points = route as Point[];
    expect(points[0]).toEqual({ x: 0, y: 0 });
    expect(points[points.length - 1]).toEqual({ x: 80, y: 0 });
    expect(axisAligned(points)).toBe(true);
    expect(crosses(points, obstacle)).toBe(false);
  });

  it('prefers fewer bends among equal-length routes', () => {
    // L-shaped target: one bend is possible and must win over zigzags.
    const route = orthogonalRoute({ x: 0, y: 0 }, { x: 50, y: 50 }) as Point[];
    expect(route).toHaveLength(3);
    expect(route[1]).toEqual({ x: 50, y: 0 });
  });

  it('returns null when the goal is enclosed', () => {
    const wall = { height: 100, width: 100, x: -50, y: -50 };
    // A ring of padded walls around the goal at (0,0) with padding 8 leaves no gap.
    const obstacles = [
      { height: 20, width: 120, x: -60, y: -30 },
      { height: 20, width: 120, x: -60, y: 10 },
      { height: 60, width: 20, x: -60, y: -10 },
      { height: 60, width: 20, x: 40, y: -10 },
    ];
    expect(orthogonalRoute({ x: -100, y: 0 }, { x: 0, y: 0 }, { obstacles })).toBeNull();
    expect(orthogonalRoute({ x: -100, y: 0 }, { x: 0, y: 0 }, { obstacles: [wall] })).toBeNull();
  });

  it('returns null when a start or goal sits inside an obstacle', () => {
    const obstacle = { height: 10, width: 10, x: -5, y: -5 };
    expect(orthogonalRoute({ x: 0, y: 0 }, { x: 100, y: 0 }, { obstacles: [obstacle] })).toBeNull();
  });

  it('is deterministic across runs', () => {
    const obstacles = [
      { height: 30, width: 30, x: 20, y: -40 },
      { height: 30, width: 30, x: 20, y: 10 },
    ];
    const first = orthogonalRoute({ x: 0, y: 0 }, { x: 80, y: 0 }, { obstacles });
    const second = orthogonalRoute({ x: 0, y: 0 }, { x: 80, y: 0 }, { obstacles });
    expect(second).toEqual(first);
  });

  it('validates options', () => {
    expect(() => orthogonalRoute({ x: 0, y: 0 }, { x: 1, y: 1 }, { padding: -1 })).toThrow(WireConfigError);
    expect(() => orthogonalRoute({ x: 0, y: 0 }, { x: 1, y: 1 }, { bendPenalty: Number.NaN })).toThrow(WireConfigError);
  });
});
