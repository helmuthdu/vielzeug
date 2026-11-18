---
title: 'Ink: API Reference'
description: 'API reference for @vielzeug/ink: causal stabilization, Catmull-Rom smoothing, speed-based widths, outline polygons, simplification, and SVG path output.'
---

[[toc]]

## API Overview

| Symbol                  | Purpose                                                  | Execution | Common gotcha                                                     |
| ----------------------- | -------------------------------------------------------- | --------- | ----------------------------------------------------------------- |
| `stabilizeStroke()`     | Causal jitter removal while drawing                      | Sync      | One output point per input; last point snaps to the pen-up spot   |
| `smoothStroke()`        | Catmull-Rom resampling after capture                     | Sync      | Adds points: `steps` samples per input segment                    |
| `strokeWidths()`        | Per-point widths from real speed (`time`) and pressure   | Sync      | Velocity is off for the whole stroke if any point lacks `time`    |
| `strokeOutline()`       | Closed variable-width polygon around a stroke            | Sync      | Array `widths` must match point count; a number is constant       |
| `simplifyStroke()`      | Ramer-Douglas-Peucker decimation                         | Sync      | Returns input references, not copies                              |
| `polylineToSvgPath()`   | SVG `d` string for polylines and closed outline rings    | Sync      | Requires at least one point; pass `close: true` for rings         |
| `InkError`              | Base class for all ink errors                            | Sync      | Narrow with `instanceof InkError`                                 |
| `InkConfigError`        | Invalid options or point counts                          | Sync      | Thrown at call time, not construction                             |
| `Point` / `StrokePoint` | Structural point shapes shared across the canvas toolkit | Sync      | `pressure` and `time` are optional; `time` unlocks width velocity |

## Package Entry Point

| Import          | Purpose                                                                                              |
| --------------- | ---------------------------------------------------------------------------------------------------- |
| `@vielzeug/ink` | Stabilization, smoothing, width profiling, outline, simplification, SVG serialization, types, errors |

---

## Core Functions

### `stabilizeStroke()`

```ts
function stabilizeStroke(points: readonly StrokePoint[], options?: StabilizeStrokeOptions): StrokePoint[];
```

Removes hand jitter _while the stroke is being drawn_: a causal exponential average toward each incoming sample with a jitter dead zone, so straight lines stay crisp. It never looks ahead.

| Parameter | Type                     | Description                                                 |
| --------- | ------------------------ | ----------------------------------------------------------- |
| `points`  | `readonly StrokePoint[]` | Input samples                                               |
| `options` | `StabilizeStrokeOptions` | `strength` in `[0, 1]`; `0` is the raw input, default `0.5` |

**Returns:** New `StrokePoint[]` with exactly the input's length. The last point is the last input point exactly — the stroke ends where the pen lifted. Inside the dead zone the position repeats but the incoming sample's `pressure` and `time` carry through.

**Example**

```ts
import { stabilizeStroke } from '@vielzeug/ink';

const live = stabilizeStroke(samples, { strength: 0.6 });
```

Throws `InkConfigError` for a `strength` outside `[0, 1]`.

---

### `smoothStroke()`

```ts
function smoothStroke(points: readonly StrokePoint[], options?: SmoothStrokeOptions): StrokePoint[];
```

Resamples a stroke through a uniform Catmull-Rom spline: `steps` samples per input segment, with the first and last input points preserved exactly. `pressure` and `time` are interpolated linearly, so widths computed from the output match widths computed from the input. For jitter removal while drawing, use `stabilizeStroke()` instead — this function adds points and looks ahead.

| Parameter | Type                     | Description                                                                    |
| --------- | ------------------------ | ------------------------------------------------------------------------------ |
| `points`  | `readonly StrokePoint[]` | Input samples; fewer than three are returned as copies                         |
| `options` | `SmoothStrokeOptions`    | `tension` in `[0, 1]` (default `1`), `steps` integer `[2, 1000]` (default `8`) |

**Returns:** New `StrokePoint[]` with `steps` samples per input segment plus the exact final point.

**Example**

```ts
import { smoothStroke } from '@vielzeug/ink';

const resampled = smoothStroke(samples, { tension: 1, steps: 8 });
```

Throws `InkConfigError` for a `tension` outside `[0, 1]` or a `steps` value outside `[2, 1000]` or non-integer.

---

### `strokeWidths()`

```ts
function strokeWidths(points: readonly StrokePoint[], options: StrokeWidthOptions): number[];
```

Returns one width per point from real pen speed and optional pressure. Speed is `distance / Δtime` between consecutive points, which stays correct after any stabilization, smoothing, or simplification. Slow widens, fast narrows, clamped to a fixed `[0.25, 2]` scale. When any point lacks `time` — or a Δtime is zero — velocity modulation is disabled for the whole stroke (width becomes `width × pressure`) instead of guessing speed from sample spacing.

| Parameter | Type                     | Description                                                                                                                             |
| --------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `points`  | `readonly StrokePoint[]` | Stroke samples (at least one)                                                                                                           |
| `options` | `StrokeWidthOptions`     | `width` (required, > 0), `thinning` in `[0, 1]` (default `0.5`), `referenceSpeed` in px/ms (default `0.5`), `taper`, `simulatePressure` |

**Returns:** `number[]` with the same length as `points`. The first point uses the forward segment; degenerate (zero-length) segments keep the previous scale so stationary samples do not spike.

Pressure multiplies the result through a curve where `0.5` (the neutral value a mouse reports) maps to exactly `1`: the range is `[0.5, 1.25]`, so a neutral-pressure stroke is as wide as one without pressure data.

`taper` fades the width in over `taper.start` and out over `taper.end` units of arc length (same units as `width`): a smoothstep ramp from a `0.15` floor at the tip to full width at the taper length, multiplied on top of the speed/pressure profile. `simulatePressure` (default `false`) synthesizes pressure for points that have none on a timed stroke: the width multiplier ramps from `0.5` at each tip to neutral across the first and last 15% of arc length, so mouse strokes thin at the ends. Points that carry real `pressure` always use it, and untimed strokes ignore the option.

**Example**

```ts
import { strokeWidths } from '@vielzeug/ink';

const widths = strokeWidths(samples, { width: 6, thinning: 0.5 });
const tapered = strokeWidths(samples, { width: 6, taper: { start: 30, end: 30 }, simulatePressure: true });
```

Throws `InkConfigError` for a non-positive `width` or `referenceSpeed`, a `thinning` outside `[0, 1]`, a negative or non-finite `taper` length, or an empty `points` array.

---

### `strokeOutline()`

```ts
function strokeOutline(
  points: readonly StrokePoint[],
  widths: number | readonly number[],
  options?: StrokeOutlineOptions,
): Point[];
```

Returns a closed polygon approximating the variable-width stroke: start cap, left offsets forward, end cap, right offsets backward, with no repeated final vertex. Pass a constant `widths` number for a uniform stroke.

| Parameter | Type                          | Description                                                                       |
| --------- | ----------------------------- | --------------------------------------------------------------------------------- |
| `points`  | `readonly StrokePoint[]`      | Stroke samples (at least one)                                                     |
| `widths`  | `number \| readonly number[]` | Constant width, or per-point widths from `strokeWidths()`                         |
| `options` | `StrokeOutlineOptions`        | `cap` (default `'round'`), `join` (default `'round'`), `miterLimit` (default `4`) |

`cap` selects the end treatment: `'round'` half-circle caps, `'butt'` no cap points, `'square'` a half-width tangent extension at each end. `join` handles turns sharper than 90°, where naive offsetting makes the inner side cross itself: `'round'` keeps the plain offset samples (current default output), `'bevel'` replaces each sharp joint with the two adjacent segment-offset points, dropping the crossing spike, and `'miter'` extends to the offset-line intersection while the miter length stays within `miterLimit` × half width, falling back to bevel beyond it.

**Returns:** `Point[]` ring, deterministic for deterministic input.

**Example**

```ts
import { strokeOutline } from '@vielzeug/ink';

const ring = strokeOutline(samples, widths);
const uniform = strokeOutline(samples, 4);
const marker = strokeOutline(samples, 4, { cap: 'square', join: 'miter', miterLimit: 6 });
```

Throws `InkConfigError` when an array `widths` length differs from `points` length or any width is not a positive finite number, when `cap` or `join` is not a known variant, or when `miterLimit` is not a positive finite number.

---

### `simplifyStroke()`

```ts
function simplifyStroke(points: readonly StrokePoint[], tolerance: number): StrokePoint[];
```

Returns a Ramer-Douglas-Peucker decimated subsequence of the input; first and last points are always kept.

| Parameter   | Type                     | Description                                        |
| ----------- | ------------------------ | -------------------------------------------------- |
| `points`    | `readonly StrokePoint[]` | Stroke samples                                     |
| `tolerance` | `number`                 | Maximum perpendicular deviation to discard, `>= 0` |

**Returns:** `StrokePoint[]` containing the same object references as the input (metadata such as `pressure` and `time` survives).

**Example**

```ts
import { simplifyStroke } from '@vielzeug/ink';

const decimated = simplifyStroke(samples, 0.5);
```

Throws `InkConfigError` for a negative or non-finite `tolerance`.

---

### `polylineToSvgPath()`

```ts
function polylineToSvgPath(points: readonly Point[], options?: PolylineToSvgPathOptions): string;
```

Returns an SVG path `d` string: `M x y` plus one `L x y` per remaining point. Works for open strokes and for the closed ring from `strokeOutline()` — pass `close: true` for rings.

| Parameter | Type                       | Description                                                                 |
| --------- | -------------------------- | --------------------------------------------------------------------------- |
| `points`  | `readonly Point[]`         | Stroke samples or ring vertices (at least one)                              |
| `options` | `PolylineToSvgPathOptions` | `close` appends `Z`; `precision` rounds coordinates (`0`–`12`, default `2`) |

**Returns:** `string` suitable for a `<path d="...">` attribute.

**Example**

```ts
import { polylineToSvgPath } from '@vielzeug/ink';

const d = polylineToSvgPath(samples, { precision: 1 }); // "M 0 0 L 12 3 L 25 -2"
const outline = polylineToSvgPath(ring, { close: true }); // "M ... L ... Z"
```

Throws `InkConfigError` when `points` is empty or `precision` is out of range.

## Types

```ts
type Point = Readonly<{ x: number; y: number }>;
```

A two-dimensional point. Structural so canvas-toolkit packages can share it without importing each other.

```ts
type StrokePoint = Readonly<{
  x: number;
  y: number;
  pressure?: number; // normalized [0, 1]; 0.5 is neutral
  time?: number; // milliseconds, e.g. PointerEvent.timeStamp; enables width velocity
}>;
```

A sampled stroke point. `time` values only need to share a clock; any monotonic source works.

```ts
interface StabilizeStrokeOptions {
  strength?: number; // [0, 1], default 0.5
}
```

```ts
interface SmoothStrokeOptions {
  tension?: number; // [0, 1], default 1
  steps?: number; // [2, 1000] integer, default 8
}
```

```ts
interface StrokeWidthOptions {
  width: number; // required, > 0
  thinning?: number; // [0, 1], default 0.5
  referenceSpeed?: number; // > 0, default 0.5 (px per ms)
  taper?: StrokeTaperOptions; // arc-length end fade, default none
  simulatePressure?: boolean; // default false; timed strokes only
}
```

```ts
interface StrokeTaperOptions {
  start?: number; // fade-in length along arc length, >= 0, default 0
  end?: number; // fade-out length along arc length, >= 0, default 0
}
```

```ts
type StrokeCap = 'round' | 'butt' | 'square';
```

```ts
type StrokeJoin = 'round' | 'bevel' | 'miter';
```

```ts
interface StrokeOutlineOptions {
  cap?: StrokeCap; // default 'round'
  join?: StrokeJoin; // default 'round'
  miterLimit?: number; // > 0, default 4 (miter length / half width)
}
```

```ts
interface PolylineToSvgPathOptions {
  close?: boolean; // default false
  precision?: number; // [0, 12] integer, default 2
}
```

## Errors

| Error            | Trigger                                                                                                                                      |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `InkError`       | Base class; catch all ink errors with `instanceof InkError`                                                                                  |
| `InkConfigError` | Invalid options (strength, tension, steps, width, thinning, precision, tolerance, cap, join, miterLimit, taper, …) or point-count mismatches |
