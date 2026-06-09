---
title: 'Arsenal Examples — tap'
description: 'tap example for @vielzeug/arsenal.'
---

## tap

### Problem

You need to insert a side effect (logging, tracking) into a pipeline without breaking the data flow.

### Solution

Use `tap(value, callback)` to call `callback(value)` and return `value` unchanged.

```ts
import { tap } from '@vielzeug/arsenal';

const result = tap(expensiveComputation(), (v) => console.log('computed:', v));
// result is the computed value; the log is a side effect
```

#### In a pipe

```ts
import { pipe, tap } from '@vielzeug/arsenal';

const process = pipe(
  (s: string) => s.trim(),
  (s) => tap(s, (v) => console.log('after trim:', v)),
  (s) => s.toUpperCase(),
);
```

### Pitfalls

- The callback's return value is ignored. `tap` always returns the original `value`.

### Related

- [identity](./identity.md)
- [pipe](./pipe.md)
