---
title: 'Atlas Examples: Hex Grids and Pathfinding'
description: 'Render a hex map and move a unit across it with findPath and reachable.'
---

## Hex Grids and Pathfinding

### Problem

You are building a tactics map on hexes: the world must render only the hexes on screen, clicks must resolve to the hex under the cursor, and a unit must walk around walls within its movement budget.

### Solution

One `HexLayout` drives geometry, `visibleHexes` culls the render loop, `worldToHex` hit-tests input, and `findPath`/`reachable` move the unit. All of it is pure math — no DOM required.

```ts
import {
  findPath,
  hexCorners,
  hexToWorld,
  reachable,
  hexTopology,
  visibleHexes,
  worldToHex,
} from '@vielzeug/atlas/grid';

const layout = { orientation: 'pointy', size: 30 } as const;
const WORLD_RADIUS = 24;
const walls = new Set(['2:-1', '2:0', '2:1']);

// The world is bounded: passable must reject cells beyond the edge, or an
// unreachable goal makes the search expand forever.
const passable = (hex: { q: number; r: number }) =>
  Math.abs(hex.q) <= WORLD_RADIUS && Math.abs(hex.r) <= WORLD_RADIUS && !walls.has(`${hex.q}:${hex.r}`);

// Render loop: only the hexes overlapping the camera's visible rect.
for (const hex of visibleHexes(camera.visibleRect, layout)) {
  ctx.beginPath();
  for (const [i, corner] of hexCorners(hex, layout).entries()) {
    if (i === 0) ctx.moveTo(corner.x, corner.y);
    else ctx.lineTo(corner.x, corner.y);
  }
  ctx.closePath();
  ctx.fill();
}

// Click: the hex under the cursor (offsetX/Y are canvas-relative).
const target = worldToHex({ x: event.offsetX, y: event.offsetY }, layout);

// Walk there, or as close as the movement budget allows.
const route = findPath({ q: -4, r: 0 }, target, { passable, topology: hexTopology });
if (route) walk(route); // [{ q: -4, r: 0 }, ..., target] — null means unreachable

// Highlight the movement range: every cell a move-3 unit can enter, with cost.
const range = reachable({ q: -4, r: 0 }, 3, { passable, topology: hexTopology });
for (const [key, entry] of range) highlight(key, entry.cost);
```

### Pitfalls

- `worldToHex` is the exact inverse of `hexToWorld`, so a hex's centre always resolves back to itself; no epsilon is needed.
- The same `findPath` call works on square tiles by swapping `hexTopology` for `squareTopology()` and the `{ q, r }` cells for `{ col, row }` — the search only knows the topology's four facts.
- `reachable` returns each cell's `prev`, so the walked route to any highlighted cell is a predecessor walk; you do not need a second `findPath` per cell.
- Costs are per entry (`cost` option, default 1), so swamp tiles are `cost: (hex) => swamp.has(key(hex)) ? 2 : 1` — the budget then counts movement points, not steps.
- FOV works the same way: `computeHexFov(origin, radius, { blocks })` returns the `hexKey` set a viewer sees; feed it to your own fog bookkeeping or to `createFog()` on square grids.

### Related

- [Pan, Zoom and Culling](./pan-zoom-and-culling.md) — the camera the render loop reads from
- [Usage: Hex Grids](../usage.md#hex-grids) — the layout and grid primitives in context
- [Usage: Topologies and Pathfinding](../usage.md#topologies-and-pathfinding) — costs, floods, and bounded worlds
- [API Reference](../api.md) — full signatures for `findPath`, `reachable`, and the hex functions
