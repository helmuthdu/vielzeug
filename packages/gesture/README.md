# @vielzeug/gesture

> Framework-neutral two-dimensional pointer drag and one-axis pan recognition with lifecycle-owned handles

## Installation

```sh
pnpm add @vielzeug/gesture
npm install @vielzeug/gesture
yarn add @vielzeug/gesture
```

## Quick Start

```ts
import { createDragGesture, createPanGesture } from '@vielzeug/gesture';

const element = document.querySelector<HTMLElement>('[data-swipe]');
if (!element) throw new Error('Missing [data-swipe] element');

const pan = createPanGesture(element, {
  activationDistance: 6,
  axis: 'x',
  onMove: ({ distance }) => {
    element.style.transform = `translateX(${distance}px)`;
  },
  onEnd: ({ distance, reason }) => {
    element.style.transform = '';

    if (reason === 'release' && Math.abs(distance) >= 48) {
      pan.dispose();
      element.remove();
    }
  },
});

window.addEventListener('pagehide', () => pan.dispose(), { once: true });
```

## Documentation

- [Overview](https://vielzeug.dev/gesture/)
- [Usage Guide](https://vielzeug.dev/gesture/usage)
- [API Reference](https://vielzeug.dev/gesture/api)
- [Examples](https://vielzeug.dev/gesture/examples)
- [Migration Guide](https://vielzeug.dev/gesture/migration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
