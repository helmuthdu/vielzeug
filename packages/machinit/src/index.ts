import type { ReadonlySignal, Signal } from '@vielzeug/stateit';

import { batch, effect as createEffect, readonly, signal } from '@vielzeug/stateit';

// ── Public types ─────────────────────────────────────────────────────────────

export type MachineEvent = { [key: string]: unknown; type: string };

/**
 * Arguments passed to every action and guard function.
 * `context` is a mutable draft — mutations are committed atomically after all
 * actions for a transition have run.
 */
export type ActionArgs<Ctx extends object, Ev extends MachineEvent = MachineEvent> = {
  context: Ctx;
  readonly event: Ev;
};

export type ActionFn<Ctx extends object, Ev extends MachineEvent = MachineEvent> = (args: ActionArgs<Ctx, Ev>) => void;

export type GuardFn<Ctx extends object, Ev extends MachineEvent = MachineEvent> = (
  args: ActionArgs<Ctx, Ev>,
) => boolean;

export type TransitionDef<State extends string, Ctx extends object, Ev extends MachineEvent = MachineEvent> = {
  actions?: Array<ActionFn<Ctx, Ev>>;
  guard?: GuardFn<Ctx, Ev>;
  target: State;
};

export type StateNode<State extends string, EventType extends string, Ctx extends object> = {
  entry?: ActionFn<Ctx>;
  exit?: ActionFn<Ctx>;
  on?: Partial<Record<EventType, TransitionDef<State, Ctx> | Array<TransitionDef<State, Ctx>>>>;
};

export type MachineConfig<State extends string, EventType extends string, Ctx extends object> = {
  context?: Ctx;
  initial: State;
  /**
   * Observation-only hook fired after each successful transition.
   * Do NOT call `send()` inside — use `entry` actions for chained transitions instead.
   */
  onTransition?: (info: { event: MachineEvent; from: State; to: State }) => void;
  states: { [S in State]: StateNode<State, EventType, Ctx> };
};

export type MachineSnapshot<State extends string, Ctx extends object> = {
  readonly context: Readonly<Ctx>;
  readonly state: State;
};

export interface MachineInstance<State extends string, EventType extends string, Ctx extends object> {
  readonly context: ReadonlySignal<Ctx>;
  readonly state: ReadonlySignal<State>;
  availableEvents(): EventType[];
  can(eventOrType: { [key: string]: unknown; type: EventType } | EventType): boolean;
  getSnapshot(): MachineSnapshot<State, Ctx>;
  send(eventOrType: { [key: string]: unknown; type: EventType } | EventType, payload?: object): boolean;
  subscribe(listener: (snapshot: MachineSnapshot<State, Ctx>) => void): () => void;
  [Symbol.dispose](): void;
}

// ── assign() ─────────────────────────────────────────────────────────────────

/**
 * Creates an action that merges partial context updates.
 * The callback receives `{ context, event }` and returns the fields to update.
 *
 * For usage without explicit type parameters, prefer `setup()`.
 *
 * @example
 * assign<{ count: number }>(({ context }) => ({ count: context.count + 1 }))
 */
export const assign =
  <Ctx extends object, Ev extends MachineEvent = MachineEvent>(
    fn: (args: ActionArgs<Ctx, Ev>) => Partial<Ctx>,
  ): ActionFn<Ctx, Ev> =>
  (args) => {
    Object.assign(args.context, fn(args));
  };

// ── setup() ──────────────────────────────────────────────────────────────────

/**
 * Returns typed helpers and a machine creator bound to specific context and event types.
 * Declare your types once — no per-helper annotations needed.
 *
 * @example
 * const machine = setup<{ count: number }, { type: 'INC' } | { type: 'DEC' }>();
 *
 * const counter = machine.create({
 *   context: { count: 0 },
 *   initial: 'idle',
 *   states: {
 *     idle: {
 *       on: {
 *         INC: { actions: [machine.assign(({ context }) => ({ count: context.count + 1 }))], target: 'idle' },
 *       },
 *     },
 *   },
 * });
 */
export const setup = <Ctx extends object = Record<never, never>, Ev extends MachineEvent = MachineEvent>() => ({
  action: (fn: ActionFn<Ctx, Ev>): ActionFn<Ctx, Ev> => fn,
  // Event type is the full union — per-event narrowing requires discriminated setup (future).
  assign: assign<Ctx, Ev>,
  create: <State extends string, EventType extends Ev extends { type: infer T } ? T : string>(
    config: MachineConfig<State, EventType, Ctx>,
    // @ts-expect-error — const inference creates type variance that TS can't resolve; runtime is correct
  ): MachineInstance<State, EventType, Ctx> => createMachine(config),
  guard: (fn: GuardFn<Ctx, Ev>): GuardFn<Ctx, Ev> => fn,
});

// ── Internal types for `const` inference ─────────────────────────────────────

type RawActionFn = (args: { context: any; event: any }) => void;

type RawGuardFn = (args: { context: any; event: any }) => boolean;

type RawTransitionDef = { actions?: RawActionFn[]; guard?: RawGuardFn; target: string };

type RawStateNode = {
  entry?: RawActionFn;
  exit?: RawActionFn;
  on?: Record<string, RawTransitionDef | Array<RawTransitionDef>>;
};

type RawMachineConfig = {
  context?: object;
  initial: string;
  onTransition?: (info: any) => void;
  states: Record<string, RawStateNode>;
};

type InferState<Cfg extends RawMachineConfig> = keyof Cfg['states'] & string;

type InferEventType<Cfg extends RawMachineConfig> = {
  [S in keyof Cfg['states']]: Cfg['states'][S] extends { on: infer On } ? keyof On & string : never;
}[keyof Cfg['states']];

type InferContext<Cfg extends RawMachineConfig> = Cfg extends { context: infer C extends object }
  ? C
  : Record<never, never>;

// ── createMachine ─────────────────────────────────────────────────────────────

const INIT_EVENT: MachineEvent = { type: '$init' };

/**
 * Creates a finite state machine backed by stateit reactive signals.
 *
 * - `.state` and `.context` are `ReadonlySignal` — subscribe via `effect()` or `.subscribe()`.
 * - `send()` returns `true` if the transition was taken, `false` otherwise.
 * - `can()` checks transition availability without side effects.
 * - Lifecycle order per transition: `exit` → `actions` → state change → `entry` → `onTransition`.
 * - All signal writes are batched — subscribers are notified once per `send()`.
 * - Guard-based routing: if `on` value is an array, first passing guard wins.
 *
 * @example
 * const traffic = createMachine({
 *   initial: 'green',
 *   states: {
 *     green:  { on: { NEXT: { target: 'yellow' } } },
 *     yellow: { on: { NEXT: { target: 'red'    } } },
 *     red:    { on: { NEXT: { target: 'green'  } } },
 *   },
 * });
 *
 * traffic.state.value;              // 'green'
 * traffic.send('NEXT');             // true
 * traffic.state.value;              // 'yellow'
 */
export const createMachine = <const Cfg extends RawMachineConfig>(
  config: Cfg,
): MachineInstance<InferState<Cfg>, InferEventType<Cfg>, InferContext<Cfg>> => {
  type State = InferState<Cfg>;
  type Ctx = InferContext<Cfg>;
  type Ev = { [key: string]: unknown; type: InferEventType<Cfg> };

  const states = config.states as Record<string, RawStateNode>;
  const state_: Signal<State> = signal(config.initial as State);
  const context_: Signal<Ctx> = signal((config.context ? { ...config.context } : {}) as Ctx);
  let disposed = false;

  if (import.meta.env?.DEV !== false) {
    if (!(config.initial in states)) {
      throw new Error(`[machinit] initial state "${config.initial}" not found in states`);
    }

    for (const [name, node] of Object.entries(states)) {
      for (const [ev, raw] of Object.entries(node.on ?? {})) {
        const defs = Array.isArray(raw) ? raw : [raw];

        for (const tr of defs) {
          if (!(tr.target in states)) {
            throw new Error(`[machinit] state "${name}" event "${ev}" targets unknown state "${tr.target}"`);
          }
        }
      }
    }
  }

  const send = (eventOrType: Ev | string, payload?: object): boolean => {
    if (disposed) return false;

    const event = typeof eventOrType === 'string' ? ({ ...payload, type: eventOrType } as Ev) : eventOrType;
    const currentNode = states[state_.value];
    const raw = currentNode.on?.[event.type];

    if (!raw) return false;

    const defs = Array.isArray(raw) ? raw : [raw];
    const draft = { ...context_.value } as Ctx;

    // Find first transition whose guard passes (or no guard)
    const tr = defs.find((d) => !d.guard || d.guard({ context: draft, event }));

    if (!tr) return false;

    const targetNode = states[tr.target];
    const from = state_.value;
    const prevState = state_.value;
    const prevCtx = context_.value;

    try {
      batch(() => {
        currentNode.exit?.({ context: draft, event });
        tr.actions?.forEach((fn) => fn({ context: draft, event }));
        state_.value = tr.target as State;
        targetNode.entry?.({ context: draft, event });
        context_.value = draft;
        config.onTransition?.({ event, from, to: tr.target as State });
      });
    } catch (err) {
      // Rollback on error for atomic transitions
      state_.value = prevState;
      context_.value = prevCtx;
      throw err;
    }

    return true;
  };

  const can = (eventOrType: Ev | string): boolean => {
    const ev = typeof eventOrType === 'string' ? ({ type: eventOrType } as Ev) : eventOrType;
    const raw = states[state_.value].on?.[ev.type];

    if (!raw) return false;

    const defs = Array.isArray(raw) ? raw : [raw];
    // In dev mode, freeze to catch mutations. In prod, pass live value (zero allocation).
    const isDev = typeof globalThis !== 'undefined' && (globalThis as any).__DEV__ === true;
    const ctx = isDev ? Object.freeze({ ...context_.value }) as Ctx : context_.value as Ctx;

    return defs.some((d) => !d.guard || d.guard({ context: ctx, event: ev }));
  };

  const availableEvents = (): (InferEventType<Cfg>)[] => {
    const node = states[state_.value];
    return node.on ? (Object.keys(node.on) as (InferEventType<Cfg>)[]) : [];
  };

  const getSnapshot = (): MachineSnapshot<State, Ctx> => ({
    context: { ...context_.value },
    state: state_.value,
  });

  const subscribe = (listener: (snapshot: MachineSnapshot<State, Ctx>) => void): (() => void) => {
    let active = true;
    const subscription = createEffect(() => {
      if (active) listener(getSnapshot());
    });

    return () => {
      active = false;
      subscription.dispose();
    };
  };

  // Run initial state's entry action synchronously before returning.
  const initNode = states[config.initial];

  if (initNode.entry) {
    const initDraft = { ...context_.value } as Ctx;

    initNode.entry({ context: initDraft, event: INIT_EVENT });
    context_.value = initDraft;
  }

  return {
    availableEvents,
    can,
    context: readonly(context_),
    getSnapshot,
    send,
    state: readonly(state_),
    subscribe,
    [Symbol.dispose]: () => {
      disposed = true;
      state_.dispose();
      context_.dispose();
    },
  };
};
