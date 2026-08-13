export type Cleanup = () => void;
export type Equality<T> = (previous: T, next: T) => boolean;
export type Unsubscribe = () => void;

export type SignalOptions<T> = {
  equals?: Equality<T>;
  name?: string;
};

export type ComputedOptions<T> = {
  equals?: Equality<T>;
  name?: string;
};

export type EffectOptions = {
  name?: string;
  scheduler?: 'microtask' | 'sync';
};

export interface Readable<T> {
  readonly name?: string;
  peek(): T;
  subscribe(listener: () => void): Unsubscribe;
  readonly value: T;
}

export interface Signal<T> extends Readable<T> {
  value: T;
}

export interface Disposable {
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  [Symbol.dispose](): void;
}

export type EffectHandle = Disposable;

export interface Scope extends Disposable {
  run<T>(fn: () => T): T;
}

export type ReactiveEvent =
  | { readonly kind: 'compute'; readonly name?: string }
  | { readonly kind: 'effect'; readonly name?: string }
  | { readonly kind: 'write'; readonly name?: string; readonly next: unknown; readonly previous: unknown }
  | { readonly kind: 'dispose'; readonly name?: string; readonly node: 'effect' | 'scope' };

export type ReactiveObserver = (event: ReactiveEvent) => void;

export type ReactiveErrorContext = {
  readonly kind: 'cleanup' | 'effect' | 'listener' | 'observer';
  readonly name?: string;
};

export type RippleOptions = {
  observer?: ReactiveObserver;
  onError?: (error: unknown, context: ReactiveErrorContext) => void;
};
