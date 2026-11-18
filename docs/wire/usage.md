---
title: 'Wire: Usage Guide'
description: Route bezier and orthogonal edges around nodes, serialize them as SVG paths, and order or validate node graphs with Wire.
---

[[toc]]

## Basic Usage

Wire is headless: it turns port positions, node bounds, and edge lists into path data and orderings. You own the rendering.

```ts
import { bezierRoute, bezierToSvgPath, orthogonalRoute, polylineToSvgPath, topologicalOrder } from '@vielzeug/wire';

// A curved wire from a right-facing port to a left-facing port.
const curve = bezierRoute({ side: 'right', x: 100, y: 40 }, { side: 'left', x: 320, y: 120 });
pathElement.setAttribute('d', bezierToSvgPath(curve));

// A Manhattan wire that routes around the node boxes.
const points = orthogonalRoute(
  { side: 'right', x: 100, y: 40 },
  { side: 'left', x: 320, y: 120 },
  { obstacles: nodeBounds },
);
if (points) pathElement.setAttribute('d', polylineToSvgPath(points));
```

Both routers return geometry — a `CubicBezier` and a waypoint array — and the two serializers in `path.ts` turn them into SVG `d` strings. Canvas renderers consume the geometry directly (`ctx.bezierCurveTo(curve.c1.x, ...)`).

## Port Sides

A port is a `Point` plus a required `side` naming the node edge it faces. `portAnchor()` computes that point from a node rect, so you never hand-derive "right side means `x + width`":

```ts
import { portAnchor } from '@vielzeug/wire';

// Middle of the node's right edge, facing right.
const out = portAnchor(nodeBounds, 'right'); // { side: 'right', x, y }
// Quarter along the top edge.
const top = portAnchor(nodeBounds, 'top', 0.25);
```

`bezierRoute()` extends each control point outward along its port's side, so wires leave and enter nodes perpendicular to the edge:

```ts
// Bottom port of A into top port of B (top-to-bottom flow).
bezierRoute({ side: 'bottom', x: 60, y: 100 }, { side: 'top', x: 60, y: 220 });
```

A free endpoint that is not on a node — the cursor while dragging a wire, say — picks a side explicitly: `{ ...cursor, side: 'left' }`, or computes the facing side with `floatingSide(nodeBounds, cursor)`.

## Routing Around Obstacles

`orthogonalRoute()` searches a visibility graph built from the obstacle corners with A\*, costing path length plus `bendPenalty` per bend — so among equally long routes, the one with fewer bends wins:

Pass every node's raw bounding box as `obstacles` — the same list for every edge. `padding` supplies the clearance, so do not inflate the rects yourself:

```ts
const points = orthogonalRoute(outPort, inPort, {
  bendPenalty: 12, // cost of one extra bend, in the same units as distance
  obstacles: nodes.map((node) => node.bounds),
  padding: 8, // keep routes this far from obstacle edges
});
```

Four contracts matter for editors:

- **Your own nodes are exempted for the exit only.** A port sits on its node's boundary, inside that node's padded obstacle. The router exempts the obstacles that contain a port for that port's straight exit segment; the rest of the route never enters any padded obstacle interior, including its own nodes. No per-edge filtering.
- **Unreachable returns `null`.** When a port's exit is blocked by another obstacle, or every route around the obstacles is sealed off, you get `null` — never a path through a wall. Show a dashed straight-line fallback while the user drags.
- **Port sides add stubs.** The route runs `stub` units (default 16) straight out of each port before bending, and straight into the target port, so wires leave and enter ports perpendicular to the node edge. Pass `stub: 0` to opt out; a port inside an obstacle still exits straight far enough to clear it.
- **Output is deterministic.** The same inputs always produce the same polyline, so edges don't shimmer between frames. The returned polyline carries waypoints only at bends.

Routes may hug the padded boundary exactly; raise `padding` if you want more clearance.

## Rounded Corners

`polylineToSvgPath()` accepts a `cornerRadius` that replaces each interior bend with a quadratic arc — orthogonal wires stop looking like pipe fittings with one option:

```ts
const points = orthogonalRoute(outPort, inPort, { obstacles: nodeBounds });
if (points) pathElement.setAttribute('d', polylineToSvgPath(points, { cornerRadius: 8 }));
```

The radius is clamped per corner to half of its shortest adjacent run, so a bend between two short runs simply rounds as much as fits instead of self-overlapping. The router itself never rounds: `orthogonalRoute()` keeps returning raw waypoints, and rounding stays a rendering decision you can toggle per zoom level or theme.

## Editing Geometry

Editors need to answer "what did the user click?" without invisible DOM hit targets. The edit helpers work on the geometry the routers already produce:

```ts
import { hitBezier, hitPolyline } from '@vielzeug/wire';

// World-space click, threshold scaled so the pick area is zoom-independent.
const threshold = 8 / camera.zoom;
const hit =
  edge.geometry.kind === 'bezier'
    ? hitBezier(edge.geometry.curve, worldPoint, { threshold })
    : hitPolyline(edge.geometry.points, worldPoint, { threshold });
if (hit) selectEdge(edge.id, hit.t); // t is normalized by arc length
```

`hit.t` and the matching `pointOnBezier()` / `pointOnPolyline()` are parameterized by arc length, so `t = 0.5` is always the midpoint of the drawn wire — useful for labels and drag handles regardless of how lopsided the underlying bezier handles are.

For arrowheads, `arrowhead()` returns the three triangle points capping a line at its tip; pass the arrival direction (any non-zero vector — it is normalized):

```ts
import { arrowhead, pointOnBezier } from '@vielzeug/wire';

const tip = curve.to;
const arriving = { x: tip.x - curve.c2.x, y: tip.y - curve.c2.y };
const [apex, left, right] = arrowhead(tip, arriving, { length: 8, width: 5 });
```

Two more routing-polish pieces round out editors:

- **`floatingSide(rect, toward)`** returns the rect side facing a point — the dominant axis from the rect center — so an edge can track the cursor across node sides without storing a fixed port side.
- **`selfLoop: true` on `bezierRoute()`** widens both handles to `1.5 ×` the port spacing when the endpoints share a side, so an edge from a node's `out` port back to its own `in` port bulges into a visible loop instead of collapsing onto the node edge.

## Ordering the Graph

`topologicalOrder()` returns node ids in dependency order. Ties break by position in the input array, so the same editor state always produces the same order:

```ts
const order = topologicalOrder(
  ['render', 'layout', 'parse'],
  [
    { from: 'parse', to: 'layout' },
    { from: 'layout', to: 'render' },
  ],
); // ['parse', 'layout', 'render']
```

A cyclic graph has no topological order and throws `WireGraphError`. For validation UI, use `findCyclicGroups()` instead — it returns each cyclic part once as a strongly connected component:

```ts
import { findCyclicGroups } from '@vielzeug/wire';

const groups = findCyclicGroups(nodeIds, edges);
// [['a', 'b']] — a two-node loop; a self-loop appears as [['a']].
```

A group is a _set_ of mutually reachable nodes, not a path through them — display it as `a, b`, not `a → b`. Highlight every node in a returned group; edges inside the group are the ones to flag.

## Best Practices

- Route during drag with cheap settings (or a straight dashed line) and run the full `orthogonalRoute()` on drop; A\* over a few hundred obstacles is fast, but not free at 60 fps for every edge.
- Feed only the obstacles near the edge's corridor, not the whole document — cull with an atlas spatial index for large graphs.
- Treat `topologicalOrder()` as the execution-order oracle for dataflow editors, and `findCyclicGroups()` as the validator that explains _why_ it threw.
- Round-trip path strings through `polylineToSvgPath()` and `bezierToSvgPath()` rather than assembling `d` strings by hand; they keep precision stable for diffing and serialization.
