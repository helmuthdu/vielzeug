# sleep

<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-112_B-success" alt="Size">
</div>

The `sleep` utility returns a Promise that resolves after a specified amount of time. It is a modern replacement for `setTimeout` when working with `async/await`, allowing you to pause execution in a clean, readable way.

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Promise-based**: Native integration with `async/await`.
- **Lightweight**: Minimal footprint, perfect for simple delays.

## API

```ts
interface SleepFunction {
  (ms: number): Promise<void>
}
```

### Parameters

- `ms`: The number of milliseconds to pause execution.

### Returns

- A Promise that resolves after the specified duration.

## Examples

### Basic Delay

```ts
import { sleep } from '@vielzeug/toolkit';

async function process() {
  console.log('Step 1');
  await sleep(1000); // Wait 1 second
  console.log('Step 2');
}
```

### Polling Example

```ts
import { sleep } from '@vielzeug/toolkit';

async function checkStatus() {
  let ready = false;
  while (!ready) {
    ready = await pollApi();
    if (!ready) {
      await sleep(2000); // Check every 2 seconds
    }
  }
}
```

## Implementation Notes

- Performance-optimized using the native `setTimeout`.
- If `0` or a negative number is provided, the Promise resolves in the next event loop tick.
- Throws `TypeError` if the argument is not a number.

## See Also

- [delay](./delay.md): Pause execution and then run a callback.
- [retry](./retry.md): Automatically retry failed operations with a delay.
- [predict](./predict.md): Wait until a specific condition is met.

<style>
.badges {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
}
</style>
