---
title: 'Wire: API Reference'
description: API reference for Wire's bezier and orthogonal routing, SVG path serialization, and graph ordering helpers.
---

[[toc]]

## API Overview

| Symbol                                                                | Purpose                                           | Execution | Common gotcha                                                              |
| --------------------------------------------------------------------- | ------------------------------------------------- | --------- | -------------------------------------------------------------------------- |
| `bezierRoute()`                                                       | Cubic bezier geometry between two ports           | Sync      | Returns a `CubicBezier`, not a string — serialize with `bezierToSvgPath()` |
| `orthogonalRoute()`                                                   | A\* Manhattan polyline avoiding padded obstacles  | Sync      | Returns `null` when blocked; waypoints appear only at bends                |
| `portAnchor()`                                                        | World position of a port on a node rect           | Sync      | `offset` is a 0..1 fraction along the side, not a distance                 |
| `bezierToSvgPath()`                                                   | SVG `d` string from a `CubicBezier`               | Sync      | Emits one absolute `M`/`C` pair                                            |
| `polylineToSvgPath()`                                                 | SVG `d` string from a polyline                    | Sync      | Empty input returns `''`, not an error                                     |
| `topologicalOrder()`                                                  | Kahn ordering with input-order tie breaks         | Sync      | Throws `WireGraphError` on any cycle                                       |
| `findCyclicGroups()`                                                  | Cyclic SCCs via iterative Tarjan                  | Sync      | Reports components (sets), not every elementary cycle                      |
| `WireError`                                                           | Base class for all wire errors                    | Sync      | Narrow with `instanceof WireError`                                         |
| `WireGraphError`                                                      | Unknown endpoints, duplicate ids, cyclic ordering | Sync      | Thrown at call time                                                        |
| `WireConfigError`                                                     | Invalid routing options                           | Sync      | Thrown at call time                                                        |
| `Point` / `Rect` / `PortAnchor` / `PortSide` / `CubicBezier` / `Edge` | Structural graph shapes                           | Sync      | All readonly; treat as values                                              |

## Package Entry Point

| Import           | Purpose                                                                            |
| ---------------- | ---------------------------------------------------------------------------------- |
| `@vielzeug/wire` | Bezier and orthogonal routing, path serialization, ordering, cycles, types, errors |

---

## Core Types

```ts
type Point = Readonly<{ x: number; y: number }>;
type Rect = Readonly<{ x: number; y: number; width: number; height: number }>;
type PortSide = 'top' | 'right' | 'bottom' | 'left';
type PortAnchor = Point & Readonly<{ side: PortSide }>;
type CubicBezier = Readonly<{ from: Point; c1: Point; c2: Point; to: Point }>;
type Edge = Readonly<{ from: string; to: string }>;
```

Coordinates are screen convention: `top` is smaller y.

---

## Routing Functions

### `portAnchor()`

```ts
function portAnchor(rect: Rect, side: PortSide, offset?: number): PortAnchor;
```

Places a port on `side` of `rect` and returns its world position together with the side it faces, ready to pass to `bezierRoute()` or `orthogonalRoute()`.

| Parameter | Type       | Description                                            |
| --------- | ---------- | ------------------------------------------------------ |
| `rect`    | `Rect`     | Node bounding box the port sits on                     |
| `side`    | `PortSide` | Node edge the port faces                               |
| `offset`  | `number`   | 0..1 fraction along the side (default 0.5, the middle) |

**Returns:** a `PortAnchor` — the point plus its `side`. Throws `WireConfigError` for an `offset` outside 0..1 or non-finite.

### `bezierRoute()`

```ts
function bezierRoute(from: PortAnchor, to: PortAnchor, options?: BezierRouteOptions): CubicBezier;
```

Builds a cubic bezier segment whose control points extend `handleLength` units outward from each port along its side, so the curve leaves and enters ports perpendicular to the node edge.

| Parameter | Type                 | Description                                     |
| --------- | -------------------- | ----------------------------------------------- |
| `from`    | `PortAnchor`         | Source port with its side                       |
| `to`      | `PortAnchor`         | Target port with its side                       |
| `options` | `BezierRouteOptions` | `handleLength` (default 40) control-point reach |

**Returns:** a `CubicBezier` (`from`, `c1`, `c2`, `to`) for canvas or SVG rendering; use `bezierToSvgPath()` for an SVG `d` string. Throws `WireConfigError` for a negative or non-finite `handleLength`.

### `orthogonalRoute()`

```ts
function orthogonalRoute(from: PortAnchor, to: PortAnchor, options?: OrthogonalRouteOptions): Point[] | null;
```

Routes an axis-aligned polyline over a visibility graph of obstacle corners and exit-tip rows/columns using A\*. Cost is length plus `bendPenalty` per bend; expansion order is deterministic. The route runs `stub` units straight out of each port before bending, so wires never peel off a port sideways.

Pass every node's raw rect as `obstacles`. The obstacles whose padded interior contains a port are exempted for that port's straight exit segment only — the searched route never enters any padded obstacle interior, including its own nodes.

| Parameter | Type                     | Description                                                                                       |
| --------- | ------------------------ | ------------------------------------------------------------------------------------------------- |
| `from`    | `PortAnchor`             | Start port; its `side` fixes the direction the route leaves it                                    |
| `to`      | `PortAnchor`             | Goal port; its `side` fixes the direction the route enters it                                     |
| `options` | `OrthogonalRouteOptions` | `obstacles`, `padding` (default 8), `bendPenalty` (default 12), `stub` (default 16, `0` disables) |

**Returns:** waypoints (`from` first, `to` last, bends only) or `null` when a port's exit is blocked by a non-owner obstacle or every route is sealed off. Points exactly on a padded boundary are free: routes may hug obstacle margins.

### `bezierToSvgPath()`

```ts
function bezierToSvgPath(curve: CubicBezier): string;
```

Serializes as an absolute `M`/`C` command, rounded to six decimals with no `-0` or exponent noise.

### `polylineToSvgPath()`

```ts
function polylineToSvgPath(points: readonly Point[]): string;
```

Serializes as absolute `M`/`L` commands, rounded to six decimals with no `-0` or exponent noise.

---

## Graph Functions

### `topologicalOrder()`

```ts
function topologicalOrder(nodeIds: readonly string[], edges: readonly Edge[]): string[];
```

Kahn's algorithm with a heap keyed by input index; ready nodes are always consumed in input order. Parallel edges are tolerated. Throws `WireGraphError` on duplicate node ids, edges referencing unknown nodes, or cycles.

### `findCyclicGroups()`

```ts
function findCyclicGroups(nodeIds: readonly string[], edges: readonly Edge[]): string[][];
```

Iterative Tarjan SCCs. Each returned group is an SCC with more than one node, or a single node with a self-loop. A group is a set of mutually reachable nodes, not a path through them. Members are sorted by input position; groups are ordered by their first member. Same validation errors as `topologicalOrder()`.

---

## Errors

| Class             | Thrown when                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------- |
| `WireError`       | Base class; catch-all via `instanceof WireError`                                            |
| `WireGraphError`  | Unknown edge endpoints, duplicate node ids, cyclic `topologicalOrder()`                     |
| `WireConfigError` | Negative or non-finite `handleLength`, `padding`, `stub`, or `bendPenalty`; bad port offset |
