---
title: 'Palette Examples: Parse, Mix and Contrast'
description: 'Parse a theme color, derive a readable ink, and build a tonal ramp.'
---

## Parse, Mix and Contrast

### Problem

A settings panel receives a brand color as a CSS string and needs a tonal scale plus a text color that stays readable on a light surface — without a color library that assumes a DOM.

### Solution

```ts
import { mix, parseColor, ramp, readableOn, toHex } from '@vielzeug/palette';

const brand = parseColor('oklch(55% 0.18 264)'); // CSS Color 4 input
const surface = parseColor('rgb(248 250 252)');

// A nine-step tonal scale that keeps the brand hue and stays inside sRGB.
const shades = ramp(brand, { steps: 9 });

// A hover tone: OKLab midpoint between brand and surface, like color-mix(in oklab).
const hover = mix(brand, surface, 0.4);

// The first ink candidate that passes AA on the surface.
const ink = readableOn(surface, [parseColor('#94a3b8'), parseColor('#0f172a')]);

console.log(shades.map(toHex));
console.log(toHex(hover), toHex(ink ?? brand));
```

### Pitfalls

- Averaging channels by hand mixes in gamma space and looks muddy; use `mix()`, which interpolates in OKLab with premultiplied alpha.
- `readableOn()` returns the _first_ passing candidate, not the highest-contrast one — order candidates from most to least preferred.
- Out-of-gamut `oklch()` inputs do not throw; conversions keep their exact extended-range channels. Check `isDisplayable()` before display, and let the formatters clamp.

### Related

- [Usage Guide](../usage.md)
- [API Reference](../api.md)
