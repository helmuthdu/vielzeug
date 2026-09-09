# @vielzeug/ripple

> Reactive runtime primitives: signals, derived values, effects, scopes, watchers, and async resources

## Installation

```sh
pnpm add @vielzeug/ripple
npm install @vielzeug/ripple
yarn add @vielzeug/ripple
```

## Quick Start

```ts
import { createRipple } from '@vielzeug/ripple';

const ripple = createRipple();

const count = ripple.signal(0);
const doubled = ripple.computed(() => count.value * 2);
const stop = ripple.effect(() => console.log(doubled.value));

ripple.batch(() => {
  count.value = 1;
  count.value = 2;
});

stop.dispose();
ripple.dispose();
```

## Documentation

- [Overview](https://vielzeug.dev/ripple/)
- [Usage Guide](https://vielzeug.dev/ripple/usage)
- [API Reference](https://vielzeug.dev/ripple/api)
- [Examples](https://vielzeug.dev/ripple/examples)
- [Migration Guide](https://vielzeug.dev/ripple/migration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
