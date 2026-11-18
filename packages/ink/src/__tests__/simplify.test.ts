import { InkConfigError, type StrokePoint, simplifyStroke } from '../index.js';
import { noisyLine } from './helpers.js';

describe('simplifyStroke', () => {
  it('preserves the first and last points', () => {
    const input = noisyLine(20, 5);
    const result = simplifyStroke(input, 1);
    expect(result[0]).toBe(input[0]);
    expect(result[result.length - 1]).toBe(input[input.length - 1]);
  });

  it('returns a subsequence of the input points', () => {
    const input = noisyLine(20, 5);
    const result = simplifyStroke(input, 2);
    expect(result.length).toBeLessThanOrEqual(input.length);
    let cursor = 0;
    for (const point of result) {
      const found = input.indexOf(point, cursor);
      expect(found).toBeGreaterThan(-1);
      cursor = found + 1;
    }
  });

  it('keeps time on surviving points', () => {
    const input: StrokePoint[] = noisyLine(10, 5).map((p, i) => ({ ...p, time: i * 16 }));
    const result = simplifyStroke(input, 2);
    for (const point of result) expect(point.time).toBeDefined();
  });

  it('collapses points within tolerance to a straight line', () => {
    const input: StrokePoint[] = [
      { x: 0, y: 0 },
      { x: 5, y: 0.1 },
      { x: 10, y: -0.1 },
      { x: 15, y: 0 },
    ];
    expect(simplifyStroke(input, 1)).toEqual([input[0], input[3]]);
  });

  it('keeps points that exceed tolerance', () => {
    const input: StrokePoint[] = [
      { x: 0, y: 0 },
      { x: 5, y: 50 },
      { x: 10, y: 0 },
    ];
    expect(simplifyStroke(input, 1)).toHaveLength(3);
  });

  it('is a no-op for strokes shorter than three points', () => {
    const input: StrokePoint[] = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ];
    expect(simplifyStroke(input, 5)).toEqual(input);
  });

  it('throws InkConfigError for a negative tolerance', () => {
    expect(() => simplifyStroke(noisyLine(5, 1), -1)).toThrow(InkConfigError);
  });

  it('throws InkConfigError for a non-finite tolerance', () => {
    expect(() => simplifyStroke(noisyLine(5, 1), Number.POSITIVE_INFINITY)).toThrow(InkConfigError);
  });
});
