import { describe, expect, it } from 'vitest';
import { arrowhead, hitBezier, hitPolyline, pointOnBezier, pointOnPolyline } from '../edit.js';
import { WireConfigError } from '../errors.js';
import type { CubicBezier, Point } from '../types.js';

describe('arrowhead', () => {
  it('places the apex at the tip and the base behind it with explicit size', () => {
    const head = arrowhead({ x: 10, y: 0 }, { x: 1, y: 0 }, { length: 4, width: 2 });
    expect(head).toEqual([
      { x: 10, y: 0 },
      { x: 6, y: 1 },
      { x: 6, y: -1 },
    ]);
  });

  it('uses default length 10 and width 6 when options are omitted', () => {
    const head = arrowhead({ x: 0, y: 0 }, { x: 0, y: 1 });
    expect(head).toEqual([
      { x: 0, y: 0 },
      { x: -3, y: -10 },
      { x: 3, y: -10 },
    ]);
  });

  it('normalizes non-unit directions', () => {
    expect(arrowhead({ x: 10, y: 0 }, { x: 3, y: 0 }, { length: 4, width: 2 })).toEqual(
      arrowhead({ x: 10, y: 0 }, { x: 1, y: 0 }, { length: 4, width: 2 }),
    );
  });

  it('rotates with an arbitrary direction', () => {
    const head = arrowhead({ x: 0, y: 0 }, { x: -1, y: 0 }, { length: 2, width: 2 });
    expect(head[0]).toEqual({ x: 0, y: 0 });
    expect(head[1]).toEqual({ x: 2, y: -1 });
    expect(head[2]).toEqual({ x: 2, y: 1 });
  });

  it('rejects a zero direction, non-finite points, and bad sizes', () => {
    expect(() => arrowhead({ x: 0, y: 0 }, { x: 0, y: 0 })).toThrow(WireConfigError);
    expect(() => arrowhead({ x: Number.NaN, y: 0 }, { x: 1, y: 0 })).toThrow(WireConfigError);
    expect(() => arrowhead({ x: 0, y: 0 }, { x: 1, y: 0 }, { length: 0 })).toThrow(WireConfigError);
    expect(() => arrowhead({ x: 0, y: 0 }, { x: 1, y: 0 }, { width: -2 })).toThrow(WireConfigError);
  });
});

describe('pointOnPolyline', () => {
  const lShape: Point[] = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 1 },
  ];

  it('returns the endpoints at t = 0 and t = 1', () => {
    expect(pointOnPolyline(lShape, 0)).toEqual({ x: 0, y: 0 });
    expect(pointOnPolyline(lShape, 1)).toEqual({ x: 10, y: 1 });
  });

  it('parameterizes by arc length, not segment index', () => {
    // Total length is 11, so t = 0.5 sits at length 5.5 on the first run.
    // Segment-index parameterization would return the corner (10, 0) instead.
    expect(pointOnPolyline(lShape, 0.5)).toEqual({ x: 5.5, y: 0 });
  });

  it('lands exactly on the corner when its length fraction matches', () => {
    expect(pointOnPolyline(lShape, 10 / 11)).toEqual({ x: 10, y: 0 });
  });

  it('returns the first point for a degenerate duplicate polyline', () => {
    expect(
      pointOnPolyline(
        [
          { x: 2, y: 3 },
          { x: 2, y: 3 },
        ],
        0.5,
      ),
    ).toEqual({ x: 2, y: 3 });
  });

  it('rejects short polylines, non-finite points, and t outside [0, 1]', () => {
    expect(() => pointOnPolyline([{ x: 0, y: 0 }], 0.5)).toThrow(WireConfigError);
    expect(() =>
      pointOnPolyline(
        [
          { x: 0, y: 0 },
          { x: Number.POSITIVE_INFINITY, y: 0 },
        ],
        0.5,
      ),
    ).toThrow(WireConfigError);
    expect(() => pointOnPolyline(lShape, 1.5)).toThrow(WireConfigError);
    expect(() => pointOnPolyline(lShape, Number.NaN)).toThrow(WireConfigError);
  });
});

describe('pointOnBezier', () => {
  // Straight run with handles bunched at the start: raw bezier parameter u is
  // heavily non-uniform, so only true arc-length mapping lands at x = 5.
  const lopsided: CubicBezier = {
    c1: { x: 0.1, y: 0 },
    c2: { x: 0.1, y: 0 },
    from: { x: 0, y: 0 },
    to: { x: 10, y: 0 },
  };

  it('returns the endpoints at t = 0 and t = 1', () => {
    expect(pointOnBezier(lopsided, 0)).toEqual({ x: 0, y: 0 });
    expect(pointOnBezier(lopsided, 1)).toEqual({ x: 10, y: 0 });
  });

  it('maps t by arc length on a lopsided parameterization', () => {
    // Raw u = 0.5 would land at x = 1.325; the length midpoint is x = 5.
    expect(pointOnBezier(lopsided, 0.5).x).toBeCloseTo(5, 2);
  });

  it('stays on the curve within the sampling tolerance', () => {
    const curve: CubicBezier = {
      c1: { x: 0, y: 60 },
      c2: { x: 100, y: 60 },
      from: { x: 0, y: 0 },
      to: { x: 100, y: 0 },
    };
    const mid = pointOnBezier(curve, 0.5);
    expect(mid.x).toBeCloseTo(50, 6);
    expect(mid.y).toBeGreaterThan(0);
  });

  it('returns the start for a degenerate zero-length curve', () => {
    const dot: CubicBezier = { c1: { x: 1, y: 1 }, c2: { x: 1, y: 1 }, from: { x: 1, y: 1 }, to: { x: 1, y: 1 } };
    expect(pointOnBezier(dot, 0.7)).toEqual({ x: 1, y: 1 });
  });

  it('rejects non-finite curve points and t outside [0, 1]', () => {
    expect(() => pointOnBezier({ ...lopsided, c1: { x: Number.NaN, y: 0 } }, 0.5)).toThrow(WireConfigError);
    expect(() => pointOnBezier(lopsided, -0.1)).toThrow(WireConfigError);
  });
});

describe('hitPolyline', () => {
  const lShape: Point[] = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
  ];

  it('hits a point on the wire with zero distance', () => {
    const hit = hitPolyline(lShape, { x: 5, y: 0 });
    expect(hit).not.toBeNull();
    expect(hit?.distance).toBeCloseTo(0, 9);
    expect(hit?.t).toBeCloseTo(0.25, 9);
  });

  it('reports the perpendicular distance and length-normalized t', () => {
    const hit = hitPolyline(lShape, { x: 5, y: 2 });
    expect(hit?.distance).toBeCloseTo(2, 9);
    expect(hit?.t).toBeCloseTo(0.25, 9);
  });

  it('hits at exactly the threshold and returns null past it', () => {
    expect(hitPolyline(lShape, { x: 5, y: 4 }, { threshold: 4 })).not.toBeNull();
    expect(hitPolyline(lShape, { x: 5, y: 4.5 }, { threshold: 4 })).toBeNull();
  });

  it('uses a default threshold of 4', () => {
    expect(hitPolyline(lShape, { x: 5, y: 4 })).not.toBeNull();
    expect(hitPolyline(lShape, { x: 5, y: 4.5 })).toBeNull();
  });

  it('picks the nearest segment on an L-shaped wire', () => {
    const hit = hitPolyline(lShape, { x: 9, y: 9 });
    expect(hit?.distance).toBeCloseTo(1, 9);
    expect(hit?.t).toBeCloseTo(19 / 20, 9);
  });

  it('rejects short polylines, non-finite input, and bad thresholds', () => {
    expect(() => hitPolyline([{ x: 0, y: 0 }], { x: 0, y: 0 })).toThrow(WireConfigError);
    expect(() => hitPolyline(lShape, { x: Number.NaN, y: 0 })).toThrow(WireConfigError);
    expect(() => hitPolyline(lShape, { x: 0, y: 0 }, { threshold: 0 })).toThrow(WireConfigError);
  });
});

describe('hitBezier', () => {
  const arc: CubicBezier = {
    c1: { x: 0, y: 100 },
    c2: { x: 100, y: 100 },
    from: { x: 0, y: 0 },
    to: { x: 100, y: 0 },
  };

  it('hits a point on the curve with near-zero distance', () => {
    // The symmetric arc's midpoint is ((0 + 3*0 + 3*100 + 100) / 8, 3*100*2 / 8) = (50, 75).
    const hit = hitBezier(arc, { x: 50, y: 75 });
    expect(hit).not.toBeNull();
    expect(hit?.distance).toBeLessThan(0.01);
    expect(hit?.t).toBeCloseTo(0.5, 1);
  });

  it('reports the true perpendicular distance near the apex', () => {
    // The arc apex is (50, 75), so the closest point to (50, 78) is 3 away.
    const hit = hitBezier(arc, { x: 50, y: 78 });
    expect(hit?.distance).toBeCloseTo(3, 1);
  });

  it('returns null past the threshold', () => {
    expect(hitBezier(arc, { x: 50, y: 90 }, { threshold: 4 })).toBeNull();
  });

  it('hits just inside the threshold and misses just outside', () => {
    // Straight bezier along y = 0 so the perpendicular distance is exact.
    const straight: CubicBezier = {
      c1: { x: 3.33, y: 0 },
      c2: { x: 6.67, y: 0 },
      from: { x: 0, y: 0 },
      to: { x: 10, y: 0 },
    };
    expect(hitBezier(straight, { x: 5, y: 3.999 }, { threshold: 4 })).not.toBeNull();
    expect(hitBezier(straight, { x: 5, y: 4.001 }, { threshold: 4 })).toBeNull();
  });

  it('never reports a distance below the true minimum near endpoints', () => {
    // Straight bezier along y = 0; the closest point to (-40, 3) is the t=0
    // endpoint, so the distance must be the exact endpoint distance.
    const straight: CubicBezier = {
      c1: { x: 33.3, y: 0 },
      c2: { x: 66.7, y: 0 },
      from: { x: 0, y: 0 },
      to: { x: 100, y: 0 },
    };
    const hit = hitBezier(straight, { x: -40, y: 3 }, { threshold: 100 });
    expect(hit).not.toBeNull();
    expect(hit?.t).toBeCloseTo(0, 6);
    expect(hit?.distance).toBeCloseTo(Math.hypot(40, 3), 5);
    // The old refinement extrapolated past t=0 and reported a distance below
    // the true minimum on the curve.
    expect(hit?.distance).toBeGreaterThanOrEqual(Math.hypot(40, 3));
  });

  it('handles a degenerate zero-length curve as a point hit', () => {
    const dot: CubicBezier = { c1: { x: 1, y: 1 }, c2: { x: 1, y: 1 }, from: { x: 1, y: 1 }, to: { x: 1, y: 1 } };
    expect(hitBezier(dot, { x: 3, y: 1 })).toEqual({ distance: 2, t: 0 });
    expect(hitBezier(dot, { x: 9, y: 1 })).toBeNull();
  });

  it('rejects non-finite input and bad thresholds', () => {
    expect(() => hitBezier(arc, { x: 0, y: Number.NaN })).toThrow(WireConfigError);
    expect(() => hitBezier(arc, { x: 0, y: 0 }, { threshold: -1 })).toThrow(WireConfigError);
  });
});
