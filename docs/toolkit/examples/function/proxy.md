<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-412_B-success" alt="Size">
</div>

# proxy

The `proxy` utility creates an enhanced JavaScript Proxy for an object, allowing you to intercept and react to property access (`get`) and modifications (`set`). It features support for selective property watching and optional deep proxying for nested structures.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/function/proxy.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Reactive Handlers**: Execute custom logic whenever properties are read or updated.
- **Deep Proxying**: Optionally intercept changes in nested objects and arrays automatically.
- **Selective Watching**: Limit interceptions to a specific list of keys for better performance.
- **Type-safe**: Preserves the original object's interface.

## API

::: details Type Definitions
<<< @/../packages/toolkit/src/function/proxy.ts#ProxyOptions
:::

```ts
function proxy<T extends object>(item: T, options?: ProxyOptions<T>): T
```

### Parameters

- `item`: The source object to wrap in a Proxy.
- `options`: Optional configuration:
  - `set`: Callback triggered when a property value is changed.
  - `get`: Callback triggered when a property value is accessed.
  - `deep`: If `true`, nested objects are also wrapped in proxies (defaults to `false`).
  - `watch`: An array of keys to monitor. If provided, callbacks only trigger for these properties.

### Returns

- A new Proxy object that behaves like the original but triggers the specified handlers.

## Examples

### Watching Property Changes

```ts
import { proxy } from '@vielzeug/toolkit';

const user = { name: 'Alice', age: 25 };

const observableUser = proxy(user, {
  set: (prop, next, prev) => {
    console.log(`${String(prop)} changed from ${prev} to ${next}`);
  },
});

observableUser.name = 'Bob'; // Logs: name changed from Alice to Bob
```

### Selective Watching (Deep)

```ts
import { proxy } from '@vielzeug/toolkit';

const config = {
  api: { host: 'localhost' },
  ui: { theme: 'dark' },
};

// Only watch the 'api' key, and do it deeply
const watchedConfig = proxy(config, {
  deep: true,
  watch: ['api'],
  set: (prop) => console.log(`API config updated: ${String(prop)}`),
});

watchedConfig.api.host = 'api.example.com'; // Triggers callback
watchedConfig.ui.theme = 'light'; // Does NOT trigger callback
```

## Implementation Notes

- Performance-optimized to avoid overhead on un-watched properties.
- Returns a standard Proxy object that can be used anywhere the original object is accepted.
- Throws `TypeError` if `item` is not a proxy-able object (e.g., a primitive).

## See Also

- [memo](./memo.md): Cache results of function calls.
- [path](../object/path.md): Safely access nested data.
- [merge](../object/merge.md): Combine multiple objects.
