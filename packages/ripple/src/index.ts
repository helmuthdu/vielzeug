export type {
  Cleanup,
  ComputedOptions,
  Disposable,
  EffectHandle,
  EffectOptions,
  Equality,
  ReactiveErrorContext,
  ReactiveEvent,
  ReactiveObserver,
  Readable,
  RippleOptions,
  Scope,
  Signal,
  SignalOptions,
  Unsubscribe,
} from './types';

export { RippleComputedCycleError, RippleDisposedScopeError, RippleError, RippleInfiniteLoopError } from './errors';
export { isReactive } from './runtime';

import type {
  Cleanup,
  ComputedOptions,
  EffectHandle,
  EffectOptions,
  Readable,
  RippleOptions,
  Scope,
  Signal,
  SignalOptions,
} from './types';

import { createResource, type Resource, type ResourceOptions } from './_async';
import { createStore as createStoreFactory, type Store, type StoreOptions } from './_store';
import { createWatch, type WatchOptions } from './_watch';
import { ReactiveRuntime } from './runtime';

export interface Ripple {
  batch<T>(fn: () => T): T;
  computed<T>(derive: () => T, options?: ComputedOptions<T>): Readable<T>;
  createScope(name?: string): Scope;
  createStore<T>(initial: T, options?: StoreOptions): Store<T>;
  dispose(): void;
  effect(callback: () => Cleanup | void, options?: EffectOptions): EffectHandle;
  resource<Source, Value>(
    source: () => Source,
    loader: (source: Source, context: { readonly signal: AbortSignal }) => Promise<Value>,
    options?: ResourceOptions,
  ): Resource<Value>;
  signal<T>(initial: T, options?: SignalOptions<T>): Signal<T>;
  untrack<T>(fn: () => T): T;
  watch<T>(
    source: Readable<T> | (() => T),
    callback: (value: T, previous: T | undefined) => void,
    options?: WatchOptions<T>,
  ): EffectHandle;
}

/** Creates one complete reactive graph. All factories on the object share its runtime. */
export const createRipple = (options?: RippleOptions): Ripple => {
  const runtime = new ReactiveRuntime(options);
  const resource = createResource(runtime);
  const createStore = createStoreFactory(runtime);

  return {
    batch: runtime.batch,
    computed: runtime.computed,
    createScope: runtime.createScope,
    createStore,
    dispose: () => runtime.dispose(),
    effect: runtime.effect,
    resource,
    signal: runtime.signal,
    untrack: runtime.untrack,
    watch: createWatch(runtime),
  };
};

const defaultRipple = createRipple();

export const signal = defaultRipple.signal;
export const computed = defaultRipple.computed;
export const effect = defaultRipple.effect;
export const batch = defaultRipple.batch;
export const createScope = defaultRipple.createScope;
export const createStore = defaultRipple.createStore;
export const resource = defaultRipple.resource;
export const untrack = defaultRipple.untrack;
export const watch = defaultRipple.watch;
