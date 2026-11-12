---
title: 'Arsenal Examples: timer'
description: 'timer example for @vielzeug/arsenal.'
---

## timer

### Problem

You hold a one-shot timeout (idle flush, connection deadline, wake-up) that must be restarted or cancelled, and the `let id; clearTimeout(id); id = setTimeout(...)` bookkeeping keeps spreading.

### Solution

Use `timer(fn)` to get a single-slot handle. `arm(ms)` replaces any pending run; `cancel()` drops it; `pending` tells whether a run is scheduled.

```ts
import { timer } from '@vielzeug/arsenal';

const idleFlush = timer(() => save());

onChange(() => idleFlush.arm(500)); // debounce: each change restarts the delay
onDispose(() => idleFlush.cancel());
```

### Pitfalls

- `timer` runs `fn` once per `arm`; re-arm inside `fn` for a repeating schedule.
- `pending` is `false` inside `fn`.
- Delays above 2,147,483,647 ms overflow `setTimeout`: clamp them first.

### Related

- [sleep](./sleep.md)
- [waitFor](./waitFor.md)
