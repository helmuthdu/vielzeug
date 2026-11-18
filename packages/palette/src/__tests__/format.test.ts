import { describe, expect, it } from 'vitest';

import { toHex, toHslString, toOklchString, toRgbString } from '../index';

function rgb(r: number, g: number, b: number, a = 1) {
  return { a, b, g, r };
}

describe('formatting', () => {
  it('formats hex without alpha when opaque', () => {
    expect(toHex(rgb(222, 173, 190))).toBe('#deadbe');
  });

  it('writes hex alpha only when requested or translucent', () => {
    expect(toHex(rgb(222, 173, 190), { alpha: true })).toBe('#deadbeff');
    expect(toHex(rgb(222, 173, 190, 0.5))).toBe('#deadbe80');
  });

  it('clamps out-of-gamut channels when formatting', () => {
    expect(toHex(rgb(-20, 300, 128))).toBe('#00ff80');
    expect(toRgbString(rgb(-20, 300, 128))).toBe('rgb(0 255 128)');
  });

  it('formats rgb space syntax with slash alpha', () => {
    expect(toRgbString(rgb(1, 2, 3, 0.5))).toBe('rgb(1 2 3 / 0.5)');
  });

  it('formats hsl and oklch strings', () => {
    expect(toHslString(rgb(255, 0, 0))).toBe('hsl(0 100% 50%)');
    const oklch = toOklchString(rgb(255, 0, 0));
    expect(oklch).toBe('oklch(62.8% 0.2577 29.23)');
  });
});
