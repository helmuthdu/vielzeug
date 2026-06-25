import type { Readable } from '@vielzeug/ripple';

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

/**
 * Pure predicate that decides whether a transition is taken.
 * Context is **readonly** — mutating it inside a guard corrupts live state and is never valid.
 */
export type GuardFn<Ctx extends object, Ev extends MachineEvent = MachineEvent> = (args: {
  readonly context: Readonly<Ctx>;
  readonly event: Readonly<Ev>;
}) => boolean;

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

/** Single transition or array of conditional alternatives (for the `on` map). */
export type TransitionInput<
  State extends string,
  Ctx extends object,
  Ev extends MachineEvent,
  Type extends EventType<Ev> = EventType<Ev>,
> = Array<TransitionDef<State, Ctx, Ev, Type>> | TransitionDef<State, Ctx, Ev, Type>;

// ── After (delayed transitions) ──────────────────────────────────────────────

export type AfterDef<State extends string, Ctx extends object> = {
  actions?: Array<AfterActionFn<Ctx>>;
  delay: number;
  /** Guard evaluated at timer fire time. Same signature as all other guards. */
  guard?: GuardFn<Ctx, AfterEvent>;
  target: NoInfer<State>;
};

// ── Invokes ──────────────────────────────────────────────────────────────────

export type InvokeArgs<Ctx extends object, Ev extends MachineEvent> = {
  readonly context: Readonly<Ctx>;
  readonly entryEvent: Ev | LifecycleEvent;
  readonly signal: AbortSignal;
};

export type InvokeDef<Ctx extends object, Ev extends MachineEvent, Result = unknown> = {
  /** Optional label surfaced in DebugEvent for traceability. Defaults to an auto-incremented id. */
  id?: string;
  onDone?: (result: Result, context: Readonly<Ctx>) => Ev;
  onError?: (error: unknown, context: Readonly<Ctx>) => Ev;
  src: (args: InvokeArgs<Ctx, Ev>) => Promise<Result>;
};

// ── State nodes ──────────────────────────────────────────────────────────────

export type StateNode<State extends string, Ctx extends object, Ev extends MachineEvent> = {
  after?: Array<AfterDef<State, Ctx>>;
  entry?: LifecycleFn<Ctx, Ev>;
  exit?: LifecycleFn<Ctx, Ev>;
  /** Initial substate for compound states. */
  initial?: string;
  invoke?: Array<InvokeDef<Ctx, Ev, any>>;
  on?: Partial<{ [Type in EventType<Ev>]: TransitionInput<State, Ctx, Ev, Type> }>;
  /** Nested substates — makes this a compound state. */
  states?: Record<string, StateNode<string, Ctx, Ev>>;
};

// ── Machine config ───────────────────────────────────────────────────────────

/**
 * Validates context during a transition or at init.
 * - Return `true` for valid context.
 * - Return a non-empty string describing the failure (surfaced in `ClockworkError.details.reason`).
 */
export type ContextValidator<Ctx extends object> = (context: Ctx) => string | true;

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
  load: () => MachineSnapshot<State, Ctx> | undefined;
  save: (snapshot: MachineSnapshot<State, Ctx>) => void;
};

// ── Debug (discriminated union) ──────────────────────────────────────────────

export type DebugEvent<State extends string, Ctx extends object, Ev extends MachineEvent> =
  | { context: Readonly<Ctx>; event: Ev; from: State; passed: boolean; target: State; type: 'guard' }
  | { event: Ev; from: State; type: 'transition-skipped' }
  | { event: Ev | LifecycleEvent; from: State; to: State; type: 'transition' }
  | { context: Readonly<Ctx>; event: Ev | LifecycleEvent; invokeId: string; state: State; type: 'invoke-start' }
  | {
      context: Readonly<Ctx>;
      event: Ev | LifecycleEvent;
      invokeId: string;
      result: unknown;
      state: State;
      type: 'invoke-done';
    }
  | {
      context: Readonly<Ctx>;
      error: unknown;
      event: Ev | LifecycleEvent;
      invokeId: string;
      state: State;
      type: 'invoke-error';
    }
  | { context: Readonly<Ctx>; event: Ev | LifecycleEvent; invokeId: string; state: State; type: 'invoke-abort' };

// ── Interceptors ──────────────────────────────────────────────────────────────

/**
 * Pure event interceptor. Return the event (possibly transformed) to allow it,
 * or `null` to block it. Runs in order; first `null` wins.
 */
export type InterceptorFn<State extends string, Ctx extends object, Ev extends MachineEvent> = (
  event: Ev,
  snapshot: { readonly context: Readonly<Ctx>; readonly state: State },
) => Ev | null;

// ── Tracing ──────────────────────────────────────────────────────────────────

export type TransitionTraceEntry<State extends string, Ev extends MachineEvent> = {
  readonly event: Ev | LifecycleEvent;
  readonly from: State;
  readonly timestamp: number;
  readonly to: State;
};

// ── Interpret options ────────────────────────────────────────────────────────

/**
 * Result of `send()`.
 * - `status` — `'transitioned'` | `'queued'` | `'rejected'`
 *
 * Use `result.status !== 'rejected'` to check for success,
 * and `result.status === 'queued'` to detect re-entrant sends inside actions.
 */
export type SendResult = {
  readonly status: 'queued' | 'rejected' | 'transitioned';
};

export type InterpretOptions<State extends string, Ctx extends object, Ev extends MachineEvent> = {
  /** Custom deep-clone function. Must return a structurally equivalent object with a safe prototype. Defaults to `structuredClone`. */
  clone?: <T>(value: T) => T;
  /** Array of pure interceptors. Each receives the event and current snapshot. Return the event (possibly transformed) to allow it, or `null` to block. Runs left-to-right; first `null` stops the chain. */
  interceptors?: Array<InterceptorFn<State, Ctx, Ev>>;
  /**
   * Maximum number of transitions processed in a single synchronous flush.
   * Defaults to `1_000`. Increase only if your machine has intentionally deep
   * guard-only transition chains; reaching this limit throws
   * `MACHINE_TRANSITION_LOOP_GUARD` to prevent infinite loops.
   */
  maxTransitionsPerFlush?: number;
  /** Callback for all debug events (guards, transitions, invokes, skips). Auto-enables a 50-entry trace buffer unless `traceLimit` is set. */
  onDebug?: (event: DebugEvent<State, Ctx, Ev>) => void;
  persistence?: PersistenceAdapter<State, Ctx>;
  snapshot?: MachineSnapshot<State, Ctx>;
  /**
   * Ring buffer capacity for `getTrace()`.
   * Defaults to `50` when `onDebug` is set; `0` (disabled) otherwise.
   * Set explicitly to override.
   */
  traceLimit?: number;
};

// ── Definition handle ─────────────────────────────────────────────────────────

export interface MachineDefinition<State extends string, Ctx extends object, Ev extends MachineEvent> {
  /**
   * Resolves the transition that would be taken for a given state, context, and event.
   * Pure — no side effects, no debug events.
   *
   * @param options.onGuard — called for every guard evaluation (passed and failed).
   */
  resolve(
    input: { context: Readonly<Ctx>; event: Ev; state: State },
    options?: {
      onGuard?: (info: { context: Readonly<Ctx>; event: Ev; from: State; passed: boolean; target: State }) => void;
    },
  ): TransitionDef<State, Ctx, Ev> | undefined;
  /** Creates a running machine instance from this definition. */
  start(options?: InterpretOptions<State, Ctx, Ev>): MachineInstance<State, Ctx, Ev>;
}

// ── Instance ─────────────────────────────────────────────────────────────────

export interface MachineInstance<State extends string, Ctx extends object, Ev extends MachineEvent> {
  readonly context: Readable<Ctx>;
  /** Fires when the machine is disposed. Use to tie external lifecycles to the machine's lifetime. */
  readonly disposalSignal: AbortSignal;
  /** Whether the machine has been permanently disposed. */
  readonly disposed: boolean;
  readonly state: Readable<State>;
  /**
   * Returns `true` if a valid transition exists for `event` in the current state.
   * Evaluates guards but fires no side effects or debug hooks.
   * Returns `false` when the machine is disposed.
   */
  can(event: Ev): boolean;
  /** Terminates the machine: aborts all active invokes, clears timers, and disposes internal signals. Idempotent. */
  dispose(): void;
  getSnapshot(): MachineSnapshot<State, Ctx>;
  getTrace(): readonly TransitionTraceEntry<State, Ev>[];
  /**
   * Returns `true` if the current state equals one of the given values or is a
   * descendant of any (e.g. `matches('loading')` matches `'loading.pending'`).
   * Returns `false` when the machine is disposed.
   */
  matches(...states: string[]): boolean;
  /**
   * Dispatches the event and returns a `SendResult`.
   * Check `.status` for `'transitioned'`, `'queued'`, or `'rejected'`.
   */
  send(event: Ev): SendResult;
  /**
   * Subscribes to state/context changes. Fires only when state or context
   * reference changes — **not** on the initial state. Returns an unsubscribe
   * function. Use `getSnapshot()` to read the current state immediately.
   */
  subscribe(fn: (snapshot: MachineSnapshot<State, Ctx>) => void): () => void;
  [Symbol.dispose](): void;
}

// ── Machine schema helpers ────────────────────────────────────────────────────

/**
 * Opaque schema bundle. Captures the three generics in a single type for
 * ergonomic machine typing.
 *
 * @example
 * ```ts
 * type Auth = MachineSchema<'idle' | 'loading', { user: User | null }, AuthEvent>;
 *
 * const guard: MachineGuard<Auth> = ({ context }) => !!context.user;
 * const action: MachineAction<Auth, { type: 'DONE'; user: User }> = ({ context, event }) => {
 *   context.user = event.user;
 * };
 * ```
 */
export type MachineSchema<S extends string, C extends object, E extends MachineEvent> = {
  readonly _c: C;
  readonly _e: E;
  readonly _s: S;
};

export type MachineTypeConfig<T extends MachineSchema<any, any, any>> = MachineConfig<T['_s'], T['_c'], T['_e']>;
export type MachineTypeDefinition<T extends MachineSchema<any, any, any>> = MachineDefinition<
  T['_s'],
  T['_c'],
  T['_e']
>;
export type MachineTypeInstance<T extends MachineSchema<any, any, any>> = MachineInstance<T['_s'], T['_c'], T['_e']>;
export type MachineTypeOptions<T extends MachineSchema<any, any, any>> = InterpretOptions<T['_s'], T['_c'], T['_e']>;
export type MachineAction<T extends MachineSchema<any, any, any>, E extends T['_e'] = T['_e']> = ActionFn<T['_c'], E>;
export type MachineGuard<T extends MachineSchema<any, any, any>, E extends T['_e'] = T['_e']> = GuardFn<T['_c'], E>;
