import { describe, expect, it } from 'vitest';

import { PaletteError, PaletteParseError, parseColor } from '../index';

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

describe('parseColor: named colors', () => {
  it('parses CSS named colors case-insensitively', () => {
    expect(parseColor('white')).toEqual(rgb(255, 255, 255));
    expect(parseColor('NAVY')).toEqual(rgb(0, 0, 128));
    expect(parseColor('RebeccaPurple')).toEqual(rgb(102, 51, 153));
    expect(parseColor(' steelblue ')).toEqual(rgb(70, 130, 180));
  });

  it('parses transparent as fully transparent black', () => {
    expect(parseColor('transparent')).toEqual(rgb(0, 0, 0, 0));
  });

  it('throws PaletteParseError for an unknown name', () => {
    expect(() => parseColor('notacolor')).toThrow(PaletteParseError);
  });
});

describe('parseColor: invalid input', () => {
  const invalid = [
    '',
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
