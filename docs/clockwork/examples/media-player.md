---
title: 'Clockwork Examples — Media Player'
description: 'Commit playback state before calling browser media APIs.'
---

## Media Player

### Problem

Playback commands must update state and call media APIs without mixing side effects into reducers.

### Solution

Use reducers for playback data and post-commit effects for the media element.

```ts
import { defineMachine } from '@vielzeug/clockwork';

type Event = { type: 'PAUSE' } | { type: 'PLAY' } | { position: number; type: 'SEEK' };
const media = { currentTime: 0, pause: () => console.log('paused'), play: () => console.log('playing') };

const player = defineMachine<{ position: number }, Event>()({
  context: { position: 0 },
  initial: 'paused',
  states: {
    paused: {
      on: {
        PLAY: { effects: [() => media.play()], target: 'playing' },
        SEEK: { reduce: ({ event }) => ({ position: event.position }), target: 'paused' },
      },
    },
    playing: {
      on: {
        PAUSE: { effects: [() => media.pause()], target: 'paused' },
        SEEK: {
          effects: [({ context }) => { media.currentTime = context.position; }],
          reduce: ({ event }) => ({ position: event.position }),
          target: 'playing',
        },
      },
    },
  },
});

const actor = player.createActor();
actor.send({ type: 'PLAY' });
actor.send({ position: 42, type: 'SEEK' });
console.log(actor.snapshot.context.position); // 42
actor.dispose();
```

### Pitfalls

- Effects receive committed context, never a mutable draft.
- Effects cannot update context; send an event if later state work is needed.

### Related

- [Debugging Transitions](./debugging-transitions.md)
- [Counter with Reset](./counter-with-reset.md)
- [API Reference](../api.md)
