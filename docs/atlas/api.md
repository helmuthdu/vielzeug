---
title: 'Atlas: API Reference'
description: API reference for the Atlas camera, spatial index, matrix, rect, OBB, and narrow-phase geometry helpers.
---

[[toc]]

## API Overview

| Symbol                      | Purpose                                                  | Execution | Common gotcha                                              |
| --------------------------- | -------------------------------------------------------- | --------- | ---------------------------------------------------------- |
| `createCamera()`            | Pan/zoom/rotate camera with anchor-preserving transforms | Sync      | `x`/`y` is the world point at the screen origin, not a pan |
| `createSpatialIndex()`      | Dynamic R-tree over world-space rects                    | Sync      | Broad-phase only: bounds overlap, not exact shape hits     |
| `multiply()` etc.           | Canvas2D-order matrix composition                        | Sync      | Element order is `[a,b,c,d,e,f]`, not row-major 3×3        |
| `rectFromPoints()`          | AABB of a point set                                      | Sync      | Returns `null` for empty input                             |
| `obbFromRect()`             | Rotated box around a rect's center                       | Sync      | Rotation pivots on the center, not the origin              |
| `pointInPolygon()`          | Even-odd ray-cast containment                            | Sync      | Boundary points are implementation-defined; add tolerance  |
| `distanceToPolyline()`      | Distance to the nearest segment                          | Sync      | Returns `Infinity` for empty paths                         |
| `AtlasError`                | Base class for all atlas errors                          | Sync      | Narrow with `instanceof AtlasError`                        |
| `AtlasConfigError`          | Invalid options, unknown ids, disposed usage             | Sync      | Thrown at call time                                        |
| `Point` / `Rect` / `Matrix` | Structural shapes shared across the canvas toolkit       | Sync      | All readonly; treat as values                              |

## Package Entry Point

| Import            | Purpose                                                                    |
| ----------------- | -------------------------------------------------------------------------- |
| `@vielzeug/atlas` | Camera, spatial index, matrix/rect/OBB/geometry helpers, types, and errors |

---

## Core Types

```ts
type Point = Readonly<{ x: number; y: number }>;
type Rect = Readonly<{ x: number; y: number; width: number; height: number }>;
/** Canvas2D/DOMMatrix element order: [a, b, c, d, e, f]. */
type Matrix = readonly [number, number, number, number, number, number];
```

---

## `createCamera()`

```ts
function createCamera(options?: CameraOptions): Camera;
```

Creates a mutable camera. `state.x`/`state.y` name the world point that maps to screen `(0, 0)`.

| Parameter | Type            | Description                                                         |
| --------- | --------------- | ------------------------------------------------------------------- |
| `options` | `CameraOptions` | `initial` state, `minZoom`/`maxZoom` clamps, injectable `scheduler` |

**Returns:** `Camera` handle.

**Example**

```ts
import { createCamera } from '@vielzeug/atlas';

const camera = createCamera({ initial: { zoom: 1.5 }, maxZoom: 8, minZoom: 0.1 });
camera.zoomAt({ x: 400, y: 300 }, 1.2);
```

Throws `AtlasConfigError` when clamps violate `0 < minZoom <= maxZoom` or initial coordinates are non-finite.

### Camera members

| Member                                                           | Description                                                                      |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `state`                                                          | Current `{ x, y, zoom, rotation }` (readonly snapshot)                           |
| `matrix` / `inverse`                                             | world → screen / screen → world matrices; `inverse` is `null` only if degenerate |
| `toScreen(p)` / `toWorld(p)`                                     | Point transforms                                                                 |
| `panBy(dx, dy)`                                                  | Screen-space pan; content follows the delta                                      |
| `zoomAt(screenPoint, factor)`                                    | Multiplicative zoom holding the world point under `screenPoint` fixed            |
| `rotateAt(screenPoint, delta)`                                   | Rotation (radians) holding the world point under `screenPoint` fixed             |
| `fitBounds(bounds, { size, padding? })`                          | Frame `bounds` in a viewport of `size` CSS px at current rotation                |
| `visibleRect(size)`                                              | World AABB of the rotated viewport, for culling                                  |
| `animateTo(target, options?)`                                    | Animate `{ x, y, zoom, rotation }`; replaces any running animation               |
| `stop()`                                                         | Cancel the running animation without completing it                               |
| `subscribe(listener, options?)`                                  | State-change listener; returns an unsubscribe function                           |
| `dispose()` / `disposed` / `disposalSignal` / `[Symbol.dispose]` | Vielzeug disposal contract; disposal aborts animations                           |

`AnimationOptions`: `duration` (ms, default 250), `easing` (default ease-in-out), `signal` (abort mid-flight), `onDone(completed)`. Zoom interpolates in log space; rotation takes the shortest angular path and lands normalized to `(-π, π]`.

`FrameScheduler`: `{ requestFrame, cancelFrame, now }`. Defaults to `requestAnimationFrame`/`performance.now()`; inject a fake one in tests.

---

## `createSpatialIndex()`

```ts
function createSpatialIndex<T>(options?: SpatialIndexOptions): SpatialIndex<T>;
```

Creates a dynamic R-tree (Guttman, quadratic split) keyed by string ids.

| Parameter | Type                  | Description                                  |
| --------- | --------------------- | -------------------------------------------- |
| `options` | `SpatialIndexOptions` | `maxEntriesPerNode` (integer ≥ 4, default 8) |

**Returns:** `SpatialIndex<T>` handle.

**Example**

```ts
import { createSpatialIndex } from '@vielzeug/atlas';

const index = createSpatialIndex<Shape>();
index.insert('a', { height: 10, width: 10, x: 0, y: 0 }, shape);
const hits = index.queryRect(marquee); // SpatialEntry<Shape>[]
```

### SpatialIndex members

| Member                                                           | Description                                                               |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `insert(id, rect, value?)`                                       | Add an entry; throws `AtlasConfigError` on duplicate ids                  |
| `update(id, rect)`                                               | Re-index an existing id; throws for unknown ids                           |
| `remove(id)`                                                     | `true` when removed, `false` when unknown                                 |
| `get(id)`                                                        | The `SpatialEntry` for an id, or `undefined`                              |
| `queryRect(rect)`                                                | Entries whose bounds overlap `rect` (touching edges do not count)         |
| `queryPoint(point, { tolerance? })`                              | Point expanded into a box of the given half-size (default 0)              |
| `clear()` / `size` / `bounds`                                    | Reset, entry count, aggregate bounds (`null` when empty)                  |
| `dispose()` / `disposed` / `disposalSignal` / `[Symbol.dispose]` | Disposal contract; post-dispose use throws on insert, queries return `[]` |

---

## Matrix Functions

All matrices use Canvas2D element order `[a, b, c, d, e, f]`; composition `multiply(a, b)` applies `a` first, then `b` (same order as chained `ctx.transform()` calls).

| Function                 | Description                                       |
| ------------------------ | ------------------------------------------------- |
| `IDENTITY`               | Frozen identity matrix                            |
| `multiply(a, b)`         | Compose two matrices                              |
| `apply(matrix, point)`   | Transform a point                                 |
| `translate(tx, ty)`      | Translation builder                               |
| `scale(sx, sy?)`         | Scale builder (`sy` defaults to `sx`)             |
| `rotate(radians)`        | Rotation builder; positive is clockwise on screen |
| `invert(matrix)`         | Inverse; `null` for zero determinant              |
| `around(anchor, matrix)` | `translate(anchor) · matrix · translate(-anchor)` |
| `scaleOf(matrix)`        | Average axis scale (0 for degenerate matrices)    |
| `toCssMatrix(matrix)`    | `matrix(...)` CSS value                           |

---

## Rect Functions

| Function                                                    | Description                                           |
| ----------------------------------------------------------- | ----------------------------------------------------- |
| `rectFromPoints(points)`                                    | AABB of a point set; `null` when empty                |
| `rectRight(rect)` / `rectBottom(rect)` / `rectCenter(rect)` | Edge and center accessors                             |
| `unionRect(a, b)`                                           | Smallest rect containing both                         |
| `intersectRect(a, b)`                                       | Overlap rect; `null` when disjoint or merely touching |
| `rectsIntersect(a, b)`                                      | Overlap test (same touching-edge rule)                |
| `containsRect(outer, inner)` / `containsPoint(rect, point)` | Inclusive containment tests                           |
| `inflateRect(rect, amount)`                                 | Grow every edge by `amount`                           |

---

## OBB Functions

| Function                            | Description                                          |
| ----------------------------------- | ---------------------------------------------------- |
| `obbFromRect(rect, rotation?)`      | Rotated box around `rect`'s center                   |
| `obbCorners(obb)`                   | Four corners, starting top-left of the unrotated box |
| `obbCenter(obb)` / `obbBounds(obb)` | Center point / axis-aligned hull                     |
| `pointInOBB(obb, point)`            | Containment in the rotated frame                     |
| `obbsIntersect(a, b)`               | Separating-axis test between two rotated boxes       |
| `rectIntersectsOBB(rect, obb)`      | Convenience wrapper: axis-aligned rect as an OBB     |

---

## Geometry Functions

| Function                                      | Description                                                 |
| --------------------------------------------- | ----------------------------------------------------------- |
| `pointInPolygon(polygon, point)`              | Even-odd ray-cast containment                               |
| `distanceToPolyline(path, point)`             | Distance to the nearest segment; `Infinity` for empty paths |
| `pointNearPolygon(polygon, point, tolerance)` | Inside the polygon OR within `tolerance` of its outline     |
| `boundsOf(points)`                            | AABB of a point set; `null` when empty                      |

---

## Errors

| Class              | Thrown when                                                      |
| ------------------ | ---------------------------------------------------------------- |
| `AtlasError`       | Base class; catch-all via `instanceof AtlasError`                |
| `AtlasConfigError` | Invalid options/clamps, duplicate or unknown ids, disposed usage |
