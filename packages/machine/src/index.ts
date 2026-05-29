import type { ReadonlySignal, Signal } from '@vielzeug/ripple';

import { batch, readonly, signal } from '@vielzeug/ripple';

// ── Public types ─────────────────────────────────────────────────────────────

export type MachineEvent = { [key: string]: unknown; type: string };

export type EventType<Ev extends MachineEvent> = Ev['type'] & string;

export type EventByType<Ev extends MachineEvent, Type extends EventType<Ev>> = Extract<Ev, { type: Type }>;

type InitEvent = { readonly type: '$init' };
type HydrateEvent = { readonly type: '$hydrate' };

export type LifecycleEvent = InitEvent | HydrateEvent;

export type ActionArgs<Ctx extends object, Ev extends MachineEvent = MachineEvent> = {
  context: Ctx;
  readonly event: Ev;
};

export type ActionFn<Ctx extends object, Ev extends MachineEvent = MachineEvent> = (args: ActionArgs<Ctx, Ev>) => void;

export type GuardFn<Ctx extends object, Ev extends MachineEvent = MachineEvent> = (
  args: ActionArgs<Ctx, Ev>,
) => boolean;

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

export type StateNode<State extends string, Ctx extends object, Ev extends MachineEvent> = {
  entry?: ActionFn<Ctx, Ev | LifecycleEvent>;
  exit?: ActionFn<Ctx, Ev>;
  invoke?: Array<InvokeDef<Ctx, Ev>>;
  on?: Partial<{ [Type in EventType<Ev>]: Array<TransitionDef<State, Ctx, Ev, Type>> }>;
};

export type ContextValidator<Ctx extends object> = (context: unknown) => context is Ctx;

export type MachineConfig<State extends string, Ctx extends object, Ev extends MachineEvent> = {
  context?: Ctx;
  initial: State;
  onTransition?: (info: { event: Ev; from: State; to: State }) => void;
  states: { [S in State]: StateNode<State, Ctx, Ev> };
  validateContext?: ContextValidator<Ctx>;
};

export type MachineDefinition<State extends string, Ctx extends object, Ev extends MachineEvent> = Readonly<
  MachineConfig<State, Ctx, Ev>
>;

export type MachineSnapshot<State extends string, Ctx extends object> = {
  readonly context: Readonly<Ctx>;
  readonly state: State;
};

export type PersistenceAdapter<State extends string, Ctx extends object> = {
  clear?: () => void;
  load?: () => MachineSnapshot<State, Ctx> | undefined;
  save?: (snapshot: MachineSnapshot<State, Ctx>) => void;
};

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
  readonly reason: 'guard_failed' | 'no_transition';
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

export type TransitionTraceEntry<State extends string, Ev extends MachineEvent> = {
  readonly event: Ev;
  readonly from: State;
  readonly invokeId?: number;
  readonly timestamp: number;
  readonly to: State;
};

export type InterpretOptions<State extends string, Ctx extends object, Ev extends MachineEvent> = {
  debug?: DebugHooks<State, Ctx, Ev>;
  maxTransitionsPerFlush?: number;
  persistence?: PersistenceAdapter<State, Ctx>;
  snapshot?: MachineSnapshot<State, Ctx>;
  traceLimit?: number;
  validateSnapshot?: ContextValidator<Ctx>;
};

export interface MachineInstance<State extends string, Ctx extends object, Ev extends MachineEvent> {
  readonly context: ReadonlySignal<Ctx>;
  readonly state: ReadonlySignal<State>;
  can(event: Ev): boolean;
  getSnapshot(): MachineSnapshot<State, Ctx>;
  getTrace(): readonly TransitionTraceEntry<State, Ev>[];
  send(event: Ev): boolean;
  [Symbol.dispose](): void;
}

export type TransitionResolution<State extends string, Ctx extends object, Ev extends MachineEvent> = {
  readonly transition: TransitionDef<State, Ctx, Ev>;
};

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

export class MachinitError extends Error {
  readonly code: MachinitErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(code: MachinitErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = 'MachinitError';
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const INIT_EVENT: InitEvent = { type: '$init' };
const HYDRATE_EVENT: HydrateEvent = { type: '$hydrate' };

/**
 * Deep clones values using structuredClone.
 * Handles nested objects, typed arrays, Maps, Sets, and cyclic references.
 * Used for context snapshots to prevent external mutations from corrupting the machine state.
 * Note: Does not support functions or DOM elements—only structured data.
 */
const clone = <T>(value: T): T => structuredClone(value);

const freezeDefinition = <State extends string, Ctx extends object, Ev extends MachineEvent>(
  config: MachineConfig<State, Ctx, Ev>,
): MachineDefinition<State, Ctx, Ev> => Object.freeze(config);

const assertContext = <Ctx extends object>(
  validator: ContextValidator<Ctx> | undefined,
  context: unknown,
  phase: 'hydrate' | 'init' | 'transition',
): void => {
  if (!validator) return;

  if (!validator(context)) {
    throw new MachinitError(
      'MACHINIT_INVALID_VALIDATE_CONTEXT',
      `[machine] context failed validation during ${phase}`,
      {
        phase,
      },
    );
  }
};

const validateHandler = (value: unknown, name: string, details: Record<string, unknown>): void => {
  if (value === undefined) return;

  if (typeof value !== 'function') {
    throw new MachinitError('MACHINIT_INVALID_TYPE_HANDLER', `[machine] ${name} must be a function`, details);
  }
};

const validateDefinition = <State extends string, Ctx extends object, Ev extends MachineEvent>(
  definition: MachineDefinition<State, Ctx, Ev>,
): void => {
  const { states } = definition;

  if (!(definition.initial in states)) {
    throw new MachinitError(
      'MACHINIT_INVALID_INITIAL_STATE',
      `[machine] initial state "${definition.initial}" not found in states`,
      { initial: definition.initial },
    );
  }

  for (const [stateName, node] of Object.entries(states) as Array<[string, StateNode<State, Ctx, Ev>]>) {
    validateHandler(node.entry, 'state.entry', { stateName });
    validateHandler(node.exit, 'state.exit', { stateName });

    if (node.invoke) {
      for (const [index, invoke] of node.invoke.entries()) {
        validateHandler(invoke.src, 'invoke.src', { index, stateName });
        validateHandler(invoke.onDone, 'invoke.onDone', { index, stateName });
        validateHandler(invoke.onError, 'invoke.onError', { index, stateName });
      }
    }

    for (const [eventType, defs] of Object.entries(node.on ?? {})) {
      if (!Array.isArray(defs) || defs.length === 0) {
        throw new MachinitError(
          'MACHINIT_INVALID_TRANSITION_ARRAY',
          `[machine] state "${stateName}" event "${eventType}" must be a non-empty transition array`,
          { eventType, stateName },
        );
      }

      for (const [index, tr] of defs.entries()) {
        if (!tr || typeof tr !== 'object') {
          throw new MachinitError(
            'MACHINIT_INVALID_TRANSITION',
            `[machine] state "${stateName}" event "${eventType}" transition #${index} must be an object`,
            { eventType, index, stateName },
          );
        }

        if (typeof tr.target !== 'string') {
          throw new MachinitError(
            'MACHINIT_INVALID_TYPE_IN_TRANSITION',
            `[machine] state "${stateName}" event "${eventType}" transition #${index} target must be a string`,
            { eventType, index, stateName },
          );
        }

        if (!(tr.target in states)) {
          throw new MachinitError(
            'MACHINIT_UNKNOWN_TARGET',
            `[machine] state "${stateName}" event "${eventType}" targets unknown state "${tr.target}"`,
            { eventType, stateName, target: tr.target },
          );
        }

        validateHandler(tr.guard, 'transition.guard', { eventType, index, stateName });

        if (tr.actions) {
          if (!Array.isArray(tr.actions)) {
            throw new MachinitError(
              'MACHINIT_INVALID_TRANSITION_HANDLER',
              `[machine] transition.actions must be an array`,
              { eventType, index, stateName },
            );
          }

          for (const [actionIndex, action] of tr.actions.entries()) {
            if (typeof action !== 'function') {
              throw new MachinitError(
                'MACHINIT_INVALID_TRANSITION_HANDLER',
                `[machine] transition action #${actionIndex} must be a function`,
                { actionIndex, eventType, index, stateName },
              );
            }
          }
        }
      }
    }
  }
};

// ── Builder helpers ──────────────────────────────────────────────────────────

/**
 * Creates an action that merges partial context updates.
 * @example
 * assign(({ context, event }) => ({ count: context.count + 1 }))
 */
/**
 * Creates an action that merges partial context updates.
 * @example
 * assign(({ context, event }) => ({ count: context.count + 1 }))
 */
export const assign =
  <Ctx extends object, Ev extends MachineEvent = MachineEvent>(
    fn: (args: ActionArgs<Ctx, Ev>) => Partial<Ctx>,
  ): ActionFn<Ctx, Ev> =>
  (args) => {
    Object.assign(args.context, fn(args));
  };

// ── Definition/runtime split ─────────────────────────────────────────────────

/**
 * Defines a state machine configuration with full validation and type inference.
 * Returns a frozen, immutable definition ready for interpretation.
 * @example
 * const machine = defineMachine({
 *   initial: 'idle',
 *   states: { idle: { on: { GO: [{ target: 'active' }] } }, active: {} },
 * });
 */
export const defineMachine = <State extends string, Ctx extends object, Ev extends MachineEvent>(
  config: MachineConfig<State, Ctx, Ev>,
): MachineDefinition<State, Ctx, Ev> => {
  validateDefinition(config);

  return freezeDefinition(config);
};

/**
 * Resolves which transition (if any) should be taken for a given state and event.
 * Pure function—no side effects. Useful for testing transition logic independently.
 * @example
 * const result = resolveTransition(machine, {
 *   state: 'idle',
 *   context: { allowed: true },
 *   event: { type: 'GO' },
 * });
 * if (result) console.log('Transition to:', result.transition.target);
 */
/**
 * Resolves which transition (if any) should be taken for a given state and event.
 * Pure function—no side effects. Useful for testing transition logic independently.
 * @example
 * const result = resolveTransition(machine, {
 *   state: 'idle',
 *   context: { allowed: true },
 *   event: { type: 'GO' },
 * });
 * if (result) console.log('Transition to:', result.transition.target);
 */
export const resolveTransition = <State extends string, Ctx extends object, Ev extends MachineEvent>(
  definition: MachineDefinition<State, Ctx, Ev>,
  input: {
    context: Readonly<Ctx>;
    debug?: DebugHooks<State, Ctx, Ev>;
    event: NoInfer<Ev>;
    state: State;
  },
): TransitionResolution<State, Ctx, Ev> | undefined => {
  const { context, debug, event, state } = input;
  const defs = definition.states[state].on?.[event.type as EventType<Ev>];

  if (!defs?.length) return undefined;

  for (const def of defs) {
    const passed = !def.guard || def.guard({ context: context as Ctx, event: event as EventByType<Ev, EventType<Ev>> });

    debug?.onEvaluateGuard?.({ context, event, from: state, passed, target: def.target });

    if (passed) return { transition: def as TransitionDef<State, Ctx, Ev> };
  }

  return undefined;
};

/**
 * Creates a live machine instance from a definition.
 * Handles state reactivity, event dispatch, async invokes, persistence, and tracing.
 *
 * Note: Assumes definition was created via `defineMachine()` and is not manually constructed.
 * Type safety relies on definitions being frozen immutables from `defineMachine()`.
 * @example
 * const machine = interpret(definition, { traceLimit: 100, maxTransitionsPerFlush: 1000 });
 * machine.send({ type: 'GO' });
 * console.log(machine.state.value); // new state
 */
export const interpret = <State extends string, Ctx extends object, Ev extends MachineEvent>(
  definition: MachineDefinition<State, Ctx, Ev>,
  options: InterpretOptions<State, Ctx, Ev> = {},
): MachineInstance<State, Ctx, Ev> => {
  const traceLimit = options.traceLimit ?? 0;

  if (options.maxTransitionsPerFlush !== undefined && options.maxTransitionsPerFlush < 1) {
    throw new MachinitError(
      'MACHINIT_INVALID_MAX_TRANSITIONS_PER_FLUSH',
      '[machine] maxTransitionsPerFlush must be greater than 0',
      { maxTransitionsPerFlush: options.maxTransitionsPerFlush },
    );
  }

  const maxTransitionsPerFlush = options.maxTransitionsPerFlush ?? 1_000;
  const persistedSnapshot = options.snapshot ?? options.persistence?.load?.();

  if (persistedSnapshot && !(persistedSnapshot.state in definition.states)) {
    throw new MachinitError(
      'MACHINIT_INVALID_SNAPSHOT_STATE',
      `[machine] snapshot state "${persistedSnapshot.state}" not found in states`,
      { state: persistedSnapshot.state },
    );
  }

  const validator = options.validateSnapshot ?? definition.validateContext;

  const initialContext = persistedSnapshot
    ? clone(persistedSnapshot.context)
    : clone((definition.context ?? ({} as Ctx)) as Ctx);

  assertContext(validator, initialContext, persistedSnapshot ? 'hydrate' : 'init');

  const state_: Signal<State> = signal(persistedSnapshot ? persistedSnapshot.state : definition.initial);
  const context_: Signal<Ctx> = signal(initialContext);
  // Lazy-allocate trace buffer only when tracing is enabled (traceLimit > 0).
  // When disabled (default), traces remain null to reduce memory overhead per instance.
  const traces: TransitionTraceEntry<State, Ev>[] | null = traceLimit > 0 ? [] : null;
  let disposed = false;
  let draining = false;
  let invokeCounter = 0;

  const activeInvokes = new Set<{
    controller: AbortController;
    event: Ev | LifecycleEvent;
    id: number;
    state: State;
  }>();

  const pushTrace = (entry: TransitionTraceEntry<State, Ev>): void => {
    // Skip if tracing is disabled (traces remains null)
    if (traces === null) return;

    traces.push(entry);

    // Maintain circular buffer by removing oldest entries when limit exceeded
    if (traces.length > traceLimit) {
      traces.splice(0, traces.length - traceLimit);
    }
  };

  type QueueItem = {
    event: Ev;
    invokeId?: number;
    resultBox?: { result: boolean };
  };

  const queue: QueueItem[] = [];

  const stopInvokes = (): void => {
    for (const invoke of activeInvokes) {
      invoke.controller.abort();
      options.debug?.onInvokeAbort?.({
        context: context_.value,
        event: invoke.event,
        invokeId: invoke.id,
        state: invoke.state,
      });
    }

    activeInvokes.clear();
  };

  const saveSnapshot = (): void => {
    options.persistence?.save?.({ context: clone(context_.value), state: state_.value });
  };

  const runInvokes = (triggerEvent: Ev | LifecycleEvent): void => {
    const node = definition.states[state_.value];

    if (!node.invoke?.length) return;

    for (const invoke of node.invoke) {
      const controller = new AbortController();
      const invokeId = ++invokeCounter;
      const invokeInfo = { controller, event: triggerEvent, id: invokeId, state: state_.value };

      activeInvokes.add(invokeInfo);
      options.debug?.onInvokeStart?.({
        context: context_.value,
        event: triggerEvent,
        invokeId,
        state: state_.value,
      });

      void invoke
        .src({ context: context_.value, event: triggerEvent, signal: controller.signal })
        .then((result) => {
          activeInvokes.delete(invokeInfo);

          if (disposed || controller.signal.aborted || !invoke.onDone) return;

          options.debug?.onInvokeDone?.({
            context: context_.value,
            event: triggerEvent,
            invokeId,
            result,
            state: state_.value,
          });

          queue.push({ event: invoke.onDone(result, { context: context_.value, event: triggerEvent }), invokeId });

          if (!draining) {
            drainQueue();
          }
        })
        .catch((error: unknown) => {
          activeInvokes.delete(invokeInfo);

          if (disposed || controller.signal.aborted || !invoke.onError) return;

          options.debug?.onInvokeError?.({
            context: context_.value,
            error,
            event: triggerEvent,
            invokeId,
            state: state_.value,
          });

          queue.push({ event: invoke.onError(error, { context: context_.value, event: triggerEvent }), invokeId });

          if (!draining) {
            drainQueue();
          }
        });
    }
  };

  const processEvent = (item: QueueItem): boolean => {
    if (disposed) return false;

    const from = state_.value;
    const resolution = resolveTransition(definition, {
      context: context_.value,
      debug: options.debug,
      event: item.event,
      state: from,
    });

    if (!resolution) {
      options.debug?.onTransitionSkipped?.({ event: item.event, from, reason: 'no_transition' });

      return false;
    }

    const transition = resolution.transition;
    const draft = clone(context_.value);

    const currentNode = definition.states[from];
    const targetNode = definition.states[transition.target];

    batch(() => {
      stopInvokes();
      currentNode.exit?.({ context: draft, event: item.event });
      transition.actions?.forEach((fn) => fn({ context: draft, event: item.event as EventByType<Ev, EventType<Ev>> }));
      targetNode.entry?.({ context: draft, event: item.event });
      assertContext(validator, draft, 'transition');
      state_.value = transition.target;
      context_.value = draft;
    });

    definition.onTransition?.({ event: item.event, from, to: transition.target });
    pushTrace({ event: item.event, from, invokeId: item.invokeId, timestamp: Date.now(), to: transition.target });
    saveSnapshot();
    runInvokes(item.event);

    return true;
  };

  const drainQueue = (): void => {
    if (draining) return;

    draining = true;

    let processed = 0;

    try {
      while (queue.length > 0) {
        const item = queue.shift()!;

        processed += 1;

        if (processed > maxTransitionsPerFlush) {
          throw new MachinitError(
            'MACHINIT_TRANSITION_LOOP_GUARD',
            '[machine] transition queue exceeded maxTransitionsPerFlush',
            { maxTransitionsPerFlush },
          );
        }

        const result = processEvent(item);

        if (item.resultBox) {
          item.resultBox.result = result;
        }
      }
    } finally {
      draining = false;
    }
  };

  const can = (event: Ev): boolean => {
    if (disposed) return false;

    return !!resolveTransition(definition, {
      context: context_.value,
      debug: options.debug,
      event,
      state: state_.value,
    });
  };

  const send = (event: Ev): boolean => {
    if (disposed) return false;

    const resultBox = { result: false };

    queue.push({ event, resultBox });
    drainQueue();

    return resultBox.result;
  };

  const getSnapshot = (): MachineSnapshot<State, Ctx> => ({
    context: clone(context_.value),
    state: state_.value,
  });

  const getTrace = (): readonly TransitionTraceEntry<State, Ev>[] => (traces !== null ? traces.slice() : []);

  if (persistedSnapshot) {
    runInvokes(HYDRATE_EVENT);
    saveSnapshot();
  } else {
    const initNode = definition.states[definition.initial];

    if (initNode.entry) {
      const initDraft = clone(context_.value);

      initNode.entry({ context: initDraft, event: INIT_EVENT });
      assertContext(validator, initDraft, 'init');
      context_.value = initDraft;
    }

    runInvokes(INIT_EVENT);
    saveSnapshot();
  }

  return {
    can,
    context: readonly(context_),
    getSnapshot,
    getTrace,
    send,
    state: readonly(state_),
    [Symbol.dispose]: () => {
      disposed = true;
      stopInvokes();
      options.persistence?.clear?.();
      state_.dispose();
      context_.dispose();
    },
  };
};
