export const rippleTypes = `
declare module '/ripple' {
  // ── Primitive types ──────────────────────────────────────────────────────

  export type CleanupFn = () => void;
  export type EffectCallback = () => CleanupFn | void;
  export type AsyncEffectCallback = (signal: AbortSignal) => Promise<CleanupFn | void>;
  export type EqualityFn<T> = (a: T, b: T) => boolean;
  export type ReactiveOptions<T> = { equals?: EqualityFn<T>; name?: string };
  export type WatchOptions<T> = ReactiveOptions<T> & { immediate?: boolean };
  export type EffectScheduler = 'sync' | 'microtask' | 'raf';

  export type EffectOptions = {
    maxIterations?: number;
    name?: string;
    scheduler?: EffectScheduler;
    trace?: boolean;
  };

  export type BatchOptions = {
    maxIterations?: number;
  };

  export type StateErrorCode =
    | 'COMPUTED_CYCLE'
    | 'DISPOSED_READ'
    | 'DISPOSED_SCOPE'
    | 'INFINITE_LOOP'
    | 'INVALID_CLEANUP'
    | 'INVALID_STORE';

  // PathValue: resolves the type at a dot-separated path
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
    (): void;
    dispose(): void;
    [Symbol.dispose](): void;
  }

  export interface ReadonlySignal<T> {
    peek(): T;
    subscribe(onStoreChange: () => void): Subscription;
    map<U>(fn: (value: T) => U, options?: ReactiveOptions<U>): ComputedSignal<U>;
    filter(predicate: (value: T) => boolean): ComputedSignal<T | undefined>;
    filter<U extends T>(predicate: (value: T) => value is U): ComputedSignal<U | undefined>;
    readonly value: T;
  }

  export interface Signal<T> extends ReadonlySignal<T> {
    update(fn: (current: T) => T): void;
    dispose(): void;
    [Symbol.dispose](): void;
    value: T;
  }

  export interface ComputedSignal<T> extends ReadonlySignal<T> {
    dispose(): void;
    [Symbol.dispose](): void;
  }

  export interface Store<T extends object> extends ReadonlySignal<T> {
    readonly value: T;
    lens<P extends string>(path: P): Signal<PathValue<T, P>>;
    patch(partial: Partial<T>): void;
    update(fn: (state: T) => T): void;
    reset(): void;
  }

  export interface Scope {
    readonly run: <T>(fn: () => T) => T;
    readonly dispose: () => void;
    readonly [Symbol.dispose]: () => void;
  }

  // ── Error ─────────────────────────────────────────────────────────────────

  export class StateError extends Error {
    readonly code: StateErrorCode;
  }

  // ── Functions ─────────────────────────────────────────────────────────────

  export function signal<T>(initial: T, options?: ReactiveOptions<T>): Signal<T>;
  export function computed<T>(fn: () => T, options?: ReactiveOptions<T>): ComputedSignal<T>;
  export function effect(fn: EffectCallback, options?: EffectOptions): Subscription;
  export function effectAsync(fn: AsyncEffectCallback, options?: { onError?: (err: unknown) => void }): Subscription;
  export function watch<T>(source: ReadonlySignal<T>, cb: (value: T, prev: T) => void, options?: WatchOptions<T>): Subscription;
  export function watch<T>(source: () => T, cb: (value: T, prev: T) => void, options?: WatchOptions<T>): Subscription;
  export function batch<T>(fn: () => T, options?: BatchOptions): T;
  export function untrack<T>(fn: () => T): T;
  export function readonly<T>(source: ReadonlySignal<T>): ComputedSignal<T>;
  export function onCleanup(fn: CleanupFn): void;
  export function scope(): Scope;
  export function store<T extends object>(initial: T, options?: ReactiveOptions<T>): Store<T>;
  export function isSignal<T = unknown>(value: unknown): value is ReadonlySignal<T>;
  export function isComputed<T = unknown>(value: unknown): value is ComputedSignal<T>;
  export function isStore<T extends object = Record<string, unknown>>(value: unknown): value is Store<T>;
}
`;
