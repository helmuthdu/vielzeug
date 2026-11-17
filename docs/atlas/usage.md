---
title: 'Atlas: Usage Guide'
description: Drive a camera, index shapes in an R-tree, and hit-test points, marquee rects, and rotated boxes with Atlas.
---

[[toc]]

## Basic Usage

Atlas is headless: it never touches the DOM or a canvas. You feed it input events and scene rectangles, and it answers where things are.

```ts
import { createCamera, createSpatialIndex } from '@vielzeug/atlas';

// Camera: (x, y) is the world point shown at the viewport origin.
const camera = createCamera({ initial: { x: 0, y: 0, zoom: 1 } });

// Screen → world for input handling.
const world = camera.toWorld({ x: event.offsetX, y: event.offsetY });

// World → screen for positioning DOM overlays.
const screen = camera.toScreen(shape.position);
```

## Coordinate Spaces

Atlas works in three spaces and never guesses between them:

- **Client space**: `PointerEvent.clientX/Y`. Subtract the viewport's `getBoundingClientRect()` offset before handing coordinates to the camera.
- **Screen space**: CSS pixels from the viewport element's top-left. `toWorld()` and `zoomAt()` take screen points.
- **World space**: your scene coordinates. `camera.matrix` maps world → screen; `zoom` is screen pixels per world unit.

Positive `rotation` is clockwise on screen (y grows downward). `camera.matrix` uses Canvas2D element order `[a, b, c, d, e, f]`, so you can hand it straight to `ctx.setTransform()` (multiply by DPR first) or to `toCssMatrix()` for DOM overlays.

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

`panBy(dx, dy)` takes a screen-space delta; content follows the drag. `fitBounds()` frames a world rect inside a viewport size with optional padding, preserving the current rotation:

```ts
camera.panBy(event.movementX, event.movementY);
camera.fitBounds(selectionBounds, { padding: 48, size: { x: 800, y: 600 } });
```

## Animating the Camera

`animateTo()` interpolates position linearly and zoom in log space (multiplicative zoom feels linear to the eye). Rotation takes the shortest angular path. Pass an injectable scheduler to drive animations from your render loop or tests:

```ts
camera.animateTo(
  { x: 250, y: 100, zoom: 2 },
  {
    duration: 300,
    signal: controller.signal, // abort mid-flight; onDone receives false
    onDone: (completed) => console.log(completed),
  },
);
```

## Indexing the Scene

`createSpatialIndex()` is a dynamic R-tree. Index every shape by its world-space bounding box, then answer three questions fast: what is under this point, what does this marquee rect touch, and what is inside the viewport:

```ts
const index = createSpatialIndex<Shape>();

index.insert(shape.id, shape.bounds, shape); // once per shape
index.update(shape.id, nextBounds); // after every move
index.remove(shape.id); // on delete

// Viewport culling each frame.
const visible = index.queryRect(camera.visibleRect(viewportSize));

// Marquee selection.
const selected = index.queryRect(marquee).map((entry) => entry.id);

// Hover: tolerance widens the point into a box for fat-finger targets.
const hovered = index.queryPoint(worldPoint, { tolerance: 4 / camera.state.zoom });
```

The R-tree is broad-phase only: it answers "bounding boxes overlap". For exact hits on rotated or polygonal shapes, follow up with the narrow-phase helpers below.

## Exact Hit-Testing

```ts
import { obbFromRect, pointInOBB, pointNearPolygon, pointInPolygon, rectIntersectsOBB } from '@vielzeug/atlas';

// Rotated rectangles (OBB).
const box = obbFromRect({ height: 40, width: 120, x: 10, y: 10 }, Math.PI / 6);
pointInOBB(box, worldPoint);
rectIntersectsOBB(marquee, box);

// Polygons and stroked paths.
pointInPolygon(polygon, worldPoint); // even-odd ray cast
pointNearPolygon(polygon, worldPoint, 2); // inside OR within 2 units of the outline
```

`pointNearPolygon` is what a vector tool needs to hit-test a stroked (unfilled) shape: the outline band plus the interior both count.

## Snapping and Alignment

While a shape moves, snap it to nearby shapes and grid lines, and draw the returned guides on an overlay:

```ts
import { snapRect } from '@vielzeug/atlas';

const snap = snapRect(dragRect, { candidates: otherSelectedOutRects, grid: { x: 50, y: 50 }, threshold: 8 });
const snapped = { ...dragRect, x: dragRect.x + snap.delta.x, y: dragRect.y + snap.delta.y };
// snap.guides: [{ axis, kind, position, from, to }] in world coordinates — draw them through the camera.
```

Each axis snaps independently to its nearest anchor (left/center/right, top/center/bottom) within `threshold`. On drop, commit `snapped` to your model so undo history records the final position, not the raw pointer position.

For img.ly-style spacing hints, run `snapSpacing` on the same drag and prefer the alignment snap where both engage. It centers the moving rect between its nearest neighbors when the two gaps can be made equal within `threshold`:

```ts
import { snapRect, snapSpacing } from '@vielzeug/atlas';

const align = snapRect(dragRect, { candidates, grid: { x: 50, y: 50 }, threshold: 8 });
const spacing = snapSpacing(dragRect, { candidates, threshold: 8 });
const delta = {
  x: align.delta.x !== 0 ? align.delta.x : spacing.delta.x,
  y: align.delta.y !== 0 ? align.delta.y : spacing.delta.y,
};
// spacing.guides: [{ gapAxis, position, from, to, marks }] — draw the line and an × at each mark.
```

A candidate only counts as a neighbor when it overlaps the moving rect on the perpendicular axis, and both sides need one, so a lone shape never spacing-snaps.

After a multi-select, align or distribute with the pure helpers and record one command:

```ts
import { alignRects, distributeRects } from '@vielzeug/atlas';

const aligned = alignRects(selectedRects, 'horizontal-center'); // copies, same order
const spread = distributeRects(selectedRects, 'x'); // equal gaps, outermost fixed
```

## Matrix Helpers

For custom transforms, the matrix functions use Canvas2D order and compose left-to-right like `ctx.transform()`:

```ts
import { apply, IDENTITY, invert, multiply, rotate, scale, toCssMatrix, translate } from '@vielzeug/atlas';

const transform = multiply(multiply(scale(2), rotate(Math.PI / 4)), translate(10, 5));
apply(transform, { x: 1, y: 0 }); // transformed point
invert(transform); // null for degenerate matrices
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
for (const coord of iterateTileRange(visibleTileRange(camera.visibleRect(), grid))) {
  drawTile(coord);
}
```

`tileKey(coord)` yields the stable `"col:row"` string used by the FOV and fog APIs (and convenient as a `Map` key). `chunkOf()`/`chunkKey()` group tiles into fixed-size chunks for streaming or caching chunked tile data.

## Field of View and Fog

`computeFov()` runs recursive shadowcasting over the eight octants and returns the set of `tileKey` strings a viewer can see within a radius. Blocking tiles are visible but cast shadows behind themselves:

```ts
import { computeFov, createFog } from '@vielzeug/atlas/grid';

const fov = computeFov({ col: 10, row: 8 }, 6, { blocks: (c) => walls.has(`${c.col}:${c.row}`) });

const fog = createFog();
fog.demote(); // last frame's visible tiles become 'seen'
fog.revealKeys(fov); // keys currently in view are 'visible'
fog.state({ col: 10, row: 8 }); // 'visible' | 'seen' | 'unseen'
saveGame(fog.exportState()); // serializable { seen, visible } key lists
```

`computeFov()` is pure and costs O(radius²) worst case; walls prune the walk. `createFog()` owns the three-state bookkeeping (`unseen` → `visible` → `seen`) and round-trips through `exportState()`/`importState()` for save files. `hide()` returns tiles to `unseen`.

## Best Practices

- Subtract the viewport rect once at the input boundary; never mix client and screen coordinates inside camera calls.
- Call `index.update()` after every committed move — stale bounds silently break marquee and culling queries.
- Use `visibleRect()` (the world AABB of the rotated viewport) for culling; it is conservative by design, so no visible shape is ever dropped.
- Snap against the pre-move rect each pointer move (not the last snapped rect) so the delta stays relative to the raw pointer and snapping never drifts cumulatively.
- Dispose the camera and index when the editor unmounts: both follow the Vielzeug disposal contract, and disposal aborts in-flight animations.
