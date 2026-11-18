---
title: 'Ink: Freehand Stroke Geometry'
description: Deterministic causal stroke stabilization, Catmull-Rom smoothing, speed and pressure width profiling, outline polygons, RDP simplification, and SVG path output.
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
exports: [stabilizeStroke, smoothStroke, strokeWidths, strokeOutline, simplifyStroke, polylineToSvgPath]
related: [gesture, prism]
environments: [browser, node, ssr, deno]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="ink" />

## Why Ink?

Raw pointer samples are jagged, and a good ink line needs stabilization, speed- and pressure-derived widths, a closed outline polygon, and a compact SVG path on top of them. Ink computes all four as pure, deterministic functions: identical samples always produce identical geometry, so strokes are replayable, testable, and server-renderable.

```ts
// Before
// Hand-rolled filter math, per-point width heuristics, and manual path assembly
// in every drawing surface, each with its own jitter and nondeterminism.

// After
import { polylineToSvgPath, stabilizeStroke, strokeOutline, strokeWidths } from '@vielzeug/ink';

const stabilized = stabilizeStroke(samples);
const d = polylineToSvgPath(strokeOutline(stabilized, strokeWidths(stabilized, { width: 4 })), {
  close: true,
});
```

| Feature                        | Ink                                          | Ad-hoc smoothing | Sketch libraries     |
| ------------------------------ | -------------------------------------------- | ---------------- | -------------------- |
| Bundle size                    | <PackageInfo package="ink" type="size" />    | n/a              | Typically 10–50 kB   |
| External dependencies          | <ore-icon name="check" size="16"></ore-icon> | n/a              | Varies               |
| Deterministic pure functions   | <ore-icon name="check" size="16"></ore-icon> | Rarely           | Often randomized     |
| Variable-width outline polygon | Built in                                     | Manual           | Rare                 |
| Runs without a DOM             | <ore-icon name="check" size="16"></ore-icon> | Varies           | Usually browser-only |

<div class="decision-callout">

**Use Ink when** a drawing or annotation surface needs reusable stroke geometry: stabilization, smoothing, width profiling, outlines, decimation, or SVG serialization without owning the math.

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
import { polylineToSvgPath, stabilizeStroke, strokeOutline, strokeWidths } from '@vielzeug/ink';

// Raw samples from a pointer stream (see @vielzeug/gesture for capture),
// timestamped with PointerEvent.timeStamp.
const samples = [
  { time: 0, x: 0, y: 0 },
  { time: 16, x: 12, y: 3 },
  { time: 32, x: 25, y: -2 },
  { time: 48, x: 40, y: 1 },
];

const stabilized = stabilizeStroke(samples); // causal jitter removal
const widths = strokeWidths(stabilized, { width: 6 }); // speed-derived widths
const ring = strokeOutline(stabilized, widths); // closed variable-width polygon
const d = polylineToSvgPath(ring, { close: true }); // SVG `d` string
```

## Features

<div class="features-grid">

- `stabilizeStroke()`: causal Streamline-style averaging for live drawing; the stroke ends exactly where the pen lifted
- `smoothStroke()`: deterministic Catmull-Rom resampling after capture
- `strokeWidths()`: real-speed-derived widths (`distance / Δtime`) with pressure modulation and clamped scaling
- `strokeOutline()`: closed variable-width polygon offset along local normals with capped ends; constant width with a single number
- `simplifyStroke()`: iterative Ramer-Douglas-Peucker decimation preserving endpoints
- `polylineToSvgPath()`: SVG `d` strings for open strokes and closed outline rings, with configurable precision
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
