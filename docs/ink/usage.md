---
title: 'Ink: Usage Guide'
description: Smooth captured pointer samples, profile variable widths, build outline polygons, and serialize strokes as SVG paths.
---

[[toc]]

## Basic Usage

Capture samples from any pointer source, then run them through the pipeline: smooth, width, outline, serialize. Every function is pure, so you can call them in any order and re-run them freely.

```ts
import { smoothStroke, strokeOutline, strokeOutlineToSvgPath, strokeWidths, type StrokePoint } from '@vielzeug/ink';

const samples: StrokePoint[] = [
  { x: 0, y: 0 },
  { x: 12, y: 3 },
  { x: 25, y: -2 },
  { x: 40, y: 1 },
  { x: 58, y: 4 },
];

const smoothed = smoothStroke(samples);
const widths = strokeWidths(smoothed, { baseWidth: 6 });
const d = strokeOutlineToSvgPath(strokeOutline(smoothed, widths));

// Render with any SVG-capable surface.
const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
path.setAttribute('d', d);
```

## Choose a Smoothing Algorithm

`smoothStroke()` offers two algorithms with different output shapes. Catmull-Rom resamples the stroke through a spline: each input segment becomes `steps` samples, and the first and last input points are preserved exactly.

```ts
import { smoothStroke } from '@vielzeug/ink';

const resampled = smoothStroke(samples, { algorithm: 'catmull-rom', tension: 1, steps: 8 });
```

Streamline averaging is causal: it emits exactly one smoothed point per input sample, which keeps per-sample metadata (like `pressure`) aligned with the source and suits live drawing where samples arrive one at a time.

```ts
const live = smoothStroke(samples, { algorithm: 'streamline', tension: 0.7 });
```

## Profile Widths From Speed and Pressure

`StrokePoint` carries no timestamps, so `strokeWidths()` uses the distance to the previous sample as the speed proxy: slow segments (small spacing) widen, fast segments narrow. `velocityExponent` controls how strongly; `minScale`/`maxScale` clamp the factor.

```ts
import { strokeWidths } from '@vielzeug/ink';

const widths = strokeWidths(smoothed, {
  baseWidth: 6,
  velocityExponent: 0.5, // 0 disables velocity, 1 is fully inverse-proportional
  minScale: 0.4,
  maxScale: 1.8,
  referenceSpeed: 4, // spacing per sample treated as neutral speed
});
```

When a point carries `pressure` (normalized `[0, 1]`), it multiplies the velocity-derived width, so hard presses widen and light strokes thin.

## Build the Variable-Width Outline

`strokeOutline()` offsets each sample by half its width along the local normal and closes the ring with half-circle caps at both ends. The result is a plain `Point[]` you can fill with any renderer.

```ts
import { strokeOutline } from '@vielzeug/ink';

const ring = strokeOutline(smoothed, widths); // closed polygon, no repeated vertex
```

Omit `widths` for a constant-ish default profile (`baseWidth: 4` with velocity modulation).

## Simplify Before Serializing

Long strokes accumulate samples. `simplifyStroke()` runs Ramer-Douglas-Peucker and returns a subsequence of the input, so object identity and `pressure` survive. Apply it to the outline before emitting SVG to shrink path data.

```ts
import { simplifyStroke, strokeOutlineToSvgPath } from '@vielzeug/ink';

const compact = strokeOutlineToSvgPath(simplifyStroke(ring, 0.25));
```

## Serialize to SVG Paths

`strokeToSvgPath()` writes a centerline path (`M` plus one `L` per sample); `strokeOutlineToSvgPath()` writes the closed outline. Both round coordinates to `precision` decimal places.

```ts
import { strokeToSvgPath } from '@vielzeug/ink';

const centerline = strokeToSvgPath(simplifyStroke(smoothed, 0.5), { precision: 1 });
```

## Framework Integration

Ink functions are pure, so they memoize cleanly. Recompute geometry only when the sample array changes.

::: code-group

```tsx [React]
import { useMemo } from 'react';
import { smoothStroke, strokeOutline, strokeOutlineToSvgPath, strokeWidths, type StrokePoint } from '@vielzeug/ink';

function InkPath({ samples }: { samples: StrokePoint[] }) {
  const d = useMemo(() => {
    const smoothed = smoothStroke(samples);
    return strokeOutlineToSvgPath(strokeOutline(smoothed, strokeWidths(smoothed, { baseWidth: 6 })));
  }, [samples]);

  return <path d={d} />;
}
```

```vue [Vue 3]
<script setup lang="ts">
import { computed } from 'vue';
import { smoothStroke, strokeOutline, strokeOutlineToSvgPath, strokeWidths, type StrokePoint } from '@vielzeug/ink';

const props = defineProps<{ samples: StrokePoint[] }>();
const d = computed(() => {
  const smoothed = smoothStroke(props.samples);
  return strokeOutlineToSvgPath(strokeOutline(smoothed, strokeWidths(smoothed, { baseWidth: 6 })));
});
</script>

<template>
  <svg><path :d="d" /></svg>
</template>
```

```svelte [Svelte]
<script lang="ts">
  import { smoothStroke, strokeOutline, strokeOutlineToSvgPath, strokeWidths, type StrokePoint } from '@vielzeug/ink';

  export let samples: StrokePoint[];
  $: d = (() => {
    const smoothed = smoothStroke(samples);
    return strokeOutlineToSvgPath(strokeOutline(smoothed, strokeWidths(smoothed, { baseWidth: 6 })));
  })();
</script>

<svg><path {d} /></svg>
```

:::

## Working with Other Vielzeug Libraries

Gesture produces the raw samples: bind a pan or drag handle, append each `current` point to an array, and pass the array to Ink when the stroke ends. Prism (or any SVG renderer) consumes the `d` strings Ink returns.

```ts
import { createDragGesture } from '@vielzeug/gesture';
import { smoothStroke, strokeToSvgPath, type StrokePoint } from '@vielzeug/ink';

const samples: StrokePoint[] = [];
const drag = createDragGesture(surface, {
  onMove: ({ current }) => samples.push({ x: current.x, y: current.y }),
  onEnd: () => {
    path.setAttribute('d', strokeToSvgPath(smoothStroke(samples), { precision: 1 }));
  },
});
```

## Best Practices

- Smooth once, reuse everywhere: compute `smoothStroke()` per stroke and derive widths, outlines, and paths from the same result.
- Simplify outlines with a tolerance around `0.2`–`0.5` device pixels; larger tolerances visibly flatten caps.
- Keep `precision` at `1`–`2` for display paths; raise it only when another tool re-processes the output.
- Match `referenceSpeed` to your sampler rate: it is spacing per sample, so faster sampling means a smaller value.
- Treat invalid options errors (`InkConfigError`) as programming bugs: they throw at call time with the offending option named.
- Memoize per stroke in UI frameworks; the functions are pure and cheap to cache.
