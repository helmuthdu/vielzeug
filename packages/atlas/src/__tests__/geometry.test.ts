import { describe, expect, it } from 'vitest';
import { boundsOf, distanceToPolyline, pointInPolygon, pointNearPolygon } from '../geometry.js';

const square = [
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: 10 },
  { x: 0, y: 10 },
];

describe('geometry', () => {
  it('tests points inside and outside a polygon', () => {
    expect(pointInPolygon(square, { x: 5, y: 5 })).toBe(true);
    expect(pointInPolygon(square, { x: 15, y: 5 })).toBe(false);
  });

  it('handles concave polygons', () => {
    const arrow = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 5, y: 5 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    expect(pointInPolygon(arrow, { x: 7, y: 5 })).toBe(false);
    expect(pointInPolygon(arrow, { x: 2, y: 5 })).toBe(true);
  });

  it('measures distance to a polyline including segments', () => {
    expect(
      distanceToPolyline(
        [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
        ],
        { x: 5, y: 3 },
      ),
    ).toBeCloseTo(3, 9);
    expect(
      distanceToPolyline(
        [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
        ],
        { x: 14, y: 3 },
      ),
    ).toBeCloseTo(5, 9);
  });

  it('returns infinity distance for empty paths', () => {
    expect(distanceToPolyline([], { x: 1, y: 1 })).toBe(Infinity);
  });

  it('hits stroked polygons within tolerance', () => {
    expect(pointNearPolygon(square, { x: 10.5, y: 5 }, 1)).toBe(true);
    expect(pointNearPolygon(square, { x: 12, y: 5 }, 1)).toBe(false);
    expect(pointNearPolygon(square, { x: 5, y: 5 }, 0)).toBe(true);
  });

  it('computes bounds of point sets', () => {
    expect(
      boundsOf([
        { x: 1, y: 2 },
        { x: -1, y: 8 },
      ]),
    ).toEqual({ height: 6, width: 2, x: -1, y: 2 });
    expect(boundsOf([])).toBeNull();
  });
});
