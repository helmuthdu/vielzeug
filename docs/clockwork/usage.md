---
title: Clockwork — Usage Guide
description: Build deterministic state machines with pure transitions and actor-owned runtime work.
---

[[toc]]

## Basic Usage

Call `defineMachine<Context, Event>()` first to bind context and event types; the returned definition function infers state labels from `states`. Context is optional only when its type has no keys. Create one actor for each independently owned workflow.

```ts
import { defineMachine } from '@vielzeug/clockwork';

type Event = { type: 'TOGGLE' };

const machine = defineMachine<Record<string, never>, Event>()({
  initial: 'on',
  states: {
    off: { on: { TOGGLE: { target: 'on' } } },
    on: { on: { TOGGLE: { target: 'off' } } },
  },
});

const actor = machine.createActor();
actor.send({ type: 'TOGGLE' });
console.log(actor.snapshot.state); // 'off'
actor.dispose();
```

Dispose actors when a feature, request, or test ends. You can use `using` when the surrounding runtime supports `Symbol.dispose`.

```ts
using actor = machine.createActor();
actor.send({ type: 'TOGGLE' });
```

## Context reducers

A reducer receives readonly context and returns the next context. Clockwork does not copy or freeze context at runtime, so do not mutate data that other code may retain.

```ts
type Event = { type: 'DEC' } | { type: 'INC' } | { type: 'RESET' };

const counter = defineMachine<{ count: number }, Event>()({
  context: { count: 0 },
  initial: 'idle',
  states: {
    idle: {
      on: {
        DEC: { reduce: ({ context }) => ({ count: context.count - 1 }), target: 'idle' },
        INC: { reduce: ({ context }) => ({ count: context.count + 1 }), target: 'idle' },
        RESET: { reduce: () => ({ count: 0 }), target: 'idle' },
      },
    },
  },
});
```

Keep reducers pure. Make nested copies yourself when nested data changes.

```ts
SAVE: {
  reduce: ({ context, event }) => ({
    ...context,
    profile: { ...context.profile, name: event.name },
  }),
  target: 'editing',
}
```

## Guards

Guards decide whether a transition can run. They receive readonly context and the matching event. For several choices, use an ordered array; the first passing guard wins.

```ts
PAY: [
  {
    guard: ({ context }) => context.balance >= context.total,
    reduce: ({ context }) => ({ ...context, balance: context.balance - context.total }),
    target: 'success',
  },
  { target: 'insufficientFunds' },
]
```

Call `actor.can(event)` for the current actor snapshot or `machine.can(snapshot, event)` for an arbitrary snapshot.

## Pure transitions

`machine.transition()` enables isolated unit tests and decision UIs. It returns the unchanged snapshot with `type: 'ignored'` when no transition matches; it does not expose or run effects.

```ts
const result = counter.transition(
  { context: { count: 3 }, state: 'idle' },
  { type: 'INC' },
);

if (result.type === 'transition') {
  console.log(result.snapshot.context.count); // 4
}
```

## Effects

Entry, exit, and transition effects run only through an actor. The actor commits, establishes the new state's timers and invokes, notifies subscribers, then runs exit, transition, and entry effects. Effects cannot change context; send a regular event for another state change.

```ts
type WorkflowEvent = { type: 'SUBMIT' };
const workflow = defineMachine<{ orderId: string }, WorkflowEvent>()({
  context: { orderId: '' },
  initial: 'draft',
  states: {
    draft: {
      on: {
        SUBMIT: {
          effects: [({ context }) => console.debug('submitted', context)],
          target: 'submitted',
        },
      },
    },
    submitted: { entry: [({ context }) => console.log(`Submitted ${context.orderId}`)] },
  },
});
```

Effects receive `context`, the triggering `event` (or `undefined` for initial entry), actor `send`, and the actor lifetime `signal`.

## Async invokes

Invokes start on state entry. `src` gets readonly entry context, the triggering event or `undefined`, and an `AbortSignal`. `onDone` or `onError` map settlement to ordinary events. All invokes are cancelled when the actor exits the state or disposes.

```ts
type LoadEvent =
  | { type: 'FETCH' }
  | { items: string[]; type: 'SUCCESS' }
  | { message: string; type: 'FAILURE' }
  | { type: 'RETRY' };

const loader = defineMachine<{ error: string; items: string[] }, LoadEvent>()({
  context: { error: '', items: [] },
  initial: 'idle',
  states: {
    idle: { on: { FETCH: { target: 'loading' } } },
    loading: {
      invoke: [{
        src: async ({ signal }) => {
          const response = await fetch('/api/items', { signal });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json() as Promise<string[]>;
        },
        onDone: ({ result }) => ({ items: result, type: 'SUCCESS' }),
        onError: ({ error }) => ({ message: String(error), type: 'FAILURE' }),
      }],
      on: {
        FAILURE: { reduce: ({ event }) => ({ error: event.message, items: [] }), target: 'error' },
        SUCCESS: { reduce: ({ event }) => ({ error: '', items: event.items }), target: 'ready' },
      },
    },
    ready: {},
    error: { on: { RETRY: { target: 'loading' } } },
  },
});
```

## Delayed transitions

`after` starts timers on state entry and cancels them on exit or disposal. Its guard and reducer receive `event: undefined`; a user event with `type: '$after'` remains a normal user event.

```ts
type NotificationEvent = { type: 'DISMISS' } | { message: string; type: 'SHOW' };
const notification = defineMachine<{ message: string }, NotificationEvent>()({
  context: { message: '' },
  initial: 'hidden',
  states: {
    hidden: { on: { SHOW: { reduce: ({ event }) => ({ message: event.message }), target: 'visible' } } },
    visible: {
      after: [{ delay: 5_000, target: 'hidden' }],
      on: { DISMISS: { target: 'hidden' } },
    },
  },
});
```

## Snapshot observation and persistence

`actor.snapshot` is the current plain readonly snapshot; read it directly rather than calling a snapshot method. Use `subscribe()` to integrate a state library or persist future committed snapshots. Fresh actors run their initial entry effects and resources; restored actors start only the restored state's invokes and timers, not its entry effects.

```ts
const stored = sessionStorage.getItem('wizard');
const actor = machine.createActor({
  snapshot: stored ? JSON.parse(stored) : undefined,
});

const stopSaving = actor.subscribe((snapshot) => {
  sessionStorage.setItem('wizard', JSON.stringify(snapshot));
});

console.log(actor.snapshot);
stopSaving();
actor.dispose();
```

Validate untrusted persisted data before passing it to `createActor()`. Clockwork validates the restored state name but cannot validate application-specific context fields.

## Error handling

Use `onError` to choose what happens after failures from transitions, effects, invokes, or subscribers. The context identifies the runtime phase and state; an event is present when one triggered the failure. Return `'continue'` to keep the actor alive or `'dispose'` to end it.

```ts
const actor = machine.createActor({
  onError(error, { event, phase, state }) {
    console.error({ error, event, phase, state });
    return 'continue';
  },
});
```

Without `onError`, an actor disposes silently. Return `'dispose'` explicitly when an error handler logs an unrecoverable failure.

## Debugging

Use opt-in snapshot logging during development. `debugActor()` observes committed snapshots only; it does not trace dispatched events or runtime errors.

```ts
import { debugActor } from '@vielzeug/clockwork/devtools';

const actor = machine.createActor();
const stopDebugging = debugActor(actor);
actor.send({ type: 'NEXT' });
stopDebugging();
actor.dispose();
```

For richer inspection, subscribe to snapshots and record them in application devtools. Clockwork intentionally has no internal trace buffer.

## Flat state maps

Clockwork has flat state IDs. Prefer explicit states such as `editingDraft` and `editingSaving`, or compose several actors when domains have independent lifecycles.

## SSR

Reuse a compiled machine definition, but create and dispose an actor per request. Never share an actor across concurrent requests.

## Testing

Test deterministic state behavior through `machine.transition()`. Create actors only for timers, invokes, effects, queueing, subscriptions, or disposal behavior.

```ts
import { expect, test } from 'vitest';

test('increments without an actor', () => {
  const result = counter.transition(
    { context: { count: 2 }, state: 'idle' },
    { type: 'INC' },
  );

  expect(result).toMatchObject({
    snapshot: { context: { count: 3 }, state: 'idle' },
    type: 'transition',
  });
});
```

## Framework Integration

Bridge the current actor snapshot into renderer state through one subscription. Dispose that subscription with component lifecycle.

::: code-group

```ts [React]
import { useSyncExternalStore } from 'react';

function useActor<Snapshot>(actor: { readonly snapshot: Snapshot; subscribe(listener: (snapshot: Snapshot) => void): () => void }) {
  return useSyncExternalStore(
    (notify) => actor.subscribe(() => notify()),
    () => actor.snapshot,
  );
}
```

```ts [Vue 3]
import { onUnmounted, shallowRef } from 'vue';

const snapshot = shallowRef(actor.snapshot);
const stop = actor.subscribe((next) => (snapshot.value = next));
onUnmounted(stop);
```

```ts [Svelte]
import { onDestroy } from 'svelte';

let snapshot = actor.snapshot;
const stop = actor.subscribe((next) => (snapshot = next));
onDestroy(stop);
```

:::

## Working with Other Vielzeug Libraries

Use Herald when separate actors exchange application events. Bridge Clockwork snapshots into Ripple only at a UI or application boundary.

```ts
import { createBus } from '@vielzeug/herald';

const bus = createBus<{ REFRESH: void }>();
bus.on('REFRESH', () => actor.send({ type: 'FETCH' }));
```

## Best Practices

- Define context and event unions with `defineMachine<Context, Event>()`.
- Return replacement context from reducers; do not rely on runtime copying or freezing.
- Keep guards and reducers pure.
- Use actors for effects, timers, invokes, subscriptions, and cancellation.
- Read the current snapshot from `actor.snapshot`, not a wrapper value.
- Validate persisted context before restoring a snapshot.
- Dispose every actor at its ownership boundary.
- Route runtime failures through `onError` when the owner can recover.
