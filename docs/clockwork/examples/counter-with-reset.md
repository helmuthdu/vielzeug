---
title: 'Clockwork Examples — Counter with Reset'
description: Counter with Reset example for @vielzeug/clockwork.
---

## Counter with Reset

### Problem

You need a counter that tracks a numeric value and can be incremented, decremented, or reset to zero. This is the simplest Machine pattern for context mutation via actions.

### Solution

Use a single `idle` state with self-transitions that apply actions to mutate context. Self-transitions re-enter the same state, fire actions, and update context atomically.

```ts
import { defineMachine, interpret } from '@vielzeug/clockwork';

type Event = { type: 'DEC' } | { type: 'INC' } | { type: 'RESET' };

const counter = defineMachine<'idle', { count: number }, Event>({
  context: { count: 0 },
  initial: 'idle',
  states: {
    idle: {
      on: {
        DEC: {
          actions: [
            ({ context }) => {
              context.count -= 1;
            },
          ],
          target: 'idle',
        },
        INC: {
          actions: [
            ({ context }) => {
              context.count += 1;
            },
          ],
          target: 'idle',
        },
        RESET: {
          actions: [
            ({ context }) => {
              context.count = 0;
            },
          ],
          target: 'idle',
        },
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

- **Actions receive a cloned draft.** Mutate `context` directly inside action functions — this is the intended pattern.
- **Self-transitions run exit/entry actions.** If you add `entry` or `exit` to `idle`, they fire on every self-transition, not just on first entry. Use transition `actions` for per-event mutations.
- **For nested objects, mutate in place or spread explicitly.** `context.nested.key = value` works. If replacing the whole nested object, assign it: `context.nested = { ...context.nested, key: value }`.

### Related

- [Data Fetching with Error Recovery](./data-fetching.md) — Using actions inside async invoke results
- [Auth Flow with Guards](./auth-flow.md) — Combining actions with guards
- [API Reference — `ActionFn`](/clockwork/api#actionfnctx-ev)
