import {
  RippleComputedCycleError,
  RippleDisposedRuntimeError,
  RippleDisposedScopeError,
  RippleInfiniteLoopError,
} from './errors';
import type {
  Cleanup,
  ComputedOptions,
  EffectHandle,
  EffectOptions,
  Readable,
  RippleErrorContext,
  RippleErrorPolicy,
  RippleEvent,
  RippleOptions,
  Scope,
  Signal,
  SignalOptions,
  Unsubscribe,
} from './types';

export const REACTIVE = Symbol.for('@vielzeug/ripple/reactive');
const MAX_FLUSH_ITERATIONS = 100;
const UNSET = Symbol('ripple.unset');

type Dependency = ReactiveNode<unknown>;

type ObserverNode = {
  collecting?: Set<Dependency>;
  readonly dependencies: Set<Dependency>;
  onDependencyChanged(): void;
};

type Owned = {
  dispose(): void;
  setOwner(owner: ScopeNode | undefined): void;
};

abstract class ReactiveNode<T> {
  readonly [REACTIVE] = true;
  readonly dependents = new Set<ObserverNode>();
  readonly name: string | undefined;
  protected readonly runtime: ReactiveRuntime;

  protected constructor(runtime: ReactiveRuntime, name?: string) {
    this.runtime = runtime;
    this.name = name;
  }

  abstract peek(): T;
  abstract get value(): T;

  subscribe(listener: () => void): Unsubscribe {
    this.runtime.assertActive();
    this.peek();

    const observer: ObserverNode = {
      dependencies: new Set(),
      onDependencyChanged: () => this.runtime.enqueueListener(listener),
    };

    this.dependents.add(observer);

    return () => this.dependents.delete(observer);
  }

  protected notify(): void {
    for (const dependent of [...this.dependents]) dependent.onDependencyChanged();
  }
}

class SignalNode<T> extends ReactiveNode<T> implements Signal<T> {
  private current: T;
  private readonly equals: (previous: T, next: T) => boolean;

  constructor(runtime: ReactiveRuntime, initial: T, options?: SignalOptions<T>) {
    super(runtime, options?.name);
    this.current = initial;
    this.equals = options?.equals ?? Object.is;
  }

  get value(): T {
    this.runtime.track(this);

    return this.current;
  }

  set value(next: T) {
    this.runtime.assertActive();

    if (this.equals(this.current, next)) return;

    const previous = this.current;

    this.current = next;
    this.runtime.emit({ name: this.name, next, previous, type: 'write' });
    this.runtime.propagate(() => this.notify());
  }

  peek(): T {
    return this.current;
  }

  update(updater: (prev: T) => T): void {
    this.value = updater(this.current);
  }
}

class ComputedNode<T> extends ReactiveNode<T> implements ObserverNode, Owned {
  readonly dependencies = new Set<Dependency>();
  private computing = false;
  private disposed = false;
  private dirty = true;
  private current: T | typeof UNSET = UNSET;
  private readonly derive: () => T;
  private readonly equals: (previous: T, next: T) => boolean;
  private owner: ScopeNode | undefined;

  constructor(runtime: ReactiveRuntime, derive: () => T, options?: ComputedOptions<T>) {
    super(runtime, options?.name);
    this.derive = derive;
    this.equals = options?.equals ?? Object.is;
  }

  get value(): T {
    // Track before refresh: if refresh throws, the consumer still depends on
    // this computed and must be notified when a dependency change might let it
    // succeed. Without this, a first-run failure permanently severs the
    // consumer from the computed.
    this.runtime.track(this);
    this.refresh();

    return this.current as T;
  }

  peek(): T {
    this.refresh();

    return this.current as T;
  }

  onDependencyChanged(): void {
    if (this.disposed) return;

    if (!this.dirty) this.dirty = true;

    if (this.dependents.size > 0) {
      try {
        if (this.refresh()) this.notify();
      } catch (error) {
        this.runtime.report(error, { kind: 'computed', name: this.name });
      }
    }
  }

  setOwner(owner: ScopeNode | undefined): void {
    this.owner = owner;
  }

  dispose(): void {
    if (this.disposed) return;

    this.disposed = true;
    this.owner?.release(this);
    this.owner = undefined;
    this.runtime.clearDependencies(this);
    this.dependents.clear();
  }

  private refresh(): boolean {
    if (!this.dirty || this.disposed) return false;

    if (this.computing) {
      const label = this.name === undefined ? '' : ` "${this.name}"`;

      throw new RippleComputedCycleError(`computed cycle detected${label}`);
    }

    this.computing = true;
    this.runtime.emit({ name: this.name, type: 'compute' });

    try {
      const next = this.runtime.collect(this, this.derive);
      const changed = this.current === UNSET || !this.equals(this.current as T, next);

      this.current = next;
      this.dirty = false;

      return changed;
    } finally {
      this.computing = false;
    }
  }
}

class ScopeNode implements Scope, Owned {
  readonly disposalController = new AbortController();
  readonly owned = new Set<Owned>();
  readonly name: string | undefined;
  private isDisposed = false;
  private owner: ScopeNode | undefined;
  private readonly runtime: ReactiveRuntime;

  constructor(runtime: ReactiveRuntime, name?: string) {
    this.runtime = runtime;
    this.name = name;
  }

  get disposed(): boolean {
    return this.isDisposed;
  }

  get disposalSignal(): AbortSignal {
    return this.disposalController.signal;
  }

  own(value: Owned): void {
    value.setOwner(this);
    this.owned.add(value);
  }

  release(value: Owned): void {
    this.owned.delete(value);
  }

  setOwner(owner: ScopeNode | undefined): void {
    this.owner = owner;
  }

  run<T>(fn: () => T): T {
    if (this.isDisposed) throw new RippleDisposedScopeError('Cannot run a disposed scope.');

    return this.runtime.withScope(this, fn);
  }

  dispose(): void {
    if (this.isDisposed) return;

    this.isDisposed = true;
    this.owner?.release(this);
    this.owner = undefined;
    for (const owned of [...this.owned].reverse()) owned.dispose();
    this.owned.clear();
    this.disposalController.abort();
    this.runtime.emit({ name: this.name, node: 'scope', type: 'dispose' });
  }

  [Symbol.dispose](): void {
    this.dispose();
  }
}

class EffectNode implements ObserverNode, EffectHandle {
  readonly dependencies = new Set<Dependency>();
  readonly disposalController = new AbortController();
  private cleanup: Cleanup | undefined;
  private isDisposed = false;
  private ownershipScope: ScopeNode | undefined;
  private runScope: ScopeNode | undefined;
  private scheduled = false;
  private readonly callback: () => Cleanup | undefined;
  private readonly options: EffectOptions | undefined;
  private readonly runtime: ReactiveRuntime;

  constructor(runtime: ReactiveRuntime, callback: () => Cleanup | undefined, options?: EffectOptions) {
    this.runtime = runtime;
    this.callback = callback;
    this.options = options;
  }

  get disposed(): boolean {
    return this.isDisposed;
  }

  get disposalSignal(): AbortSignal {
    return this.disposalController.signal;
  }

  setOwner(owner: ScopeNode | undefined): void {
    this.ownershipScope = owner;
  }

  onDependencyChanged(): void {
    if (this.isDisposed) return;

    if (this.options?.scheduler === 'microtask') {
      if (this.scheduled) return;

      this.scheduled = true;
      queueMicrotask(() => {
        this.scheduled = false;

        if (!this.isDisposed) this.runtime.enqueue(this);
      });

      return;
    }

    this.runtime.enqueue(this);
  }

  run(): void {
    if (this.isDisposed) return;

    this.runScope?.dispose();
    this.runScope = undefined;
    this.runCleanup();
    this.runtime.emit({ name: this.options?.name, type: 'effect' });

    const owner = new ScopeNode(this.runtime);

    try {
      const cleanup = this.runtime.withEffectScope(owner, () => this.runtime.collectEffect(this, this.callback));

      this.runScope = owner;
      this.cleanup = typeof cleanup === 'function' ? cleanup : undefined;
      if (this.isDisposed) {
        this.runScope.dispose();
        this.runScope = undefined;
        this.runCleanup();
      }
    } catch (error) {
      owner.dispose();
      this.runtime.report(error, { kind: 'effect', name: this.options?.name });
    }
  }

  dispose(): void {
    if (this.isDisposed) return;

    this.isDisposed = true;
    this.ownershipScope?.release(this);
    this.ownershipScope = undefined;
    this.runScope?.dispose();
    this.runScope = undefined;
    this.runtime.clearDependencies(this);
    this.runCleanup();
    this.disposalController.abort();
    this.runtime.emit({ name: this.options?.name, node: 'effect', type: 'dispose' });
  }

  [Symbol.dispose](): void {
    this.dispose();
  }

  private runCleanup(): void {
    const cleanup = this.cleanup;

    this.cleanup = undefined;

    if (cleanup === undefined) return;

    try {
      cleanup();
    } catch (error) {
      this.runtime.report(error, { kind: 'cleanup', name: this.options?.name });
    }
  }
}

/**
 * A runtime owns reactive graph state and lifetime. Separate instances isolate
 * applications and SSR requests without process-wide mutable hooks.
 */
export class ReactiveRuntime {
  private activeEffectScope: ScopeNode | undefined;
  private activeObserver: ObserverNode | undefined;
  private activeScope: ScopeNode;
  private isDisposed = false;
  private flushDepth = 0;
  private flushing = false;
  private readonly pending = new Set<EffectNode>();
  private readonly listeners = new Set<() => void>();
  private readonly rootScope: ScopeNode;
  private readonly tappers = new Set<(event: RippleEvent) => void>();
  private readonly errorPolicy: RippleErrorPolicy;

  constructor(options?: RippleOptions) {
    this.errorPolicy = options?.errorPolicy ?? 'throw';
    this.rootScope = new ScopeNode(this, 'runtime');
    this.activeScope = this.rootScope;
  }

  get disposed(): boolean {
    return this.isDisposed;
  }

  get disposalSignal(): AbortSignal {
    return this.rootScope.disposalSignal;
  }

  readonly signal = <T>(initial: T, options?: SignalOptions<T>): Signal<T> => {
    this.assertActive();

    return new SignalNode(this, initial, options);
  };

  readonly computed = <T>(derive: () => T, options?: ComputedOptions<T>): Readable<T> => {
    this.assertActive();

    const node = new ComputedNode(this, derive, options);

    (this.activeEffectScope ?? this.activeScope).own(node);

    return node;
  };

  readonly effect = (callback: () => Cleanup | undefined, options?: EffectOptions): EffectHandle => {
    this.assertActive();

    const node = new EffectNode(this, callback, options);

    (this.activeEffectScope ?? this.activeScope).own(node);
    node.run();

    return node;
  };

  readonly createScope = (name?: string): Scope => {
    this.assertActive();

    const scope = new ScopeNode(this, name);

    // Scopes model explicit, caller-owned lifetimes. Unlike effects/computeds created during an
    // effect run, they deliberately attach to the enclosing scope rather than the per-run owner:
    // keyed DOM directives retain item scopes across reconciliation runs and dispose them only
    // when the item itself leaves the collection.
    this.activeScope.own(scope);

    return scope;
  };

  readonly batch = <T>(fn: () => T): T => {
    this.assertActive();

    return this.propagate(fn);
  };

  readonly untrack = <T>(fn: () => T): T => {
    this.assertActive();

    return this.withObserver(undefined, fn);
  };

  /** Runtime observability — see `Ripple.tap()`. */
  readonly tap = (handler: (event: RippleEvent) => void, options?: { signal?: AbortSignal }): Unsubscribe => {
    if (this.isDisposed) return () => {};

    const signal = options?.signal;

    if (signal?.aborted) {
      this.tappers.delete(handler);
      return () => {};
    }

    this.tappers.add(handler);

    if (signal) {
      const onAbort = () => this.tappers.delete(handler);

      signal.addEventListener('abort', onAbort, { once: true });

      return () => {
        this.tappers.delete(handler);
        signal.removeEventListener('abort', onAbort);
      };
    }

    return () => this.tappers.delete(handler);
  };

  dispose(): void {
    if (this.isDisposed) return;

    this.isDisposed = true;
    this.rootScope.dispose();
    this.emit({ node: 'graph', type: 'dispose' });
    this.tappers.clear();
  }

  /** Internal node guard: disposed runtimes allow inert reads but reject graph work and mutation. */
  assertActive(): void {
    if (this.isDisposed) throw new RippleDisposedRuntimeError('Cannot use a disposed Ripple runtime.');
  }

  track(node: Dependency): void {
    const observer = this.activeObserver;

    if (observer?.collecting === undefined) return;

    observer.collecting.add(node);
  }

  clearDependencies(observer: ObserverNode): void {
    for (const dependency of observer.dependencies) dependency.dependents.delete(observer);
    observer.dependencies.clear();
  }

  collect<T>(observer: ObserverNode, fn: () => T): T {
    // On first run (no prior dependencies), commit partial dependencies even if
    // derive throws — otherwise the computed would have zero dependencies and never
    // be notified when its source changes, permanently stuck until a manual read.
    // On subsequent runs, keep previous dependencies (tested behavior).
    return this.collectWith(observer, fn, observer.dependencies.size === 0);
  }

  collectEffect<T>(observer: ObserverNode, fn: () => T): T {
    return this.collectWith(observer, fn, true);
  }

  withEffectScope<T>(scope: ScopeNode, fn: () => T): T {
    const previous = this.activeEffectScope;

    this.activeEffectScope = scope;

    try {
      return fn();
    } finally {
      this.activeEffectScope = previous;
    }
  }

  withObserver<T>(observer: ObserverNode | undefined, fn: () => T): T {
    const previous = this.activeObserver;

    this.activeObserver = observer;

    try {
      return fn();
    } finally {
      this.activeObserver = previous;
    }
  }

  withScope<T>(scope: ScopeNode, fn: () => T): T {
    const previousEffectScope = this.activeEffectScope;
    const previousScope = this.activeScope;

    this.activeEffectScope = undefined;
    this.activeScope = scope;

    try {
      return fn();
    } finally {
      this.activeEffectScope = previousEffectScope;
      this.activeScope = previousScope;
    }
  }

  enqueue(effect: EffectNode): void {
    this.pending.add(effect);

    if (this.flushDepth === 0) this.flush();
  }

  enqueueListener(listener: () => void): void {
    this.listeners.add(listener);

    if (this.flushDepth === 0) this.flush();
  }

  propagate<T>(fn: () => T): T {
    this.flushDepth++;

    try {
      return fn();
    } finally {
      this.flushDepth--;

      if (this.flushDepth === 0) this.flush();
    }
  }

  emit(event: RippleEvent): void {
    if (this.tappers.size === 0) return;

    for (const tapper of this.tappers) {
      try {
        tapper(event);
      } catch {
        // Observability must not affect runtime behavior.
      }
    }
  }

  report(error: unknown, context: RippleErrorContext): void {
    this.emit({ context, error, type: 'error' });

    if (this.errorPolicy === 'throw') {
      queueMicrotask(() => {
        throw error;
      });
    }
  }

  private collectWith<T>(observer: ObserverNode, fn: () => T, commitOnError: boolean): T {
    const previousObserver = this.activeObserver;
    const dependencies = new Set<Dependency>();

    observer.collecting = dependencies;
    this.activeObserver = observer;

    try {
      const result = fn();

      this.commitDependencies(observer, dependencies);

      return result;
    } catch (error) {
      if (commitOnError) this.commitDependencies(observer, dependencies);

      throw error;
    } finally {
      observer.collecting = undefined;
      this.activeObserver = previousObserver;
    }
  }

  private commitDependencies(observer: ObserverNode, next: Set<Dependency>): void {
    for (const dependency of observer.dependencies) {
      if (!next.has(dependency)) dependency.dependents.delete(observer);
    }

    for (const dependency of next) {
      if (!observer.dependencies.has(dependency)) dependency.dependents.add(observer);
    }

    observer.dependencies.clear();
    for (const dependency of next) observer.dependencies.add(dependency);
  }

  private flush(): void {
    if (this.flushing) return;

    this.flushing = true;

    let iterations = 0;

    try {
      while (this.pending.size > 0 || this.listeners.size > 0) {
        if (++iterations > MAX_FLUSH_ITERATIONS) {
          throw new RippleInfiniteLoopError(`infinite reactive flush (>${MAX_FLUSH_ITERATIONS} iterations)`);
        }

        const effects = [...this.pending];
        const listeners = [...this.listeners];

        this.pending.clear();
        this.listeners.clear();

        for (const effect of effects) effect.run();

        for (const listener of listeners) {
          try {
            listener();
          } catch (error) {
            this.report(error, { kind: 'listener' });
          }
        }
      }
    } finally {
      this.flushing = false;
    }
  }
}

export const isReactive = <T>(value: T | Readable<T>): value is Readable<T> => {
  if (typeof value !== 'object' || value === null || (value as { [REACTIVE]?: unknown })[REACTIVE] !== true)
    return false;

  const candidate = value as { peek?: unknown; subscribe?: unknown; value?: unknown };

  return 'value' in candidate && typeof candidate.peek === 'function' && typeof candidate.subscribe === 'function';
};
