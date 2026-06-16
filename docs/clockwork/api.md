---
title: Clockwork — API Reference
description: Complete API reference for Clockwork.
---

[[toc]]

## API At a Glance

| Symbol                | Purpose                                      | Execution mode | Common gotcha                                               |
| --------------------- | -------------------------------------------- | -------------- | ----------------------------------------------------------- |
| `machine()`           | Validate config and start a machine instance | Sync           | Throws `MachineError` on invalid config — check at startup  |
| `define()`            | Validate config for reuse; call `.start()`   | Sync           | Returns a definition handle, not an instance                |
| `resolveTransition()` | Pure transition resolver for testing         | Sync           | Does not fire debug hooks; returns `TransitionDef` directly |
| `MachineError`        | Typed error for all validation failures      | —              | Check `.code`, not `.message`                               |

## Package Entry Points

| Import                         | Purpose                                     |
| ------------------------------ | ------------------------------------------- |
| `@vielzeug/clockwork`          | All exports and types                       |
| `@vielzeug/clockwork/devtools` | `debugInterpret` — debug wrapper (dev only) |

## `machine()`

Validates the config and immediately starts a running machine instance. The primary entry point.

```ts
function machine<State extends string, Ctx extends object, Ev extends MachineEvent>(
  config: MachineConfig<State, Ctx, Ev>,
  options?: InterpretOptions<State, Ctx, Ev>,
): MachineInstance<State, Ctx, Ev>;
```

**Validates at call time:**

- `initial` state exists in `states`
- All transition `target` values exist in `states` — full nested paths (e.g. `loading.fetching`) are validated, not just the root segment
- Transition arrays are non-empty
- Compound states have `initial` pointing to a valid child
- `after` delays are finite numbers (`>= 0`; `NaN` and `Infinity` are rejected)
- `invoke` arrays are non-empty

Throws `MachineError` if validation fails.

**Parameters:**

| Parameter                        | Type                      | Description                                                        |
| -------------------------------- | ------------------------- | ------------------------------------------------------------------ |
| `config`                         | `MachineConfig<...>`      | Machine configuration                                              |
| `options.clone`                  | `<T>(v: T) => T`          | Custom clone function. Default: `structuredClone`                  |
| `options.debug`                  | `DebugOptions<...>`       | Optional debug hooks. Auto-enables trace buffer (50) when set.     |
| `options.interceptors`           | `InterceptorFn[]`         | Pure event interceptors, run left-to-right                         |
| `options.maxTransitionsPerFlush` | `number`                  | Loop guard ceiling. Default: `1000`                                |
| `options.persistence`            | `PersistenceAdapter<...>` | Save/load adapter for snapshot persistence                         |
| `options.snapshot`               | `MachineSnapshot<...>`    | Initial snapshot to hydrate from (takes priority over persistence) |

**Returns:** `MachineInstance<State, Ctx, Ev>` — see [MachineInstance](#machineinstance).

**Example:**

```ts
const m = machine(
  {
    context: { count: 0 },
    initial: 'idle',
    states: {
      active: { on: { STOP: { target: 'idle' } } },
      idle: { on: { GO: { target: 'active' } } },
    },
  },
  {
    onDebug: ({ type, ...rest }) => console.log(type, rest),
  },
);
```

## `define()`

Validates a configuration and returns a reusable definition handle. Call `.start(options?)` to create instances.

Use this when the same config is started multiple times, or when you need to separate validation from instantiation.

```ts
function define<State extends string, Ctx extends object, Ev extends MachineEvent>(
  config: MachineConfig<State, Ctx, Ev>,
): MachineDefinition<State, Ctx, Ev>;
```

See [MachineDefinition](#machinedefinition) for the full interface.

**Example:**

```ts
const counterDef = define({
  context: { count: 0 },
  initial: 'idle',
  states: {
    idle: {
      on: {
        INC: {
          actions: [
            ({ context }) => {
              context.count++;
            },
          ],
          target: 'idle',
        },
      },
    },
  },
});

const m1 = counterDef.start();
const m2 = counterDef.start({ snapshot: { context: { count: 10 }, state: 'idle' } });

// Test transitions without a running machine:
counterDef.resolve({ context: { count: 0 }, event: { type: 'INC' }, state: 'idle' });
```

## `resolveTransition()`

Pure function that resolves which transition (if any) would be taken for a given state, context, and event. Does not run actions, entry/exit handlers, invokes, or fire debug events.

```ts
function resolveTransition<State extends string, Ctx extends object, Ev extends MachineEvent>(
  definition: Readonly<MachineConfig<State, Ctx, Ev>>,
  input: {
    context: Readonly<Ctx>;
    event: Ev;
    state: State;
  },
  onGuard?: (info: { context: Readonly<Ctx>; event: Ev; from: State; passed: boolean; target: State }) => void,
): TransitionDef<State, Ctx, Ev> | undefined;
```

**Returns:** The matching `TransitionDef` object if a transition is found, `undefined` otherwise.

The optional `onGuard` callback is invoked for each guard evaluation — useful for debugging guard logic in tests.

**Example:**

```ts
const authDef = define(authConfig);
const transition = authDef.resolve({
  context: { authorized: true },
  event: { type: 'LOGIN' },
  state: 'idle',
});

if (transition) {
  console.log('Would transition to:', transition.target);
}

// or use resolveTransition with a raw config:
const transition2 = resolveTransition(authConfig, {
  context: { authorized: true },
  event: { type: 'LOGIN' },
  state: 'idle',
});
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
- Return a non-empty string describing the failure (surfaced in `MachineError.details.reason`).

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
  readonly ok: boolean;
  readonly queued: boolean;
  readonly status: 'queued' | 'rejected' | 'transitioned';
};
```

| Field    | Description                                                                             |
| -------- | --------------------------------------------------------------------------------------- |
| `ok`     | `true` when status is `'transitioned'` or `'queued'`; `false` when `'rejected'`         |
| `queued` | `true` when called re-entrantly (from inside an action); event is queued for next drain |
| `status` | `'transitioned'` on success; `'queued'` when re-entrant; `'rejected'` otherwise         |

| `status` value | Meaning                                                                                       |
| -------------- | --------------------------------------------------------------------------------------------- |
| `transitioned` | A transition occurred synchronously                                                           |
| `queued`       | Called re-entrantly (e.g. from inside an action); the event is queued for the next drain      |
| `rejected`     | No matching transition, a guard failed, an interceptor blocked it, or the machine is disposed |

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

const m = machine(config, { interceptors: [rateLimiter] });
```

---

### `MachineInstance<State, Ctx, Ev>`

The live machine object returned by `machine()` or `define().start()`.

```ts
interface MachineInstance<State extends string, Ctx extends object, Ev extends MachineEvent> {
  readonly context: ReadonlySignal<Ctx>;
  readonly disposalSignal: AbortSignal;
  readonly disposed: boolean;
  readonly state: ReadonlySignal<State>;
  can(event: Ev): boolean;
  dispose(): void;
  getSnapshot(): MachineSnapshot<State, Ctx>;
  getTrace(): readonly TransitionTraceEntry<State, Ev>[];
  matches(...states: string[]): boolean;
  send(event: Ev): SendResult; // returns { ok, queued, status }
  subscribe(fn: (snapshot: MachineSnapshot<State, Ctx>) => void): () => void;
  [Symbol.dispose](): void;
}
```

**Properties:**

| Property         | Type                    | Description                                                                        |
| ---------------- | ----------------------- | ---------------------------------------------------------------------------------- |
| `state`          | `ReadonlySignal<State>` | Current state — reactive; read inside `effect()` to subscribe                      |
| `context`        | `ReadonlySignal<Ctx>`   | Current context — reactive                                                         |
| `disposed`       | `boolean`               | `true` after `dispose()` has been called                                           |
| `disposalSignal` | `AbortSignal`           | Aborted when the machine is disposed. Use to tie external lifetimes to the machine |

**Methods:**

| Method               | Returns                  | Description                                                                                                                                                                                               |
| -------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `can(event)`         | `boolean`                | `true` if a valid transition exists for the event in the current state. Evaluates guards but fires no side effects or debug hooks. Returns `false` when disposed.                                         |
| `getSnapshot()`      | `MachineSnapshot<...>`   | Deep-cloned snapshot of current state and context.                                                                                                                                                        |
| `getTrace()`         | `TransitionTraceEntry[]` | Recent transitions in chronological order (oldest to newest). Returns cloned entries. Empty array when tracing is disabled.                                                                               |
| `matches(...states)` | `boolean`                | `true` if the current state is one of the given values or a descendant of any (e.g. `matches('loading')` matches `'loading.pending'`). Returns `false` when disposed.                                     |
| `dispose()`          | `void`                   | Aborts active invokes, clears after-timers, and disposes reactive signals. Idempotent. Does **not** clear persisted state. Equivalent to `using m = machine(...)`.                                        |
| `send(event)`        | `SendResult`             | Dispatches the event. Returns a `SendResult` object. Check `.ok` for a quick pass/fail, or `.status` for the full detail (`'transitioned'` \| `'queued'` \| `'rejected'`).                                |
| `subscribe(fn)`      | `() => void`             | Subscribes to state/context changes. Returns an unsubscribe function. Fires only when state or context changes — **not** on the initial value. Use `getSnapshot()` to read the current state immediately. |
| `[Symbol.dispose]()` | `void`                   | Delegates to `dispose()`. Enables `using` declarations.                                                                                                                                                   |

---

### `MachineDefinition<State, Ctx, Ev>`

Handle returned by `define()`. Holds the validated config and exposes two methods.

```ts
interface MachineDefinition<State extends string, Ctx extends object, Ev extends MachineEvent> {
  resolve(input: { context: Readonly<Ctx>; event: Ev; state: State }): TransitionDef<State, Ctx, Ev> | undefined;
  start(options?: InterpretOptions<State, Ctx, Ev>): MachineInstance<State, Ctx, Ev>;
}
```

| Method      | Description                                                                                                                                                                                    |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `start()`   | Creates a new running machine instance. Pass `options` to customise debug, snapshot, etc.                                                                                                      |
| `resolve()` | Pure — resolves which transition would be taken for a given state, context, and event. Runs guards but fires no side effects or debug hooks. Equivalent to `resolveTransition(config, input)`. |

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

`save` is called after every committed transition. `load` is called once during startup if no `snapshot` option is provided.

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
type InvokeDef<Ctx extends object, Ev extends MachineEvent> = {
  id?: string;
  onDone?: (result: unknown, context: Readonly<Ctx>) => Ev;
  onError?: (error: unknown, context: Readonly<Ctx>) => Ev;
  src: (args: InvokeArgs<Ctx, Ev>) => Promise<unknown>;
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

## Errors

### `MachineError`

Thrown for all FSM validation and runtime failures. Always check `.code` programmatically — never `.message`.

```ts
class MachineError extends Error {
  readonly code: MachineErrorCode;
  readonly details?: Record<string, unknown>;
  static is(err: unknown): err is MachineError;
}
```

`MachineError.is()` is a type-safe static predicate — prefer it over `instanceof` in catch blocks that may receive unknown values:

```ts
import { MachineError } from '@vielzeug/clockwork';

catch (err) {
  if (MachineError.is(err)) {
    console.error(err.code, err.details);
  }
}
```

All error `.message` strings are prefixed with `[@vielzeug/clockwork]`. Use `.code` for programmatic checks — `.message` is for human-readable logs only.

**Error codes:**

| Code                                        | Thrown when                                                                                                                                  |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `MACHINE_INVALID_AFTER_DELAY`               | An `after` delay is negative, `NaN`, or non-finite (`Infinity`)                                                                              |
| `MACHINE_INVALID_INITIAL_STATE`             | `initial` does not exist in `states` (top-level or compound)                                                                                 |
| `MACHINE_INVALID_MAX_TRANSITIONS_PER_FLUSH` | `maxTransitionsPerFlush` is less than 1                                                                                                      |
| `MACHINE_INVALID_SNAPSHOT_STATE`            | Hydrated snapshot refers to an unknown state                                                                                                 |
| `MACHINE_INVALID_TRANSITION_ARRAY`          | A transition array is empty, or an `invoke` array is empty                                                                                   |
| `MACHINE_INVALID_VALIDATE_CONTEXT`          | Context fails `validateContext`                                                                                                              |
| `MACHINE_MISSING_COMPOUND_INITIAL`          | A compound state (has `states`) is missing `initial`                                                                                         |
| `MACHINE_TRANSITION_LOOP_GUARD`             | `maxTransitionsPerFlush` exceeded in one flush                                                                                               |
| `MACHINE_UNKNOWN_TARGET`                    | A transition `target` does not exist in `states` — thrown for both unknown root states and unknown nested paths (e.g. `loading.nonexistent`) |

```ts
import { MachineError } from '@vielzeug/clockwork';

try {
  const m = machine(config, { snapshot: corruptedSnapshot });
} catch (err) {
  if (err instanceof MachineError && err.code === 'MACHINE_INVALID_SNAPSHOT_STATE') {
    // discard snapshot and start fresh
  }
}
```

## Signals and Reactivity

`state` and `context` are `ReadonlySignal` values from `@vielzeug/ripple`. Use `effect()` to react to changes:

```ts
import { effect } from '@vielzeug/ripple';
import { machine } from '@vielzeug/clockwork';

const m = machine(config);

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
