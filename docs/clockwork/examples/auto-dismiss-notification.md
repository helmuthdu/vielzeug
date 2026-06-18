---
title: Auto-Dismiss Notification
description: Use delayed transitions to auto-dismiss a notification after a timeout.
---

## Auto-Dismiss Notification

### Problem

Notifications that stay on screen indefinitely create visual clutter. You need a notification that auto-dismisses after a timeout, but still allows the user to dismiss it manually before the timer fires.

### Solution

Use `after` on the `visible` state to schedule a delayed transition. Clockwork automatically cancels the timer when the state is exited:

```ts
import { machine } from '@vielzeug/clockwork';

type Event = { type: 'DISMISS' } | { type: 'SHOW'; message: string };
type Context = { message: string };

const notification = machine({
  context: { message: '' },
  initial: 'hidden',
  states: {
    hidden: {
      on: {
        SHOW: {
          actions: [
            ({ context, event }) => {
              context.message = event.message;
            },
          ],
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

const m = notification;

m.send({ type: 'SHOW', message: 'File saved!' });
// Auto-dismisses after 5 seconds, or user can send DISMISS manually

m[Symbol.dispose]();
```

### Pitfalls

- **`after` does not fire if the machine enters a final state** — use an explicit `DISMISS` transition to reach final states before the timer fires.
- **Multiple `SHOW` events while visible** — if you send `SHOW` again while visible, the state re-enters and the timer resets. This is intentional but may surprise you.

### Related

- [Clockwork Examples](/clockwork/examples.md)
- [Fetch with Retry](./fetch-retry.md) — other delay/timeout patterns
