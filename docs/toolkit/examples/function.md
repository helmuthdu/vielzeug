# ⚙️ Function Utilities

Function utilities provide a powerful set of tools to control execution, compose logic, and enhance function behavior in a type-safe way. Use these helpers for debouncing, throttling, memoization, retries, and more.

## 📚 Quick Reference

### Execution Control

| Method                               | Description                                                                     |
| :----------------------------------- | :------------------------------------------------------------------------------ |
| [`debounce`](./function/debounce.md) | Delay function execution until a specified time has passed since the last call. |
| [`throttle`](./function/throttle.md) | Ensure a function is called at most once in a specified time interval.          |
| [`once`](./function/once.md)         | Ensure a function is only executed once.                                        |
| [`retry`](./function/retry.md)       | Automatically retry an asynchronous function on failure.                        |
| [`delay`](./function/delay.md)       | Returns a promise that resolves after a specified time.                         |
| [`sleep`](./function/sleep.md)       | Pause execution for a specified duration (alias for `delay`).                   |

### Composition & Logic

| Method                             | Description                                                                      |
| :--------------------------------- | :------------------------------------------------------------------------------- |
| [`pipe`](./function/pipe.md)       | Compose functions from left to right.                                            |
| [`compose`](./function/compose.md) | Compose functions from right to left.                                            |
| [`curry`](./function/curry.md)     | Transform a function that takes multiple arguments into a sequence of functions. |
| [`memo`](./function/memo.md)       | Cache the results of a function based on its arguments.                          |
| [`attempt`](./function/attempt.md) | Safely execute a function and return `undefined` instead of throwing an error.   |

### Validation & Concurrency

| Method                                       | Description                                                       |
| :------------------------------------------- | :---------------------------------------------------------------- |
| [`assert`](./function/assert.md)             | Throw an error if a condition is not met (with advanced options). |
| [`assertParams`](./function/assertParams.md) | Validate function parameters against expected types.              |
| [`worker`](./function/worker.md)             | Easily run heavy functions in a Web Worker.                       |

## 💡 Practical Examples

### Controlling Execution

```ts
import { debounce, throttle, retry } from '@vielzeug/toolkit';

// Handle window resize (debounce)
const handleResize = debounce(() => {
  console.log('Resize handled');
}, 250);

// Handle scroll (throttle)
const handleScroll = throttle(() => {
  console.log('Scroll handled');
}, 100);

// Robust API calls
const data = await retry(
  async () => {
    return fetch('/api/data').then((res) => res.json());
  },
  { retries: 3, delay: 1000 },
);
```

### Functional Composition

```ts
import { pipe, memo } from '@vielzeug/toolkit';

const add = (n: number) => n + 1;
const double = (n: number) => n * 2;

// Compose functions
const addAndDouble = pipe(add, double);
addAndDouble(2); // (2 + 1) * 2 = 6

// Memoize heavy calculations
const heavyCalc = memo((n: number) => {
  // complex logic...
  return n * n;
});
```

## 🔗 All Function Utilities

<div class="grid-links">

- [assert](./function/assert.md)
- [assertParams](./function/assertParams.md)
- [attempt](./function/attempt.md)
- [compare](./function/compare.md)
- [compareBy](./function/compareBy.md)
- [compose](./function/compose.md)
- [curry](./function/curry.md)
- [debounce](./function/debounce.md)
- [delay](./function/delay.md)
- [fp](./function/fp.md)
- [memo](./function/memo.md)
- [once](./function/once.md)
- [pipe](./function/pipe.md)
- [predict](./function/predict.md)
- [proxy](./function/proxy.md)
- [retry](./function/retry.md)
- [sleep](./function/sleep.md)
- [throttle](./function/throttle.md)
- [worker](./function/worker.md)

</div>

<style>
.grid-links ul {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 0.5rem;
  list-style: none !important;
  padding: 0 !important;
}
.grid-links li {
  margin: 0 !important;
}
</style>
