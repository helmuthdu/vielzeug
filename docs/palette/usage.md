---
title: 'Palette: Usage Guide'
description: Parse, convert, mix, and check colors with headless color math.
---

[[toc]]

## Basic Usage

```ts
import { parseColor, toHex } from '@vielzeug/palette';

const brand = parseColor('#3366cc'); // { r: 51, g: 102, b: 204, a: 1 }
console.log(toHex(brand)); // "#3366cc"
```

`parseColor()` accepts hex (3, 4, 6, and 8 digits), `rgb()`/`rgba()` and `hsl()`/`hsla()` in both comma and space syntax, CSS Color 4 `oklab()`/`oklch()`, and the CSS named colors (case-insensitive, including `transparent`). Anything else throws `PaletteParseError` with the offending input in the message. The `color()` notation is out of scope.

## Parse CSS Colors

```ts
import { parseColor } from '@vielzeug/palette';

parseColor('#f09'); // #rgb: digits are duplicated
parseColor('#f098'); // #rgba
parseColor('rgb(1, 2, 3)'); // comma syntax
parseColor('rgba(1, 2, 3, 0.5)'); // legacy comma alpha
parseColor('rgb(1 2 3 / 0.5)'); // space syntax with slash alpha
parseColor('rgb(50% 25% 0%)'); // percentages map to 0–255
parseColor('hsl(120, 100%, 50%)'); // hue wraps: -120 and 480 are valid
parseColor('oklab(0.5 -0.1 0.1 / 0.5)'); // CSS Color 4
parseColor('oklch(50% 0.1 240deg)'); // percent lightness, deg hue
parseColor('RebeccaPurple'); // named colors, any case
parseColor('transparent'); // { r: 0, g: 0, b: 0, a: 0 }
```

Percentage `oklab` `a`/`b` and `oklch` `c` map to the CSS Color 4 range of ±0.4. Alpha accepts a number or a percentage and is clamped to 0–1. Out-of-range channels (`rgb(300 0 0)`) are kept exactly — parsing never clips.

## Convert Between Color Spaces

```ts
import { hslToSrgb, oklchToSrgb, parseColor, srgbToHsl, srgbToOklch } from '@vielzeug/palette';

const red = parseColor('#ff0000');
const oklch = srgbToOklch(red); // { l: 0.628, c: 0.2577, h: 29.23, a: 1 }
const hsl = srgbToHsl(red); // { h: 0, s: 100, l: 50, a: 1 }

const back = oklchToSrgb(oklch); // round-trips within ±1 per channel
```

Conversions use the standard sRGB → linear → OKLab → OKLCH pipeline (Björn Ottosson's matrices, sRGB transfer function sign-extended per CSS Color 4). The pipeline is lossless: `oklchToSrgb()` leaves out-of-gamut channels outside 0–255, so `srgbToOklch()` recovers the original values, and `isDisplayable()` tells you whether a color fits the screen.

## Format Colors

```ts
import { parseColor, toHex, toHslString, toOklchString, toRgbString } from '@vielzeug/palette';

const translucent = parseColor('rgb(222 173 190 / 0.5)');
toHex(translucent); // "#deadbe80" — alpha is written when the color is translucent
toHex(translucent, { alpha: false }); // "#deadbe" — never write alpha...
toHex(parseColor('#deadbeef'), { alpha: true }); // "#deadbeff" — ...or always write it
toRgbString(translucent); // "rgb(222 173 190 / 0.5)"
toHslString(parseColor('#ff0000')); // "hsl(0 100% 50%)"
toOklchString(parseColor('#ff0000')); // "oklch(62.8% 0.2577 29.23)"
```

`toHex()`, `toRgbString()`, and `toHslString()` clamp out-of-gamut channels to 0–255 and alpha to 0–1 before writing, so their output is always display-safe. A color produced by `parseColor('rgb(300 0 0)')` keeps its out-of-range channel until formatted, where it clamps to `255`. `toOklchString()` writes the color's true OKLCH values — an out-of-gamut color round-trips through `parseColor()` exactly.

## Mix in OKLab

```ts
import { mix, parseColor, toHex } from '@vielzeug/palette';

const mid = mix(parseColor('#000000'), parseColor('#ffffff'), 0.5);
toHex(mid); // "#636363" — the perceptual midpoint, not #808080

const hover = mix(parseColor('#ff0000'), parseColor('rgb(0 0 0 / 0)'), 0.5);
toHex(hover); // "#ff000080" — transparent endpoints don't darken
```

`mix()` interpolates in OKLab with premultiplied alpha, matching CSS `color-mix(in oklab, ...)`: midpoints are perceptually even, and a transparent endpoint contributes no color instead of pulling the blend toward black. A `t` outside `[0, 1]` throws `PaletteConfigError`.

## Check Contrast

```ts
import { contrastRatio, parseColor, readableOn } from '@vielzeug/palette';

contrastRatio(parseColor('#000000'), parseColor('#ffffff')); // 21
contrastRatio(parseColor('#767676'), parseColor('#ffffff')); // ≈ 4.54 (AA boundary)

const ink = readableOn(parseColor('#f8fafc'), [parseColor('#94a3b8'), parseColor('#0f172a')]);
// → #0f172a: the first candidate that reaches the threshold
```

`contrastRatio()` uses WCAG 2.x relative luminance on channels clamped to 0–255. `readableOn()` picks the first candidate meeting 4.5 (AA) or 7 (AAA), or 3 / 4.5 with `{ large: true }`, and returns `null` when nothing passes.

## Build Lightness Ramps

```ts
import { parseColor, ramp, toHex } from '@vielzeug/palette';

const shades = ramp(parseColor('#3366cc'), { steps: 9 });
console.log(shades.map(toHex)); // nine swatches, dark to light
```

`ramp()` interpolates OKLab lightness between `minLightness` (default 0.15) and `maxLightness` (default 0.95) at the base color's hue. Where a swatch would leave the sRGB gamut, its chroma is reduced until it fits — every swatch is displayable and the hue never shifts under clamping. The result is deterministic and runs dark to light. Invalid `steps` or lightness bounds throw `PaletteConfigError`.

## Errors

All failures are `PaletteError` subclasses: `PaletteParseError` for malformed input and `PaletteConfigError` for invalid options. Catch the base class to handle both.

## Best Practices

- Parse once at the boundary, keep `Rgba` values, and format at the edges; conversions are cheap but parsing strings repeatedly is wasteful.
- Use `mix()` instead of averaging channels — gamma-space averages look muddy.
- Use `ramp()` for tonal scales and `readableOn()` for ink selection instead of hand-tuned hex pairs.
- Keep out-of-gamut colors in the pipeline as long as you like — conversions are lossless. Check `isDisplayable()` before handing a color to something that can't represent it, and let the formatters clamp at the display boundary.
