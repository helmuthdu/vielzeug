# @vielzeug/gesture

Framework-neutral pointer gesture primitives.

## Install

```sh
pnpm add @vielzeug/gesture
```

## Quick Start

```ts
import { createSwipeGesture } from '@vielzeug/gesture';

const swipe = createSwipeGesture({
  axis: 'x',
  onCommit: ({ distance }) => {
    if (distance < 0) console.log('next');
    else console.log('previous');
  },
});

swipe.mount(element);

swipe.dispose();
```

[Full documentation](https://vielzeug.dev/gesture/)
