# @vielzeug/clockwork

> Framework-neutral typed finite state machines for TypeScript.

Clockwork separates pure transition decisions from actor-owned runtime work. Define a machine once, then create independent actors for effects, timers, invokes, subscriptions, and disposal.

## Quick Start

```ts
import { defineMachine } from '@vielzeug/clockwork';

type Event = { type: 'INC' } | { type: 'RESET' };

const counter = defineMachine<{ count: number }, Event>()({
  context: { count: 0 },
  initial: 'idle',
  states: {
    idle: {
      on: {
        INC: { reduce: ({ context }) => ({ count: context.count + 1 }), target: 'idle' },
        RESET: { reduce: () => ({ count: 0 }), target: 'idle' },
      },
    },
  },
});

const actor = counter.createActor();
actor.send({ type: 'INC' });

console.log(actor.snapshot);
// { state: 'idle', context: { count: 1 } }

actor.dispose();
```

## Design

- **Pure machine** — `transition(snapshot, event)` returns only the next snapshot and result type; it never starts runtime work.
- **Independent actors** — `createActor()` owns an event queue, invokes, timers, subscriptions, and cancellation.
- **Typed definitions** — `defineMachine<Context, Event>()(definition)` accepts a non-array record context and narrows events in guards and reducers.
- **Post-commit effects** — actors notify subscribers, then run exit, transition, and entry effects.
- **Flat states** — one explicit state map; compose machines instead of nesting state trees.
- **No runtime dependencies** — works in browser, Node, workers, SSR, and any framework.

## Core API

| Export | Purpose |
| --- | --- |
| `defineMachine<Context, Event>()(definition)` | Compile and validate a machine definition |
| `machine.transition(snapshot, event)` | Run pure transition logic |
| `machine.createActor(options?)` | Create an owned runtime actor |
| `Actor` | Runtime resource with a readonly snapshot, subscriptions, and disposal |
| `ClockworkError` | Validation error with stable `code` |
| `debugActor(actor, options?)` | Observe committed actor snapshots from `/devtools` |

## Async invokes and timers

State nodes may declare `invoke` tasks and `after` timers. Both begin when an actor enters a state and are cancelled when it exits or disposes. Fresh actors run entry effects and resources; restored actors start only the restored state's invokes and timers. Invokes convert completion or failure into regular machine events.

```ts
import { defineMachine } from '@vielzeug/clockwork';

type Event = { type: 'LOAD' } | { result: string; type: 'DONE' } | { message: string; type: 'FAIL' };

const loader = defineMachine<{ data: string }, Event>()({
  context: { data: '' },
  initial: 'idle',
  states: {
    idle: { on: { LOAD: { target: 'loading' } } },
    loading: {
      invoke: [{
        src: async ({ signal }) => fetch('/api/data', { signal }).then((response) => response.text()),
        onDone: ({ result }) => ({ result, type: 'DONE' }),
        onError: ({ error }) => ({ message: String(error), type: 'FAIL' }),
      }],
      on: {
        DONE: { reduce: ({ event }) => ({ data: event.result }), target: 'ready' },
        FAIL: { target: 'error' },
      },
    },
    ready: {},
    error: {},
  },
});
```

## Devtools

`debugActor(actor, options?)` observes committed snapshots with `console.debug`. It does not modify actor behavior or trace dispatches and runtime errors.

```ts
import { defineMachine } from '@vielzeug/clockwork';
import { debugActor } from '@vielzeug/clockwork/devtools';

const machine = defineMachine<Record<string, never>, { type: 'NEXT' }>()({
  initial: 'idle',
  states: { idle: { on: { NEXT: { target: 'idle' } } } },
});
const actor = machine.createActor();
const stopDebugging = debugActor(actor);

actor.send({ type: 'NEXT' });
stopDebugging();
actor.dispose();
```

## Installation

```sh
pnpm add @vielzeug/clockwork
```

## Documentation

- [Full Guide](https://vielzeug.dev/clockwork/)
- [Usage Guide](https://vielzeug.dev/clockwork/usage/)
- [API Reference](https://vielzeug.dev/clockwork/api/)
- [Examples](https://vielzeug.dev/clockwork/examples/)

## License

MIT
