import { tapper } from '@vielzeug/arsenal';
import { warn } from './_dev.js';
import { ClockworkDefinitionError, ClockworkSnapshotError, ClockworkTransitionLimitError } from './errors.js';
import type {
  Actor,
  ActorErrorContext,
  ActorOptions,
  ActorTapEvent,
  After,
  Effect,
  EventType,
  Machine,
  MachineConfig,
  MachineEvent,
  MachineSnapshot,
  StateNode,
  TransitionResult,
} from './types.js';

const MAX_TIMER_MS = 2_147_483_647;
const MAX_TRANSITIONS = 1_000;

const isContextRecord = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;

  const prototype = Object.getPrototypeOf(value);

  return prototype === null || prototype === Object.prototype;
};

/** Fails fast on the definition footguns the type system cannot express: out-of-range
 *  timer delays (platform timers fire immediately above 2^31 ms), empty transition
 *  arrays, and a context that is not a plain record. Everything else — declared
 *  targets, callback shapes, state keys — is compiler-checked in the typed definition. */
const assertDefinition = <State extends string, Context extends Record<string, unknown>, Event extends MachineEvent>(
  definition: MachineConfig<State, Context, Event>,
): void => {
  const context = (definition as { readonly context?: Context }).context;

  if (context !== undefined && !isContextRecord(context)) {
    throw new ClockworkDefinitionError('machine context must be a non-array object record', {});
  }

  for (const [state, node] of Object.entries(definition.states) as [string, StateNode<State, Context, Event>][]) {
    for (const [type, input] of Object.entries(node.on ?? {})) {
      if (Array.isArray(input) && input.length === 0) {
        throw new ClockworkDefinitionError('a transition array must not be empty', { state, type });
      }
    }

    for (const [index, after] of (node.after ?? []).entries()) {
      if (!Number.isFinite(after.delay) || after.delay < 0 || after.delay > MAX_TIMER_MS) {
        throw new ClockworkDefinitionError(`state "${state}" after delay must be between 0 and ${MAX_TIMER_MS}`, {
          delay: after.delay,
          index,
          state,
        });
      }
    }
  }
};

type InternalEvent<State extends string, Context extends Record<string, unknown>, Event extends MachineEvent> = {
  readonly after: After<State, Context, Event>;
  readonly kind: 'after';
};

type RuntimeEvent<State extends string, Context extends Record<string, unknown>, Event extends MachineEvent> =
  | { readonly event: Event; readonly kind: 'event' }
  | InternalEvent<State, Context, Event>;

/** A transition or delayed transition selected for execution. The reducer's event
 *  parameter is whatever the selector matched — the event for a user transition,
 *  `undefined` for a timer — which the declared per-type signatures cannot express. */
type ExecutableTransition<State extends string, Context extends Record<string, unknown>, Event extends MachineEvent> = {
  readonly effects?: readonly Effect<Context, Event>[];
  readonly reduce?: (args: { readonly context: Readonly<Context>; readonly event: Event | undefined }) => Context;
  readonly target: State;
};

type SelectedTransition<State extends string, Context extends Record<string, unknown>, Event extends MachineEvent> = {
  readonly event: Event | undefined;
  readonly transition: ExecutableTransition<State, Context, Event>;
};

type TransitionOutcome<State extends string, Context extends Record<string, unknown>, Event extends MachineEvent> = {
  readonly event: Event | undefined;
  readonly result: TransitionResult<State, Context>;
  readonly transition?: ExecutableTransition<State, Context, Event>;
};

const createSnapshot = <State extends string, Context extends Record<string, unknown>>(
  state: State,
  context: Context,
): MachineSnapshot<State, Context> => {
  const cloned = Object.assign(Object.create(Object.getPrototypeOf(context)) as Context, context);

  return Object.freeze({ context: Object.freeze(cloned), state });
};

const normalizeSnapshot = <State extends string, Context extends Record<string, unknown>>(
  snapshot: MachineSnapshot<State, Context>,
): MachineSnapshot<State, Context> =>
  Object.isFrozen(snapshot) && Object.isFrozen(snapshot.context)
    ? snapshot
    : createSnapshot(snapshot.state, snapshot.context as Context);

const invalidSnapshot = (state: unknown): never => {
  throw new ClockworkSnapshotError(`snapshot state "${String(state)}" is not declared`, { state });
};

const isMachineEvent = (event: unknown): event is MachineEvent =>
  typeof event === 'object' && event !== null && typeof (event as { type?: unknown }).type === 'string';

/** Reads a declared state node. The own-property guard keeps prototype keys such as
 *  `constructor` or `__proto__` from reading as declared states. */
const nodeFor = <State extends string, Context extends Record<string, unknown>, Event extends MachineEvent>(
  definition: MachineConfig<State, Context, Event>,
  state: State,
) => (Object.hasOwn(definition.states, state) ? definition.states[state] : invalidSnapshot(state));

const assertSnapshot = <State extends string, Context extends Record<string, unknown>, Event extends MachineEvent>(
  definition: MachineConfig<State, Context, Event>,
  snapshot: MachineSnapshot<State, Context>,
): void => {
  if (!isContextRecord(snapshot.context)) {
    throw new ClockworkSnapshotError('snapshot context must be a non-array object record', {});
  }

  nodeFor(definition, snapshot.state);
};

const selectTransition = <State extends string, Context extends Record<string, unknown>, Event extends MachineEvent>(
  definition: MachineConfig<State, Context, Event>,
  snapshot: MachineSnapshot<State, Context>,
  runtimeEvent: RuntimeEvent<State, Context, Event>,
): SelectedTransition<State, Context, Event> | undefined => {
  assertSnapshot(definition, snapshot);
  const node = nodeFor(definition, snapshot.state);

  if (runtimeEvent.kind === 'after') {
    if (!node.after || !node.after.includes(runtimeEvent.after)) return undefined;

    if (!runtimeEvent.after.guard || runtimeEvent.after.guard({ context: snapshot.context, event: undefined })) {
      return { event: undefined, transition: runtimeEvent.after as ExecutableTransition<State, Context, Event> };
    }

    return undefined;
  }

  const on = node.on;

  if (!on || !Object.hasOwn(on, runtimeEvent.event.type)) return undefined;

  const input = on[runtimeEvent.event.type as EventType<Event>];
  const candidates = Array.isArray(input) ? input : [input];

  for (const candidate of candidates) {
    if (!candidate.guard || candidate.guard({ context: snapshot.context, event: runtimeEvent.event })) {
      return { event: runtimeEvent.event, transition: candidate as ExecutableTransition<State, Context, Event> };
    }
  }

  return undefined;
};

const transition = <State extends string, Context extends Record<string, unknown>, Event extends MachineEvent>(
  definition: MachineConfig<State, Context, Event>,
  snapshot: MachineSnapshot<State, Context>,
  runtimeEvent: RuntimeEvent<State, Context, Event>,
): TransitionOutcome<State, Context, Event> => {
  const selected = selectTransition(definition, snapshot, runtimeEvent);

  if (!selected) {
    return {
      event: runtimeEvent.kind === 'event' ? runtimeEvent.event : undefined,
      result: { snapshot: normalizeSnapshot(snapshot), type: 'ignored' },
    };
  }

  const nextContext = selected.transition.reduce
    ? selected.transition.reduce({ context: snapshot.context, event: selected.event })
    : snapshot.context;

  if (!isContextRecord(nextContext)) {
    throw new ClockworkSnapshotError('a reducer must return a non-array object record', {
      state: snapshot.state,
    });
  }

  return {
    event: selected.event,
    result: { snapshot: createSnapshot(selected.transition.target, nextContext as Context), type: 'transition' },
    transition: selected.transition,
  };
};

const canTransition = <State extends string, Context extends Record<string, unknown>, Event extends MachineEvent>(
  definition: MachineConfig<State, Context, Event>,
  snapshot: MachineSnapshot<State, Context>,
  event: Event,
): boolean => selectTransition(definition, snapshot, { event, kind: 'event' }) !== undefined;

const createActor = <State extends string, Context extends Record<string, unknown>, Event extends MachineEvent>(
  definition: MachineConfig<State, Context, Event>,
  initialSnapshot: MachineSnapshot<State, Context>,
  options: ActorOptions<State, Context> = {},
): Actor<State, Context, Event> => {
  const restored = options.snapshot ?? initialSnapshot;

  assertSnapshot(definition, restored);
  let current = createSnapshot(restored.state, restored.context as Context);

  const listeners = new Set<(snapshot: MachineSnapshot<State, Context>) => void>();
  const tappers = tapper<ActorTapEvent<State, Context, Event>>();
  const disposal = new AbortController();
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const invokes = new Set<AbortController>();
  const queue: RuntimeEvent<State, Context, Event>[] = [];
  let disposed = false;
  let processing = false;

  const cancelStateResources = (): void => {
    for (const timer of timers) clearTimeout(timer);
    timers.clear();

    for (const controller of invokes) controller.abort();
    invokes.clear();
  };

  const dispose = (): void => {
    if (disposed) return;

    disposed = true;
    queue.length = 0;
    cancelStateResources();
    listeners.clear();
    tappers.emit({ type: 'dispose' });
    tappers.clear();
    disposal.abort();
  };

  const observeError = (error: unknown, context: ActorErrorContext<State, Event>): void => {
    tappers.emit({ error, event: context.event, phase: context.phase, state: context.state, type: 'error' });
  };

  const fail = (error: unknown, context: ActorErrorContext<State, Event>): void => {
    observeError(error, context);
    dispose();
  };

  const run = (runtimeEvent: RuntimeEvent<State, Context, Event>): void => {
    if (disposed) return;

    if (processing) {
      queue.push(runtimeEvent);

      return;
    }

    processing = true;

    try {
      process(runtimeEvent);
      flush();
    } finally {
      processing = false;
    }
  };

  const send = (event: Event): void => {
    if (disposed) return;

    if (!isMachineEvent(event)) {
      warn('ignored malformed event; expected an object with a string `type`');

      return;
    }

    run({ event, kind: 'event' });
  };

  const runEffects = (effects: readonly Effect<Context, Event>[], state: State, event: Event | undefined): void => {
    for (const effect of effects) {
      if (disposed) return;

      try {
        effect({ context: current.context, event, send, signal: disposal.signal });
      } catch (error) {
        fail(error, { event, phase: 'effect', state });
      }
    }
  };

  const establishStateResources = (state: State, event: Event | undefined): void => {
    const node = nodeFor(definition, state);

    for (const after of node.after ?? []) {
      const timer = setTimeout(() => {
        timers.delete(timer);
        run({ after, kind: 'after' });
      }, after.delay);

      timers.add(timer);
    }

    for (const invoke of node.invoke ?? []) {
      const controller = new AbortController();

      invokes.add(controller);

      const capturedContext = current.context;
      const capturedEvent = event;

      void Promise.resolve()
        .then(() => invoke.src({ context: capturedContext, event: capturedEvent, signal: controller.signal }))
        .then(
          (result) => {
            invokes.delete(controller);

            if (disposed || controller.signal.aborted || !invoke.onDone) return;

            try {
              send(invoke.onDone({ context: capturedContext, result }));
            } catch (error) {
              fail(error, { event: capturedEvent, phase: 'invoke', state });
            }
          },
          (error: unknown) => {
            invokes.delete(controller);

            if (disposed || controller.signal.aborted) return;

            try {
              if (invoke.onError) {
                send(invoke.onError({ context: capturedContext, error }));
              } else {
                fail(error, { event: capturedEvent, phase: 'invoke', state });
              }
            } catch (callbackError) {
              fail(callbackError, { event: capturedEvent, phase: 'invoke', state });
            }
          },
        );
    }
  };

  const notify = (event: Event | undefined): void => {
    for (const listener of [...listeners]) {
      if (disposed) return;

      try {
        listener(current);
      } catch (error) {
        observeError(error, { event, phase: 'subscriber', state: current.state });
      }
    }
  };

  const process = (runtimeEvent: RuntimeEvent<State, Context, Event>): void => {
    const previous = current;
    let outcome: TransitionOutcome<State, Context, Event>;

    try {
      outcome = transition(definition, current, runtimeEvent);
    } catch (error) {
      fail(error, {
        event: runtimeEvent.kind === 'event' ? runtimeEvent.event : undefined,
        phase: 'transition',
        state: current.state,
      });

      return;
    }

    if (outcome.result.type === 'ignored' || !outcome.transition) {
      tappers.emit({ event: outcome.event, snapshot: outcome.result.snapshot, type: 'ignored' });
      return;
    }

    const source = nodeFor(definition, previous.state);

    current = outcome.result.snapshot;
    tappers.emit({ event: outcome.event, snapshot: current, type: 'transition' });
    cancelStateResources();
    establishStateResources(current.state, outcome.event);
    notify(outcome.event);
    runEffects(source.exit ?? [], previous.state, outcome.event);
    runEffects(outcome.transition.effects ?? [], previous.state, outcome.event);
    runEffects(nodeFor(definition, current.state).entry ?? [], current.state, outcome.event);
  };

  const flush = (): void => {
    let transitions = 0;

    while (queue.length > 0 && !disposed) {
      transitions += 1;

      if (transitions > MAX_TRANSITIONS) {
        fail(
          new ClockworkTransitionLimitError('maximum queued transitions exceeded', { maxTransitions: MAX_TRANSITIONS }),
          {
            phase: 'transition',
            state: current.state,
          },
        );

        return;
      }

      const next = queue.shift();

      if (next) process(next);
    }
  };

  establishStateResources(current.state, undefined);

  if (!options.snapshot) {
    runEffects(nodeFor(definition, current.state).entry ?? [], current.state, undefined);
  }

  return {
    can: (event) => {
      if (disposed) return false;

      try {
        if (!isMachineEvent(event)) {
          warn('ignored malformed event; expected an object with a string `type`');
          return false;
        }

        return canTransition(definition, current, event);
      } catch (error) {
        fail(error, { event, phase: 'transition', state: current.state });
        return false;
      }
    },
    get disposalSignal() {
      return disposal.signal;
    },
    dispose,
    get disposed() {
      return disposed;
    },
    send,
    get snapshot() {
      return current;
    },
    subscribe(listener) {
      if (disposed) return () => undefined;

      listeners.add(listener);

      return () => listeners.delete(listener);
    },
    tap(handler, tapOptions) {
      if (disposed) return () => undefined;

      return tappers.tap(handler, tapOptions);
    },
    [Symbol.dispose]: dispose,
  };
};

/** Defines a typed flat finite-state machine. */
export const defineMachine =
  <Context extends Record<string, unknown> = Record<string, never>, Event extends MachineEvent = MachineEvent>() =>
  <State extends string>(definition: MachineConfig<State, Context, Event>): Machine<State, Context, Event> => {
    assertDefinition(definition);
    const context = (definition as { readonly context?: Context }).context ?? ({} as Context);
    const initialSnapshot = createSnapshot(definition.initial, context);

    return {
      can: (snapshot, event) => canTransition(definition, snapshot, event),
      createActor: (options) => createActor(definition, initialSnapshot, options),
      initialSnapshot,
      transition: (snapshot, event) => transition(definition, snapshot, { event, kind: 'event' }).result,
    };
  };
