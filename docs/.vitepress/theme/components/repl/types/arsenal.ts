export const arsenalTypes = String.raw`
declare module '@vielzeug/arsenal' {
  export type Unsubscribe = () => void;
  export type Fn<Args extends unknown[] = unknown[], Result = unknown> = (...args: Args) => Result;
  export type Obj = Record<string, unknown>;
  export type Primitive = string | number | boolean;
  export type Predicate<T> = (value: T, index: number, array: readonly T[]) => boolean;
  export type Sorter<T> = (a: T, b: T) => number;
  export type Money = { amount: bigint; currency: string };
  export type TaskPriority = 'background' | 'user-blocking' | 'user-visible';
  export type AttemptResult<T> = { ok: true; value: T } | { error: unknown; ok: false };
  export type SchedulerLike = {
    postTask<T>(
      callback: () => T | PromiseLike<T>,
      options?: { delay?: number; priority?: TaskPriority; signal?: AbortSignal },
    ): Promise<T>;
  };
  export type CacheOptions<K extends readonly unknown[] = readonly unknown[]> = {
    hash: (key: K) => string;
    onError?: (error: unknown) => void;
    scheduler?: Pick<SchedulerLike, 'postTask'>;
  };
  export type CacheSetOptions<M> = { meta?: M; ttlMs?: number };
  export type Stash<T, K extends readonly unknown[] = readonly unknown[], M = never> = {
    cancelGc: (key: K) => void;
    clear: () => void;
    delete: (key: K) => boolean;
    entries: () => IterableIterator<[K, T]>;
    get: (key: K) => T | undefined;
    getEntry: (key: K) => Readonly<{ meta: M | undefined; value: T }> | undefined;
    getOrSet: (key: K, factory: () => T, options?: CacheSetOptions<M>) => T;
    scheduleGc: (key: K, delayMs: number) => void;
    set: (key: K, value: T, options?: CacheSetOptions<M>) => void;
    size: () => number;
    touch: (key: K, ttlMs: number) => boolean;
  };

  export const DELETED: unique symbol;

  export class Scheduler implements SchedulerLike {
    constructor();
    postTask<T>(
      callback: () => T | PromiseLike<T>,
      options?: { delay?: number; priority?: TaskPriority; signal?: AbortSignal },
    ): Promise<T>;
  }

  export function polyfillScheduler(): void;

  export function chunk(input: string, size?: number): string[];
  export function chunk<T>(input: readonly T[], size?: number): T[][];
  export function compact<T>(array: readonly T[]): Array<Exclude<T, false | '' | 0 | 0n | null | undefined>>;
  export function contains<T>(array: readonly T[], value: T): boolean;
  export function countBy<T, K extends PropertyKey>(array: readonly T[], selector: (item: T) => K): Record<K, number>;
  export function difference<T>(source: readonly T[], other: readonly T[], selector?: (item: T) => unknown): T[];
  export function drop<T>(array: readonly T[], n?: number): T[];
  export function dropLast<T>(array: readonly T[], n?: number): T[];
  export function filterMap<T, R>(
    array: readonly T[],
    callback: (item: T, index: number, array: readonly T[]) => R | undefined,
  ): R[];
  export function first<T>(array: readonly T[], fallback?: T): T | undefined;
  export function flatten<T>(array: readonly unknown[], depth?: number): T[];
  export function groupBy<T, K extends PropertyKey>(array: readonly T[], selector: (item: T) => K): Record<K, T[]>;
  export function indexBy<T, K extends PropertyKey>(array: readonly T[], selector: (item: T) => K): Record<K, T>;
  export function intersection<T>(source: readonly T[], other: readonly T[], selector?: (item: T) => unknown): T[];
  export function last<T>(array: readonly T[], fallback?: T): T | undefined;
  export function partition<T>(array: readonly T[], predicate: Predicate<T>): [T[], T[]];
  export function replace<T>(array: readonly T[], predicate: Predicate<T>, value: T): T[];
  export function rotate<T>(array: readonly T[], positions: number, options?: Obj): T[];
  export function sample<T>(array: readonly T[], count?: number): T | T[] | undefined;
  export function search<T>(array: readonly T[], query: string, tone?: number): T[];
  export function sort<T>(
    array: readonly T[],
    selectorOrSelectors?: ((item: T) => unknown) | Partial<Record<keyof T, 'asc' | 'desc'>>,
    direction?: 'asc' | 'desc',
  ): T[];
  export function take<T>(array: readonly T[], n?: number): T[];
  export function takeLast<T>(array: readonly T[], n?: number): T[];
  export function toggle<T>(array: readonly T[], item: T, selector?: ((value: T) => unknown) | keyof T, options?: Obj): T[];
  export function union<T>(source: readonly T[], other: readonly T[], selector?: (item: T) => unknown): T[];
  export function uniq<T>(array: readonly T[], selector?: (item: T) => unknown): T[];
  export function unzip<T>(rows: readonly (readonly T[])[]): T[][];
  export function zip<T extends readonly unknown[][]>(...arrays: T): unknown[];

  export function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T>;
  export function attempt<T>(
    fn: (signal: AbortSignal) => Promise<T>,
    options?: {
      delay?: number | ((attempt: number) => number);
      onError?: (err: unknown) => void;
      shouldRetry?: (error: unknown, attempt: number) => boolean;
      signal?: AbortSignal;
      timeout?: number;
      times?: number;
    },
  ): Promise<AttemptResult<T>>;
  export function defer<T>(): { promise: Promise<T>; reject: (reason?: unknown) => void; resolve: (value: T) => void };
  export function parallel<T, R>(
    array: readonly T[],
    callback: (item: T, index: number, array: readonly T[]) => Promise<R> | R,
    options?: { limit?: number; signal?: AbortSignal },
  ): Promise<R[]>;
  export function predict<T>(
    fn: (signal: AbortSignal) => Promise<T> | T,
    options?: { signal?: AbortSignal; timeout?: number },
  ): Promise<T>;
  export function queue(options?: { concurrency?: number }): {
    add<T>(job: () => Promise<T> | T): Promise<T>;
    onIdle(): Promise<void>;
    size(): number;
  };
  export function retry<T>(
    fn: () => Promise<T>,
    options?: {
      delay?: number | ((attempt: number) => number);
      shouldRetry?: (error: unknown, attempt: number) => boolean;
      signal?: AbortSignal;
      times?: number;
    },
  ): Promise<T>;
  export function sleep(timeout: number): Promise<void>;
  export function timeout<T>(promise: Promise<T>, ms: number, message?: string): Promise<T>;
  export function waitFor(
    condition: () => boolean | Promise<boolean>,
    options?: { interval?: number; signal?: AbortSignal; timeout?: number },
  ): Promise<void>;

  export function assert(condition: boolean, message?: string, options?: { args?: Obj; type?: ErrorConstructor }): void;
  export function assertAll(
    conditions: boolean[],
    message?: string,
    options?: { args?: Obj; type?: ErrorConstructor },
  ): void;
  export function compare(a: unknown, b: unknown): number;
  export function compareBy<T>(selectors: Partial<Record<keyof T, 'asc' | 'desc'>>): Sorter<T>;
  export function compose<A, B>(...fns: Array<(value: any) => any>): (value: A) => B;
  export function constant<T>(value: T): () => T;
  export function curry<F extends Fn>(fn: F, arity?: number): Fn;
  export function debounce<F extends Fn>(fn: F, delay?: number): F;
  export function identity<T>(value: T): T;
  export function memo<T extends Fn>(
    fn: T,
    options?: { key?: (...args: Parameters<T>) => PropertyKey; maxSize?: number; ttl?: number },
  ): (...args: Parameters<T>) => ReturnType<T>;
  export function allOf<T>(...predicates: Predicate<T>[]): Predicate<T>;
  export function anyOf<T>(...predicates: Predicate<T>[]): Predicate<T>;
  export function noneOf<T>(...predicates: Predicate<T>[]): Predicate<T>;
  export function once<T extends Fn>(fn: T): T;
  export function partial<Bound extends unknown[], Rest extends unknown[], Return>(
    callback: (...args: [...Bound, ...Rest]) => Return,
    ...boundArgs: Bound
  ): (...restArgs: Rest) => Return;
  export function pipe<A, B>(...fns: Array<(value: any) => any>): (value: A) => B;
  export function tap<T>(value: T, callback: (value: T) => void): T;
  export function throttle<F extends Fn>(fn: F, delay?: number, options?: Obj): F;

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
  export function range(start: number, stop?: number, step?: number): number[];
  export function round(value: number, precision?: number, parser?: (value: number) => number): number;
  export function standardDeviation<T>(array: readonly T[], callback?: (item: T) => number): number;
  export function sum<T>(array: readonly T[], callback?: (item: T) => number): number;
  export function variance<T>(array: readonly T[], callback?: (item: T) => number): number;

  export function currency(
    money: Money,
    options?: { locale?: string; maximumFractionDigits?: number; minimumFractionDigits?: number; style?: 'symbol' | 'code' | 'name' },
  ): string;
  export function exchange(money: Money, rate: { from: string; rate: number; to: string }): Money;

  export function stash<T, K extends readonly unknown[] = readonly unknown[], M = never>(
    options: CacheOptions<K>,
  ): Stash<T, K, M>;
  export function deepClone<T>(value: T): T;
  export function defaults<T extends Obj>(target: T, ...sources: Array<Partial<T>>): T;
  export function diff<T extends Obj>(
    prev?: T,
    curr?: T,
    compareFn?: (a: unknown, b: unknown) => boolean,
  ): { [K in keyof T]?: T[K] | typeof DELETED };
  export function deepMerge<T extends Obj[]>(...items: [...T]): Obj;
  export function shallowMerge<T extends Obj[]>(...items: [...T]): Obj;
  export function entries<T extends Obj>(obj: T): Array<[keyof T, T[keyof T]]>;
  export function filterValues<T extends Obj>(obj: T, predicate: (value: T[keyof T], key: keyof T) => boolean): Partial<T>;
  export function fromEntries<K extends PropertyKey, V>(input: Iterable<readonly [K, V]>): Record<K, V>;
  export function get<T extends Obj, P extends string>(
    item: T,
    path: P,
    defaultValue?: unknown,
    options?: { throwOnMissing?: boolean },
  ): unknown;
  export function has<T extends Obj, K extends PropertyKey>(item: T, key: K): key is keyof T;
  export function invert<T extends Record<PropertyKey, PropertyKey>>(obj: T): Record<T[keyof T], keyof T>;
  export function keys<T extends Obj>(obj: T): Array<keyof T>;
  export function mapKeys<T extends Obj>(obj: T, mapper: (key: keyof T, value: T[keyof T]) => PropertyKey): Obj;
  export function mapValues<T extends Obj, R>(obj: T, mapper: (value: T[keyof T], key: keyof T) => R): Record<keyof T, R>;
  export function omit<T extends Obj, K extends keyof T>(obj: T, keys: readonly K[]): Omit<T, K>;
  export function parseJSON<T extends object | string | number | boolean | null>(
    json: string | null | undefined,
    options?: {
      defaultValue?: T;
      onError?: (err: unknown) => void;
      reviver?: (key: string, value: any) => any;
      validator?: (value: any) => boolean;
    },
  ): T | undefined;
  export function pick<T extends Obj, K extends keyof T>(obj: T, keys: readonly K[]): Pick<T, K>;
  export function prune<T>(value: T): T | undefined;
  export function values<T extends Obj>(obj: T): Array<T[keyof T]>;

  export function draw<T>(array: readonly T[]): T | undefined;
  export function random(min?: number, max?: number): number;
  export function shuffle<T>(array: readonly T[]): T[];
  export function uuid(): string;

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
  export function truncate(str: string, limit?: number, options?: { ellipsis?: string; preserveWords?: boolean }): string;
  export function unescape(value: string): string;
  export function words(str: string): string[];

  export function isGreaterThan(left: number, right: number): boolean;
  export function isGreaterThanOrEqual(left: number, right: number): boolean;
  export function isLessThan(left: number, right: number): boolean;
  export function isLessThanOrEqual(left: number, right: number): boolean;
  export function isWithin(value: number, min: number, max: number): boolean;
  export function isArray(value: unknown): value is unknown[];
  export function isBoolean(value: unknown): value is boolean;
  export function isDate(value: unknown): value is Date;
  export function isDefined<T>(value: T | null | undefined): value is NonNullable<T>;
  export function isEmpty(value: unknown): boolean;
  export function isEqual(a: unknown, b: unknown): boolean;
  export function isFunction(value: unknown): value is Fn;
  export function isMatch(value: unknown, pattern: unknown): boolean;
  export function isNil(value: unknown): value is null | undefined;
  export function isNumber(value: unknown): value is number;
  export function isObject(value: unknown): value is Obj;
  export function isPrimitive(value: unknown): value is Primitive;
  export function isPromise<T = unknown>(value: unknown): value is Promise<T>;
  export function isRegex(value: unknown): value is RegExp;
  export function isString(value: unknown): value is string;
  export function typeOf(value: unknown): string;

  export const is: {
    array: typeof isArray;
    boolean: typeof isBoolean;
    date: typeof isDate;
    defined: typeof isDefined;
    empty: typeof isEmpty;
    equal: typeof isEqual;
    fn: typeof isFunction;
    greaterThan: typeof isGreaterThan;
    greaterThanOrEqual: typeof isGreaterThanOrEqual;
    lessThan: typeof isLessThan;
    lessThanOrEqual: typeof isLessThanOrEqual;
    match: typeof isMatch;
    nil: typeof isNil;
    number: typeof isNumber;
    object: typeof isObject;
    primitive: typeof isPrimitive;
    promise: typeof isPromise;
    regex: typeof isRegex;
    string: typeof isString;
    typeOf: typeof typeOf;
    within: typeof isWithin;
  };
}
`;
