---
title: 'Stage: API Reference'
description: API reference for the Stage retained-mode 2D canvas engine.
---

[[toc]]

## API Overview

| Symbol                      | Purpose                                              | Execution | Common gotcha                                                     |
| --------------------------- | ---------------------------------------------------- | --------- | ----------------------------------------------------------------- |
| `createStage()`             | Retained-mode layered canvas renderer                | Sync      | Paint callbacks draw in world units; the stage applies the matrix |
| `StageError`                | Base class for all stage errors                      | Sync      | Narrow with `instanceof StageError`                               |
| `StageConfigError`          | Invalid sizes, unknown layer ids, disposed usage     | Sync      | Thrown at call time                                               |
| `StageUnsupportedError`     | Missing browser capability (2D context, blob export) | Sync      | No silent degradation to a lesser path                            |
| `Point` / `Rect` / `Matrix` | Structural shapes shared across the canvas toolkit   | Sync      | All readonly; treat as values                                     |

## Package Entry Point

| Import            | Purpose                                 |
| ----------------- | --------------------------------------- |
| `@vielzeug/stage` | Stage factory, types, and error classes |

---

## Core Types

```ts
type Point = Readonly<{ x: number; y: number }>;
type Rect = Readonly<{ x: number; y: number; width: number; height: number }>;
/** Canvas2D/DOMMatrix element order: [a, b, c, d, e, f]. */
type Matrix = readonly [number, number, number, number, number, number];

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

type FrameScheduler = Readonly<{
  requestFrame: (callback: (time: number) => void) => number;
  cancelFrame: (handle: number) => void;
}>;

/** A backing surface a layer paints into. `OffscreenCanvas` on workers. */
type StageSurface = {
  width: number;
  height: number;
  getContext: (type: '2d', attributes?: CanvasRenderingContext2DSettings) => unknown;
};
type CreateSurface = (width: number, height: number) => StageSurface;

type StageSpriteSheet = Readonly<{
  frameWidth: number;
  frameHeight: number;
  /** Frames per row in the sheet. */
  columns: number;
  frames: number;
}>;
```

---

## `createStage()`

```ts
function createStage(
  canvas: HTMLCanvasElement,
  options: StageOptions & Readonly<{ width: number; height: number }>,
): Stage;
```

Creates a retained-mode stage: every layer owns a cached backing surface, is repainted only when dirty, and all layers are composited onto `canvas` in order each scheduled frame. The canvas backing store is sized `width × dpr` by `height × dpr`.

| Parameter               | Type                            | Description                                                            |
| ----------------------- | ------------------------------- | ---------------------------------------------------------------------- |
| `canvas`                | `HTMLCanvasElement`             | Visible canvas the stage composites into                               |
| `options.width`         | `number`                        | CSS width in pixels; must be positive and finite                       |
| `options.height`        | `number`                        | CSS height in pixels; must be positive and finite                      |
| `options.dpr`           | `number?`                       | Device pixel ratio; defaults to `1`                                    |
| `options.layers`        | `readonly StageLayerOptions[]?` | Initial layers in paint order                                          |
| `options.scheduler`     | `FrameScheduler?`               | Injectable rAF scheduler for deterministic tests                       |
| `options.createSurface` | `CreateSurface?`                | Backing-surface factory; defaults to `OffscreenCanvas`/document canvas |
| `options.background`    | `string \| null?`               | Color cleared under the layers; defaults to transparent                |

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

| Member                                                        | Description                                                                       |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `resize(size, dpr?)`                                          | Changes CSS size/DPR; resizes the canvas and invalidates all layers               |
| `setTransform(matrix)`                                        | Sets the world→screen matrix (CSS pixels, without DPR); invalidates all layers    |
| `addLayer(options)`                                           | Appends a layer; duplicate ids throw `StageConfigError`                           |
| `removeLayer(id)`                                             | Removes a layer and releases its surface                                          |
| `moveLayer(id, index)`                                        | Reorders a layer within `[0, layerCount)`                                         |
| `invalidate(layerId?)`                                        | Marks one (or all) layers dirty and schedules a frame                             |
| `render(time?)`                                               | Runs the pending repaint/composite synchronously; returns which layers repainted  |
| `drawSpriteFrame(ctx, image, sheet, frame, rect)`             | Draws one sprite-sheet cell scaled into `rect` (world units)                      |
| `toBlob(options?)`                                            | Exports the composited canvas as a blob; `StageUnsupportedError` when unavailable |
| `visibleRect`                                                 | Visible world-space rect derived from the inverse transform                       |
| `matrix`, `width`, `height`, `dpr`, `layerIds`, `canvas`      | Current configuration                                                             |
| `disposed`, `disposalSignal`, `dispose()`, `[Symbol.dispose]` | Disposal contract; post-dispose calls are inert                                   |

Paint callbacks receive a context whose transform is `dpr × matrix`, so they draw in world units. Clear and reset with `ctx.setTransform(1, 0, 0, 1, 0, 0)` only if you must paint in device pixels.

---

---

## Worker Subpath (`@vielzeug/stage/worker`)

| Export                                                                                                                   | Description                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `createWorkerStage(canvas, worker, options)`                                                                             | Main-thread client: transfers `canvas` to `worker` once, then drives it over the protocol; returns `ready`, `resize`, `setTransform`, `invalidate`, `sendScene`, `toBlob`, `dispose` |
| `serveStage(scope, setup)`                                                                                               | Worker half: waits for `init`, creates a `createStage` on the transferred `OffscreenCanvas`, and services commands; `setup` returns `{ layers, onScene?, onStart?, onDispose? }`     |
| `STAGE_WORKER_PROTOCOL`, `checkProtocol()`                                                                               | Protocol version constant and dev-gated mismatch check                                                                                                                               |
| `WorkerScope`, `WorkerSelfScope`, `WorkerStage`, `WorkerStageOptions`, `StageServer`, `StageSceneMessage`, message types | Supporting types for both halves                                                                                                                                                     |

`createWorkerStage` throws `StageUnsupportedError` when the canvas cannot transfer control (`transferControlToOffscreen` missing). `dispose()` posts a final `dispose` command, rejects in-flight `toBlob()` promises with `StageDisposedError`, and makes later calls inert.

## Errors

| Class                   | Thrown when                                                    |
| ----------------------- | -------------------------------------------------------------- |
| `StageError`            | Base class; catch all stage failures with `instanceof`         |
| `StageConfigError`      | Non-positive sizes, non-finite matrices, duplicate/unknown ids |
| `StageUnsupportedError` | No 2D context on a surface, or `canvas.toBlob` missing/failing |
