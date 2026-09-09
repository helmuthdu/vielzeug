import { createResource, type Resource, type ResourceOptions } from './_async';
import { type BridgedReadable, createFromSubscribable, type FromSubscribableOptions } from './_subscribable';
import { createWatch, type WatchOptions } from './_watch';
import { ReactiveRuntime } from './runtime';
import type {
  Cleanup,
  ComputedOptions,
  Disposable,
  EffectHandle,
  EffectOptions,
  Readable,
  RippleEvent,
  RippleOptions,
  Scope,
  Signal,
  SignalOptions,
  Subscribable,
  Unsubscribe,
} from './types';

export interface Ripple extends Disposable {
  batch<T>(fn: () => T): T;
  computed<T>(derive: () => T, options?: ComputedOptions<T>): Readable<T>;
  createScope(name?: string): Scope;
  effect(callback: () => Cleanup | undefined, options?: EffectOptions): EffectHandle;
  fromSubscribable<T>(source: Subscribable<T>, options?: FromSubscribableOptions): BridgedReadable<T>;
  resource<Source, Value>(
    source: () => Source,
    loader: (source: Source, context: { readonly signal: AbortSignal }) => Promise<Value>,
    options?: ResourceOptions,
  ): Resource<Value>;
  signal<T>(initial: T, options?: SignalOptions<T>): Signal<T>;
  tap(handler: (event: RippleEvent) => void, options?: { signal?: AbortSignal }): Unsubscribe;
  untrack<T>(fn: () => T): T;
  watch<T>(
    source: Readable<T> | (() => T),
    callback: (value: T, previous: T | undefined) => void,
    options?: WatchOptions<T>,
  ): EffectHandle;
}

/**
 * Creates one complete reactive graph with its own ownership boundary. All
 * factories on the returned object share its runtime. Use this for tests, SSR
 * requests, embedded applications, or independently disposable features.
 * `dispose()` is terminal — create a new graph for a new lifetime.
 */
export const createRipple = (options?: RippleOptions): Ripple => {
  const runtime = new ReactiveRuntime(options);
  const fromSubscribable = createFromSubscribable(runtime);
  const resource = createResource(runtime);

  return {
    batch: runtime.batch,
    computed: runtime.computed,
    createScope: runtime.createScope,
    get disposalSignal() {
      return runtime.disposalSignal;
    },
    dispose: () => runtime.dispose(),
    get disposed() {
      return runtime.disposed;
    },
    effect: runtime.effect,
    fromSubscribable,
    resource,
    signal: runtime.signal,
    tap: runtime.tap,
    untrack: runtime.untrack,
    watch: createWatch(runtime),
    [Symbol.dispose]: () => runtime.dispose(),
  };
};

/**
 * The shared default reactive graph — process-lifetime. Root helpers
 * (`signal`, `computed`, `effect`, `batch`, `createScope`, `untrack`, `watch`, `resource`, `fromSubscribable`)
 * are re-exported from the package root as bound methods on this single graph
 * instance. Use these only when the application has one graph for its entire
 * lifetime; they are never disposed. For isolated, disposable graphs (tests,
 * SSR, embedded features) use `createRipple()` instead.
 */
export const defaultRipple = createRipple();
