import type { ReadonlySignal } from '@vielzeug/ripple';

// ── Events ───────────────────────────────────────────────────────────────────

export type MachineEvent = { type: string };

export type EventType<Ev extends MachineEvent> = Ev['type'] & string;

export type EventByType<Ev extends MachineEvent, Type extends EventType<Ev>> = Extract<Ev, { type: Type }>;

type InitEvent = { readonly type: '$init' };
type HydrateEvent = { readonly type: '$hydrate' };

export type LifecycleEvent = HydrateEvent | InitEvent;

// ── Actions & guards ─────────────────────────────────────────────────────────

export type ActionArgs<Ctx extends object, Ev extends MachineEvent = MachineEvent> = {
  context: Ctx;
  readonly event: Ev;
};

export type ActionFn<Ctx extends object, Ev extends MachineEvent = MachineEvent> = (args: ActionArgs<Ctx, Ev>) => void;

export type GuardFn<Ctx extends object, Ev extends MachineEvent = MachineEvent> = (
  args: ActionArgs<Ctx, Ev>,
) => boolean;

// ── Lifecycle functions (symmetric entry/exit) ───────────────────────────────

export type LifecycleFn<Ctx extends object, Ev extends MachineEvent = MachineEvent> = (args: {
  context: Ctx;
  readonly event: Ev | LifecycleEvent;
}) => void;

// ── Transitions ──────────────────────────────────────────────────────────────

export type TransitionDef<
  State extends string,
  Ctx extends object,
  Ev extends MachineEvent,
  Type extends EventType<Ev> = EventType<Ev>,
> = {
  actions?: Array<ActionFn<Ctx, EventByType<Ev, Type>>>;
  guard?: GuardFn<Ctx, EventByType<Ev, Type>>;
  target: State;
};

/** Internal: a single transition object or an array of alternatives. */
export type TransitionInput<
  State extends string,
  Ctx extends object,
  Ev extends MachineEvent,
  Type extends EventType<Ev> = EventType<Ev>,
> = Array<TransitionDef<State, Ctx, Ev, Type>> | TransitionDef<State, Ctx, Ev, Type>;

// ── Invokes ──────────────────────────────────────────────────────────────────

export type InvokeSourceArgs<Ctx extends object, Ev extends MachineEvent> = {
  readonly context: Readonly<Ctx>;
  readonly entryEvent: Ev | LifecycleEvent;
  readonly signal: AbortSignal;
};

export type InvokeDispatchArgs<Ctx extends object, Ev extends MachineEvent> = {
  readonly context: Readonly<Ctx>;
  readonly entryEvent: Ev | LifecycleEvent;
};

export type InvokeDef<Ctx extends object, Ev extends MachineEvent> = {
  onDone?: (result: unknown, args: InvokeDispatchArgs<Ctx, Ev>) => Ev;
  onError?: (error: unknown, args: InvokeDispatchArgs<Ctx, Ev>) => Ev;
  src: (args: InvokeSourceArgs<Ctx, Ev>) => Promise<unknown>;
};

// ── State nodes ──────────────────────────────────────────────────────────────

export type StateNode<State extends string, Ctx extends object, Ev extends MachineEvent> = {
  entry?: LifecycleFn<Ctx, Ev>;
  exit?: LifecycleFn<Ctx, Ev>;
  /** Initial substate for compound states. */
  initial?: string;
  invoke?: Array<InvokeDef<Ctx, Ev>>;
  on?: Partial<{ [Type in EventType<Ev>]: TransitionInput<State, Ctx, Ev, Type> }>;
  /** Nested substates — makes this a compound state. */
  states?: Record<string, StateNode<string, Ctx, Ev>>;
};

// ── Machine config ───────────────────────────────────────────────────────────

export type ContextValidator<Ctx extends object> = (context: Ctx) => boolean;

type ContextField<Ctx extends object> = Record<string, never> extends Ctx ? { context?: Ctx } : { context: Ctx };

export type MachineConfig<State extends string, Ctx extends object, Ev extends MachineEvent> = ContextField<Ctx> & {
  initial: State;
  states: { [S in State]: StateNode<State, Ctx, Ev> };
  validateContext?: ContextValidator<Ctx>;
};

// ── Snapshots & persistence ──────────────────────────────────────────────────

export type MachineSnapshot<State extends string, Ctx extends object> = {
  readonly context: Readonly<Ctx>;
  readonly state: State;
};

export type PersistenceAdapter<State extends string, Ctx extends object> = {
  clear?: () => void;
  load: () => MachineSnapshot<State, Ctx> | undefined;
  save: (snapshot: MachineSnapshot<State, Ctx>) => void;
};

// ── Debug (single discriminated union) ───────────────────────────────────────

export type DebugEvent<State extends string, Ctx extends object, Ev extends MachineEvent> =
  | { context: Readonly<Ctx>; event: Ev; from: State; passed: boolean; target: State; type: 'guard' }
  | { event: Ev; from: State; type: 'transition-skipped' }
  | { context: Readonly<Ctx>; event: Ev | LifecycleEvent; invokeId: number; state: State; type: 'invoke-start' }
  | {
      context: Readonly<Ctx>;
      event: Ev | LifecycleEvent;
      invokeId: number;
      result: unknown;
      state: State;
      type: 'invoke-done';
    }
  | {
      context: Readonly<Ctx>;
      error: unknown;
      event: Ev | LifecycleEvent;
      invokeId: number;
      state: State;
      type: 'invoke-error';
    }
  | { context: Readonly<Ctx>; event: Ev | LifecycleEvent; invokeId: number; state: State; type: 'invoke-abort' };

// ── Middleware (F3) ──────────────────────────────────────────────────────────

export type MiddlewareFn<State extends string, Ctx extends object, Ev extends MachineEvent> = (
  event: Ev,
  snapshot: { readonly context: Readonly<Ctx>; readonly state: State },
  next: () => boolean,
) => boolean;

// ── Tracing ──────────────────────────────────────────────────────────────────

export type TransitionTraceEntry<State extends string, Ev extends MachineEvent> = {
  readonly event: Ev;
  readonly from: State;
  readonly invokeId?: number;
  readonly timestamp: number;
  readonly to: State;
};

// ── Interpret options ────────────────────────────────────────────────────────

export type InterpretOptions<State extends string, Ctx extends object, Ev extends MachineEvent> = {
  /**
   * Custom clone function for context. Defaults to structuredClone.
   * Use `(ctx) => Object.assign({}, ctx)` for shallow contexts to improve performance.
   */
  clone?: <T>(value: T) => T;
  maxTransitionsPerFlush?: number;
  middleware?: Array<MiddlewareFn<State, Ctx, Ev>>;
  onDebug?: (event: DebugEvent<State, Ctx, Ev>) => void;
  /** Called after every successful transition. */
  onTransition?: (info: { event: Ev; from: State; to: State }) => void;
  persistence?: PersistenceAdapter<State, Ctx>;
  snapshot?: MachineSnapshot<State, Ctx>;
  traceLimit?: number;
  validateSnapshot?: ContextValidator<Ctx>;
};

// ── Instance ─────────────────────────────────────────────────────────────────

export interface MachineInstance<State extends string, Ctx extends object, Ev extends MachineEvent> {
  readonly context: ReadonlySignal<Ctx>;
  readonly state: ReadonlySignal<State>;
  /** Returns true if a valid transition exists for the given event in the current state. */
  can(event: Ev): boolean;
  /** Clears persisted state via the persistence adapter. Does NOT dispose the instance. */
  clearPersistence(): void;
  getSnapshot(): MachineSnapshot<State, Ctx>;
  getTrace(): readonly TransitionTraceEntry<State, Ev>[];
  /** Returns true if the machine is currently in one of the given states (prefix match for hierarchical). */
  matches(...states: string[]): boolean;
  send(event: Ev): boolean;
  /** Subscribe to state/context changes. Returns unsubscribe function. */
  subscribe(fn: (snapshot: MachineSnapshot<State, Ctx>) => void): () => void;
  [Symbol.dispose](): void;
}
