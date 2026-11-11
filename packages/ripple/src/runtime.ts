import { RippleCycleError, RippleDisposedError } from './errors';
import type {
  Cleanup,
  ComputedOptions,
  EffectHandle,
  EffectOptions,
  Readable,
  RippleErrorContext,
  RippleOptions,
  Scope,
  Signal,
  SignalOptions,
  Unsubscribe,
} from './types';

export const REACTIVE = Symbol.for('@vielzeug/ripple/reactive');
const MAX_FLUSH_ITERATIONS = 100;
const UNSET = Symbol('ripple.unset');

/**
 * Freshness of an observer. A write marks direct observers `DIRTY` and everything further
 * downstream `CHECK` ("a source may have changed"). Observers resolve `CHECK` lazily by
 * refreshing their sources in read order, so every derive sees a consistent graph and
 * a computed re-derives at most once per flush however many of its sources changed.
 */
const CLEAN = 0;
const CHECK = 1;
const DIRTY = 2;

type Freshness = typeof CLEAN | typeof CHECK | typeof DIRTY;
type Staleness = typeof CHECK | typeof DIRTY;

type Source = ReactiveNode<unknown>;

/** Anything a source can mark stale. Marking never runs user code. */
type Observer = {
  /** A source was written (or may have changed): schedule this observer. */
  mark(staleness: Staleness): void;
  /**
   * A computed source re-derived to a new value: upgrade a pending `CHECK` to `DIRTY`.
   * Never schedules: a `CLEAN` observer is the one currently reading the fresh value.
   */
  confirm(): void;
};

/** An observer that collects the sources it reads while it runs. */
type Collector = Observer & {
  collecting: Set<Source> | undefined;
  readonly disposed: boolean;
  readonly freshness: Freshness;
  sources: Set<Source>;
};

type Owned = {
  dispose(): void;
  setOwner(owner: ScopeNode | undefined): void;
};

abstract class ReactiveNode<T> {
  readonly [REACTIVE] = true;
  readonly observers = new Set<Observer>();
  readonly name: string | undefined;
  protected readonly runtime: ReactiveRuntime;

  protected constructor(runtime: ReactiveRuntime, name?: string) {
    this.runtime = runtime;
    this.name = name;
  }

  abstract peek(): T;
  abstract get value(): T;

  /** Bring the cached value up to date. Never throws a derive error: those are cached. */
  abstract refresh(): void;

  subscribe(listener: () => void): Unsubscribe {
    this.runtime.assertActive();
    this.refresh();

    const sink = new ListenerSink(this.runtime, this, listener);

    this.observers.add(sink);

    return () => this.observers.delete(sink);
  }

  protected markObservers(staleness: Staleness): void {
    for (const observer of this.observers) observer.mark(staleness);
  }
}

/** Shared `confirm` for every observer kind. */
const confirm = (observer: { freshness: Freshness }): void => {
  if (observer.freshness === CHECK) observer.freshness = DIRTY;
};

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

    this.current = next;
    this.runtime.batch(() => this.markObservers(DIRTY));
  }

  peek(): T {
    return this.current;
  }

  refresh(): void {}

  update(updater: (prev: T) => T): void {
    this.value = updater(this.current);
  }
}

class ComputedNode<T> extends ReactiveNode<T> implements Collector, Owned {
  collecting: Set<Source> | undefined;
  freshness: Freshness = DIRTY;
  sources = new Set<Source>();
  disposed = false;
  private computing = false;
  /**
   * True when a source write reached this node mid-derive. The write lands on an
   * already non-CLEAN node, so `mark()` alone cannot carry the invalidation past
   * `recompute()`'s settle; without this flag the cached value would survive a
   * source it already read moving underneath it.
   */
  private invalidatedMidDerive = false;
  /** The last derived value, or the error the last derive threw. */
  private current: T | typeof UNSET = UNSET;
  private failure: { error: unknown } | undefined;
  private readonly derive: () => T;
  private readonly equals: (previous: T, next: T) => boolean;
  private owner: ScopeNode | undefined;

  constructor(runtime: ReactiveRuntime, derive: () => T, options?: ComputedOptions<T>) {
    super(runtime, options?.name);
    this.derive = derive;
    this.equals = options?.equals ?? Object.is;
  }

  get value(): T {
    // Track before refreshing: a consumer of a failing computed must still be
    // marked when a source changes and the derive might succeed.
    this.runtime.track(this);
    this.refresh();

    return this.evaluated();
  }

  peek(): T {
    this.refresh();

    return this.evaluated();
  }

  mark(staleness: Staleness): void {
    if (this.disposed) return;

    // A write during the derive marks a node that is already DIRTY/CHECK, so it
    // must be remembered before the early return: `recompute()` keeps the node
    // DIRTY instead of settling CLEAN, and the next read re-derives.
    if (this.computing) this.invalidatedMidDerive = true;

    if (this.freshness >= staleness) return;

    const wasClean = this.freshness === CLEAN;

    this.freshness = staleness;
    if (wasClean) this.markObservers(CHECK);
  }

  refresh(): void {
    if (this.computing) throw new RippleCycleError(`computed cycle detected${label(this.name)}`);
    if (this.disposed || this.freshness === CLEAN) return;

    // Guard the source check too: a cycle through other computeds must surface, not recurse.
    this.computing = true;

    let stale: boolean;

    try {
      stale = this.freshness === DIRTY || this.runtime.sourceChanged(this);
    } finally {
      this.computing = false;
    }

    if (stale) this.recompute();
    else if (this.invalidatedMidDerive) {
      this.invalidatedMidDerive = false;
      this.freshness = DIRTY;
    } else this.freshness = CLEAN;
  }

  setOwner(owner: ScopeNode | undefined): void {
    this.owner = owner;
  }

  dispose(): void {
    if (this.disposed) return;

    this.disposed = true;
    this.owner?.release(this);
    this.owner = undefined;
    this.runtime.clearSources(this);
    this.observers.clear();
  }

  private evaluated(): T {
    if (this.failure) throw this.failure.error;
    if (this.current === UNSET) {
      throw new RippleDisposedError(`computed${label(this.name)} was disposed before it was ever evaluated`);
    }

    return this.current;
  }

  private recompute(): void {
    const previous = this.current;
    const previousFailure = this.failure;
    let changed = true;

    this.computing = true;

    try {
      const next = this.runtime.collect(this, this.derive);

      // A throwing `equals` is a derive failure too: `refresh()` must not throw.
      changed = previousFailure !== undefined || previous === UNSET || !this.equals(previous, next);
      this.current = next;
      this.failure = undefined;
    } catch (error) {
      // Repeating the previous failure with the same error changes nothing an
      // observer could observe: keep `changed` false so queued listeners stay
      // CHECK instead of firing on every source write.
      changed = previousFailure?.error !== error;
      this.failure = { error };
    } finally {
      this.computing = false;
      if (this.invalidatedMidDerive) {
        this.invalidatedMidDerive = false;
        this.freshness = DIRTY;
        // The derived value mixed sources that moved during the derive:
        // observers must re-evaluate, not trust this run's `equals`.
        changed = true;
      } else {
        this.freshness = CLEAN;
      }
    }

    if (changed) for (const observer of this.observers) observer.confirm();
  }

  confirm(): void {
    confirm(this);
  }
}

/** A `subscribe()` listener: fires once per flush, and only when its node actually changed. */
class ListenerSink implements Observer {
  freshness: Freshness = CLEAN;
  private readonly listener: () => void;
  private readonly node: Source;
  private readonly runtime: ReactiveRuntime;

  constructor(runtime: ReactiveRuntime, node: Source, listener: () => void) {
    this.runtime = runtime;
    this.node = node;
    this.listener = listener;
  }

  mark(staleness: Staleness): void {
    if (this.freshness === CLEAN) this.runtime.enqueueListener(this);
    if (staleness > this.freshness) this.freshness = staleness;
  }

  confirm(): void {
    confirm(this);
  }

  notify(): void {
    // Unsubscribed after it was queued.
    if (!this.node.observers.has(this)) return;
    if (this.freshness === CHECK) {
      try {
        this.node.refresh();
      } catch {
        this.freshness = DIRTY;
      }
    }

    const changed = this.freshness === DIRTY;

    this.freshness = CLEAN;
    if (!changed) return;

    try {
      this.listener();
    } catch (error) {
      this.runtime.report(error, { kind: 'listener', name: this.node.name });
    }
  }
}

class ScopeNode implements Scope, Owned {
  readonly owned = new Set<Owned>();
  readonly name: string | undefined;
  // Created lazily: scopes without a `disposalSignal` reader (the common case
  // for per-run effect scopes) never pay for an AbortController.
  private controller: AbortController | undefined;
  /** Plain callbacks from `onCleanup`. Absent until the first registration. */
  private cleanups: Cleanup[] | undefined;
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
    return (this.controller ??= new AbortController()).signal;
  }

  /** Adopt `value`. A disposed scope disposes it immediately. */
  own(value: Owned): void {
    if (this.isDisposed) {
      value.dispose();

      return;
    }

    value.setOwner(this);
    this.owned.add(value);
  }

  /** Run `fn` when this scope is disposed. A disposed scope runs `fn` immediately. */
  addCleanup(fn: Cleanup): void {
    if (this.isDisposed) {
      this.runtime.withScope(this, () => this.invokeCleanup(fn));

      return;
    }

    (this.cleanups ??= []).push(fn);
  }

  release(value: Owned): void {
    this.owned.delete(value);
  }

  setOwner(owner: ScopeNode | undefined): void {
    this.owner = owner;
  }

  run<T>(fn: () => T): T {
    if (this.isDisposed) throw new RippleDisposedError('Cannot run a disposed scope.');

    return this.runtime.withScope(this, fn);
  }

  dispose(): void {
    if (this.isDisposed) return;

    this.isDisposed = true;
    this.owner?.release(this);
    this.owner = undefined;
    for (const owned of [...this.owned].reverse()) owned.dispose();
    this.owned.clear();
    this.runCleanups();
    this.controller?.abort();
  }

  [Symbol.dispose](): void {
    this.dispose();
  }

  private invokeCleanup(fn: Cleanup): void {
    try {
      fn();
    } catch (error) {
      this.runtime.report(error, { kind: 'cleanup', name: this.name });
    }
  }

  private runCleanups(): void {
    const cleanups = this.cleanups;

    if (!cleanups) return;

    this.cleanups = undefined;
    // Cleanups run with this (now disposed) scope active, so anything they
    // register or create is torn down immediately instead of leaking upward.
    this.runtime.withScope(this, () => {
      for (let i = cleanups.length - 1; i >= 0; i--) this.invokeCleanup(cleanups[i] as Cleanup);
    });
  }
}

/** The per-run owner of an effect, allocated only if the run owns something. */
type RunOwner = {
  readonly name: string | undefined;
  scope?: ScopeNode;
};

class EffectNode implements Collector, Owned, EffectHandle {
  /** Defined only while the callback runs. */
  collecting: Set<Source> | undefined;
  freshness: Freshness = CLEAN;
  sources = new Set<Source>();
  /** Creation order: a parent always precedes the effects its runs create. */
  readonly id: number;
  private controller: AbortController | undefined;
  private isDisposed = false;
  private owner: ScopeNode | undefined;
  private runScope: ScopeNode | undefined;
  private readonly callback: () => Cleanup | undefined;
  private readonly name: string | undefined;
  private readonly runtime: ReactiveRuntime;
  /** The scope active at creation: every run sees it, whichever write triggered the run. */
  private readonly scope: ScopeNode;

  constructor(
    runtime: ReactiveRuntime,
    id: number,
    scope: ScopeNode,
    callback: () => Cleanup | undefined,
    options?: EffectOptions,
  ) {
    this.runtime = runtime;
    this.id = id;
    this.scope = scope;
    this.callback = callback;
    this.name = options?.name;
  }

  get disposed(): boolean {
    return this.isDisposed;
  }

  get disposalSignal(): AbortSignal {
    return (this.controller ??= new AbortController()).signal;
  }

  setOwner(owner: ScopeNode | undefined): void {
    this.owner = owner;
  }

  mark(staleness: Staleness): void {
    if (this.isDisposed) return;
    if (this.freshness === CLEAN) this.runtime.enqueue(this);
    if (staleness > this.freshness) this.freshness = staleness;
  }

  confirm(): void {
    if (!this.isDisposed) confirm(this);
  }

  /** Flush entry point: rerun only if a source actually changed. */
  update(): void {
    // A write made by this effect's own run flushed synchronously: stay stale; `run()`
    // reschedules once it ends and its sources are committed.
    if (this.isDisposed || this.collecting !== undefined) return;
    if (this.freshness === DIRTY || (this.freshness === CHECK && this.runtime.sourceChanged(this))) {
      this.run();
    } else {
      this.freshness = CLEAN;
    }
  }

  run(): void {
    if (this.isDisposed) return;

    this.runScope?.dispose();
    this.runScope = undefined;
    // Clean after the previous run's cleanups (their writes are read fresh by this run) and
    // before the callback, so a write the callback makes to its own sources reschedules it.
    this.freshness = CLEAN;

    const owner: RunOwner = { name: this.name };

    try {
      const cleanup = this.runtime.withRunOwner(owner, this.scope, () => this.runtime.collect(this, this.callback));

      if (typeof cleanup === 'function') (owner.scope ??= new ScopeNode(this.runtime, this.name)).addCleanup(cleanup);
      this.runScope = owner.scope;
    } catch (error) {
      owner.scope?.dispose();
      this.runtime.report(error, { kind: 'effect', name: this.name });
    }

    if (this.isDisposed) {
      this.runScope?.dispose();
      this.runScope = undefined;
    } else if (this.freshness !== CLEAN) {
      this.runtime.schedule(this);
    }
  }

  dispose(): void {
    if (this.isDisposed) return;

    this.isDisposed = true;
    this.owner?.release(this);
    this.owner = undefined;
    this.runtime.clearSources(this);
    this.runScope?.dispose();
    this.runScope = undefined;
    this.controller?.abort();
  }

  [Symbol.dispose](): void {
    this.dispose();
  }
}

const label = (name: string | undefined): string => (name === undefined ? '' : ` "${name}"`);

/**
 * A runtime owns reactive graph state and lifetime. Separate instances isolate
 * applications and SSR requests without process-wide mutable hooks.
 */
export class ReactiveRuntime {
  private activeCollector: Collector | undefined;
  private activeScope: ScopeNode;
  /** Set while an effect runs: nodes created during the run belong to it. */
  private runOwner: RunOwner | undefined;
  private isDisposed = false;
  private batchDepth = 0;
  private flushing = false;
  private nextEffectId = 0;
  private readonly pending = new Set<EffectNode>();
  private readonly listeners = new Set<ListenerSink>();
  private readonly rootScope: ScopeNode;
  private readonly onError: (error: unknown, context: RippleErrorContext) => void;

  constructor(options?: RippleOptions) {
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

    this.currentOwner().own(node);

    return node;
  };

  readonly effect = (callback: () => Cleanup | undefined, options?: EffectOptions): EffectHandle => {
    this.assertActive();

    const node = new EffectNode(this, this.nextEffectId++, this.activeScope, callback, options);

    this.currentOwner().own(node);
    node.run();

    return node;
  };

  /**
   * Register `fn` on the active owner: the current effect run when one is
   * executing, otherwise the active scope. The callback runs, newest first,
   * after that owner's effects and computeds are disposed. One throwing
   * callback is reported and does not skip the rest.
   */
  readonly onCleanup = (fn: Cleanup): void => {
    this.assertActive();
    this.currentOwner().addCleanup(fn);
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
    this.batchDepth++;

    try {
      return fn();
    } finally {
      this.batchDepth--;
      if (this.batchDepth === 0) this.flush();
    }
  };

  readonly untrack = <T>(fn: () => T): T => {
    this.assertActive();

    const previous = this.activeCollector;

    this.activeCollector = undefined;

    try {
      return fn();
    } finally {
      this.activeCollector = previous;
    }
  };

  dispose(): void {
    if (this.isDisposed) return;

    this.isDisposed = true;
    this.rootScope.dispose();
  }

  /** Disposed runtimes allow inert reads but reject graph work and mutation. */
  assertActive(): void {
    if (this.isDisposed) throw new RippleDisposedError('Cannot use a disposed Ripple runtime.');
  }

  track(node: Source): void {
    const collector = this.activeCollector;
    const collecting = collector?.collecting;

    // A computed reading itself is a cycle error, not an edge.
    if (collecting === undefined || collector === (node as unknown) || collecting.has(node)) return;

    collecting.add(node);
    // Link immediately, not when the run ends: a write to this source later in the same run
    // (or in a flush it triggers) must still reach the observer.
    node.observers.add(collector as Collector);
  }

  /** Resolve `CHECK`: refresh sources in read order until one marks `observer` dirty. */
  sourceChanged(observer: Collector): boolean {
    try {
      for (const source of observer.sources) {
        source.refresh();
        if (observer.freshness === DIRTY) return true;
      }
    } catch {
      // A cycle surfaced while refreshing: rerun so the observer reports it.
      return true;
    }

    return false;
  }

  clearSources(observer: Collector): void {
    for (const source of observer.sources) source.observers.delete(observer);
    observer.sources.clear();
  }

  /** Run `fn` as `observer`, replacing its sources with the ones it reads, even if it throws. */
  collect<T>(observer: Collector, fn: () => T): T {
    const previousCollector = this.activeCollector;
    const next = new Set<Source>();

    observer.collecting = next;
    this.activeCollector = observer;

    try {
      return fn();
    } finally {
      observer.collecting = undefined;
      this.activeCollector = previousCollector;
      this.commitSources(observer, next);
    }
  }

  withRunOwner<T>(owner: RunOwner, scope: ScopeNode, fn: () => T): T {
    const previousRunOwner = this.runOwner;
    const previousScope = this.activeScope;

    this.runOwner = owner;
    this.activeScope = scope;

    try {
      return fn();
    } finally {
      this.runOwner = previousRunOwner;
      this.activeScope = previousScope;
    }
  }

  withScope<T>(scope: ScopeNode, fn: () => T): T {
    const previousRunOwner = this.runOwner;
    const previousScope = this.activeScope;

    this.runOwner = undefined;
    this.activeScope = scope;

    try {
      return fn();
    } finally {
      this.runOwner = previousRunOwner;
      this.activeScope = previousScope;
    }
  }

  enqueue(effect: EffectNode): void {
    this.pending.add(effect);
  }

  /** Queue an effect that went stale during its own run and flush unless a batch is open. */
  schedule(effect: EffectNode): void {
    this.pending.add(effect);
    if (this.batchDepth === 0) this.flush();
  }

  enqueueListener(sink: ListenerSink): void {
    this.listeners.add(sink);
  }

  report(error: unknown, context: RippleErrorContext): void {
    try {
      this.onError(error, context);
    } catch {
      // A failing error handler must not corrupt the graph or mask the
      // original failure; the default handler rethrows asynchronously instead.
    }
  }

  /** The owner a newly created node belongs to, materializing a lazy effect-run scope if needed. */
  private currentOwner(): ScopeNode {
    const owner = this.runOwner;

    if (owner) return (owner.scope ??= new ScopeNode(this, owner.name));

    return this.activeScope;
  }

  /** `track()` already linked every source in `next`; unlink the ones this run no longer read. */
  private commitSources(observer: Collector, next: Set<Source>): void {
    // Disposed during its own run: drop the edges this run added too.
    if (observer.disposed) {
      for (const source of next) source.observers.delete(observer);
      observer.sources = new Set();

      return;
    }

    for (const source of observer.sources) {
      if (!next.has(source)) source.observers.delete(observer);
    }

    observer.sources = next;
  }

  private flush(): void {
    if (this.flushing) return;

    // A write inside an effect run or scope flushes synchronously: queued work must not
    // inherit that caller's tracking or ownership.
    const previousCollector = this.activeCollector;
    const previousRunOwner = this.runOwner;
    const previousScope = this.activeScope;

    this.flushing = true;
    this.activeCollector = undefined;
    this.runOwner = undefined;
    this.activeScope = this.rootScope;

    let iterations = 0;

    try {
      while (this.pending.size > 0 || this.listeners.size > 0) {
        if (++iterations > MAX_FLUSH_ITERATIONS) {
          // A runaway effect (one that keeps re-triggering itself): report it
          // through the error channel and abandon this flush. Throwing from
          // here would unwind into the innocent write site that happened to
          // trigger the flush, after its value was already applied.
          this.report(new RippleCycleError(`infinite reactive flush (>${MAX_FLUSH_ITERATIONS} iterations)`), {
            kind: 'flush',
          });
          // Dropped work goes back to CLEAN so a later write can schedule it again.
          for (const effect of this.pending) effect.freshness = CLEAN;
          for (const sink of this.listeners) sink.freshness = CLEAN;
          this.pending.clear();
          this.listeners.clear();
          break;
        }

        // Creation order: a parent reruns (and disposes stale children) before they update.
        const effects = [...this.pending].sort((left, right) => left.id - right.id);
        const listeners = [...this.listeners];

        this.pending.clear();
        this.listeners.clear();

        for (const effect of effects) effect.update();
        for (const sink of listeners) sink.notify();
      }
    } finally {
      this.flushing = false;
      this.activeCollector = previousCollector;
      this.runOwner = previousRunOwner;
      this.activeScope = previousScope;
    }
  }
}

export const isReactive = <T>(value: T | Readable<T>): value is Readable<T> => {
  if (typeof value !== 'object' || value === null || (value as { [REACTIVE]?: unknown })[REACTIVE] !== true)
    return false;

  const candidate = value as { peek?: unknown; subscribe?: unknown; value?: unknown };

  return 'value' in candidate && typeof candidate.peek === 'function' && typeof candidate.subscribe === 'function';
};
