---
title: Clockwork — API Reference
description: Complete API reference for Clockwork.
---

[[toc]]

## API Overview

| Symbol             | Purpose                                              | Execution mode | Common gotcha                                                    |
| ------------------ | ---------------------------------------------------- | -------------- | ---------------------------------------------------------------- |
| `createMachine()`  | Validate config; returns definition handle           | Sync           | Throws `ClockworkError` on invalid config — check at startup     |
| `.start()`         | Start a running machine instance from a definition   | Sync           | Call `.start(options?)` on the returned `MachineDefinition`      |
| `.resolve()`       | Pure transition resolver for testing (no side effects) | Sync         | Does not fire debug hooks; pass `onGuard` via `options` object   |
| `ClockworkError`   | Base class for all validation failures               | —              | Use `instanceof <SpecificError>` or `ClockworkError.is()`         |

## Package Entry Points

| Import                         | Purpose                                  |
| ------------------------------ | ---------------------------------------- |
| `@vielzeug/clockwork`          | All exports and types                    |
| `@vielzeug/clockwork/devtools` | `debugMachine` — debug wrapper (dev only) |

## `createMachine()`

Validates a machine configuration and returns a reusable `MachineDefinition` handle. Throws a `ClockworkError` subclass synchronously if validation fails.

Use `createMachine(config).start()` for the common one-shot case, or hold the definition to start multiple instances or call `.resolve()` in tests.

```ts
function createMachine<State extends string, Ctx extends object, Ev extends MachineEvent>(
  config: MachineConfig<State, Ctx, Ev>,
): MachineDefinition<State, Ctx, Ev>;
```

**Validates at call time:**

- `initial` state exists in `states`
- All transition `target` values exist in `states` — full nested paths (e.g. `loading.fetching`) are validated, not just the root segment
- Transition arrays are non-empty
- Compound states have `initial` pointing to a valid child
- `after` delays are finite numbers (`>= 0`; `NaN` and `Infinity` are rejected)
- `invoke` arrays are non-empty

**Returns:** `MachineDefinition<State, Ctx, Ev>` — see [MachineDefinition](#machinedefinition).

**Example:**

```ts
// One-shot — validate + start immediately:
const m = createMachine({
  context: { count: 0 },
  initial: 'idle',
  states: {
    active: { on: { STOP: { target: 'idle' } } },
    idle: { on: { GO: { target: 'active' } } },
  },
}).start({
  onDebug: ({ type, ...rest }) => console.log(type, rest),
});

// Reusable definition — start multiple instances:
const counterDef = createMachine({
  context: { count: 0 },
  initial: 'idle',
  states: { idle: { on: { INC: { actions: [({ context }) => { context.count++ }], target: 'idle' } } } },
});

const m1 = counterDef.start();
const m2 = counterDef.start({ snapshot: { context: { count: 10 }, state: 'idle' } });

// Test transitions without a running machine:
counterDef.resolve({ context: { count: 0 }, event: { type: 'INC' }, state: 'idle' });
```

## Types

### `MachineEvent`

Base constraint for all event types.

```ts
type MachineEvent = { type: string };
```

Define events as discriminated unions for full TypeScript inference:

```ts
type AppEvent = { type: 'FETCH' } | { type: 'DONE'; data: string } | { type: 'FAIL'; error: Error };
```

---

### `EventType<Ev>`

Extracts the union of all event type strings.

```ts
type EventType<Ev extends MachineEvent> = Ev['type'] & string;

type MyEvent = { type: 'A' } | { type: 'B' };
type Types = EventType<MyEvent>; // 'A' | 'B'
```

---

### `EventByType<Ev, Type>`

Narrows the event union to a specific type. Useful for accessing typed payloads inside generic helpers.

```ts
type EventByType<Ev extends MachineEvent, Type extends EventType<Ev>> = Extract<Ev, { type: Type }>;

type SetEvent = EventByType<AppEvent, 'DONE'>; // { type: 'DONE'; data: string }
```

---

### `LifecycleEvent`

Internal synthetic events dispatched by the runtime. Received by `entry`, `exit`, and invoke `src` on state entry.

```ts
type LifecycleEvent =
  | { readonly type: '$init' }
  | { readonly type: '$hydrate' }
  | { readonly delay: number; readonly type: '$after' };
```

---

### `ActionArgs<Ctx, Ev>`

Arguments passed to action functions.

```ts
type ActionArgs<Ctx extends object, Ev extends MachineEvent = MachineEvent> = {
  context: Ctx; // mutable context draft
  readonly event: Ev; // triggering event (readonly)
};
```

---

### `ActionFn<Ctx, Ev>`

A function that mutates context during a transition.

```ts
type ActionFn<Ctx extends object, Ev extends MachineEvent = MachineEvent> = (args: ActionArgs<Ctx, Ev>) => void;
```

---

### `GuardFn<Ctx, Ev>`

A predicate that decides whether a transition is taken. Context is **readonly** — mutating it inside a guard corrupts live state.

```ts
type GuardFn<Ctx extends object, Ev extends MachineEvent = MachineEvent> = (args: {
  readonly context: Readonly<Ctx>;
  readonly event: Readonly<Ev>;
}) => boolean;
```

---

### `LifecycleFn<Ctx, Ev>`

Function type for `entry` and `exit` hooks. Receives context and an event that may be a user event or a lifecycle event (`$init`, `$hydrate`, `$after`).

```ts
type LifecycleFn<Ctx extends object, Ev extends MachineEvent = MachineEvent> = (args: {
  context: Ctx;
  readonly event: Ev | LifecycleEvent;
}) => void;
```

---

### `TransitionDef<State, Ctx, Ev, Type>`

A single transition configuration.

```ts
type TransitionDef<
  State extends string,
  Ctx extends object,
  Ev extends MachineEvent,
  Type extends EventType<Ev> = EventType<Ev>,
> = {
  actions?: Array<ActionFn<Ctx, EventByType<Ev, Type>>>;
  guard?: GuardFn<Ctx, EventByType<Ev, Type>>;
  target: State;
};
```

---

### `AfterEvent`

The synthetic event dispatched to `after` action functions. Part of `LifecycleEvent`.

```ts
type AfterEvent = { readonly delay: number; readonly type: '$after' };
```

`delay` reflects the configured delay in milliseconds.

---

### `AfterActionFn<Ctx>`

Convenience alias for action functions used in `after` delayed transitions.

```ts
type AfterActionFn<Ctx extends object> = ActionFn<Ctx, AfterEvent>;
```

Use this when extracting after-actions into named functions:

```ts
import type { AfterActionFn } from '@vielzeug/clockwork';

const logTimeout: AfterActionFn<{ attempts: number }> = ({ context, event }) => {
  console.log(`Timed out after ${event.delay}ms, attempts: ${context.attempts}`);
};
```

---

### `AfterDef<State, Ctx>`

Configuration for a delayed (timer-based) transition.

```ts
type AfterDef<State extends string, Ctx extends object> = {
  actions?: Array<AfterActionFn<Ctx>>;
  delay: number; // milliseconds, must be a finite number >= 0
  guard?: GuardFn<Ctx, AfterEvent>;
  target: State;
};
```

The `guard` receives `{ readonly context: Readonly<Ctx>; readonly event: Readonly<AfterEvent> }` — same signature as all other guards.

After-timers are automatically cleared when the owning state is exited.

---

### `StateNode<State, Ctx, Ev>`

Configuration for a single state.

```ts
type StateNode<State extends string, Ctx extends object, Ev extends MachineEvent> = {
  after?: Array<AfterDef<State, Ctx>>;
  entry?: LifecycleFn<Ctx, Ev>;
  exit?: LifecycleFn<Ctx, Ev>;
  initial?: string; // required for compound states
  invoke?: Array<InvokeDef<Ctx, Ev>>;
  on?: Partial<{ [Type in EventType<Ev>]: TransitionInput<State, Ctx, Ev, Type> }>;
  states?: Record<string, StateNode<string, Ctx, Ev>>; // nested substates
};
```

When `states` is provided, `initial` must point to one of its keys (validated at definition time).

---

### `MachineConfig<State, Ctx, Ev>`

The configuration object passed to `machine()` or `define()`.

```ts
type MachineConfig<State extends string, Ctx extends object, Ev extends MachineEvent> = ContextField<Ctx> & {
  initial: State;
  states: Record<State, StateNode<State, Ctx, Ev>>;
  validateContext?: ContextValidator<Ctx>;
};
```

`context` is **required** when `Ctx` has properties. It is optional (and can be omitted) when `Ctx` is `Record<string, never>`.

---

### `ContextValidator<Ctx>`

A function used for `validateContext`.

- Return `true` for valid context.
- Return a non-empty string describing the failure (surfaced as `ClockworkInvalidValidateContextError.reason`).

```ts
type ContextValidator<Ctx extends object> = (context: Ctx) => string | true;
```

---

### `TransitionInput<State, Ctx, Ev, Type>`

A single transition or an array of conditional alternatives, as used in the `on` map.

```ts
type TransitionInput<
  State extends string,
  Ctx extends object,
  Ev extends MachineEvent,
  Type extends EventType<Ev> = EventType<Ev>,
> = TransitionDef<State, Ctx, Ev, Type> | Array<TransitionDef<State, Ctx, Ev, Type>>;
```

Use `TransitionInput` to type the value of an `on` entry when extracting transitions into named variables:

```ts
import type { TransitionInput } from '@vielzeug/clockwork';

const onFetch: TransitionInput<State, Ctx, Ev, 'FETCH'> = [
  { guard: ({ context }) => context.authorized, target: 'loading' },
  { target: 'denied' },
];
```

---

### `InterpretOptions<State, Ctx, Ev>`

Options passed to `machine()` or `define().start()`.

```ts
type InterpretOptions<State extends string, Ctx extends object, Ev extends MachineEvent> = {
  clone?: <T>(value: T) => T;
  interceptors?: Array<InterceptorFn<State, Ctx, Ev>>;
  maxTransitionsPerFlush?: number;
  onDebug?: (event: DebugEvent<State, Ctx, Ev>) => void;
  persistence?: PersistenceAdapter<State, Ctx>;
  snapshot?: MachineSnapshot<State, Ctx>;
  validateHydratedContext?: boolean;
  traceLimit?: number;
};
```

| Option                   | Default           | Description                                                                                                                                                     |
| ------------------------ | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `clone`                  | `structuredClone` | Context clone function. Must return a structurally equivalent object. The caller is responsible for ensuring a safe prototype when providing a custom function. |
| `interceptors`           | `[]`              | Pure event interceptors, run left-to-right. Return `null` to block.                                                                                             |
| `maxTransitionsPerFlush` | `1000`            | Maximum transitions processed per flush before throwing loop-guard error                                                                                        |
| `onDebug`                | `undefined`       | Callback for all debug events (guards, transitions, invokes, skips). Auto-enables a 50-entry trace buffer unless `traceLimit` is set.                           |
| `persistence`            | `undefined`       | Save/load adapter for snapshot persistence                                                                                                                      |
| `snapshot`               | `undefined`       | Snapshot to hydrate from on startup (takes priority over persistence)                                                                                           |
| `validateHydratedContext`| `false`           | When `true`, runs `validateContext` against hydrated context during startup; when `false`, hydrated context is trusted and only validated on transitions.         |
| `traceLimit`             | auto (`50`/`0`)   | Ring buffer capacity for `getTrace()`. Defaults to `50` when `onDebug` is set; `0` (disabled) otherwise. Set explicitly to override.                            |

---

### `DebugEvent<State, Ctx, Ev>`

Discriminated union of debug events passed to `onDebug`.

```ts
type DebugEvent<State, Ctx, Ev> =
  | { type: 'guard'; context: Readonly<Ctx>; event: Ev; from: State; passed: boolean; target: State }
  | { type: 'transition'; event: Ev | LifecycleEvent; from: State; to: State }
  | { type: 'transition-skipped'; event: Ev; from: State }
  | { type: 'invoke-start'; context: Readonly<Ctx>; event: Ev | LifecycleEvent; invokeId: string; state: State }
  | {
      type: 'invoke-done';
      context: Readonly<Ctx>;
      event: Ev | LifecycleEvent;
      invokeId: string;
      result: unknown;
      state: State;
    }
  | {
      type: 'invoke-error';
      context: Readonly<Ctx>;
      error: unknown;
      event: Ev | LifecycleEvent;
      invokeId: string;
      state: State;
    }
  | { type: 'invoke-abort'; context: Readonly<Ctx>; event: Ev | LifecycleEvent; invokeId: string; state: State };
```

| Type                 | Fires when                                                     |
| -------------------- | -------------------------------------------------------------- |
| `guard`              | A guard is evaluated — fires for both passed and failed guards |
| `transition`         | A transition is committed (after entry/exit actions)           |
| `transition-skipped` | An event has no matching transition (or all guards failed)     |
| `invoke-start`       | An async invoke task starts                                    |
| `invoke-done`        | An invoke task resolves successfully                           |
| `invoke-error`       | An invoke task rejects                                         |
| `invoke-abort`       | An invoke task is cancelled because the state was exited       |

---

### `SendResult`

Result object returned by `send()`.

```ts
type SendResult = {
  readonly status: 'queued' | 'rejected' | 'transitioned';
};
```

| `status` value | Meaning                                                                                                     |
| -------------- | ----------------------------------------------------------------------------------------------------------- |
| `transitioned` | A transition occurred synchronously                                                                         |
| `queued`       | Called re-entrantly (e.g. from inside an action); the event is queued for the next drain                    |
| `rejected`     | No matching transition, a guard failed, an interceptor blocked it, or the machine is disposed (dev warning) |

---

### `InterceptorFn<State, Ctx, Ev>`

Pure event interceptor. Return the event (possibly transformed) to allow it, or `null` to block it. Runs left-to-right; first `null` stops the chain.

```ts
type InterceptorFn<State extends string, Ctx extends object, Ev extends MachineEvent> = (
  event: Ev,
  snapshot: { readonly context: Readonly<Ctx>; readonly state: State },
) => Ev | null;
```

**Example — logging and blocking:**

```ts
const rateLimiter: InterceptorFn<State, Ctx, Ev> = (event, snap) => {
  if (snap.context.rateLimited) return null; // block
  return event; // allow
};

const m = createMachine(config).start({ interceptors: [rateLimiter] });
```

---

### `MachineInstance<State, Ctx, Ev>`

The live machine object returned by `createMachine().start()`.

```ts
interface MachineInstance<State extends string, Ctx extends object, Ev extends MachineEvent> {
  readonly context: Readable<Ctx>;
  readonly disposalSignal: AbortSignal;
  readonly disposed: boolean;
  readonly state: Readable<State>;
  can(event: Ev): boolean;
  dispose(): void;
  getSnapshot(): MachineSnapshot<State, Ctx>;
  getTrace(): readonly TransitionTraceEntry<State, Ev>[];
  matches(...states: string[]): boolean;
  send(event: Ev): SendResult;
  subscribe(fn: (snapshot: MachineSnapshot<State, Ctx>) => void): () => void;
  [Symbol.dispose](): void;
}
```

**Properties:**

| Property         | Type                    | Description                                                                        |
| ---------------- | ----------------------- | ---------------------------------------------------------------------------------- |
| `state`          | `Readable<State>` | Current state — reactive; read inside `effect()` to subscribe                      |
| `context`        | `Readable<Ctx>`   | Current context — reactive                                                         |
| `disposed`       | `boolean`               | `true` after `dispose()` has been called                                           |
| `disposalSignal` | `AbortSignal`           | Aborted when the machine is disposed. Use to tie external lifetimes to the machine |

**Methods:**

| Method               | Returns                  | Description                                                                                                                                                                                               |
| -------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `can(event)`         | `boolean`                | `true` if a valid transition exists for the event in the current state. Evaluates guards but fires no side effects or debug hooks. Returns `false` when disposed.                                         |
| `getSnapshot()`      | `MachineSnapshot<...>`   | Deep-cloned, frozen snapshot of current state and context. The outer snapshot object is frozen — reassigning `snap.state` throws in strict mode.                                                          |
| `getTrace()`         | `TransitionTraceEntry[]` | Recent transitions in chronological order (oldest to newest). Returns cloned entries. Empty array when tracing is disabled.                                                                               |
| `matches(...states)` | `boolean`                | `true` if the current state is one of the given values or a descendant of any (e.g. `matches('loading')` matches `'loading.pending'`). Returns `false` when disposed.                                     |
| `dispose()`          | `void`                   | Aborts active invokes, clears after-timers, and disposes reactive signals. Idempotent. Does **not** clear persisted state. Equivalent to `using m = createMachine(config).start()`.                       |
| `send(event)`        | `SendResult`             | Dispatches the event. Returns a `SendResult` with `.status`: `'transitioned'`, `'queued'`, or `'rejected'` (also when the machine is already disposed).                                                     |
| `subscribe(fn)`      | `() => void`             | Subscribes to state/context changes. Returns an unsubscribe function. Fires only when state or context changes — **not** on the initial value. Callback receives an isolated snapshot (`context` is cloned). Use `getSnapshot()` to read the current state immediately. |
| `[Symbol.dispose]()` | `void`                   | Delegates to `dispose()`. Enables `using` declarations.                                                                                                                                                   |

---

### `MachineDefinition<State, Ctx, Ev>`

Handle returned by `createMachine()`. Holds the validated config and exposes two methods.

```ts
interface MachineDefinition<State extends string, Ctx extends object, Ev extends MachineEvent> {
  resolve(
    input: { context: Readonly<Ctx>; event: Ev; state: State },
    options?: {
      onGuard?: (info: { context: Readonly<Ctx>; event: Ev; from: State; passed: boolean; target: State }) => void;
    },
  ): TransitionDef<State, Ctx, Ev> | undefined;
  start(options?: InterpretOptions<State, Ctx, Ev>): MachineInstance<State, Ctx, Ev>;
}
```

| Method      | Description                                                                                                                                                                                                          |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `start()`   | Creates a new running machine instance. Pass `options` to customise debug, snapshot, etc.                                                                                                                            |
| `resolve()` | Pure — resolves which transition would be taken for a given state, context, and event. Runs guards but fires no side effects or debug hooks. Pass `options.onGuard` to observe each guard evaluation (pass or fail). |

---

### `MachineSnapshot<State, Ctx>`

Frozen snapshot of state and context.

```ts
type MachineSnapshot<State extends string, Ctx extends object> = {
  readonly context: Readonly<Ctx>;
  readonly state: State;
};
```

---

### `PersistenceAdapter<State, Ctx>`

Pluggable adapter for snapshot persistence.

```ts
type PersistenceAdapter<State extends string, Ctx extends object> = {
  load: () => MachineSnapshot<State, Ctx> | undefined;
  save: (snapshot: MachineSnapshot<State, Ctx>) => void;
};
```

`save` is called after every committed transition. `load` is called once during startup if no `snapshot` option is provided. Hydrated context is not validated at startup unless `validateHydratedContext: true` is set.

---

### `InvokeArgs<Ctx, Ev>`

Arguments passed to the invoke `src` function.

```ts
type InvokeArgs<Ctx extends object, Ev extends MachineEvent> = {
  readonly context: Readonly<Ctx>;
  readonly entryEvent: Ev | LifecycleEvent;
  readonly signal: AbortSignal;
};
```

`signal` is aborted automatically when the state is exited. `context` is captured at invoke creation time.

---

### `InvokeDef<Ctx, Ev>`

Configuration for an async task in a state.

```ts
type InvokeDef<Ctx extends object, Ev extends MachineEvent, Result = unknown> = {
  id?: string;
  onDone?: (result: Result, context: Readonly<Ctx>) => Ev;
  onError?: (error: unknown, context: Readonly<Ctx>) => Ev;
  src: (args: InvokeArgs<Ctx, Ev>) => Promise<Result>;
};
```

| Field     | Description                                                                                          |
| --------- | ---------------------------------------------------------------------------------------------------- |
| `id`      | Optional label surfaced as `invokeId` in `DebugEvent`. Defaults to an auto-incremented string.       |
| `onDone`  | Called with the resolved value and the **context at invoke start**. Returns the event to dispatch.   |
| `onError` | Called with the rejection reason and the **context at invoke start**. Returns the event to dispatch. |
| `src`     | The async task factory. Receives `InvokeArgs` — use `signal` for cooperative cancellation.           |

---

### `TransitionTraceEntry<State, Ev>`

A single entry in the transition trace ring buffer.

```ts
type TransitionTraceEntry<State extends string, Ev extends MachineEvent> = {
  readonly event: Ev | LifecycleEvent;
  readonly from: State;
  readonly timestamp: number; // Date.now() at commit time
  readonly to: State;
};
```

## Schema Helpers

These utilities bundle the three generics (`State`, `Ctx`, `Ev`) into a single opaque type so you can annotate actions, guards, and options without repeating the full signature everywhere.

### `MachineSchema<State, Ctx, Ev>`

Opaque bundle that captures all three generics. Pass it to the `MachineType*` aliases below.

```ts
type MachineSchema<S extends string, C extends object, E extends MachineEvent> = {
  readonly _s: S;
  readonly _c: C;
  readonly _e: E;
};
```

```ts
type Auth = MachineSchema<'idle' | 'loading', { user: User | null }, AuthEvent>;
```

---

### `MachineAction<T, E?>`

Convenience alias for `ActionFn` parameterised by a schema.

```ts
type MachineAction<T extends MachineSchema<any, any, any>, E extends T['_e'] = T['_e']> = ActionFn<T['_c'], E>;
```

```ts
type Auth = MachineSchema<'idle' | 'loading', { user: User | null }, AuthEvent>;

const setUser: MachineAction<Auth, { type: 'DONE'; user: User }> = ({ context, event }) => {
  context.user = event.user;
};
```

---

### `MachineGuard<T, E?>`

Convenience alias for `GuardFn` parameterised by a schema.

```ts
type MachineGuard<T extends MachineSchema<any, any, any>, E extends T['_e'] = T['_e']> = GuardFn<T['_c'], E>;
```

---

### `MachineTypeConfig<T>`

Resolves to `MachineConfig<State, Ctx, Ev>` for a given schema. Use for typed config objects.

```ts
type MachineTypeConfig<T extends MachineSchema<any, any, any>> = MachineConfig<T['_s'], T['_c'], T['_e']>;
```

---

### `MachineTypeDefinition<T>`

Resolves to `MachineDefinition<State, Ctx, Ev>` for a given schema.

```ts
type MachineTypeDefinition<T extends MachineSchema<any, any, any>> = MachineDefinition<T['_s'], T['_c'], T['_e']>;
```

---

### `MachineTypeInstance<T>`

Resolves to `MachineInstance<State, Ctx, Ev>` for a given schema.

```ts
type MachineTypeInstance<T extends MachineSchema<any, any, any>> = MachineInstance<T['_s'], T['_c'], T['_e']>;
```

---

### `MachineTypeOptions<T>`

Resolves to `InterpretOptions<State, Ctx, Ev>` for a given schema.

```ts
type MachineTypeOptions<T extends MachineSchema<any, any, any>> = InterpretOptions<T['_s'], T['_c'], T['_e']>;
```

---

## Errors

### `ClockworkError`

Base class for every error `clockwork` throws. Use `instanceof ClockworkError` (or the static `ClockworkError.is()`) to catch any clockwork-originated error, or `instanceof <SpecificError>` to handle one failure mode precisely.

```ts
class ClockworkError extends Error {
  static is(err: unknown): err is ClockworkError;
}
```

`ClockworkError.is()` is a type-safe static predicate — prefer it over `instanceof ClockworkError` in catch blocks that may receive unknown values:

```ts
import { ClockworkError } from '@vielzeug/clockwork';

try {
  createMachine(config);
} catch (err) {
  if (ClockworkError.is(err)) {
    console.error(err.name, err.message);
  }
}
```

Each subclass carries typed fields describing the failure — narrow with `instanceof` to access them:

| Subclass                                 | Thrown when                                                                                                                                  | Fields                                     |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `ClockworkInvalidAfterDelayError`         | An `after` delay is negative, `NaN`, or non-finite (`Infinity`)                                                                                | `path`, `delay`                            |
| `ClockworkInvalidInitialStateError`       | `initial` does not exist in `states` (top-level or compound)                                                                                   | `path`, `initial`                          |
| `ClockworkInvalidMaxTransitionsError`     | `maxTransitionsPerFlush` is less than 1                                                                                                         | `maxTransitionsPerFlush`                   |
| `ClockworkInvalidSnapshotStateError`      | Hydrated snapshot refers to an unknown state                                                                                                    | `state`                                    |
| `ClockworkInvalidTransitionArrayError`    | A transition array is empty, or an `invoke` array is empty                                                                                      | `path`, `eventType?`                       |
| `ClockworkInvalidValidateContextError`    | Context fails `validateContext`                                                                                                                 | `phase` (`'init' \| 'transition'`), `reason` |
| `ClockworkMissingCompoundInitialError`    | A compound state (has `states`) is missing `initial`                                                                                            | `path`                                     |
| `ClockworkTransitionLoopGuardError`       | `maxTransitionsPerFlush` exceeded in one flush                                                                                                  | `maxTransitionsPerFlush`                   |
| `ClockworkUnknownTargetError`             | A transition or `after` `target` does not exist in `states` — thrown for both unknown root states and unknown nested paths (e.g. `loading.nonexistent`) | `path`, `target`, `eventType?`             |

```ts
import { ClockworkError, ClockworkInvalidSnapshotStateError } from '@vielzeug/clockwork';

try {
  const m = createMachine(config).start({ snapshot: corruptedSnapshot });
} catch (err) {
  if (err instanceof ClockworkInvalidSnapshotStateError) {
    // discard snapshot and start fresh — err.state names the invalid state
    console.warn(`discarding snapshot: unknown state "${err.state}"`);
  } else if (ClockworkError.is(err)) {
    throw err; // some other clockwork validation failure
  }
}
```

## Signals and Reactivity

`state` and `context` are `Reactive` values from `@vielzeug/ripple`. Use `effect()` to react to changes:

```ts
import { effect } from '@vielzeug/ripple';
import { createMachine } from '@vielzeug/clockwork';

const m = createMachine(config).start();

effect(() => {
  document.title = `Status: ${m.state.value}`;
});

m.send({ type: 'GO' }); // triggers the effect synchronously
```

Both signals update atomically inside a `batch()` — an effect reading both `state` and `context` will always see a consistent snapshot.

For code that should not depend on `@vielzeug/ripple` directly, use `subscribe()`:

```ts
const unsub = m.subscribe(({ state, context }) => {
  console.log(state, context);
});
```
