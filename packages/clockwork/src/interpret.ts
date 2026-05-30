import { batch, readonly, signal } from '@vielzeug/ripple';

import type {
  ContextValidator,
  DebugHooks,
  EventByType,
  EventType,
  InterpretOptions,
  MachineDefinition,
  MachineEvent,
  MachineInstance,
  MachineSnapshot,
  TransitionDef,
  TransitionTraceEntry,
} from './types.js';

import { MachineError } from './errors.js';
import { assertContext, normalizeTransitions } from './internal.js';

// ── Internal constants ────────────────────────────────────────────────────────

const INIT_EVENT = { type: '$init' } as const;
const HYDRATE_EVENT = { type: '$hydrate' } as const;

// ── Pure resolver ─────────────────────────────────────────────────────────────

/**
 * Resolves which transition (if any) should be taken for a given state and event.
 * Pure function — no side effects. Useful for testing transition logic independently.
 * @example
 * const result = resolveTransition(machine, { state: 'idle', context: { ok: true }, event: { type: 'GO' } });
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
): TransitionDef<State, Ctx, Ev> | undefined => {
  const { context, debug, event, state } = input;
  const raw = definition.states[state].on?.[event.type as EventType<Ev>];

  if (!raw) return undefined;

  const defs = normalizeTransitions(raw as Array<TransitionDef<State, Ctx, Ev>> | TransitionDef<State, Ctx, Ev>);

  for (const def of defs) {
    const passed = !def.guard || def.guard({ context: context as Ctx, event: event as EventByType<Ev, EventType<Ev>> });

    debug?.onEvaluateGuard?.({ context, event, from: state, passed, target: def.target });

    if (passed) return def as TransitionDef<State, Ctx, Ev>;
  }

  return undefined;
};

// ── Interpreter ───────────────────────────────────────────────────────────────

/**
 * Creates a live machine instance from a definition.
 * Handles state reactivity, event dispatch, async invokes, persistence, and tracing.
 * @example
 * const m = interpret(definition, { traceLimit: 100 });
 * m.send({ type: 'GO' });
 * console.log(m.state.value);
 */
export const interpret = <State extends string, Ctx extends object, Ev extends MachineEvent>(
  definition: MachineDefinition<State, Ctx, Ev>,
  options: InterpretOptions<State, Ctx, Ev> = {},
): MachineInstance<State, Ctx, Ev> => {
  const traceLimit = options.traceLimit ?? 0;

  if (options.maxTransitionsPerFlush !== undefined && options.maxTransitionsPerFlush < 1) {
    throw new MachineError(
      'MACHINE_INVALID_MAX_TRANSITIONS_PER_FLUSH',
      '[machine] maxTransitionsPerFlush must be greater than 0',
      { maxTransitionsPerFlush: options.maxTransitionsPerFlush },
    );
  }

  const maxTransitionsPerFlush = options.maxTransitionsPerFlush ?? 1_000;
  const clone = options.clone ?? structuredClone;
  const persistedSnapshot = options.snapshot ?? options.persistence?.load?.();

  if (persistedSnapshot && !(persistedSnapshot.state in definition.states)) {
    throw new MachineError(
      'MACHINE_INVALID_SNAPSHOT_STATE',
      `[machine] snapshot state "${persistedSnapshot.state}" not found in states`,
      { state: persistedSnapshot.state },
    );
  }

  const validator: ContextValidator<Ctx> | undefined = options.validateSnapshot ?? definition.validateContext;

  const initialContext = persistedSnapshot
    ? clone(persistedSnapshot.context)
    : clone((definition.context ?? ({} as Ctx)) as Ctx);

  assertContext(validator, initialContext, persistedSnapshot ? 'hydrate' : 'init');

  const state_ = signal(persistedSnapshot ? persistedSnapshot.state : definition.initial);
  const context_ = signal(initialContext);

  // Ring buffer for traces — O(1) insertions. Null when tracing is disabled.
  const traceBuffer: TransitionTraceEntry<State, Ev>[] | null = traceLimit > 0 ? new Array(traceLimit) : null;
  let traceHead = 0;
  let traceCount = 0;

  let disposed = false;
  let draining = false;
  let invokeCounter = 0;

  const activeInvokes = new Set<{
    controller: AbortController;
    event: Ev | typeof INIT_EVENT | typeof HYDRATE_EVENT;
    id: number;
    state: State;
  }>();

  const pushTrace = (entry: TransitionTraceEntry<State, Ev>): void => {
    if (traceBuffer === null) return;

    traceBuffer[traceHead] = entry;
    traceHead = (traceHead + 1) % traceLimit;

    if (traceCount < traceLimit) traceCount++;
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

  const runInvokes = (triggerEvent: Ev | typeof INIT_EVENT | typeof HYDRATE_EVENT): void => {
    const node = definition.states[state_.value];

    if (!node.invoke?.length) return;

    for (const invoke of node.invoke) {
      const controller = new AbortController();
      const invokeId = ++invokeCounter;
      const invokeInfo = { controller, event: triggerEvent, id: invokeId, state: state_.value };

      activeInvokes.add(invokeInfo);
      options.debug?.onInvokeStart?.({ context: context_.value, event: triggerEvent, invokeId, state: state_.value });

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

          if (!draining) drainQueue();
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

          if (!draining) drainQueue();
        });
    }
  };

  const processEvent = (item: QueueItem): boolean => {
    if (disposed) return false;

    const from = state_.value;
    const transition = resolveTransition(definition, {
      context: context_.value,
      debug: options.debug,
      event: item.event,
      state: from,
    });

    if (!transition) {
      options.debug?.onTransitionSkipped?.({ event: item.event, from });

      return false;
    }

    const currentNode = definition.states[from];
    const targetNode = definition.states[transition.target];

    // Exit, actions, and entry all operate on `draft` — the live context_ signal is
    // still the pre-transition value at this point. The commit happens atomically below.
    // Validating here, before batch, guarantees the machine is unchanged if assertContext throws.
    const draft = clone(context_.value);

    currentNode.exit?.({ context: draft, event: item.event });
    transition.actions?.forEach((fn) => fn({ context: draft, event: item.event as EventByType<Ev, EventType<Ev>> }));
    targetNode.entry?.({ context: draft });
    assertContext(validator, draft, 'transition');

    // All validations passed — commit atomically and stop current invokes.
    batch(() => {
      stopInvokes();
      state_.value = transition.target;
      context_.value = draft;
    });

    options.onTransition?.({ event: item.event, from, to: transition.target });
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

        processed++;

        // processed is incremented before this check: throwing when processed > limit
        // means exactly `limit` transitions complete before the guard fires.
        if (processed > maxTransitionsPerFlush) {
          throw new MachineError(
            'MACHINE_TRANSITION_LOOP_GUARD',
            '[machine] transition queue exceeded maxTransitionsPerFlush',
            { maxTransitionsPerFlush },
          );
        }

        const result = processEvent(item);

        if (item.resultBox) item.resultBox.result = result;
      }
    } finally {
      draining = false;
    }
  };

  const can = (event: Ev): boolean => {
    if (disposed) return false;

    // No debug hooks — can() is a pure read probe, not a dispatch.
    return !!resolveTransition(definition, {
      context: context_.value,
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

  const getTrace = (): readonly TransitionTraceEntry<State, Ev>[] => {
    if (traceBuffer === null || traceCount === 0) return [];

    // Buffer not yet full — entries are at indices [0, traceCount)
    if (traceCount < traceLimit) {
      return traceBuffer.slice(0, traceCount);
    }

    // Buffer is full — traceHead points to the oldest entry
    return [...traceBuffer.slice(traceHead), ...traceBuffer.slice(0, traceHead)];
  };

  const matches = (...states: State[]): boolean => !disposed && states.includes(state_.value);

  const clearPersistence = (): void => {
    options.persistence?.clear?.();
  };

  // ── Initialization ────────────────────────────────────────────────────────

  if (persistedSnapshot) {
    runInvokes(HYDRATE_EVENT);
    saveSnapshot();
  } else {
    const initNode = definition.states[definition.initial];

    if (initNode.entry) {
      const initDraft = clone(context_.value);

      initNode.entry({ context: initDraft });
      assertContext(validator, initDraft, 'init');
      context_.value = initDraft;
    }

    runInvokes(INIT_EVENT);
    saveSnapshot();
  }

  return {
    can,
    clearPersistence,
    context: readonly(context_),
    getSnapshot,
    getTrace,
    matches,
    send,
    state: readonly(state_),
    [Symbol.dispose]: () => {
      disposed = true;
      stopInvokes();
      // Do NOT call persistence.clear() — disposal should release resources, not delete data.
      // Use clearPersistence() explicitly if you want to clear stored state.
      state_.dispose();
      context_.dispose();
    },
  };
};
