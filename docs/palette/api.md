---
title: 'Palette: API Reference'
description: API reference for color parsing, conversion, mixing, and contrast.
---

[[toc]]

## API Overview

| Symbol                | Purpose                                  | Execution | Common gotcha                                           |
| --------------------- | ---------------------------------------- | --------- | ------------------------------------------------------- |
| `parseColor()`        | Parse a CSS color string into `Rgba`     | Sync      | Named colors and `color()` are out of scope             |
| `toHex()`             | Format as `#rrggbb`/`#rrggbbaa`          | Sync      | Alpha is written when translucent unless `alpha: false` |
| `toRgbString()`       | Format as CSS `rgb()` space syntax       | Sync      | Channels are clamped to 0–255                           |
| `toHslString()`       | Format as CSS `hsl()` space syntax       | Sync      | Channels are clamped before conversion                  |
| `toOklchString()`     | Format as CSS `oklch()` syntax           | Sync      | Channels are clamped before conversion                  |
| `srgbToOklch()`       | Convert sRGB to OKLCH                    | Sync      | Round-trip drifts up to ±1 per channel                  |
| `oklchToSrgb()`       | Convert OKLCH to sRGB                    | Sync      | Out-of-gamut colors clamp, they do not throw            |
| `srgbToHsl()`         | Convert sRGB to HSL                      | Sync      | `h` is 0–360, `s`/`l` are 0–100                         |
| `hslToSrgb()`         | Convert HSL to sRGB                      | Sync      | Hue wraps; `s`/`l` clamp to 0–100                       |
| `mix()`               | Linear-light interpolation of two colors | Sync      | `t` outside `[0, 1]` throws `PaletteConfigError`        |
| `relativeLuminance()` | WCAG 2.x relative luminance              | Sync      | Computed on channels clamped to 0–255                   |
| `contrastRatio()`     | WCAG 2.x contrast ratio (1–21)           | Sync      | Ignores alpha by design                                 |
| `readableOn()`        | First candidate meeting a WCAG threshold | Sync      | Returns `null` when nothing passes                      |
| `ramp()`              | OKLCH lightness ramp of a base color     | Sync      | `steps` must be an integer ≥ 2                          |

## Package Entry Point

| Import              | Purpose                     |
| ------------------- | --------------------------- |
| `@vielzeug/palette` | Complete public Palette API |

## Parsing

### `parseColor()`

```ts
function parseColor(input: string): Rgba;
```

Parses `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`; `rgb()`/`rgba()` and `hsl()`/`hsla()` in comma and space syntax with optional `/ alpha`; and `oklab()`/`oklch()` with alpha per CSS Color 4. Percentage `oklab` `a`/`b` and `oklch` `c` map to ±0.4; percentage `rgb` channels map to 0–255. Alpha accepts a number or percentage and clamps to 0–1. Throws `PaletteParseError` including the offending input.

## Formatting

### `toHex()`

```ts
function toHex(color: Rgba, options?: FormatOptions): string;
```

Formats as `#rrggbb`, or `#rrggbbaa` when the color is translucent or `options.alpha` is `true`. Channels clamp to 0–255 and alpha to 0–1.

### `toRgbString()`

```ts
function toRgbString(color: Rgba, options?: FormatOptions): string;
```

Formats as `rgb(r g b)` or `rgb(r g b / a)` space syntax. Same clamping as `toHex()`.

### `toHslString()`

```ts
function toHslString(color: Rgba, options?: FormatOptions): string;
```

Formats as `hsl(h s% l%)` or `hsl(h s% l% / a)`. Channels clamp before conversion.

### `toOklchString()`

```ts
function toOklchString(color: Rgba, options?: FormatOptions): string;
```

Formats as `oklch(l% c h)` or `oklch(l% c h / a)`. Channels clamp before conversion.

## Conversion

### `srgbToOklch()` / `oklchToSrgb()`

```ts
function srgbToOklch(color: Rgba): Oklch;
function oklchToSrgb(color: Oklch): Rgba;
```

Standard sRGB → linear → OKLab → OKLCH pipeline (Björn Ottosson's matrices with the sRGB transfer function). `oklchToSrgb()` clamps out-of-gamut channels to 0–255.

### `srgbToHsl()` / `hslToSrgb()`

```ts
function srgbToHsl(color: Rgba): Hsla;
function hslToSrgb(color: Hsla): Rgba;
```

`h` is degrees in `[0, 360)`, `s` and `l` are percentages 0–100. `hslToSrgb()` wraps hue and clamps `s`/`l` to 0–100.

## Mixing

### `mix()`

```ts
function mix(a: Rgba, b: Rgba, t: number): Rgba;
```

Interpolates in linear-light sRGB (linearize, lerp, re-encode) with alpha interpolated linearly. `t` is 0 for `a`, 1 for `b`; outside `[0, 1]` throws `PaletteConfigError`.

## Contrast

### `relativeLuminance()`

```ts
function relativeLuminance(color: Rgba): number;
```

WCAG 2.x relative luminance on channels clamped to 0–255.

### `contrastRatio()`

```ts
function contrastRatio(a: Rgba, b: Rgba): number;
```

WCAG 2.x contrast ratio: 1 for identical colors, 21 for black on white. Symmetric in its arguments.

### `readableOn()`

```ts
function readableOn(background: Rgba, candidates: readonly Rgba[], options?: ReadableOnOptions): Rgba | null;
```

Returns the first candidate whose contrast against `background` reaches the threshold: 4.5 (`level: 'AA'`, default) or 7 (`'AAA'`), or 3 / 4.5 with `large: true`. Returns `null` when no candidate passes.

## Ramps

### `ramp()`

```ts
function ramp(base: Rgba, options: RampOptions): Rgba[];
```

Builds `steps` swatches dark to light by interpolating OKLab lightness between `minLightness` (default 0.15) and `maxLightness` (default 0.95) while keeping the base color's hue and chroma. Deterministic. Out-of-gamut swatches clamp on conversion. Throws `PaletteConfigError` for non-integer or sub-2 `steps`, bounds outside `[0, 1]`, or `minLightness > maxLightness`.

## Types

### `Rgba`

```ts
type Rgba = Readonly<{ r: number; g: number; b: number; a: number }>;
```

`r`/`g`/`b` are 0–255 and `a` is 0–1. Parsed values may fall outside the displayable range; formatting clamps.

### `Hsla`

```ts
type Hsla = Readonly<{ h: number; s: number; l: number; a: number }>;
```

`h` is degrees 0–360, `s` and `l` are percentages 0–100, `a` is 0–1.

### `Oklab`

```ts
type Oklab = Readonly<{ l: number; a: number; b: number; alpha: number }>;
```

### `Oklch`

```ts
type Oklch = Readonly<{ l: number; c: number; h: number; alpha: number }>;
```

### `FormatOptions`

```ts
type FormatOptions = Readonly<{ alpha?: boolean }>;
```

When `alpha` is `true` the alpha channel is always written; otherwise it is written only when the color is translucent.

### `ReadableOnOptions`

```ts
type ReadableOnOptions = Readonly<{ level?: 'AA' | 'AAA'; large?: boolean }>;
```

### `RampOptions`

```ts
type RampOptions = Readonly<{ steps: number; minLightness?: number; maxLightness?: number }>;
```

## Errors

| Error                | Thrown by         | Meaning                                                                             |
| -------------------- | ----------------- | ----------------------------------------------------------------------------------- |
| `PaletteParseError`  | `parseColor()`    | Input did not match the supported grammar; the message includes the offending input |
| `PaletteConfigError` | `mix()`, `ramp()` | Invalid options or positions                                                        |

Both extend `PaletteError`, so `catch (error) { if (error instanceof PaletteError) ... }` narrows both.
