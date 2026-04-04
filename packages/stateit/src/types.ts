export type CleanupFn = () => void;

export type EffectCallback = () => CleanupFn | void;

export type EqualityFn<T> = (a: T, b: T) => boolean;

export type ReactiveOptions<T> = { equals?: EqualityFn<T> };

export interface Subscription {
  (): void;
  dispose(): void;
  [Symbol.dispose](): void;
}

export interface ReadonlySignal<T> {
  readonly value: T;
}

export interface Signal<T> extends ReadonlySignal<T> {
  value: T;
  update(fn: (current: T) => T): void;
}

export interface ComputedSignal<T> extends ReadonlySignal<T> {
  readonly stale: boolean;
  dispose(): void;
  [Symbol.dispose](): void;
}

export type EffectOptions = {
  maxIterations?: number;
};

export type WatchOptions<T> = {
  equals?: EqualityFn<T>;
  immediate?: boolean;
  once?: boolean;
};

export interface Store<T extends object> {
  readonly value: T;
  patch(partial: Partial<T>): void;
  update(fn: (state: T) => T): void;
  reset(): void;
}
