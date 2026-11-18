import { InkConfigError, type StrokePoint, smoothStroke, strokeWidths } from '../index.js';
import { noisyLine } from './helpers.js';

describe('strokeWidths', () => {
  const straight: StrokePoint[] = [
    { time: 0, x: 0, y: 0 },
    { time: 8, x: 4, y: 0 },
    { time: 16, x: 8, y: 0 },
  ];

  it('returns one width per point', () => {
    expect(strokeWidths(straight, { width: 6 })).toHaveLength(3);
  });

  it('widens slow segments and narrows fast segments', () => {
    const input: StrokePoint[] = [
      { time: 0, x: 0, y: 0 },
      { time: 10, x: 1, y: 0 }, // slow: 0.1 px/ms
      { time: 20, x: 40, y: 0 }, // fast: 3.9 px/ms
    ];
    const widths = strokeWidths(input, { width: 10 });
    expect(widths[1]).toBeGreaterThan(widths[2]);
  });

  it('is stable across catmull-rom resampling', () => {
    // The same timed stroke, smoothed first, must keep roughly the same widths:
    // speed comes from timestamps, not sample spacing.
    const input: StrokePoint[] = Array.from({ length: 12 }, (_, i) => ({
      time: i * 16,
      x: i * (i < 6 ? 1 : 8),
      y: 50,
    }));
    const direct = strokeWidths(input, { width: 8 });
    const smoothed = smoothStroke(input, { steps: 4 });
    const afterSmooth = strokeWidths(smoothed, { width: 8 });
    // Compare the interior of the direct stroke against the smoothed one: both
    // should read the slow start as wide and the fast tail as narrow.
    expect(direct[2]).toBeGreaterThan(direct[direct.length - 2]);
    expect(afterSmooth[2]).toBeGreaterThan(afterSmooth[afterSmooth.length - 2]);
    expect(afterSmooth[2]).toBeCloseTo(direct[2], 0);
  });

  it('ignores spacing when points carry no time', () => {
    const input: StrokePoint[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 40, y: 0 },
      { x: 41, y: 0 },
    ];
    const widths = strokeWidths(input, { width: 10 });
    expect(widths).toEqual([10, 10, 10, 10]);
  });

  it('disables velocity modulation when thinning is 0', () => {
    const input: StrokePoint[] = [
      { time: 0, x: 0, y: 0 },
      { time: 10, x: 1, y: 0 },
      { time: 20, x: 40, y: 0 },
    ];
    const widths = strokeWidths(input, { thinning: 0, width: 10 });
    expect(widths[1]).toBeCloseTo(10);
    expect(widths[2]).toBeCloseTo(10);
  });

  it('neutral pressure matches absent pressure', () => {
    const none: StrokePoint[] = [
      { time: 0, x: 0, y: 0 },
      { time: 8, x: 4, y: 0 },
    ];
    const neutral: StrokePoint[] = none.map((p) => ({ ...p, pressure: 0.5 }));
    expect(strokeWidths(neutral, { width: 8 })).toEqual(strokeWidths(none, { width: 8 }));
  });

  it('increases width with pressure and decreases it below neutral', () => {
    const light: StrokePoint[] = [
      { pressure: 0.2, time: 0, x: 0, y: 0 },
      { pressure: 0.2, time: 8, x: 4, y: 0 },
    ];
    const heavy: StrokePoint[] = [
      { pressure: 0.9, time: 0, x: 0, y: 0 },
      { pressure: 0.9, time: 8, x: 4, y: 0 },
    ];
    expect(strokeWidths(heavy, { width: 8 })[0]).toBeGreaterThan(strokeWidths(light, { width: 8 })[0]);
    // Pressure 0 halves the width; pressure 1 gives 1.25x.
    const zero = strokeWidths([{ pressure: 0, time: 0, x: 0, y: 0 }], { width: 8 })[0];
    const full = strokeWidths([{ pressure: 1, time: 0, x: 0, y: 0 }], { width: 8 })[0];
    expect(zero).toBeCloseTo(4);
    expect(full).toBeCloseTo(10);
  });

  it('clamps velocity scale to the fixed [0.25, 2] range', () => {
    const input: StrokePoint[] = [
      { time: 0, x: 0, y: 0 },
      { time: 1000, x: 0.001, y: 0 }, // extremely slow
      { time: 1001, x: 1000, y: 0 }, // extremely fast
    ];
    const widths = strokeWidths(input, { width: 10 });
    expect(widths[1]).toBeCloseTo(10 * 2);
    expect(widths[2]).toBeCloseTo(10 * 0.25);
  });

  it('is deterministic for identical input', () => {
    const a = noisyLine(10, 2).map((p, i) => ({ ...p, time: i * 16 }));
    expect(strokeWidths(a, { width: 5 })).toEqual(strokeWidths(a, { width: 5 }));
  });

  it('throws InkConfigError for a non-positive width', () => {
    expect(() => strokeWidths(straight, { width: 0 })).toThrow(InkConfigError);
  });

  it('throws InkConfigError for thinning outside [0, 1]', () => {
    expect(() => strokeWidths(straight, { thinning: 1.5, width: 4 })).toThrow(InkConfigError);
  });

  it('throws InkConfigError for an empty stroke', () => {
    expect(() => strokeWidths([], { width: 4 })).toThrow(InkConfigError);
  });
});
