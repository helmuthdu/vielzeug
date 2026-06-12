export const clockworkTypes = `
declare module '/clockwork' {
  export type MachineEvent = { [key: string]: unknown; type: string };

  export type EventType<Ev extends MachineEvent> = Ev['type'] & string;

  export type EventByType<Ev extends MachineEvent, Type extends EventType<Ev>> = Extract<Ev, { type: Type }>;

  export type LifecycleEvent =
    | { readonly type: '$init' }
    | { readonly type: '$hydrate' }
    | { readonly delay: number; readonly type: '$after' };

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

  export type LifecycleFn<Ctx extends object, Ev extends MachineEvent = MachineEvent> = (args: {
    context: Ctx;
    readonly event: Ev | LifecycleEvent;
  }) => void;

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

  export type AfterDef<State extends string, Ctx extends object> = {
    actions?: Array<(args: { context: Ctx; readonly event: { readonly delay: number; readonly type: '$after' } }) => void>;
    delay: number;
    guard?: (args: { readonly context: Readonly<Ctx> }) => boolean;
    target: State;
  };

  export type InvokeSourceArgs<Ctx extends object, Ev extends MachineEvent> = {
    readonly context: Readonly<Ctx>;
    readonly entryEvent: Ev | LifecycleEvent;
    readonly signal: AbortSignal;
  };

  export type InvokeDispatchArgs<Ctx extends object, Ev extends MachineEvent> = {
    readonly context: Readonly<Ctx>;
    readonly entryEvent: Ev | LifecycleEvent;
  };

  export type InvokeDef<Ctx extends object, Ev extends MachineEvent> = {
    onDone?: (result: unknown, args: InvokeDispatchArgs<Ctx, Ev>) => Ev;
    onError?: (error: unknown, args: InvokeDispatchArgs<Ctx, Ev>) => Ev;
    src: (args: InvokeSourceArgs<Ctx, Ev>) => Promise<unknown>;
  };

  export type StateNode<State extends string, Ctx extends object, Ev extends MachineEvent> = {
    after?: Array<AfterDef<State, Ctx>>;
    entry?: LifecycleFn<Ctx, Ev>;
    exit?: LifecycleFn<Ctx, Ev>;
    initial?: string;
    invoke?: Array<InvokeDef<Ctx, Ev>>;
    on?: Partial<{ [Type in EventType<Ev>]: TransitionInput<State, Ctx, Ev, Type> }>;
    states?: Record<string, StateNode<string, Ctx, Ev>>;
  };

  export type ContextValidator<Ctx extends object> = (context: Ctx) => boolean;

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
    load: () => MachineSnapshot<State, Ctx> | undefined;
    save: (snapshot: MachineSnapshot<State, Ctx>) => void;
  };

  export type DebugEvent<State extends string, Ctx extends object, Ev extends MachineEvent> =
    | { context: Readonly<Ctx>; event: Ev; from: State; passed: boolean; target: State; type: 'guard' }
    | { event: Ev; from: State; type: 'transition-skipped' }
    | { context: Readonly<Ctx>; event: Ev | LifecycleEvent; invokeId: number; state: State; type: 'invoke-start' }
    | { context: Readonly<Ctx>; event: Ev | LifecycleEvent; invokeId: number; result: unknown; state: State; type: 'invoke-done' }
    | { context: Readonly<Ctx>; error: unknown; event: Ev | LifecycleEvent; invokeId: number; state: State; type: 'invoke-error' }
    | { context: Readonly<Ctx>; event: Ev | LifecycleEvent; invokeId: number; state: State; type: 'invoke-abort' };

  export type DebugOptions<State extends string, Ctx extends object, Ev extends MachineEvent> = {
    onDebug?: (event: DebugEvent<State, Ctx, Ev>) => void;
    onTransition?: (info: { event: Ev | LifecycleEvent; from: State; to: State }) => void;
    traceLimit?: number;
  };

  export type MiddlewareFn<State extends string, Ctx extends object, Ev extends MachineEvent> = (
    event: Ev,
    snapshot: { readonly context: Readonly<Ctx>; readonly state: State },
    next: () => boolean,
  ) => boolean;

  export type TransitionTraceEntry<State extends string, Ev extends MachineEvent> = {
    readonly event: Ev | LifecycleEvent;
    readonly from: State;
    readonly timestamp: number;
    readonly to: State;
  };

  export type InterpretOptions<State extends string, Ctx extends object, Ev extends MachineEvent> = {
    clone?: <T>(value: T) => T;
    debug?: DebugOptions<State, Ctx, Ev>;
    maxTransitionsPerFlush?: number;
    middleware?: Array<MiddlewareFn<State, Ctx, Ev>>;
    persistence?: PersistenceAdapter<State, Ctx>;
    snapshot?: MachineSnapshot<State, Ctx>;
  };

  export type MachineErrorCode =
    | 'MACHINE_INVALID_AFTER_DELAY'
    | 'MACHINE_INVALID_INITIAL_STATE'
    | 'MACHINE_INVALID_MAX_TRANSITIONS_PER_FLUSH'
    | 'MACHINE_INVALID_SNAPSHOT_STATE'
    | 'MACHINE_INVALID_TRANSITION_ARRAY'
    | 'MACHINE_INVALID_VALIDATE_CONTEXT'
    | 'MACHINE_MISSING_COMPOUND_INITIAL'
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
    getSnapshot(): MachineSnapshot<State, Ctx>;
    getTrace(): readonly TransitionTraceEntry<State, Ev>[];
    matches(...states: string[]): boolean;
    send(event: Ev): boolean;
    subscribe(fn: (snapshot: MachineSnapshot<State, Ctx>) => void): () => void;
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
}
`;
