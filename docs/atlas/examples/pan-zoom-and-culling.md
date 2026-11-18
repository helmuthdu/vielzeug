---
title: 'Atlas Examples: Pan, Zoom and Culling'
description: 'Wire a pan/zoom camera and R-tree hit-testing for a simple canvas editor.'
---

## Pan, Zoom and Culling

### Problem

You are building a pan/zoom canvas and need the two halves every editor shares: a camera that converts screen input to world coordinates without drift, and a hit-test that stays fast as the scene grows.

### Solution

Create a camera and a spatial index, feed pointer input through the camera, and answer hover, marquee, and culling queries from the index.

```ts
import { createCamera, createSpatialIndex, type Rect } from '@vielzeug/atlas';

interface Shape {
  bounds: Rect;
  id: string;
}

const camera = createCamera({
  maxZoom: 10,
  minZoom: 0.1,
  viewport: { height: viewport.clientHeight, width: viewport.clientWidth },
});
const index = createSpatialIndex();
const shapes = new Map<string, Shape>();

// Wheel zoom anchored at the cursor (offsetX/Y are viewport-relative already).
viewport.addEventListener('wheel', (event) => {
  event.preventDefault();
  camera.zoomAt({ x: event.offsetX, y: event.offsetY }, Math.exp(-event.deltaY * 0.0015));
});

// Drag-to-pan on the background.
let panning = false;
viewport.addEventListener('pointerdown', () => (panning = true));
viewport.addEventListener('pointermove', (event) => {
  if (panning) camera.panBy(event.movementX, event.movementY);
});
viewport.addEventListener('pointerup', () => (panning = false));

// Hover: convert to world, then ask the index.
viewport.addEventListener('pointermove', (event) => {
  const world = camera.toWorld({ x: event.offsetX, y: event.offsetY });
  const hitId = index.queryPoint(world, { tolerance: 4 / camera.state.zoom })[0];
  viewport.style.cursor = hitId ? 'pointer' : 'default';
});

// Frame loop: cull to what the viewport can actually see.
function render(): void {
  for (const id of index.queryRect(camera.visibleRect)) draw(shapes.get(id), camera.matrix);
}
```

### Pitfalls

- `camera.state.x`/`camera.state.y` is the world point at the viewport centre — not a translation you add. Read `toScreen()`/`toWorld()` instead of composing offsets by hand, and keep the camera's size current with `camera.resize()` (a `ResizeObserver` on the viewport element).
- Pointer `clientX/clientY` are client-space: subtract `viewport.getBoundingClientRect()` before calling `toWorld()` or `zoomAt()`. `offsetX/offsetY` already are viewport-relative.
- After moving a shape, call `index.set(id, nextBounds)`; a stale index silently misses marquee and hover hits. The index holds ids only, so your `Map` of shapes is always the single source of truth.

### Related

- [Usage Guide](../usage.md)
- [API Reference](../api.md)
- [Gesture](/gesture/): pinch and wheel handles that drive `zoomAt()` from real multi-touch input.
