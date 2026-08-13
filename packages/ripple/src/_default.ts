import { createResource, type Resource, type ResourceOptions } from './_async';
import { createStore as createStoreFactory, type Store, type StoreOptions } from './_store';
import { createWatch, type WatchOptions } from './_watch';
import { ReactiveRuntime } from './runtime';
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

export interface Ripple {
  batch<T>(fn: () => T): T;
  computed<T>(derive: () => T, options?: ComputedOptions<T>): Readable<T>;
  createScope(name?: string): Scope;
  createStore<T>(initial: T, options?: StoreOptions): Store<T>;
  dispose(): void;
  readonly disposed: boolean;
  effect(callback: () => Cleanup | undefined, options?: EffectOptions): EffectHandle;
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
    get disposed() {
      return runtime.disposed;
    },
    effect: runtime.effect,
    resource,
    signal: runtime.signal,
    untrack: runtime.untrack,
    watch: createWatch(runtime),
  };
};

/**
 * The shared default reactive graph. Private — `resource`/`createStore`/`watch` are reachable
 * only through their dedicated subpaths (`./async`, `./store`, `./watch`), never re-exported
 * from the package root, so there's exactly one canonical import path for each instead of two
 * that resolve to the same binding.
 */
export const defaultRipple = createRipple();
