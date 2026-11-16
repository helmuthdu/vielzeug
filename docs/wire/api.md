---
title: 'Wire: API Reference'
description: API reference for Wire's bezier and orthogonal routing, SVG path serialization, and graph ordering helpers.
---

[[toc]]

## API Overview

| Symbol                                               | Purpose                                           | Execution | Common gotcha                                               |
| ---------------------------------------------------- | ------------------------------------------------- | --------- | ----------------------------------------------------------- |
| `bezierRoute()`                                      | Cubic bezier SVG `d` string between two ports     | Sync      | Missing `side` defaults to right→left, not nearest edges    |
| `orthogonalRoute()`                                  | A\* Manhattan polyline avoiding padded obstacles  | Sync      | Returns `null` when blocked; waypoints appear only at bends |
| `polylineToSvgPath()`                                | SVG `d` string from a polyline                    | Sync      | Empty input returns `''`, not an error                      |
| `topologicalOrder()`                                 | Kahn ordering with input-order tie breaks         | Sync      | Throws `WireGraphError` on any cycle                        |
| `findCycles()`                                       | Cyclic SCCs via iterative Tarjan                  | Sync      | Reports components, not every elementary cycle              |
| `WireError`                                          | Base class for all wire errors                    | Sync      | Narrow with `instanceof WireError`                          |
| `WireGraphError`                                     | Unknown endpoints, duplicate ids, cyclic ordering | Sync      | Thrown at call time                                         |
| `WireConfigError`                                    | Invalid routing options                           | Sync      | Thrown at call time                                         |
| `Point` / `Rect` / `PortPoint` / `PortSide` / `Edge` | Structural graph shapes                           | Sync      | All readonly; treat as values                               |

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
type PortPoint = Point & Readonly<{ side?: PortSide }>;
type Edge = Readonly<{ from: string; to: string }>;
```

Coordinates are screen convention: `top` is smaller y.

---

## Routing Functions

### `bezierRoute()`

```ts
function bezierRoute(from: PortPoint, to: PortPoint, options?: BezierRouteOptions): string;
```

Returns a cubic bezier SVG `d` string whose control points extend `offset` units outward from each port along its side.

| Parameter | Type                 | Description                               |
| --------- | -------------------- | ----------------------------------------- |
| `from`    | `PortPoint`          | Source port; `side` defaults to `'right'` |
| `to`      | `PortPoint`          | Target port; `side` defaults to `'left'`  |
| `options` | `BezierRouteOptions` | `offset` (default 40) control-point reach |

Throws `WireConfigError` for a negative or non-finite `offset`.

### `orthogonalRoute()`

```ts
function orthogonalRoute(from: PortPoint, to: PortPoint, options?: OrthogonalRouteOptions): Point[] | null;
```

Routes an axis-aligned polyline over a visibility graph of obstacle corners and endpoint rows/columns using A\*. Cost is length plus `bendPenalty` per bend; expansion order is deterministic.

| Parameter | Type                     | Description                                                    |
| --------- | ------------------------ | -------------------------------------------------------------- |
| `from`    | `PortPoint`              | Start point                                                    |
| `to`      | `PortPoint`              | Goal point                                                     |
| `options` | `OrthogonalRouteOptions` | `obstacles`, `padding` (default 8), `bendPenalty` (default 12) |

**Returns:** waypoints (`from` first, `to` last, bends only) or `null` when unreachable or when an endpoint sits inside a padded obstacle. Points exactly on a padded boundary are free: routes may hug obstacle margins.

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

Kahn's algorithm; ready nodes are always consumed in input order. Parallel edges are tolerated. Throws `WireGraphError` on duplicate node ids, edges referencing unknown nodes, or cycles.

### `findCycles()`

```ts
function findCycles(nodeIds: readonly string[], edges: readonly Edge[]): string[][];
```

Iterative Tarjan SCCs. Each returned cycle is an SCC with more than one node, or a single node with a self-loop. Members are sorted by input position; cycles are ordered by their first member. Same validation errors as `topologicalOrder()`.

---

## Errors

| Class             | Thrown when                                                             |
| ----------------- | ----------------------------------------------------------------------- |
| `WireError`       | Base class; catch-all via `instanceof WireError`                        |
| `WireGraphError`  | Unknown edge endpoints, duplicate node ids, cyclic `topologicalOrder()` |
| `WireConfigError` | Negative or non-finite `offset`, `padding`, or `bendPenalty`            |
