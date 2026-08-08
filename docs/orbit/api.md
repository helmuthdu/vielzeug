---
title: Orbit — API Reference
description: API reference for @vielzeug/orbit positioners, computation, updates, middleware, and optional reactive integration.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution mode | Common gotcha |
| --- | --- | --- | --- |
| `createPositioner()` | Lifecycle-owned floating positioning | Sync | Call `start()` after mount |
| `computePosition()` | Low-level geometry computation | Sync | Caller owns CSS application |
| `autoUpdate()` | Listen for geometry changes | Sync | Call returned cleanup |
| `computePositionAsync()` | Defer computation to microtask | Async | Does not wait for animation frame |
| `computePositionRaf()` | Defer computation to next frame | Async | Browser-only invocation |
| `createReactivePositioner()` | Optional Ripple position readable | Sync | Requires `@vielzeug/ripple` |
| Middleware factories | Adjust placement and size | Sync | Order is explicit |

## Package Entry Points

| Import | Purpose |
| --- | --- |
| `@vielzeug/orbit` | Positioner, computation, updates, middleware, and types. |
| `@vielzeug/orbit/reactive` | Optional Ripple position adapter. |
| `@vielzeug/orbit/presets` | Preset placement and middleware options. |
| `@vielzeug/orbit/devtools` | Development overlay. |

## Core Functions

### `createPositioner()`

```ts
function createPositioner(
  reference: ReferenceElement,
  floating: HTMLElement,
  options?: PositionerOptions,
): Positioner;
```

Creates an unstarted positioner.

| Parameter | Type | Description |
| --- | --- | --- |
| `reference` | `ReferenceElement` | DOM or virtual anchor. |
| `floating` | `HTMLElement` | Positioned element. |
| `options` | `PositionerOptions` | Strategy, clipping, middleware, updates, and application callback. |

**Returns:** `Positioner`.

```ts
import { createPositioner } from '@vielzeug/orbit';

const positioner = createPositioner(trigger, tooltip);
positioner.start();
positioner.dispose();
```

| Member | Return | Contract |
| --- | --- | --- |
| `start()` | `void` | Starts positioning once. |
| `update()` | `void` | Recomputes and applies position. |
| `getPosition()` | `ComputePositionResult \| null` | Latest result; null before first update. |
| `dispose()` | `void` | Stops updates and aborts disposal signal. |

### `computePosition()`

```ts
function computePosition(
  reference: ReferenceElement,
  floating: HTMLElement,
  options?: ComputePositionOptions,
): ComputePositionResult;
```

Calculates position without applying DOM styles or creating listeners.

**Returns:** `ComputePositionResult`.

### `autoUpdate()`

```ts
function autoUpdate(
  reference: ReferenceElement,
  floating: HTMLElement,
  update: () => void,
  options?: AutoUpdateOptions,
): () => void;
```

Calls `update` immediately, then on relevant scroll, viewport, resize, and optional animation-frame changes.

**Returns:** cleanup callback.

### Deferred Computation

```ts
function computePositionAsync(...): Promise<ComputePositionResult>;
function computePositionRaf(...): Promise<ComputePositionResult>;
```

`computePositionAsync()` queues a microtask. `computePositionRaf()` waits for next animation frame.

## Middleware

```ts
type Middleware = (state: MiddlewareState) => MiddlewareResult | void;
```

Built-in factories: `arrow`, `autoPlacement`, `flip`, `hide`, `inline`, `offset`, `shift`, `limitShift`, and `size`.

```ts
const middleware = [offset(8), flip(), shift({ padding: 6 }), size()];
```

`middlewareData` is `Record<string, unknown>`; narrow custom data at the consuming boundary.

## Reactive Adapter

```ts
function createReactivePositioner(
  reference: ReferenceElement,
  floating: HTMLElement,
  options?: Omit<PositionerOptions, 'apply'>,
): ReactivePositioner;
```

`ReactivePositioner.position` is `Readable<ComputePositionResult | null>`.

## Types

```ts
type PositionStrategy = 'absolute' | 'fixed';

type PositionerOptions = Omit<ComputePositionOptions, 'boundary' | 'containingBlock'> & {
  apply?: (result: ComputePositionResult) => void;
  autoUpdate?: AutoUpdateOptions | false;
  boundary?: Element | Rect | 'clippingAncestors';
  strategy?: PositionStrategy;
};

interface Positioner {
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  getPosition(): ComputePositionResult | null;
  start(): void;
  update(): void;
  [Symbol.dispose](): void;
}
```

See source declarations for complete geometry and middleware option types.

## Errors

| Error | Trigger | Notable properties |
| --- | --- | --- |
| `OrbitConfigError` | Invalid middleware reset configuration | Extends `OrbitError` |
| `OrbitError` | Base Orbit error | `OrbitError.is(error)` narrows Orbit errors |
