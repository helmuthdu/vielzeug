---
title: 'Palette: Color math for design tools'
description: 'Color parsing, conversion, mixing, and contrast for design tools'
package: palette
category: utilities
keywords: [color, color parsing, oklch, oklab, hsl, contrast, wcag, mix, ramp, luminance]
exports:
  [
    parseColor,
    toHex,
    toRgbString,
    toHslString,
    toOklchString,
    srgbToOklch,
    oklchToSrgb,
    srgbToHsl,
    hslToSrgb,
    mix,
    contrastRatio,
    relativeLuminance,
    readableOn,
    ramp,
    PaletteParseError,
    PaletteConfigError,
  ]
related: [arsenal, refine]
environments: [browser, node]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="palette" />

## Why Palette?

Design tools need color math that is correct where it matters — linear-light mixing, WCAG contrast, perceptual lightness — without pulling in a color library that assumes a DOM, a canvas, or a particular color model.

```ts
// Before
const mid = { r: (a.r + b.r) / 2, g: (a.g + b.g) / 2, b: (a.b + b.b) / 2 }; // gamma-space average, looks wrong
const ratio = /* hand-rolled luminance, usually forgets the sRGB transfer function */;

// After
import { contrastRatio, mix, parseColor, ramp } from '@vielzeug/palette';

const mid = mix(parseColor('#000000'), parseColor('#ffffff'), 0.5); // linear-light midpoint
const ratio = contrastRatio(parseColor('#767676'), parseColor('#ffffff')); // 4.54
const shades = ramp(parseColor('#3366cc'), { steps: 9 }); // OKLCH lightness ramp
```

| Feature                                 | Palette                                       | Ad-hoc color helpers |
| --------------------------------------- | --------------------------------------------- | -------------------- |
| Bundle size                             | <PackageInfo package="palette" type="size" /> | n/a                  |
| Zero dependencies                       | <ore-icon name="check" size="16"></ore-icon>  | n/a                  |
| CSS Color 4 `oklab()`/`oklch()` parsing | Built in                                      | Manual               |
| Linear-light mixing                     | Built in                                      | Manual               |
| WCAG 2.x contrast                       | Built in                                      | Manual               |
| Perceptual ramps                        | OKLCH lightness interpolation                 | Manual               |

<div class="decision-callout">

**Use Palette when** an application needs headless color parsing, conversion, mixing, or contrast checks with no DOM or rendering assumptions.

**Consider a rendering-layer color API when** the work is applying colors to a surface rather than computing them.

</div>

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/palette
```

```sh [npm]
npm install @vielzeug/palette
```

```sh [yarn]
yarn add @vielzeug/palette
```

:::

## Quick Start

```ts
import { mix, parseColor, ramp, readableOn, toHex } from '@vielzeug/palette';

const brand = parseColor('#3366cc');
const surface = parseColor('rgb(248 250 252)');

const ink = readableOn(surface, [parseColor('#0f172a'), parseColor('#334155')]);
const midpoint = mix(brand, surface, 0.5); // linear-light interpolation
const shades = ramp(brand, { steps: 9 }); // OKLCH lightness ramp

console.log(toHex(ink ?? brand), toHex(midpoint), shades.map(toHex));
```

## Features

<div class="features-grid">

- `parseColor()`: `#rgb`/`#rgba`/`#rrggbb`/`#rrggbbaa`, `rgb()`/`hsl()` comma and space syntax, and CSS Color 4 `oklab()`/`oklch()`
- `toHex()`, `toRgbString()`, `toHslString()`, `toOklchString()`: formatting with documented clamping
- `srgbToOklch()` / `oklchToSrgb()`, `srgbToHsl()` / `hslToSrgb()`: round-trippable conversions via the standard Björn Ottosson OKLab matrices
- `mix()`: linear-light sRGB interpolation with linear alpha compositing
- `contrastRatio()` and `relativeLuminance()`: WCAG 2.x ratios on clamped sRGB
- `readableOn()`: picks the first candidate meeting the AA/AAA threshold, with large-text thresholds
- `ramp()`: deterministic OKLCH lightness ramps that keep hue and chroma
- Typed errors: `PaletteParseError` and `PaletteConfigError` share the `PaletteError` base
- Pure functions only: no DOM, no disposal contract, zero dependencies

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)
- [Migration Guide](./migration.md)

</div>

## See Also

<div class="see-also">

- [Arsenal](/arsenal/): general-purpose utilities that complement headless color math.
- [Refine](/refine/): components styled with design tokens that tools like this generate and check.

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
