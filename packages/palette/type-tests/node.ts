import {
  contrastRatio,
  type FormatOptions,
  type Hsla,
  hslToSrgb,
  isDisplayable,
  mix,
  type Oklch,
  oklchToSrgb,
  PaletteConfigError,
  PaletteError,
  PaletteParseError,
  parseColor,
  type RampOptions,
  type ReadableOnOptions,
  type Rgba,
  ramp,
  readableOn,
  relativeLuminance,
  srgbToHsl,
  srgbToOklch,
  toHex,
  toHslString,
  toOklchString,
  toRgbString,
} from '@vielzeug/palette';

function expectNumber(value: number): void {
  if (typeof value !== 'number') throw new Error('expected number');
}

function expectString(value: string): void {
  if (typeof value !== 'string') throw new Error('expected string');
}

const red: Rgba = parseColor('#ff0000');
expectNumber(red.r + red.g + red.b + red.a);

const hsl: Hsla = srgbToHsl(red);
expectNumber(hsl.h + hsl.s + hsl.l + hsl.a);
expectNumber(hslToSrgb(hsl).r);

const oklch: Oklch = srgbToOklch(red);
expectNumber(oklch.l + oklch.c + oklch.h + oklch.a);
expectNumber(oklchToSrgb(oklch).g);
if (typeof isDisplayable(red) !== 'boolean') throw new Error('expected boolean');
if (typeof isDisplayable(oklchToSrgb(oklch)) !== 'boolean') throw new Error('expected boolean');

expectNumber(relativeLuminance(red));
expectNumber(contrastRatio(red, parseColor('rgb(0 0 0)')));

const options: ReadableOnOptions = { large: false, level: 'AAA' };
const pick: Rgba | null = readableOn(red, [parseColor('#ffffff')], options);
if (pick) expectNumber(pick.a);

const mixed: Rgba = mix(red, parseColor('rgb(0 0 255)'), 0.5);
expectNumber(mixed.b);

const rampOptions: RampOptions = { maxLightness: 0.9, minLightness: 0.2, steps: 5 };
const swatches: Rgba[] = ramp(red, rampOptions);
if (swatches.length !== 5) throw new Error('expected five swatches');

const format: FormatOptions = { alpha: true };
expectString(toHex(red, format));
expectString(toRgbString(red));
expectString(toHslString(red, format));
expectString(toOklchString(red));

const parseError: PaletteError = new PaletteParseError('parse');
const configError: PaletteError = new PaletteConfigError('config');
if (!(parseError instanceof PaletteError) || !(configError instanceof PaletteError)) {
  throw new Error('error hierarchy broken');
}
