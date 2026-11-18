import { InkConfigError, type Point, type StrokePoint, strokeOutline } from '../index.js';

/** True when two non-adjacent ring edges cross strictly inside both segments. */
function selfIntersects(ring: readonly Point[]): boolean {
  const n = ring.length;
  const eps = 1e-9;
  const crosses = (a: Point, b: Point, c: Point, d: Point): boolean => {
    const rx = b.x - a.x;
    const ry = b.y - a.y;
    const sx = d.x - c.x;
    const sy = d.y - c.y;
    const den = rx * sy - ry * sx;
    if (den === 0) return false;
    const t = ((c.x - a.x) * sy - (c.y - a.y) * sx) / den;
    const u = ((c.x - a.x) * ry - (c.y - a.y) * rx) / den;
    return t > eps && t < 1 - eps && u > eps && u < 1 - eps;
  };
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (j === i || (j + 1) % n === i || (i + 1) % n === j) continue;
      if (crosses(ring[i], ring[(i + 1) % n], ring[j], ring[(j + 1) % n])) return true;
    }
  }
  return false;
}

describe('strokeOutline', () => {
  const stroke: StrokePoint[] = [
    { x: 0, y: 0 },
    { x: 20, y: 0 },
    { x: 40, y: 0 },
  ];

  it('is deterministic for identical input', () => {
    expect(strokeOutline(stroke, [4, 4, 4])).toEqual(strokeOutline(stroke, [4, 4, 4]));
  });

  it('accepts a constant width', () => {
    expect(strokeOutline(stroke, 4)).toEqual(strokeOutline(stroke, [4, 4, 4]));
  });

  it('produces a closed ring: no repeated first/last vertex and positive enclosed area', () => {
    const ring = strokeOutline(stroke, 4);
    expect(ring[0]).not.toEqual(ring[ring.length - 1]);
    // Shoelace area: a proper ring encloses the stroke body.
    let area = 0;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i];
      const b = ring[(i + 1) % ring.length];
      area += a.x * b.y - b.x * a.y;
    }
    expect(Math.abs(area / 2)).toBeGreaterThan(0);
  });

  it('offsets the ring by half the supplied width on each side', () => {
    const ring = strokeOutline(stroke, 8);
    const ys = ring.map((point) => point.y);
    expect(Math.max(...ys)).toBeCloseTo(4);
    expect(Math.min(...ys)).toBeCloseTo(-4);
  });

  it('widens the ring where widths are larger', () => {
    const spread = (ring: { y: number }[]): number =>
      Math.max(...ring.map((p) => p.y)) - Math.min(...ring.map((p) => p.y));
    expect(spread(strokeOutline(stroke, 20))).toBeGreaterThan(spread(strokeOutline(stroke, 2)));
  });

  it('throws InkConfigError when widths array length mismatches', () => {
    expect(() => strokeOutline(stroke, [4, 4])).toThrow(InkConfigError);
  });

  it('throws InkConfigError for a non-positive width', () => {
    expect(() => strokeOutline(stroke, [4, 0, 4])).toThrow(InkConfigError);
    expect(() => strokeOutline(stroke, 0)).toThrow(InkConfigError);
  });

  describe('cap', () => {
    it('butt emits no cap points: ring starts and ends at offset points', () => {
      const butt = strokeOutline(stroke, 4, { cap: 'butt' });
      expect(butt[0]).toEqual({ x: 0, y: -2 });
      expect(butt[butt.length - 1]).toEqual({ x: 0, y: 2 });
      // Three samples, two sides, no cap arcs.
      expect(butt).toHaveLength(6);
    });

    it('square extends each end by half the width along the tangent', () => {
      const square = strokeOutline(stroke, 4, { cap: 'square' });
      // Two extra points per end on top of the six offset points.
      expect(square).toHaveLength(10);
      // Start end sits two units behind the first sample, end end two units ahead.
      expect(Math.min(...square.map((p) => p.x))).toBeCloseTo(-2);
      expect(Math.max(...square.map((p) => p.x))).toBeCloseTo(42);
      // The extended corners keep the full width offset.
      expect(square[0]).toEqual({ x: -2, y: 2 });
      expect(square[1]).toEqual({ x: -2, y: -2 });
    });

    it('round is the default and matches the explicit round cap', () => {
      expect(strokeOutline(stroke, 4, { join: 'round' })).toEqual(strokeOutline(stroke, 4, { cap: 'round' }));
    });
  });

  describe('join', () => {
    // A 140° deflection with a short second leg: the naive inner offset crosses the
    // outer edge (a spike) while the beveled ring stays simple.
    const sharp: StrokePoint[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100 + 60 * Math.cos((140 * Math.PI) / 180), y: 60 * Math.sin((140 * Math.PI) / 180) },
    ];

    it('round (default) keeps the naive offset samples', () => {
      expect(strokeOutline(sharp, 20, { cap: 'butt' })).toEqual(
        strokeOutline(sharp, 20, { cap: 'butt', join: 'round' }),
      );
    });

    it('bevel removes the crossing spike at a sharp turn', () => {
      const round = strokeOutline(sharp, 20, { cap: 'butt', join: 'round' });
      const bevel = strokeOutline(sharp, 20, { cap: 'butt', join: 'bevel' });
      expect(selfIntersects(round)).toBe(true);
      expect(selfIntersects(bevel)).toBe(false);
      // The beveled side gains one point (the naive sample is replaced by the two chord points).
      expect(bevel).toHaveLength(round.length + 1);
    });

    it('bevel is orientation-symmetric: mirrored strokes stay simple', () => {
      const mirrored = sharp.map((p) => ({ x: p.x, y: -p.y }));
      expect(selfIntersects(strokeOutline(mirrored, 20, { cap: 'butt', join: 'bevel' }))).toBe(false);
    });

    it('miter extends to the offset intersection within the limit', () => {
      // ~135° hairpin: miter length / half width ≈ 2.61, within the default limit of 4.
      const hairpin: StrokePoint[] = [
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 14.6, y: 25 },
      ];
      const miter = strokeOutline(hairpin, 20, { cap: 'butt', join: 'miter' });
      const bevel = strokeOutline(hairpin, 20, { cap: 'butt', join: 'bevel' });
      // Miter keeps a single joint vertex where bevel inserts two.
      expect(miter).toHaveLength(bevel.length - 1);
      // The outer joint reaches the offset-line intersection well past the naive sample.
      expect(Math.max(...miter.map((p) => p.x))).toBeGreaterThan(Math.max(...bevel.map((p) => p.x)));
      expect(selfIntersects(miter)).toBe(false);
    });

    it('miter falls back to bevel beyond miterLimit', () => {
      const hairpin: StrokePoint[] = [
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 14.6, y: 25 },
      ];
      const beyond = strokeOutline(hairpin, 20, { cap: 'butt', join: 'miter', miterLimit: 1.5 });
      const bevel = strokeOutline(hairpin, 20, { cap: 'butt', join: 'bevel' });
      expect(beyond).toEqual(bevel);
    });

    it('keeps naive samples on gentle turns', () => {
      const gentle: StrokePoint[] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 200, y: 10 },
      ];
      expect(strokeOutline(gentle, 20, { cap: 'butt', join: 'bevel' })).toEqual(
        strokeOutline(gentle, 20, { cap: 'butt', join: 'round' }),
      );
    });

    it('stays valid for single- and two-point strokes with every option', () => {
      for (const pts of [
        [{ x: 0, y: 0 }],
        [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
        ],
      ] as StrokePoint[]) {
        for (const cap of ['round', 'butt', 'square'] as const) {
          for (const join of ['round', 'bevel', 'miter'] as const) {
            const ring = strokeOutline(pts, 4, { cap, join });
            expect(ring.length).toBeGreaterThan(0);
            expect(ring.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
          }
        }
      }
    });

    it('is deterministic for identical input', () => {
      expect(strokeOutline(sharp, 20, { join: 'miter' })).toEqual(strokeOutline(sharp, 20, { join: 'miter' }));
    });
  });

  describe('option validation', () => {
    it('throws InkConfigError for an unknown cap or join', () => {
      expect(() => strokeOutline(stroke, 4, { cap: 'beveled' as 'butt' })).toThrow(InkConfigError);
      expect(() => strokeOutline(stroke, 4, { join: 'sharp' as 'bevel' })).toThrow(InkConfigError);
    });

    it('throws InkConfigError for a non-positive or non-finite miterLimit', () => {
      expect(() => strokeOutline(stroke, 4, { join: 'miter', miterLimit: 0 })).toThrow(InkConfigError);
      expect(() => strokeOutline(stroke, 4, { join: 'miter', miterLimit: -1 })).toThrow(InkConfigError);
      expect(() => strokeOutline(stroke, 4, { join: 'miter', miterLimit: Number.NaN })).toThrow(InkConfigError);
    });
  });
});
