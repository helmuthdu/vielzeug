---
title: 'Toolkit — Function Examples'
description: 'Function utility examples for Toolkit.'
---

# Function Utilities

Function utilities provide a powerful set of tools to control execution, compose logic, and enhance function behavior in a type-safe way. Use these helpers for debouncing, throttling, memoization, retries, and more.

## 📚 Quick Reference

## Problem

Implement 📚 quick reference in a production-friendly way with `@vielzeug/toolkit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/toolkit` installed.

### Execution Control

| Method                               | Description                                                                     |
| :----------------------------------- | :------------------------------------------------------------------------------ |
| [`debounce`](./function/debounce.md) | Delay function execution until a specified time has passed since the last call. |
| [`throttle`](./function/throttle.md) | Ensure a function is called at most once in a specified time interval.          |
| [`once`](./function/once.md)         | Ensure a function is only executed once.                                        |

### Composition & Logic

| Method                             | Description                                                                      |
| :--------------------------------- | :------------------------------------------------------------------------------- |
| [`pipe`](./function/pipe.md)       | Compose functions from left to right.                                            |
| [`compose`](./function/compose.md) | Compose functions from right to left.                                            |
| [`curry`](./function/curry.md)     | Transform a function that takes multiple arguments into a sequence of functions. |
| [`memo`](./function/memo.md)       | Cache the results of a function based on its arguments.                          |

### Validation & Concurrency

| Method                                       | Description                                                       |
| :------------------------------------------- | :---------------------------------------------------------------- |
| [`assert`](./function/assert.md)             | Throw an error if a condition is not met (with advanced options). |
| [`assertParams`](./function/assertParams.md) | Validate function parameters against expected types.              |

## 💡 Practical Examples

::: tip Async Utilities
For async operations like `retry`, `parallel`, `attempt`, `delay`, `sleep`, and `predict`, see the [Async Utilities](./async.md).
:::

### Controlling Execution

```ts
import { debounce, throttle, once } from '@vielzeug/toolkit';

// Handle window resize (debounce)
const handleResize = debounce(() => {
  console.log('Resize handled');
}, 250);

// Handle scroll (throttle)
const handleScroll = throttle(() => {
  console.log('Scroll handled');
}, 100);

// Ensure init runs only once
const init = once(() => {
  console.log('Initialized');
});
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
- [compare](./function/compare.md)
- [compareBy](./function/compareBy.md)
- [compose](./function/compose.md)
- [curry](./function/curry.md)
- [debounce](./function/debounce.md)
- [fp](./function/fp.md)
- [memo](./function/memo.md)
- [once](./function/once.md)
- [pipe](./function/pipe.md)
- [throttle](./function/throttle.md)

</div>

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Array Examples](./array.md)
- [Async Examples](./async.md)
- [Date Examples](./date.md)
