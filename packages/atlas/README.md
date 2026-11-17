# @vielzeug/atlas

> Spatial math, camera, and indexing primitives for 2D canvases

## Installation

```sh
pnpm add @vielzeug/atlas
npm install @vielzeug/atlas
yarn add @vielzeug/atlas
```

## Quick Start

```ts
import { createCamera, createSpatialIndex } from '@vielzeug/atlas';

const camera = createCamera();
camera.zoomAt({ x: 400, y: 300 }, 1.2); // world point under the cursor stays fixed

const index = createSpatialIndex();
index.insert('a', { height: 10, width: 10, x: 0, y: 0 });
index.queryRect(camera.visibleRect({ x: 800, y: 600 })); // viewport culling
```

## Features

- `createCamera()`: anchor-preserving zoom/rotate, screen-space pan, `fitBounds()`, rotated `visibleRect()`, and `animateTo()` with an injectable frame scheduler
- `createSpatialIndex()`: dynamic R-tree with `insert`/`update`/`remove`/`queryRect`/`queryPoint`
- Matrix helpers in Canvas2D element order, including `invert()` and `toCssMatrix()`
- Rect/AABB math: union, intersection, containment, inflation, bounds-from-points
- OBB math: corners, bounds, point-in-box, and SAT box-box intersection
- Narrow-phase geometry: `pointInPolygon`, `distanceToPolyline`, `pointNearPolygon`
- Snapping: `snapRect()` with candidate/grid targets and guide descriptors, `snapSpacing()` for equal-gap spacing guides, plus pure `alignRects()`/`distributeRects()`
- `@vielzeug/atlas/grid` subpath: square-tile coordinate math, viewport tile ranges, 8-octant shadowcasting `computeFov()`, and three-state `createFog()`
- Typed errors and the Vielzeug disposal contract throughout
- Zero runtime dependencies, no DOM requirement

## Documentation

- [Overview](https://vielzeug.dev/atlas/)
- [Usage Guide](https://vielzeug.dev/atlas/usage)
- [API Reference](https://vielzeug.dev/atlas/api)
- [Examples](https://vielzeug.dev/atlas/examples)
- [Migration Guide](https://vielzeug.dev/atlas/migration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu): part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
