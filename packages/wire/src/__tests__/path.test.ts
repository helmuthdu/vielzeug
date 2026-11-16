import { describe, expect, it } from 'vitest';
import { polylineToSvgPath } from '../path.js';

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
