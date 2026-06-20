export const rippleTypes = `
declare module '/ripple' {
  // ── Primitive types ──────────────────────────────────────────────────────

  export type CleanupFn = () => void;
  export type EffectCallback = () => CleanupFn | void;
  export type AsyncEffectCallback = (signal: AbortSignal) => Promise<CleanupFn | void>;
  export type EqualityFn<T> = (a: T, b: T) => boolean;
  export type EffectScheduler = 'microtask' | 'sync';

  export type DepInfo = {
    readonly name?: string;
  };

  export type ComputedOptions<T> = {
    equals?: EqualityFn<T>;
    name?: string;
  };

  export type SignalOptions<T> = {
    equals?: EqualityFn<T>;
    name?: string;
  };

  export type WatchOptions<T> = {
    equals?: EqualityFn<T>;
    immediate?: boolean;
    name?: string;
  };

  export type EffectOptions = {
    name?: string;
    scheduler?: EffectScheduler;
  };

  export type EffectAsyncOptions = {
    name?: string;
    onError?: (err: unknown) => void;
  };

  export type ResourceOptions<T> = {
    initialValue?: T;
    name?: string;
  };

  export type ResourceState<T> =
    | { readonly data?: T; readonly status: 'loading' }
    | { readonly data: T; readonly status: 'ready' }
    | { readonly data?: T; readonly error: unknown; readonly status: 'error' };

  export type HistoryEntry<T> = {
    readonly label?: string;
    readonly state: Readonly<T>;
  };

  export type StateErrorCode =
    | 'COMPUTED_CYCLE'
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
    /** Awaits the current async run without disposing the effect. Resolves immediately if idle. */
    run(): Promise<void>;
    [Symbol.asyncDispose](): Promise<void>;
  }

  export interface EffectHandle extends Subscription {
    /** Returns the reactive sources the effect is currently subscribed to. */
    getDependencies(): ReadonlyArray<DepInfo>;
  }

  export interface Readable<T> {
    readonly name?: string;
    peek(): T;
    subscribe(listener: () => void): Subscription;
    readonly value: T;
  }

  export interface Signal<T> extends Readable<T> {
    dispose(): void;
    readonly disposed: boolean;
    [Symbol.dispose](): void;
    value: T;
  }

  export interface Computed<T> extends Readable<T> {
    dispose(): void;
    readonly disposed: boolean;
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
    readonly canRedo: boolean;
    readonly canUndo: boolean;
    dispose(): void;
    [Symbol.dispose](): void;
    historyAt(index: number): HistoryEntry<T> | undefined;
    readonly historyLength: number;
    /** Saves current store state as an explicit undo checkpoint. */
    push(): void;
    /** Saves current store state as a labelled undo checkpoint. */
    pushNamed(label: string): void;
    redo(): void;
    readonly store: Store<T>;
    undo(): void;
  }

  export interface Scope {
    readonly disposed: boolean;
    dispose(): void;
    /** Explicitly registers a cleanup into this scope (bypasses current tracking context). */
    add(fn: CleanupFn): void;
    run<T>(fn: () => T): T;
    [Symbol.dispose](): void;
  }

  // ── Error ─────────────────────────────────────────────────────────────────

  export class StateError extends Error {
    readonly code: StateErrorCode;
  }

  export const StateErrorCode: Record<StateErrorCode, StateErrorCode>;

  // ── Functions ─────────────────────────────────────────────────────────────

  export function signal<T>(initial: T, options?: SignalOptions<T>): Signal<T>;
  export function computed<T>(fn: () => T, options?: ComputedOptions<T>): Computed<T>;
  export function effect(fn: EffectCallback, options?: EffectOptions): EffectHandle;
  export function effectAsync(fn: AsyncEffectCallback, options?: EffectAsyncOptions): AsyncSubscription;
  /** Reactive async resource — emits a ResourceState<T> discriminated union. */
  export function resource<T>(factory: (abortSignal: AbortSignal) => Promise<T>, options?: ResourceOptions<T>): Computed<ResourceState<T>>;
  export function watch<T>(source: Readable<T>, cb: (value: T, prev: T | undefined) => CleanupFn | void, options?: WatchOptions<T>): Subscription;
  export function batch<T>(fn: () => T): T;
  export function untrack<T>(fn: () => T): T;
  export function readonly<T>(source: Readable<T>): Readable<T>;
  export function onCleanup(fn: CleanupFn): void;
  export function scope(setup?: () => void): Scope;
  export function store<T extends object>(initial: T, options?: { name?: string }): Store<T>;
  export function storeWithHistory<T extends object>(storeOrInitial: Store<T> | T, options?: { maxHistory?: number; name?: string }): StoreWithHistory<T>;
  export function isSignal<T = unknown>(value: unknown): value is Readable<T>;
  export function isComputed<T = unknown>(value: unknown): value is Computed<T>;
  export function isStore<T extends object = Record<string, unknown>>(value: unknown): value is Store<T>;
  export function getDevToolsHook(): unknown | null;
}
`;
