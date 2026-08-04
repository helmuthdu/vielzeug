---
title: Clockwork — API Reference
description: Reference for Clockwork machine definitions, actors, devtools, and types.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution mode | Common gotcha |
| --- | --- | --- | --- |
| `defineMachine()` | Compile a typed flat machine definition | Sync | Call the generic factory before supplying the definition |
| `Machine.transition()` | Resolve a pure next snapshot | Sync | Does not run effects, invokes, or timers |
| `Machine.createActor()` | Create a runtime owner | Sync | Fresh and restored actors have different entry behavior |
| `Actor.send()` | Dispatch an event | Sync | Returns `void`; re-entrant events queue internally |
| `debugActor()` | Observe committed snapshots | Sync | Observes only; it does not trace sends or errors |
| `ClockworkError` | Report definition and snapshot validation failures | Sync | Use `code`, not message text |

## Package Entry Points

| Import | Purpose |
| --- | --- |
| `@vielzeug/clockwork` | Machine compiler, actor runtime, errors, and types |
| `@vielzeug/clockwork/devtools` | Opt-in snapshot observation through `debugActor()` |

## Core Functions

### `defineMachine()`

```ts
function defineMachine<
  Context extends Record<string, unknown> = Record<string, never>,
  Event extends MachineEvent = MachineEvent,
>(): <State extends string>(definition: MachineConfig<State, Context, Event>) => Machine<State, Context, Event>;
```

Returns a factory that validates and compiles a typed flat machine definition. Context must be a non-array record. Omit `context` only when the context type has no keys.

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

### `debugActor()`

```ts
function debugActor<State extends string, Context extends Record<string, unknown>, Event extends MachineEvent>(
  actor: Actor<State, Context, Event>,
  options?: DebugActorOptions<State, Context>,
): () => void;
```

Subscribes to committed actor snapshots and logs each one with `console.debug` by default. It does not modify actor behavior and does not observe dispatched events or runtime errors.

**Returns:** An unsubscribe cleanup function.

**Example:**

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
| `options.onError` | `(error, context) => 'continue' \| 'dispose'` | Explicit disposition for runtime failures |

**Returns:** Disposable `Actor`.

**Example:**

```ts
const actor = machine.createActor({
  onError(error, { phase, state }) {
    console.error(phase, state, error);
    return 'continue';
  },
  snapshot: { context: {}, state: 'idle' },
});
```

## Actor Methods

### `actor.send()`

```ts
send(event: Event): void;
```

Dispatches a user event to the current actor state. Events sent while the actor is processing queue and flush synchronously; sends to a disposed actor are ignored. Use `actor.snapshot` after sending to read the current snapshot.

**Returns:** Nothing.

---

### `actor.can()`

```ts
can(event: Event): boolean;
```

Returns whether the current actor snapshot accepts an event. Returns `false` after disposal.

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

## Types

### `MachineEvent`

```ts
type MachineEvent = { readonly type: string };
```

Base constraint for event unions.

### `EventType<Event>` and `EventByType<Event, Type>`

```ts
type EventType<Event extends MachineEvent> = Event['type'] & string;

type EventByType<Event extends MachineEvent, Type extends EventType<Event>> =
  Extract<Event, { type: Type }>;
```

Extract event type names and a matching event from an event union.

### `MachineSnapshot<State, Context>`

```ts
type MachineSnapshot<State extends string, Context extends Record<string, unknown>> = {
  readonly context: Readonly<Context>;
  readonly state: State;
};
```

The plain readonly snapshot value used by machines and actors. Readonly is a TypeScript contract; Clockwork does not copy or freeze snapshots at runtime.

### `Guard<Context, Event>` and `Reducer<Context, Event>`

```ts
type Guard<Context extends Record<string, unknown>, Event> = (args: {
  readonly context: Readonly<Context>;
  readonly event: Event;
}) => boolean;

type Reducer<Context extends Record<string, unknown>, Event> = (args: {
  readonly context: Readonly<Context>;
  readonly event: Event;
}) => Context;
```

A guard selects a transition. A reducer returns replacement context, which must be a non-array record.

### `EffectArgs<Context, Event>` and `Effect<Context, Event>`

```ts
type EffectArgs<Context extends Record<string, unknown>, Event extends MachineEvent> = {
  readonly context: Readonly<Context>;
  readonly event: Event | undefined;
  readonly send: (event: Event) => void;
  readonly signal: AbortSignal;
};

type Effect<Context extends Record<string, unknown>, Event extends MachineEvent> =
  (args: EffectArgs<Context, Event>) => void;
```

Post-commit effects receive `undefined` for initial entry and actor timer transitions. They cannot update machine context directly.

### `Transition<State, Context, Event, Type>` and `TransitionInput`

```ts
type Transition<
  State extends string,
  Context extends Record<string, unknown>,
  Event extends MachineEvent,
  Type extends EventType<Event> = EventType<Event>,
> = {
  readonly effects?: readonly Effect<Context, Event>[];
  readonly guard?: Guard<Context, EventByType<Event, Type>>;
  readonly reduce?: Reducer<Context, EventByType<Event, Type>>;
  readonly target: State;
};

type TransitionInput<
  State extends string,
  Context extends Record<string, unknown>,
  Event extends MachineEvent,
  Type extends EventType<Event> = EventType<Event>,
> = Transition<State, Context, Event, Type> | readonly Transition<State, Context, Event, Type>[];
```

An ordered transition array selects the first guard that passes.

### `After<State, Context, Event>`

```ts
type After<State extends string, Context extends Record<string, unknown>, Event extends MachineEvent> = {
  readonly delay: number;
  readonly effects?: readonly Effect<Context, Event>[];
  readonly guard?: Guard<Context, Event | undefined>;
  readonly reduce?: Reducer<Context, Event | undefined>;
  readonly target: State;
};
```

A delayed state transition. Its guard and reducer receive `event: undefined`.

### `InvokeArgs<Context, Event>` and `Invoke<Context, Event, Result>`

```ts
type InvokeArgs<Context extends Record<string, unknown>, Event extends MachineEvent> = {
  readonly context: Readonly<Context>;
  readonly event: Event | undefined;
  readonly signal: AbortSignal;
};

type Invoke<Context extends Record<string, unknown>, Event extends MachineEvent, Result = unknown> = {
  readonly onDone?: (args: { readonly context: Readonly<Context>; readonly result: Result }) => Event;
  readonly onError?: (args: { readonly context: Readonly<Context>; readonly error: unknown }) => Event;
  readonly src: (args: InvokeArgs<Context, Event>) => Promise<Result> | Result;
};
```

An actor-owned task started on state entry. `event` is the triggering event or `undefined` for initial or restored resources.

### `StateNode<State, Context, Event>` and `MachineConfig<State, Context, Event>`

```ts
type StateNode<State extends string, Context extends Record<string, unknown>, Event extends MachineEvent> = {
  readonly after?: readonly After<State, Context, Event>[];
  readonly entry?: readonly Effect<Context, Event>[];
  readonly exit?: readonly Effect<Context, Event>[];
  readonly invoke?: readonly Invoke<Context, Event>[];
  readonly on?: Partial<{ [Type in EventType<Event>]: TransitionInput<State, Context, Event, Type> }>;
};

type MachineConfig<State extends string, Context extends Record<string, unknown>, Event extends MachineEvent> =
  (keyof Context extends never ? { readonly context?: Context } : { readonly context: Context }) & {
    readonly initial: State;
    readonly states: Record<State, StateNode<State, Context, Event>>;
  };
```

A flat machine definition. State nodes cannot contain child states.

### `TransitionResult<State, Context>`

```ts
type TransitionResult<State extends string, Context extends Record<string, unknown>> = {
  readonly snapshot: MachineSnapshot<State, Context>;
  readonly type: 'ignored' | 'transition';
};
```

Result of a pure user-event transition. It contains no effect plan.

### `ActorErrorContext<State, Event>`, `ActorErrorDisposition`, and `ActorOptions<State, Context, Event>`

```ts
type ActorErrorContext<State extends string, Event extends MachineEvent> = {
  readonly event?: Event;
  readonly phase: 'effect' | 'invoke' | 'subscriber' | 'transition';
  readonly state: State;
};

type ActorErrorDisposition = 'continue' | 'dispose';

type ActorOptions<State extends string, Context extends Record<string, unknown>, Event extends MachineEvent> = {
  readonly maxTransitions?: number;
  readonly onError?: (error: unknown, context: ActorErrorContext<State, Event>) => ActorErrorDisposition;
  readonly snapshot?: MachineSnapshot<State, Context>;
};
```

`onError` must explicitly return `'continue'` to keep the actor alive or `'dispose'` to end it. Without an error handler, Clockwork disposes the actor silently.

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

### `DebugActorOptions<State, Context>`

```ts
type DebugActorOptions<State extends string, Context extends Record<string, unknown>> = {
  readonly logger?: (snapshot: MachineSnapshot<State, Context>) => void;
};
```

Optional logger for `debugActor()`. Logger failures are ignored so observation cannot affect the actor's error policy.

## Errors

### `ClockworkError`

`ClockworkError` reports invalid definitions, contexts, snapshots, and actor transition limits. It has `code`, `details`, and standard `Error` fields. Use `ClockworkError.is(error)` to narrow an unknown error.

```ts
if (ClockworkError.is(error)) {
  console.error(error.code, error.details);
}
```
