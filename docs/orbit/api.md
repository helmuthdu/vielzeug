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

## Middleware

```ts
type Middleware = (state: MiddlewareState) => MiddlewareResult | undefined;
```

Built-in factories: `arrow`, `autoPlacement`, `flip`, `hide`, `inline`, `offset`, `shift`, `limitShift`, and `size`.

```ts
const middleware = [offset(8), flip(), shift({ padding: 6 }), size()];
```

`middlewareData` is `MiddlewareData`; narrow custom data at the consuming boundary.

## Reactive Adapter

```ts
function createReactivePositioner(
  reference: ReferenceElement,
  floating: HTMLElement,
  options?: Omit<PositionerOptions, 'apply'>,
): ReactivePositioner;
```

`ReactivePositioner.position` is `Readable<ComputePositionResult | null>`. Imported from `@vielzeug/orbit/reactive`.

## Types

```ts
type Side = 'top' | 'bottom' | 'left' | 'right';
type Alignment = 'start' | 'end';
type Placement = Side | `${Side}-${Alignment}`;

interface Rect {
  height: number;
  width: number;
  x: number;
  y: number;
}

interface VirtualReference {
  getBoundingClientRect: () => DOMRect | Rect;
  getClientRects?: () => DOMRectList | DOMRect[];
}

type ReferenceElement = Element | VirtualReference;

interface SideObject {
  bottom: number;
  left: number;
  right: number;
  top: number;
}

type Padding = number | Partial<SideObject>;

interface ArrowData {
  centerOffset: number;
  constrained: boolean;
  x?: number;
  y?: number;
}

interface FlipData {
  skippedPlacements: Placement[];
}

interface ShiftData {
  x: number;
  y: number;
}

interface HideData {
  escaped?: boolean;
  escapedOffsets?: SideObject;
  referenceHidden?: boolean;
  referenceHiddenOffsets?: SideObject;
}

interface SizeData {
  availableHeight: number;
  availableWidth: number;
}

interface MiddlewareData {
  arrow?: ArrowData;
  flip?: FlipData;
  hide?: HideData;
  shift?: ShiftData;
  size?: SizeData;
  [key: string]: unknown;
}

interface MiddlewareState {
  boundary?: Element | Rect;
  elements: { floating: HTMLElement; reference: ReferenceElement };
  initialPlacement: Placement;
  middlewareData: MiddlewareData;
  padding?: Padding;
  placement: Placement;
  rects: { floating: Rect; reference: Rect };
  x: number;
  y: number;
}

type MiddlewareReset = {
  placement?: Placement;
  rects?: MiddlewareState['rects'];
  remeasure?: boolean;
};

interface MiddlewareResult {
  data?: MiddlewareData;
  placement?: Placement;
  reset?: MiddlewareReset;
  x?: number;
  y?: number;
}

type Middleware = (state: MiddlewareState) => MiddlewareResult | undefined;

interface ComputePositionResult {
  middlewareData: MiddlewareData;
  placement: Placement;
  x: number;
  y: number;
}

interface ComputePositionOptions {
  boundary?: Element | Rect;
  containingBlock?: Element | null;
  middleware?: readonly Middleware[];
  padding?: Padding;
  placement?: Placement;
}

interface DetectOverflowOptions {
  boundary?: Element | Rect;
  padding?: Padding;
}

type PositionStrategy = 'absolute' | 'fixed';

interface PositionerOptions extends Omit<ComputePositionOptions, 'boundary' | 'containingBlock'> {
  apply?: (result: ComputePositionResult) => void;
  autoUpdate?: AutoUpdateOptions | false;
  boundary?: ComputePositionOptions['boundary'] | 'clippingAncestors';
  strategy?: PositionStrategy;
}

interface Positioner {
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  getPosition(): ComputePositionResult | null;
  start(): void;
  update(): void;
  [Symbol.dispose](): void;
}

interface AutoUpdateOptions {
  animationFrame?: boolean;
  observeAncestors?: boolean;
  observeFloating?: boolean;
  observeVisualViewport?: boolean;
  pauseWhenHidden?: boolean;
  throttle?: number;
}

interface ReactivePositioner extends Positioner {
  readonly position: Readable<ComputePositionResult | null>;
}

interface ArrowOptions {
  element: HTMLElement;
  padding?: Padding;
}

interface AutoPlacementOptions extends DetectOverflowOptions {
  alignment?: Alignment | null;
  allowedPlacements?: Placement[];
}

interface FlipOptions extends DetectOverflowOptions {
  fallbackPlacements?: Placement[];
}

interface HideOptions extends DetectOverflowOptions {
  strategy?: 'referenceHidden' | 'escaped' | 'both';
}

type OffsetConfig = {
  crossAxis?: number;
  mainAxis?: number;
};

type OffsetValue = number | OffsetConfig | ((state: MiddlewareState) => number | OffsetConfig);

type ShiftLimiter = (
  state: MiddlewareState,
  correction: { crossAxis: number; mainAxis: number },
) => { crossAxis: number; mainAxis: number };

interface LimitShiftOptions {
  offset?: number | ((state: MiddlewareState) => number);
}

interface ShiftOptions extends DetectOverflowOptions {
  crossAxis?: boolean;
  limiter?: ShiftLimiter;
}

interface InlineOptions {
  padding?: Padding;
  x?: number;
  y?: number;
}

type SizeOptions = DetectOverflowOptions;

interface PositioningPreset {
  middleware: Middleware[];
  placement: Placement;
}

interface PresetOptions {
  offset?: number;
  padding?: number;
  placement?: Placement;
}
```

## Errors

| Error | Trigger | Notable properties |
| --- | --- | --- |
| `OrbitConfigError` | Invalid middleware reset configuration | Extends `OrbitError` |
| `OrbitError` | Base Orbit error | `instanceof OrbitError` narrows Orbit errors |
