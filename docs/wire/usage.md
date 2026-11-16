---
title: 'Wire: Usage Guide'
description: Route bezier and orthogonal edges around nodes, serialize them as SVG paths, and order or validate node graphs with Wire.
---

[[toc]]

## Basic Usage

Wire is headless: it turns port positions, node bounds, and edge lists into path data and orderings. You own the rendering.

```ts
import { bezierRoute, orthogonalRoute, polylineToSvgPath, topologicalOrder } from '@vielzeug/wire';

// A curved wire from a right-facing port to a left-facing port.
const d = bezierRoute({ side: 'right', x: 100, y: 40 }, { side: 'left', x: 320, y: 120 });
pathElement.setAttribute('d', d);

// A Manhattan wire that routes around the node boxes.
const points = orthogonalRoute({ x: 100, y: 40 }, { x: 320, y: 120 }, { obstacles: nodeBounds });
if (points) pathElement.setAttribute('d', polylineToSvgPath(points));
```

## Port Sides

A port is a `Point` plus an optional `side` naming the node edge it faces. `bezierRoute()` extends each control point outward along its port's side, so wires leave and enter nodes perpendicular to the edge:

```ts
// Bottom port of A into top port of B (top-to-bottom flow).
bezierRoute({ side: 'bottom', x: 60, y: 100 }, { side: 'top', x: 60, y: 220 });
```

When `side` is omitted, `from` defaults to `right` and `to` to `left`, matching left-to-right pipelines.

## Routing Around Obstacles

`orthogonalRoute()` searches a visibility graph built from the obstacle corners with A\*, costing path length plus `bendPenalty` per bend — so among equally long routes, the one with fewer bends wins:

```ts
const points = orthogonalRoute(fromPort, toPort, {
  bendPenalty: 12, // cost of one extra bend, in the same units as distance
  obstacles: nodes.map((node) => ({ ...node.bounds, x: node.bounds.x - 4, y: node.bounds.y - 4 })),
  padding: 8, // keep routes this far from obstacle edges
});
```

Two contracts matter for editors:

- **Unreachable returns `null`.** When every route is blocked (a port inside another node, a sealed ring), you get `null` — never a path through a wall. Show a dashed straight-line fallback while the user drags.
- **Exclude the edge's own nodes from `obstacles`.** An endpoint inside a padded obstacle is blocked, so a route whose source node is also its own obstacle returns `null`. Filter the two endpoints' nodes out of the obstacle list.
- **Output is deterministic.** The same inputs always produce the same polyline, so edges don't shimmer between frames. The returned polyline carries waypoints only at bends.

Inflate node bounds before passing them as obstacles if you want clearance beyond `padding`; routes may hug the padded boundary exactly.

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

A cyclic graph has no topological order and throws `WireGraphError`. For validation UI, use `findCycles()` instead — it returns each cycle once as a strongly connected component:

```ts
import { findCycles } from '@vielzeug/wire';

const cycles = findCycles(nodeIds, edges);
// [['a', 'b']] — a two-node loop; a self-loop appears as [['a']].
```

Highlight every node in a returned component; edges inside the component are the ones to flag.

## Best Practices

- Route during drag with cheap settings (or a straight dashed line) and run the full `orthogonalRoute()` on drop; A\* over a few hundred obstacles is fast, but not free at 60 fps for every edge.
- Feed only the obstacles near the edge's corridor, not the whole document — cull with an atlas spatial index for large graphs.
- Treat `topologicalOrder()` as the execution-order oracle for dataflow editors, and `findCycles()` as the validator that explains _why_ it threw.
- Round-trip path strings through `polylineToSvgPath()` rather than assembling `d` strings by hand; it keeps precision stable for diffing and serialization.
