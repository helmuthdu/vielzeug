import type { ReadonlySignal } from '@vielzeug/ripple';

// ── Events ───────────────────────────────────────────────────────────────────

export type MachineEvent = { [key: string]: unknown; type: string };

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

/** User-facing transition input: a single transition object or an array of alternatives. */
export type TransitionInput<
  State extends string,
  Ctx extends object,
  Ev extends MachineEvent,
  Type extends EventType<Ev> = EventType<Ev>,
> = Array<TransitionDef<State, Ctx, Ev, Type>> | TransitionDef<State, Ctx, Ev, Type>;

// ── Invokes ──────────────────────────────────────────────────────────────────

export type InvokeSourceArgs<Ctx extends object, Ev extends MachineEvent> = {
  readonly context: Readonly<Ctx>;
  readonly event: Ev | LifecycleEvent;
  readonly signal: AbortSignal;
};

export type InvokeDispatchArgs<Ctx extends object, Ev extends MachineEvent> = {
  readonly context: Readonly<Ctx>;
  readonly event: Ev | LifecycleEvent;
};

export type InvokeDef<Ctx extends object, Ev extends MachineEvent> = {
  onDone?: (result: unknown, args: InvokeDispatchArgs<Ctx, Ev>) => Ev;
  onError?: (error: unknown, args: InvokeDispatchArgs<Ctx, Ev>) => Ev;
  src: (args: InvokeSourceArgs<Ctx, Ev>) => Promise<unknown>;
};

// ── State nodes ──────────────────────────────────────────────────────────────

export type EntryFn<Ctx extends object> = (args: { context: Ctx }) => void;

export type StateNode<State extends string, Ctx extends object, Ev extends MachineEvent> = {
  /** Called when entering this state. Receives only context — use transition actions if you need the event. */
  entry?: EntryFn<Ctx>;
  exit?: ActionFn<Ctx, Ev>;
  invoke?: Array<InvokeDef<Ctx, Ev>>;
  on?: Partial<{ [Type in EventType<Ev>]: TransitionInput<State, Ctx, Ev, Type> }>;
};

// ── Machine config & definition ──────────────────────────────────────────────

export type ContextValidator<Ctx extends object> = (context: unknown) => context is Ctx;

export type MachineConfig<State extends string, Ctx extends object, Ev extends MachineEvent> = {
  context?: Ctx;
  initial: State;
  states: { [S in State]: StateNode<State, Ctx, Ev> };
  validateContext?: ContextValidator<Ctx>;
};

export type MachineDefinition<State extends string, Ctx extends object, Ev extends MachineEvent> = Readonly<
  MachineConfig<State, Ctx, Ev>
>;

// ── Snapshots & persistence ──────────────────────────────────────────────────

export type MachineSnapshot<State extends string, Ctx extends object> = {
  readonly context: Readonly<Ctx>;
  readonly state: State;
};

export type PersistenceAdapter<State extends string, Ctx extends object> = {
  clear?: () => void;
  load?: () => MachineSnapshot<State, Ctx> | undefined;
  save?: (snapshot: MachineSnapshot<State, Ctx>) => void;
};

// ── Debug hooks ──────────────────────────────────────────────────────────────

export type GuardEvaluationInfo<State extends string, Ctx extends object, Ev extends MachineEvent> = {
  readonly context: Readonly<Ctx>;
  readonly event: Ev;
  readonly from: State;
  readonly passed: boolean;
  readonly target: State;
};

export type TransitionSkippedInfo<State extends string, Ev extends MachineEvent> = {
  readonly event: Ev;
  readonly from: State;
};

export type InvokeDebugInfo<State extends string, Ctx extends object, Ev extends MachineEvent> = {
  readonly context: Readonly<Ctx>;
  readonly event: Ev | LifecycleEvent;
  readonly invokeId: number;
  readonly state: State;
};

export type DebugHooks<State extends string, Ctx extends object, Ev extends MachineEvent> = {
  onEvaluateGuard?: (info: GuardEvaluationInfo<State, Ctx, Ev>) => void;
  onInvokeAbort?: (info: InvokeDebugInfo<State, Ctx, Ev>) => void;
  onInvokeDone?: (info: InvokeDebugInfo<State, Ctx, Ev> & { readonly result: unknown }) => void;
  onInvokeError?: (info: InvokeDebugInfo<State, Ctx, Ev> & { readonly error: unknown }) => void;
  onInvokeStart?: (info: InvokeDebugInfo<State, Ctx, Ev>) => void;
  onTransitionSkipped?: (info: TransitionSkippedInfo<State, Ev>) => void;
};

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
  debug?: DebugHooks<State, Ctx, Ev>;
  maxTransitionsPerFlush?: number;
  /** Called after every successful transition. Kept separate from the machine definition for reusability. */
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
  /** Returns true if the machine is currently in one of the given states. */
  matches(...states: State[]): boolean;
  send(event: Ev): boolean;
  [Symbol.dispose](): void;
}

// ── (no TransitionResolution wrapper — resolveTransition returns TransitionDef directly) ──
