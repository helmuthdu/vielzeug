import { InkConfigError, type StrokePoint, strokeOutline } from '../index.js';

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
});
