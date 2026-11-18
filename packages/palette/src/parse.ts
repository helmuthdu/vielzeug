import { clamp, hslToSrgb, type Oklab, oklabToSrgb, oklchToOklab } from './convert.js';
import { PaletteParseError } from './errors.js';
import { parseNamedColor } from './named-colors.js';
import type { Oklch, Rgba } from './types.js';

const HEX_RE = /^#(?:([\da-f])([\da-f])([\da-f])([\da-f])?|([\da-f]{2})([\da-f]{2})([\da-f]{2})([\da-f]{2})?)$/i;
const FUNCTION_RE = /^(rgba?|hsla?|oklab|oklch)\(([^)]*)\)$/i;
const NUMBER_RE = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;
const PERCENT_RE = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?%$/i;
const ANGLE_RE = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?(?:deg)?$/i;

function fail(input: string, detail: string): never {
  throw new PaletteParseError(`Invalid color "${input}": ${detail}`);
}

function parseNumber(token: string, input: string, what: string): number {
  if (!NUMBER_RE.test(token)) fail(input, `expected a number for ${what}, got "${token}"`);
  return Number(token);
}

function parseChannel(token: string, input: string, what: string): number {
  if (PERCENT_RE.test(token)) return (Number(token.slice(0, -1)) / 100) * 255;
  return parseNumber(token, input, what);
}

function parsePercent(token: string, input: string, what: string): number {
  if (PERCENT_RE.test(token)) return Number(token.slice(0, -1));
  return parseNumber(token, input, what);
}

/** CSS Color 4 maps percentages on OKLab a/b and OKLCH c to the range ±0.4. */
function parseOklabAxis(token: string, input: string, what: string): number {
  if (PERCENT_RE.test(token)) return (Number(token.slice(0, -1)) / 100) * 0.4;
  return parseNumber(token, input, what);
}

function parseLightness(token: string, input: string): number {
  if (PERCENT_RE.test(token)) return Number(token.slice(0, -1)) / 100;
  return parseNumber(token, input, 'lightness');
}

function parseAngle(token: string, input: string): number {
  if (!ANGLE_RE.test(token)) fail(input, `expected an angle in degrees, got "${token}"`);
  return Number(token.replace(/deg$/i, ''));
}

function parseAlpha(token: string | undefined, input: string): number {
  if (token === undefined) return 1;
  if (PERCENT_RE.test(token)) return clamp(Number(token.slice(0, -1)) / 100, 0, 1);
  if (!NUMBER_RE.test(token)) fail(input, `expected an alpha number or percentage, got "${token}"`);
  return clamp(Number(token), 0, 1);
}

/** Splits a functional-notation body into component tokens and the optional `/ alpha` part. */
function splitBody(body: string, input: string): { alpha: string | undefined; parts: string[] } {
  const slash = body.indexOf('/');
  const main = slash === -1 ? body : body.slice(0, slash);
  const alpha = slash === -1 ? undefined : body.slice(slash + 1).trim();
  if (slash !== -1 && body.indexOf('/', slash + 1) !== -1) fail(input, 'only one "/" alpha separator is allowed');
  if (main.includes(',')) {
    const parts = main.split(',').map((part) => part.trim());
    if (parts.some((part) => part === '')) fail(input, 'comma-separated components must not be empty');
    return { alpha, parts };
  }
  if (alpha !== undefined && alpha === '') fail(input, 'missing alpha after "/"');
  const parts = main.trim() === '' ? [] : main.trim().split(/\s+/);
  return { alpha, parts };
}

function parseRgb(name: string, parts: string[], alpha: string | undefined, input: string): Rgba {
  const legacyAlpha = parts.length === 4 ? parts[3] : undefined;
  if (parts.length !== 3 && parts.length !== 4) fail(input, `${name}() takes 3 components, got ${parts.length}`);
  if (parts.length === 4 && alpha !== undefined)
    fail(input, 'alpha may appear as a fourth comma argument or after "/", not both');
  return {
    a: parseAlpha(alpha ?? legacyAlpha, input),
    b: parseChannel(parts[2], input, 'blue'),
    g: parseChannel(parts[1], input, 'green'),
    r: parseChannel(parts[0], input, 'red'),
  };
}

function parseHsl(name: string, parts: string[], alpha: string | undefined, input: string): Rgba {
  const legacyAlpha = parts.length === 4 ? parts[3] : undefined;
  if (parts.length !== 3 && parts.length !== 4) fail(input, `${name}() takes 3 components, got ${parts.length}`);
  if (parts.length === 4 && alpha !== undefined)
    fail(input, 'alpha may appear as a fourth comma argument or after "/", not both');
  const h = parseAngle(parts[0], input);
  const s = parsePercent(parts[1], input, 'saturation');
  const l = parsePercent(parts[2], input, 'lightness');
  return hslToSrgb({ a: parseAlpha(alpha ?? legacyAlpha, input), h, l, s });
}

function parseOklab(parts: string[], alpha: string | undefined, input: string): Rgba {
  if (parts.length !== 3) fail(input, `oklab() takes 3 components, got ${parts.length}`);
  const color: Oklab = {
    a: parseOklabAxis(parts[1], input, 'a'),
    alpha: parseAlpha(alpha, input),
    b: parseOklabAxis(parts[2], input, 'b'),
    l: parseLightness(parts[0], input),
  };
  return oklabToSrgb(color);
}

function parseOklch(parts: string[], alpha: string | undefined, input: string): Rgba {
  if (parts.length !== 3) fail(input, `oklch() takes 3 components, got ${parts.length}`);
  const color: Oklch = {
    a: parseAlpha(alpha, input),
    c: parseOklabAxis(parts[1], input, 'chroma'),
    h: parseAngle(parts[2], input),
    l: parseLightness(parts[0], input),
  };
  return oklabToSrgb(oklchToOklab(color));
}

/**
 * Parses a CSS color string: `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`,
 * `rgb()`/`rgba()` and `hsl()`/`hsla()` in comma and space syntax,
 * `oklab()`/`oklch()` with optional `/ alpha`, and the CSS named colors
 * (case-insensitive, including `transparent`). The `color()` notation is not
 * supported. Throws `PaletteParseError` on invalid input.
 */
export function parseColor(input: string): Rgba {
  const text = input.trim();
  if (text === '') fail(input, 'empty input');

  if (!text.startsWith('#') && !text.includes('(')) {
    const named = parseNamedColor(text);
    if (named) return { a: named[3], b: named[2], g: named[1], r: named[0] };
    fail(input, 'expected a hex, functional, or named color');
  }

  const hex = HEX_RE.exec(text);
  if (hex) {
    if (hex[5] !== undefined) {
      return {
        a: hex[8] === undefined ? 1 : Number.parseInt(hex[8], 16) / 255,
        b: Number.parseInt(hex[7], 16),
        g: Number.parseInt(hex[6], 16),
        r: Number.parseInt(hex[5], 16),
      };
    }
    return {
      a: hex[4] === undefined ? 1 : Number.parseInt(hex[4] + hex[4], 16) / 255,
      b: Number.parseInt(hex[3] + hex[3], 16),
      g: Number.parseInt(hex[2] + hex[2], 16),
      r: Number.parseInt(hex[1] + hex[1], 16),
    };
  }

  const fn = FUNCTION_RE.exec(text);
  if (!fn) fail(input, 'expected a hex or functional color');

  const name = fn[1].toLowerCase();
  const { alpha, parts } = splitBody(fn[2], input);
  if (name === 'rgb' || name === 'rgba') return parseRgb(name, parts, alpha, input);
  if (name === 'hsl' || name === 'hsla') return parseHsl(name, parts, alpha, input);
  if (name === 'oklab') return parseOklab(parts, alpha, input);
  return parseOklch(parts, alpha, input);
}
