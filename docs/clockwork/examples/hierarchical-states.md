---
title: Hierarchical States
description: Use compound states with automatic leaf resolution.
---

## Hierarchical States

### Problem

Related states share common transitions and data but differ in their sub-behaviour. Flattening them into sibling states leads to duplicated event handlers and state explosion.

### Solution

Use compound states to group related substates. Entering a compound state automatically resolves to its `initial` child. Shared transitions on the parent apply to all substates:

```ts
import { defineMachine, interpret } from '@vielzeug/clockwork';

type Event = { type: 'CANCEL' } | { type: 'EDIT' } | { type: 'SAVE' } | { type: 'SAVED' };

type Context = { draft: string };

const editor = defineMachine<'idle' | 'editing', Context, Event>({
  context: { draft: '' },
  initial: 'idle',
  states: {
    idle: {
      on: { EDIT: { target: 'editing' } },
    },
    editing: {
      initial: 'draft',
      states: {
        draft: {
          on: {
            CANCEL: { target: 'idle' },
            SAVE: { target: 'editing.saving' },
          },
        },
        saving: {
          invoke: [
            {
              src: async ({ context, signal }) => {
                await fetch('/api/save', { body: context.draft, method: 'POST', signal });
              },
              onDone: () => ({ type: 'SAVED' }),
              onError: () => ({ type: 'CANCEL' }),
            },
          ],
          on: {
            SAVED: { target: 'idle' },
            CANCEL: { target: 'editing.draft' },
          },
        },
      },
    },
  },
});

const m = interpret(editor);

console.log(m.state.value); // 'idle'

m.send({ type: 'EDIT' });
console.log(m.state.value); // 'editing.draft' (auto-resolved to initial leaf)

m.matches('editing'); // true — ancestor match
m.matches('editing.draft'); // true — exact match

m[Symbol.dispose]();
```

### Pitfalls

- **`matches('parent')` returns `true` for any child state** — use `state.value` for exact matching, `matches()` for ancestor checks.
- **Transitions on a compound state apply to all children** — if you add a transition on the parent, every substate will handle that event. Use child-level `on` to restrict scope.

### Related

- [Clockwork Examples](/clockwork/examples.md)
- [Unit Testing with resolveTransition](./unit-testing.md)
