export const toolkitTypes = `
type MergeStrategy =
  | 'deep'
  | 'shallow'
  | 'lastWins'
  | 'arrayConcat'
  | 'arrayReplace'
  // biome-ignore lint/suspicious/noExplicitAny: -
  | ((target: any, source: any) => any);

type Obj = Record<string, any>;

type DeepMerge<T, U> = T extends Obj
  ? U extends Obj
    ? {
        [K in keyof T | keyof U]: K extends keyof T
          ? K extends keyof U
            ? DeepMerge<T[K], U[K]>
            : T[K]
          : K extends keyof U
            ? U[K]
            : never;
      }
    : U
  : U;

type Merge<T extends Obj[]> = T extends [infer First, ...infer Rest]
  ? First extends Obj
    ? Rest extends Obj[]
      ? DeepMerge<First, Merge<Rest>>
      : First
    : Obj
  : Obj;

declare module '@vielzeug/toolkit' {
  // Array utilities
  export function aggregate<T, R>(array: T[], aggregator: (acc: R, item: T) => R, initial: R): R
  export function alternate<T>(...arrays: T[][]): T[]
  export function chunk<T>(array: T[], size: number): T[][]
  export function filter<T>(array: T[], predicate: (item: T, index: number, array: T[]) => boolean): T[]
  export function map<T, R>(array: T[], mapper: (item: T, index: number, array: T[]) => R): R[]
  export function group<T, K extends PropertyKey>(array: T[], getKey: (item: T) => K): Record<K, T[]>
  export function sort<T>(array: T[], compare?: (a: T, b: T) => number): T[]
  export function uniq<T>(array: T[]): T[]
  export function flatten<T>(array: (T | T[])[]): T[]
  export function compact<T>(array: (T | null | undefined)[]): T[]
  export function find<T>(array: T[], predicate: (item: T) => boolean): T | undefined
  export function some<T>(array: T[], predicate: (item: T) => boolean): boolean
  export function every<T>(array: T[], predicate: (item: T) => boolean): boolean

  // Object utilities
  export function merge<T extends Obj[]>(strategy: MergeStrategy, ...items: [...T]): Merge<T>
  export function clone<T>(obj: T): T
  export function path<T>(obj: any, path: string): T | undefined
  export function diff<T>(obj1: T, obj2: T): Partial<T>
  export function keys<T extends Record<string, any>>(obj: T): (keyof T)[]
  export function values<T extends Record<string, any>>(obj: T): T[keyof T][]
  export function entries<T extends Record<string, any>>(obj: T): [keyof T, T[keyof T]][]

  // String utilities
  export function camelCase(str: string): string
  export function kebabCase(str: string): string
  export function pascalCase(str: string): string
  export function snakeCase(str: string): string
  export function truncate(str: string, length: number, suffix?: string): string
  export function similarity(str1: string, str2: string): number

  // Math utilities
  export function average(numbers: number[]): number
  export function clamp(value: number, min: number, max: number): number
  export function range(start: number, end: number, step?: number): number[]
  export function sum(numbers: number[]): number
  export function max(numbers: number[]): number
  export function min(numbers: number[]): number
  export function median(numbers: number[]): number
  export function round(value: number, precision?: number): number

  // Date utilities
  export function expires(date: Date | string | number): boolean
  export function timeDiff(date1: Date, date2?: Date, units?: string[]): string
  export function interval(date1: Date, date2: Date): { days: number, hours: number, minutes: number, seconds: number }

  // Function utilities
  export function assert(condition: any, message: string, options?: { args?: any, type?: any }): void
  export function assertParams(params: any[], types: any[]): void
  export function attempt<T>(fn: () => T): T | undefined
  export function compare(a: any, b: any): number
  export function compareBy<T>(fn: (item: T) => any): (a: T, b: T) => number
  export function compose<T, R>(...fns: Array<(arg: any) => any>): (input: T) => R
  export function curry(fn: (...args: any[]) => any): (...args: any[]) => any
  export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): T
  export function delay(ms: number): Promise<void>
  export function fp<T extends (...args: any[]) => any>(fn: T): T
  export function throttle<T extends (...args: any[]) => any>(fn: T, delay: number): T
  export function pipe<T, R>(...fns: Array<(arg: any) => any>): (input: T) => R
  export function memo<T extends (...args: any[]) => any>(fn: T): T
  export function once<T extends (...args: any[]) => any>(fn: T): T
  export function predict<T>(fn: () => boolean, options?: { interval?: number, timeout?: number }): Promise<void>
  export function proxy<T extends object>(target: T, handler: ProxyHandler<T>): T
  export function sleep(ms: number): Promise<void>
  export function retry<T>(fn: () => T | Promise<T>, options?: { retries?: number, delay?: number }): Promise<T>
  export function worker<T, R>(fn: (arg: T) => R): (arg: T) => Promise<R>

  // Type utilities
  export function is(value: any, type: any): boolean
  export function isArray(value: any): value is any[]
  export function isObject(value: any): value is object
  export function isString(value: any): value is string
  export function isNumber(value: any): value is number
  export function isBoolean(value: any): value is boolean
  export function isDate(value: any): value is Date
  export function isFunction(value: any): value is Function
  export function isMatch(value: any, pattern: any): boolean
  export function isPromise(value: any): value is Promise<any>
  export function isRegex(value: any): value is RegExp
  export function isEmpty(value: any): boolean
  export function isEqual(a: any, b: any): boolean
  export function isDefined<T>(value: T | undefined | null): value is T
  export function isNil(value: any): value is null | undefined
  export function isPrimitive(value: any): boolean
  export function isEven(value: number): boolean
  export function isOdd(value: number): boolean
  export function isPositive(value: number): boolean
  export function isNegative(value: number): boolean
  export function isZero(value: number): boolean
  export function isWithin(value: number, min: number, max: number): boolean
  export function gt(a: any, b: any): boolean
  export function ge(a: any, b: any): boolean
  export function lt(a: any, b: any): boolean
  export function le(a: any, b: any): boolean

  // Random utilities
  export function draw<T>(array: T[]): T | undefined
  export function random(min?: number, max?: number): number
  export function shuffle<T>(array: T[]): T[]
  export function uuid(): string

  // Misc
  export function typeOf(value: any): string
  export function boil<T>(array: T[], compare: (a: T, b: T) => T): T
  export function rate(value: number, total: number): number
  export function seek<T>(obj: any, path: string): T | undefined
}
`;
