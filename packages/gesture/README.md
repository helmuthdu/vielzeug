# @vielzeug/gesture

Framework-neutral one-axis pointer pan recognition.

## Install

```sh
pnpm add @vielzeug/gesture
```

## Quick Start

```ts
import { createPanGesture } from '@vielzeug/gesture';

const pan = createPanGesture(element, {
  axis: 'x',
  onMove: ({ distance }) => {
    element.style.transform = `translateX(${distance}px)`;
  },
  onEnd: ({ distance, reason }) => {
    element.style.transform = '';

    if (reason === 'release' && Math.abs(distance) >= 48) {
      dismiss();
    }
  },
});

pan.dispose();
```

Pointer capture is enabled by default. Set `pointerCapture: false` for surfaces whose nested or
newly revealed controls must retain native pointer-up targeting.

[Full documentation](https://vielzeug.dev/gesture/)
