import { describe, expect, it } from 'vitest';
import { obbBounds, obbCorners, obbFromRect, obbsIntersect, pointInOBB } from '../obb.js';

const rect = (x: number, y: number, width: number, height: number) => ({ height, width, x, y });

describe('obb', () => {
  it('reports corners of an unrotated box', () => {
    const corners = obbCorners(obbFromRect(rect(0, 0, 10, 4)));
    expect(corners.map((c) => [Math.round(c.x), Math.round(c.y)])).toEqual([
      [0, 0],
      [10, 0],
      [10, 4],
      [0, 4],
    ]);
  });

  it('rotates corners around the center', () => {
    const corners = obbCorners(obbFromRect(rect(0, 0, 10, 10), Math.PI / 2));
    // A square rotated 90° maps its corners onto each other's positions.
    const unrotated = obbCorners(obbFromRect(rect(0, 0, 10, 10)));
    for (const corner of corners) {
      expect(unrotated.some((u) => Math.abs(u.x - corner.x) < 1e-9 && Math.abs(u.y - corner.y) < 1e-9)).toBe(true);
    }
  });

  it('bounds a 45° box as its axis-aligned hull', () => {
    const bounds = obbBounds(obbFromRect(rect(0, 0, 10, 10), Math.PI / 4));
    expect(bounds.x).toBeCloseTo(5 - 5 * Math.SQRT2, 6);
    expect(bounds.width).toBeCloseTo(10 * Math.SQRT2, 6);
  });

  it('tests points in the rotated frame', () => {
    const obb = obbFromRect(rect(0, 0, 20, 4), Math.PI / 4);
    expect(pointInOBB(obb, { x: 10, y: 2 })).toBe(true);
    // Outside the thin axis but inside the unrotated hull.
    expect(pointInOBB(obb, { x: 18, y: 2 })).toBe(false);
  });

  it('intersects two boxes via separating axes', () => {
    const a = obbFromRect(rect(0, 0, 10, 10));
    expect(obbsIntersect(a, obbFromRect(rect(9, 0, 10, 10)))).toBe(true);
    expect(obbsIntersect(a, obbFromRect(rect(10, 0, 10, 10)))).toBe(false);
    // A long thin box crossing diagonally over the square.
    const bar = obbFromRect(rect(-20, 3.5, 60, 3), Math.PI / 4);
    expect(obbsIntersect(a, bar)).toBe(true);
  });
});
