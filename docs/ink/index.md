---
title: 'Ink: Freehand Stroke Geometry'
description: Deterministic freehand stroke smoothing, velocity and pressure width profiling, outline polygons, RDP simplification, and SVG path output.
package: ink
category: data
keywords:
  [
    freehand,
    stroke,
    smoothing,
    catmull-rom,
    streamline,
    simplify,
    ramer-douglas-peucker,
    svg,
    path,
    variable-width,
    pressure,
    drawing,
    canvas,
  ]
exports: [smoothStroke, strokeWidths, strokeOutline, simplifyStroke, strokeToSvgPath]
related: [gesture, prism]
environments: [browser, node, ssr, deno]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="ink" />

## Why Ink?

Raw pointer samples are jagged, and a good ink line needs smoothing, speed- and pressure-derived widths, a closed outline polygon, and a compact SVG path on top of them. Ink computes all four as pure, deterministic functions: identical samples always produce identical geometry, so strokes are replayable, testable, and server-renderable.

```ts
// Before
// Hand-rolled spline math, per-point width heuristics, and manual path assembly
// in every drawing surface, each with its own jitter and nondeterminism.

// After
import { smoothStroke, strokeOutline, strokeOutlineToSvgPath } from '@vielzeug/ink';

const smoothed = smoothStroke(samples);
const d = strokeOutlineToSvgPath(strokeOutline(smoothed));
```

| Feature                        | Ink                                          | Ad-hoc smoothing | Sketch libraries     |
| ------------------------------ | -------------------------------------------- | ---------------- | -------------------- |
| Bundle size                    | <PackageInfo package="ink" type="size" />    | n/a              | Typically 10–50 kB   |
| External dependencies          | <ore-icon name="check" size="16"></ore-icon> | n/a              | Varies               |
| Deterministic pure functions   | <ore-icon name="check" size="16"></ore-icon> | Rarely           | Often randomized     |
| Variable-width outline polygon | Built in                                     | Manual           | Rare                 |
| Runs without a DOM             | <ore-icon name="check" size="16"></ore-icon> | Varies           | Usually browser-only |

<div class="decision-callout">

**Use Ink when** a drawing or annotation surface needs reusable stroke geometry: smoothing, width profiling, outlines, decimation, or SVG serialization without owning the math.

**Consider direct polyline rendering when** the input is already clean (vector tools with their own smoothing) and a plain segment path is visually sufficient.

</div>

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/ink
```

```sh [npm]
npm install @vielzeug/ink
```

```sh [yarn]
yarn add @vielzeug/ink
```

:::

## Quick Start

```ts
import { smoothStroke, strokeOutline, strokeOutlineToSvgPath, strokeWidths } from '@vielzeug/ink';

// Raw samples from a pointer stream (see @vielzeug/gesture for capture).
const samples = [
  { x: 0, y: 0 },
  { x: 12, y: 3 },
  { x: 25, y: -2 },
  { x: 40, y: 1 },
];

const smoothed = smoothStroke(samples); // deterministic resampled spline
const widths = strokeWidths(smoothed, { baseWidth: 6 }); // speed-derived widths
const d = strokeOutlineToSvgPath(strokeOutline(smoothed, widths)); // SVG `d` string
```

## Features

<div class="features-grid">

- `smoothStroke()`: Catmull-Rom resampling or Streamline-style causal averaging
- `strokeWidths()`: velocity-derived widths with pressure modulation and clamped scaling
- `strokeOutline()`: closed variable-width polygon offset along local normals with capped ends
- `simplifyStroke()`: iterative Ramer-Douglas-Peucker decimation preserving endpoints
- `strokeToSvgPath()` / `strokeOutlineToSvgPath()`: SVG `d` strings with configurable precision
- `InkError` / `InkConfigError`: typed configuration errors thrown at call time
- Determinism: identical input always yields identical output; no randomness, no clocks
- Zero runtime dependencies and no DOM requirement: works in Node, Workers, and SSR

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

- [Gesture](/gesture/): captures the pointer samples Ink consumes; pan handles produce the raw point streams.
- [Prism](/prism/): SVG rendering primitives; Ink's `d` strings drop straight into its path elements.

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
