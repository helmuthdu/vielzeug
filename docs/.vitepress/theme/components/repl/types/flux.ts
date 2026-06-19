export const fluxTypes = `
declare module '@vielzeug/flux' {
  // ── Core types ────────────────────────────────────────────────────────────

  export type Unsubscribe = () => void;

  export type Observer<T> = {
    next: (value: T) => void;
    complete?: () => void;
    error?: (error: unknown) => void;
  };

  export type Operator<T, U> = (source: Flux<T>) => Flux<U>;

  export type Producer<T> = (observer: Observer<T>) => Unsubscribe | void;

  export type FluxOptions = Record<string, never>;

  export interface Flux<T> {
    subscribe(observerOrNext: Observer<T> | ((value: T) => void)): Unsubscribe;
    pipe(): Flux<T>;
    pipe<A>(op1: Operator<T, A>): Flux<A>;
    pipe<A, B>(op1: Operator<T, A>, op2: Operator<A, B>): Flux<B>;
    pipe<A, B, C>(op1: Operator<T, A>, op2: Operator<A, B>, op3: Operator<B, C>): Flux<C>;
    pipe<A, B, C, D>(op1: Operator<T, A>, op2: Operator<A, B>, op3: Operator<B, C>, op4: Operator<C, D>): Flux<D>;
    dispose(): void;
  }

  export interface Subject<T> extends Flux<T> {
    emit(value: T): void;
    complete(): void;
    error(err: unknown): void;
  }

  export interface BehaviorSubject<T> extends Subject<T> {
    readonly value: T;
  }

  export type BehaviorSubjectOptions<T> = {
    equals?: (a: T, b: T) => boolean;
  };

  export type ShareOptions = Record<string, never>;

  // ── Errors ────────────────────────────────────────────────────────────────

  export class FluxError extends Error {}
  export class FluxDisposedError extends FluxError {}
  export class FluxTimeoutError extends FluxError { ms: number; }
  export class FluxBufferOverflowError extends FluxError {}

  // ── Core factory ─────────────────────────────────────────────────────────

  export function flux<T>(producer: Producer<T>, options?: FluxOptions): Flux<T>;

  // ── Subjects ─────────────────────────────────────────────────────────────

  export function createSubject<T>(): Subject<T>;
  export function createBehaviorSubject<T>(initial: T, options?: BehaviorSubjectOptions<T>): BehaviorSubject<T>;

  // ── Creation operators ────────────────────────────────────────────────────

  export function of<T>(...values: T[]): Flux<T>;
  export function from<T>(source: Iterable<T> | AsyncIterable<T> | Promise<T>): Flux<T>;
  export function fromEvent<T>(target: EventTarget, eventName: string): Flux<T>;
  export function interval(ms: number): Flux<number>;
  export function timer(delay: number, intervalMs?: number): Flux<number>;
  export function empty<T>(): Flux<T>;
  export function never<T>(): Flux<T>;
  export function throwError<T>(error: unknown): Flux<T>;

  // ── Transformation operators ──────────────────────────────────────────────

  export function map<T, U>(fn: (value: T) => U): Operator<T, U>;
  export function filter<T>(predicate: (value: T) => boolean): Operator<T, T>;
  export function scan<T, U>(accumulator: (acc: U, value: T) => U, seed: U): Operator<T, U>;
  export function switchMap<T, U>(fn: (value: T) => Flux<U>): Operator<T, U>;
  export function flatMap<T, U>(fn: (value: T) => Flux<U>): Operator<T, U>;
  export function concatMap<T, U>(fn: (value: T) => Flux<U>): Operator<T, U>;
  export function distinctUntilChanged<T>(comparator?: (a: T, b: T) => boolean): Operator<T, T>;
  export function startWith<T>(...values: T[]): Operator<T, T>;
  export function bufferCount<T>(size: number, every?: number): Operator<T, T[]>;
  export function pairwise<T>(): Operator<T, [T, T]>;

  // ── Filtering operators ───────────────────────────────────────────────────

  export function take<T>(count: number): Operator<T, T>;
  export function skip<T>(count: number): Operator<T, T>;
  export function first<T>(): Operator<T, T>;
  export function last<T>(): Operator<T, T>;
  export function takeWhile<T>(predicate: (value: T) => boolean): Operator<T, T>;
  export function takeUntil<T>(notifier: AbortSignal | Flux<unknown>): Operator<T, T>;
  export function debounce<T>(ms: number): Operator<T, T>;
  export function throttle<T>(ms: number): Operator<T, T>;
  export function sample<T>(notifier: Flux<unknown>): Operator<T, T>;

  // ── Combination operators ─────────────────────────────────────────────────

  export function merge<T>(...sources: Flux<T>[]): Flux<T>;
  export function concat<T>(...sources: Flux<T>[]): Flux<T>;
  export function combineLatest<A, B>(a: Flux<A>, b: Flux<B>): Flux<[A, B]>;
  export function combineLatest<A, B, C>(a: Flux<A>, b: Flux<B>, c: Flux<C>): Flux<[A, B, C]>;
  export function withLatestFrom<T, U>(other: Flux<U>): Operator<T, [T, U]>;
  export function race<T>(...sources: Flux<T>[]): Flux<T>;
  export function zip<A, B>(a: Flux<A>, b: Flux<B>): Flux<[A, B]>;
  export function forkJoin<A, B>(a: Flux<A>, b: Flux<B>): Flux<[A, B]>;
  export function forkJoin<A, B, C>(a: Flux<A>, b: Flux<B>, c: Flux<C>): Flux<[A, B, C]>;

  // ── Utility operators ─────────────────────────────────────────────────────

  export function tap<T>(fn: (value: T) => void): Operator<T, T>;
  export function delay<T>(ms: number): Operator<T, T>;
  export function timeout<T>(ms: number): Operator<T, T>;
  export function catchError<T>(fn: (error: unknown) => Flux<T>): Operator<T, T>;
  export function retry<T>(count: number): Operator<T, T>;
  export function finalize<T>(fn: () => void): Operator<T, T>;
  export function share<T>(options?: ShareOptions): Operator<T, T>;
  export function shareReplay<T>(bufferSize: number, options?: ShareOptions): Operator<T, T>;

  export function toPromise<T>(source: Flux<T>): Promise<T>;
  export function toArray<T>(source: Flux<T>): Promise<T[]>;
}
`;
