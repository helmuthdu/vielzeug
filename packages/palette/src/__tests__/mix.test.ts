import { describe, expect, it } from 'vitest';

import { mix, PaletteConfigError, parseColor, ramp, srgbToOklch, toHex } from '../index';

function rgb(r: number, g: number, b: number, a = 1) {
  return { a, b, g, r };
}

describe('mix', () => {
  it('interpolates black and white at the OKLab midpoint', () => {
    const mid = mix(rgb(0, 0, 0), rgb(255, 255, 255), 0.5);
    // OKLab midpoint of black and white has lightness 0.5, unlike the lighter
    // linear-light midpoint (~#bbb) and the gamma midpoint (#808080).
    expect(srgbToOklch(mid).l).toBeCloseTo(0.5, 5);
    // The neutral round-trip carries tiny matrix asymmetry; channels agree to well under 1/255.
    expect(mid.r).toBeCloseTo(mid.g, 3);
    expect(mid.g).toBeCloseTo(mid.b, 3);
  });

  it('returns the endpoints at t=0 and t=1', () => {
    const a = rgb(10, 20, 30);
    const b = rgb(200, 100, 50);
    expect(toHex(mix(a, b, 0))).toBe(toHex(a));
    expect(toHex(mix(a, b, 1))).toBe(toHex(b));
  });

  it('premultiplies alpha like CSS color-mix', () => {
    // Mixing red with fully transparent black keeps red's hue and halves alpha,
    // instead of darkening toward black.
    const mid = mix(rgb(255, 0, 0), rgb(0, 0, 0, 0), 0.5);
    expect(mid.a).toBeCloseTo(0.5, 10);
    expect(toHex(mid)).toBe('#ff000080');
  });

  it('interpolates alpha linearly', () => {
    expect(mix(rgb(0, 0, 0, 0), rgb(255, 255, 255, 1), 0.25).a).toBeCloseTo(0.25, 10);
  });

  it('returns a fully transparent result when both endpoints are transparent', () => {
    const mid = mix(rgb(255, 0, 0, 0), rgb(0, 0, 255, 0), 0.5);
    expect(mid.a).toBe(0);
  });

  it('throws PaletteConfigError for positions outside [0, 1]', () => {
    expect(() => mix(rgb(0, 0, 0), rgb(255, 255, 255), 1.5)).toThrow(PaletteConfigError);
    expect(() => mix(rgb(0, 0, 0), rgb(255, 255, 255), -0.1)).toThrow(PaletteConfigError);
  });
});

describe('ramp', () => {
  it('produces the requested number of swatches', () => {
    expect(ramp(parseColor('#3366cc'), { steps: 9 })).toHaveLength(9);
  });

  it('is deterministic', () => {
    const base = parseColor('#3366cc');
    expect(ramp(base, { steps: 6 })).toEqual(ramp(base, { steps: 6 }));
  });

  it('increases OKLCH lightness monotonically across the ramp', () => {
    const swatches = ramp(parseColor('#3366cc'), { steps: 8 });
    const lightness = swatches.map((swatch) => srgbToOklch(swatch).l);
    for (let i = 1; i < lightness.length; i += 1) {
      expect(lightness[i]).toBeGreaterThan(lightness[i - 1]);
    }
  });

  it('honors explicit lightness bounds', () => {
    const swatches = ramp(parseColor('#3366cc'), { maxLightness: 0.7, minLightness: 0.3, steps: 5 });
    expect(srgbToOklch(swatches[0]).l).toBeCloseTo(0.3, 1);
    expect(srgbToOklch(swatches[4]).l).toBeCloseTo(0.7, 1);
  });

  it('keeps every swatch displayable and near the base hue for a saturated base', () => {
    const base = parseColor('#7c3aed');
    const baseHue = srgbToOklch(base).h;
    for (const swatch of ramp(base, { steps: 10 })) {
      expect(srgbToOklch(swatch).l).toBeGreaterThanOrEqual(0);
      const oklch = srgbToOklch(swatch);
      // Chroma-reduced swatches keep the hue; near-neutral ones may drift.
      if (oklch.c > 0.02) {
        const delta = Math.abs(oklch.h - baseHue);
        expect(Math.min(delta, 360 - delta)).toBeLessThanOrEqual(1);
      }
    }
  });

  it('throws PaletteConfigError for fewer than two steps', () => {
    expect(() => ramp(rgb(0, 0, 0), { steps: 1 })).toThrow(PaletteConfigError);
    expect(() => ramp(rgb(0, 0, 0), { steps: 2.5 })).toThrow(PaletteConfigError);
  });

  it('throws PaletteConfigError when minLightness exceeds maxLightness', () => {
    expect(() => ramp(rgb(0, 0, 0), { maxLightness: 0.2, minLightness: 0.8, steps: 4 })).toThrow(PaletteConfigError);
  });
});
