---
title: 'Wire: Edge Routing for Node Editors'
description: Deterministic bezier and orthogonal edge routing over obstacles, plus topological ordering and cycle detection for node graphs.
package: wire
category: utilities
keywords:
  [
    edge-routing,
    node-editor,
    flowchart,
    bezier,
    orthogonal,
    manhattan,
    a-star,
    topological-sort,
    cycles,
    tarjan,
    graph,
    svg,
    path,
    dag,
  ]
exports: [bezierRoute, orthogonalRoute, topologicalOrder, findCyclicGroups]
related: [atlas]
environments: [browser, node, ssr, deno]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="wire" />

## Why Wire?

Node editors always rediscover the same hard parts: wires that route _around_ nodes instead of through them, bend counts that change every frame, and ordering or cycle checks that recurse until the stack dies on a big graph. Wire computes all of it as pure functions: cubic bezier geometry anchored to port sides, A\* Manhattan routes over a padded-obstacle visibility graph with a per-bend penalty, input-order-stable topological sorting, and Tarjan SCC cycle detection — iterative, so 50,000-node chains are fine.

```ts
// Before
// Straight lines through nodes, hand-rolled A* with nondeterministic tie
// breaks, and recursive DFS that stack-overflows on deep graphs.

// After
import { bezierRoute, findCyclicGroups, orthogonalRoute, topologicalOrder } from '@vielzeug/wire';

const curve = bezierRoute({ side: 'right', x: 100, y: 40 }, { side: 'left', x: 320, y: 120 });

// Pass every node bound; the router exempts each port's own node for its exit.
const waypoints = orthogonalRoute(fromPort, toPort, { obstacles: nodeBounds });
// waypoints is null when every route is blocked — render a dashed fallback.
```

| Feature                      | Wire                                         | Ad-hoc routing | Graph libraries    |
| ---------------------------- | -------------------------------------------- | -------------- | ------------------ |
| Bundle size                  | <PackageInfo package="wire" type="size" />   | n/a            | Typically 10–80 kB |
| External dependencies        | <ore-icon name="check" size="16"></ore-icon> | n/a            | Varies             |
| Obstacle-avoiding orthogonal | Built in (A\* + bend penalty)                | Rare           | Sometimes          |
| Deterministic output         | <ore-icon name="check" size="16"></ore-icon> | Rare           | Varies             |
| Iterative cycle detection    | <ore-icon name="check" size="16"></ore-icon> | Recursive DFS  | Varies             |
| Headless: no DOM or renderer | <ore-icon name="check" size="16"></ore-icon> | Varies         | Usually coupled    |

<div class="decision-callout">

**Use Wire when** you own the node layout and rendering but want production-grade edge geometry and graph ordering as pure functions.

**Consider a graph-drawing library when** you also want automatic layout (dagre-style ranking, force simulation) — Wire routes the edges you place, it does not place the nodes.

</div>

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/wire
```

```sh [npm]
npm install @vielzeug/wire
```

```sh [yarn]
yarn add @vielzeug/wire
```

:::

## Quick Start

```ts
import { bezierRoute, bezierToSvgPath, findCyclicGroups, orthogonalRoute, topologicalOrder } from '@vielzeug/wire';

// Curved wire from a right-facing port to a left-facing port.
const curve = bezierRoute({ side: 'right', x: 100, y: 40 }, { side: 'left', x: 320, y: 120 });
const d = bezierToSvgPath(curve); // or draw curve.c1/curve.c2 on a canvas

// Manhattan wire that avoids the node boxes.
const points = orthogonalRoute(
  { side: 'right', x: 100, y: 40 },
  { side: 'left', x: 320, y: 120 },
  { obstacles: nodeBounds },
);

// Execution order and cycles for a validation pass.
const order = topologicalOrder(
  ['b', 'a', 'c'],
  [
    { from: 'a', to: 'b' },
    { from: 'b', to: 'c' },
  ],
);
const groups = findCyclicGroups(
  ['a', 'b'],
  [
    { from: 'a', to: 'b' },
    { from: 'b', to: 'a' },
  ],
); // [['a', 'b']]
```

## Features

<div class="features-grid">

- `bezierRoute()`: cubic bezier geometry with control points anchored to port sides
- `orthogonalRoute()`: A\* Manhattan polyline over a visibility graph built from obstacle corners, with a per-bend penalty, owner-obstacle exemption, and deterministic expansion order
- `bezierToSvgPath()` / `polylineToSvgPath()`: SVG `d` serialization with micro-precision formatting
- `topologicalOrder()`: Kahn ordering with stable input-order tie breaks; throws `WireGraphError` on cycles
- `findCyclicGroups()`: iterative Tarjan SCCs — each cyclic group reported once, ordered deterministically
- `WireError` / `WireGraphError` / `WireConfigError`: typed errors
- Zero runtime dependencies, no DOM requirement: routes and orders are pure computations

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

- [Atlas](/atlas/): the camera and rect shapes Wire's obstacles reuse.

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
