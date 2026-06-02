export const clockworkTypes = `
declare module '/clockwork' {
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

  export type EntryFn<Ctx extends object> = (args: { context: Ctx }) => void;

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

  export type TransitionInput<
    State extends string,
    Ctx extends object,
    Ev extends MachineEvent,
    Type extends EventType<Ev> = EventType<Ev>,
  > = TransitionDef<State, Ctx, Ev, Type> | Array<TransitionDef<State, Ctx, Ev, Type>>;

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
    entry?: EntryFn<Ctx>;
    exit?: ActionFn<Ctx, Ev>;
    invoke?: Array<InvokeDef<Ctx, Ev>>;
    on?: Partial<{ [Type in EventType<Ev>]: TransitionInput<State, Ctx, Ev, Type> }>;
  };

  export type ContextValidator<Ctx extends object> = (context: unknown) => context is Ctx;

  export type MachineConfig<State extends string, Ctx extends object, Ev extends MachineEvent> = {
    context?: Ctx;
    initial: State;
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
    clone?: <T>(value: T) => T;
    debug?: DebugHooks<State, Ctx, Ev>;
    maxTransitionsPerFlush?: number;
    onTransition?: (info: { event: Ev; from: State; to: State }) => void;
    persistence?: PersistenceAdapter<State, Ctx>;
    snapshot?: MachineSnapshot<State, Ctx>;
    traceLimit?: number;
    validateSnapshot?: ContextValidator<Ctx>;
  };

  export type MachineErrorCode =
    | 'MACHINE_INVALID_INITIAL_STATE'
    | 'MACHINE_INVALID_MAX_TRANSITIONS_PER_FLUSH'
    | 'MACHINE_INVALID_SNAPSHOT_STATE'
    | 'MACHINE_INVALID_TRANSITION'
    | 'MACHINE_INVALID_TRANSITION_ARRAY'
    | 'MACHINE_INVALID_TRANSITION_HANDLER'
    | 'MACHINE_INVALID_TYPE_HANDLER'
    | 'MACHINE_INVALID_TYPE_IN_TRANSITION'
    | 'MACHINE_INVALID_VALIDATE_CONTEXT'
    | 'MACHINE_TRANSITION_LOOP_GUARD'
    | 'MACHINE_UNKNOWN_TARGET';

  export class MachineError extends Error {
    readonly code: MachineErrorCode;
    readonly details?: Record<string, unknown>;
    constructor(code: MachineErrorCode, message: string, details?: Record<string, unknown>);
  }

  export interface MachineInstance<State extends string, Ctx extends object, Ev extends MachineEvent> {
    readonly context: import('/ripple').ReadonlySignal<Ctx>;
    readonly state: import('/ripple').ReadonlySignal<State>;
    can(event: Ev): boolean;
    clearPersistence(): void;
    getSnapshot(): MachineSnapshot<State, Ctx>;
    getTrace(): readonly TransitionTraceEntry<State, Ev>[];
    matches(...states: State[]): boolean;
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
      event: Ev;
      state: State;
    },
  ): TransitionDef<State, Ctx, Ev> | undefined;

  export function assign<Ctx extends object, Ev extends MachineEvent = MachineEvent>(
    fn: (args: ActionArgs<Ctx, Ev>) => Partial<Ctx>,
  ): ActionFn<Ctx, Ev>;
}
`;
