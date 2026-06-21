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

  export type GuardFn<Ctx extends object, Ev extends MachineEvent = MachineEvent> = (args: {
    readonly context: Readonly<Ctx>;
    readonly event: Readonly<Ev>;
  }) => boolean;

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

  export type AfterEvent = { readonly delay: number; readonly type: '$after' };

  export type AfterActionFn<Ctx extends object> = (args: { context: Ctx; readonly event: AfterEvent }) => void;

  export type AfterDef<State extends string, Ctx extends object> = {
    actions?: Array<(args: { context: Ctx; readonly event: { readonly delay: number; readonly type: '$after' } }) => void>;
    delay: number;
    guard?: (args: { readonly context: Readonly<Ctx> }) => boolean;
    target: State;
  };

  export type InvokeArgs<Ctx extends object, Ev extends MachineEvent> = {
    readonly context: Readonly<Ctx>;
    readonly entryEvent: Ev | LifecycleEvent;
    readonly signal: AbortSignal;
  };

  export type InvokeDef<Ctx extends object, Ev extends MachineEvent, Result = unknown> = {
    /** Optional label surfaced in DebugEvent for traceability. Defaults to an auto-incremented id. */
    id?: string;
    onDone?: (result: Result, context: Readonly<Ctx>) => Ev;
    onError?: (error: unknown, context: Readonly<Ctx>) => Ev;
    src: (args: InvokeArgs<Ctx, Ev>) => Promise<Result>;
  };

  export type StateNode<State extends string, Ctx extends object, Ev extends MachineEvent> = {
    after?: Array<AfterDef<State, Ctx>>;
    entry?: LifecycleFn<Ctx, Ev>;
    exit?: LifecycleFn<Ctx, Ev>;
    initial?: string;
    invoke?: Array<InvokeDef<Ctx, Ev, any>>;
    on?: Partial<{ [Type in EventType<Ev>]: TransitionInput<State, Ctx, Ev, Type> }>;
    states?: Record<string, StateNode<string, Ctx, Ev>>;
  };

  export type ContextValidator<Ctx extends object> = (context: Ctx) => string | true;

  export type MachineConfig<State extends string, Ctx extends object, Ev extends MachineEvent> = {
    context?: Ctx;
    initial: State;
    states: { [S in State]: StateNode<State, Ctx, Ev> };
    validateContext?: ContextValidator<Ctx>;
  };

  export type MachineSnapshot<State extends string, Ctx extends object> = {
    readonly context: Readonly<Ctx>;
    readonly state: State;
  };

  export type PersistenceAdapter<State extends string, Ctx extends object> = {
    load: () => MachineSnapshot<State, Ctx> | undefined;
    save: (snapshot: MachineSnapshot<State, Ctx>) => void;
  };

  export type DebugEvent<State extends string, Ctx extends object, Ev extends MachineEvent> =
    | { context: Readonly<Ctx>; event: Ev; from: State; passed: boolean; target: State; type: 'guard' }
    | { event: Ev | LifecycleEvent; from: State; to: State; type: 'transition' }
    | { event: Ev; from: State; type: 'transition-skipped' }
    | { context: Readonly<Ctx>; event: Ev | LifecycleEvent; invokeId: string; state: State; type: 'invoke-start' }
    | { context: Readonly<Ctx>; event: Ev | LifecycleEvent; invokeId: string; result: unknown; state: State; type: 'invoke-done' }
    | { context: Readonly<Ctx>; error: unknown; event: Ev | LifecycleEvent; invokeId: string; state: State; type: 'invoke-error' }
    | { context: Readonly<Ctx>; event: Ev | LifecycleEvent; invokeId: string; state: State; type: 'invoke-abort' };

  /**
   * Pure event interceptor. Return the event (possibly transformed) to allow it,
   * or null to block it. Runs left-to-right; first null wins.
   */
  export type InterceptorFn<State extends string, Ctx extends object, Ev extends MachineEvent> = (
    event: Ev,
    snapshot: { readonly context: Readonly<Ctx>; readonly state: State },
  ) => Ev | null;

  export type TransitionTraceEntry<State extends string, Ev extends MachineEvent> = {
    readonly event: Ev | LifecycleEvent;
    readonly from: State;
    readonly timestamp: number;
    readonly to: State;
  };

  export type InterpretOptions<State extends string, Ctx extends object, Ev extends MachineEvent> = {
    clone?: <T>(value: T) => T;
    interceptors?: Array<InterceptorFn<State, Ctx, Ev>>;
    maxTransitionsPerFlush?: number;
    onDebug?: (event: DebugEvent<State, Ctx, Ev>) => void;
    persistence?: PersistenceAdapter<State, Ctx>;
    snapshot?: MachineSnapshot<State, Ctx>;
    /** Ring buffer capacity for getTrace(). Defaults to 50 when onDebug is set; 0 (disabled) otherwise. */
    traceLimit?: number;
  };

  export type SendResult = {
    readonly status: 'queued' | 'rejected' | 'transitioned';
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
    static is(value: unknown): value is MachineError;
  }

  export const MachineErrorCode: Record<MachineErrorCode, MachineErrorCode>;

  export interface MachineInstance<State extends string, Ctx extends object, Ev extends MachineEvent> {
    readonly context: import('/ripple').Reactive<Ctx>;
    readonly disposalSignal: AbortSignal;
    readonly disposed: boolean;
    readonly state: import('/ripple').Reactive<State>;
    can(event: Ev): boolean;
    dispose(): void;
    getSnapshot(): MachineSnapshot<State, Ctx>;
    getTrace(): readonly TransitionTraceEntry<State, Ev>[];
    matches(...states: string[]): boolean;
    send(event: Ev): SendResult;
    subscribe(fn: (snapshot: MachineSnapshot<State, Ctx>) => void): () => void;
    [Symbol.dispose](): void;
  }

  export interface MachineDefinition<State extends string, Ctx extends object, Ev extends MachineEvent> {
    resolve(
      input: { context: Readonly<Ctx>; event: Ev; state: State },
      options?: {
        onGuard?: (info: { context: Readonly<Ctx>; event: Ev; from: State; passed: boolean; target: State }) => void;
      },
    ): TransitionDef<State, Ctx, Ev> | undefined;
    start(options?: InterpretOptions<State, Ctx, Ev>): MachineInstance<State, Ctx, Ev>;
  }

  /**
   * Validates a machine configuration and returns a reusable definition handle.
   * Call .start(options) to create a running instance.
   * Call .resolve(input, options) to inspect transitions without starting a machine.
   */
  export function createMachine<State extends string, Ctx extends object, Ev extends MachineEvent>(
    config: MachineConfig<State, Ctx, Ev>,
  ): MachineDefinition<State, Ctx, Ev>;

  export type MachineSchema<S extends string, C extends object, E extends MachineEvent> = {
    readonly _c: C;
    readonly _e: E;
    readonly _s: S;
  };
  export type MachineTypeConfig<T extends MachineSchema<any, any, any>> = MachineConfig<T['_s'], T['_c'], T['_e']>;
  export type MachineTypeDefinition<T extends MachineSchema<any, any, any>> = MachineDefinition<T['_s'], T['_c'], T['_e']>;
  export type MachineTypeInstance<T extends MachineSchema<any, any, any>> = MachineInstance<T['_s'], T['_c'], T['_e']>;
  export type MachineTypeOptions<T extends MachineSchema<any, any, any>> = InterpretOptions<T['_s'], T['_c'], T['_e']>;
  export type MachineAction<T extends MachineSchema<any, any, any>, E extends T['_e'] = T['_e']> = ActionFn<T['_c'], E>;
  export type MachineGuard<T extends MachineSchema<any, any, any>, E extends T['_e'] = T['_e']> = GuardFn<T['_c'], E>;
}
`;
