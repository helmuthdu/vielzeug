export type Teardown = () => void;

export type Subscription = {
  [Symbol.dispose](): void;
  readonly closed: boolean;
  unsubscribe(): void;
};

export type Observer<T> = {
  complete?: () => void;
  error?: (reason: unknown) => void;
  next: (value: T) => void;
};

export type SubscribeOptions = {
  signal?: AbortSignal;
};

export type Sink<T> = {
  complete(): void;
  error(reason: unknown): void;
  next(value: T): void;
};

export type Producer<T> = (sink: Sink<T>, signal: AbortSignal) => Teardown | void;

export type Operator<A = unknown, B = unknown> = (source: Stream<A>) => Stream<B>;

/** Streams describe reusable work. Subscriptions own lifetime. */
export interface Stream<T> {
  subscribe(observer: Observer<T> | ((value: T) => void), options?: SubscribeOptions): Subscription;
}

export type OverflowPolicy = 'drop-newest' | 'drop-oldest' | 'error';

export type AsyncIterableOptions = {
  capacity: number;
  overflow: OverflowPolicy;
  signal?: AbortSignal;
};

type PipeResult<Input, Operators extends readonly unknown[]> = Operators extends readonly [
  Operator<Input, infer Output>,
  ...infer Remaining,
]
  ? PipeResult<Output, Remaining>
  : Stream<Input>;

export type ValidPipe<Input, Operators extends readonly unknown[]> = Operators extends readonly []
  ? []
  : Operators extends readonly [Operator<Input, infer Output>, ...infer Remaining]
    ? [Operator<Input, Output>, ...ValidPipe<Output, Remaining>]
    : never;

export type PipedStream<Input, Operators extends readonly unknown[]> = PipeResult<Input, Operators>;
