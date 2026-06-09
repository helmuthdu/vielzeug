---
title: 'Arsenal Examples — runAll'
description: 'runAll example for @vielzeug/arsenal.'
---

## runAll

### Problem

You have a list of cleanup or teardown functions and need to run all of them even if some throw — collecting errors rather than stopping at the first failure.

### Solution

Use `runAll(fns, options?)` to execute all functions and throw an `AggregateError` at the end if any failed.

```ts
import { runAll } from '@vielzeug/arsenal';

const cleanups = [() => closeDatabase(), () => clearCache(), () => flushLogs()];

runAll(cleanups); // all three run; throws AggregateError if any fail
```

#### Reverse order (LIFO teardown)

```ts
import { runAll } from '@vielzeug/arsenal';

runAll(cleanups, { reverse: true }); // runs last → first
```

### Pitfalls

- All functions run regardless of failures. The thrown `AggregateError.errors` array contains each individual error.

### Related

- [attempt](../async/attempt.md)
- [pipe](./pipe.md)
