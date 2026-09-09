---
title: Clockwork — API Reference
description: Reference for Clockwork machine definitions, actors, and types.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution mode | Common gotcha |
| --- | --- | --- | --- |
| `defineMachine()` | Compile a typed flat machine definition | Sync | Call the generic factory before supplying the definition |
| `Machine.transition()` | Resolve a pure next snapshot | Sync | Does not run effects, invokes, or timers |
| `Machine.createActor()` | Create a runtime owner | Sync | Fresh and restored actors have different entry behavior |
| `Actor.send()` | Dispatch an event | Sync | Returns `void`; re-entrant events queue internally |
| `Actor.subscribe()` | Observe committed snapshots | Sync | Observes only; it does not trace sends or errors |
| `ClockworkError` | Report definition and snapshot validation failures | Sync | Use `code`, not message text |

## Package Entry Points

| Import | Purpose |
| --- | --- |
| `@vielzeug/clockwork` | Machine compiler, actor runtime, errors, and types |

## Exported Surface

Callback parameter types are inferred for inline definitions. Clockwork also exports reusable callback, transition, state-node, actor-option, result, and error-context types for shared helpers.

| Primary export | Kind |
| --- | --- |
| `defineMachine` | Function |
| `Machine` | Type |
| `Actor` | Type |
| `MachineSnapshot` | Type |
| `MachineConfig` | Type |
| `ClockworkError` | Class |

Additional exported types: `ActorErrorContext`, `ActorOptions`, `After`, `Effect`, `EffectArgs`, `EventByType`, `EventType`, `Guard`, `Invoke`, `InvokeArgs`, `MachineEvent`, `Reducer`, `StateNode`, `Transition`, `TransitionInput`, and `TransitionResult`.

## Core Functions

### `defineMachine()`

```ts
function defineMachine<
  Context extends Record<string, unknown> = Record<string, never>,
  Event extends MachineEvent = MachineEvent,
>(): <State extends string>(definition: MachineConfig<State, Context, Event>) => Machine<State, Context, Event>;
```

Returns a factory that validates and compiles a typed flat machine definition. Definitions and their structural entries must be ordinary or null-prototype records, not arrays or class instances. Context follows the same record rule; omit it only when the context type has no keys. Compilation snapshots invoke and transition callback references.

The curried signature is required so TypeScript can infer `State` from the `states` object while you explicitly provide `Context` and `Event`. TypeScript does not support partial type argument inference, so the state-key union cannot be inferred in a single non-curried call when the context and event generics are explicit.

**Returns:** A definition function that returns `Machine`.

**Example:**

```ts
import { defineMachine } from '@vielzeug/clockwork';

type Event = { type: 'START' };

const machine = defineMachine<Record<string, never>, Event>()({
  initial: 'idle',
  states: { idle: { on: { START: { target: 'running' } } }, running: {} },
});
```

Throws `ClockworkError` when a definition has an invalid context, initial state, target, transition, effect, invoke, or timer delay.

---

### `Actor.subscribe()`

```ts
subscribe(listener: (snapshot: MachineSnapshot<State, Context>) => void): () => void;
```

Subscribes to future committed actor snapshots. It does not run immediately; read `actor.snapshot` for the initial value. Returns an unsubscribe function. Subscriber failures are reported through `onError` without stopping remaining subscribers, declared effects, or the actor.

**Example:**

```ts
import { defineMachine } from '@vielzeug/clockwork';

const machine = defineMachine<Record<string, never>, { type: 'NEXT' }>()({
  initial: 'idle',
  states: { idle: { on: { NEXT: { target: 'idle' } } } },
});

const actor = machine.createActor();
const stop = actor.subscribe((snapshot) => console.debug(snapshot));
actor.send({ type: 'NEXT' });
stop();
actor.dispose();
```

## Machine Methods

### `machine.transition()`

```ts
transition(
  snapshot: MachineSnapshot<State, Context>,
  event: Event,
): TransitionResult<State, Context>;
```

Resolves a snapshot for one user event without actor runtime work.

| Parameter | Type | Description |
| --- | --- | --- |
| `snapshot` | `MachineSnapshot<State, Context>` | Input state and context |
| `event` | `Event` | User event to evaluate |

**Returns:** A `TransitionResult` with `transition` or `ignored` type.

**Example:**

```ts
const result = machine.transition(machine.initialSnapshot, { type: 'START' });
```

---

### `machine.can()`

```ts
can(snapshot: MachineSnapshot<State, Context>, event: Event): boolean;
```

Returns whether a transition exists and its guard passes.

**Returns:** `true` when the supplied snapshot accepts the event.

---

### `machine.createActor()`

```ts
createActor(options?: ActorOptions<State, Context, Event>): Actor<State, Context, Event>;
```

Creates an independent actor for event dispatch, timers, invokes, effects, subscriptions, and disposal. A fresh actor starts the initial state's entry effects and resources. An actor restored with `options.snapshot` starts only the restored state's resources: invokes and timers, not entry effects.

| Parameter | Type | Description |
| --- | --- | --- |
| `options.snapshot` | `MachineSnapshot<State, Context>` | Optional restored actor snapshot |
| `options.maxTransitions` | `number` | Positive queued-transition limit for one synchronous flush |
| `options.onError` | `(error, context) => void` | Side-channel observation callback for runtime failures |

**Returns:** Disposable `Actor`.

**Example:**

```ts
const actor = machine.createActor({
  onError(error, { phase, state }) {
    console.error(phase, state, error);
  },
  snapshot: { context: {}, state: 'idle' },
});
```

## Actor Methods

### `actor.send()`

```ts
send(event: Event): void;
```

Dispatches a user event to the current actor state. Events sent while the actor is processing queue and flush synchronously; sends to a disposed actor are ignored. For active actors, malformed events without a string `type` log a development warning and are ignored. Valid but unhandled event types are ignored without a warning. Use `actor.snapshot` after sending to read the current snapshot.

**Returns:** Nothing.

---

### `actor.can()`

```ts
can(event: Event): boolean;
```

Returns whether the current actor snapshot accepts an event. A guard failure is reported as a fatal transition error, disposes the actor, and returns `false`. Returns `false` after disposal.

**Returns:** Boolean transition availability.

---

### `actor.subscribe()`

```ts
subscribe(listener: (snapshot: MachineSnapshot<State, Context>) => void): () => void;
```

Registers a listener for committed snapshots. The listener does not run immediately.

**Returns:** An unsubscribe function.

---

### `actor.dispose()`

```ts
dispose(): void;
[Symbol.dispose](): void;
```

Cancels timers and invokes, clears queued events and listeners, and aborts `disposalSignal`.

**Returns:** Nothing. Idempotent.

## Error Handling Policy

Machine-execution failures are fail-stop: guard, reducer, effect, invoke, timer, and queued-transition-limit failures dispose the actor. Subscriber failures are observational: Clockwork reports them, continues the stable subscriber snapshot and declared effects, and keeps the actor active.

The optional `onError` callback receives the error and its phase/state context but cannot control disposition. Errors thrown by this observer are swallowed so error reporting cannot change synchronous, timer, or invoke behavior.

```ts
type ActorErrorContext<State, Event> = {
  readonly event?: Event;
  readonly phase: 'effect' | 'invoke' | 'subscriber' | 'transition';
  readonly state: State;
};
```

Subscriber iteration uses a stable snapshot: listeners added during notification begin with the next transition.

## Types

### `MachineSnapshot<State, Context>`

```ts
type MachineSnapshot<State extends string, Context extends Record<string, unknown>> = {
  readonly context: Readonly<Context>;
  readonly state: State;
};
```

Clockwork shallow-clones and freezes each snapshot and its context record. Nested context values remain caller-owned and are not deep-frozen.

### `MachineConfig<State, Context, Event>`

```ts
type MachineConfig<State extends string, Context extends Record<string, unknown>, Event extends MachineEvent> =
  (keyof Context extends never ? { readonly context?: Context } : { readonly context: Context }) & {
    readonly initial: State;
    readonly states: Record<State, StateNode<State, Context, Event>>;
  };
```

A flat machine definition. State nodes cannot contain child states. The `StateNode`, `Transition`, `After`, `Invoke`, `Effect`, `Guard`, and `Reducer` shapes are inferred inline and exported for reusable helpers. `After.delay` must be finite and between 0 and 2,147,483,647 milliseconds; delayed guards and reducers receive `event: undefined`.

### `Actor<State, Context, Event>`

```ts
type Actor<State extends string, Context extends Record<string, unknown>, Event extends MachineEvent> = {
  [Symbol.dispose](): void;
  can(event: Event): boolean;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  send(event: Event): void;
  readonly snapshot: MachineSnapshot<State, Context>;
  subscribe(listener: (snapshot: MachineSnapshot<State, Context>) => void): () => void;
};
```

An actor's `snapshot` is the current plain readonly snapshot.

### `Machine<State, Context, Event>`

```ts
type Machine<State extends string, Context extends Record<string, unknown>, Event extends MachineEvent> = {
  can(snapshot: MachineSnapshot<State, Context>, event: Event): boolean;
  createActor(options?: ActorOptions<State, Context, Event>): Actor<State, Context, Event>;
  readonly initialSnapshot: MachineSnapshot<State, Context>;
  transition(snapshot: MachineSnapshot<State, Context>, event: Event): TransitionResult<State, Context>;
};
```

A compiled, reusable machine. Its transition lookup is map-based, so unknown or poison event names such as `__proto__` are safely ignored when no transition exists.

## Errors

### `ClockworkError`

`ClockworkError` reports invalid definitions, contexts, snapshots, and actor transition limits. It has `code`, `details`, and standard `Error` fields. Use `instanceof ClockworkError` to narrow an unknown error.

```ts
if (error instanceof ClockworkError) {
  console.error(error.code, error.details);
}
```
