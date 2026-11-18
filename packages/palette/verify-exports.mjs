import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const modules = [await import('./dist/index.js'), require('./dist/index.cjs')];

for (const palette of modules) {
  for (const name of [
    'contrastRatio',
    'hslToSrgb',
    'isDisplayable',
    'mix',
    'oklchToSrgb',
    'parseColor',
    'ramp',
    'readableOn',
    'relativeLuminance',
    'srgbToHsl',
    'srgbToOklch',
    'toHex',
    'toHslString',
    'toOklchString',
    'toRgbString',
  ]) {
    if (typeof palette[name] !== 'function') {
      throw new Error(`${name} export missing`);
    }
  }
  for (const [ErrorType, name] of [
    [palette.PaletteError, 'PaletteError'],
    [palette.PaletteParseError, 'PaletteParseError'],
    [palette.PaletteConfigError, 'PaletteConfigError'],
  ]) {
    const error = new ErrorType('artifact');
    if (error.name !== name || !(error instanceof palette.PaletteError)) {
      throw new Error(`${name} artifact identity mismatch`);
    }
  }
}
