# @vielzeug/ripple

Framework-agnostic reactive graphs. Zero dependencies. ESM and CJS.

## Installation

```sh
pnpm add @vielzeug/ripple
```

## Reactive graph

```ts
import { createRipple } from '@vielzeug/ripple';

const ripple = createRipple({
  onError(error, context) {
    console.error(context.kind, error);
  },
});

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

Use default exports (`signal`, `computed`, `effect`, `batch`) only when application has one graph for full lifetime.

## Bound helpers

Every `Ripple` instance provides bound helpers:

```ts
const user = ripple.resource(() => userId.value, loadUser);
const cart = ripple.createStore({ items: 0 });
const stop = ripple.watch(() => cart.value.items, renderItems);
```

Nested effects and resources created inside an effect automatically dispose before parent effect reruns:

```ts
ripple.effect(() => {
  ripple.effect(() => render())
})
```

## Documentation

- [Overview](https://vielzeug.dev/ripple/)
- [Usage guide](https://vielzeug.dev/ripple/usage)
- [API reference](https://vielzeug.dev/ripple/api)

## License

MIT © Helmuth Saatkamp
