import { tapper } from '@vielzeug/arsenal';
import { isContextRecord } from './_context.js';
import { warn } from './_dev.js';
import { type CompiledAfter, type CompiledMachine, type CompiledState, compileDefinition } from './definition.js';
import { ClockworkSnapshotError, ClockworkTransitionLimitError } from './errors.js';
import type {
  Actor,
  ActorErrorContext,
  ActorOptions,
  ActorTapEvent,
  Effect,
  Machine,
  MachineConfig,
  MachineEvent,
  MachineSnapshot,
  TransitionResult,
} from './types.js';

type InternalEvent<State extends string, Context extends Record<string, unknown>, Event extends MachineEvent> = {
  readonly after: CompiledAfter<State, Context, Event>;
  readonly kind: 'after';
};

type RuntimeEvent<State extends string, Context extends Record<string, unknown>, Event extends MachineEvent> =
  | { readonly event: Event; readonly kind: 'event' }
  | InternalEvent<State, Context, Event>;

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

const isMachineEvent = (event: unknown): event is MachineEvent => {
  try {
    return typeof event === 'object' && event !== null && typeof (event as { type?: unknown }).type === 'string';
  } catch {
    return false;
  }
};

const stateNode = <State extends string, Context extends Record<string, unknown>, Event extends MachineEvent>(
  machine: CompiledMachine<State, Context, Event>,
  state: State,
): CompiledState<State, Context, Event> => machine.states.get(state) ?? invalidSnapshot(state);

const assertSnapshot = <State extends string, Context extends Record<string, unknown>, Event extends MachineEvent>(
  machine: CompiledMachine<State, Context, Event>,
  snapshot: MachineSnapshot<State, Context>,
): void => {
  if (!isContextRecord(snapshot.context)) {
    throw new ClockworkSnapshotError('snapshot context must be a non-array object record', {});
  }

  stateNode(machine, snapshot.state);
};

const selectTransition = <State extends string, Context extends Record<string, unknown>, Event extends MachineEvent>(
  machine: CompiledMachine<State, Context, Event>,
  snapshot: MachineSnapshot<State, Context>,
  runtimeEvent: RuntimeEvent<State, Context, Event>,
): SelectedTransition<State, Context, Event> | undefined => {
  assertSnapshot(machine, snapshot);
  const state = stateNode(machine, snapshot.state);

  if (runtimeEvent.kind === 'after') {
    if (!state.after.includes(runtimeEvent.after)) return undefined;

    const { definition } = runtimeEvent.after;

    if (!definition.guard || definition.guard({ context: snapshot.context, event: undefined })) {
      return { event: undefined, transition: definition as ExecutableTransition<State, Context, Event> };
    }

    return undefined;
  }

  const candidates = state.on.get(runtimeEvent.event.type);

  if (!candidates) return undefined;

  for (const candidate of candidates) {
    const guard = candidate.guard as
      | ((args: { readonly context: Readonly<Context>; readonly event: Event }) => boolean)
      | undefined;

    if (!guard || guard({ context: snapshot.context, event: runtimeEvent.event })) {
      return {
        event: runtimeEvent.event,
        transition: candidate as unknown as ExecutableTransition<State, Context, Event>,
      };
    }
  }

  return undefined;
};

const transition = <State extends string, Context extends Record<string, unknown>, Event extends MachineEvent>(
  machine: CompiledMachine<State, Context, Event>,
  snapshot: MachineSnapshot<State, Context>,
  runtimeEvent: RuntimeEvent<State, Context, Event>,
): TransitionOutcome<State, Context, Event> => {
  const selected = selectTransition(machine, snapshot, runtimeEvent);

  if (!selected) {
    return {
      event: runtimeEvent.kind === 'event' ? runtimeEvent.event : undefined,
      result: { snapshot: normalizeSnapshot(snapshot), type: 'ignored' },
    };
  }

  const reducer = selected.transition.reduce as
    | ((args: { readonly context: Readonly<Context>; readonly event: Event | undefined }) => Context)
    | undefined;
  const nextContext = reducer ? reducer({ context: snapshot.context, event: selected.event }) : snapshot.context;

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
  machine: CompiledMachine<State, Context, Event>,
  snapshot: MachineSnapshot<State, Context>,
  event: Event,
): boolean => selectTransition(machine, snapshot, { event, kind: 'event' }) !== undefined;

const MAX_TRANSITIONS = 1_000;

const createActor = <State extends string, Context extends Record<string, unknown>, Event extends MachineEvent>(
  machine: CompiledMachine<State, Context, Event>,
  initialSnapshot: MachineSnapshot<State, Context>,
  options: ActorOptions<State, Context> = {},
): Actor<State, Context, Event> => {
  const restored = options.snapshot ?? initialSnapshot;

  assertSnapshot(machine, restored);
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
    const node = stateNode(machine, state);

    for (const after of node.after) {
      const timer = setTimeout(() => {
        timers.delete(timer);
        run({ after, kind: 'after' });
      }, after.definition.delay);

      timers.add(timer);
    }

    for (const invoke of node.invoke) {
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
      outcome = transition(machine, current, runtimeEvent);
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

    const source = stateNode(machine, previous.state);

    current = outcome.result.snapshot;
    tappers.emit({ event: outcome.event, snapshot: current, type: 'transition' });
    cancelStateResources();
    establishStateResources(current.state, outcome.event);
    notify(outcome.event);
    runEffects(source.exit, previous.state, outcome.event);
    runEffects(outcome.transition.effects ?? [], previous.state, outcome.event);
    runEffects(stateNode(machine, current.state).entry, current.state, outcome.event);
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
    runEffects(stateNode(machine, current.state).entry, current.state, undefined);
  }

  return {
    can: (event) => {
      if (disposed) return false;

      try {
        if (!isMachineEvent(event)) {
          warn('ignored malformed event; expected an object with a string `type`');
          return false;
        }

        return canTransition(machine, current, event);
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
    const compiled = compileDefinition(definition);
    const initialSnapshot = createSnapshot(compiled.initial, compiled.context);

    return {
      can: (snapshot, event) => canTransition(compiled, snapshot, event),
      createActor: (options) => createActor(compiled, initialSnapshot, options),
      initialSnapshot,
      transition: (snapshot, event) => transition(compiled, snapshot, { event, kind: 'event' }).result,
    };
  };
