# @vielzeug/stage

> Retained-mode 2D canvas stage engine with DPR-aware layers, dirty repaints, and PNG export

Every layer owns a cached backing surface: only dirty layers repaint, and the composite is one `drawImage` per layer. Paint callbacks draw in world units while the stage applies `dpr × matrix`; surfaces and the frame scheduler are injectable, so the engine is unit-testable without a GPU.

## Installation

```sh
pnpm add @vielzeug/stage
npm install @vielzeug/stage
yarn add @vielzeug/stage
```

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

- **`createStage()`**: layered retained-mode renderer with cached per-layer surfaces
- **Dirty repaints**: invalidate one layer or all; frames coalesce via an injectable scheduler
- **DPR-aware transforms**: paint in world units, the stage scales by `dpr × matrix`
- **`drawSpriteFrame()`**: sprite-sheet cell slicing scaled into world rects
- **`toBlob()`**: PNG export with typed unsupported-capability errors
- **Injectable surfaces**: `createSurface` factory for tests and `OffscreenCanvas` workers
- **`@vielzeug/stage/worker`**: worker-rendered stages via a transferred `OffscreenCanvas` and a versioned message protocol

## Documentation

- [Overview](https://vielzeug.dev/stage/)
- [Usage Guide](https://vielzeug.dev/stage/usage)
- [API Reference](https://vielzeug.dev/stage/api)
- [Examples](https://vielzeug.dev/stage/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu): part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
