import { batch, effect, readonly, signal } from '@vielzeug/ripple';

import type {
  ContextValidator,
  EventByType,
  EventType,
  InterpretOptions,
  LifecycleEvent,
  MachineConfig,
  MachineEvent,
  MachineInstance,
  MachineSnapshot,
  StateNode,
  TransitionDef,
  TransitionTraceEntry,
} from './types.js';

import { getAncestorPaths, getNodeAtPath, resolveLeaf } from './definition.js';
import { MachineError } from './errors.js';

// ── Internal constants ────────────────────────────────────────────────────────

const INIT_EVENT = { type: '$init' } as const;
const HYDRATE_EVENT = { type: '$hydrate' } as const;

// ── Pure resolver (R2: accepts onGuard callback) ──────────────────────────────

/**
 * Resolves which transition should be taken for a given state + event.
 * Pure function — useful for testing transition logic independently.
 *
 * Optionally calls `onGuard` for each guard evaluation (eliminates debug duplication — R2).
 */
export const resolveTransition = <State extends string, Ctx extends object, Ev extends MachineEvent>(
  definition: Readonly<MachineConfig<State, Ctx, Ev>>,
  input: {
    context: Readonly<Ctx>;
    event: NoInfer<Ev>;
    state: State;
  },
  onGuard?: (info: { context: Readonly<Ctx>; event: Ev; from: State; passed: boolean; target: State }) => void,
): TransitionDef<State, Ctx, Ev> | undefined => {
  const { context, event, state } = input;
  const ancestors = getAncestorPaths(state);

  for (let i = ancestors.length - 1; i >= 0; i--) {
    const node = getNodeAtPath(definition.states, ancestors[i]) as StateNode<State, Ctx, Ev> | undefined;

    if (!node?.on) continue;

    const raw = node.on[event.type as EventType<Ev>];

    if (!raw) continue;

    const defs = Array.isArray(raw) ? raw : [raw];

    for (const def of defs) {
      const passed =
        !def.guard || def.guard({ context: context as Ctx, event: event as EventByType<Ev, EventType<Ev>> });

      onGuard?.({ context, event, from: state, passed, target: def.target as State });

      if (passed) return def as TransitionDef<State, Ctx, Ev>;
    }
  }

  return undefined;
};

// ── Interpreter ───────────────────────────────────────────────────────────────

export const interpret = <State extends string, Ctx extends object, Ev extends MachineEvent>(
  definition: Readonly<MachineConfig<State, Ctx, Ev>>,
  options: InterpretOptions<State, Ctx, Ev> = {},
): MachineInstance<State, Ctx, Ev> => {
  const debugOpts = options.debug;
  const traceLimit = debugOpts?.traceLimit ?? 0;

  if (options.maxTransitionsPerFlush !== undefined && options.maxTransitionsPerFlush < 1) {
    throw new MachineError(
      'MACHINE_INVALID_MAX_TRANSITIONS_PER_FLUSH',
      '[machine] maxTransitionsPerFlush must be greater than 0',
      { maxTransitionsPerFlush: options.maxTransitionsPerFlush },
    );
  }

  const maxTransitionsPerFlush = options.maxTransitionsPerFlush ?? 1_000;
  const clone = options.clone ?? structuredClone;
  const onDebug = debugOpts?.onDebug;
  // Widen State keys to string so getNodeAtPath / getAncestorPaths work with plain string paths.
  const states = definition.states as unknown as Record<string, StateNode<string, Ctx, Ev>>;
  const onTransition = debugOpts?.onTransition;
  const middlewares = options.middleware ?? [];
  const persistedSnapshot = options.snapshot ?? options.persistence?.load();

  if (persistedSnapshot) {
    const snapshotRoot = persistedSnapshot.state.split('.')[0];
    const snapshotValid =
      snapshotRoot in definition.states &&
      (!persistedSnapshot.state.includes('.') ||
        !!getNodeAtPath(definition.states as Record<string, StateNode<string, Ctx, Ev>>, persistedSnapshot.state));

    if (!snapshotValid) {
      throw new MachineError(
        'MACHINE_INVALID_SNAPSHOT_STATE',
        `[machine] snapshot state "${persistedSnapshot.state}" not found in states`,
        { state: persistedSnapshot.state },
      );
    }
  }

  const validator: ContextValidator<Ctx> | undefined = definition.validateContext;

  const assertContext = (context: Ctx, phase: 'init' | 'transition'): void => {
    if (validator && !validator(context)) {
      throw new MachineError(
        'MACHINE_INVALID_VALIDATE_CONTEXT',
        `[machine] context failed validation during ${phase}`,
        {
          phase,
        },
      );
    }
  };

  // Resolve initial state to leaf
  const resolvedInitial = persistedSnapshot
    ? persistedSnapshot.state
    : (resolveLeaf(states, definition.initial) as State);

  const initialContext = persistedSnapshot
    ? clone(persistedSnapshot.context)
    : clone(('context' in definition ? definition.context : ({} as Ctx)) as Ctx);

  if (!persistedSnapshot) assertContext(initialContext, 'init');

  const state_ = signal(resolvedInitial);
  const context_ = signal(initialContext);

  // Trace ring buffer
  const traceBuffer: TransitionTraceEntry<State, Ev>[] | null = traceLimit > 0 ? [] : null;
  let traceHead = 0;
  let traceCount = 0;

  let disposed = false;
  let draining = false;
  let invokeCounter = 0;

  const activeInvokes = new Set<{
    controller: AbortController;
    event: Ev | LifecycleEvent;
    id: number;
    state: State;
  }>();

  const activeTimers = new Set<ReturnType<typeof setTimeout>>();

  const pushTrace = (entry: TransitionTraceEntry<State, Ev>): void => {
    if (!traceBuffer) return;

    if (traceCount < traceLimit) {
      traceBuffer.push(entry);
      traceCount++;
    } else {
      traceBuffer[traceHead] = entry;
      traceHead = (traceHead + 1) % traceLimit;
    }
  };

  type AfterQueueItem = {
    actions: Array<(args: { context: Ctx; readonly event: Ev | LifecycleEvent }) => void>;
    afterEvent: { readonly delay: number; readonly type: '$after' };
    from: State;
    isAfter: true;
    target: State;
  };

  type QueueItem = { event: Ev; invokeId?: number } | AfterQueueItem;

  const queue: QueueItem[] = [];

  const stopInvokes = (): void => {
    for (const invoke of activeInvokes) {
      invoke.controller.abort();
      onDebug?.({
        context: context_.value,
        event: invoke.event,
        invokeId: invoke.id,
        state: invoke.state,
        type: 'invoke-abort',
      });
    }

    activeInvokes.clear();
  };

  const clearTimers = (): void => {
    for (const timer of activeTimers) clearTimeout(timer);
    activeTimers.clear();
  };

  const saveSnapshot = (): void => {
    options.persistence?.save({ context: clone(context_.value), state: state_.value });
  };

  // ── R3: Fast-path for flat states ─────────────────────────────────────────

  const computeTransitionPaths = (from: string, to: string): { entryPaths: string[]; exitPaths: string[] } => {
    // Fast path: flat states (no dots — no hierarchy)
    if (!from.includes('.') && !to.includes('.')) {
      return { entryPaths: [to], exitPaths: [from] };
    }

    // Self-transition: exit and re-enter the leaf
    if (from === to) {
      return { entryPaths: [to], exitPaths: [from] };
    }

    const fromAncestors = getAncestorPaths(from);
    const toAncestors = getAncestorPaths(to);

    let lcaIndex = 0;

    while (
      lcaIndex < fromAncestors.length &&
      lcaIndex < toAncestors.length &&
      fromAncestors[lcaIndex] === toAncestors[lcaIndex]
    ) {
      lcaIndex++;
    }

    return {
      entryPaths: toAncestors.slice(lcaIndex),
      exitPaths: fromAncestors.slice(lcaIndex).reverse(),
    };
  };

  // ── R10: Extracted transition execution ───────────────────────────────────

  const executeTransition = (
    from: State,
    resolvedTarget: State,
    actions: Array<(args: { context: Ctx; readonly event: Ev | LifecycleEvent }) => void>,
    event: Ev | LifecycleEvent,
  ): void => {
    const { entryPaths, exitPaths } = computeTransitionPaths(from, resolvedTarget);
    const draft = clone(context_.value);

    for (const path of exitPaths) {
      getNodeAtPath(states, path)?.exit?.({ context: draft, event });
    }

    for (const fn of actions) fn({ context: draft, event });

    for (const path of entryPaths) {
      getNodeAtPath(states, path)?.entry?.({ context: draft, event });
    }

    assertContext(draft, 'transition');

    batch(() => {
      stopInvokes();
      clearTimers();
      state_.value = resolvedTarget;
      context_.value = draft;
    });

    onTransition?.({ event, from, to: resolvedTarget });
    pushTrace({ event, from, timestamp: Date.now(), to: resolvedTarget });
    saveSnapshot();
    runInvokes(event);
    scheduleAfterTransitions(resolvedTarget);
  };

  // ── Invoke scheduling ─────────────────────────────────────────────────────

  const runInvokes = (triggerEvent: Ev | LifecycleEvent): void => {
    const ancestors = getAncestorPaths(state_.value);

    for (const path of ancestors) {
      const node = getNodeAtPath(states, path) as StateNode<State, Ctx, Ev> | undefined;

      if (!node?.invoke?.length) continue;

      for (const invoke of node.invoke) {
        const controller = new AbortController();
        const invokeId = ++invokeCounter;
        const capturedContext = context_.value;
        const invokeInfo = { controller, event: triggerEvent, id: invokeId, state: state_.value };

        activeInvokes.add(invokeInfo);
        onDebug?.({
          context: capturedContext,
          event: triggerEvent,
          invokeId,
          state: state_.value,
          type: 'invoke-start',
        });

        void invoke
          .src({ context: capturedContext, entryEvent: triggerEvent, signal: controller.signal })
          .then((result) => {
            activeInvokes.delete(invokeInfo);

            if (disposed || controller.signal.aborted || !invoke.onDone) return;

            onDebug?.({
              context: capturedContext,
              event: triggerEvent,
              invokeId,
              result,
              state: state_.value,
              type: 'invoke-done',
            });

            queue.push({
              event: invoke.onDone(result, { context: capturedContext, entryEvent: triggerEvent }),
              invokeId,
            });

            if (!draining) drainQueue();
          })
          .catch((error: unknown) => {
            activeInvokes.delete(invokeInfo);

            if (disposed || controller.signal.aborted || !invoke.onError) return;

            onDebug?.({
              context: capturedContext,
              error,
              event: triggerEvent,
              invokeId,
              state: state_.value,
              type: 'invoke-error',
            });

            queue.push({
              event: invoke.onError(error, { context: capturedContext, entryEvent: triggerEvent }),
              invokeId,
            });

            if (!draining) drainQueue();
          });
      }
    }
  };

  // ── F4: After (delayed) transitions ───────────────────────────────────────

  const scheduleAfterTransitions = (currentState: State): void => {
    const ancestors = getAncestorPaths(currentState);

    for (const path of ancestors) {
      const node = getNodeAtPath(states, path) as StateNode<State, Ctx, Ev> | undefined;

      if (!node?.after?.length) continue;

      for (const afterDef of node.after) {
        const timer = setTimeout(() => {
          activeTimers.delete(timer);

          if (disposed || state_.value !== currentState) return;

          if (afterDef.guard && !afterDef.guard({ context: context_.value })) return;

          const resolvedTarget = resolveLeaf(states, afterDef.target) as State;
          const afterEvent = { delay: afterDef.delay, type: '$after' } as const;

          queue.push({
            actions: (afterDef.actions ?? []) as Array<
              (args: { context: Ctx; readonly event: Ev | LifecycleEvent }) => void
            >,
            afterEvent,
            from: currentState,
            isAfter: true,
            target: resolvedTarget,
          });
          drainQueue();
        }, afterDef.delay);

        activeTimers.add(timer);
      }
    }
  };

  // ── Event processing ──────────────────────────────────────────────────────

  const processEvent = (item: QueueItem): boolean => {
    if (disposed) return false;

    if ('isAfter' in item) {
      executeTransition(item.from, item.target, item.actions, item.afterEvent);

      return true;
    }

    const from = state_.value;

    // R2: Pass onGuard to resolver — eliminates debug duplication
    const transition = resolveTransition(
      definition,
      { context: context_.value, event: item.event, state: from },
      onDebug ? (info) => onDebug({ ...info, type: 'guard' }) : undefined,
    );

    if (!transition) {
      onDebug?.({ event: item.event, from, type: 'transition-skipped' });

      return false;
    }

    const resolvedTarget = resolveLeaf(states, transition.target) as State;
    // Widen action signature to include LifecycleEvent: executeTransition accepts a union event,
    // but transitions only fire on user events so the cast is safe at runtime.
    const actions = (transition.actions ?? []) as Array<
      (args: { context: Ctx; readonly event: Ev | LifecycleEvent }) => void
    >;

    executeTransition(from, resolvedTarget, actions, item.event);

    return true;
  };

  const drainQueueInner = (): void => {
    let processed = 0;

    while (queue.length > 0) {
      if (++processed > maxTransitionsPerFlush) {
        throw new MachineError(
          'MACHINE_TRANSITION_LOOP_GUARD',
          '[machine] transition queue exceeded maxTransitionsPerFlush',
          {
            maxTransitionsPerFlush,
          },
        );
      }

      processEvent(queue.shift()!);
    }
  };

  const drainQueue = (): void => {
    if (draining) return;

    draining = true;

    try {
      drainQueueInner();
    } finally {
      draining = false;
    }
  };

  // ── Public API ────────────────────────────────────────────────────────────

  const can = (event: Ev): boolean => {
    if (disposed) return false;

    return !!resolveTransition(definition, { context: context_.value, event, state: state_.value });
  };

  /**
   * Dispatches an event synchronously. Returns `true` if a transition was taken.
   *
   * When called re-entrantly (e.g. from inside an action), the event is queued
   * for processing after the current transition completes. In that case, `false`
   * is returned immediately — not because the event was ignored, but because the
   * transition has not yet occurred at the point of return.
   */
  // R1: Unified send — single drain implementation for both middleware and fast path
  const send = (event: Ev): boolean => {
    if (disposed) return false;

    const dispatch =
      middlewares.length > 0
        ? middlewares.reduceRight<() => boolean>(
            (next, mw) => () => mw(event, { context: context_.value, state: state_.value }, next),
            () => processEvent({ event }),
          )
        : () => processEvent({ event });

    if (draining) {
      queue.push({ event });

      return false;
    }

    draining = true;

    try {
      const result = dispatch();

      drainQueueInner();

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

    const entries =
      traceCount < traceLimit
        ? traceBuffer.slice(0, traceCount)
        : [...traceBuffer.slice(traceHead), ...traceBuffer.slice(0, traceHead)];

    return entries.map((e) => ({ ...e }));
  };

  const matches = (...states: string[]): boolean => {
    if (disposed) return false;

    const current = state_.value;

    return states.some((s) => current === s || current.startsWith(`${s}.`));
  };

  // R7: Change-detection subscribe — no reliance on effect's immediate-execution semantics
  const subscribe = (fn: (snapshot: MachineSnapshot<State, Ctx>) => void): (() => void) => {
    let prevState = state_.value;
    let prevCtx = context_.value;

    const sub = effect(() => {
      const s = state_.value;
      const c = context_.value;

      if (s !== prevState || c !== prevCtx) {
        prevState = s;
        prevCtx = c;
        fn({ context: c, state: s });
      }
    });

    return () => sub.dispose();
  };

  // ── Initialization ────────────────────────────────────────────────────────

  if (persistedSnapshot) {
    runInvokes(HYDRATE_EVENT);
    scheduleAfterTransitions(resolvedInitial);
  } else {
    const initPaths = getAncestorPaths(resolvedInitial);
    const hasEntry = initPaths.some((p) => getNodeAtPath(states, p)?.entry);

    if (hasEntry) {
      const initDraft = clone(context_.value);

      for (const p of initPaths) {
        getNodeAtPath(states, p)?.entry?.({ context: initDraft, event: INIT_EVENT });
      }

      assertContext(initDraft, 'init');
      context_.value = initDraft;
    }

    runInvokes(INIT_EVENT);
    scheduleAfterTransitions(resolvedInitial);

    if (options.persistence) saveSnapshot();
  }

  return {
    can,
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
      clearTimers();
      state_.dispose();
      context_.dispose();
    },
  };
};
