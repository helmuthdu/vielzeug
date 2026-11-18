---
title: 'Stage: API Reference'
description: API reference for the Stage retained-mode 2D canvas engine.
---

[[toc]]

## API Overview

| Symbol                  | Purpose                                                 | Execution | Common gotcha                                                     |
| ----------------------- | ------------------------------------------------------- | --------- | ----------------------------------------------------------------- |
| `createStage()`         | Retained-mode layered canvas renderer                   | Sync      | Paint callbacks draw in world units; the stage applies the matrix |
| `StageController`       | Control surface shared by main-thread and worker stages | Type      | Both modes are assignable to it; mode extras are not              |
| `StageError`            | Base class for all stage errors                         | Sync      | Narrow with `instanceof StageError`                               |
| `StageConfigError`      | Invalid sizes, duplicate/unknown layer ids              | Sync      | Thrown at call time, in both modes                                |
| `StageDisposedError`    | Blob export or worker request after disposal            | Sync      | Worker blob failures carry a `kind` mapped to this class          |
| `StageUnsupportedError` | Missing browser capability (2D context, blob export)    | Sync      | No silent degradation to a lesser path                            |

## Package Entry Point

| Import                   | Purpose                                           |
| ------------------------ | ------------------------------------------------- |
| `@vielzeug/stage`        | Stage factory, controller type, and error classes |
| `@vielzeug/stage/worker` | Worker-rendered stages over `OffscreenCanvas`     |

Geometry is not re-declared here: `Point`, `Rect`, `Matrix`, and `FrameScheduler` come from
[`@vielzeug/atlas`](/atlas/api/), which `@vielzeug/stage` depends on.

---

## Core Types

```ts
import type { FrameScheduler, Matrix, Rect, Size } from '@vielzeug/atlas';

type PaintContext = Readonly<{
  /** World→screen matrix (DPR already applied to the context transform). */
  matrix: Matrix;
  /** Visible world-space rect for culling. */
  visibleRect: Rect;
  /** Device pixel ratio in effect. */
  dpr: number;
  /** Frame timestamp from the scheduler. */
  time: number;
}>;

/** A backing surface a layer paints into. `OffscreenCanvas` on workers. */
type StageSurface = {
  width: number;
  height: number;
  getContext: (type: '2d', attributes?: CanvasRenderingContext2DSettings) => unknown;
};
type CreateSurface = (width: number, height: number) => StageSurface;

/** Options for `toBlob()`: blob encoding plus an optional world-space crop and density. */
type StageBlobOptions = Readonly<{
  type?: string;
  quality?: number;
  region?: Rect;
  scale?: number;
}>;

/**
 * The control surface both stage modes share. A main-thread `Stage` and a
 * `WorkerStage` are interchangeable wherever only control is needed.
 */
type StageController = Readonly<{
  resize: (size: Size, dpr?: number) => void;
  setTransform: (matrix: Matrix) => void;
  invalidate: (layerId?: string) => void;
  toBlob: (options?: StageBlobOptions) => Promise<Blob>;
  dispose: () => void;
  readonly disposed: boolean;
  readonly disposalSignal: AbortSignal;
  [Symbol.dispose]: () => void;
}>;
```

`Size` comes from [`@vielzeug/atlas`](/atlas/api/) as well.

---

## `createStage()`

```ts
function createStage(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  options: StageOptions & Readonly<{ width: number; height: number }>,
): Stage;
```

Creates a retained-mode stage: every layer owns a cached backing surface, is repainted only when dirty, and all layers are composited onto `canvas` in order each scheduled frame. The canvas backing store is sized `width × dpr` by `height × dpr`.

| Parameter               | Type                                   | Description                                                            |
| ----------------------- | -------------------------------------- | ---------------------------------------------------------------------- |
| `canvas`                | `HTMLCanvasElement \| OffscreenCanvas` | Canvas the stage composites into (visible or transferred)              |
| `options.width`         | `number`                               | CSS width in pixels; must be positive and finite                       |
| `options.height`        | `number`                               | CSS height in pixels; must be positive and finite                      |
| `options.dpr`           | `number?`                              | Device pixel ratio; defaults to `1`                                    |
| `options.layers`        | `readonly StageLayerOptions[]`         | Layers in paint order, fixed at creation; duplicate ids throw          |
| `options.scheduler`     | `FrameScheduler?`                      | Injectable rAF scheduler for deterministic tests                       |
| `options.createSurface` | `CreateSurface?`                       | Backing-surface factory; defaults to `OffscreenCanvas`/document canvas |
| `options.background`    | `string \| null?`                      | Color cleared under the layers; defaults to transparent                |

**Returns:** `Stage` handle.

**Example**

```ts
const stage = createStage(canvas, {
  width: 800,
  height: 600,
  dpr: window.devicePixelRatio,
  layers: [{ id: 'scene', paint: (ctx, { visibleRect }) => drawScene(ctx, visibleRect) }],
});
stage.setTransform([2, 0, 0, 2, 40, 10]); // world→screen, CSS pixels
stage.invalidate('scene');
```

### `Stage` members

`Stage` extends `StageController` (`resize`, `setTransform`, `invalidate`, `toBlob`, `dispose`, `disposed`, `disposalSignal`, `[Symbol.dispose]`) and adds:

| Member                                       | Description                                                                            |
| -------------------------------------------- | -------------------------------------------------------------------------------------- |
| `render(time?)`                              | Runs the pending repaint/composite synchronously; `time` defaults to `scheduler.now()` |
| `visibleRect`                                | Visible world-space rect derived from the inverse transform                            |
| `matrix`, `width`, `height`, `dpr`, `canvas` | Current configuration                                                                  |

`toBlob()` flushes a pending frame before rasterizing, so it always exports the current frame. Paint callbacks receive a context whose transform is `dpr × matrix`, so they draw in world units. Clear and reset with `ctx.setTransform(1, 0, 0, 1, 0, 0)` only if you must paint in device pixels.

### `toBlob(options?)`

```ts
type StageBlobOptions = Readonly<{
  type?: string; // blob MIME type; defaults to 'image/png'
  quality?: number; // encoder quality for lossy types
  region?: Rect; // world-space crop; defaults to the visible rect
  scale?: number; // export pixels per world unit
}>;
```

Without `region`/`scale`, the stage exports its current canvas at the current device scale. With them, the stage re-paints every layer into scratch surfaces against `translate(-region) × scale` and composites the result into an offscreen surface sized `region.width × scale` by `region.height × scale` (rounded, at least 1 pixel per side) — layer caches are keyed to the live viewport transform, so a crop cannot reuse the cached composite. The cost is a full repaint; the live viewport, caches, and dirty flags are untouched. `scale` defaults to the current device pixels per world unit (`dpr × matrix scale`), which matches the on-screen density; paint callbacks see `frame.dpr = 1` and `frame.visibleRect = region` during an export.

Invalid `region` (non-finite coordinates or non-positive size) or `scale` (non-positive or non-finite) throws `StageConfigError`; on a worker stage the failure arrives as `StageError`.

---

## Worker Subpath (`@vielzeug/stage/worker`)

| Export                                                                                                  | Description                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createWorkerStage<Scene>(canvas, worker, options)`                                                     | Main-thread client: transfers `canvas` to `worker` once, then drives it; a `StageController` plus `ready` and `sendScene(scene: Scene)`                                |
| `serveStage<Scene>(scope, setup)`                                                                       | Worker half: waits for `init`, creates a `createStage` on the transferred `OffscreenCanvas`, and services commands; `setup` returns `{ layers, onScene?, onDispose? }` |
| `WorkerScope`, `WorkerSelfScope`, `WorkerStage`, `WorkerStageOptions`, `ServeStageSetup`, `StageServer` | Supporting types for both halves                                                                                                                                       |

The worker owns its layer painters: `serveStage`'s `setup` supplies them, and the main thread never names layers. `onScene(scene, stage)` runs for each forwarded `scene` command and owns repaints — call `stage.invalidate(layerId)` for the layers the payload changed. `server.stage` exposes the created stage whenever you need it.

`Scene` is the application payload type shared by `sendScene` and `onScene`, so neither side casts. Invalid size, DPR, or matrix input throws `StageConfigError` on the main thread, exactly like `createStage`. Worker-side exceptions are surfaced through `reportError`. The message protocol is internal: its version is checked once at the init/ready handshake, and a mismatch rejects `ready` with a `StageError` and disposes the stage.

`createWorkerStage` throws `StageUnsupportedError` when the canvas cannot transfer control (`transferControlToOffscreen` missing). `dispose()` posts a final `dispose` command, rejects in-flight `toBlob()` promises with `StageDisposedError`, aborts `disposalSignal` (terminate the worker from there — the creator owns it), and makes later calls inert. `toBlob(options?)` forwards `StageBlobOptions` — including `region` and `scale` — verbatim; the worker performs the same region re-paint export on its `OffscreenCanvas` pipeline.

## Errors

| Class                   | Thrown when                                                                               |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| `StageError`            | Base class; catch all stage failures with `instanceof`                                    |
| `StageConfigError`      | Non-positive sizes, non-finite matrices, duplicate/unknown ids, bad `toBlob` region/scale |
| `StageDisposedError`    | `toBlob()` after `dispose()`, or worker blob rejected on disposal                         |
| `StageUnsupportedError` | No 2D context on a surface, or `canvas.toBlob` missing/failing                            |
