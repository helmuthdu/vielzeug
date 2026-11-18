import { describe, expect, it } from 'vitest';
import {
  containsPoint,
  containsRect,
  inflateRect,
  intersectRect,
  rectCenter,
  rectFromPoints,
  rectsIntersect,
  unionRect,
} from '../rect.js';

const rect = (x: number, y: number, width: number, height: number) => ({ height, width, x, y });

describe('rect', () => {
  it('computes bounds from points', () => {
    expect(
      rectFromPoints([
        { x: -1, y: 4 },
        { x: 3, y: -2 },
      ]),
    ).toEqual({ height: 6, width: 4, x: -1, y: -2 });
  });

  it('returns null bounds for empty input', () => {
    expect(rectFromPoints([])).toBeNull();
  });

  it('unions two rects', () => {
    expect(unionRect(rect(0, 0, 10, 10), rect(5, 5, 10, 10))).toEqual(rect(0, 0, 15, 15));
  });

  it('intersects overlapping rects', () => {
    expect(intersectRect(rect(0, 0, 10, 10), rect(5, 5, 10, 10))).toEqual(rect(5, 5, 5, 5));
  });

  it('treats touching edges as intersecting (closed intervals)', () => {
    expect(intersectRect(rect(0, 0, 10, 10), rect(10, 0, 10, 10))).toEqual(rect(10, 0, 0, 10));
    expect(rectsIntersect(rect(0, 0, 10, 10), rect(10, 0, 10, 10))).toBe(true);
  });

  it('intersects zero-area rects lying on another rect', () => {
    // A horizontal line along the bottom edge of a rect.
    expect(intersectRect(rect(0, 0, 10, 10), rect(2, 10, 5, 0))).toEqual(rect(2, 10, 5, 0));
    expect(rectsIntersect(rect(0, 0, 10, 10), rect(2, 10, 5, 0))).toBe(true);
  });

  it('returns null for disjoint rects', () => {
    expect(intersectRect(rect(0, 0, 10, 10), rect(11, 0, 10, 10))).toBeNull();
  });

  it('contains rects and points inclusively', () => {
    const outer = rect(0, 0, 10, 10);
    expect(containsRect(outer, rect(0, 0, 10, 10))).toBe(true);
    expect(containsRect(outer, rect(0, 0, 11, 10))).toBe(false);
    expect(containsPoint(outer, { x: 10, y: 10 })).toBe(true);
    expect(containsPoint(outer, { x: 10.5, y: 5 })).toBe(false);
  });

  it('inflates every edge', () => {
    expect(inflateRect(rect(10, 10, 10, 10), 5)).toEqual(rect(5, 5, 20, 20));
  });

  it('reports centers', () => {
    expect(rectCenter(rect(2, 4, 10, 20))).toEqual({ x: 7, y: 14 });
  });

  it('reports intersection through rectsIntersect', () => {
    expect(rectsIntersect(rect(0, 0, 10, 10), rect(9, 9, 5, 5))).toBe(true);
    expect(rectsIntersect(rect(0, 0, 10, 10), rect(20, 20, 5, 5))).toBe(false);
  });
});
