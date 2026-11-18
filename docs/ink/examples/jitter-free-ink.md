---
title: 'Ink Examples: Jitter-Free Ink'
description: 'Turn raw pointer samples into a stabilized, variable-width SVG stroke.'
---

## Jitter-Free Ink

### Problem

You capture raw pointer samples while the user draws and need a clean, filled ink line: jitter removed, width varying with speed, and the result serialized as a single SVG path you can hand to any renderer.

### Solution

Stamp every sample with `PointerEvent.timeStamp`, then run the pipeline: `stabilizeStroke()` removes jitter causally (so the same call works live while drawing), `strokeWidths()` derives per-point widths from real pen speed, `strokeOutline()` builds the closed variable-width ring, and `polylineToSvgPath(ring, { close: true })` serializes it.

```ts
import { polylineToSvgPath, stabilizeStroke, strokeOutline, strokeWidths, type StrokePoint } from '@vielzeug/ink';

const samples: StrokePoint[] = [
  { time: 0, x: 4, y: 8 },
  { time: 16, x: 18, y: 11 },
  { time: 33, x: 33, y: 6 },
  { time: 49, x: 51, y: 9 },
  { time: 66, x: 70, y: 14 },
];

const stabilized = stabilizeStroke(samples);
const widths = strokeWidths(stabilized, { width: 5 });
const d = polylineToSvgPath(strokeOutline(stabilized, widths), { close: true });

const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
path.setAttribute('d', d);
document.querySelector('svg')?.append(path);
```

### Pitfalls

- Without `time` on every point, `strokeWidths()` disables velocity modulation entirely and falls back to `width × pressure`; spacing-based speed proxies break after resampling, so ink no longer guesses.
- `stabilizeStroke()` keeps one output point per input; if you also resample with `smoothStroke()`, compute widths from the array you pass to `strokeOutline()`.
- Stabilization multiplies nothing, but long strokes still accumulate samples — simplify the outline before serializing if path size matters.

### Related

- [Usage Guide](../usage.md)
- [API Reference](../api.md)
- [Gesture](/gesture/): pointer handles that produce the raw samples.
