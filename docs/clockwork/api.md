---
title: Clockwork — API Reference
description: Complete API reference for Clockwork.
---

[[toc]]

## API At a Glance

| Symbol                | Purpose                                    | Execution mode | Common gotcha                                               |
| --------------------- | ------------------------------------------ | -------------- | ----------------------------------------------------------- |
| `defineMachine()`     | Create immutable, validated FSM definition | Sync           | Throws `MachineError` on invalid config — check at startup  |
| `interpret()`         | Spawn reactive machine instance            | Sync           | Pass the definition returned by `defineMachine()`           |
| `resolveTransition()` | Pure transition resolver for testing       | Sync           | Does not fire debug hooks; returns `TransitionDef` directly |
| `MachineError`        | Typed error for all validation failures    | —              | Check `.code`, not `.message`                               |

## Package Entry Points

| Import                         | Purpose                                     |
| ------------------------------ | ------------------------------------------- |
| `@vielzeug/clockwork`          | All exports and types                       |
| `@vielzeug/clockwork/devtools` | `debugInterpret` — debug wrapper (dev only) |

## `defineMachine()`

Creates an immutable, validated FSM definition. Must be called before `interpret()`.

```ts
function defineMachine<State extends string, Ctx extends object, Ev extends MachineEvent>(
  config: MachineConfig<State, Ctx, Ev>,
): Readonly<MachineConfig<State, Ctx, Ev>>;
```

**Validates at call time:**

- `initial` state exists in `states`
- All transition `target` values exist in `states` — full nested paths (e.g. `loading.fetching`) are validated, not just the root segment
- Transition arrays are non-empty
- Compound states have `initial` pointing to a valid child
- `after` delays are non-negative

Throws `MachineError` if validation fails.

**Example:**

```ts
const machine = defineMachine({
  context: { count: 0 },
  initial: 'idle',
  states: {
    active: { on: { STOP: { target: 'idle' } } },
    idle: { on: { GO: { target: 'active' } } },
  },
});
```

## `interpret()`

Creates a live machine instance from a definition.

```ts
function interpret<State extends string, Ctx extends object, Ev extends MachineEvent>(
  definition: Readonly<MachineConfig<State, Ctx, Ev>>,
  options?: InterpretOptions<State, Ctx, Ev>,
): MachineInstance<State, Ctx, Ev>;
```

**Parameters:**

| Parameter                        | Type                           | Description                                                        |
| -------------------------------- | ------------------------------ | ------------------------------------------------------------------ |
| `definition`                     | `Readonly<MachineConfig<...>>` | Definition returned by `defineMachine()`                           |
| `options.clone`                  | `<T>(v: T) => T`               | Custom clone function. Default: `structuredClone`                  |
| `options.debug`                  | `DebugOptions<...>`            | Optional debug hooks                                               |
| `options.maxTransitionsPerFlush` | `number`                       | Loop guard ceiling. Default: `1000`                                |
| `options.middleware`             | `MiddlewareFn[]`               | Event interception pipeline                                        |
| `options.persistence`            | `PersistenceAdapter<...>`      | Save/load/clear adapter for snapshot persistence                   |
| `options.snapshot`               | `MachineSnapshot<...>`         | Initial snapshot to hydrate from (takes priority over persistence) |

**Returns:** `MachineInstance<State, Ctx, Ev>` — see [MachineInstance](#machineinstance).

**Example:**

```ts
const m = interpret(machine, {
  debug: {
    traceLimit: 100,
    onTransition: ({ from, to, event }) => console.log(from, '→', to, event.type),
  },
  persistence: { load, save, clear },
});
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
const transition = resolveTransition(machine, {
  context: { authorized: true },
  event: { type: 'LOGIN' },
  state: 'idle',
});

if (transition) {
  console.log('Would transition to:', transition.target);
}
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

A predicate that decides whether a transition is taken.

```ts
type GuardFn<Ctx extends object, Ev extends MachineEvent = MachineEvent> = (args: ActionArgs<Ctx, Ev>) => boolean;
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
  delay: number; // milliseconds, must be >= 0
  guard?: (args: { readonly context: Readonly<Ctx> }) => boolean;
  target: State;
};
```

The `guard` receives only `context` — the `$after` event carries no user-relevant payload beyond `delay`.

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

The configuration object passed to `defineMachine()`.

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

A function used for `validateContext`. Returns `true` if the context is valid.

```ts
type ContextValidator<Ctx extends object> = (context: Ctx) => boolean;
```

---

### `InterpretOptions<State, Ctx, Ev>`

Options passed to `interpret()`.

```ts
type InterpretOptions<State extends string, Ctx extends object, Ev extends MachineEvent> = {
  clone?: <T>(value: T) => T;
  debug?: DebugOptions<State, Ctx, Ev>;
  maxTransitionsPerFlush?: number;
  middleware?: Array<MiddlewareFn<State, Ctx, Ev>>;
  persistence?: PersistenceAdapter<State, Ctx>;
  snapshot?: MachineSnapshot<State, Ctx>;
};
```

| Option                   | Default           | Description                                                              |
| ------------------------ | ----------------- | ------------------------------------------------------------------------ |
| `clone`                  | `structuredClone` | Context clone function. Must return a structurally equivalent object. The caller is responsible for ensuring a safe prototype when providing a custom function. |
| `debug`                  | `undefined`       | Debug options — zero overhead when omitted                               |
| `maxTransitionsPerFlush` | `1000`            | Maximum transitions processed per flush before throwing loop-guard error |
| `middleware`             | `[]`              | Composable event interception pipeline                                   |
| `persistence`            | `undefined`       | Save/load/clear adapter                                                  |
| `snapshot`               | `undefined`       | Snapshot to hydrate from on startup (takes priority over persistence)    |

---

### `DebugOptions<State, Ctx, Ev>`

Debug configuration grouped by concern.

```ts
type DebugOptions<State extends string, Ctx extends object, Ev extends MachineEvent> = {
  onDebug?: (event: DebugEvent<State, Ctx, Ev>) => void;
  onTransition?: (info: { event: Ev | LifecycleEvent; from: State; to: State }) => void;
  traceLimit?: number;
};
```

| Option         | Default     | Description                                                  |
| -------------- | ----------- | ------------------------------------------------------------ |
| `onDebug`      | `undefined` | Receives all debug events as a discriminated union           |
| `onTransition` | `undefined` | Called synchronously after every committed transition        |
| `traceLimit`   | `0`         | Ring buffer capacity for `getTrace()`. `0` disables tracing. |

---

### `DebugEvent<State, Ctx, Ev>`

Discriminated union of debug events passed to `onDebug`.

```ts
type DebugEvent<State, Ctx, Ev> =
  | { type: 'guard'; context: Readonly<Ctx>; event: Ev; from: State; passed: boolean; target: State }
  | { type: 'transition-skipped'; event: Ev; from: State }
  | { type: 'invoke-start'; context: Readonly<Ctx>; event: Ev | LifecycleEvent; invokeId: number; state: State }
  | {
      type: 'invoke-done';
      context: Readonly<Ctx>;
      event: Ev | LifecycleEvent;
      invokeId: number;
      result: unknown;
      state: State;
    }
  | {
      type: 'invoke-error';
      context: Readonly<Ctx>;
      error: unknown;
      event: Ev | LifecycleEvent;
      invokeId: number;
      state: State;
    }
  | { type: 'invoke-abort'; context: Readonly<Ctx>; event: Ev | LifecycleEvent; invokeId: number; state: State };
```

| Type                 | Fires when                                                     |
| -------------------- | -------------------------------------------------------------- |
| `guard`              | A guard is evaluated — fires for both passed and failed guards |
| `transition-skipped` | An event has no matching transition (or all guards failed)     |
| `invoke-start`       | An async invoke task starts                                    |
| `invoke-done`        | An invoke task resolves successfully                           |
| `invoke-error`       | An invoke task rejects                                         |
| `invoke-abort`       | An invoke task is cancelled because the state was exited       |

---

### `MiddlewareFn<State, Ctx, Ev>`

Intercepts events before processing. Returns the result of `next()` or `false` to swallow the event.

```ts
type MiddlewareFn<State extends string, Ctx extends object, Ev extends MachineEvent> = (
  event: Ev,
  snapshot: { readonly context: Readonly<Ctx>; readonly state: State },
  next: () => boolean,
) => boolean;
```

Middleware is composed right-to-left: the first middleware in the array is the outermost wrapper.

---

### `MachineInstance<State, Ctx, Ev>`

The live machine object returned by `interpret()`.

```ts
interface MachineInstance<State extends string, Ctx extends object, Ev extends MachineEvent> {
  readonly context: ReadonlySignal<Ctx>;
  readonly state: ReadonlySignal<State>;
  can(event: Ev): boolean;
  getSnapshot(): MachineSnapshot<State, Ctx>;
  getTrace(): readonly TransitionTraceEntry<State, Ev>[];
  matches(...states: string[]): boolean;
  send(event: Ev): boolean;
  subscribe(fn: (snapshot: MachineSnapshot<State, Ctx>) => void): () => void;
  [Symbol.dispose](): void;
}
```

**Properties:**

| Property  | Type                    | Description                                                   |
| --------- | ----------------------- | ------------------------------------------------------------- |
| `state`   | `ReadonlySignal<State>` | Current state — reactive; read inside `effect()` to subscribe |
| `context` | `ReadonlySignal<Ctx>`   | Current context — reactive                                    |

**Methods:**

| Method               | Returns                  | Description                                                                                                                        |
| -------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `can(event)`         | `boolean`                | `true` if a valid transition exists for the event in the current state. Evaluates guards but fires no side effects or debug hooks. |
| `getSnapshot()`      | `MachineSnapshot<...>`   | Deep-cloned snapshot of current state and context.                                                                                 |
| `getTrace()`         | `TransitionTraceEntry[]` | Recent transitions in chronological order (oldest to newest). Returns cloned entries. Empty array when tracing is disabled.        |
| `matches(...states)` | `boolean`                | `true` if the current state is one of the given values or a descendant of any.                                                     |
| `send(event)`        | `boolean`                | Dispatches the event. Returns `true` if a transition occurred. Returns `false` when disposed, no transition matched, or called re-entrantly (event queued; transition fires after current one completes). |
| `subscribe(fn)`      | `() => void`             | Subscribes to state/context changes. Returns unsubscribe function. Fires only on reference change.                                 |
| `[Symbol.dispose]()` | `void`                   | Aborts active invokes, clears after-timers, and disposes reactive signals. Does **not** clear persisted state.                     |

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
  clear?: () => void;
  load: () => MachineSnapshot<State, Ctx> | undefined;
  save: (snapshot: MachineSnapshot<State, Ctx>) => void;
};
```

`save` is called after every committed transition. `load` is called once during `interpret()` if no `snapshot` option is provided.

---

### `InvokeDef<Ctx, Ev>`

Configuration for an async task in a state.

```ts
type InvokeDef<Ctx extends object, Ev extends MachineEvent> = {
  onDone?: (result: unknown, args: InvokeDispatchArgs<Ctx, Ev>) => Ev;
  onError?: (error: unknown, args: InvokeDispatchArgs<Ctx, Ev>) => Ev;
  src: (args: InvokeSourceArgs<Ctx, Ev>) => Promise<unknown>;
};
```

---

### `InvokeSourceArgs<Ctx, Ev>`

Arguments passed to the invoke `src` function.

```ts
type InvokeSourceArgs<Ctx extends object, Ev extends MachineEvent> = {
  readonly context: Readonly<Ctx>;
  readonly entryEvent: Ev | LifecycleEvent;
  readonly signal: AbortSignal;
};
```

`signal` is aborted automatically when the state is exited. `context` is captured at invoke creation time.

---

### `InvokeDispatchArgs<Ctx, Ev>`

Arguments passed to `onDone` and `onError` result handlers.

```ts
type InvokeDispatchArgs<Ctx extends object, Ev extends MachineEvent> = {
  readonly context: Readonly<Ctx>;
  readonly entryEvent: Ev | LifecycleEvent;
};
```

`context` is the snapshot from when the invoke was started — not the current value at resolution time.

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
}
```

**Error codes:**

| Code                                        | Thrown when                                                                                                                                  |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `MACHINE_INVALID_AFTER_DELAY`               | An `after` delay is negative                                                                                                                 |
| `MACHINE_INVALID_INITIAL_STATE`             | `initial` does not exist in `states` (top-level or compound)                                                                                 |
| `MACHINE_INVALID_MAX_TRANSITIONS_PER_FLUSH` | `maxTransitionsPerFlush` is less than 1                                                                                                      |
| `MACHINE_INVALID_SNAPSHOT_STATE`            | Hydrated snapshot refers to an unknown state                                                                                                 |
| `MACHINE_INVALID_TRANSITION_ARRAY`          | A transition array is empty                                                                                                                  |
| `MACHINE_INVALID_VALIDATE_CONTEXT`          | Context fails `validateContext`                                                                                                              |
| `MACHINE_MISSING_COMPOUND_INITIAL`          | A compound state (has `states`) is missing `initial`                                                                                         |
| `MACHINE_TRANSITION_LOOP_GUARD`             | `maxTransitionsPerFlush` exceeded in one flush                                                                                               |
| `MACHINE_UNKNOWN_TARGET`                    | A transition `target` does not exist in `states` — thrown for both unknown root states and unknown nested paths (e.g. `loading.nonexistent`) |

```ts
import { MachineError } from '@vielzeug/clockwork';

try {
  const m = interpret(machine, { snapshot: corruptedSnapshot });
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
import { interpret } from '@vielzeug/clockwork';

const m = interpret(machine);

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
