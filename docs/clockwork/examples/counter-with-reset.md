---
title: 'Clockwork Examples — Counter with Reset'
description: Counter with Reset example for @vielzeug/clockwork.
---

## Counter with Reset

### Problem

You need a counter that tracks a numeric value and can be incremented, decremented, or reset to zero. This is the simplest Machine pattern for context mutation via `assign()`.

### Solution

Use a single `idle` state with self-transitions that apply `assign()` to mutate context. Self-transitions re-enter the same state, fire actions, and update context atomically.

```ts
import { assign, defineMachine, interpret } from '@vielzeug/clockwork';

type Event = { type: 'DEC' } | { type: 'INC' } | { type: 'RESET' };

const counter = defineMachine<'idle', { count: number }, Event>({
  context: { count: 0 },
  initial: 'idle',
  states: {
    idle: {
      on: {
        DEC:   { actions: [assign(({ context }) => ({ count: context.count - 1 }))], target: 'idle' },
        INC:   { actions: [assign(({ context }) => ({ count: context.count + 1 }))], target: 'idle' },
        RESET: { actions: [assign(() => ({ count: 0 }))], target: 'idle' },
      },
    },
  },
});

const m = interpret(counter);
m.send({ type: 'INC' });
m.send({ type: 'INC' });
console.log(m.context.value.count); // 2
m.send({ type: 'RESET' });
console.log(m.context.value.count); // 0
```

### Pitfalls

- **`assign()` is shallow.** If your context has nested objects, spread them explicitly: `assign(({ context }) => ({ nested: { ...context.nested, key: value } }))`. Returning `{ nested: { key: value } }` overwrites all other keys in `nested`.
- **Self-transitions run exit/entry actions.** If you add `entry` or `exit` to `idle`, they fire on every self-transition, not just on first entry. Use transition `actions` for per-event mutations.
- **`context` in `assign()` is a draft, not the frozen signal value.** Mutating `args.context` directly instead of returning a partial works but is not the intended pattern.

### Related

- [Data Fetching with Error Recovery](./data-fetching.md) — Using `assign()` inside async invoke results
- [Auth Flow with Guards](./auth-flow.md) — Combining `assign()` with guards
- [API Reference — `assign()`](/clockwork/api#assign)
