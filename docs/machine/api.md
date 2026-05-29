---
title: Machine - API Reference
description: Complete type and function documentation for Machine.
---

[[toc]]

## API At a Glance

- defineMachine() - Create immutable, validated FSM definition. Validates initial/targets.
- interpret() - Spawn reactive machine instance. Must pass definition, not config.
- resolveTransition() - Pure function for testing transitions. Does not run side effects.
- assign() - Create context update action. Only merges, does not replace.
- MachinitError - Typed error class for validation failures. Check code property, not message.

## Exports

All types and functions are exported from the main package entry point.

## Definitions

Creates an immutable, validated FSM definition.

```ts
export const defineMachine = <State extends string, Ctx extends object, Ev extends MachineEvent>(
  config: MachineConfig<State, Ctx, Ev>,
): MachineDefinition<State, Ctx, Ev>;
```

**Validates:**
- Initial state exists in states
- All transition targets exist in states
- All handlers are functions
- Transition arrays are non-empty

Throws MachinitError if validation fails.

**Example:**
```ts
const machine = defineMachine({
  initial: 'idle',
  context: { count: 0 },
  states: {
    idle: { on: { GO: [{ target: 'active' }] } },
    active: { on: { STOP: [{ target: 'idle' }] } },
  },
});
```

## interpret()

Creates a live machine instance from a definition.

```ts
export const interpret = <State extends string, Ctx extends object, Ev extends MachineEvent>(
  definition: MachineDefinition<State, Ctx, Ev>,
  options?: InterpretOptions<State, Ctx, Ev>,
): MachineInstance<State, Ctx, Ev>;
```

**Options:**
- debug? - Optional debug hooks
- maxTransitionsPerFlush? - Max transitions per event dispatch (default: 1000)
- persistence? - Optional snapshot load/save/clear adapter
- snapshot? - Initial snapshot to restore from
- traceLimit? - Keep last N transitions (default: 0 = disabled)
- validateSnapshot? - Optional context validator for hydrated snapshots

**Returns:** Live machine instance with reactive state and context signals.

**Example:**
```ts
const m = interpret(machine, {
  traceLimit: 100,
  persistence: { load, save, clear },
});
```

## resolveTransition()

Pure function resolving which transition (if any) should be taken.

```ts
export const resolveTransition = <State extends string, Ctx extends object, Ev extends MachineEvent>(
  definition: MachineDefinition<State, Ctx, Ev>,
  input: {
    context: Readonly<Ctx>;
    debug?: DebugHooks<State, Ctx, Ev>;
    event: NoInfer<Ev>;
    state: State;
  },
): TransitionResolution<State, Ctx, Ev> | undefined;
```

**Returns:** undefined if no transition matches; otherwise { transition }.

**Use for:** Testing transition logic independently of side effects.

**Example:**
```ts
const result = resolveTransition(machine, {
  state: 'idle',
  context: { authorized: true },
  event: { type: 'LOGIN' },
});

if (result) {
  console.log(`Will transition to: ${result.transition.target}`);
}
```

## assign()

Helper to create an action that merges partial context updates.

```ts
export const assign = <Ctx extends object, Ev extends MachineEvent = MachineEvent>(
  fn: (args: ActionArgs<Ctx, Ev>) => Partial<Ctx>,
): ActionFn<Ctx, Ev>;
```

**Example:**
```ts
actions: [
  assign(({ context, event }) => ({
    count: context.count + event.amount,
    updated: Date.now(),
  })),
];
```

## Types

### MachineEvent

Base event type. All events must extend this.

```ts
export type MachineEvent = { [key: string]: unknown; type: string };
```

Use discriminated unions for typed events:

```ts
type AppEvent =
  | { type: 'GO' }
  | { type: 'SET'; value: number }
  | { type: 'DONE'; result: string };
```

### EventType

Extract the union of all event types.

```ts
export type EventType<Ev extends MachineEvent> = Ev['type'] & string;

type MyEvent = { type: 'A' } | { type: 'B' };
type Types = EventType<MyEvent>; // 'A' | 'B'
```

### EventByType

Extract event by specific type (for payload inference).

```ts
export type EventByType<Ev extends MachineEvent, Type extends EventType<Ev>> = Extract<
  Ev,
  { type: Type }
>;

type MyEvent = { type: 'SET'; value: number } | { type: 'CLEAR' };
type SetEvent = EventByType<MyEvent, 'SET'>; // { type: 'SET'; value: number }
```

### ActionArgs

Arguments passed to actions.

```ts
export type ActionArgs<Ctx extends object, Ev extends MachineEvent = MachineEvent> = {
  context: Ctx;
  readonly event: Ev;
};
```

### ActionFn

Function that mutates context and has access to event.

```ts
export type ActionFn<Ctx extends object, Ev extends MachineEvent = MachineEvent> = (
  args: ActionArgs<Ctx, Ev>,
) => void;
```

### GuardFn

Function that returns whether a transition should occur.

```ts
export type GuardFn<Ctx extends object, Ev extends MachineEvent = MachineEvent> = (
  args: ActionArgs<Ctx, Ev>,
) => boolean;
```

### TransitionDef

Single transition configuration.

```ts
export type TransitionDef<State extends string, Ctx extends object, Ev extends MachineEvent> = {
  actions?: Array<ActionFn<Ctx, Ev>>;
  guard?: GuardFn<Ctx, Ev>;
  target: State;
};
```

### StateNode

Configuration for a single state.

```ts
export type StateNode<State extends string, Ctx extends object, Ev extends MachineEvent> = {
  entry?: ActionFn<Ctx, Ev | LifecycleEvent>;
  exit?: ActionFn<Ctx, Ev>;
  invoke?: Array<InvokeDef<Ctx, Ev>>;
  on?: Partial<{ [Type in EventType<Ev>]: Array<TransitionDef<State, Ctx, Ev, Type>> }>;
};
```

### MachineConfig

Configuration object for defineMachine().

```ts
export type MachineConfig<State extends string, Ctx extends object, Ev extends MachineEvent> = {
  context?: Ctx;
  initial: State;
  onTransition?: (info: { event: Ev; from: State; to: State }) => void;
  states: { [S in State]: StateNode<State, Ctx, Ev> };
  validateContext?: ContextValidator<Ctx>;
};
```

### MachineDefinition

Readonly definition returned by defineMachine().

```ts
export type MachineDefinition<State extends string, Ctx extends object, Ev extends MachineEvent> = Readonly<
  MachineConfig<State, Ctx, Ev>
>;
```

### MachineInstance<State, Ctx, Ev>

Live machine returned by interpret().

```ts
export interface MachineInstance<State extends string, Ctx extends object, Ev extends MachineEvent> {
  readonly context: ReadonlySignal<Ctx>;
  readonly state: ReadonlySignal<State>;
  can(event: Ev): boolean;
  getSnapshot(): MachineSnapshot<State, Ctx>;
  getTrace(): readonly TransitionTraceEntry<State, Ev>[];
  send(event: Ev): boolean;
  [Symbol.dispose](): void;
}
```

**Methods:**

- can(event) - Returns true if event is accepted in current state
- send(event) - Dispatches event; returns true if transition occurred
- getSnapshot() - Deep clone of current state and context
- getTrace() - Array of recent transitions (if tracing enabled)
- Symbol.dispose() - Cleanup: cancels invokes, disposes signals, clears persistence

### MachineSnapshot<State, Ctx>

Frozen state and context snapshot.

```ts
export type MachineSnapshot<State extends string, Ctx extends object> = {
  readonly context: Readonly<Ctx>;
  readonly state: State;
};
```

### InvokeDef<Ctx, Ev>

Async task configuration for a state.

```ts
export type InvokeDef<Ctx extends object, Ev extends MachineEvent> = {
  onDone?: (result: unknown, args: InvokeDispatchArgs<Ctx, Ev>) => Ev;
  onError?: (error: unknown, args: InvokeDispatchArgs<Ctx, Ev>) => Ev;
  src: (args: InvokeSourceArgs<Ctx, Ev>) => Promise<unknown>;
};
```

**Example:**
```ts
invoke: [
  {
    src: async ({ signal }) => fetch('/data', { signal }).then(r => r.json()),
    onDone: (result) => ({ type: 'SUCCESS', data: result }),
    onError: (error) => ({ type: 'FAILURE', error: String(error) }),
  },
];
```

### InvokeSourceArgs<Ctx, Ev>

Arguments passed to src function.

```ts
export type InvokeSourceArgs<Ctx extends object, Ev extends MachineEvent> = {
  readonly context: Readonly<Ctx>;
  readonly event: Ev | LifecycleEvent;
  readonly signal: AbortSignal;
};
```

### DebugHooks<State, Ctx, Ev>

Optional lifecycle callbacks for observability.

```ts
export type DebugHooks<State extends string, Ctx extends object, Ev extends MachineEvent> = {
  onEvaluateGuard?: (info: GuardEvaluationInfo<State, Ctx, Ev>) => void;
  onInvokeAbort?: (info: InvokeDebugInfo<State, Ctx, Ev>) => void;
  onInvokeDone?: (info: InvokeDebugInfo<State, Ctx, Ev> & { readonly result: unknown }) => void;
  onInvokeError?: (info: InvokeDebugInfo<State, Ctx, Ev> & { readonly error: unknown }) => void;
  onInvokeStart?: (info: InvokeDebugInfo<State, Ctx, Ev>) => void;
  onTransitionSkipped?: (info: TransitionSkippedInfo<State, Ev>) => void;
};
```

**Callbacks:**

- onEvaluateGuard - Guard evaluated (passed or failed)
- onTransitionSkipped - Event rejected (no matching transition or guard failed)
- onInvokeStart - Async task started
- onInvokeDone - Async task completed successfully
- onInvokeError - Async task failed
- onInvokeAbort - Async task cancelled (state exited)

### TransitionTraceEntry<State, Ev>

Single entry in transition history.

```ts
export type TransitionTraceEntry<State extends string, Ev extends MachineEvent> = {
  readonly event: Ev;
  readonly from: State;
  readonly invokeId?: number;
  readonly timestamp: number;
  readonly to: State;
};
```

### PersistenceAdapter<State, Ctx>

Pluggable adapter for snapshot persistence.

```ts
export type PersistenceAdapter<State extends string, Ctx extends object> = {
  clear?: () => void;
  load?: () => MachineSnapshot<State, Ctx> | undefined;
  save?: (snapshot: MachineSnapshot<State, Ctx>) => void;
};
```

### MachinitError

Error type for all FSM exceptions.

```ts
export class MachinitError extends Error {
  readonly code: MachinitErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(code: MachinitErrorCode, message: string, details?: Record<string, unknown>);
}

export type MachinitErrorCode =
  | 'MACHINIT_INVALID_INITIAL_STATE'
  | 'MACHINIT_INVALID_MAX_TRANSITIONS_PER_FLUSH'
  | 'MACHINIT_INVALID_SNAPSHOT_STATE'
  | 'MACHINIT_INVALID_TRANSITION'
  | 'MACHINIT_INVALID_TRANSITION_ARRAY'
  | 'MACHINIT_INVALID_TRANSITION_HANDLER'
  | 'MACHINIT_INVALID_TYPE_HANDLER'
  | 'MACHINIT_INVALID_TYPE_IN_TRANSITION'
  | 'MACHINIT_INVALID_VALIDATE_CONTEXT'
  | 'MACHINIT_TRANSITION_LOOP_GUARD'
  | 'MACHINIT_UNKNOWN_TARGET';
```

## Signals and Reactivity

State and context are reactive signals from `@vielzeug/ripple`. Use `effect()` to subscribe to changes.

```ts
import { effect } from '@vielzeug/ripple';

const m = interpret(machine);

effect(() => {
  console.log(`State: ${m.state.value}`);
});

m.send({ type: 'GO' }); // Logs "State: active"
```
