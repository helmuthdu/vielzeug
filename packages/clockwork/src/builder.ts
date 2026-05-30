import type {
  ActionFn,
  EventByType,
  EventType,
  GuardFn,
  InvokeDef,
  LifecycleFn,
  MachineConfig,
  MachineEvent,
  StateNode,
  TransitionDef,
} from './types.js';

import { defineMachine } from './definition.js';

// ── State builder ────────────────────────────────────────────────────────────

type TransitionConfig<State extends string, Ctx extends object, Ev extends MachineEvent, Type extends EventType<Ev>> = {
  actions?: Array<ActionFn<Ctx, EventByType<Ev, Type>>>;
  guard?: GuardFn<Ctx, EventByType<Ev, Type>>;
  target: State;
};

class StateBuilder<State extends string, Ctx extends object, Ev extends MachineEvent> {
  private _entry?: LifecycleFn<Ctx, Ev>;
  private _exit?: LifecycleFn<Ctx, Ev>;
  private _initial?: string;
  private _invokes: Array<InvokeDef<Ctx, Ev>> = [];
  private _on: Record<string, Array<TransitionDef<State, Ctx, Ev>>> = {};
  private _states?: Record<string, StateNode<string, Ctx, Ev>>;

  entry(fn: LifecycleFn<Ctx, Ev>): this {
    this._entry = fn;

    return this;
  }

  exit(fn: LifecycleFn<Ctx, Ev>): this {
    this._exit = fn;

    return this;
  }

  invoke(def: InvokeDef<Ctx, Ev>): this {
    this._invokes.push(def);

    return this;
  }

  on<Type extends EventType<Ev>>(eventType: Type, ...transitions: Array<TransitionConfig<State, Ctx, Ev, Type>>): this {
    this._on[eventType] = transitions as unknown as Array<TransitionDef<State, Ctx, Ev>>;

    return this;
  }

  compound(initial: string, states: Record<string, StateNode<string, Ctx, Ev>>): this {
    this._initial = initial;
    this._states = states;

    return this;
  }

  build(): StateNode<State, Ctx, Ev> {
    const node: StateNode<State, Ctx, Ev> = {};

    if (this._entry) node.entry = this._entry;

    if (this._exit) node.exit = this._exit;

    if (this._invokes.length > 0) node.invoke = this._invokes;

    if (Object.keys(this._on).length > 0) {
      node.on = this._on as StateNode<State, Ctx, Ev>['on'];
    }

    if (this._initial) node.initial = this._initial;

    if (this._states) node.states = this._states;

    return node;
  }
}

// ── Machine builder ──────────────────────────────────────────────────────────

class MachineBuilder<State extends string, Ctx extends object, Ev extends MachineEvent> {
  private _context?: Ctx;
  private _initial?: State;
  private _states: Partial<Record<State, StateNode<State, Ctx, Ev>>> = {};

  context(ctx: Ctx): this {
    this._context = ctx;

    return this;
  }

  initial(state: State): this {
    this._initial = state;

    return this;
  }

  state(name: State, configurator?: (builder: StateBuilder<State, Ctx, Ev>) => StateBuilder<State, Ctx, Ev>): this {
    if (configurator) {
      const builder = new StateBuilder<State, Ctx, Ev>();

      this._states[name] = configurator(builder).build();
    } else {
      this._states[name] = {};
    }

    return this;
  }

  build(): Readonly<MachineConfig<State, Ctx, Ev>> {
    const config = {
      initial: this._initial!,
      states: this._states as { [S in State]: StateNode<State, Ctx, Ev> },
    } as MachineConfig<State, Ctx, Ev>;

    if (this._context !== undefined) {
      (config as { context?: Ctx }).context = this._context;
    }

    return defineMachine(config);
  }
}

/**
 * Fluent builder for machine definitions.
 * @example
 * const machine = createMachine<'idle' | 'active', { count: number }, { type: 'GO' }>()
 *   .context({ count: 0 })
 *   .initial('idle')
 *   .state('idle', s => s.on('GO', { target: 'active' }))
 *   .state('active')
 *   .build();
 */
export const createMachine = <
  State extends string,
  Ctx extends object = Record<string, never>,
  Ev extends MachineEvent = MachineEvent,
>(): MachineBuilder<State, Ctx, Ev> => new MachineBuilder<State, Ctx, Ev>();
