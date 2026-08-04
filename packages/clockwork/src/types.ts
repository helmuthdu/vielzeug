export type MachineEvent = { readonly type: string };

export type EventType<Event extends MachineEvent> = Event['type'] & string;

export type EventByType<Event extends MachineEvent, Type extends EventType<Event>> = Extract<Event, { type: Type }>;

export type MachineSnapshot<State extends string, Context extends Record<string, unknown>> = {
  readonly context: Readonly<Context>;
  readonly state: State;
};

export type Guard<Context extends Record<string, unknown>, Event> = (args: {
  readonly context: Readonly<Context>;
  readonly event: Event;
}) => boolean;

/** A pure context update. Return the next context instead of mutating the current one. */
export type Reducer<Context extends Record<string, unknown>, Event> = (args: {
  readonly context: Readonly<Context>;
  readonly event: Event;
}) => Context;

export type EffectArgs<Context extends Record<string, unknown>, Event extends MachineEvent> = {
  readonly context: Readonly<Context>;
  readonly event: Event | undefined;
  readonly send: (event: Event) => void;
  readonly signal: AbortSignal;
};

/** A post-commit side effect. Effects cannot update machine context. */
export type Effect<Context extends Record<string, unknown>, Event extends MachineEvent> = (
  args: EffectArgs<Context, Event>,
) => void;

export type Transition<
  State extends string,
  Context extends Record<string, unknown>,
  Event extends MachineEvent,
  Type extends EventType<Event> = EventType<Event>,
> = {
  readonly effects?: readonly Effect<Context, Event>[];
  readonly guard?: Guard<Context, EventByType<Event, Type>>;
  readonly reduce?: Reducer<Context, EventByType<Event, Type>>;
  readonly target: State;
};

export type TransitionInput<
  State extends string,
  Context extends Record<string, unknown>,
  Event extends MachineEvent,
  Type extends EventType<Event> = EventType<Event>,
> = Transition<State, Context, Event, Type> | readonly Transition<State, Context, Event, Type>[];

export type After<State extends string, Context extends Record<string, unknown>, Event extends MachineEvent> = {
  readonly delay: number;
  readonly effects?: readonly Effect<Context, Event>[];
  readonly guard?: Guard<Context, Event | undefined>;
  readonly reduce?: Reducer<Context, Event | undefined>;
  readonly target: State;
};

export type InvokeArgs<Context extends Record<string, unknown>, Event extends MachineEvent> = {
  readonly context: Readonly<Context>;
  readonly event: Event | undefined;
  readonly signal: AbortSignal;
};

export type Invoke<Context extends Record<string, unknown>, Event extends MachineEvent, Result = unknown> = {
  readonly onDone?: (args: { readonly context: Readonly<Context>; readonly result: Result }) => Event;
  readonly onError?: (args: { readonly context: Readonly<Context>; readonly error: unknown }) => Event;
  readonly src: (args: InvokeArgs<Context, Event>) => Promise<Result> | Result;
};

export type StateNode<State extends string, Context extends Record<string, unknown>, Event extends MachineEvent> = {
  readonly after?: readonly After<State, Context, Event>[];
  readonly entry?: readonly Effect<Context, Event>[];
  readonly exit?: readonly Effect<Context, Event>[];
  readonly invoke?: readonly Invoke<Context, Event>[];
  readonly on?: Partial<{ [Type in EventType<Event>]: TransitionInput<State, Context, Event, Type> }>;
};

type ContextConfig<Context extends Record<string, unknown>> = keyof Context extends never
  ? { readonly context?: Context }
  : { readonly context: Context };

/** A flat finite-state-machine definition. State nodes cannot contain child states. */
export type MachineConfig<
  State extends string,
  Context extends Record<string, unknown>,
  Event extends MachineEvent,
> = ContextConfig<Context> & {
  readonly initial: State;
  readonly states: Record<State, StateNode<State, Context, Event>>;
};

export type TransitionResult<State extends string, Context extends Record<string, unknown>> = {
  readonly snapshot: MachineSnapshot<State, Context>;
  readonly type: 'ignored' | 'transition';
};

export type ActorErrorContext<State extends string, Event extends MachineEvent> = {
  readonly event?: Event;
  readonly phase: 'effect' | 'invoke' | 'subscriber' | 'transition';
  readonly state: State;
};

export type ActorErrorDisposition = 'continue' | 'dispose';

export type ActorOptions<State extends string, Context extends Record<string, unknown>, Event extends MachineEvent> = {
  readonly maxTransitions?: number;
  readonly onError?: (error: unknown, context: ActorErrorContext<State, Event>) => ActorErrorDisposition;
  readonly snapshot?: MachineSnapshot<State, Context>;
};

export type Actor<State extends string, Context extends Record<string, unknown>, Event extends MachineEvent> = {
  [Symbol.dispose](): void;
  can(event: Event): boolean;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  send(event: Event): void;
  readonly snapshot: MachineSnapshot<State, Context>;
  subscribe(listener: (snapshot: MachineSnapshot<State, Context>) => void): () => void;
};

export type Machine<State extends string, Context extends Record<string, unknown>, Event extends MachineEvent> = {
  can(snapshot: MachineSnapshot<State, Context>, event: Event): boolean;
  createActor(options?: ActorOptions<State, Context, Event>): Actor<State, Context, Event>;
  readonly initialSnapshot: MachineSnapshot<State, Context>;
  transition(snapshot: MachineSnapshot<State, Context>, event: Event): TransitionResult<State, Context>;
};
