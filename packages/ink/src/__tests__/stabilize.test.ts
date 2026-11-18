import { InkConfigError, type StrokePoint, stabilizeStroke } from '../index.js';
import { centerlineDeviation, noisyLine } from './helpers.js';

describe('stabilizeStroke', () => {
  it('reduces deviation from the ideal line', () => {
    const input = noisyLine(40, 6);
    const stabilized = stabilizeStroke(input);
    expect(centerlineDeviation(stabilized)).toBeLessThan(centerlineDeviation(input));
  });

  it('keeps input length', () => {
    const input = noisyLine(15, 5);
    expect(stabilizeStroke(input)).toHaveLength(input.length);
  });

  it('ends exactly at the last input point for every strength', () => {
    const input = noisyLine(12, 5);
    for (const strength of [0, 0.25, 0.5, 0.75, 1]) {
      const stabilized = stabilizeStroke(input, { strength });
      const last = stabilized[stabilized.length - 1];
      const expected = input[input.length - 1];
      expect(last?.x).toBe(expected.x);
      expect(last?.y).toBe(expected.y);
    }
  });

  it('is the identity at strength 0', () => {
    const input = noisyLine(8, 4);
    expect(stabilizeStroke(input, { strength: 0 })).toEqual(input);
  });

  it('carries pressure and time through the dead zone', () => {
    // Identical positions: every sample after the first lands in the dead zone.
    const input: StrokePoint[] = Array.from({ length: 5 }, (_, i) => ({
      pressure: i / 4,
      time: i * 16,
      x: 10,
      y: 10,
    }));
    const stabilized = stabilizeStroke(input, { strength: 0.8 });
    expect(stabilized.map((p) => p.pressure)).toEqual([0, 0.25, 0.5, 0.75, 1]);
    expect(stabilized.map((p) => p.time)).toEqual([0, 16, 32, 48, 64]);
  });

  it('is deterministic for identical input', () => {
    const input = noisyLine(12, 3);
    expect(stabilizeStroke(input)).toEqual(stabilizeStroke(input));
  });

  it('returns copies for strokes shorter than two points', () => {
    const input: StrokePoint[] = [{ x: 1, y: 2 }];
    expect(stabilizeStroke(input)).toEqual(input);
  });

  it('throws InkConfigError for a strength outside [0, 1]', () => {
    expect(() => stabilizeStroke(noisyLine(5, 1), { strength: 1.5 })).toThrow(InkConfigError);
  });
});
