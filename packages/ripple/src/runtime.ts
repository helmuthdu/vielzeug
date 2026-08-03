import type {
  Cleanup,
  ComputedOptions,
  EffectHandle,
  EffectOptions,
  ReactiveErrorContext,
  ReactiveObserver,
  Readable,
  RippleOptions,
  Scope,
  Signal,
  SignalOptions,
  Unsubscribe,
} from './types';

import { RippleComputedCycleError, RippleDisposedScopeError, RippleInfiniteLoopError } from './errors';

const REACTIVE = Symbol('ripple.reactive');
const SIGNAL = Symbol('ripple.signal');
const COMPUTED = Symbol('ripple.computed');
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
  readonly [SIGNAL] = true;
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
    if (this.equals(this.current, next)) return;

    const previous = this.current;

    this.current = next;
    this.runtime.emit({ kind: 'write', name: this.name, next, previous });
    this.runtime.propagate(() => this.notify());
  }

  peek(): T {
    return this.current;
  }
}

class ComputedNode<T> extends ReactiveNode<T> implements ObserverNode, Owned {
  readonly [COMPUTED] = true;
  readonly dependencies = new Set<Dependency>();
  private computing = false;
  private disposed = false;
  private dirty = true;
  private current: T | typeof UNSET = UNSET;
  private readonly derive: () => T;
  private readonly equals: (previous: T, next: T) => boolean;

  constructor(runtime: ReactiveRuntime, derive: () => T, options?: ComputedOptions<T>) {
    super(runtime, options?.name);
    this.derive = derive;
    this.equals = options?.equals ?? Object.is;
  }

  get value(): T {
    this.refresh();
    this.runtime.track(this);

    return this.current as T;
  }

  peek(): T {
    this.refresh();

    return this.current as T;
  }

  onDependencyChanged(): void {
    if (this.disposed) return;

    if (!this.dirty) this.dirty = true;

    if (this.dependents.size > 0 && this.refresh()) this.notify();
  }

  dispose(): void {
    if (this.disposed) return;

    this.disposed = true;
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
    this.runtime.emit({ kind: 'compute', name: this.name });

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

class ScopeNode implements Scope {
  readonly disposalController = new AbortController();
  readonly owned = new Set<Owned>();
  readonly name: string | undefined;
  private isDisposed = false;
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

  run<T>(fn: () => T): T {
    if (this.isDisposed) throw new RippleDisposedScopeError('Cannot run a disposed scope.');

    return this.runtime.withScope(this, fn);
  }

  dispose(): void {
    if (this.isDisposed) return;

    this.isDisposed = true;
    for (const owned of [...this.owned].reverse()) owned.dispose();
    this.owned.clear();
    this.disposalController.abort();
    this.runtime.emit({ kind: 'dispose', name: this.name, node: 'scope' });
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
  private owner: ScopeNode | undefined;
  private scheduled = false;
  private readonly callback: () => Cleanup | void;
  private readonly options: EffectOptions | undefined;
  private readonly runtime: ReactiveRuntime;

  constructor(runtime: ReactiveRuntime, callback: () => Cleanup | void, options?: EffectOptions) {
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

    this.owner?.dispose();
    this.owner = undefined;
    this.runCleanup();
    this.runtime.emit({ kind: 'effect', name: this.options?.name });

    const owner = new ScopeNode(this.runtime);

    try {
      const cleanup = this.runtime.withEffectScope(owner, () => this.runtime.collectEffect(this, this.callback));

      this.owner = owner;
      this.cleanup = typeof cleanup === 'function' ? cleanup : undefined;
    } catch (error) {
      owner.dispose();
      this.runtime.report(error, { kind: 'effect', name: this.options?.name });
    }
  }

  dispose(): void {
    if (this.isDisposed) return;

    this.isDisposed = true;
    this.owner?.dispose();
    this.owner = undefined;
    this.runtime.clearDependencies(this);
    this.runCleanup();
    this.disposalController.abort();
    this.runtime.emit({ kind: 'dispose', name: this.options?.name, node: 'effect' });
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
  private flushDepth = 0;
  private flushing = false;
  private readonly pending = new Set<EffectNode>();
  private readonly listeners = new Set<() => void>();
  private readonly rootScope: ScopeNode;
  private readonly observer: ReactiveObserver | undefined;
  private readonly onError: (error: unknown, context: ReactiveErrorContext) => void;

  constructor(options?: RippleOptions) {
    this.observer = options?.observer;
    this.onError =
      options?.onError ??
      ((error) => {
        queueMicrotask(() => {
          throw error;
        });
      });
    this.rootScope = new ScopeNode(this, 'runtime');
    this.activeScope = this.rootScope;
  }

  readonly signal = <T>(initial: T, options?: SignalOptions<T>): Signal<T> => new SignalNode(this, initial, options);

  readonly computed = <T>(derive: () => T, options?: ComputedOptions<T>): Readable<T> => {
    const node = new ComputedNode(this, derive, options);

    (this.activeEffectScope ?? this.activeScope).owned.add(node);

    return node;
  };

  readonly effect = (callback: () => Cleanup | void, options?: EffectOptions): EffectHandle => {
    const node = new EffectNode(this, callback, options);

    (this.activeEffectScope ?? this.activeScope).owned.add(node);
    node.run();

    return node;
  };

  readonly createScope = (name?: string): Scope => {
    const scope = new ScopeNode(this, name);

    this.activeScope.owned.add(scope);

    return scope;
  };

  readonly batch = <T>(fn: () => T): T => this.propagate(fn);

  readonly untrack = <T>(fn: () => T): T => this.withObserver(undefined, fn);

  dispose(): void {
    this.rootScope.dispose();
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
    return this.collectWith(observer, fn, false);
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

  emit(event: Parameters<ReactiveObserver>[0]): void {
    try {
      this.observer?.(event);
    } catch (error) {
      this.report(error, { kind: 'observer', name: event.name });
    }
  }

  report(error: unknown, context: ReactiveErrorContext): void {
    try {
      this.onError(error, context);
    } catch (reporterError) {
      queueMicrotask(() => {
        throw reporterError;
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

export const isReactive = <T>(value: T | Readable<T>): value is Readable<T> =>
  typeof value === 'object' && value !== null && REACTIVE in value;

export const isSignal = <T>(value: unknown): value is Signal<T> =>
  typeof value === 'object' && value !== null && SIGNAL in value;

export const isComputed = (value: unknown): value is Readable<unknown> =>
  typeof value === 'object' && value !== null && COMPUTED in value;
