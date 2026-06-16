export const arsenalTypes = String.raw`
declare module '@vielzeug/arsenal' {
  export type Fn<Args extends unknown[] = unknown[], Result = unknown> = (...args: Args) => Result;
  export type Obj = Record<string, unknown>;
  export type Primitive = string | number | boolean;
  export type Predicate<T> = (value: T) => boolean;
  export type Sorter<T> = (a: T, b: T) => number;
  export type Unsubscribe = () => void;

  export type AttemptResult<T> = { ok: true; value: T } | { error: unknown; ok: false };

  export type SortDirection = 'asc' | 'desc';
  export type SortSelectors<T> = Partial<Record<keyof T, SortDirection>>;

  export type FuzzyOptions<T> = {
    fields?: ReadonlyArray<keyof T & string>;
    normalize?: boolean;
    threshold?: number;
  };
  export type ScoredResult<T> = { item: T; score: number };

  export type ArrayDiff<T> = { added: T[]; removed: T[] };
  export type ArrayDiffOptions<T> = { compareFn?: (a: T, b: T) => boolean };

  export type DiffResult<T> = {
    added: Array<keyof T & string>;
    changed: { [K in keyof T]?: { after: T[K]; before: T[K] } };
    removed: Array<keyof T & string>;
  };

  export type GetPathOptions = { bracketNotation?: boolean; fallback?: unknown; strict?: boolean };
  export type DeepMergeOptions = { arrayStrategy?: 'concat' | 'replace' };
  export type StringifyOptions = { onClassInstance?: 'coerce' | 'throw' };
  export type ParseJSONOptions<T> = {
    fallback?: T;
    reviver?: (key: string, value: unknown) => unknown;
    validator?: (parsed: unknown) => boolean;
  };

  export type MemoOptions<T extends Fn> = {
    key?: (...args: Parameters<T>) => PropertyKey;
    maxSize?: number;
  };
  export type Memoized<T extends Fn> = ((...args: Parameters<T>) => ReturnType<T>) & {
    clear(): void;
    invalidate(...args: Parameters<T>): void;
    readonly size: number;
  };

  export type CachePersistence<T> = {
    deserialize: (raw: string) => T;
    serialize: (value: T) => string;
  };
  export type CacheOptions<K = string, T = unknown> = {
    hash?: (key: K) => string;
    maxSize?: number;
    onEvict?: (key: K, value: T) => void;
    persistence?: CachePersistence<T>;
    ttlMs?: number;
  };
  export type CacheSetOptions = { forceRefresh?: boolean; ttlMs?: number };
  export type Stash<T, K = string> = {
    clear(): void;
    delete(key: K): boolean;
    entries(): IterableIterator<[K, T]>;
    get(key: K): T | undefined;
    getOrSet(key: K, factory: () => T, options?: CacheSetOptions): T;
    getOrSet(key: K, factory: () => Promise<T>, options?: CacheSetOptions): Promise<T>;
    set(key: K, value: T, options?: CacheSetOptions): void;
    readonly size: number;
  };

  export type DebounceOptions = { leading?: boolean; trailing?: boolean };
  export type ThrottleOptions = { leading?: boolean; trailing?: boolean };
  export type Once<T extends Fn> = T & { reset: () => void };

  export type WaitForOptions = { interval?: number; signal?: AbortSignal; timeout?: number };
  export type RetryOptions = {
    delay?: number | ((attempt: number) => number);
    onError?: (error: unknown) => void;
    shouldRetry?: (error: unknown, failureIndex: number) => boolean;
    signal?: AbortSignal;
    timeout?: number;
    times?: number;
  };

  export interface Queue {
    add<T>(fn: () => Promise<T>, options?: { priority?: number }): Promise<T>;
    clear(reason?: unknown): void;
    onIdle(): Promise<void>;
    onSettled<T>(cb: (result: AttemptResult<T>) => void): Unsubscribe;
    readonly active: number;
    readonly pending: number;
    readonly size: number;
  }

  export type TruncateOptions = { completeWords?: boolean; ellipsis?: string };

  // Array
  export function chunk(input: string, size?: number): string[];
  export function chunk<T>(input: readonly T[], size?: number): T[][];
  export function compact<T>(array: readonly T[]): Array<Exclude<T, false | '' | 0 | null | undefined>>;
  export function compare(a: unknown, b: unknown): number;
  export function compareBy<T>(selectors: SortSelectors<T>): Sorter<T>;
  export function contains<T>(array: readonly T[], value: T): boolean;
  export function countBy<T, K extends PropertyKey>(array: readonly T[], selector: (item: T) => K): Record<K, number>;
  export function difference<T>(source: readonly T[], other: readonly T[], selector?: (item: T) => unknown): T[];
  export function draw<T>(array: readonly T[]): T | undefined;
  export function drawMany<T>(array: readonly T[], n: number): T[];
  export function drop<T>(array: readonly T[], n?: number): T[];
  export function dropLast<T>(array: readonly T[], n?: number): T[];
  export function filterMap<T, R>(array: readonly T[], callback: (item: T, index: number, array: readonly T[]) => R | undefined): R[];
  export function first<T>(array: readonly T[], fallback?: T): T | undefined;
  export function flatten<T>(array: readonly unknown[], depth?: number): T[];
  export function fuzzy<T>(array: T[], query: string, options: FuzzyOptions<T> & { scored: true }): ScoredResult<T>[];
  export function fuzzy<T>(array: T[], query: string, options?: FuzzyOptions<T>): T[];
  export function fuzzyFilter<T>(array: T[], query: string, options?: FuzzyOptions<T>): T[];
  export function fuzzyScore<T>(array: T[], query: string, options?: FuzzyOptions<T>): ScoredResult<T>[];
  export function groupBy<T, K extends PropertyKey>(array: readonly T[], selector: (item: T) => K): Record<K, T[]>;
  export function indexBy<T, K extends PropertyKey>(array: readonly T[], selector: (item: T) => K): Record<K, T>;
  export function intersection<T>(source: readonly T[], other: readonly T[], selector?: (item: T) => unknown): T[];
  export function last<T>(array: readonly T[], fallback?: T): T | undefined;
  export function partition<T>(array: readonly T[], predicate: Predicate<T>): [T[], T[]];
  export function replace<T>(array: readonly T[], predicate: Predicate<T>, value: T): T[];
  export function rotate<T>(array: readonly T[], positions: number, options?: Obj): T[];
  export function shuffle<T>(array: readonly T[]): T[];
  export function sort<T>(array: readonly T[], selectorOrSelectors: SortSelectors<T> | ((a: T, b: T) => number), direction?: SortDirection): T[];
  export function take<T>(array: readonly T[], n?: number): T[];
  export function takeLast<T>(array: readonly T[], n?: number): T[];
  export function toggle<T>(array: readonly T[], item: T, selector?: ((value: T) => unknown) | keyof T, options?: Obj): T[];
  export function union<T>(source: readonly T[], other: readonly T[], selector?: (item: T) => unknown): T[];
  export function uniq<T>(array: readonly T[], selector?: (item: T) => unknown): T[];
  export function unzip<T>(rows: readonly (readonly T[])[]): T[][];
  export function zip<T extends readonly unknown[][]>(...arrays: T): unknown[];

  // Async
  export function abortError(signal?: AbortSignal): DOMException;
  export function attempt<T>(fn: () => T | Promise<T>): AttemptResult<T> | Promise<AttemptResult<T>>;
  export function backoff(attempt: number, maxMs?: number): number;
  export function isFail<T>(result: AttemptResult<T>): result is { error: unknown; ok: false };
  export function isOk<T>(result: AttemptResult<T>): result is { ok: true; value: T };
  export function parallel<T, R>(array: readonly T[], callback: (item: T, index: number, array: readonly T[]) => Promise<R> | R, options?: { limit?: number }): Promise<R[]>;
  export function queue(options?: { concurrency?: number }): Queue;
  export function retry<T>(fn: (signal?: AbortSignal) => Promise<T>, options?: RetryOptions): Promise<T>;
  export function sleep(ms: number, signal?: AbortSignal): Promise<void>;
  export function waitFor(condition: (signal: AbortSignal) => boolean | Promise<boolean>, options?: WaitForOptions): Promise<void>;

  // Cache
  export function memo<T extends Fn>(fn: T, options?: MemoOptions<T>): Memoized<T>;
  export function stash<T, K = string>(options?: CacheOptions<K, T>): Stash<T, K>;

  // Function
  export function allOf<T>(...predicates: Predicate<T>[]): Predicate<T>;
  export function anyOf<T>(...predicates: Predicate<T>[]): Predicate<T>;
  export function assert(condition: boolean, message?: string, options?: { type?: ErrorConstructor }): asserts condition;
  export function constant<T>(value: T): () => T;
  export function debounce<T extends Fn>(fn: T, delay?: number, options?: DebounceOptions): T & { cancel(): void; flush(): ReturnType<T> | undefined; pending(): boolean };
  export function identity<T>(value: T): T;
  export function noneOf<T>(...predicates: Predicate<T>[]): Predicate<T>;
  export function not<T>(predicate: Predicate<T>): Predicate<T>;
  export function once<T extends Fn>(fn: T): Once<T>;
  export function pipe(): <T>(x: T) => T;
  export function pipe<A, B>(f1: (a: A) => B): (a: A) => B;
  export function pipe<A, B, C>(f1: (a: A) => B, f2: (b: B) => C): (a: A) => C;
  export function runAll(fns: ReadonlyArray<() => void>, options?: { reverse?: boolean }): void;
  export function tap<T>(value: T, callback: (value: T) => void): T;
  export function throttle<T extends Fn>(fn: T, delay?: number, options?: ThrottleOptions): T & { cancel(): void; flush(): ReturnType<T> | undefined; pending(): boolean };

  // Math
  export function abs(value: number): number;
  export function allocate(amount: number | bigint, ratiosOrParts: readonly number[]): number[] | bigint[];
  export function average<T>(array: readonly T[], callback?: (item: T) => number): number;
  export function clamp(value: number, min: number, max: number): number;
  export function gcd(a: number, b: number): number;
  export function lcm(a: number, b: number): number;
  export function lerp(a: number, b: number, t: number): number;
  export function linspace(start: number, end: number, steps?: number): number[];
  export function max<T>(array: readonly T[], callback?: (item: T) => number): number;
  export function median<T>(array: readonly T[], callback?: (item: T) => number): number;
  export function min<T>(array: readonly T[], callback?: (item: T) => number): number;
  export function mod(a: number, b: number): number;
  export function normalize(value: number, min: number, max: number): number;
  export function percent(value: number, total: number): number;
  export function range(stop: number): number[];
  export function range(start: number, stop: number, step?: number): number[];
  export function round(value: number, precision?: number): number;
  export function standardDeviation<T>(array: readonly T[], callback?: (item: T) => number): number;
  export function sum<T>(array: readonly T[], callback?: (item: T) => number): number;
  export function variance<T>(array: readonly T[], callback?: (item: T) => number): number;

  // Object
  export function defaults<T extends Obj>(target: T, ...sources: Partial<T>[]): T;
  export function deepMerge<T extends Obj[]>(...items: [...T] | [...T, DeepMergeOptions]): Obj;
  export function diff<T extends Obj>(before?: T, after?: T, compareFn?: (a: unknown, b: unknown) => boolean): DiffResult<T>;
  export function diffArrays<T>(before: T[], after: T[], options?: ArrayDiffOptions<T>): ArrayDiff<T>;
  export function filterValues<T extends Obj>(obj: T, predicate: (value: T[keyof T], key: keyof T) => boolean): Partial<T>;
  export function flattenPaths(obj: Record<string, unknown>): Record<string, unknown>;
  export function getPath<T>(item: T, path: string, options?: GetPathOptions): unknown;
  export function invert<T extends Record<PropertyKey, PropertyKey>>(obj: T): Record<T[keyof T], keyof T>;
  export function mapKeys<T extends Obj>(obj: T, mapper: (key: keyof T, value: T[keyof T]) => PropertyKey): Obj;
  export function mapValues<T extends Obj, R>(obj: T, mapper: (value: T[keyof T], key: keyof T) => R): Record<keyof T, R>;
  export function omit<T extends Obj, K extends keyof T>(obj: T, keys: readonly K[]): Omit<T, K>;
  export function parseJSON<T>(json: string | null | undefined, options?: ParseJSONOptions<T>): T | undefined;
  export function pick<T extends Obj, K extends keyof T>(obj: T, keys: readonly K[]): Pick<T, K>;
  export function prune<T>(value: T): T | undefined;
  export function shallowMerge<T extends Obj[]>(...items: [...T]): Obj;
  export function stringify(value: unknown, options?: StringifyOptions): string;
  export function unflattenPaths(flat: Record<string, unknown>): Record<string, unknown>;

  // Random
  export function random(min?: number, max?: number): number;
  export function uuid(): string;

  // String
  export function camelCase(str: string): string;
  export function endsWith(value: string, suffix: string): boolean;
  export function escape(value: string): string;
  export function kebabCase(str: string): string;
  export function pad(str: string, targetLength: number, fillString?: string): string;
  export function pascalCase(str: string): string;
  export function similarity(str1: string, str2: string): number;
  export function snakeCase(str: string): string;
  export function startsWith(value: string, prefix: string): boolean;
  export function titleCase(str: string): string;
  export function truncate(str: string, limit?: number, options?: TruncateOptions): string;
  export function unescape(value: string): string;
  export function words(str: string): string[];

  // Guards
  export function isAbortError(value: unknown): value is Error;
  export function isArray(value: unknown): value is unknown[];
  export function isBoolean(value: unknown): value is boolean;
  export function isDate(value: unknown): value is Date;
  export function isDefined<T>(value: T | null | undefined): value is NonNullable<T>;
  export function isEmpty(value: unknown): boolean;
  export function isEqual(a: unknown, b: unknown, options?: { depth?: 'shallow' }): boolean;
  export function isError(value: unknown): value is Error;
  export function isFunction(value: unknown): value is Fn;
  export function isMatch(object: unknown, source: unknown): boolean;
  export function isNil(value: unknown): value is null | undefined;
  export function isNumber(value: unknown): value is number;
  export function isPlainObject(value: unknown): value is Obj;
  export function isPrimitive(value: unknown): value is Primitive;
  export function isPromise<T = unknown>(value: unknown): value is Promise<T>;
  export function isRegex(value: unknown): value is RegExp;
  export function isString(value: unknown): value is string;
  export function shallowEqual(a: unknown, b: unknown): boolean;
}
`;
