---
title: 'Atlas: Usage Guide'
description: Drive a camera, index shapes in an R-tree, and hit-test points, marquee rects, and polygons with Atlas.
---

[[toc]]

## Basic Usage

Atlas is headless: it never touches the DOM or a canvas. You feed it input events and scene rectangles, and it answers where things are.

```ts
import { createCamera, createSpatialIndex } from '@vielzeug/atlas';

// Camera: (x, y) is the world point shown at the viewport centre.
const camera = createCamera({ initial: { x: 0, y: 0, zoom: 1 } });
camera.resize({ height: viewport.clientHeight, width: viewport.clientWidth });

// Screen → world for input handling.
const world = camera.toWorld({ x: event.offsetX, y: event.offsetY });

// World → screen for positioning DOM overlays.
const screen = camera.toScreen(shape.position);
```

## Coordinate Spaces

Atlas works in three spaces and never guesses between them:

- **Client space**: `PointerEvent.clientX/Y`. Subtract the viewport's `getBoundingClientRect()` offset before handing coordinates to the camera.
- **Screen space**: CSS pixels from the viewport element's top-left. `toWorld()` and `zoomAt()` take screen points. The camera learns this size through `resize()` — a `ResizeObserver` on the viewport element is the usual source.
- **World space**: your scene coordinates. `camera.matrix` maps world → screen; `zoom` is screen pixels per world unit.

Positive `rotation` is clockwise on screen (y grows downward) and is kept normalized to `(-π, π]`. `camera.matrix` uses Canvas2D element order `[a, b, c, d, e, f]`, so you can hand it straight to `ctx.setTransform()` (multiply by DPR first) or hand it to `toCssMatrix()` for DOM overlays. The getter is a cached composite recomputed only when the camera changes.

## Zooming to the Cursor

`zoomAt()` keeps the world point under a screen point fixed while the zoom changes — the standard infinite-canvas feel:

```ts
wheelElement.addEventListener('wheel', (event) => {
  const factor = Math.exp(-event.deltaY * 0.0015);
  camera.zoomAt({ x: event.offsetX, y: event.offsetY }, factor);
});
```

`rotateAt()` does the same for rotation. Both clamp against `minZoom`/`maxZoom` and still hold the anchor exactly at the clamp.

## Panning and Fitting

`panBy(dx, dy)` takes a screen-space delta; content follows the drag. `fitBounds()` frames a world rect inside the current viewport with optional padding, preserving the current rotation:

```ts
camera.panBy(event.movementX, event.movementY);
camera.fitBounds(selectionBounds, { padding: 48 });
```

Because `state.x`/`state.y` is the world point at the viewport centre, a saved camera state re-frames the same view on any screen size, and a zoom-only `animateTo({ zoom })` keeps the view centred where the user is looking.

## Animating the Camera

`animateTo()` interpolates position linearly and zoom in log space (multiplicative zoom feels linear to the eye). Rotation takes the shortest angular path. Pass an injectable scheduler to drive animations from your render loop or tests:

```ts
camera.animateTo(
  { x: 250, y: 100, zoom: 2 },
  {
    duration: 300,
    signal: controller.signal, // abort mid-flight; the animation stops where it is
  },
);
```

## Indexing the Scene

`createSpatialIndex()` is a dynamic R-tree keyed by ids. Index every shape by its world-space bounding box, then answer three questions fast: what is under this point, what does this marquee rect touch, and what is inside the viewport:

```ts
const index = createSpatialIndex(); // keys default to string

index.set(shape.id, shape.bounds); // insert, and again after every move
index.delete(shape.id); // on delete

// Viewport culling each frame.
const visibleIds = index.queryRect(camera.visibleRect);

// Marquee selection — the index returns ids; your own Map holds the data.
const selected = index.queryRect(marquee).map((id) => shapes.get(id));

// Hover: tolerance widens the point into a box for fat-finger targets.
const hovered = index.queryPoint(worldPoint, { tolerance: 4 / camera.state.zoom });
```

The index stores only ids and rects, so it can never hand back a stale copy of your data — call `set()` with the new rect after each committed move. Queries use closed intervals: touching edges count, and zero-area rects (lines, points) are findable. The R-tree is broad-phase only: it answers "bounding boxes overlap or touch". For exact hits on polygonal shapes, follow up with the narrow-phase helpers below.

## Exact Hit-Testing

```ts
import { pointNearPolygon, pointInPolygon } from '@vielzeug/atlas';

pointInPolygon(polygon, worldPoint); // even-odd ray cast
pointNearPolygon(polygon, worldPoint, 2); // inside OR within 2 units of the outline
```

Build the polygon from the shape's actual corners (rotate each point yourself with `apply()` if needed) and index its axis-aligned hull in the R-tree. `pointNearPolygon` is what a vector tool needs to hit-test a stroked (unfilled) shape: the outline band plus the interior both count.

## Snapping and Alignment

While a shape moves, one `snapRect()` call snaps it to nearby shapes, grid lines, and equal gaps, and returns the guides to draw on an overlay:

```ts
import { snapRect } from '@vielzeug/atlas';

const snap = snapRect(dragRect, {
  candidates: otherSelectedOutRects,
  grid: { x: 50, y: 50 },
  spacing: true, // opt into equal-gap spacing between neighbors
  threshold: 8,
});
const snapped = { ...dragRect, x: dragRect.x + snap.delta.x, y: dragRect.y + snap.delta.y };
// snap.guides: [{ axis, kind, position, from, to, marks? }] in world coordinates — draw them through the camera.
```

Each axis resolves independently to its nearest target within `threshold` among candidate anchors (left/center/right, top/center/bottom) and grid lines; the guide's `kind` says which one engaged. With `spacing: true`, an axis that found no target at all falls back to img.ly-style equal-gap centering: the rect centers itself between its nearest neighbors when the two gaps can be made equal within `threshold`. A candidate only counts as a neighbor when it overlaps the moving rect on the perpendicular axis, and both sides need one, so a lone shape never spacing-snaps.

Every guide carries `kind: 'grid' | 'object' | 'spacing'` so you can style them apart (dashed for grid, solid for objects, × marks at `marks` for spacing). `axis` is the axis the line is perpendicular to: an `axis: 'x'` guide is a vertical line at `position`, running from `from` to `to`. Spacing guides sit at the position the rect actually occupies after both axes snapped, so the marker lines up with the shape. On drop, commit `snapped` to your model so undo history records the final position, not the raw pointer position.

After a multi-select, align or distribute with the pure helpers and record one command:

```ts
import { alignRects, distributeRects } from '@vielzeug/atlas';

const aligned = alignRects(selectedRects, 'horizontal-center'); // copies, same order
const spread = distributeRects(selectedRects, 'x'); // equal gaps, outermost fixed
```

## Matrix Helpers

For custom transforms, the matrix functions use Canvas2D order and compose left-to-right like `ctx.transform()`:

```ts
import {
  apply,
  around,
  IDENTITY,
  invert,
  multiply,
  rotate,
  scale,
  scaleOf,
  toCssMatrix,
  translate,
} from '@vielzeug/atlas';

const transform = multiply(multiply(scale(2), rotate(Math.PI / 4)), translate(10, 5));
apply(transform, { x: 1, y: 0 }); // transformed point
invert(transform); // null for degenerate matrices
around({ x: 100, y: 100 }, scale(2)); // scale about a point, not the origin
scaleOf(transform); // average axis scale
toCssMatrix(transform); // 'matrix(...)' for CSS transforms
```

## Tile Grids

Tile and map editors live on a square grid. The `@vielzeug/atlas/grid` subpath converts between world coordinates and tile coordinates, and enumerates only the tiles a viewport can see:

```ts
import { iterateTileRange, tileCenter, tileKey, tileToRect, visibleTileRange, worldToTile } from '@vielzeug/atlas/grid';

const grid = { tileSize: 32 };

worldToTile({ x: 40, y: -1 }, grid); // { col: 1, row: -1 }
tileToRect({ col: 1, row: -1 }, grid); // { x: 32, y: -32, width: 32, height: 32 }
tileCenter({ col: 1, row: -1 }, grid); // { x: 48, y: -16 }

// Render loop: iterate the tiles intersecting the camera's world rect.
for (const coord of iterateTileRange(visibleTileRange(camera.visibleRect, grid))) {
  drawTile(coord);
}
```

`tileKey(coord)` yields the stable `"col:row"` string used by the FOV and fog APIs (and convenient as a `Map` key).

## Field of View and Fog

`computeFov()` runs recursive shadowcasting over the eight octants and returns the set of `tileKey` strings a viewer can see within a radius. Blocking tiles are visible but cast shadows behind themselves:

```ts
import { computeFov, createFog } from '@vielzeug/atlas/grid';

const fov = computeFov({ col: 10, row: 8 }, 6, { blocks: (c) => walls.has(`${c.col}:${c.row}`) });

const fog = createFog();
fog.update(fov); // demotes the previous frame's visible tiles to 'seen'
fog.state(tileKey({ col: 10, row: 8 })); // 'visible' | 'seen' | 'unseen'
saveGame(fog.exportState()); // serializable { seen, visible } key lists
```

`computeFov()` is pure and costs O(radius²) worst case; walls prune the walk. `createFog()` owns the three-state bookkeeping (`unseen` → `visible` → `seen`) over `tileKey` strings and round-trips through `exportState()`/`importState()` for save files. One `update(visibleKeys)` call per frame replaces the whole visible set — demote-then-reveal ordering is handled for you — and `fog.visible` is a `ReadonlySet<string>` of the current keys.

## Best Practices

- Subtract the viewport rect once at the input boundary; never mix client and screen coordinates inside camera calls.
- Call `camera.resize()` from a `ResizeObserver` on the viewport element; the camera cannot anchor zooms to the centre without knowing its size.
- Call `index.set(id, rect)` after every committed move — stale bounds silently break marquee and culling queries.
- Use `camera.visibleRect` (the world AABB of the rotated viewport) for culling; it is conservative by design, so no visible shape is ever dropped.
- Snap against the pre-move rect each pointer move (not the last snapped rect) so the delta stays relative to the raw pointer and snapping never drifts cumulatively.
- Dispose the camera when the editor unmounts; disposal aborts in-flight animations and turns every mutating method into a no-op. The spatial index owns no resources, so it needs no disposal.
