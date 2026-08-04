---
title: 'Clockwork Examples — Auto-Dismiss Notification'
description: 'Use actor-owned delayed transitions for temporary notifications.'
---

## Auto-Dismiss Notification

### Problem

A notification should hide after a delay but also support an earlier dismissal.

### Solution

Schedule an `after` transition in `visible`; leaving that state cancels its timer.

```ts
import { defineMachine } from '@vielzeug/clockwork';

type Event = { type: 'DISMISS' } | { message: string; type: 'SHOW' };

const notification = defineMachine<{ message: string }, Event>()({
  context: { message: '' },
  initial: 'hidden',
  states: {
    hidden: {
      on: { SHOW: { reduce: ({ event }) => ({ message: event.message }), target: 'visible' } },
    },
    visible: {
      after: [{ delay: 5_000, target: 'hidden' }],
      on: { DISMISS: { target: 'hidden' } },
    },
  },
});

const actor = notification.createActor();
actor.send({ type: 'SHOW', message: 'File saved' });
console.log(actor.snapshot.state); // 'visible'
actor.send({ type: 'DISMISS' });
console.log(actor.snapshot.state); // 'hidden'
actor.dispose();
```

### Pitfalls

- Timers exist only in actors; `machine.transition()` does not schedule them.
- Dispose the actor when its UI owner is removed.

### Related

- [Fetch with Retry](./fetch-retry.md)
- [Data Fetching with Error Recovery](./data-fetching.md)
- [API Reference](../api.md)
