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
import { batch, computed, createScope, effect, signal } from '@vielzeug/ripple';

const scope = createScope({
  onError: (error, context) => console.error(context.kind, error),
});

const count = signal(0);
scope.run(() => {
  const doubled = computed(() => count.value * 2);
  effect(() => console.log(doubled.value));
});

batch(() => {
  count.value = 1;
  count.value = 2;
});

scope.dispose();
```

Scope handlers receive effect and cleanup failures in their subtree; unhandled errors rethrow
asynchronously. Async resource failures are state values. Effects flush synchronously, so use
`batch()` to coalesce writes. `onCleanup(fn)` runs `fn` when the active scope or effect run is disposed. Package errors use `RippleError`,
`RippleCycleError`, and `RippleDisposedError`.

## Documentation

- [Overview](https://vielzeug.dev/ripple/)
- [Usage Guide](https://vielzeug.dev/ripple/usage)
- [API Reference](https://vielzeug.dev/ripple/api)
- [Examples](https://vielzeug.dev/ripple/examples)
- [Migration Guide](https://vielzeug.dev/ripple/migration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu): part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
