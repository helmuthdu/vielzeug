---
title: 'Ink: API Reference'
description: API reference for stroke smoothing, width profiling, outline polygons, simplification, and SVG path output.
---

[[toc]]

## API Overview

| Symbol                     | Purpose                                                  | Execution | Common gotcha                                              |
| -------------------------- | -------------------------------------------------------- | --------- | ---------------------------------------------------------- |
| `smoothStroke()`           | Resample or low-pass a stroke deterministically          | Sync      | Catmull-Rom changes point count; streamline preserves it   |
| `strokeWidths()`           | Per-point widths from spacing-derived speed and pressure | Sync      | Spacing is a speed proxy: sampler rate changes its meaning |
| `strokeOutline()`          | Closed variable-width polygon around a stroke            | Sync      | `widths`, when supplied, must match point count exactly    |
| `simplifyStroke()`         | Ramer-Douglas-Peucker decimation                         | Sync      | Returns input references, not copies                       |
| `strokeToSvgPath()`        | Centerline SVG `d` string                                | Sync      | Requires at least one point                                |
| `strokeOutlineToSvgPath()` | Closed outline SVG `d` string                            | Sync      | Appends `Z` unconditionally                                |
| `InkError`                 | Base class for all ink errors                            | Sync      | Narrow with `instanceof InkError`                          |
| `InkConfigError`           | Invalid options or point data                            | Sync      | Thrown at call time, not construction                      |
| `Point` / `StrokePoint`    | Structural point shapes shared across the canvas toolkit | Sync      | `pressure` is optional and normalized `[0, 1]`             |

## Package Entry Point

| Import          | Purpose                                                                               |
| --------------- | ------------------------------------------------------------------------------------- |
| `@vielzeug/ink` | Smoothing, width profiling, outline, simplification, SVG serialization, types, errors |

---

## Core Functions

### `smoothStroke()`

```ts
function smoothStroke(points: readonly StrokePoint[], options?: SmoothStrokeOptions): StrokePoint[];
```

Returns a deterministically smoothed stroke.

| Parameter | Type                  | Description                                                          |
| --------- | --------------------- | -------------------------------------------------------------------- |
| `points`  | `StrokePoint[]`       | Input samples; at least one, fewer than three are returned as copies |
| `options` | `SmoothStrokeOptions` | Algorithm, tension, and resampling density                           |

**Returns:** New `StrokePoint[]`. `'catmull-rom'` emits `steps` samples per input segment plus the exact final point; `'streamline'` emits one point per input sample.

**Example**

```ts
import { smoothStroke } from '@vielzeug/ink';

const smoothed = smoothStroke(samples, { algorithm: 'streamline', tension: 0.6 });
```

Throws `InkConfigError` for a `tension` outside `[0, 1]`, a `steps` value outside `[2, 1000]` or non-integer, an unknown `algorithm`, or invalid point data.

---

### `strokeWidths()`

```ts
function strokeWidths(points: readonly StrokePoint[], options: StrokeWidthOptions): number[];
```

Returns one width per point, derived from spacing-based speed and optional pressure.

| Parameter | Type                 | Description                                  |
| --------- | -------------------- | -------------------------------------------- |
| `points`  | `StrokePoint[]`      | Stroke samples (at least one)                |
| `options` | `StrokeWidthOptions` | Base width, velocity response, clamps, speed |

**Returns:** `number[]` with the same length as `points`.

**Example**

```ts
import { strokeWidths } from '@vielzeug/ink';

const widths = strokeWidths(samples, { baseWidth: 6, velocityExponent: 0.5 });
```

Throws `InkConfigError` for a non-positive `baseWidth`, `minScale`, `maxScale`, or `referenceSpeed`, a negative `velocityExponent`, `minScale > maxScale`, or invalid point data.

---

### `strokeOutline()`

```ts
function strokeOutline(points: readonly StrokePoint[], widths?: readonly number[]): Point[];
```

Returns a closed polygon approximating the variable-width stroke: start cap, left offsets forward, end cap, right offsets backward, with no repeated final vertex.

| Parameter | Type            | Description                                                                            |
| --------- | --------------- | -------------------------------------------------------------------------------------- |
| `points`  | `StrokePoint[]` | Stroke samples (at least one)                                                          |
| `widths`  | `number[]`      | Per-point widths; omitted widths fall back to `strokeWidths(points, { baseWidth: 4 })` |

**Returns:** `Point[]` ring, deterministic for deterministic input.

**Example**

```ts
import { strokeOutline } from '@vielzeug/ink';

const ring = strokeOutline(samples, [6, 6, 6]);
```

Throws `InkConfigError` when `widths` length differs from `points` length or any width is not a positive finite number.

---

### `simplifyStroke()`

```ts
function simplifyStroke(points: readonly StrokePoint[], tolerance: number): StrokePoint[];
```

Returns a Ramer-Douglas-Peucker decimated subsequence of the input; first and last points are always kept.

| Parameter   | Type            | Description                                        |
| ----------- | --------------- | -------------------------------------------------- |
| `points`    | `StrokePoint[]` | Stroke samples                                     |
| `tolerance` | `number`        | Maximum perpendicular deviation to discard, `>= 0` |

**Returns:** `StrokePoint[]` containing the same object references as the input (metadata such as `pressure` survives).

**Example**

```ts
import { simplifyStroke } from '@vielzeug/ink';

const decimated = simplifyStroke(samples, 0.5);
```

Throws `InkConfigError` for a negative or non-finite `tolerance`.

---

### `strokeToSvgPath()`

```ts
function strokeToSvgPath(points: readonly StrokePoint[], options?: StrokeToSvgPathOptions): string;
```

Returns an SVG path `d` string: `M x y` plus one `L x y` per remaining sample.

| Parameter | Type                     | Description                                                                 |
| --------- | ------------------------ | --------------------------------------------------------------------------- |
| `points`  | `StrokePoint[]`          | Stroke samples (at least one)                                               |
| `options` | `StrokeToSvgPathOptions` | `close` appends `Z`; `precision` rounds coordinates (`0`–`12`, default `2`) |

**Returns:** `string` suitable for a `<path d="...">` attribute.

**Example**

```ts
import { strokeToSvgPath } from '@vielzeug/ink';

const d = strokeToSvgPath(samples, { precision: 1 }); // "M 0 0 L 12 3 L 25 -2"
```

---

### `strokeOutlineToSvgPath()`

```ts
function strokeOutlineToSvgPath(polygon: readonly Point[], precision?: number): string;
```

Returns a closed SVG path `d` string (`M`, one `L` per remaining vertex, `Z`) for a ring from `strokeOutline()`.

| Parameter   | Type      | Description                           |
| ----------- | --------- | ------------------------------------- |
| `polygon`   | `Point[]` | Closed ring vertices (at least one)   |
| `precision` | `number`  | Decimal places, `0`–`12`, default `2` |

**Returns:** `string` ending in ` Z`.

## Types

```ts
type Point = Readonly<{ x: number; y: number }>;
```

A two-dimensional point. Structural so canvas-toolkit packages can share it without importing each other.

```ts
type StrokePoint = Readonly<{ x: number; y: number; pressure?: number }>;
```

A sampled stroke point; `pressure` is normalized to `[0, 1]` when present.

```ts
interface SmoothStrokeOptions {
  algorithm?: 'catmull-rom' | 'streamline'; // default 'catmull-rom'
  tension?: number; // [0, 1], default 1
  steps?: number; // [2, 1000] integer, default 8; catmull-rom only
}
```

```ts
interface StrokeWidthOptions {
  baseWidth: number; // required, > 0
  velocityExponent?: number; // >= 0, default 0.5
  minScale?: number; // > 0, default 0.25
  maxScale?: number; // > 0, default 2
  referenceSpeed?: number; // > 0, default 4
}
```

```ts
interface StrokeToSvgPathOptions {
  close?: boolean; // default false
  precision?: number; // [0, 12] integer, default 2
}
```

## Errors

| Error            | Trigger                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------ |
| `InkError`       | Base class; catch all ink errors with `instanceof InkError`                                      |
| `InkConfigError` | Invalid options (tolerance, tension, steps, baseWidth, precision, …) or invalid point/width data |
