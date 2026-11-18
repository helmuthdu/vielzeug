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
| `floatingSide()`                                                      | Rect side facing a world point                    | Sync      | Dominant axis from the rect center; ties go horizontal                     |
| `bezierToSvgPath()`                                                   | SVG `d` string from a `CubicBezier`               | Sync      | Emits one absolute `M`/`C` pair                                            |
| `polylineToSvgPath()`                                                 | SVG `d` string from a polyline                    | Sync      | Empty input returns `''`, not an error; `cornerRadius` adds `Q` arcs       |
| `arrowhead()`                                                         | Triangle points capping a line at its tip         | Sync      | `direction` is normalized; returns points, not an SVG path                 |
| `pointOnBezier()` / `pointOnPolyline()`                               | Point at a length-normalized `t` on a shape       | Sync      | `t` is arc length, not the raw bezier parameter                            |
| `hitBezier()` / `hitPolyline()`                                       | Closest point within a threshold                  | Sync      | Returns `null` past the threshold; bezier `t` is sampled                   |
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

| Parameter | Type                 | Description                                                                 |
| --------- | -------------------- | --------------------------------------------------------------------------- |
| `from`    | `PortAnchor`         | Source port with its side                                                   |
| `to`      | `PortAnchor`         | Target port with its side                                                   |
| `options` | `BezierRouteOptions` | `handleLength` (default 40) control-point reach; `selfLoop` (default false) |

**Returns:** a `CubicBezier` (`from`, `c1`, `c2`, `to`) for canvas or SVG rendering; use `bezierToSvgPath()` for an SVG `d` string. Throws `WireConfigError` for a negative or non-finite `handleLength`.

With `selfLoop: true` and both ports on the same side, each handle grows to `1.5 ×` the distance between the ports (never below `handleLength`), so a from→to pair on one node bulges outward into a visible loop instead of collapsing onto the node edge. The shape is deterministic: both handles use the same widened length, keeping the loop symmetric about the port midpoint. The option is ignored when the ports face different sides.

### `floatingSide()`

```ts
function floatingSide(rect: Rect, toward: Point): PortSide;
```

Returns the side of `rect` facing the point `toward`, chosen by the dominant axis from the rect's center — the larger of `|dx|` and `|dy|` wins. Useful for ports that follow the pointer ("floating" edges) without storing a fixed side.

| Parameter | Type    | Description                      |
| --------- | ------- | -------------------------------- |
| `rect`    | `Rect`  | Node bounding box                |
| `toward`  | `Point` | World point the side should face |

**Returns:** the facing `PortSide`. Ties (`|dx| === |dy|`, including a target exactly on the center) resolve to the horizontal side, with `right` for a zero offset. Throws `WireConfigError` for non-finite rect or point coordinates.

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
function polylineToSvgPath(points: readonly Point[], options?: PolylinePathOptions): string;
```

Serializes as absolute `M`/`L` commands, rounded to six decimals with no `-0` or exponent noise.

| Parameter | Type                  | Description                                                      |
| --------- | --------------------- | ---------------------------------------------------------------- |
| `points`  | `readonly Point[]`    | Waypoints, bends included                                        |
| `options` | `PolylinePathOptions` | `cornerRadius` (default 0) rounds interior corners with `Q` arcs |

With `cornerRadius > 0`, each interior corner is replaced by a straight run into the corner, a quadratic `Q` arc through it, and a run out — the corner point itself is not emitted. The radius is clamped per corner to half of its shortest adjacent run, so tight bends never overlap; collinear waypoints and zero-length runs are skipped, keeping the path continuous. `orthogonalRoute()` output stays a raw waypoint polyline — rounding is a rendering decision applied here at serialization time. Throws `WireConfigError` for a negative or non-finite `cornerRadius`.

---

## Editing Geometry

These helpers are DOM-free and node-model-free: they work on the raw geometry `bezierRoute()` and `orthogonalRoute()` produce, for editors that need hit-testing, markers, and drag feedback.

### `arrowhead()`

```ts
function arrowhead(tip: Point, direction: Point, options?: ArrowheadOptions): Point[];
```

Builds a filled triangle capping a line at `tip`. The apex sits at `tip`; the base sits `length` behind it along `-direction`, `width` apart. `direction` may be any non-zero vector — it is normalized internally — and points the way the line arrives at the tip.

| Parameter   | Type               | Description                                                       |
| ----------- | ------------------ | ----------------------------------------------------------------- |
| `tip`       | `Point`            | Apex of the arrowhead                                             |
| `direction` | `Point`            | Arrival direction toward the tip (normalized)                     |
| `options`   | `ArrowheadOptions` | `length` (default 10) shaft reach; `width` (default 6) base width |

**Returns:** `[tip, baseLeft, baseRight]` — three points to fill as a polygon. Throws `WireConfigError` for non-finite points, a zero `direction`, or non-positive/non-finite `length`/`width`.

### `pointOnBezier()` / `pointOnPolyline()`

```ts
function pointOnBezier(curve: CubicBezier, t: number): Point;
function pointOnPolyline(points: readonly Point[], t: number): Point;
```

Point at parameter `t` where `t` is normalized by total arc length, not by the raw bezier parameter or segment index: `t = 0.5` is the point halfway along the drawn wire. Polyline results are exact; the bezier mapping uses a fixed 64-sample arc-length lookup table, so `t` lands within roughly one sample cell of the true length fraction — sub-pixel for typical wire sizes.

**Returns:** the point at that length. Degenerate zero-length shapes return their start for every `t`. Throws `WireConfigError` for non-finite inputs, fewer than two polyline points, or `t` outside `[0, 1]`.

### `hitBezier()` / `hitPolyline()`

```ts
function hitBezier(curve: CubicBezier, point: Point, options?: HitOptions): HitResult | null;
function hitPolyline(points: readonly Point[], point: Point, options?: HitOptions): HitResult | null;
```

Closest point on the shape to `point`, for click selection without invisible DOM hit targets. `hitPolyline` tests every segment analytically (exact); `hitBezier` finds the nearest of 64 samples, then refines with a ternary search on the true curve, so the reported `distance` is accurate while `t` carries the table's arc-length tolerance.

| Parameter          | Type                               | Description                                        |
| ------------------ | ---------------------------------- | -------------------------------------------------- |
| `curve` / `points` | `CubicBezier` / `readonly Point[]` | The shape to test                                  |
| `point`            | `Point`                            | Query point                                        |
| `options`          | `HitOptions`                       | `threshold` (default 4) maximum distance for a hit |

**Returns:** a `HitResult` (`t` length-normalized in `[0, 1]`, `distance` Euclidean) or `null` when the closest point is farther than `threshold`. For zoom-independent screen picking, divide a screen-pixel threshold by the camera zoom before calling. Same validation errors as the `pointOn*` helpers.

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

| Class             | Thrown when                                                                                                                              |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `WireError`       | Base class; catch-all via `instanceof WireError`                                                                                         |
| `WireGraphError`  | Unknown edge endpoints, duplicate node ids, cyclic `topologicalOrder()`                                                                  |
| `WireConfigError` | Negative or non-finite `handleLength`, `padding`, `stub`, `bendPenalty`, `cornerRadius`, edit sizes, thresholds, or `t`; bad port offset |
