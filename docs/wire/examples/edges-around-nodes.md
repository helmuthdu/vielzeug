---
title: 'Wire Examples: Edges Around Nodes'
description: 'Route edges around nodes and detect cycles in a small flow graph.'
---

## Edges Around Nodes

### Problem

You render a node graph as SVG and need wires that leave ports perpendicular to node edges, avoid crossing other nodes, and a validation pass that highlights cycles before execution.

### Solution

Use `bezierRoute()` for curved wires, `orthogonalRoute()` with every node bound as an obstacle for Manhattan wires, and `findCyclicGroups()` to flag loops:

```ts
import { bezierRoute, bezierToSvgPath, findCyclicGroups, orthogonalRoute, polylineToSvgPath } from '@vielzeug/wire';

const nodes = [
  { bounds: { height: 60, width: 140, x: 20, y: 20 }, id: 'a' },
  { bounds: { height: 60, width: 140, x: 20, y: 200 }, id: 'b' },
  { bounds: { height: 60, width: 140, x: 320, y: 110 }, id: 'c' },
];
const nodeBounds = nodes.map((node) => node.bounds);

// Curved wire: right port of 'a' into left port of 'c'.
const curved = bezierToSvgPath(bezierRoute({ side: 'right', x: 160, y: 50 }, { side: 'left', x: 320, y: 140 }));

// Manhattan wire from 'b' to 'c' that routes around 'a' if needed. Every node is
// an obstacle — the router exempts each port's own node for that port's exit.
const points = orthogonalRoute(
  { side: 'right', x: 160, y: 230 },
  { side: 'left', x: 320, y: 140 },
  { obstacles: nodeBounds },
);

const svg = document.querySelector('svg');
for (const d of [curved, points ? polylineToSvgPath(points) : null]) {
  if (!d) continue;
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', d);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', '#64748b');
  svg?.append(path);
}

// Validation: which nodes participate in a loop?
const groups = findCyclicGroups(
  nodes.map((node) => node.id),
  [
    { from: 'a', to: 'c' },
    { from: 'c', to: 'a' },
  ],
);
console.log('cyclic nodes:', groups.flat()); // ['a', 'c']
```

### Pitfalls

- Pass raw node bounds as obstacles and let `padding` supply the clearance; inflating the rects yourself applies the clearance twice. Routes may hug the padded boundary exactly, which looks glued without clearance.
- `orthogonalRoute()` returns `null` when blocked — always branch to a fallback (a dashed straight line is the editor convention) instead of assuming a path.
- `topologicalOrder()` throws on cycles; call `findCyclicGroups()` first when the graph may be user-edited.

### Related

- [Usage Guide](../usage.md)
- [API Reference](../api.md)
- [Atlas](/atlas/): spatial index to cull obstacles down to the route corridor.
