---
title: Machine — API Reference
description: Complete API reference for Machine.
---

[[toc]]

## API At a Glance

| Symbol | Purpose | Execution mode | Common gotcha |
| --- | --- | --- | --- |
| `defineMachine()` | Create immutable, validated FSM definition | Sync | Throws `MachineError` on invalid config — check at startup |
| `interpret()` | Spawn reactive machine instance | Sync | Pass a `MachineDefinition`, not a raw config |
| `resolveTransition()` | Pure transition resolver for testing | Sync | Does not fire debug hooks; returns `TransitionDef` directly |
| `assign()` | Context update helper | Sync | Shallow merge — spread nested objects explicitly |
| `MachineError` | Typed error for all validation failures | — | Check `.code`, not `.message` |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/machine` | All exports and types |

---

## `defineMachine()`

Creates an immutable, validated FSM definition. Must be called before `interpret()`.

```ts
function defineMachine<
  State extends string,
  Ctx extends object,
  Ev extends MachineEvent,
>(config: MachineConfig<State, Ctx, Ev>): MachineDefinition<State, Ctx, Ev>;
```

**Validates at call time:**
- `initial` state exists in `states`
- All transition `target` values exist in `states`
- All `actions`, `guard`, `entry`, `exit` values are functions
- Transition arrays are non-empty

Throws `MachineError` if validation fails.

**Example:**

```ts
const machine = defineMachine({
  context: { count: 0 },
  initial: 'idle',
  states: {
    active: { on: { STOP: { target: 'idle' } } },
    idle:   { on: { GO:   { target: 'active' } } },
  },
});
```

---

## `interpret()`

Creates a live machine instance from a definition.

```ts
function interpret<
  State extends string,
  Ctx extends object,
  Ev extends MachineEvent,
>(
  definition: MachineDefinition<State, Ctx, Ev>,
  options?: InterpretOptions<State, Ctx, Ev>,
): MachineInstance<State, Ctx, Ev>;
```

**Parameters:**

| Parameter | Type | Description |
| --- | --- | --- |
| `definition` | `MachineDefinition<...>` | Definition returned by `defineMachine()` |
| `options.clone` | `<T>(v: T) => T` | Custom clone function. Default: `structuredClone` |
| `options.debug` | `DebugHooks<...>` | Optional lifecycle callbacks |
| `options.maxTransitionsPerFlush` | `number` | Loop guard ceiling. Default: `1000` |
| `options.onTransition` | `(info) => void` | Called after every successful transition |
| `options.persistence` | `PersistenceAdapter<...>` | Save/load/clear adapter for snapshot persistence |
| `options.snapshot` | `MachineSnapshot<...>` | Initial snapshot to hydrate from |
| `options.traceLimit` | `number` | Ring buffer size for `getTrace()`. Default: `0` (disabled) |
| `options.validateSnapshot` | `ContextValidator<Ctx>` | Validator run on hydrated snapshot context |

**Returns:** `MachineInstance<State, Ctx, Ev>` — see [MachineInstance](#machineinstance).

**Example:**

```ts
const m = interpret(machine, {
  traceLimit: 100,
  onTransition: ({ from, to, event }) => console.log(from, '→', to, event.type),
  persistence: { load, save, clear },
});
```

---

## `resolveTransition()`

Pure function that resolves which transition (if any) would be taken for a given state, context, and event. Does not run actions, entry/exit handlers, invokes, or `onTransition`. Does not fire `onEvaluateGuard` debug hooks.

```ts
function resolveTransition<
  State extends string,
  Ctx extends object,
  Ev extends MachineEvent,
>(
  definition: MachineDefinition<State, Ctx, Ev>,
  input: {
    context: Readonly<Ctx>;
    event: Ev;
    state: State;
  },
): TransitionDef<State, Ctx, Ev> | undefined;
```

**Returns:** The matching `TransitionDef` object if a transition is found, `undefined` otherwise.

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

---

## `assign()`

Creates an action that shallow-merges partial context updates. The merge is equivalent to `Object.assign(context, fn(args))`.

```ts
function assign<Ctx extends object, Ev extends MachineEvent = MachineEvent>(
  fn: (args: ActionArgs<Ctx, Ev>) => Partial<Ctx>,
): ActionFn<Ctx, Ev>;
```

::: warning Shallow merge
`assign()` shallow-merges into the current context. For nested objects, spread them explicitly to avoid overwriting sibling keys:

```ts
// ✅ Correct — spread the nested object
assign(({ context }) => ({ config: { ...context.config, debug: true } }))

// ❌ Wrong — overwrites all other keys in config
assign(() => ({ config: { debug: true } }))
```
:::

**Example:**

```ts
actions: [
  assign(({ context, event }) => ({
    count: context.count + event.amount,
    updatedAt: Date.now(),
  })),
],
```

---

## Types

### `MachineEvent`

Base constraint for all event types.

```ts
type MachineEvent = { [key: string]: unknown; type: string };
```

Define events as discriminated unions for full TypeScript inference:

```ts
type AppEvent =
  | { type: 'FETCH' }
  | { type: 'DONE'; data: string }
  | { type: 'FAIL'; error: Error };
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

Internal synthetic events dispatched by the runtime. Received by `entry` and invoke `src` on state entry.

```ts
type LifecycleEvent = { type: '$hydrate' } | { type: '$init' };
```

---

### `ActionArgs<Ctx, Ev>`

Arguments passed to action functions.

```ts
type ActionArgs<Ctx extends object, Ev extends MachineEvent = MachineEvent> = {
  context: Ctx;         // mutable context draft
  readonly event: Ev;   // triggering event (readonly)
};
```

---

### `ActionFn<Ctx, Ev>`

A function that mutates context during a transition.

```ts
type ActionFn<Ctx extends object, Ev extends MachineEvent = MachineEvent> = (
  args: ActionArgs<Ctx, Ev>,
) => void;
```

---

### `EntryFn<Ctx>`

Entry actions receive only context — they do not receive the triggering event.

```ts
type EntryFn<Ctx extends object> = (args: { context: Ctx }) => void;
```

Use transition `actions` instead of `entry` when you need the event payload.

---

### `GuardFn<Ctx, Ev>`

A predicate that decides whether a transition is taken.

```ts
type GuardFn<Ctx extends object, Ev extends MachineEvent = MachineEvent> = (
  args: ActionArgs<Ctx, Ev>,
) => boolean;
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

### `TransitionInput<State, Ctx, Ev, Type>`

The value accepted by the `on` map. Either a single `TransitionDef` or an array of alternatives.

```ts
type TransitionInput<...> = TransitionDef<...> | Array<TransitionDef<...>>;
```

Arrays are processed in order — the first definition whose guard passes (or has no guard) is taken.

---

### `StateNode<State, Ctx, Ev>`

Configuration for a single state.

```ts
type StateNode<State extends string, Ctx extends object, Ev extends MachineEvent> = {
  /** Called on state entry. Receives only context. */
  entry?: EntryFn<Ctx>;
  /** Called on state exit. Receives context and triggering event. */
  exit?: ActionFn<Ctx, Ev>;
  invoke?: Array<InvokeDef<Ctx, Ev>>;
  on?: Partial<{ [Type in EventType<Ev>]: TransitionInput<State, Ctx, Ev, Type> }>;
};
```

---

### `MachineConfig<State, Ctx, Ev>`

The configuration object passed to `defineMachine()`.

```ts
type MachineConfig<State extends string, Ctx extends object, Ev extends MachineEvent> = {
  context?: Ctx;
  initial: State;
  states: { [S in State]: StateNode<State, Ctx, Ev> };
  validateContext?: ContextValidator<Ctx>;
};
```

::: tip `onTransition` moved
`onTransition` is no longer part of `MachineConfig`. Pass it in `InterpretOptions` so the same definition can be reused with different observers.
:::

---

### `MachineDefinition<State, Ctx, Ev>`

Immutable, frozen definition returned by `defineMachine()`.

```ts
type MachineDefinition<State extends string, Ctx extends object, Ev extends MachineEvent> =
  Readonly<MachineConfig<State, Ctx, Ev>>;
```

---

### `InterpretOptions<State, Ctx, Ev>`

Options passed to `interpret()`.

```ts
type InterpretOptions<State extends string, Ctx extends object, Ev extends MachineEvent> = {
  clone?: <T>(value: T) => T;
  debug?: DebugHooks<State, Ctx, Ev>;
  maxTransitionsPerFlush?: number;
  onTransition?: (info: { event: Ev; from: State; to: State }) => void;
  persistence?: PersistenceAdapter<State, Ctx>;
  snapshot?: MachineSnapshot<State, Ctx>;
  traceLimit?: number;
  validateSnapshot?: ContextValidator<Ctx>;
};
```

| Option | Default | Description |
| --- | --- | --- |
| `clone` | `structuredClone` | Context clone function. Use shallow clone for performance on simple contexts. |
| `debug` | `undefined` | Debug hooks — zero overhead when omitted |
| `maxTransitionsPerFlush` | `1000` | Maximum transitions processed per `send()` call before throwing a loop-guard error |
| `onTransition` | `undefined` | Called synchronously after every successful committed transition |
| `persistence` | `undefined` | Save/load/clear adapter |
| `snapshot` | `undefined` | Snapshot to hydrate from on startup |
| `traceLimit` | `0` | Ring buffer capacity for `getTrace()`. `0` disables tracing. |
| `validateSnapshot` | `undefined` | Context validator run on hydrated snapshot |

---

### `MachineInstance<State, Ctx, Ev>`

The live machine object returned by `interpret()`.

```ts
interface MachineInstance<State extends string, Ctx extends object, Ev extends MachineEvent> {
  readonly context: ReadonlySignal<Ctx>;
  readonly state: ReadonlySignal<State>;
  can(event: Ev): boolean;
  clearPersistence(): void;
  getSnapshot(): MachineSnapshot<State, Ctx>;
  getTrace(): readonly TransitionTraceEntry<State, Ev>[];
  matches(...states: State[]): boolean;
  send(event: Ev): boolean;
  [Symbol.dispose](): void;
}
```

**Properties:**

| Property | Type | Description |
| --- | --- | --- |
| `state` | `ReadonlySignal<State>` | Current state — reactive; read inside `effect()` to subscribe |
| `context` | `ReadonlySignal<Ctx>` | Current context — reactive |

**Methods:**

| Method | Returns | Description |
| --- | --- | --- |
| `can(event)` | `boolean` | `true` if a valid transition exists for the event in the current state. Evaluates guards but fires no side effects or debug hooks. |
| `clearPersistence()` | `void` | Calls `persistence.clear()`. Does not dispose the instance. |
| `getSnapshot()` | `MachineSnapshot<...>` | Deep-cloned snapshot of current state and context. |
| `getTrace()` | `TransitionTraceEntry[]` | Recent transitions in chronological order (oldest to newest). Empty array when tracing is disabled. |
| `matches(...states)` | `boolean` | `true` if the current state is one of the given values. |
| `send(event)` | `boolean` | Dispatches the event. Returns `true` if a transition occurred. |
| `[Symbol.dispose]()` | `void` | Aborts active invokes and disposes reactive signals. Does **not** clear persisted state. |

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

Pluggable adapter for snapshot persistence. All methods are optional.

```ts
type PersistenceAdapter<State extends string, Ctx extends object> = {
  clear?: () => void;
  load?: () => MachineSnapshot<State, Ctx> | undefined;
  save?: (snapshot: MachineSnapshot<State, Ctx>) => void;
};
```

::: warning Disposal and clearing
`m[Symbol.dispose]()` does **not** call `adapter.clear()`. Call `m.clearPersistence()` explicitly to remove stored state.
:::

---

### `ContextValidator<Ctx>`

A type guard function used for `validateContext` and `validateSnapshot`.

```ts
type ContextValidator<Ctx extends object> = (context: unknown) => context is Ctx;
```

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
  readonly event: Ev | LifecycleEvent;
  readonly signal: AbortSignal;
};
```

`signal` is aborted automatically when the state is exited.

---

### `InvokeDispatchArgs<Ctx, Ev>`

Arguments passed to `onDone` and `onError` result handlers.

```ts
type InvokeDispatchArgs<Ctx extends object, Ev extends MachineEvent> = {
  readonly context: Readonly<Ctx>;
  readonly event: Ev | LifecycleEvent;
};
```

---

### `DebugHooks<State, Ctx, Ev>`

Optional lifecycle callbacks for observability. Provide only the hooks you need.

```ts
type DebugHooks<State extends string, Ctx extends object, Ev extends MachineEvent> = {
  onEvaluateGuard?: (info: GuardEvaluationInfo<State, Ctx, Ev>) => void;
  onInvokeAbort?: (info: InvokeDebugInfo<State, Ctx, Ev>) => void;
  onInvokeDone?: (info: InvokeDebugInfo<State, Ctx, Ev> & { readonly result: unknown }) => void;
  onInvokeError?: (info: InvokeDebugInfo<State, Ctx, Ev> & { readonly error: unknown }) => void;
  onInvokeStart?: (info: InvokeDebugInfo<State, Ctx, Ev>) => void;
  onTransitionSkipped?: (info: TransitionSkippedInfo<State, Ev>) => void;
};
```

| Hook | Fires when |
| --- | --- |
| `onEvaluateGuard` | A guard is evaluated — fires for both passed and failed guards |
| `onTransitionSkipped` | An event has no matching transition (or all guards failed) |
| `onInvokeStart` | An async invoke task starts |
| `onInvokeDone` | An invoke task resolves successfully |
| `onInvokeError` | An invoke task rejects |
| `onInvokeAbort` | An invoke task is cancelled because the state was exited |

::: tip `can()` does not fire hooks
`can()` evaluates guards internally but does **not** fire `onEvaluateGuard`. Debug hooks only fire during `send()`.
:::

---

### `GuardEvaluationInfo<State, Ctx, Ev>`

Payload for `onEvaluateGuard`.

```ts
type GuardEvaluationInfo<...> = {
  readonly context: Readonly<Ctx>;
  readonly event: Ev;
  readonly from: State;
  readonly passed: boolean;
  readonly target: State;
};
```

---

### `TransitionSkippedInfo<State, Ev>`

Payload for `onTransitionSkipped`.

```ts
type TransitionSkippedInfo<State extends string, Ev extends MachineEvent> = {
  readonly event: Ev;
  readonly from: State;
};
```

---

### `InvokeDebugInfo<State, Ctx, Ev>`

Base payload for all invoke debug hooks.

```ts
type InvokeDebugInfo<...> = {
  readonly context: Readonly<Ctx>;
  readonly event: Ev | LifecycleEvent;
  readonly invokeId: number;
  readonly state: State;
};
```

`onInvokeDone` extends this with `result: unknown`; `onInvokeError` with `error: unknown`.

---

### `TransitionTraceEntry<State, Ev>`

A single entry in the transition trace ring buffer.

```ts
type TransitionTraceEntry<State extends string, Ev extends MachineEvent> = {
  readonly event: Ev;
  readonly from: State;
  readonly invokeId?: number;  // set when the transition was triggered by an invoke result
  readonly timestamp: number;  // Date.now() at commit time
  readonly to: State;
};
```

---

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

| Code | Thrown when |
| --- | --- |
| `MACHINE_INVALID_INITIAL_STATE` | `initial` does not exist in `states` |
| `MACHINE_INVALID_MAX_TRANSITIONS_PER_FLUSH` | `maxTransitionsPerFlush` is not a positive integer |
| `MACHINE_INVALID_SNAPSHOT_STATE` | Hydrated snapshot refers to an unknown state |
| `MACHINE_INVALID_TRANSITION` | A transition definition is not an object |
| `MACHINE_INVALID_TRANSITION_ARRAY` | A transition array is empty |
| `MACHINE_INVALID_TRANSITION_HANDLER` | An `actions` or `guard` entry is not a function |
| `MACHINE_INVALID_TYPE_HANDLER` | An `entry` or `exit` value is not a function |
| `MACHINE_INVALID_TYPE_IN_TRANSITION` | A transition array entry has an unexpected shape |
| `MACHINE_INVALID_VALIDATE_CONTEXT` | Context fails `validateContext` or `validateSnapshot` |
| `MACHINE_TRANSITION_LOOP_GUARD` | `maxTransitionsPerFlush` exceeded in one `send()` call |
| `MACHINE_UNKNOWN_TARGET` | A transition `target` does not exist in `states` |

```ts
import { MachineError } from '@vielzeug/machine';

try {
  const m = interpret(machine, { snapshot: corruptedSnapshot });
} catch (err) {
  if (err instanceof MachineError && err.code === 'MACHINE_INVALID_SNAPSHOT_STATE') {
    // discard snapshot and start fresh
  }
}
```

---

## Signals and Reactivity

`state` and `context` are `ReadonlySignal` values from `@vielzeug/ripple`. Use `effect()` to react to changes:

```ts
import { effect } from '@vielzeug/ripple';
import { interpret } from '@vielzeug/machine';

const m = interpret(machine);

effect(() => {
  document.title = `Status: ${m.state.value}`;
});

m.send({ type: 'GO' }); // triggers the effect synchronously
```

Both signals update atomically inside a `batch()` — an effect reading both `state` and `context` will always see a consistent snapshot.
