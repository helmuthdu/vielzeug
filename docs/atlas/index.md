---
title: 'Atlas: Spatial Math for 2D Canvases'
description: Camera transforms, matrix and rect math, polygon hit-testing, and a dynamic R-tree spatial index for infinite 2D canvases.
package: atlas
category: utilities
keywords:
  [
    camera,
    viewport,
    zoom,
    pan,
    matrix,
    rect,
    aabb,
    hit-testing,
    r-tree,
    spatial-index,
    culling,
    marquee,
    geometry,
    canvas,
  ]
exports: [createCamera, createSpatialIndex, multiply, invert, rectsIntersect, pointInPolygon, snapRect]
related: [gesture, ink, wire]
environments: [browser, node, ssr, deno]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="atlas" />

## Why Atlas?

Every infinite canvas re-implements the same three things badly: a camera that keeps the point under your cursor fixed while zooming, a hit-test that stops being O(n) once the scene grows, and selection and snapping math for moving rects. Atlas ships them as pure, headless primitives: a viewport-centred camera with anchor-preserving transforms and injectable animation scheduling, matrix/rect math, exact polygon narrow-phase, and a dynamic R-tree for O(log n) queries.

```ts
// Before
// Hand-rolled transform stacks, linear scans on every pointermove, and
// selection boxes that drift while zooming.

// After
import { createCamera, createSpatialIndex } from '@vielzeug/atlas';

const camera = createCamera();
camera.zoomAt({ x: 400, y: 300 }, 1.2); // world point under (400,300) stays put

const index = createSpatialIndex();
index.set('shape-1', { height: 40, width: 60, x: 12, y: 8 });
const hits = index.queryRect(camera.visibleRect); // viewport culling, returns ids
```

| Feature                               | Atlas                                        | Ad-hoc math | Full scene libraries |
| ------------------------------------- | -------------------------------------------- | ----------- | -------------------- |
| Bundle size                           | <PackageInfo package="atlas" type="size" />  | n/a         | Typically 20–100 kB  |
| External dependencies                 | <ore-icon name="check" size="16"></ore-icon> | n/a         | Varies               |
| Anchor-preserving zoom/rotate         | Built in                                     | Drifts      | Yes                  |
| Dynamic R-tree hit-testing            | Built in                                     | O(n) scans  | Yes                  |
| Headless: no DOM, canvas, or renderer | <ore-icon name="check" size="16"></ore-icon> | Varies      | Usually coupled      |

<div class="decision-callout">

**Use Atlas when** you own the render loop and scene model but want correct, tested camera, geometry, and spatial-query math without writing it yourself.

**Consider a full canvas engine when** you want a retained scene graph, built-in rendering, and event routing wholesale instead of headless primitives.

</div>

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/atlas
```

```sh [npm]
npm install @vielzeug/atlas
```

```sh [yarn]
yarn add @vielzeug/atlas
```

:::

## Quick Start

```ts
import { createCamera, createSpatialIndex } from '@vielzeug/atlas';

// state.x/y is the world point at the viewport centre
const camera = createCamera({ initial: { x: 0, y: 0, zoom: 1 } });
camera.resize({ height: 600, width: 800 });
camera.panBy(20, 0); // content follows the drag
camera.fitBounds({ height: 400, width: 600, x: -50, y: -50 }, { padding: 40 });

const index = createSpatialIndex();
index.set('a', { height: 10, width: 10, x: 0, y: 0 });
index.queryPoint({ x: 5, y: 5 }); // ['a']
```

## Features

<div class="features-grid">

- `createCamera()`: viewport-centred state, pan, anchor-preserving zoom/rotate, `fitBounds()`, rotated `visibleRect`, and `animateTo()` with an injectable frame scheduler
- `createSpatialIndex()`: dynamic R-tree (Guttman quadratic split) with `set`/`delete`/`get`/`queryRect`/`queryPoint` over ids
- Matrix helpers: `multiply`, `invert`, `apply`, `translate`, `scale`, `rotate`, `around`, `scaleOf`, `toCssMatrix` in Canvas2D element order
- Rect math: union, closed-interval intersection, containment, inflation, and bounds-from-points
- Snapping: `snapRect()` alignment/grid/equal-gap guides with `kind`-tagged targets, plus pure `alignRects()`/`distributeRects()`
- Narrow-phase geometry: `pointInPolygon`, `distanceToPolyline`, `pointNearPolygon` for exact stroke and polygon hit-testing
- `AtlasError` / `AtlasConfigError`: typed errors; the camera follows the Vielzeug disposal contract
- Zero runtime dependencies, no DOM requirement: works in Node, Workers, and SSR

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

- [Gesture](/gesture/): pinch and wheel handles feed `zoomAt()` and `panBy()` directly.
- [Ink](/ink/): stroke geometry whose bounds and outlines Atlas hit-tests.
- [Wire](/wire/): edge routing for node editors sharing the same world coordinates.

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
