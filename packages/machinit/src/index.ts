import type { ReadonlySignal, Signal } from '@vielzeug/stateit';

import { batch, readonly, signal } from '@vielzeug/stateit';

// ── Public types ─────────────────────────────────────────────────────────────

export type MachineEvent = { [key: string]: unknown; type: string };

type EventType<Ev extends MachineEvent> = Ev['type'] & string;

type EventByType<Ev extends MachineEvent, Type extends EventType<Ev>> = Extract<Ev, { type: Type }>;

type InitEvent = { readonly type: '$init' };

type HydrateEvent = { readonly type: '$hydrate' };

type LifecycleEvent = InitEvent | HydrateEvent;

/**
 * Arguments passed to actions and guards.
 * `context` is a mutable draft committed atomically after transition actions run.
 */
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

export type MachineConfig<State extends string, Ctx extends object, Ev extends MachineEvent> = {
  context?: Ctx;
  initial: State;
  onTransition?: (info: { event: Ev; from: State; to: State }) => void;
  states: { [S in State]: StateNode<State, Ctx, Ev> };
};

export type MachineDefinition<State extends string, Ctx extends object, Ev extends MachineEvent> = MachineConfig<
  State,
  Ctx,
  Ev
>;

export type MachineSnapshot<State extends string, Ctx extends object> = {
  readonly context: Readonly<Ctx>;
  readonly state: State;
};

export type InterpretOptions<State extends string, Ctx extends object> = {
  snapshot?: MachineSnapshot<State, Ctx>;
};

export interface MachineInstance<State extends string, Ctx extends object, Ev extends MachineEvent> {
  readonly context: ReadonlySignal<Ctx>;
  readonly state: ReadonlySignal<State>;
  can(event: Ev): boolean;
  getSnapshot(): MachineSnapshot<State, Ctx>;
  send(event: Ev): boolean;
  [Symbol.dispose](): void;
}

// ── Helper builders ──────────────────────────────────────────────────────────

export const assign =
  <Ctx extends object, Ev extends MachineEvent = MachineEvent>(
    fn: (args: ActionArgs<Ctx, Ev>) => Partial<Ctx>,
  ): ActionFn<Ctx, Ev> =>
  (args) => {
    Object.assign(args.context, fn(args));
  };

export const setup = <Ctx extends object = Record<never, never>, Ev extends MachineEvent = MachineEvent>() => ({
  action: (fn: ActionFn<Ctx, Ev>): ActionFn<Ctx, Ev> => fn,
  assign: assign<Ctx, Ev>,
  define: <State extends string>(config: MachineConfig<State, Ctx, Ev>): MachineDefinition<State, Ctx, Ev> =>
    defineMachine(config),
  guard: (fn: GuardFn<Ctx, Ev>): GuardFn<Ctx, Ev> => fn,
});

// ── Definition / runtime split ───────────────────────────────────────────────

export const defineMachine = <State extends string, Ctx extends object, Ev extends MachineEvent>(
  config: MachineConfig<State, Ctx, Ev>,
): MachineDefinition<State, Ctx, Ev> => config;

const INIT_EVENT: InitEvent = { type: '$init' };
const HYDRATE_EVENT: HydrateEvent = { type: '$hydrate' };

export const interpret = <State extends string, Ctx extends object, Ev extends MachineEvent>(
  definition: MachineDefinition<State, Ctx, Ev>,
  options: InterpretOptions<State, Ctx> = {},
): MachineInstance<State, Ctx, Ev> => {
  const { snapshot } = options;
  const { states } = definition;

  if (!(definition.initial in states)) {
    throw new Error(`[machinit] initial state "${definition.initial}" not found in states`);
  }

  if (snapshot && !(snapshot.state in states)) {
    throw new Error(`[machinit] snapshot state "${snapshot.state}" not found in states`);
  }

  for (const [stateName, node] of Object.entries(states)) {
    for (const [eventType, defs] of Object.entries(node.on ?? {})) {
      for (const tr of defs) {
        if (!(tr.target in states)) {
          throw new Error(`[machinit] state "${stateName}" event "${eventType}" targets unknown state "${tr.target}"`);
        }
      }
    }
  }

  const state_: Signal<State> = signal(snapshot ? snapshot.state : definition.initial);
  const context_: Signal<Ctx> = signal(
    snapshot ? ({ ...snapshot.context } as Ctx) : ((definition.context ? { ...definition.context } : {}) as Ctx),
  );

  let disposed = false;
  const activeInvokes = new Set<AbortController>();

  const stopInvokes = (): void => {
    for (const controller of activeInvokes) {
      controller.abort();
    }

    activeInvokes.clear();
  };

  const runInvokes = (triggerEvent: Ev | LifecycleEvent): void => {
    const node = states[state_.value];

    if (!node.invoke?.length) return;

    for (const invoke of node.invoke) {
      const controller = new AbortController();

      activeInvokes.add(controller);

      void invoke
        .src({ context: context_.value, event: triggerEvent, signal: controller.signal })
        .then((result) => {
          activeInvokes.delete(controller);

          if (disposed || controller.signal.aborted || !invoke.onDone) return;

          send(invoke.onDone(result, { context: context_.value, event: triggerEvent }));
        })
        .catch((error: unknown) => {
          activeInvokes.delete(controller);

          if (disposed || controller.signal.aborted || !invoke.onError) return;

          send(invoke.onError(error, { context: context_.value, event: triggerEvent }));
        });
    }
  };

  const can = (event: Ev): boolean => {
    if (disposed) return false;

    const defs = states[state_.value].on?.[event.type as EventType<Ev>];

    if (!defs?.length) return false;

    return defs.some((def) => !def.guard || def.guard({ context: context_.value, event }));
  };

  const send = (event: Ev): boolean => {
    if (disposed) return false;

    const currentNode = states[state_.value];
    const defs = currentNode.on?.[event.type as EventType<Ev>];

    if (!defs?.length) return false;

    const draft = { ...context_.value } as Ctx;
    const transition = defs.find((def) => !def.guard || def.guard({ context: draft, event }));

    if (!transition) return false;

    const from = state_.value;
    const targetNode = states[transition.target];

    batch(() => {
      stopInvokes();
      currentNode.exit?.({ context: draft, event });
      transition.actions?.forEach((fn) => fn({ context: draft, event }));
      state_.value = transition.target;
      targetNode.entry?.({ context: draft, event });
      context_.value = draft;
    });

    definition.onTransition?.({ event, from, to: transition.target });
    runInvokes(event);

    return true;
  };

  const getSnapshot = (): MachineSnapshot<State, Ctx> => ({
    context: { ...context_.value },
    state: state_.value,
  });

  if (!snapshot) {
    const initNode = states[definition.initial];

    if (initNode.entry) {
      const initDraft = { ...context_.value } as Ctx;

      initNode.entry({ context: initDraft, event: INIT_EVENT });
      context_.value = initDraft;
    }

    runInvokes(INIT_EVENT);
  } else {
    runInvokes(HYDRATE_EVENT);
  }

  return {
    can,
    context: readonly(context_),
    getSnapshot,
    send,
    state: readonly(state_),
    [Symbol.dispose]: () => {
      disposed = true;
      stopInvokes();
      state_.dispose();
      context_.dispose();
    },
  };
};
