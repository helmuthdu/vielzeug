<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-184_B-success" alt="Size">
</div>

# once

The `once` utility restricts a function so that it can only be executed a single time. Subsequent calls to the restricted function will return the result of the first invocation. It also includes a `reset` method to allow the function to be run again if needed.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/function/once.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Stateful**: Remembers the result of the first call.
- **Resettable**: Manual control to clear the cached result and allow a new execution.
- **Type-safe**: Preserves the argument and return types of the original function.

## API

```ts
function once<T extends (...args: any[]) => any>(fn: T): T
```

### Parameters

- `fn`: The function to restrict.

### Returns

- A new function that only executes `fn` once.
- The returned function has a `.reset()` property to clear its state.

## Examples

### One-time Initialization

```ts
import { once } from '@vielzeug/toolkit';

const initializeApp = once(() => {
  console.log('Connecting to database...');
  return { status: 'ready' };
});

initializeApp(); // Logs message, returns { status: 'ready' }
initializeApp(); // Returns same object, no log
```

### Resettable Logic

```ts
import { once } from '@vielzeug/toolkit';

const getData = once(() => fetch('/api/data'));

await getData(); // Performs fetch
await getData(); // Returns cached promise

// Force a new fetch later
getData.reset();
await getData(); // Performs new fetch
```

## Implementation Notes

- Performance-optimized using a simple closure.
- The `.reset()` method is ideal for handling logout/re-login scenarios or refreshing stale caches.
- Throws `TypeError` if `fn` is not a function.

## See Also

- [memo](./memo.md): Cache results based on multiple different arguments.
- [throttle](./throttle.md): Rate-limit execution based on time.
- [debounce](./debounce.md): Delay execution until a quiet period.
