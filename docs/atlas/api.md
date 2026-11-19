---
title: 'Atlas: API Reference'
description: API reference for the Atlas camera, spatial index, matrix, rect, frame, grid, and narrow-phase geometry helpers.
---

[[toc]]

## API Overview

| Symbol                               | Purpose                                                    | Execution | Common gotcha                                               |
| ------------------------------------ | ---------------------------------------------------------- | --------- | ----------------------------------------------------------- |
| `createCamera()`                     | Pan/zoom/rotate camera with anchor-preserving transforms   | Sync      | `x`/`y` is the world point at the viewport centre           |
| `createSpatialIndex()`               | Dynamic R-tree over world-space rects                      | Sync      | Broad-phase only: bounds overlap, not exact shape hits      |
| `multiply()` etc.                    | Canvas2D-order matrix composition                          | Sync      | Element order is `[a,b,c,d,e,f]`, not row-major 3×3         |
| `rectFromPoints()`                   | AABB of a point set                                        | Sync      | Returns `null` only for iterable input that may be empty    |
| `pointInPolygon()`                   | Even-odd ray-cast containment                              | Sync      | Boundary points are implementation-defined; add tolerance   |
| `distanceToPolyline()`               | Distance to the nearest segment                            | Sync      | Returns `Infinity` for empty paths                          |
| `snapRect()`                         | Alignment, grid, and equal-gap snapping with guides        | Sync      | Each axis resolves independently; alignment wins            |
| `alignRects()`                       | Align rects to a shared edge or center                     | Sync      | Pure: returns new rects, input untouched                    |
| `distributeRects()`                  | Equalize gaps along one axis                               | Sync      | Needs 3+ rects; outermost rects stay fixed                  |
| `frameMatrix()`                      | Local→world matrix for a positioned, rotated, scaled frame | Sync      | `origin` is a world pivot; defaults to `{ x, y }`           |
| `boundsOfFrame()`                    | AABB of a rect under a frame matrix                        | Sync      | Grows the bounds for rotation; not a tight oriented box     |
| `resizeRect()`                       | Resize a rect by dragging named edges                      | Sync      | `aspect` is width/height; corner drags derive the free axis |
| `AtlasError`                         | Base class for all atlas errors                            | Sync      | Narrow with `instanceof AtlasError`                         |
| `AtlasConfigError`                   | Invalid options and negative tolerances                    | Sync      | Thrown at call time                                         |
| `Point` / `Rect` / `Size` / `Matrix` | Structural shapes shared across the canvas toolkit         | Sync      | All readonly; treat as values                               |

## Package Entry Point

| Import                 | Purpose                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------ |
| `@vielzeug/atlas`      | Camera, spatial index, matrix/rect/geometry helpers, types, and errors               |
| `@vielzeug/atlas/grid` | Square-tile and hex math, grid topologies, A* pathfinding, FOV, and fog-of-war state |

---

## Core Types

```ts
type Point = Readonly<{ x: number; y: number }>;
type Size = Readonly<{ width: number; height: number }>;
type Rect = Readonly<{ x: number; y: number; width: number; height: number }>;
/** Canvas2D/DOMMatrix element order: [a, b, c, d, e, f]. */
type Matrix = readonly [number, number, number, number, number, number];
```

---

## `createCamera()`

```ts
function createCamera(options?: CameraOptions): Camera;
```

Creates a mutable camera. `state.x`/`state.y` name the world point at the **centre** of the viewport, so a saved state renders the same view on any screen size.

| Parameter | Type            | Description                                                                         |
| --------- | --------------- | ----------------------------------------------------------------------------------- |
| `options` | `CameraOptions` | `initial` state, `viewport` size in CSS px, `minZoom`/`maxZoom` clamps, `scheduler` |

**Returns:** `Camera` handle.

**Example**

```ts
import { createCamera } from '@vielzeug/atlas';

const camera = createCamera({
  initial: { zoom: 1.5 },
  maxZoom: 8,
  minZoom: 0.1,
  viewport: { height: 600, width: 800 },
});
camera.zoomAt({ x: 400, y: 300 }, 1.2);
```

Without `viewport` the camera starts at 0×0, where the centre is the origin; call `camera.resize()` once the real size is known (a `ResizeObserver` on the viewport element is the usual source).

Throws `AtlasConfigError` when clamps violate `0 < minZoom <= maxZoom` or initial coordinates are non-finite.

### Camera members

| Member                                                           | Description                                                           |
| ---------------------------------------------------------------- | --------------------------------------------------------------------- |
| `state`                                                          | Current `{ x, y, zoom, rotation }` (readonly snapshot)                |
| `viewport`                                                       | Current viewport `Size` in CSS px                                     |
| `matrix` / `inverse`                                             | world → screen / screen → world matrices; `inverse` is always defined |
| `toScreen(p)` / `toWorld(p)`                                     | Point transforms                                                      |
| `set(target)`                                                    | Jump to a partial state immediately, cancelling any animation         |
| `resize(size)`                                                   | Change the viewport size, keeping the world centre fixed              |
| `panBy(dx, dy)`                                                  | Screen-space pan; content follows the delta                           |
| `zoomAt(screenPoint, factor)`                                    | Multiplicative zoom holding the world point under `screenPoint` fixed |
| `rotateAt(screenPoint, delta)`                                   | Rotation (radians) holding the world point under `screenPoint` fixed  |
| `fitBounds(bounds, { padding? })`                                | Frame `bounds` in the current viewport at current rotation            |
| `visibleRect`                                                    | World AABB of the rotated viewport, for culling (getter)              |
| `animateTo(target, options?)`                                    | Animate `{ x, y, zoom, rotation }`; replaces any running animation    |
| `stop()`                                                         | Cancel the running animation without completing it                    |
| `subscribe(listener, options?)`                                  | State-change listener; returns an unsubscribe function                |
| `dispose()` / `disposed` / `disposalSignal` / `[Symbol.dispose]` | Vielzeug disposal contract; disposal aborts animations                |

Direct manipulation (`set`, `resize`, `panBy`, `zoomAt`, `rotateAt`, `fitBounds`) cancels a running `animateTo` first, so user input is never overwritten by the next animation frame. After `dispose`, every mutating method is a no-op and `subscribe` returns a no-op unsubscribe.

`AnimationOptions`: `duration` (ms, default 250), `easing` (default ease-in-out), `signal` (abort mid-flight; the animation stops where it is). Zoom interpolates in log space; rotation takes the shortest angular path and lands normalized to `(-π, π]`. A zoom-only animation keeps the viewport centre fixed.

`FrameScheduler`: `{ requestFrame, cancelFrame, now }`. Defaults to `requestAnimationFrame`/`performance.now()`; inject a fake one in tests.

---

## `createSpatialIndex()`

```ts
function createSpatialIndex<K = string>(options?: SpatialIndexOptions): SpatialIndex<K>;
```

Creates a dynamic R-tree (Guttman, quadratic split) keyed by ids. The index stores only ids and rects — you keep your data in your own `Map` and look it up from returned ids — so stored values can never go stale.

| Parameter | Type                  | Description                                  |
| --------- | --------------------- | -------------------------------------------- |
| `options` | `SpatialIndexOptions` | `maxEntriesPerNode` (integer ≥ 4, default 8) |

**Returns:** `SpatialIndex<K>` handle.

**Example**

```ts
import { createSpatialIndex } from '@vielzeug/atlas';

const shapes = new Map<string, Shape>();
const index = createSpatialIndex();
index.set('a', { height: 10, width: 10, x: 0, y: 0 });
const hits = index.queryRect(marquee); // string[] of ids
const shape = shapes.get(hits[0]);
```

### SpatialIndex members

| Member                              | Description                                                                         |
| ----------------------------------- | ----------------------------------------------------------------------------------- |
| `set(id, rect)`                     | Insert, or move an existing id; a no-op when the rect is unchanged                  |
| `delete(id)`                        | `true` when removed, `false` when unknown                                           |
| `get(id)`                           | The current `Rect` for an id, or `undefined`                                        |
| `has(id)`                           | Membership test                                                                     |
| `queryRect(rect)`                   | Ids whose bounds overlap **or touch** `rect` (closed intervals)                     |
| `queryPoint(point, { tolerance? })` | Ids within `tolerance` of `point` (default 0, inclusive); throws on negative values |
| `clear()` / `size` / `bounds`       | Reset, entry count, aggregate bounds (`null` when empty)                            |

Closed-interval semantics mean zero-area rects (lines, points) are findable: a horizontal line entry is returned by any query rect that crosses it. The index owns no resources, so it has no disposal contract — drop the reference when done.

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

| Function                                                    | Description                                                                    |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `rectFromPoints(points)`                                    | AABB of a point set; `null` for iterable input, non-null for a non-empty tuple |
| `rectRight(rect)` / `rectBottom(rect)` / `rectCenter(rect)` | Edge and center accessors                                                      |
| `unionRect(a, b)`                                           | Smallest rect containing both                                                  |
| `intersectRect(a, b)`                                       | Overlap rect; `null` only when disjoint; touching yields a zero-area rect      |
| `rectsIntersect(a, b)`                                      | Overlap-or-touch test (closed intervals)                                       |
| `containsRect(outer, inner)` / `containsPoint(rect, point)` | Inclusive containment tests                                                    |
| `inflateRect(rect, amount)`                                 | Grow every edge by `amount`                                                    |

`rectFromPoints` has two overloads: pass a literal non-empty tuple (`rectFromPoints([a, b])`) for a guaranteed `Rect`, or any `Iterable<Point>` for `Rect | null`.

---

## Frame Functions

A frame places a local shape in world space: a position, an optional clockwise rotation (radians), and an optional scale pivoting around a world `origin`.

```ts
function frameMatrix(options: FrameOptions): Matrix;
function boundsOfFrame(rect: Rect, matrix: Matrix): Rect;
function resizeRect(rect: Rect, edges: ResizeEdges, point: Point, options?: ResizeOptions): Rect;
```

| Function                                            | Description                                                                                                                                      |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `frameMatrix({ x, y, rotation?, scale?, origin? })` | Local→world matrix: `around(origin, rotate · scale) · translate(x, y)`; `origin` defaults to `{ x, y }`, `scale` is a number or `{ x?, y? }`     |
| `boundsOfFrame(rect, matrix)`                       | Axis-aligned world bounds: the AABB of the four transformed corners                                                                              |
| `resizeRect(rect, edges, point, { min?, aspect? })` | Resized rect dragging the edge(s) named by `edges` (`'e'`, `'w'`, `'n'`, `'s'`, or a corner like `'nw'`) to `point`; opposite edge(s) stay fixed |

`frameMatrix` composes the matrix helpers for the common positioned-shape case, so `apply(frameMatrix({ rotation, scale, x, y }), localPoint)` places a shape's local coordinates in the world. `boundsOfFrame` pairs with it for culling and selection: rotation grows the AABB, which is what a spatial index needs.

`resizeRect` is the resize-handle math for editors. `min` (default 0) keeps the result from collapsing on either axis. `aspect` (width/height) locks the ratio: a corner drag derives the free axis from the axis that moved further, an edge drag grows the free dimension about its centre.

```ts
import { boundsOfFrame, frameMatrix, resizeRect } from '@vielzeug/atlas';

const frame = frameMatrix({ rotation: Math.PI / 6, scale: 2, x: 100, y: 50 });
boundsOfFrame({ height: 40, width: 100, x: 0, y: 0 }, frame); // world AABB
resizeRect(selection, 'se', worldPointer, { min: 4 }); // drag the bottom-right corner
```

All three throw `AtlasConfigError` on non-finite inputs; `resizeRect` also throws for unknown `edges`, a negative `min`, or a non-positive `aspect`.

---

## Geometry Functions

| Function                                      | Description                                                                 |
| --------------------------------------------- | --------------------------------------------------------------------------- |
| `pointInPolygon(polygon, point)`              | Even-odd ray-cast containment                                               |
| `distanceToPolyline(path, point)`             | Distance to the nearest segment; `Infinity` for empty paths                 |
| `pointNearPolygon(polygon, point, tolerance)` | Inside the polygon OR within `tolerance` of its outline; throws on negative |

---

## Snapping Functions

| Function                       | Description                                                                                    |
| ------------------------------ | ---------------------------------------------------------------------------------------------- |
| `snapRect(rect, options)`      | Snapped `{ delta, guides }` against candidate rects, grid lines, and equal gaps                |
| `alignRects(rects, edge)`      | Copies aligned to a shared `left`/`horizontal-center`/`right`/`top`/`vertical-center`/`bottom` |
| `distributeRects(rects, axis)` | Copies with equalized gaps along `'x'` or `'y'`                                                |

`snapRect` options: `candidates` (rects to snap to; the moving rect itself must not be included), `grid` (`{ x?, y? }` line spacing), `spacing` (enable equal-gap centering, default `false`), `threshold` (max snap distance; throws `AtlasConfigError` when negative). Each axis resolves independently to its nearest target within `threshold` (inclusive) among candidate anchors (left/center/right, top/center/bottom) and grid lines; the guide's `kind` reports which one engaged. When no target engaged on an axis, `spacing: true` centers the rect between its nearest neighbors when the two gaps can be made equal within `threshold`. A candidate counts as a neighbor only when it overlaps the moving rect on the perpendicular axis, and both sides need one.

A `SnapGuide` is `{ axis, kind, position, from, to, marks? }`: `axis` is the axis the guide line is perpendicular to, `kind` is `'grid'`, `'object'`, or `'spacing'` (what the snap engaged, for dashed vs solid rendering), `position` is the world coordinate of the line, and `from`/`to` span the line along the other axis. Spacing guides sit at the position the rect actually occupies after both axes snapped, and carry `marks`: the centers of the two equal gaps, to draw as × markers. `alignRects` and `distributeRects` are pure; distribution keeps the outermost rects fixed and returns input copies unchanged for fewer than three rects.

---

## Grid Functions

From the `@vielzeug/atlas/grid` subpath. Square tiles:

| Function                               | Returns                                                                                         |
| -------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `worldToTile(point, grid)`             | `TileCoord` (`{ col, row }`) containing the point (floor division)                              |
| `tileToRect(coord, grid)`              | World `Rect` of the tile                                                                        |
| `tileCenter(coord, grid)`              | World `Point` at the tile's centre                                                              |
| `visibleTileRange(view, grid)`         | `TileRange` (`minCol/maxCol/minRow/maxRow`) intersecting a world rect                           |
| `iterateTileRange(range)`              | Generator over every `TileCoord` in a range                                                     |
| `tileKey(coord)`                       | Stable `"col:row"` string                                                                       |
| `computeFov(origin, radius, options?)` | `Set<string>` of visible `tileKey`s (8-octant recursive shadowcasting)                          |
| `createFog()`                          | Three-state fog tracker over tile keys: `update`/`state`/`visible`, `exportState`/`importState` |

`grid` is `{ tileSize }` (positive; `worldToTile`/`tileToRect`/`tileCenter`/`visibleTileRange` throw `AtlasConfigError` otherwise, as does a negative/non-integer FOV `radius`). `computeFov` options: `blocks(coord)` returns true when sight cannot pass through the tile; blocking tiles within range are themselves visible. The origin is always in the result. `TileCoord` is `{ col, row }`. `createFog()` stores `tileKey` strings, so a `computeFov` result feeds `fog.update()` directly: one call demotes the previously visible tiles to `seen` and marks the new keys `visible`. `fog.visible` is a `ReadonlySet<string>`.

Hexes (axial coordinates, `HexCoord` = `{ q, r }`; `HexLayout` = `{ orientation: 'flat' | 'pointy', size }` where `size` is the centre-to-corner radius):

| Function                               | Returns                                                                             |
| -------------------------------------- | ----------------------------------------------------------------------------------- |
| `hexToWorld(coord, layout)`            | World `Point` at the hex's centre                                                   |
| `worldToHex(point, layout)`            | `HexCoord` whose centre is nearest the point (exact inverse of `hexToWorld`)        |
| `hexCorners(coord, layout)`            | The six corner `Point`s, clockwise                                                  |
| `hexKey(coord)`                        | Stable `"q:r"` string                                                               |
| `hexDistance(a, b)`                    | Hex steps between two hexes                                                         |
| `hexNeighbors(coord)`                  | The six adjacent hexes (`HEX_DIRECTIONS` is the direction set, clockwise from east) |
| `hexRange(center, radius)`             | Every hex within `radius` steps, centre included                                    |
| `hexLine(a, b)`                        | The hexes a straight walk crosses, both ends included; symmetric under reversal     |
| `visibleHexes(view, layout)`           | Every `HexCoord` overlapping a world `Rect` (culling for render loops)              |
| `computeHexFov(origin, radius, opts?)` | `Set<string>` of visible `hexKey`s along unobstructed `hexLine`s                    |

`computeHexFov` blocks sight on the `hexLine` between origin and target; a blocking hex is itself visible when the path to it is clear.

### Topologies and pathfinding

A `GridTopology<C>` is the four facts a search needs about a grid: `distance`, `key`, `line`, and `neighbors` over cells of type `C`. `squareTopology({ diagonal? })` builds one for square tiles (4-way Manhattan by default, 8-way Chebyshev with `diagonal: true`; `line` is supercover, so a sight line never skips a corner tile). `hexTopology` is the fixed hex instance.

| Function                            | Returns                                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------------------------ |
| `squareTopology(options?)`          | `GridTopology<TileCoord>` for square tiles                                                       |
| `hexTopology`                       | The `GridTopology<HexCoord>` instance                                                            |
| `findPath(start, goal, options)`    | The cheapest cell path (`C[]`, both ends included), or `null` when blocked or unreachable        |
| `reachable(start, budget, options)` | `Map<key, { cost, prev }>` of every cell enterable within `budget`, with predecessors for routes |

`findPath` is A* and `reachable` a Dijkstra flood; both take `SearchOptions<C>`: `passable(coord)` gates entry (the start is queried too), `cost(coord)` prices entry (default 1, positive and finite), `topology` supplies adjacency and the heuristic. `findPath` accepts an optional `maxCost` cap and returns `null` when an endpoint is impassable or the goal unreachable. `reachable` charges entry costs against `budget` (the start cell is free) and keys results by `topology.key`, so `prev` chains rebuild routes.

The search space must be finite: `passable` has to reject the cells beyond the world's edge, or a search for an unreachable goal expands forever.

```ts
import { findPath, hexTopology } from '@vielzeug/atlas/grid';

const route = findPath(
  { q: 0, r: 0 },
  { q: 4, r: -2 },
  {
    passable: (hex) => Math.abs(hex.q) <= 10 && Math.abs(hex.r) <= 10 && !walls.has(`${hex.q}:${hex.r}`),
    topology: hexTopology,
  },
); // [{ q: 0, r: 0 }, …, { q: 4, r: -2 }] or null
```

---

## Errors

| Class              | Thrown when                                                                     |
| ------------------ | ------------------------------------------------------------------------------- |
| `AtlasError`       | Base class; catch-all via `instanceof AtlasError`                               |
| `AtlasConfigError` | Invalid options/clamps, negative snap or query tolerances, and bad frame inputs |
