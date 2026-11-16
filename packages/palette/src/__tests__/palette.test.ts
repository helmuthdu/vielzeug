import { describe, expect, it } from 'vitest';

import {
  contrastRatio,
  hslToSrgb,
  mix,
  oklchToSrgb,
  PaletteConfigError,
  PaletteError,
  PaletteParseError,
  parseColor,
  ramp,
  readableOn,
  srgbToHsl,
  srgbToOklch,
  toHex,
  toHslString,
  toOklchString,
  toRgbString,
} from '../index';

function rgb(r: number, g: number, b: number, a = 1) {
  return { a, b, g, r };
}

describe('parseColor: hex', () => {
  it('parses #rgb by duplicating digits', () => {
    expect(parseColor('#f09')).toEqual(rgb(0xff, 0x00, 0x99));
  });

  it('parses #rgba with alpha as the fourth nibble', () => {
    expect(parseColor('#f098')).toEqual(rgb(0xff, 0x00, 0x99, 0x88 / 255));
  });

  it('parses #rrggbb case-insensitively', () => {
    expect(parseColor('#Deadbe')).toEqual(rgb(0xde, 0xad, 0xbe));
  });

  it('parses #rrggbbaa', () => {
    expect(parseColor('#deadbeef')).toEqual(rgb(0xde, 0xad, 0xbe, 0xef / 255));
  });
});

describe('parseColor: rgb()', () => {
  it('parses comma syntax', () => {
    expect(parseColor('rgb(1, 2, 3)')).toEqual(rgb(1, 2, 3));
  });

  it('parses comma syntax with legacy alpha', () => {
    expect(parseColor('rgba(1, 2, 3, 0.5)')).toEqual(rgb(1, 2, 3, 0.5));
  });

  it('parses space syntax with slash alpha', () => {
    expect(parseColor('rgb(1 2 3 / 0.5)')).toEqual(rgb(1, 2, 3, 0.5));
  });

  it('parses percentage channels', () => {
    expect(parseColor('rgb(50% 25% 0%)')).toEqual(rgb(127.5, 63.75, 0));
  });
});

describe('parseColor: hsl()', () => {
  it('parses comma syntax', () => {
    expect(parseColor('hsl(120, 100%, 50%)')).toEqual(rgb(0, 255, 0));
  });

  it('parses comma syntax with legacy alpha', () => {
    expect(parseColor('hsla(0, 100%, 50%, 0.25)')).toEqual(rgb(255, 0, 0, 0.25));
  });

  it('parses space syntax with slash alpha', () => {
    const color = parseColor('hsl(240 100% 50% / 0.5)');
    expect(color.r).toBeCloseTo(0, 5);
    expect(color.g).toBeCloseTo(0, 5);
    expect(color.b).toBeCloseTo(255, 5);
    expect(color.a).toBe(0.5);
  });

  it('wraps negative and over-360 hues', () => {
    expect(parseColor('hsl(-120 100% 50%)')).toEqual(parseColor('hsl(240 100% 50%)'));
    expect(parseColor('hsl(480deg 100% 50%)')).toEqual(parseColor('hsl(120 100% 50%)'));
  });
});

describe('parseColor: oklab() and oklch()', () => {
  it('parses oklab with slash alpha', () => {
    const color = parseColor('oklab(0.5 -0.1 0.1 / 0.5)');
    expect(color.a).toBe(0.5);
    expect(color.r).toBeGreaterThanOrEqual(0);
    expect(color.r).toBeLessThanOrEqual(255);
  });

  it('parses oklch with percentage lightness and deg hue', () => {
    const color = parseColor('oklch(50% 0.1 240deg)');
    expect(color.a).toBe(1);
    expect(color.b).toBeGreaterThan(color.r);
  });

  it('maps oklab percentage axes to the ±0.4 range', () => {
    expect(parseColor('oklab(0.5 50% 0%)')).toEqual(parseColor('oklab(0.5 0.2 0)'));
  });
});

describe('parseColor: invalid input', () => {
  const invalid = [
    '',
    'rebeccapurple',
    'color(srgb 1 0 0)',
    '#',
    '#gg0000',
    '#12345',
    '#1234567',
    'rgb(1, 2)',
    'rgb(1, 2, 3, 0.5, 9)',
    'rgb(1 2 3 / 0.5 / 0.5)',
    'hsl(1 2)',
    'oklch(1 2)',
    'rgb(a, 2, 3)',
  ];

  for (const input of invalid) {
    it(`throws PaletteParseError for "${input}"`, () => {
      expect(() => parseColor(input)).toThrow(PaletteParseError);
    });
  }

  it('includes the offending input in the message', () => {
    expect(() => parseColor('#gg0000')).toThrow(/#gg0000/);
  });

  it('narrowing with the base class catches parse errors', () => {
    try {
      parseColor('nope');
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(PaletteError);
      expect(error).toBeInstanceOf(PaletteParseError);
      expect((error as Error).name).toBe('PaletteParseError');
    }
  });
});

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
    const white = oklchToSrgb({ alpha: 1, c: 0, h: 0, l: 1 });
    expect(white.r).toBeCloseTo(255, 5);
    expect(white.g).toBeCloseTo(255, 5);
    expect(white.b).toBeCloseTo(255, 5);
    expect(oklchToSrgb({ alpha: 1, c: 0, h: 120, l: 0 })).toEqual(rgb(0, 0, 0));
  });

  it('clamps out-of-gamut oklch to the displayable range', () => {
    const color = oklchToSrgb({ alpha: 1, c: 0.5, h: 120, l: 0.5 });
    for (const channel of [color.r, color.g, color.b]) {
      expect(channel).toBeGreaterThanOrEqual(0);
      expect(channel).toBeLessThanOrEqual(255);
    }
  });

  it('clamps HSL lightness above 100% to white', () => {
    expect(hslToSrgb({ a: 1, h: 200, l: 120, s: 50 })).toEqual(rgb(255, 255, 255));
  });
});

describe('mix', () => {
  it('interpolates black and white in linear light, not gamma space', () => {
    const mid = mix(rgb(0, 0, 0), rgb(255, 255, 255), 0.5);
    // Expected from the source formula: delinearize(0.5) * 255 ≈ 187.53.
    const expected = (1.055 * 0.5 ** (1 / 2.4) - 0.055) * 255;
    expect(Math.abs(mid.r - expected)).toBeLessThanOrEqual(2);
    expect(Math.abs(mid.g - expected)).toBeLessThanOrEqual(2);
    expect(Math.abs(mid.b - expected)).toBeLessThanOrEqual(2);
    expect(toHex(mid)).not.toBe('#808080');
  });

  it('returns the endpoints at t=0 and t=1', () => {
    const a = rgb(10, 20, 30);
    const b = rgb(200, 100, 50);
    const at0 = mix(a, b, 0);
    const at1 = mix(a, b, 1);
    expect(Math.abs(at0.r - a.r)).toBeLessThanOrEqual(1);
    expect(Math.abs(at0.g - a.g)).toBeLessThanOrEqual(1);
    expect(Math.abs(at0.b - a.b)).toBeLessThanOrEqual(1);
    expect(Math.abs(at1.r - b.r)).toBeLessThanOrEqual(1);
    expect(Math.abs(at1.g - b.g)).toBeLessThanOrEqual(1);
    expect(Math.abs(at1.b - b.b)).toBeLessThanOrEqual(1);
  });

  it('interpolates alpha linearly', () => {
    expect(mix(rgb(0, 0, 0, 0), rgb(255, 255, 255, 1), 0.25).a).toBeCloseTo(0.25, 10);
  });

  it('throws PaletteConfigError for positions outside [0, 1]', () => {
    expect(() => mix(rgb(0, 0, 0), rgb(255, 255, 255), 1.5)).toThrow(PaletteConfigError);
    expect(() => mix(rgb(0, 0, 0), rgb(255, 255, 255), -0.1)).toThrow(PaletteConfigError);
  });
});

describe('contrast', () => {
  it('returns 21 for black on white', () => {
    expect(contrastRatio(rgb(0, 0, 0), rgb(255, 255, 255))).toBeCloseTo(21, 5);
  });

  it('returns 1 for identical colors', () => {
    expect(contrastRatio(rgb(123, 45, 67), rgb(123, 45, 67))).toBeCloseTo(1, 10);
  });

  it('puts #767676 on white at the AA boundary of about 4.54', () => {
    expect(contrastRatio(parseColor('#767676'), rgb(255, 255, 255))).toBeCloseTo(4.54, 1);
  });

  it('is symmetric', () => {
    const a = parseColor('#336699');
    const b = parseColor('#eef0f2');
    expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a), 10);
  });
});

describe('readableOn', () => {
  const white = rgb(255, 255, 255);
  const lightGray = rgb(200, 200, 200);
  const darkGray = rgb(60, 60, 60);

  it('picks the first candidate meeting the AA threshold', () => {
    expect(readableOn(white, [lightGray, darkGray])).toEqual(darkGray);
  });

  it('returns null when no candidate meets the threshold', () => {
    expect(readableOn(white, [lightGray])).toBeNull();
  });

  it('applies the AAA threshold of 7', () => {
    const mid = rgb(109, 109, 109); // ≈4.5 on white: passes AA, fails AAA
    expect(readableOn(white, [mid])).toEqual(mid);
    expect(readableOn(white, [mid], { level: 'AAA' })).toBeNull();
  });

  it('lowers the threshold to 3 for large text', () => {
    const mid = rgb(140, 140, 140); // ≈3.4 on white: fails normal AA, passes large AA
    expect(readableOn(white, [mid])).toBeNull();
    expect(readableOn(white, [mid], { large: true })).toEqual(mid);
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

  it('throws PaletteConfigError for fewer than two steps', () => {
    expect(() => ramp(rgb(0, 0, 0), { steps: 1 })).toThrow(PaletteConfigError);
    expect(() => ramp(rgb(0, 0, 0), { steps: 2.5 })).toThrow(PaletteConfigError);
  });

  it('throws PaletteConfigError when minLightness exceeds maxLightness', () => {
    expect(() => ramp(rgb(0, 0, 0), { maxLightness: 0.2, minLightness: 0.8, steps: 4 })).toThrow(PaletteConfigError);
  });
});
