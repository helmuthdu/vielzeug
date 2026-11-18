import { describe, expect, it } from 'vitest';
import { WireConfigError } from '../errors.js';
import { bezierToSvgPath, polylineToSvgPath } from '../path.js';

const corner = [
  { x: 0, y: 0 },
  { x: 20, y: 0 },
  { x: 20, y: 20 },
];

describe('polylineToSvgPath', () => {
  it('formats absolute moveto and lineto commands', () => {
    expect(
      polylineToSvgPath([
        { x: 0, y: 0 },
        { x: 10, y: 5 },
        { x: 10, y: 20 },
      ]),
    ).toBe('M 0 0 L 10 5 L 10 20');
  });

  it('returns an empty string for no points', () => {
    expect(polylineToSvgPath([])).toBe('');
  });

  it('rounds to micro precision and avoids -0', () => {
    expect(
      polylineToSvgPath([
        { x: 1.00000004, y: -0.0000001 },
        { x: 2.5e-8, y: 3 },
      ]),
    ).toBe('M 1 0 L 0 3');
  });

  it('keeps sharp corners by default and with cornerRadius 0', () => {
    expect(polylineToSvgPath(corner)).toBe('M 0 0 L 20 0 L 20 20');
    expect(polylineToSvgPath(corner, { cornerRadius: 0 })).toBe('M 0 0 L 20 0 L 20 20');
  });

  it('replaces a corner with an entry run and a quadratic arc', () => {
    expect(polylineToSvgPath(corner, { cornerRadius: 5 })).toBe('M 0 0 L 15 0 Q 20 0, 20 5 L 20 20');
  });

  it('clamps the radius to half the shortest adjacent run', () => {
    const tight = [
      { x: 0, y: 0 },
      { x: 6, y: 0 },
      { x: 6, y: 100 },
    ];
    // Requested 50 clamps to 6 / 2 = 3 on the short run.
    expect(polylineToSvgPath(tight, { cornerRadius: 50 })).toBe('M 0 0 L 3 0 Q 6 0, 6 3 L 6 100');
  });

  it('skips collinear points so runs stay continuous', () => {
    const straight = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 20 },
    ];
    expect(polylineToSvgPath(straight, { cornerRadius: 4 })).toBe('M 0 0 L 16 0 Q 20 0, 20 4 L 20 20');
  });

  it('rounds every corner of a multi-bend route', () => {
    const zigzag = [
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 20 },
      { x: 40, y: 20 },
    ];
    expect(polylineToSvgPath(zigzag, { cornerRadius: 5 })).toBe(
      'M 0 0 L 15 0 Q 20 0, 20 5 L 20 15 Q 20 20, 25 20 L 40 20',
    );
  });

  it('rejects negative and non-finite cornerRadius', () => {
    expect(() => polylineToSvgPath(corner, { cornerRadius: -1 })).toThrow(WireConfigError);
    expect(() => polylineToSvgPath(corner, { cornerRadius: Number.NaN })).toThrow(WireConfigError);
  });
});

describe('bezierToSvgPath', () => {
  it('formats absolute moveto and curveto commands', () => {
    expect(
      bezierToSvgPath({
        c1: { x: 50, y: 20 },
        c2: { x: 70, y: 20 },
        from: { x: 10, y: 20 },
        to: { x: 110, y: 20 },
      }),
    ).toBe('M 10 20 C 50 20, 70 20, 110 20');
  });

  it('rounds to micro precision and avoids -0', () => {
    expect(
      bezierToSvgPath({
        c1: { x: -0.0000001, y: 2.5e-8 },
        c2: { x: 1.00000004, y: 3 },
        from: { x: 0, y: 0 },
        to: { x: 4, y: 4 },
      }),
    ).toBe('M 0 0 C 0 0, 1 3, 4 4');
  });
});
