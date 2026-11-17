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
| `snapRect()`                | Magnetic snapping with guide descriptors                 | Sync      | Each axis snaps independently to its nearest target        |
| `snapSpacing()`             | Equal-gap spacing snap between neighbors                 | Sync      | Needs a qualifying neighbor on both sides of the axis      |
| `alignRects()`              | Align rects to a shared edge or center                   | Sync      | Pure: returns new rects, input untouched                   |
| `distributeRects()`         | Equalize gaps along one axis                             | Sync      | Needs 3+ rects; outermost rects stay fixed                 |
| `AtlasError`                | Base class for all atlas errors                          | Sync      | Narrow with `instanceof AtlasError`                        |
| `AtlasConfigError`          | Invalid options, unknown ids, disposed usage             | Sync      | Thrown at call time                                        |
| `Point` / `Rect` / `Matrix` | Structural shapes shared across the canvas toolkit       | Sync      | All readonly; treat as values                              |

## Package Entry Point

| Import                 | Purpose                                                                    |
| ---------------------- | -------------------------------------------------------------------------- |
| `@vielzeug/atlas`      | Camera, spatial index, matrix/rect/OBB/geometry helpers, types, and errors |
| `@vielzeug/atlas/grid` | Square-tile math, recursive shadowcasting FOV, and fog-of-war state        |

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

## Snapping Functions

| Function                       | Description                                                                                    |
| ------------------------------ | ---------------------------------------------------------------------------------------------- |
| `snapRect(rect, options)`      | Snapped `{ delta, guides }` against candidate rects and grid lines                             |
| `snapSpacing(rect, options)`   | Snapped `{ delta, guides }` so gaps to the nearest neighbors on each axis are equal            |
| `alignRects(rects, edge)`      | Copies aligned to a shared `left`/`horizontal-center`/`right`/`top`/`vertical-center`/`bottom` |
| `distributeRects(rects, axis)` | Copies with equalized gaps along `'x'` or `'y'`                                                |

`snapRect` options: `candidates` (rects to snap to), `grid` (`{ x?, y? }` line spacing), `threshold` (max snap distance, default `8`). Anchors are the rect's left/center/right and top/center/bottom edges; each axis picks its nearest target within `threshold` (inclusive). A `SnapGuide` is `{ axis, kind, position, from, to }`: `axis` is the axis the guide line is perpendicular to, `kind` is `'grid'` or `'object'` (what the snap engaged, for dashed vs solid rendering), `position` is the world coordinate of the line, and `from`/`to` span the line along the other axis. `alignRects` and `distributeRects` are pure; distribution keeps the outermost rects fixed and returns input copies unchanged for fewer than three rects.

`snapSpacing` options: `candidates` (neighbor rects; the moving rect itself must not be included), `threshold` (max snap distance). A candidate counts as a neighbor on an axis only when it overlaps the moving rect on the perpendicular axis, and both sides need one. When the moving rect can be centered between its nearest left/right (or top/bottom) neighbors within `threshold`, that axis gets a delta. A `SpacingGuide` is `{ gapAxis, position, from, to, marks }`: `gapAxis` is the axis the equal gaps sit on (and the axis the delta applies to — note this is the opposite convention from `SnapGuide.axis`), the line runs along `gapAxis` from `from` to `to` at `position` (the moving rect's center on the perpendicular axis), and `marks` are the centers of the two equal gaps to draw as markers. Run it after `snapRect` and prefer the alignment snap on any axis where both engage.

---

## Grid Functions

From the `@vielzeug/atlas/grid` subpath:

| Function                               | Returns                                                                                                           |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `worldToTile(point, grid)`             | `TileCoord` (`{ col, row }`) containing the point (floor division)                                                |
| `tileToRect(coord, grid)`              | World `Rect` of the tile                                                                                          |
| `tileCenter(coord, grid)`              | World `Point` at the tile's centre                                                                                |
| `visibleTileRange(view, grid)`         | `TileRange` (`minCol/maxCol/minRow/maxRow`) intersecting a world rect                                             |
| `iterateTileRange(range)`              | Generator over every `TileCoord` in a range                                                                       |
| `tileKey(coord)`                       | Stable `"col:row"` string                                                                                         |
| `chunkOf(coord, chunkSize)`            | `{ cx, cy }` chunk the tile belongs to                                                                            |
| `chunkKey(coord, chunkSize)`           | `"cx,cy"` chunk key                                                                                               |
| `computeFov(origin, radius, options?)` | `Set<string>` of visible `tileKey`s (8-octant recursive shadowcasting)                                            |
| `createFog()`                          | Three-state fog tracker: `reveal`/`revealKeys`/`demote`/`hide`/`state`/`visibleKeys`, `exportState`/`importState` |

`grid` is `{ tileSize }` (positive; `worldToTile`/`tileToRect`/`tileCenter`/`visibleTileRange` throw `AtlasConfigError` otherwise, as do negative/non-integer `chunkSize` and a negative/non-integer FOV `radius`). `computeFov` options: `blocks(coord)` returns true when sight cannot pass through the tile; blocking tiles within range are themselves visible. The origin is always in the result. `TileCoord` is `{ col, row }`.

---

## Errors

| Class              | Thrown when                                                      |
| ------------------ | ---------------------------------------------------------------- |
| `AtlasError`       | Base class; catch-all via `instanceof AtlasError`                |
| `AtlasConfigError` | Invalid options/clamps, duplicate or unknown ids, disposed usage |
