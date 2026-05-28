export const machinitTypes = `
declare module '@vielzeug/machinit' {
  export type MachineEvent = { [key: string]: unknown; type: string };

  export type EventType<Ev extends MachineEvent> = Ev['type'] & string;

  export type EventByType<Ev extends MachineEvent, Type extends EventType<Ev>> = Extract<Ev, { type: Type }>;

  export type LifecycleEvent = { readonly type: '$init' } | { readonly type: '$hydrate' };

  export type ActionArgs<Ctx extends object, Ev extends MachineEvent = MachineEvent> = {
    context: Ctx;
    readonly event: Ev;
  };

  export type ActionFn<Ctx extends object, Ev extends MachineEvent = MachineEvent> = (
    args: ActionArgs<Ctx, Ev>,
  ) => void;

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

  export type ContextValidator<Ctx extends object> = (context: unknown) => context is Ctx;

  export type MachineConfig<State extends string, Ctx extends object, Ev extends MachineEvent> = {
    context?: Ctx;
    initial: State;
    onTransition?: (info: { event: Ev; from: State; to: State }) => void;
    states: { [S in State]: StateNode<State, Ctx, Ev> };
    validateContext?: ContextValidator<Ctx>;
  };

  export type MachineDefinition<State extends string, Ctx extends object, Ev extends MachineEvent> = Readonly<
    MachineConfig<State, Ctx, Ev>
  >;

  export type MachineSnapshot<State extends string, Ctx extends object> = {
    readonly context: Readonly<Ctx>;
    readonly state: State;
  };

  export type PersistenceAdapter<State extends string, Ctx extends object> = {
    clear?: () => void;
    load?: () => MachineSnapshot<State, Ctx> | undefined;
    save?: (snapshot: MachineSnapshot<State, Ctx>) => void;
  };

  export type GuardEvaluationInfo<State extends string, Ctx extends object, Ev extends MachineEvent> = {
    readonly context: Readonly<Ctx>;
    readonly event: Ev;
    readonly from: State;
    readonly passed: boolean;
    readonly target: State;
  };

  export type TransitionSkippedInfo<State extends string, Ev extends MachineEvent> = {
    readonly event: Ev;
    readonly from: State;
    readonly reason: 'guard_failed' | 'no_transition';
  };

  export type InvokeDebugInfo<State extends string, Ctx extends object, Ev extends MachineEvent> = {
    readonly context: Readonly<Ctx>;
    readonly event: Ev | LifecycleEvent;
    readonly invokeId: number;
    readonly state: State;
  };

  export type DebugHooks<State extends string, Ctx extends object, Ev extends MachineEvent> = {
    onEvaluateGuard?: (info: GuardEvaluationInfo<State, Ctx, Ev>) => void;
    onInvokeAbort?: (info: InvokeDebugInfo<State, Ctx, Ev>) => void;
    onInvokeDone?: (info: InvokeDebugInfo<State, Ctx, Ev> & { readonly result: unknown }) => void;
    onInvokeError?: (info: InvokeDebugInfo<State, Ctx, Ev> & { readonly error: unknown }) => void;
    onInvokeStart?: (info: InvokeDebugInfo<State, Ctx, Ev>) => void;
    onTransitionSkipped?: (info: TransitionSkippedInfo<State, Ev>) => void;
  };

  export type TransitionTraceEntry<State extends string, Ev extends MachineEvent> = {
    readonly event: Ev;
    readonly from: State;
    readonly invokeId?: number;
    readonly timestamp: number;
    readonly to: State;
  };

  export type InterpretOptions<State extends string, Ctx extends object, Ev extends MachineEvent> = {
    context?: Ctx;
    debug?: DebugHooks<State, Ctx, Ev>;
    maxTransitionsPerFlush?: number;
    persistence?: PersistenceAdapter<State, Ctx>;
    snapshot?: MachineSnapshot<State, Ctx>;
    traceLimit?: number;
    validateSnapshot?: ContextValidator<Ctx>;
  };

  export type TransitionResolution<State extends string, Ctx extends object, Ev extends MachineEvent> = {
    readonly transition: TransitionDef<State, Ctx, Ev>;
  };

  export type MachinitErrorCode =
    | 'MACHINIT_INVALID_INITIAL_STATE'
    | 'MACHINIT_INVALID_MAX_TRANSITIONS_PER_FLUSH'
    | 'MACHINIT_INVALID_SNAPSHOT_STATE'
    | 'MACHINIT_INVALID_TRANSITION'
    | 'MACHINIT_INVALID_TRANSITION_ARRAY'
    | 'MACHINIT_INVALID_TRANSITION_HANDLER'
    | 'MACHINIT_INVALID_TYPE_HANDLER'
    | 'MACHINIT_INVALID_TYPE_IN_TRANSITION'
    | 'MACHINIT_INVALID_VALIDATE_CONTEXT'
    | 'MACHINIT_TRANSITION_LOOP_GUARD'
    | 'MACHINIT_UNKNOWN_TARGET';

  export class MachinitError extends Error {
    readonly code: MachinitErrorCode;
    readonly details?: Record<string, unknown>;
    constructor(code: MachinitErrorCode, message: string, details?: Record<string, unknown>);
  }

  export interface MachineInstance<State extends string, Ctx extends object, Ev extends MachineEvent> {
    readonly context: import('@vielzeug/stateit').ReadonlySignal<Ctx>;
    readonly state: import('@vielzeug/stateit').ReadonlySignal<State>;
    can(event: Ev): boolean;
    getSnapshot(): MachineSnapshot<State, Ctx>;
    getTrace(): readonly TransitionTraceEntry<State, Ev>[];
    send(event: Ev): boolean;
    [Symbol.dispose](): void;
  }

  export function defineMachine<State extends string, Ctx extends object, Ev extends MachineEvent>(
    config: MachineConfig<State, Ctx, Ev>,
  ): MachineDefinition<State, Ctx, Ev>;

  export function interpret<State extends string, Ctx extends object, Ev extends MachineEvent>(
    definition: MachineDefinition<State, Ctx, Ev>,
    options?: InterpretOptions<State, Ctx, Ev>,
  ): MachineInstance<State, Ctx, Ev>;

  export function resolveTransition<State extends string, Ctx extends object, Ev extends MachineEvent>(
    definition: MachineDefinition<State, Ctx, Ev>,
    input: {
      context: Readonly<Ctx>;
      debug?: DebugHooks<State, Ctx, Ev>;
      event: Ev;
      state: State;
    },
  ): TransitionResolution<State, Ctx, Ev> | undefined;

  export function assign<Ctx extends object, Ev extends MachineEvent = MachineEvent>(
    fn: (args: ActionArgs<Ctx, Ev>) => Partial<Ctx>,
  ): ActionFn<Ctx, Ev>;
}
`;
