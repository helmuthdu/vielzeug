---
title: 'Stage: Usage Guide'
description: 'How to drive a @vielzeug/stage layered canvas: layers, transforms, dirty repaints, and export.'
---

[[toc]]

## Basic Usage

```ts
import { createStage } from '@vielzeug/stage';

const stage = createStage(canvas, {
  width: canvas.clientWidth,
  height: canvas.clientHeight,
  dpr: window.devicePixelRatio,
  layers: [
    { id: 'grid', paint: (ctx, { visibleRect }) => drawGrid(ctx, visibleRect) },
    { id: 'scene', paint: (ctx, { visibleRect }) => drawScene(ctx, visibleRect) },
    { id: 'overlay', paint: (ctx) => drawSelection(ctx) },
  ],
});
```

Each layer paints into its own cached backing surface. The stage composites all surfaces onto the visible canvas in registration order whenever a frame is scheduled. Paint callbacks receive a context already transformed by `dpr × matrix`, so they draw in **world units** and can cull against `frame.visibleRect`.

Layers are fixed when the stage is created — the same in both render modes. Hide a layer by returning early from its paint and invalidating it. The stage sizes the canvas backing store; you own the canvas CSS size (set it via CSS or a `ResizeObserver`).

## Driving the Transform

The stage takes a world→screen matrix in CSS pixels (it applies DPR itself). Pair it with an `@vielzeug/atlas` camera:

```ts
import { createCamera } from '@vielzeug/atlas';

const camera = createCamera({ maxZoom: 16, minZoom: 0.05 });
camera.subscribe(() => stage.setTransform(camera.matrix));

canvas.addEventListener('wheel', (event) => {
  event.preventDefault();
  camera.zoomAt({ x: event.offsetX, y: event.offsetY }, Math.exp(-event.deltaY * 0.0015));
});
```

`setTransform()` invalidates every layer — the cached world-space surfaces are no longer valid at the new transform. Compositing stays cheap (one `drawImage` per layer); only the paint callbacks re-run.

## Dirty Repaints

Invalidate the smallest unit that changed:

```ts
token.x += 10;
stage.invalidate('tokens'); // only the tokens layer repaints next frame
```

Invalidations within one frame coalesce into a single scheduled frame. Call `stage.render()` to force a synchronous repaint (useful in tests).

## Resize and DPR Changes

```ts
new ResizeObserver(([entry]) => {
  stage.resize({ width: entry.contentRect.width, height: entry.contentRect.height }, window.devicePixelRatio);
}).observe(canvas.parentElement!);
```

`resize()` resizes the canvas backing store and invalidates all layers; surfaces are reallocated at the new pixel size.

## Exporting a PNG

```ts
const blob = await stage.toBlob();
await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
```

`toBlob()` flushes any pending repaint before rasterizing, so it always captures the current frame — no manual `render()` first. It throws `StageUnsupportedError` when the canvas cannot produce a blob — the stage never silently degrades.

## Testing with Injected Surfaces

Inject a fake surface factory and scheduler to unit-test paint behaviour without a GPU:

```ts
const frames = { queued: new Set<(t: number) => void>() };
const stage = createStage(fakeCanvas, {
  createSurface: (w, h) => fakeSurface(w, h),
  height: 200,
  scheduler: {
    cancelFrame: (id) => frames.queued.delete(id),
    now: () => 0,
    requestFrame: (cb) => {
      frames.queued.add(cb);
      return frames.queued.size;
    },
  },
  width: 400,
});
```

The default factory uses `OffscreenCanvas` when present, else a canvas from the document; in environments with neither, it throws `StageUnsupportedError`.

## Worker Rendering

The `@vielzeug/stage/worker` subpath renders the composited canvas inside a Web Worker. The main thread transfers an `OffscreenCanvas` once and then drives the stage over an internal message protocol; painters live worker-side. A `WorkerStage` and a main-thread `Stage` share the `StageController` type, so code that only controls a stage works with either.

```ts
// main.ts
import { createWorkerStage } from '@vielzeug/stage/worker';

type Scene = Readonly<{ col: number; id: string; row: number; type: 'move' }>;

const worker = new Worker(new URL('./stage.worker.ts', import.meta.url), { type: 'module' });
const stage = createWorkerStage<Scene>(canvas, worker, {
  height: 600,
  width: 800,
});
// The creator owns the worker: terminate it when the stage is disposed.
stage.disposalSignal.addEventListener('abort', () => worker.terminate());

await stage.ready; // the worker created its stage
stage.setTransform([1, 0, 0, 1, 0, 0]);
stage.sendScene({ col: 3, id: 'hero', row: 2, type: 'move' });
const blob = await stage.toBlob({ type: 'image/png' }); // correlated round-trip
stage.dispose(); // also rejects any in-flight blob requests
```

```ts
// stage.worker.ts
import { serveStage } from '@vielzeug/stage/worker';

serveStage<Scene>(self, () => ({
  layers: [{ id: 'scene', paint: (ctx) => ctx.fillRect(0, 0, 800, 600) }],
  onScene: (scene, stage) => {
    applyMove(scene);
    stage.invalidate('scene'); // the handler owns repaints
  },
}));
```

Notes:

- The worker owns its painters. `serveStage`'s `setup` returns the `layers` (and optional `onScene`/`onDispose` hooks); the main thread never names layers.
- The canvas transfer is **one-shot**: `createWorkerStage` calls `transferControlToOffscreen()` on construction. To go back to main-thread rendering, mount a fresh `<canvas>` element.
- `toBlob()` sends a `blob` command and resolves with the worker's response; requests are correlated by id and reject with `StageDisposedError` if the client is disposed while one is in flight.
- `sendScene(scene)` forwards your typed payload to the worker's `onScene(scene, stage)` hook — useful for mirroring model state (e.g. token moves) without shipping painters to the main thread. The handler decides which layers to invalidate; nothing repaints automatically.
- Invalid size, DPR, or matrix input throws `StageConfigError` on the main thread, exactly like `createStage`.
- Worker-side exceptions are reported through `reportError`, the same path an uncaught main-thread paint error takes. The protocol version is checked once at the init/ready handshake; a stale cached worker rejects `ready` with a `StageError` and disposes the stage.

## Best Practices

- Keep per-layer paint callbacks cheap and cull with `frame.visibleRect`; the stage caches the result, so cost is paid once per invalidation, not per frame.
- Put rarely-changing content (tile grids, backgrounds) on lower layers so pointer-driven changes only repaint upper layers.
- Dispose the stage when the view unmounts: `using stage = createStage(...)` or `stage.dispose()`. Disposal cancels scheduled frames and releases every backing surface.
- Treat `StageUnsupportedError` as a hard capability gap (feature-detect or surface it to the user); there is deliberately no fallback path.
- In worker mode, invalidate only the layers a scene message changed — `onScene` runs on every forwarded payload.
