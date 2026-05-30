import { batch, effect, readonly, signal } from '@vielzeug/ripple';

import type {
  ContextValidator,
  EventByType,
  EventType,
  InterpretOptions,
  MachineConfig,
  MachineEvent,
  MachineInstance,
  MachineSnapshot,
  MiddlewareFn,
  StateNode,
  TransitionDef,
  TransitionTraceEntry,
} from './types.js';

import { getAncestorPaths, getNodeAtPath, resolveLeaf } from './definition.js';
import { MachineError } from './errors.js';

// ── Internal constants ────────────────────────────────────────────────────────

const INIT_EVENT = { type: '$init' } as const;
const HYDRATE_EVENT = { type: '$hydrate' } as const;

// ── Pure resolver ─────────────────────────────────────────────────────────────

/**
 * Resolves which transition (if any) should be taken for a given state and event.
 * Pure function — no side effects. Useful for testing transition logic independently.
 *
 * For hierarchical machines, walks up the state tree checking each ancestor for a handler.
 */
export const resolveTransition = <State extends string, Ctx extends object, Ev extends MachineEvent>(
  definition: Readonly<MachineConfig<State, Ctx, Ev>>,
  input: {
    context: Readonly<Ctx>;
    event: NoInfer<Ev>;
    state: State;
  },
): TransitionDef<State, Ctx, Ev> | undefined => {
  const { context, event, state } = input;
  const ancestors = getAncestorPaths(state);

  // Walk from deepest to shallowest — event bubbling
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const node = getNodeAtPath(definition.states, ancestors[i]) as StateNode<State, Ctx, Ev> | undefined;

    if (!node?.on) continue;

    const raw = node.on[event.type as EventType<Ev>];

    if (!raw) continue;

    const defs = Array.isArray(raw) ? raw : [raw];

    for (const def of defs) {
      if (!def.guard || def.guard({ context: context as Ctx, event: event as EventByType<Ev, EventType<Ev>> })) {
        return def as TransitionDef<State, Ctx, Ev>;
      }
    }
  }

  return undefined;
};

// ── Interpreter ───────────────────────────────────────────────────────────────

/**
 * Creates a live machine instance from a definition.
 * Handles state reactivity, event dispatch, async invokes, persistence, middleware, and tracing.
 */
export const interpret = <State extends string, Ctx extends object, Ev extends MachineEvent>(
  definition: Readonly<MachineConfig<State, Ctx, Ev>>,
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
  const debug = options.onDebug;
  const middlewares = options.middleware ?? [];
  const persistedSnapshot = options.snapshot ?? options.persistence?.load();

  if (persistedSnapshot && !(persistedSnapshot.state.split('.')[0] in definition.states)) {
    throw new MachineError(
      'MACHINE_INVALID_SNAPSHOT_STATE',
      `[machine] snapshot state "${persistedSnapshot.state}" not found in states`,
      { state: persistedSnapshot.state },
    );
  }

  const validator: ContextValidator<Ctx> | undefined = options.validateSnapshot ?? definition.validateContext;

  const assertContext = (context: Ctx, phase: 'hydrate' | 'init' | 'transition'): void => {
    if (!validator) return;

    if (!validator(context)) {
      throw new MachineError(
        'MACHINE_INVALID_VALIDATE_CONTEXT',
        `[machine] context failed validation during ${phase}`,
        { phase },
      );
    }
  };

  // Resolve initial state to leaf (for hierarchical machines)
  const resolvedInitial = persistedSnapshot
    ? persistedSnapshot.state
    : (resolveLeaf(definition.states, definition.initial) as State);

  const initialContext = persistedSnapshot
    ? clone(persistedSnapshot.context)
    : clone(('context' in definition ? definition.context : ({} as Ctx)) as Ctx);

  assertContext(initialContext, persistedSnapshot ? 'hydrate' : 'init');

  const state_ = signal(resolvedInitial);
  const context_ = signal(initialContext);

  // Ring buffer for traces
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
    if (!traceBuffer) return;

    traceBuffer[traceHead] = entry;
    traceHead = (traceHead + 1) % traceLimit;

    if (traceCount < traceLimit) traceCount++;
  };

  type QueueItem = { event: Ev; invokeId?: number };

  const queue: QueueItem[] = [];

  const stopInvokes = (): void => {
    for (const invoke of activeInvokes) {
      invoke.controller.abort();
      debug?.({
        context: context_.value,
        event: invoke.event,
        invokeId: invoke.id,
        state: invoke.state,
        type: 'invoke-abort',
      });
    }

    activeInvokes.clear();
  };

  const saveSnapshot = (): void => {
    options.persistence?.save({ context: clone(context_.value), state: state_.value });
  };

  const runInvokes = (triggerEvent: Ev | typeof INIT_EVENT | typeof HYDRATE_EVENT): void => {
    // Collect invokes from all active ancestors (leaf to root)
    const ancestors = getAncestorPaths(state_.value);

    for (const path of ancestors) {
      const node = getNodeAtPath(definition.states, path) as StateNode<State, Ctx, Ev> | undefined;

      if (!node?.invoke?.length) continue;

      for (const invoke of node.invoke) {
        const controller = new AbortController();
        const invokeId = ++invokeCounter;
        const invokeInfo = { controller, event: triggerEvent, id: invokeId, state: state_.value };

        activeInvokes.add(invokeInfo);
        debug?.({ context: context_.value, event: triggerEvent, invokeId, state: state_.value, type: 'invoke-start' });

        void invoke
          .src({ context: context_.value, entryEvent: triggerEvent, signal: controller.signal })
          .then((result) => {
            activeInvokes.delete(invokeInfo);

            if (disposed || controller.signal.aborted || !invoke.onDone) return;

            debug?.({
              context: context_.value,
              event: triggerEvent,
              invokeId,
              result,
              state: state_.value,
              type: 'invoke-done',
            });

            queue.push({
              event: invoke.onDone(result, { context: context_.value, entryEvent: triggerEvent }),
              invokeId,
            });

            if (!draining) drainQueue();
          })
          .catch((error: unknown) => {
            activeInvokes.delete(invokeInfo);

            if (disposed || controller.signal.aborted || !invoke.onError) return;

            debug?.({
              context: context_.value,
              error,
              event: triggerEvent,
              invokeId,
              state: state_.value,
              type: 'invoke-error',
            });

            queue.push({
              event: invoke.onError(error, { context: context_.value, entryEvent: triggerEvent }),
              invokeId,
            });

            if (!draining) drainQueue();
          });
      }
    }
  };

  /**
   * Computes exit/entry paths for a transition considering hierarchy.
   * Returns { exitPaths: paths to exit (leaf-first), entryPaths: paths to enter (root-first) }
   */
  const computeTransitionPaths = (from: string, to: string): { entryPaths: string[]; exitPaths: string[] } => {
    const fromAncestors = getAncestorPaths(from);
    const toAncestors = getAncestorPaths(to);

    // Self-transition: exit and re-enter the leaf state
    if (from === to) {
      return { entryPaths: [to], exitPaths: [from] };
    }

    // Find the lowest common ancestor
    let lcaIndex = 0;

    while (
      lcaIndex < fromAncestors.length &&
      lcaIndex < toAncestors.length &&
      fromAncestors[lcaIndex] === toAncestors[lcaIndex]
    ) {
      lcaIndex++;
    }

    // Exit: from leaf up to (but not including) LCA — reversed for leaf-first
    const exitPaths = fromAncestors.slice(lcaIndex).reverse();

    // Entry: from LCA down to leaf
    const entryPaths = toAncestors.slice(lcaIndex);

    return { entryPaths, exitPaths };
  };

  const processEvent = (item: QueueItem): boolean => {
    if (disposed) return false;

    const from = state_.value;

    // Resolve transition using the pure resolver (R1: no duplication)
    const transition = resolveTransition(definition, {
      context: context_.value,
      event: item.event,
      state: from,
    });

    // Fire debug guard events (inline, since resolveTransition is pure)
    if (debug) {
      const ancestors = getAncestorPaths(from);

      outer: for (let i = ancestors.length - 1; i >= 0; i--) {
        const node = getNodeAtPath(definition.states, ancestors[i]) as StateNode<State, Ctx, Ev> | undefined;

        if (!node?.on) continue;

        const raw = node.on[item.event.type as EventType<Ev>];

        if (!raw) continue;

        const defs = Array.isArray(raw) ? raw : [raw];

        for (const def of defs) {
          const passed =
            !def.guard ||
            def.guard({
              context: context_.value,
              event: item.event as EventByType<Ev, EventType<Ev>>,
            });

          debug({ context: context_.value, event: item.event, from, passed, target: def.target, type: 'guard' });

          if (passed) break outer;
        }
      }
    }

    if (!transition) {
      debug?.({ event: item.event, from, type: 'transition-skipped' });

      return false;
    }

    // Resolve target to leaf state (hierarchical support)
    const resolvedTarget = resolveLeaf(definition.states, transition.target) as State;

    // Compute entry/exit paths for proper hierarchy handling
    const { entryPaths, exitPaths } = computeTransitionPaths(from, resolvedTarget);

    const draft = clone(context_.value);

    // Exit handlers (leaf → root)
    for (const path of exitPaths) {
      const node = getNodeAtPath(definition.states, path);

      node?.exit?.({ context: draft, event: item.event });
    }

    // Transition actions
    transition.actions?.forEach((fn) => fn({ context: draft, event: item.event as EventByType<Ev, EventType<Ev>> }));

    // Entry handlers (root → leaf)
    for (const path of entryPaths) {
      const node = getNodeAtPath(definition.states, path);

      node?.entry?.({ context: draft, event: item.event });
    }

    assertContext(draft, 'transition');

    // Commit atomically
    batch(() => {
      stopInvokes();
      state_.value = resolvedTarget;
      context_.value = draft;
    });

    options.onTransition?.({ event: item.event, from, to: resolvedTarget });
    pushTrace({ event: item.event, from, invokeId: item.invokeId, timestamp: Date.now(), to: resolvedTarget });
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

        if (++processed > maxTransitionsPerFlush) {
          throw new MachineError(
            'MACHINE_TRANSITION_LOOP_GUARD',
            '[machine] transition queue exceeded maxTransitionsPerFlush',
            { maxTransitionsPerFlush },
          );
        }

        processEvent(item);
      }
    } finally {
      draining = false;
    }
  };

  // ── Public API ──────────────────────────────────────────────────────────────

  const can = (event: Ev): boolean => {
    if (disposed) return false;

    return !!resolveTransition(definition, {
      context: context_.value,
      event,
      state: state_.value,
    });
  };

  const send = (event: Ev): boolean => {
    if (disposed) return false;

    // Apply middleware chain (F3)
    if (middlewares.length > 0) {
      const snapshot = { context: context_.value, state: state_.value };

      const runCore = (): boolean => {
        if (draining) {
          queue.push({ event });

          return false;
        }

        draining = true;

        try {
          const result = processEvent({ event });

          while (queue.length > 0) {
            const item = queue.shift()!;

            processEvent(item);
          }

          return result;
        } finally {
          draining = false;
        }
      };

      // Build middleware chain (last middleware calls core)
      let chain = runCore;

      for (let i = middlewares.length - 1; i >= 0; i--) {
        const mw = middlewares[i];
        const next = chain;

        chain = () => mw(event, snapshot, next);
      }

      return chain();
    }

    // Fast path: no middleware (R3: simplified send)
    if (draining) {
      queue.push({ event });

      return false;
    }

    draining = true;

    try {
      const result = processEvent({ event });

      while (queue.length > 0) {
        const item = queue.shift()!;

        processEvent(item);
      }

      return result;
    } finally {
      draining = false;
    }
  };

  const getSnapshot = (): MachineSnapshot<State, Ctx> => ({
    context: clone(context_.value),
    state: state_.value,
  });

  const getTrace = (): readonly TransitionTraceEntry<State, Ev>[] => {
    if (!traceBuffer || traceCount === 0) return [];

    if (traceCount < traceLimit) {
      return traceBuffer.slice(0, traceCount);
    }

    return [...traceBuffer.slice(traceHead), ...traceBuffer.slice(0, traceHead)];
  };

  const matches = (...states: string[]): boolean => {
    if (disposed) return false;

    const current = state_.value;

    return states.some((s) => current === s || current.startsWith(`${s}.`));
  };

  const clearPersistence = (): void => {
    options.persistence?.clear?.();
  };

  const subscribe = (fn: (snapshot: MachineSnapshot<State, Ctx>) => void): (() => void) => {
    let first = true;
    const e = effect(() => {
      const snap: MachineSnapshot<State, Ctx> = { context: context_.value, state: state_.value };

      if (first) {
        first = false;

        return;
      }

      fn(snap);
    });

    return () => e.dispose();
  };

  // ── Initialization ────────────────────────────────────────────────────────

  if (persistedSnapshot) {
    runInvokes(HYDRATE_EVENT);
    // R8: Don't save on hydrate — we just loaded this snapshot
  } else {
    // Run entry handlers for all ancestor paths of initial state (root → leaf)
    const initPaths = getAncestorPaths(resolvedInitial);
    const hasEntry = initPaths.some((p) => getNodeAtPath(definition.states, p)?.entry);

    if (hasEntry) {
      const initDraft = clone(context_.value);

      for (const p of initPaths) {
        getNodeAtPath(definition.states, p)?.entry?.({ context: initDraft, event: INIT_EVENT });
      }

      assertContext(initDraft, 'init');
      context_.value = initDraft;
    }

    runInvokes(INIT_EVENT);

    // R8: Only save if persistence adapter exists
    if (options.persistence) saveSnapshot();
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
    subscribe,
    [Symbol.dispose]: () => {
      disposed = true;
      stopInvokes();
      state_.dispose();
      context_.dispose();
    },
  };
};
