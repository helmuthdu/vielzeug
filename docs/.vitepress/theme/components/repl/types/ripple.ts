export const rippleTypes = `
declare module '/ripple' {
  // ── Primitive types ──────────────────────────────────────────────────────

  export type CleanupFn = () => void;
  export type EffectCallback = () => CleanupFn | void;
  export type AsyncEffectCallback = (signal: AbortSignal) => Promise<CleanupFn | void>;
  export type EqualityFn<T> = (a: T, b: T) => boolean;
  export type EffectScheduler = ((run: () => void) => void) | 'microtask' | 'sync';

  export type ComputedOptions<T> = {
    equals?: EqualityFn<T>;
    fallback?: (error: unknown, lastValue: T | undefined) => T;
    name?: string;
  };

  export type SignalOptions<T> = {
    batched?: boolean;
    equals?: EqualityFn<T>;
    name?: string;
  };

  export type WatchOptions<T> = {
    equals?: EqualityFn<T>;
    immediate?: boolean;
    name?: string;
  };

  export type EffectOptions = {
    maxIterations?: number;
    name?: string;
    scheduler?: EffectScheduler;
  };

  export type EffectAsyncOptions = {
    name?: string;
    onError?: (err: unknown) => void;
  };

  export type AsyncComputedOptions<T> = {
    initialValue?: T;
    name?: string;
  };

  /** Alias for ReadonlySignal<T>. Prefer Accessor<T> — communicates read-only access, not immutability. */
  export type Accessor<T> = ReadonlySignal<T>;

  /** Alias for AsyncComputedOptions<T>. Use with resource(). */
  export type ResourceOptions<T> = AsyncComputedOptions<T>;

  /** Alias for AsyncComputedSignal<T>. Returned by resource(). */
  export type ResourceSignal<T> = AsyncComputedSignal<T>;

  export type StateErrorCode =
    | 'COMPUTED_CYCLE'
    | 'DISPOSED_READ'
    | 'DISPOSED_SCOPE'
    | 'INFINITE_LOOP'
    | 'INVALID_CLEANUP'
    | 'INVALID_STORE';

  export type PathValue<T, P extends string> =
    P extends \`\${infer K}.\${infer Rest}\`
      ? K extends keyof T
        ? PathValue<T[K], Rest>
        : never
      : P extends keyof T
        ? T[P]
        : never;

  // ── Core interfaces ───────────────────────────────────────────────────────

  export interface Subscription {
    dispose(): void;
    readonly disposed: boolean;
    [Symbol.dispose](): void;
  }

  export interface AsyncSubscription extends Subscription {
    /** @deprecated Use [Symbol.asyncDispose] and \`await using\` instead. */
    disposeAsync(): Promise<void>;
    [Symbol.asyncDispose](): Promise<void>;
  }

  export interface ReadonlySignal<T> {
    readonly name?: string;
    peek(): T;
    subscribe(listener: () => void): Subscription;
    readonly value: T;
  }

  export interface Signal<T> extends ReadonlySignal<T> {
    dispose(): void;
    readonly disposed: boolean;
    [Symbol.dispose](): void;
    value: T;
  }

  export interface ComputedSignal<T> extends ReadonlySignal<T> {
    dispose(): void;
    readonly disposed: boolean;
    [Symbol.dispose](): void;
  }

  export interface AsyncComputedSignal<T> {
    readonly data: ReadonlySignal<T | undefined>;
    readonly disposed: boolean;
    readonly error: ReadonlySignal<unknown | undefined>;
    readonly isLoading: ReadonlySignal<boolean>;
    dispose(): void;
    [Symbol.dispose](): void;
  }

  export interface Store<T extends object> {
    readonly disposed: boolean;
    readonly name?: string;
    dispose(): void;
    [Symbol.dispose](): void;
    lens<P extends string>(path: P): Signal<PathValue<T, P>>;
    patch(partial: Partial<T>): void;
    peek(): Readonly<T>;
    replace(fn: (state: Readonly<T>) => T): void;
    reset(): void;
    subscribe(listener: () => void): Subscription;
    readonly value: Readonly<T>;
  }

  export interface StoreWithHistory<T extends object> {
    readonly store: Store<T>;
    readonly canUndo: boolean;
    readonly canRedo: boolean;
    historyAt(index: number): Readonly<T> | undefined;
    readonly historyLength: number;
    undo(): void;
    redo(): void;
    dispose(): void;
    [Symbol.dispose](): void;
  }

  export interface Scope {
    readonly run: <T>(fn: () => T) => T;
    readonly dispose: () => void;
    readonly disposed: boolean;
    readonly [Symbol.dispose]: () => void;
  }

  // ── Error ─────────────────────────────────────────────────────────────────

  export class StateError extends Error {
    readonly code: StateErrorCode;
  }

  export const StateErrorCode: Record<StateErrorCode, StateErrorCode>;

  // ── Functions ─────────────────────────────────────────────────────────────

  export function signal<T>(initial: T, options?: SignalOptions<T>): Signal<T>;
  export function computed<T>(fn: () => T, options?: ComputedOptions<T>): ComputedSignal<T>;
  export function effect(fn: EffectCallback, options?: EffectOptions): Subscription;
  export function effectAsync(fn: AsyncEffectCallback, options?: EffectAsyncOptions): AsyncSubscription;
  export function asyncComputed<T>(factory: (abortSignal: AbortSignal) => Promise<T>, options?: AsyncComputedOptions<T>): AsyncComputedSignal<T>;
  /** Preferred alias for asyncComputed(). Communicates intent: reactive async data resource. */
  export function resource<T>(factory: (abortSignal: AbortSignal) => Promise<T>, options?: ResourceOptions<T>): ResourceSignal<T>;
  export function watch<T>(source: ReadonlySignal<T> | (() => T), cb: (value: T, prev: T | undefined) => CleanupFn | void, options?: WatchOptions<T>): Subscription;
  export function batch<T>(fn: () => T): T;
  export function untrack<T>(fn: () => T): T;
  export function readonly<T>(source: ReadonlySignal<T>): ComputedSignal<T>;
  /** Project a reactive source into a computed signal. Cleaner alternative to selector(). */
  export function derive<T, U>(source: ReadonlySignal<T>, project: (value: T) => U, options?: ComputedOptions<U>): ComputedSignal<U>;
  /** Filter a reactive source — returns value when predicate is true, undefined otherwise. */
  export function filter<T>(source: ReadonlySignal<T>, predicate: (value: T) => boolean, options?: ComputedOptions<T | undefined>): ComputedSignal<T | undefined>;
  export function selector<T, U>(source: ReadonlySignal<T>, project: (value: T) => U, options?: ComputedOptions<U>): ComputedSignal<U>;
  export function selector<T, U>(source: ReadonlySignal<T>, project: (value: T) => U, predicate: (value: U) => boolean, options?: ComputedOptions<U | undefined>): ComputedSignal<U | undefined>;
  /** @deprecated Use filter(source, predicate, options) instead. */
  export function selector<T>(source: ReadonlySignal<T>, project: undefined, predicate: (value: T) => boolean, options?: ComputedOptions<T | undefined>): ComputedSignal<T | undefined>;
  export function onCleanup(fn: CleanupFn): void;
  export function scope(setup?: () => void): Scope;
  /** @deprecated Use scope(setup) directly — withScope(fn) is identical to scope(fn). */
  export function withScope(fn: () => void): Scope;
  /** @deprecated Use const s = scope(); await s.run(async () => { ... }); instead. */
  export function asyncScope(setup: () => Promise<void>): Promise<Scope>;
  export function store<T extends object>(initial: T, options?: { name?: string }): Store<T>;
  export function storeWithHistory<T extends object>(initial: T, options?: { maxHistory?: number; name?: string }): StoreWithHistory<T>;
  export function isSignal<T = unknown>(value: unknown): value is ReadonlySignal<T>;
  export function isComputed<T = unknown>(value: unknown): value is ComputedSignal<T>;
  export function isStore<T extends object = Record<string, unknown>>(value: unknown): value is Store<T>;
  export function getDevToolsHook(): unknown | null;
}
`;
