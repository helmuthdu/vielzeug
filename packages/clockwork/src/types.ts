import type { ReadonlySignal } from '@vielzeug/ripple';

// ── Events ───────────────────────────────────────────────────────────────────

export type MachineEvent = { type: string };

export type EventType<Ev extends MachineEvent> = Ev['type'] & string;

export type EventByType<Ev extends MachineEvent, Type extends EventType<Ev>> = Extract<Ev, { type: Type }>;

type InitEvent = { readonly type: '$init' };
type HydrateEvent = { readonly type: '$hydrate' };
export type AfterEvent = { readonly delay: number; readonly type: '$after' };

export type LifecycleEvent = AfterEvent | HydrateEvent | InitEvent;

// ── Actions & guards ─────────────────────────────────────────────────────────

export type ActionArgs<Ctx extends object, Ev extends MachineEvent = MachineEvent> = {
  context: Ctx;
  readonly event: Ev;
};

export type ActionFn<Ctx extends object, Ev extends MachineEvent = MachineEvent> = (args: ActionArgs<Ctx, Ev>) => void;

/** Convenience alias for action functions used in `after` delayed transitions. */
export type AfterActionFn<Ctx extends object> = ActionFn<Ctx, AfterEvent>;

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
  target: NoInfer<State>;
};

/** @internal Single transition or array of conditional alternatives. */
type TransitionInput<
  State extends string,
  Ctx extends object,
  Ev extends MachineEvent,
  Type extends EventType<Ev> = EventType<Ev>,
> = Array<TransitionDef<State, Ctx, Ev, Type>> | TransitionDef<State, Ctx, Ev, Type>;

// ── After (delayed transitions — F4) ────────────────────────────────────────

export type AfterDef<State extends string, Ctx extends object> = {
  actions?: Array<AfterActionFn<Ctx>>;
  delay: number;
  /** Guard evaluated at timer fire time. Receives only `context` — the `$after` event carries no user-relevant payload beyond `delay`. */
  guard?: (args: { readonly context: Readonly<Ctx> }) => boolean;
  target: NoInfer<State>;
};

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
  after?: Array<AfterDef<State, Ctx>>;
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
  initial: NoInfer<State>;
  states: Record<State, StateNode<NoInfer<State>, Ctx, Ev>>;
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

// ── Debug (discriminated union) ──────────────────────────────────────────────

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

// ── Middleware ────────────────────────────────────────────────────────────────

export type MiddlewareFn<State extends string, Ctx extends object, Ev extends MachineEvent> = (
  event: Ev,
  snapshot: { readonly context: Readonly<Ctx>; readonly state: State },
  next: () => boolean,
) => boolean;

// ── Tracing ──────────────────────────────────────────────────────────────────

export type TransitionTraceEntry<State extends string, Ev extends MachineEvent> = {
  readonly event: Ev | LifecycleEvent;
  readonly from: State;
  readonly timestamp: number;
  readonly to: State;
};

// ── Interpret options ────────────────────────────────────────────────────────

export type DebugOptions<State extends string, Ctx extends object, Ev extends MachineEvent> = {
  onDebug?: (event: DebugEvent<State, Ctx, Ev>) => void;
  onTransition?: (info: { event: Ev | LifecycleEvent; from: State; to: State }) => void;
  traceLimit?: number;
};

export type InterpretOptions<State extends string, Ctx extends object, Ev extends MachineEvent> = {
  /** Custom deep-clone function. Must return a structurally equivalent object with a safe prototype. Using a function that returns poisoned prototypes (e.g. via `Object.create(null)`) is the caller's responsibility. Defaults to `structuredClone`. */
  clone?: <T>(value: T) => T;
  debug?: DebugOptions<State, Ctx, Ev>;
  maxTransitionsPerFlush?: number;
  middleware?: Array<MiddlewareFn<State, Ctx, Ev>>;
  persistence?: PersistenceAdapter<State, Ctx>;
  snapshot?: MachineSnapshot<State, Ctx>;
};

// ── Instance ─────────────────────────────────────────────────────────────────

export interface MachineInstance<State extends string, Ctx extends object, Ev extends MachineEvent> {
  readonly context: ReadonlySignal<Ctx>;
  /** Fires when the machine is disposed. Use to tie external lifecycles to the machine's lifetime. */
  readonly disposalSignal: AbortSignal;
  /** Whether the machine has been permanently disposed. */
  readonly disposed: boolean;
  readonly state: ReadonlySignal<State>;
  can(event: Ev): boolean;
  /** Terminates the machine: aborts all active invokes, clears timers, and disposes internal signals. Idempotent. */
  dispose(): void;
  getSnapshot(): MachineSnapshot<State, Ctx>;
  getTrace(): readonly TransitionTraceEntry<State, Ev>[];
  matches(...states: string[]): boolean;
  /** Dispatches the event. Returns `true` if a transition occurred. Returns `false` if disposed, no transition matched, or the call was re-entrant (event queued for later). */
  send(event: Ev): boolean;
  subscribe(fn: (snapshot: MachineSnapshot<State, Ctx>) => void): () => void;
  [Symbol.dispose](): void;
}
