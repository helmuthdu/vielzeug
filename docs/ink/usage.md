---
title: 'Ink: Usage Guide'
description: 'How to smooth freehand strokes with @vielzeug/ink: stabilization, smoothing, speed-based widths, outline polygons, and SVG paths.'
---

[[toc]]

## Basic Usage

Capture samples from any pointer source — with a timestamp — then run them through the pipeline: stabilize while drawing, simplify, width, outline, serialize. Every function is pure, so you can call them in any order and re-run them freely.

```ts
import {
  polylineToSvgPath,
  simplifyStroke,
  stabilizeStroke,
  strokeOutline,
  strokeWidths,
  type StrokePoint,
} from '@vielzeug/ink';

// Capture: PointerEvent.timeStamp is the timestamp ink wants.
const samples: StrokePoint[] = [];
element.addEventListener('pointermove', (event) => {
  samples.push({ pressure: event.pressure, time: event.timeStamp, x: event.offsetX, y: event.offsetY });
});

const stabilized = stabilizeStroke(samples);
const widths = strokeWidths(stabilized, { width: 6 });
const d = polylineToSvgPath(strokeOutline(stabilized, widths), { close: true });

// Render with any SVG-capable surface.
const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
path.setAttribute('d', d);
```

## Stabilize While Drawing

`stabilizeStroke()` removes hand jitter causally — it never looks ahead — so you can run it on every pointer move while the stroke is being drawn. It emits exactly one point per input sample, keeping per-sample metadata aligned, and its last point is always the last input point: the stroke ends exactly where the pen lifted.

```ts
import { stabilizeStroke } from '@vielzeug/ink';

const live = stabilizeStroke(samples, { strength: 0.5 }); // 0 = raw, 1 = maximum smoothing
```

## Smooth After Capture

`smoothStroke()` resamples the stroke through a uniform Catmull-Rom spline: each input segment becomes `steps` samples, and the first and last input points are preserved exactly. Use it after capture when you want extra curvature between sparse samples. `pressure` and `time` are interpolated linearly, so widths computed from the output match widths computed from the input.

```ts
import { smoothStroke } from '@vielzeug/ink';

const resampled = smoothStroke(samples, { tension: 1, steps: 8 });
```

## Profile Widths From Speed and Pressure

`strokeWidths()` derives real pen speed from the `time` field: `distance / Δtime` between consecutive points. That stays correct after any stabilization, smoothing, or simplification — pipeline order no longer matters. Slow widens, fast narrows, clamped to a fixed `[0.25, 2]` scale.

```ts
import { strokeWidths } from '@vielzeug/ink';

const widths = strokeWidths(stabilized, {
  width: 6,
  thinning: 0.5, // 0 disables velocity, 1 is fully inverse-proportional
  referenceSpeed: 0.5, // neutral pen speed in pixels per millisecond
});
```

When points carry `pressure` (normalized `[0, 1]`), it multiplies the result: `0.5` is neutral and maps to exactly `1`, so a mouse (which reports `0.5`) draws as wide as a device without pressure data. When any point lacks `time`, velocity modulation is disabled for the whole stroke — width becomes `width × pressure` — instead of guessing speed from sample spacing.

## Build the Outline

`strokeOutline()` offsets each sample by half its width along the local normal and closes the ring with half-circle caps at both ends. The result is a plain `Point[]` you can fill with any renderer.

```ts
import { strokeOutline } from '@vielzeug/ink';

const ring = strokeOutline(stabilized, widths); // variable width, closed polygon
const uniform = strokeOutline(stabilized, 6); // constant width, no array needed
```

## Simplify Before Serializing

Long strokes accumulate samples. `simplifyStroke()` runs Ramer-Douglas-Peucker and returns a subsequence of the input, so object identity, `pressure`, and `time` survive. Apply it to the outline before emitting SVG to shrink path data.

```ts
import { simplifyStroke, polylineToSvgPath } from '@vielzeug/ink';

const compact = polylineToSvgPath(simplifyStroke(ring, 0.25), { close: true });
```

## Serialize to SVG Paths

`polylineToSvgPath()` writes `M` plus one `L` per point, rounding coordinates to `precision` decimal places. Pass `close: true` to append `Z` for the closed outline ring; leave it off for a centerline path.

```ts
import { polylineToSvgPath } from '@vielzeug/ink';

const centerline = polylineToSvgPath(simplifyStroke(stabilized, 0.5), { precision: 1 });
const outline = polylineToSvgPath(ring, { close: true });
```

## Framework Integration

Ink functions are pure, so they memoize cleanly. Recompute geometry only when the sample array changes.

::: code-group

```tsx [React]
import { useMemo } from 'react';
import { polylineToSvgPath, stabilizeStroke, strokeOutline, strokeWidths, type StrokePoint } from '@vielzeug/ink';

function InkPath({ samples }: { samples: StrokePoint[] }) {
  const d = useMemo(() => {
    const stabilized = stabilizeStroke(samples);
    return polylineToSvgPath(strokeOutline(stabilized, strokeWidths(stabilized, { width: 6 })), { close: true });
  }, [samples]);

  return <path d={d} />;
}
```

```vue [Vue 3]
<script setup lang="ts">
import { computed } from 'vue';
import {
  polylineToSvgPath,
  stabilizeStroke,
  strokeOutline,
  strokeWidths,
  type StrokePoint,
} from '@vielzeug/ink';

const props = defineProps<{ samples: StrokePoint[] }>();
const d = computed(() => {
  const stabilized = stabilizeStroke(props.samples);
  return polylineToSvgPath(strokeOutline(stabilized, strokeWidths(stabilized, { width: 6 })), { close: true });
});
</script>

<template>
  <svg><path :d="d" /></svg>
</template>
```

```svelte [Svelte]
<script lang="ts">
  import {
    polylineToSvgPath,
    stabilizeStroke,
    strokeOutline,
    strokeWidths,
    type StrokePoint,
  } from '@vielzeug/ink';

  export let samples: StrokePoint[];
  $: d = (() => {
    const stabilized = stabilizeStroke(samples);
    return polylineToSvgPath(strokeOutline(stabilized, strokeWidths(stabilized, { width: 6 })), { close: true });
  })();
</script>

<svg><path {d} /></svg>
```

:::

## Working with Other Vielzeug Libraries

Gesture produces the raw samples: bind a pan or drag handle, append each `current` point (with `event.timeStamp`) to an array, and pass the array to Ink when the stroke ends. Prism (or any SVG renderer) consumes the `d` strings Ink returns.

```ts
import { createDragGesture } from '@vielzeug/gesture';
import { polylineToSvgPath, stabilizeStroke, type StrokePoint } from '@vielzeug/ink';

const samples: StrokePoint[] = [];
const drag = createDragGesture(surface, {
  onMove: ({ currentX, currentY, event }) => samples.push({ time: event.timeStamp, x: currentX, y: currentY }),
  onEnd: () => {
    path.setAttribute('d', polylineToSvgPath(stabilizeStroke(samples), { precision: 1 }));
  },
});
```

## Best Practices

- Pass `time` on every sample (`PointerEvent.timeStamp` or `performance.now()`): without it, widths are pressure-only and speed information is thrown away.
- Stabilize live, smooth once: run `stabilizeStroke()` per pointer move for a calm preview, and add `smoothStroke()` or `simplifyStroke()` at commit time.
- Simplify outlines with a tolerance around `0.2`–`0.5` device pixels; larger tolerances visibly flatten caps.
- Keep `precision` at `1`–`2` for display paths; raise it only when another tool re-processes the output.
- Treat invalid options errors (`InkConfigError`) as programming bugs: they throw at call time with the offending option named.
- Memoize per stroke in UI frameworks; the functions are pure and cheap to cache.
