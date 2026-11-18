import { InkConfigError, type StrokePoint, smoothStroke } from '../index.js';
import { maxTurnAngle, noisyLine } from './helpers.js';

describe('smoothStroke', () => {
  it('reduces sharp corners with catmull-rom resampling', () => {
    const input = noisyLine(20, 6);
    const smoothed = smoothStroke(input);
    expect(maxTurnAngle(smoothed)).toBeLessThan(maxTurnAngle(input));
  });

  it('preserves the first and last input points', () => {
    const input = noisyLine(10, 4);
    const smoothed = smoothStroke(input, { steps: 4 });
    expect(smoothed[0]).toEqual({ x: input[0].x, y: input[0].y });
    expect(smoothed[smoothed.length - 1]).toEqual({ x: input[input.length - 1].x, y: input[input.length - 1].y });
  });

  it('is deterministic for identical input', () => {
    const input = noisyLine(12, 3);
    expect(smoothStroke(input)).toEqual(smoothStroke(input));
  });

  it('interpolates linearly at tension 0', () => {
    // tension 0 must blend to plain linear interpolation, not collapse onto
    // the segment start (each emitted sample lies on the straight segment).
    const input = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 20 },
      { x: 30, y: 30 },
    ];
    const smoothed = smoothStroke(input, { steps: 4, tension: 0 });
    for (const point of smoothed) {
      expect(point.x).toBeCloseTo(point.y, 9);
    }
    const xs = smoothed.map((p) => p.x);
    expect(new Set(xs).size).toBe(xs.length); // strictly increasing, no duplicates
    expect(smoothed[0]).toEqual({ x: 0, y: 0 });
    expect(smoothed[smoothed.length - 1]).toEqual({ x: 30, y: 30 });
  });

  it('interpolates pressure along smoothed segments', () => {
    const input: StrokePoint[] = [
      { pressure: 0, x: 0, y: 0 },
      { pressure: 1, x: 10, y: 0 },
      { pressure: 1, x: 20, y: 0 },
      { pressure: 0, x: 30, y: 0 },
    ];
    const smoothed = smoothStroke(input, { steps: 2 });
    expect(smoothed.some((point) => point.pressure !== undefined && point.pressure > 0 && point.pressure < 1)).toBe(
      true,
    );
  });

  it('interpolates time along smoothed segments', () => {
    const input: StrokePoint[] = [
      { time: 0, x: 0, y: 0 },
      { time: 100, x: 10, y: 0 },
      { time: 200, x: 20, y: 0 },
    ];
    const smoothed = smoothStroke(input, { steps: 2 });
    for (const point of smoothed) expect(point.time).toBeDefined();
    // Midpoint of the first segment sits at t = 50.
    expect(smoothed[1]?.time).toBeCloseTo(50);
    expect(smoothed[smoothed.length - 1]?.time).toBe(200);
  });

  it('returns copies for strokes too short to smooth', () => {
    const input: StrokePoint[] = [
      { x: 0, y: 0 },
      { x: 5, y: 5 },
    ];
    expect(smoothStroke(input)).toEqual(input);
  });

  it('throws InkConfigError for a tension outside [0, 1]', () => {
    expect(() => smoothStroke(noisyLine(5, 1), { tension: 1.5 })).toThrow(InkConfigError);
  });

  it('throws InkConfigError for a non-integer steps value', () => {
    expect(() => smoothStroke(noisyLine(5, 1), { steps: 2.5 })).toThrow(InkConfigError);
  });
});
