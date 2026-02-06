<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-144_B-success" alt="Size">
</div>

# delay

The `delay` utility provides a clean, Promise-based way to execute a function after a specified amount of time. It combines a timer with a callback, allowing you to easily chain asynchronous operations.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/function/delay.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Promise-based**: Seamless integration with `async/await`.
- **Integrated Callback**: Automatically executes the provided function once the timer expires.
- **Type-safe**: Properly infers the return type of the delayed function.

## API

```ts
function delay<T>(fn: () => T | Promise<T>, wait: number): Promise<T>
```

### Parameters

- `fn`: The function to execute after the delay.
- `wait`: The time in milliseconds to wait.

### Returns

- A Promise that resolves with the result of `fn`.

## Examples

### Basic Usage

```ts
import { delay } from '@vielzeug/toolkit';

async function welcome() {
  const result = await delay(() => 'Welcome!', 1000);
  console.log(result); // Logs 'Welcome!' after 1 second
}
```

### Chaining Operations

```ts
import { delay, pipe } from '@vielzeug/toolkit';

const step1 = () => console.log('Starting...');
const step2 = () => delay(() => console.log('Finished!'), 500);

await step1();
await step2();
```

## Implementation Notes

- Performance-optimized using the native `setTimeout` under the hood.
- If `fn` is asynchronous, the returned Promise waits for both the timer and the completion of `fn`.
- Throws `TypeError` if `fn` is not a function or `wait` is not a number.

## See Also

- [sleep](./sleep.md): Pause execution without a mandatory callback.
- [debounce](./debounce.md): Rate-limit execution based on inactivity.
- [retry](./retry.md): Automatically retry a failed operation with a delay.
