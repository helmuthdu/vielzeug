# @vielzeug/sentinel

> Subscribable snapshots for external browser environment state

## Installation

```sh
pnpm add @vielzeug/sentinel
npm install @vielzeug/sentinel
yarn add @vielzeug/sentinel
```

## Quick Start

```ts
import { createViewport } from '@vielzeug/sentinel';

function observeViewport(): () => void {
  const viewport = createViewport();
  const render = () => {
    const { dpr, height, width } = viewport.getSnapshot();
    console.log(`${width}×${height} at ${dpr}dpr`);
  };

  render();
  const unsubscribe = viewport.subscribe(render);

  return () => {
    unsubscribe();
    viewport.dispose();
  };
}

const stopObserving = observeViewport();
// Call stopObserving() when the owning view unmounts.
```

## Documentation

- [Overview](https://vielzeug.dev/sentinel/)
- [Usage Guide](https://vielzeug.dev/sentinel/usage)
- [API Reference](https://vielzeug.dev/sentinel/api)
- [Examples](https://vielzeug.dev/sentinel/examples)
- [Migration Guide](https://vielzeug.dev/sentinel/migration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
