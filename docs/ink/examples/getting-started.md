---
title: 'Ink Examples: Getting Started'
description: 'Turn raw pointer samples into a smoothed, variable-width SVG stroke.'
---

## Getting Started

### Problem

You capture raw pointer samples while the user draws and need a clean, filled ink line: jitter removed, width varying with speed, and the result serialized as a single SVG path you can hand to any renderer.

### Solution

Run the samples through the four-stage pipeline: `smoothStroke()` removes jitter, `strokeWidths()` derives per-point widths from spacing, `strokeOutline()` builds the closed variable-width ring, and `strokeOutlineToSvgPath()` serializes it.

```ts
import { smoothStroke, strokeOutline, strokeOutlineToSvgPath, strokeWidths, type StrokePoint } from '@vielzeug/ink';

const samples: StrokePoint[] = [
  { x: 4, y: 8 },
  { x: 18, y: 11 },
  { x: 33, y: 6 },
  { x: 51, y: 9 },
  { x: 70, y: 14 },
];

const smoothed = smoothStroke(samples);
const widths = strokeWidths(smoothed, { baseWidth: 5, referenceSpeed: 3 });
const d = strokeOutlineToSvgPath(strokeOutline(smoothed, widths));

const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
path.setAttribute('d', d);
document.querySelector('svg')?.append(path);
```

### Pitfalls

- Catmull-Rom resampling multiplies point count (`steps` per segment); simplify the outline before serializing if path size matters.
- `referenceSpeed` is spacing per sample, not pixels per second: match it to how densely your sampler emits points.
- Widths must align 1:1 with the points passed to `strokeOutline()`; compute them from the smoothed array, not the raw samples.

### Related

- [Usage Guide](../usage.md)
- [API Reference](../api.md)
- [Gesture](/gesture/): pointer handles that produce the raw samples.
