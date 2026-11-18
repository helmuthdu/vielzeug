import { describe, expect, it } from 'vitest';

import { hslToSrgb, isDisplayable, oklchToSrgb, parseColor, srgbToHsl, srgbToOklch } from '../index';

function rgb(r: number, g: number, b: number, a = 1) {
  return { a, b, g, r };
}

describe('conversions', () => {
  const samples = [
    rgb(0, 0, 0),
    rgb(255, 255, 255),
    rgb(255, 0, 0),
    rgb(18, 52, 86),
    rgb(120, 240, 10),
    rgb(128, 128, 128),
  ];

  for (const color of samples) {
    it(`round-trips through HSL within ±1 per channel for rgb(${color.r} ${color.g} ${color.b})`, () => {
      const back = hslToSrgb(srgbToHsl(color));
      expect(Math.abs(back.r - color.r)).toBeLessThanOrEqual(1);
      expect(Math.abs(back.g - color.g)).toBeLessThanOrEqual(1);
      expect(Math.abs(back.b - color.b)).toBeLessThanOrEqual(1);
    });

    it(`round-trips through OKLCH within ±1 per channel for rgb(${color.r} ${color.g} ${color.b})`, () => {
      const back = oklchToSrgb(srgbToOklch(color));
      expect(Math.abs(back.r - color.r)).toBeLessThanOrEqual(1);
      expect(Math.abs(back.g - color.g)).toBeLessThanOrEqual(1);
      expect(Math.abs(back.b - color.b)).toBeLessThanOrEqual(1);
    });
  }

  it('keeps hue within half a degree through the HSL round-trip', () => {
    for (const deg of [0, 47, 123, 210, 301, 359]) {
      const hsl = { a: 1, h: deg, l: 45, s: 80 };
      const back = srgbToHsl(hslToSrgb(hsl));
      expect(Math.abs(back.h - deg)).toBeLessThanOrEqual(0.5);
    }
  });

  it('converts known anchors: red is oklch(62.8% 0.2577 29.23)', () => {
    const oklch = srgbToOklch(rgb(255, 0, 0));
    expect(oklch.l).toBeCloseTo(0.628, 2);
    expect(oklch.c).toBeCloseTo(0.2577, 3);
    expect(oklch.h).toBeCloseTo(29.23, 1);
  });

  it('maps oklch(100% 0 0) to white and oklch(0% 0 h) to black', () => {
    const white = oklchToSrgb({ a: 1, c: 0, h: 0, l: 1 });
    expect(white.r).toBeCloseTo(255, 5);
    expect(white.g).toBeCloseTo(255, 5);
    expect(white.b).toBeCloseTo(255, 5);
    expect(oklchToSrgb({ a: 1, c: 0, h: 120, l: 0 })).toEqual(rgb(0, 0, 0));
  });

  it('keeps out-of-gamut oklch channels unclamped (lossless extended sRGB)', () => {
    const color = oklchToSrgb({ a: 1, c: 0.5, h: 120, l: 0.5 });
    // At least one channel must fall outside the displayable range — nothing clips.
    const outside = [color.r, color.g, color.b].some((channel) => channel < 0 || channel > 255);
    expect(outside).toBe(true);
  });

  it('round-trips an out-of-gamut oklch through parseColor and srgbToOklch', () => {
    const parsed = parseColor('oklch(70% 0.4 30)');
    const oklch = srgbToOklch(parsed);
    expect(oklch.l).toBeCloseTo(0.7, 5);
    expect(oklch.c).toBeCloseTo(0.4, 4);
    expect(oklch.h).toBeCloseTo(30, 1);
  });

  it('keeps HSL lightness beyond 100% unclamped', () => {
    const color = hslToSrgb({ a: 1, h: 200, l: 120, s: 50 });
    expect(color.r).toBeGreaterThan(255);
    expect(color.g).toBeGreaterThan(255);
    expect(color.b).toBeGreaterThan(255);
  });
});

describe('isDisplayable', () => {
  it('accepts colors inside the sRGB gamut', () => {
    expect(isDisplayable(rgb(255, 0, 0))).toBe(true);
    expect(isDisplayable(rgb(0, 0, 0))).toBe(true);
    expect(isDisplayable(rgb(255, 255, 255))).toBe(true);
    expect(isDisplayable(parseColor('oklch(50% 0.1 264)'))).toBe(true);
  });

  it('rejects colors outside the sRGB gamut', () => {
    expect(isDisplayable(oklchToSrgb({ a: 1, c: 0.5, h: 120, l: 0.5 }))).toBe(false);
    expect(isDisplayable(parseColor('oklch(70% 0.4 30)'))).toBe(false);
  });

  it('accepts values exactly on the gamut boundary', () => {
    // Pure red sits exactly on the linear-channel boundary (1.0).
    expect(isDisplayable(rgb(255, 0, 0))).toBe(true);
  });
});
