---
title: Hierarchical States
description: Use compound states with automatic leaf resolution.
---

# Hierarchical States

Compound states group related substates. Entering a compound state automatically resolves to its `initial` child:

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
