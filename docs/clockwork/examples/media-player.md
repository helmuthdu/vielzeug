---
title: 'Clockwork Examples — Media Player'
description: 'Playback control with async loading states using @vielzeug/clockwork.'
---

## Media Player

### Problem

A media player needs to handle loading audio, playing, pausing, seeking, and volume control. Different states have different capabilities: you can't seek while loading, volume changes affect both playing and paused states. Manual state tracking leads to inconsistent UI and race conditions between overlapping operations.

### Solution

Use entry/exit actions for side effects (log playback state), `invoke` for async loading with onDone/onError handlers, and guard-free transitions for simple control changes like seeking.

```ts
import { createMachine } from '@vielzeug/clockwork';

type PlayerContext = {
  url: string;
  currentTime: number;
  duration: number;
  volume: number;
};

type PlayerEvent =
  | { type: 'LOAD'; url: string }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'SEEK'; time: number }
  | { type: 'VOLUME'; level: number }
  | { type: 'LOADED'; duration: number }
  | { type: 'ERROR'; error: string };

const playerMachine = createMachine({
  initial: 'idle',
  context: { url: '', currentTime: 0, duration: 0, volume: 100 },
  states: {
    idle: {
      on: {
        LOAD: [
          {
            target: 'loading',
            actions: [
              ({ context, event }) => {
                context.url = event.url;
              },
            ],
          },
        ],
      },
    },
    loading: {
      invoke: [
        {
          src: async ({ context }) =>
            fetch(context.url).then((r) => {
              if (!r.ok) throw new Error('Failed to load');
              return r.blob().then((blob) => URL.createObjectURL(blob));
            }),
          onDone: () => ({ type: 'LOADED', duration: 180 }), // Duration typically from metadata
          onError: (error) => ({ type: 'ERROR', error: String(error) }),
        },
      ],
      on: {
        LOADED: [
          {
            target: 'paused',
            actions: [
              ({ context, event }) => {
                context.duration = event.duration;
              },
            ],
          },
        ],
        ERROR: [
          {
            target: 'error',
            actions: [
              ({ context }) => {
                context.url = '';
              },
            ],
          },
        ],
      },
    },
    playing: {
      entry: () => console.log('<ore-icon name="play" size="16"></ore-icon> Playing...'),
      exit: () => console.log('<ore-icon name="pause" size="16"></ore-icon> Paused'),
      on: {
        PAUSE: [{ target: 'paused' }],
        SEEK: [
          {
            actions: [
              ({ context, event }) => {
                context.currentTime = event.time;
              },
            ],
            target: 'playing',
          },
        ],
        VOLUME: [
          {
            actions: [
              ({ context, event }) => {
                context.volume = event.level;
              },
            ],
            target: 'playing',
          },
        ],
      },
    },
    paused: {
      on: {
        PLAY: [{ target: 'playing' }],
        SEEK: [
          {
            actions: [
              ({ context, event }) => {
                context.currentTime = event.time;
              },
            ],
            target: 'paused',
          },
        ],
        VOLUME: [
          {
            actions: [
              ({ context, event }) => {
                context.volume = event.level;
              },
            ],
            target: 'paused',
          },
        ],
      },
    },
    error: {
      on: {
        LOAD: [
          {
            target: 'loading',
            actions: [
              ({ context, event }) => {
                context.url = event.url;
              },
            ],
          },
        ],
      },
    },
  },
}).start();

const player = playerMachine;

// Start playback
player.send({ type: 'LOAD', url: '/music/song.mp3' });
// state: 'loading' (fetching audio)

// Listen for state changes
player.subscribe((state) => console.log('State:', state.value, 'Volume:', player.context.value.volume));

// Once loading completes: state → 'paused'
setTimeout(() => {
  player.send({ type: 'PLAY' }); // state: 'playing' (logs "<ore-icon name="play" size="16"></ore-icon> Playing...")
  player.send({ type: 'SEEK', time: 30 }); // Seek to 30s
  player.send({ type: 'VOLUME', level: 50 }); // Volume to 50%
  player.send({ type: 'PAUSE' }); // state: 'paused' (logs "<ore-icon name="pause" size="16"></ore-icon> Paused")
}, 100);
```

### Pitfalls

- **invoke blocking during state transition** — While in `loading` state, sending PLAY won't work; you must wait for onDone to transition to paused first. Design UI to show "Loading..." spinner.
- **Seeking while loading is silently ignored** — The SEEK event isn't defined in `loading` state's `on` object, so it has no handler. Add SEEK handlers to every state that should support seeking.
- **Entry/exit side effects run every transition** — If you have audio.play() in the `playing` entry action, it re-runs every time you seek (transition: playing → playing). Use a custom invoke instead of entry/exit for actual playback control.
- **Metadata fetch async but separate from src** — The actual audio duration comes from a separate metadata request in real implementations. Store duration in context separately from the URL loading.

### Related

- [Fetch with Retry](./fetch-retry.md) — Async loading patterns with retry
- [Shopping Cart Checkout](./checkout.md) — Multiple state transitions with enter/exit actions
- [Ore documentation](/ore/) — Binding player state to UI reactively
