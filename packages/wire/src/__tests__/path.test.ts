import { describe, expect, it } from 'vitest';
import { bezierToSvgPath, polylineToSvgPath } from '../path.js';

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
