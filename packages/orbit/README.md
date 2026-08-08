# @vielzeug/orbit

Dependency-free floating UI positioning with lifecycle-owned geometry, middleware, and client-only execution.

## Features

- `createPositioner()` owns coordinates, clipping, updates, and cleanup.
- `computePosition()` remains available for advanced platform-managed positioning.
- Middleware supports offset, flip, shift, size, hide, arrow, inline, and auto-placement.
- `@vielzeug/orbit/reactive` exposes a Ripple adapter when Ripple is installed.
- Root imports are SSR-safe; start positioners only from a client mount lifecycle.

## Install

```sh
pnpm add @vielzeug/orbit
```

Install `@vielzeug/ripple` only when importing `@vielzeug/orbit/reactive`.

## Quick Start

Create a positioner after both elements mount, then dispose it with their owner.

```ts
import { createPositioner, flip, offset, shift } from '@vielzeug/orbit';

const positioner = createPositioner(trigger, tooltip, {
  middleware: [offset(8), flip(), shift({ padding: 6 })],
  placement: 'top',
});

positioner.start();
positioner.dispose();
```

[Full documentation](https://vielzeug.dev/orbit/)
