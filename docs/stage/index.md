---
title: 'Stage: Retained-Mode 2D Canvas Engine'
description: 'Retained-mode 2D canvas stage engine with DPR-aware layers, dirty repaints, and PNG export'
package: stage
category: utilities
keywords: [canvas, rendering, layers, dpr, offscreencanvas, png-export, 2d]
exports: [createStage, StageError, StageConfigError, StageDisposedError, StageUnsupportedError]
related: [atlas, gesture, ink]
environments: [browser, worker]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="stage" />

## Why Stage?

A `requestAnimationFrame` loop that redraws everything every frame falls over once a canvas has more than a handful of layers: backgrounds, tiles, tokens, and overlays all repaint even when one token moved. Stage gives you a retained-mode alternative as a headless engine: every layer owns a cached backing surface, only dirty layers repaint, and the composite is one `drawImage` per layer. It handles DPR scaling, world-space transforms (pair it with `@vielzeug/atlas` cameras), and PNG export — with injectable surfaces and schedulers so the whole thing is unit-testable without a GPU.

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/stage
```

```sh [npm]
npm install @vielzeug/stage
```

```sh [yarn]
yarn add @vielzeug/stage
```

:::

## Quick Start

```ts
import { createStage } from '@vielzeug/stage';

const stage = createStage(canvas, {
  dpr: window.devicePixelRatio,
  height: 600,
  layers: [
    { id: 'grid', paint: (ctx, { visibleRect }) => drawGrid(ctx, visibleRect) },
    { id: 'tokens', paint: (ctx) => drawTokens(ctx) },
  ],
  width: 800,
});

stage.setTransform([2, 0, 0, 2, 40, 10]); // world→screen; DPR applied on top
token.x += 10;
stage.invalidate('tokens'); // only the tokens layer repaints
```

## Features

<div class="features-grid">

- **`createStage()`**: layered retained-mode renderer with cached per-layer surfaces
- **Dirty repaints**: invalidate one layer or all; frames coalesce via an injectable scheduler
- **DPR-aware transforms**: paint in world units, the stage scales by `dpr × matrix`
- **`StageController`**: one control type shared by main-thread and worker stages
- **`toBlob()`**: PNG export of the composited canvas, flushing pending frames, with typed unsupported-capability errors
- **Injectable surfaces**: `createSurface` factory for tests and `OffscreenCanvas` workers
- **`@vielzeug/stage/worker`**: worker-rendered stages via a transferred `OffscreenCanvas` and a typed scene channel

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

</div>

## See Also

<div class="see-also">

- [Atlas](/atlas/): cameras, spatial index, and tile grids that feed Stage transforms.
- [Gesture](/gesture/): pointer drag, pinch, and wheel recognition.

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
