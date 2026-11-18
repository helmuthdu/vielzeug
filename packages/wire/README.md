# @vielzeug/wire

> Edge routing and graph ordering for node editors

## Installation

```sh
pnpm add @vielzeug/wire
npm install @vielzeug/wire
yarn add @vielzeug/wire
```

## Quick Start

```ts
import { bezierRoute, bezierToSvgPath, findCyclicGroups, orthogonalRoute, topologicalOrder } from '@vielzeug/wire';

const curve = bezierRoute({ side: 'right', x: 100, y: 40 }, { side: 'left', x: 320, y: 120 });
const d = bezierToSvgPath(curve);
const points = orthogonalRoute(
  { side: 'right', x: 100, y: 40 },
  { side: 'left', x: 320, y: 120 },
  { obstacles: nodeBounds },
);
const order = topologicalOrder(['b', 'a'], [{ from: 'a', to: 'b' }]);
```

## Features

- `bezierRoute()`: cubic bezier geometry anchored to port sides
- `orthogonalRoute()`: deterministic A\* Manhattan routing over a padded-obstacle visibility graph with a per-bend penalty and owner-obstacle exemption; `null` when unreachable
- `portAnchor()`: world position of a port on a node rect, by side and 0..1 offset
- `bezierToSvgPath()` / `polylineToSvgPath()`: SVG `d` serialization with stable precision
- `topologicalOrder()`: Kahn ordering with stable input-order tie breaks
- `findCyclicGroups()`: iterative Tarjan SCC cycle detection (no recursion limits, no exponential enumeration)
- Typed errors (`WireError`, `WireGraphError`, `WireConfigError`)
- Zero runtime dependencies, no DOM requirement

## Documentation

- [Overview](https://vielzeug.dev/wire/)
- [Usage Guide](https://vielzeug.dev/wire/usage)
- [API Reference](https://vielzeug.dev/wire/api)
- [Examples](https://vielzeug.dev/wire/examples)
- [Migration Guide](https://vielzeug.dev/wire/migration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu): part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
