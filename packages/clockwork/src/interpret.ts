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

import { warn } from './_dev';
import { createTraceBuffer } from './_trace.js';
import { getAncestorPaths, getNodeAtPath, resolveLeaf, validateDefinition } from './definition.js';
import {
  ClockworkInvalidMaxTransitionsError,
  ClockworkInvalidSnapshotStateError,
  ClockworkInvalidValidateContextError,
  ClockworkTransitionLoopGuardError,
} from './errors.js';

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
const resolveTransition = <State extends string, Ctx extends object, Ev extends MachineEvent>(
  definition: Readonly<MachineConfig<State, Ctx, Ev>>,
  input: {
    context: Readonly<Ctx>;
    event: NoInfer<Ev>;
    state: State;
  },
  onGuard?: (info: { context: Readonly<Ctx>; event: Ev; from: State; passed: boolean; target: State }) => void,
): TransitionDef<State, Ctx, Ev> | undefined => {
  const { context, event, state } = input;

  // Defensive: callers piping untyped external data through an `Ev`-typed cast (e.g. a
  // deserialized network message passed to `send()`) can violate the MachineEvent contract
  // at runtime. Treat a missing/non-string `type` as "no matching transition" rather than
  // crashing with a raw TypeError.
  if (!event || typeof (event as unknown as { type?: unknown }).type !== 'string') return undefined;

  const ancestors = getAncestorPaths(state);

  for (let i = ancestors.length - 1; i >= 0; i--) {
    const node = getNodeAtPath(definition.states, ancestors[i]) as StateNode<State, Ctx, Ev> | undefined;

    if (!node?.on) continue;

    // Own-property check — an event `type` of "__proto__"/"constructor"/etc. must resolve
    // to "no matching transition", not an inherited Object.prototype member.
    const eventType = event.type as EventType<Ev>;
    const raw = Object.hasOwn(node.on, eventType) ? node.on[eventType] : undefined;

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

const RESULT_TRANSITIONED: SendResult = Object.freeze({ status: 'transitioned' });
const RESULT_QUEUED: SendResult = Object.freeze({ status: 'queued' });
const RESULT_REJECTED: SendResult = Object.freeze({ status: 'rejected' });

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
    throw new ClockworkInvalidMaxTransitionsError(
      'maxTransitionsPerFlush must be greater than 0',
      options.maxTransitionsPerFlush,
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
      Object.hasOwn(definition.states, snapshotRoot) &&
      (!persistedSnapshot.state.includes('.') ||
        !!getNodeAtPath(definition.states as Record<string, StateNode<string, Ctx, Ev>>, persistedSnapshot.state));

    if (!snapshotValid) {
      throw new ClockworkInvalidSnapshotStateError(
        `snapshot state "${persistedSnapshot.state}" not found in states`,
        persistedSnapshot.state,
      );
    }
  }

  // R9: validateContext returns true | string — string is the failure reason
  const assertContext = (context: Ctx, phase: 'init' | 'transition'): void => {
    const validator = definition.validateContext;

    if (!validator) return;

    const result = validator(context);

    if (result !== true) {
      throw new ClockworkInvalidValidateContextError(
        `context failed validation during ${phase}${result ? `: ${result}` : ''}`,
        phase,
        result,
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

  const trace = createTraceBuffer<State, Ev>(traceLimit);

  // ── Section: Lifecycle ─────────────────────────────────────────────────────

  const disposeController = new AbortController();
  let disposed = false;

  // ── Section: Invoke scheduler ──────────────────────────────────────────────

  let invokeCounter = 0;

  const activeInvokes = new Set<{
    controller: AbortController;
    event: Ev | LifecycleEvent;
    id: string;
    /** Path of the state node that owns this invoke — scopes abort-on-exit to that subtree. */
    path: string;
    state: State;
  }>();

  /**
   * Aborts active invokes. With `paths`, only invokes owned by one of those state paths are
   * stopped (used when exiting part of the hierarchy); omit `paths` to stop everything (dispose).
   */
  const stopInvokes = (paths?: readonly string[]): void => {
    for (const invoke of activeInvokes) {
      if (paths && !paths.includes(invoke.path)) continue;

      invoke.controller.abort();
      onDebug?.({
        context: context_.value,
        event: invoke.event,
        invokeId: invoke.id,
        state: invoke.state,
        type: 'invoke-abort',
      });
      activeInvokes.delete(invoke);
    }
  };

  // ── Section: After-timer scheduler ────────────────────────────────────────

  const activeTimers = new Set<{ path: string; timer: ReturnType<typeof setTimeout> }>();

  /**
   * Clears active after-timers. With `paths`, only timers owned by one of those state paths are
   * cleared (used when exiting part of the hierarchy); omit `paths` to clear everything (dispose).
   */
  const clearTimers = (paths?: readonly string[]): void => {
    for (const entry of activeTimers) {
      if (paths && !paths.includes(entry.path)) continue;

      clearTimeout(entry.timer);
      activeTimers.delete(entry);
    }
  };

  // ── Section: Persistence ───────────────────────────────────────────────────

  const saveSnapshot = (): void => {
    options.persistence?.save({ context: clone(context_.value), state: state_.value });
  };

  // ── Section: Subscribe ─────────────────────────────────────────────────────

  const subscribers = new Set<(snapshot: MachineSnapshot<State, Ctx>) => void>();

  const notifySubscribers = (): void => {
    if (subscribers.size === 0) return;

    const snap: MachineSnapshot<State, Ctx> = Object.freeze({ context: context_.value, state: state_.value });

    for (const fn of subscribers) fn(snap);
  };

  // ── Section: Event queue (hoisted so executeTransition closures can reference) ──

  type EventQueueItem = { readonly event: Ev; readonly tag: 'event' };
  type AfterQueueItem = {
    readonly actions: Array<(args: { context: Ctx; readonly event: Ev | LifecycleEvent }) => void>;
    readonly afterEvent: { readonly delay: number; readonly type: '$after' };
    readonly from: State;
    readonly tag: 'after';
    readonly target: State;
  };

  type QueueItem = AfterQueueItem | EventQueueItem;

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
      stopInvokes(exitPaths);
      clearTimers(exitPaths);
      state_.value = resolvedTarget;
      context_.value = draft;
    });

    // R8: emit unified 'transition' debug event (replaces onTransition callback)
    onDebug?.({ event, from, to: resolvedTarget, type: 'transition' } as DebugEvent<State, Ctx, Ev>);
    trace?.push({ event, from, timestamp: Date.now(), to: resolvedTarget });
    notifySubscribers();
    saveSnapshot();
    // Only (re)start invokes/timers for newly-entered paths — ancestors that remain active
    // across the transition (e.g. a sibling-to-sibling move under the same compound parent)
    // keep their invokes/timers running uninterrupted.
    runInvokes(event, entryPaths);
    scheduleAfterTransitions(entryPaths);
  };

  // ── Section: Invoke scheduling ─────────────────────────────────────────────

  const runInvokes = (triggerEvent: Ev | LifecycleEvent, paths: readonly string[]): void => {
    for (const path of paths) {
      const node = getNodeAtPath(states, path) as StateNode<State, Ctx, Ev> | undefined;

      if (!node?.invoke?.length) continue;

      for (const invokeDef of node.invoke) {
        const controller = new AbortController();
        const invokeId = invokeDef.id ?? String(++invokeCounter);
        const capturedContext = context_.value;
        const invokeInfo = { controller, event: triggerEvent, id: invokeId, path, state: state_.value };

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

            queue.push({ event: invokeDef.onDone(result, capturedContext), tag: 'event' });

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

            queue.push({ event: invokeDef.onError(error, capturedContext), tag: 'event' });

            if (!draining) drainQueue();
          });
      }
    }
  };

  // ── Section: After (delayed) transitions ───────────────────────────────────

  const scheduleAfterTransitions = (paths: readonly string[]): void => {
    for (const path of paths) {
      const node = getNodeAtPath(states, path) as StateNode<State, Ctx, Ev> | undefined;

      if (!node?.after?.length) continue;

      for (const afterDef of node.after) {
        const timer = setTimeout(() => {
          activeTimers.delete(entry);

          // A sibling-to-sibling transition elsewhere in the tree may have moved the leaf
          // while this timer's owning path stayed active — fire from wherever we are now,
          // and only if that path is still part of the live ancestor chain.
          if (disposed || !getAncestorPaths(state_.value).includes(path)) return;

          const from = state_.value;
          // R10: after.guard unified — receives { context, event } like all other guards
          const afterEvent = { delay: afterDef.delay, type: '$after' } as const;

          if (afterDef.guard && !afterDef.guard({ context: context_.value, event: afterEvent })) return;

          const resolvedTarget = resolveLeaf(states, afterDef.target) as State;

          queue.push({
            actions: (afterDef.actions ?? []) as Array<
              (args: { context: Ctx; readonly event: Ev | LifecycleEvent }) => void
            >,
            afterEvent,
            from,
            tag: 'after',
            target: resolvedTarget,
          });
          drainQueue();
        }, afterDef.delay);
        const entry = { path, timer };

        activeTimers.add(entry);
      }
    }
  };

  // ── Section: Event queue processing ─────────────────────────────────────────

  const processEvent = (item: QueueItem): boolean => {
    if (disposed) return false;

    if (item.tag === 'after') {
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
        throw new ClockworkTransitionLoopGuardError(
          'transition queue exceeded maxTransitionsPerFlush',
          maxTransitionsPerFlush,
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
    if (disposed) {
      warn('send() called on a disposed machine — event ignored');

      return RESULT_REJECTED;
    }

    // Run interceptors left-to-right — first null wins
    let intercepted: Ev | null = event;

    for (const fn of interceptors) {
      intercepted = fn(intercepted, { context: context_.value, state: state_.value });

      if (intercepted === null) return RESULT_REJECTED;
    }

    const interceptedEvent = intercepted;

    if (draining) {
      queue.push({ event: interceptedEvent, tag: 'event' });

      return RESULT_QUEUED;
    }

    draining = true;

    try {
      const transitioned = processEvent({ event: interceptedEvent, tag: 'event' });

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

  const getTrace = (): readonly TransitionTraceEntry<State, Ev>[] => trace?.get() ?? [];

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

  const initialPaths = getAncestorPaths(resolvedInitial);

  if (persistedSnapshot) {
    runInvokes(HYDRATE_EVENT, initialPaths);
    scheduleAfterTransitions(initialPaths);
  } else {
    const hasEntry = initialPaths.some((p) => getNodeAtPath(states, p)?.entry);

    if (hasEntry) {
      const initDraft = clone(context_.value);

      for (const p of initialPaths) {
        getNodeAtPath(states, p)?.entry?.({ context: initDraft, event: INIT_EVENT });
      }

      assertContext(initDraft, 'init');
      context_.value = initDraft;
    }

    runInvokes(INIT_EVENT, initialPaths);
    scheduleAfterTransitions(initialPaths);

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

// ── Public entry point ────────────────────────────────────────────────────────

/**
 * Validates a machine configuration and returns a reusable definition handle.
 *
 * Call `.start(options?)` to create a running instance.
 * Call `.resolve(input, options?)` to inspect transitions without starting a machine.
 *
 * @example
 * const counterDef = createMachine({
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
 *
 * // Or start immediately (one-shot):
 * const m3 = createMachine(config).start();
 */
export const createMachine = <State extends string, Ctx extends object, Ev extends MachineEvent>(
  config: MachineConfig<State, Ctx, Ev>,
): MachineDefinition<State, Ctx, Ev> => {
  validateDefinition(config);

  return {
    resolve(input, options?) {
      return resolveTransition(config, input, options?.onGuard);
    },
    start(options?) {
      return _interpret(config, options);
    },
  };
};
