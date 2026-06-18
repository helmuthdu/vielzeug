import { batch, readonly, signal } from '@vielzeug/ripple';

import type {
  DebugEvent,
  EventByType,
  EventType,
  InterpretOptions,
  LifecycleEvent,
  MachineConfig,
  MachineDefinition,
  MachineEvent,
  MachineInstance,
  MachineSnapshot,
  SendResult,
  StateNode,
  TransitionDef,
  TransitionTraceEntry,
} from './types.js';

import { getAncestorPaths, getNodeAtPath, resolveLeaf, validateDefinition } from './definition.js';
import { MachineError } from './errors.js';

// ── Internal constants ────────────────────────────────────────────────────────

const INIT_EVENT = { type: '$init' } as const;
const HYDRATE_EVENT = { type: '$hydrate' } as const;

// ── Pure resolver ─────────────────────────────────────────────────────────────

/**
 * Resolves which transition should be taken for a given state + event.
 * Pure function — no side effects; useful for testing transition logic independently.
 *
 * Optionally calls `onGuard` for each guard evaluation.
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
      const passed = !def.guard || def.guard({ context, event: event as EventByType<Ev, EventType<Ev>> });

      onGuard?.({ context, event, from: state, passed, target: def.target as State });

      if (passed) return def as TransitionDef<State, Ctx, Ev>;
    }
  }

  return undefined;
};

// ── SendResult helpers ─────────────────────────────────────────────────────────

const RESULT_TRANSITIONED: SendResult = Object.freeze({ ok: true, queued: false, status: 'transitioned' });
const RESULT_QUEUED: SendResult = Object.freeze({ ok: true, queued: true, status: 'queued' });
const RESULT_REJECTED: SendResult = Object.freeze({ ok: false, queued: false, status: 'rejected' });

// ── Core interpreter ──────────────────────────────────────────────────────────

const _interpret = <State extends string, Ctx extends object, Ev extends MachineEvent>(
  definition: Readonly<MachineConfig<State, Ctx, Ev>>,
  options: InterpretOptions<State, Ctx, Ev> = {},
): MachineInstance<State, Ctx, Ev> => {
  // R8: unified onDebug — no more separate onTransition
  const onDebug = options.onDebug;
  // Auto-enable trace (default 50) when onDebug is set but traceLimit not explicit
  const traceLimit = options.traceLimit ?? (onDebug ? 50 : 0);

  if (options.maxTransitionsPerFlush !== undefined && options.maxTransitionsPerFlush < 1) {
    throw new MachineError(
      'MACHINE_INVALID_MAX_TRANSITIONS_PER_FLUSH',
      'maxTransitionsPerFlush must be greater than 0',
      { maxTransitionsPerFlush: options.maxTransitionsPerFlush },
    );
  }

  const maxTransitionsPerFlush = options.maxTransitionsPerFlush ?? 1_000;
  const clone = options.clone ?? structuredClone;
  // Widen State keys to string so getNodeAtPath / getAncestorPaths work with plain string paths.
  const states = definition.states as unknown as Record<string, StateNode<string, Ctx, Ev>>;
  const interceptors = options.interceptors ?? [];
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
        `snapshot state "${persistedSnapshot.state}" not found in states`,
        { state: persistedSnapshot.state },
      );
    }
  }

  // R9: validateContext returns true | string — string is the failure reason
  const assertContext = (context: Ctx, phase: 'init' | 'transition'): void => {
    const validator = definition.validateContext;

    if (!validator) return;

    const result = validator(context);

    if (result !== true) {
      throw new MachineError(
        'MACHINE_INVALID_VALIDATE_CONTEXT',
        `context failed validation during ${phase}${result ? `: ${result}` : ''}`,
        { phase, reason: result },
      );
    }
  };

  const resolvedInitial = persistedSnapshot
    ? persistedSnapshot.state
    : (resolveLeaf(states, definition.initial) as State);

  const initialContext = persistedSnapshot
    ? clone(persistedSnapshot.context)
    : clone(('context' in definition ? definition.context : ({} as Ctx)) as Ctx);

  if (!persistedSnapshot) assertContext(initialContext, 'init');

  // ── Section: State & context signals ──────────────────────────────────────

  const state_ = signal(resolvedInitial);
  const context_ = signal(initialContext);

  // ── Section: Trace ring buffer ─────────────────────────────────────────────

  const traceBuffer: TransitionTraceEntry<State, Ev>[] | null = traceLimit > 0 ? [] : null;
  let traceHead = 0;
  let traceCount = 0;

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

  // ── Section: Lifecycle ─────────────────────────────────────────────────────

  const disposeController = new AbortController();
  let disposed = false;

  // ── Section: Invoke scheduler ──────────────────────────────────────────────

  let invokeCounter = 0;

  const activeInvokes = new Set<{
    controller: AbortController;
    event: Ev | LifecycleEvent;
    id: string;
    state: State;
  }>();

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

  // ── Section: After-timer scheduler ────────────────────────────────────────

  const activeTimers = new Set<ReturnType<typeof setTimeout>>();

  const clearTimers = (): void => {
    for (const timer of activeTimers) clearTimeout(timer);
    activeTimers.clear();
  };

  // ── Section: Persistence ───────────────────────────────────────────────────

  const saveSnapshot = (): void => {
    options.persistence?.save({ context: clone(context_.value), state: state_.value });
  };

  // ── Section: Subscribe (R5 — plain Set, not effect()) ─────────────────────

  const subscribers = new Set<(snapshot: MachineSnapshot<State, Ctx>) => void>();

  const notifySubscribers = (): void => {
    if (subscribers.size === 0) return;

    const snap: MachineSnapshot<State, Ctx> = Object.freeze({ context: context_.value, state: state_.value });

    for (const fn of subscribers) fn(snap);
  };

  // ── Section: Event queue (hoisted so executeTransition closures can reference) ──

  type AfterQueueItem = {
    actions: Array<(args: { context: Ctx; readonly event: Ev | LifecycleEvent }) => void>;
    afterEvent: { readonly delay: number; readonly type: '$after' };
    from: State;
    isAfter: true;
    target: State;
  };

  type QueueItem = { event: Ev } | AfterQueueItem;

  const queue: QueueItem[] = [];
  let draining = false;

  // ── Section: Hierarchy / transition execution ──────────────────────────────

  const computeTransitionPaths = (from: string, to: string): { entryPaths: string[]; exitPaths: string[] } => {
    if (!from.includes('.') && !to.includes('.')) {
      return { entryPaths: [to], exitPaths: [from] };
    }

    if (from === to) {
      return { entryPaths: [to], exitPaths: [from] };
    }

    const fromAncestors = getAncestorPaths(from);
    const toAncestors = getAncestorPaths(to);

    // Advance while both paths share a common prefix — lcaIndex lands at
    // the first segment that diverges (the deepest common ancestor's depth + 1).
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

    // Freeze before assertContext so validateContext always receives a read-only context
    Object.freeze(draft);
    assertContext(draft, 'transition');

    batch(() => {
      stopInvokes();
      clearTimers();
      state_.value = resolvedTarget;
      context_.value = draft;
    });

    // R8: emit unified 'transition' debug event (replaces onTransition callback)
    onDebug?.({ event, from, to: resolvedTarget, type: 'transition' } as DebugEvent<State, Ctx, Ev>);
    pushTrace({ event, from, timestamp: Date.now(), to: resolvedTarget });
    notifySubscribers();
    saveSnapshot();
    runInvokes(event);
    scheduleAfterTransitions(resolvedTarget);
  };

  // ── Section: Invoke scheduling ─────────────────────────────────────────────

  const runInvokes = (triggerEvent: Ev | LifecycleEvent): void => {
    const ancestors = getAncestorPaths(state_.value);

    for (const path of ancestors) {
      const node = getNodeAtPath(states, path) as StateNode<State, Ctx, Ev> | undefined;

      if (!node?.invoke?.length) continue;

      for (const invokeDef of node.invoke) {
        const controller = new AbortController();
        const invokeId = invokeDef.id ?? String(++invokeCounter);
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

        void invokeDef
          .src({ context: capturedContext, entryEvent: triggerEvent, signal: controller.signal })
          .then((result) => {
            activeInvokes.delete(invokeInfo);

            if (disposed || controller.signal.aborted || !invokeDef.onDone) return;

            onDebug?.({
              context: capturedContext,
              event: triggerEvent,
              invokeId,
              result,
              state: state_.value,
              type: 'invoke-done',
            });

            queue.push({ event: invokeDef.onDone(result, capturedContext) });

            if (!draining) drainQueue();
          })
          .catch((error: unknown) => {
            activeInvokes.delete(invokeInfo);

            if (disposed || controller.signal.aborted || !invokeDef.onError) return;

            onDebug?.({
              context: capturedContext,
              error,
              event: triggerEvent,
              invokeId,
              state: state_.value,
              type: 'invoke-error',
            });

            queue.push({ event: invokeDef.onError(error, capturedContext) });

            if (!draining) drainQueue();
          });
      }
    }
  };

  // ── Section: After (delayed) transitions ───────────────────────────────────

  const scheduleAfterTransitions = (currentState: State): void => {
    const ancestors = getAncestorPaths(currentState);

    for (const path of ancestors) {
      const node = getNodeAtPath(states, path) as StateNode<State, Ctx, Ev> | undefined;

      if (!node?.after?.length) continue;

      for (const afterDef of node.after) {
        const timer = setTimeout(() => {
          activeTimers.delete(timer);

          if (disposed || state_.value !== currentState) return;

          // R10: after.guard unified — receives { context, event } like all other guards
          const afterEvent = { delay: afterDef.delay, type: '$after' } as const;

          if (afterDef.guard && !afterDef.guard({ context: context_.value, event: afterEvent })) return;

          const resolvedTarget = resolveLeaf(states, afterDef.target) as State;

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

  // ── Section: Event queue processing ─────────────────────────────────────────

  const processEvent = (item: QueueItem): boolean => {
    if (disposed) return false;

    if ('isAfter' in item) {
      executeTransition(item.from, item.target, item.actions, item.afterEvent);

      return true;
    }

    const from = state_.value;

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
        throw new MachineError('MACHINE_TRANSITION_LOOP_GUARD', 'transition queue exceeded maxTransitionsPerFlush', {
          maxTransitionsPerFlush,
        });
      }

      processEvent(queue.shift()!);
    }
  };

  const drainQueue = (): void => {
    if (draining) return;

    draining = true;

    try {
      drainQueueInner();
    } catch (err) {
      queue.length = 0;
      throw err;
    } finally {
      draining = false;
    }
  };

  // ── Section: Public API ────────────────────────────────────────────────────

  const can = (event: Ev): boolean => {
    if (disposed) return false;

    return !!resolveTransition(definition, { context: context_.value, event, state: state_.value });
  };

  const send = (event: Ev): SendResult => {
    if (disposed) return RESULT_REJECTED;

    // Run interceptors left-to-right — first null wins
    let intercepted: Ev | null = event;

    for (const fn of interceptors) {
      intercepted = fn(intercepted, { context: context_.value, state: state_.value });

      if (intercepted === null) return RESULT_REJECTED;
    }

    const interceptedEvent = intercepted;

    if (draining) {
      queue.push({ event: interceptedEvent });

      return RESULT_QUEUED;
    }

    draining = true;

    try {
      const transitioned = processEvent({ event: interceptedEvent });

      drainQueueInner();

      return transitioned ? RESULT_TRANSITIONED : RESULT_REJECTED;
    } catch (err) {
      queue.length = 0;
      throw err;
    } finally {
      draining = false;
    }
  };

  const getSnapshot = (): MachineSnapshot<State, Ctx> =>
    Object.freeze({ context: clone(context_.value), state: state_.value });

  const getTrace = (): readonly TransitionTraceEntry<State, Ev>[] => {
    if (!traceBuffer || traceCount === 0) return [];

    const entries =
      traceCount < traceLimit
        ? traceBuffer.slice(0, traceCount)
        : [...traceBuffer.slice(traceHead), ...traceBuffer.slice(0, traceHead)];

    return entries.map((e) => ({ ...e }));
  };

  const matches = (...stateArgs: string[]): boolean => {
    if (disposed) return false;

    const current = state_.value;

    return stateArgs.some((s) => current === s || current.startsWith(`${s}.`));
  };

  // R5: subscribe via plain Set — no ripple effect(), no prevState/prevCtx tracking
  const subscribe = (fn: (snapshot: MachineSnapshot<State, Ctx>) => void): (() => void) => {
    subscribers.add(fn);

    return () => subscribers.delete(fn);
  };

  // ── Section: Initialization ────────────────────────────────────────────────

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

  const dispose = (): void => {
    if (disposed) return;

    disposed = true;
    disposeController.abort();
    stopInvokes();
    clearTimers();
    state_.dispose();
    context_.dispose();
  };

  return {
    can,
    context: readonly(context_),
    get disposalSignal() {
      return disposeController.signal;
    },
    dispose,
    get disposed() {
      return disposed;
    },
    getSnapshot,
    getTrace,
    matches,
    send,
    state: readonly(state_),
    subscribe,
    [Symbol.dispose]: dispose,
  };
};

// ── Public entry points ───────────────────────────────────────────────────────

/**
 * Defines, validates, and immediately starts a state machine.
 *
 * The most common entry point — validation and interpretation in a single call.
 * Use {@link define} if you need a reusable definition (e.g. multiple instances with different options).
 *
 * @example
 * const m = machine({
 *   context: { count: 0 },
 *   initial: 'idle',
 *   states: {
 *     idle: { on: { INC: { actions: [({ context }) => { context.count += 1 }], target: 'idle' } } },
 *   },
 * });
 *
 * m.send({ type: 'INC' });
 * console.log(m.context.value.count); // 1
 */
export const machine = <State extends string, Ctx extends object, Ev extends MachineEvent>(
  config: MachineConfig<State, Ctx, Ev>,
  options?: InterpretOptions<State, Ctx, Ev>,
): MachineInstance<State, Ctx, Ev> => {
  validateDefinition(config);

  return _interpret(config, options);
};

/**
 * Validates a machine configuration and returns a reusable definition handle.
 * Call `.start(options?)` to create a running instance.
 * Call `.resolve(input)` to inspect transitions without starting a machine.
 *
 * @example
 * const counterDef = define({
 *   context: { count: 0 },
 *   initial: 'idle',
 *   states: { idle: { on: { INC: { actions: [({ context }) => { context.count += 1 }], target: 'idle' } } } },
 * });
 *
 * const m1 = counterDef.start();
 * const m2 = counterDef.start({ snapshot: { context: { count: 10 }, state: 'idle' } });
 *
 * // Test transitions without a running machine:
 * counterDef.resolve({ context: { count: 0 }, event: { type: 'INC' }, state: 'idle' });
 */
export const define = <State extends string, Ctx extends object, Ev extends MachineEvent>(
  config: MachineConfig<State, Ctx, Ev>,
): MachineDefinition<State, Ctx, Ev> => {
  validateDefinition(config);

  return {
    // R3: no .config exposure — .resolve() replaces resolveTransition(def.config, ...)
    resolve(input) {
      return resolveTransition(config, input);
    },
    start(options?) {
      return _interpret(config, options);
    },
  };
};
