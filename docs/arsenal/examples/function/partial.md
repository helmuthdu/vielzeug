---
title: 'Arsenal Examples — runAll'
description: 'runAll example for @vielzeug/arsenal.'
---

## runAll

### Problem

You need to invoke a list of callbacks — teardown functions, event listeners, or cleanup handlers — and collect all errors instead of stopping on the first failure.

### Solution

Use `runAll(fns, options?)` to call every function in the array. If any throw, the errors are collected into an `AggregateError` thrown after all functions have run.

```ts
import { runAll } from '@vielzeug/arsenal';

const cleanups = [
  () => socket.close(),
  () => db.disconnect(),
  () => timer.cancel(),
];

try {
  runAll(cleanups, { reverse: true }); // reverse: true for teardown-safe LIFO order
} catch (err) {
  if (err instanceof AggregateError) {
    console.error('cleanup errors', err.errors);
  }
}
```

### Pitfalls

- `runAll` always throws `AggregateError` (never plain `Error`) when any callback fails.
- `{ reverse: true }` runs in LIFO order, which matches typical teardown semantics.

### Related

- [once](./once.md)
- [pipe](./pipe.md)
