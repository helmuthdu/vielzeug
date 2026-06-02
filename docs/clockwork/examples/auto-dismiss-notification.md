---
title: Auto-Dismiss Notification
description: Use delayed transitions to auto-dismiss a notification after a timeout.
---

# Auto-Dismiss Notification

Use `after` to auto-dismiss a notification while still allowing manual dismiss:

```ts
import { defineMachine, interpret } from '@vielzeug/clockwork';

type Event = { type: 'DISMISS' } | { type: 'SHOW'; message: string };
type Context = { message: string };

const notification = defineMachine<'hidden' | 'visible', Context, Event>({
  context: { message: '' },
  initial: 'hidden',
  states: {
    hidden: {
      on: {
        SHOW: {
          actions: [({ context, event }) => { context.message = event.message; }],
          target: 'visible',
        },
      },
    },
    visible: {
      after: [{ delay: 5000, target: 'hidden' }],
      on: { DISMISS: { target: 'hidden' } },
    },
  },
});

const m = interpret(notification);

m.send({ type: 'SHOW', message: 'File saved!' });
// Auto-dismisses after 5 seconds, or user can send DISMISS manually

m[Symbol.dispose]();
```

The `after` timer is automatically cleared if the user sends `DISMISS` before the 5 seconds elapse.
