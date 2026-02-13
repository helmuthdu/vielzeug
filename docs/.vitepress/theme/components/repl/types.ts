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

export const depositTypes = `
declare module '@vielzeug/deposit' {
  export type AdapterConfig<S extends DepositDataSchema> = {
    type: 'localStorage' | 'indexedDB';
    dbName: string;
    version: number;
    schema: S;
    migrationFn?: DepositMigrationFn<S>;
  };

  export type DataSchemaDef = Record<string, Record<string, unknown>>;

  export class Deposit<S extends DepositDataSchema> {
    constructor(adapterOrConfig: DepositStorageAdapter<S> | AdapterConfig<S>);
    bulkDelete<K extends keyof S>(table: K, keys: any[]): Promise<void>;
    bulkPut<K extends keyof S>(table: K, values: S[K]['record'][], ttl?: number): Promise<void>;
    clear<K extends keyof S>(table: K): Promise<void>;
    count<K extends keyof S>(table: K): Promise<number>;
    delete<K extends keyof S>(table: K, key: any): Promise<void>;
    get<K extends keyof S, T extends S[K]['record']>(table: K, key: any, defaultValue?: T): Promise<T | undefined>;
    getAll<K extends keyof S>(table: K): Promise<S[K]['record'][]>;
    put<K extends keyof S>(table: K, value: S[K]['record'], ttl?: number): Promise<void>;
    query<K extends keyof S>(table: K): any;
    patch<K extends keyof S>(table: K, patches: any[]): Promise<void>;
  }

  export type DepositDataSchema<S = DataSchemaDef> = {
    [K in keyof S]: DepotDataRecord<S[K], keyof S[K]>;
  };

  export type DepositMigrationFn<S extends DepositDataSchema> = (db: IDBDatabase, oldVersion: number, newVersion: number | null, transaction: IDBTransaction, schema: S) => void | Promise<void>;

  export type DepositStorageAdapter<S extends DepositDataSchema> = {
    bulkDelete<K extends keyof S>(table: K, keys: any[]): Promise<void>;
    bulkPut<K extends keyof S>(table: K, values: S[K]['record'][], ttl?: number): Promise<void>;
    clear<K extends keyof S>(table: K): Promise<void>;
    count<K extends keyof S>(table: K): Promise<number>;
    delete<K extends keyof S>(table: K, key: any): Promise<void>;
    get<K extends keyof S, T extends S[K]['record']>(table: K, key: any, defaultValue?: T): Promise<T | undefined>;
    getAll<K extends keyof S>(table: K): Promise<S[K]['record'][]>;
    put<K extends keyof S>(table: K, value: S[K]['record'], ttl?: number): Promise<void>;
    connect?(): Promise<void>;
  };

  export type DepotDataRecord<T, K extends keyof T = keyof T> = {
    indexes?: K[];
    key: K;
    record: T;
  };
}
`;

export const fetchitTypes = `
declare module '@vielzeug/fetchit' {
  export function createHttpClient(opts?: HttpClientOptions): {
    delete: (url: string, cfg?: any) => Promise<unknown>;
    get: (url: string, cfg?: any) => Promise<unknown>;
    getHeaders: () => Record<string, string>;
    patch: (url: string, cfg?: any) => Promise<unknown>;
    post: (url: string, cfg?: any) => Promise<unknown>;
    put: (url: string, cfg?: any) => Promise<unknown>;
    request: <T>(method: string, url: string, config?: any) => Promise<T>;
    setHeaders(next: Record<string, string | undefined>): void;
  };

  export function createQueryClient(opts?: any): {
    clearCache: () => void;
    fetch: <T>(options: any) => Promise<T>;
    getCacheSize: () => number;
    getData: <T>(key: any) => T | undefined;
    getState: <T>(key: any) => any;
    invalidate: (key: any) => void;
    mutate: <TData, TVariables = void>(options: any, variables: TVariables) => Promise<TData>;
    prefetch: <T>(opts: any) => Promise<void | T>;
    setData: <T>(key: any, dataOrUpdater: any) => void;
    subscribe: <T = unknown>(key: any, listener: any) => () => boolean;
    unsubscribe: <T = unknown>(key: any, listener: any) => void;
  };

  export type HttpClientOptions = {
    baseUrl?: string;
    headers?: Record<string, string>;
    timeout?: number;
    dedupe?: boolean;
    logger?: (level: 'info' | 'error', msg: string, meta?: unknown) => void;
  };
}
`;

export const formitTypes = `
declare module '@vielzeug/formit' {
  export function createForm<TForm extends Record<string, any> = Record<string, any>>(init?: any): {
    bind: (path: any, config?: any) => any;
    getError: (path: any) => string | undefined;
    getErrors: () => Record<string, string>;
    getStateSnapshot: () => any;
    getValue: (path: any) => any;
    getValues: () => TForm;
    isDirty: (path: any) => boolean;
    isTouched: (path: any) => boolean;
    markTouched: (path: any) => void;
    reset: (initialValues?: TForm) => void;
    resetErrors: () => void;
    setError: (path: any, message?: string) => void;
    setErrors: (next: any) => void;
    setValue: (path: any, value: any, options?: any) => any;
    setValues: (nextValues: Partial<TForm>, options?: any) => void;
    submit: (onSubmit: (values: TForm) => any, options?: any) => Promise<any>;
    subscribe: (listener: any) => () => boolean;
    subscribeField: (path: any, listener: any) => () => void;
    validateAll: (options?: any) => Promise<Record<string, string>>;
    validateField: (path: any, signal?: AbortSignal) => Promise<string | undefined>;
  };
}
`;

export const i18nitTypes = `
declare module '@vielzeug/i18nit' {
  export function createI18n(config?: any): any;
}
`;

export const logitTypes = `
declare module '@vielzeug/logit' {
  export const Logit: {
    assert: (valid: boolean, message: string, context: Record<string, any>) => void;
    debug: (...args: any[]) => void;
    error: (...args: any[]) => void;
    getEnvironment: () => boolean;
    getLevel: () => string;
    getPrefix: () => string;
    getTimestamp: () => boolean;
    getVariant: () => string;
    groupCollapsed: (text: string, label?: string, time?: number) => void;
    groupEnd: () => void;
    info: (...args: any[]) => void;
    scope: (namespace: string) => any;
    setLogLevel: (level: string) => void;
    setPrefix: (namespace: string) => void;
    setRemote: (remote: any) => void;
    setup: (options: any) => void;
    setVariant: (variant: string) => void;
    success: (...args: any[]) => void;
    table: (...args: any[]) => void;
    time: (label: string) => void;
    timeEnd: (label: string) => void;
    toggleEnvironment: (value?: boolean) => void;
    toggleTimestamp: (value?: boolean) => void;
    trace: (...args: any[]) => void;
    warn: (...args: any[]) => void;
  };
}
`;

export const permitTypes = `
declare module '@vielzeug/permit' {
  export const ANONYMOUS = "anonymous";
  export const WILDCARD = "*";

  export const Permit: {
    check<T, D>(user: T, resource: string, action: string, data?: D): boolean;
    clear(): void;
    hasRole(user: any, role: string): boolean;
    register<T, D>(role: string, resource: string, actions: any): void;
    readonly roles: any;
    set<T, D>(role: string, resource: string, actions: any, replace?: boolean): void;
    unregister(role: string, resource: string, action?: string): void;
  };
}
`;

export const stateitTypes = `
declare module '@vielzeug/stateit' {
  export type Subscriber<T> = (state: T, prev: T) => void;
  export type Selector<T, U> = (state: T) => U;
  export type Unsubscribe = () => void;
  export type EqualityFn<U> = (a: U, b: U) => boolean;

  export type StoreOptions<T> = {
    name?: string;
    equals?: EqualityFn<T>;
  };

  export class Store<T extends object> {
    get(): T;
    select<U>(selector: Selector<T, U>): U;
    getName(): string | undefined;
    replace(nextState: T): void;
    set(patch: Partial<T>): void;
    update(updater: (state: T) => T | Promise<T>): Promise<void>;
    reset(): void;
    subscribe(listener: Subscriber<T>): Unsubscribe;
    subscribe<U>(
      selector: Selector<T, U>,
      listener: Subscriber<U>,
      options?: { equality?: EqualityFn<U> }
    ): Unsubscribe;
    observe(observer: Subscriber<T>): Unsubscribe;
    createChild(patch?: Partial<T>): Store<T>;
    runInScope<R>(
      fn: (scopedStore: Store<T>) => R | Promise<R>,
      patch?: Partial<T>
    ): Promise<R>;
  }

  export function createStore<T extends object>(
    initialState: T,
    options?: StoreOptions<T>
  ): Store<T>;

  export function createTestStore<T extends object>(
    baseStore?: Store<T>,
    patch?: Partial<T>
  ): {
    store: Store<T>;
    dispose: () => void;
  };

  export function withMock<T extends object, R>(
    baseStore: Store<T>,
    patch: Partial<T>,
    fn: () => R | Promise<R>
  ): Promise<R>;

  export function shallowEqual(a: unknown, b: unknown): boolean;
  export function shallowMerge<T extends object>(state: T, patch: Partial<T>): T;
}
`;

export const validitTypes = `
declare module '@vielzeug/validit' {
  export const v: {
    any: () => any;
    array: (schema: any, options?: any) => any;
    boolean: () => any;
    coerce: any;
    date: () => any;
    email: () => any;
    literal: (value: any) => any;
    negativeInt: () => any;
    null: () => any;
    number: () => any;
    object: (shape: any) => any;
    oneOf: (...values: any[]) => any;
    positiveInt: () => any;
    string: () => any;
    undefined: () => any;
    union: (...schemas: any[]) => any;
    unknown: () => any;
    url: () => any;
    uuid: () => any;
    void: () => any;
  };
}
`;

export const wireitTypes = `
declare module '@vielzeug/wireit' {
  export type Token<T = unknown> = symbol & { __type?: T };
  export type Lifetime = 'singleton' | 'transient' | 'scoped';

  export type ValueProvider<T> = {
    useValue: T;
    lifetime?: Lifetime;
  };

  export type ClassProvider<T> = {
    useClass: new (...args: any[]) => T;
    deps?: Token<any>[];
    lifetime?: Lifetime;
  };

  export type FactoryProvider<T> = {
    useFactory: (...deps: any[]) => T | Promise<T>;
    deps?: Token<any>[];
    lifetime?: Lifetime;
    async?: boolean;
  };

  export type Provider<T> = ValueProvider<T> | ClassProvider<T> | FactoryProvider<T>;

  export type ContainerOptions = {
    parent?: Container;
    allowOptional?: boolean;
  };

  export class Container {
    register<T>(token: Token<T>, provider: Provider<T>): this;
    registerValue<T>(token: Token<T>, value: T, lifetime?: Lifetime): this;
    registerFactory<T>(
      token: Token<T>,
      factory: (...deps: any[]) => T | Promise<T>,
      deps?: Token<any>[],
      options?: { lifetime?: Lifetime; async?: boolean }
    ): this;
    registerMany(providers: Array<[Token<any>, Provider<any>]>): this;
    get<T>(token: Token<T>): T;
    getAsync<T>(token: Token<T>): Promise<T>;
    getOptional<T>(token: Token<T>): T | undefined;
    getOptionalAsync<T>(token: Token<T>): Promise<T | undefined>;
    has(token: Token<any>): boolean;
    alias<T>(source: Token<T>, alias: Token<T>): this;
    unregister<T>(token: Token<T>): this;
    clear(): void;
    createChild(overrides?: Array<[Token<any>, Provider<any>]>): Container;
    runInScope<T>(
      fn: (scope: Container) => Promise<T> | T,
      overrides?: Array<[Token<any>, Provider<any>]>
    ): Promise<T>;
    debug(): { tokens: string[]; aliases: Array<[string, string]> };
  }

  export function createToken<T = unknown>(description?: string): Token<T>;
  export function createContainer(options?: ContainerOptions): Container;
  export function createTestContainer(base?: Container): {
    container: Container;
    dispose: () => void;
  };
  export function withMock<T, R>(
    container: Container,
    token: Token<T>,
    mock: T,
    fn: () => Promise<R> | R
  ): Promise<R>;

  export class CircularDependencyError extends Error {}
  export class ProviderNotFoundError extends Error {}
  export class AsyncProviderError extends Error {}
}
`;

export const routeitTypes = `
declare module '@vielzeug/routeit' {
  export type RouteParams = Record<string, string>;
  export type QueryParams = Record<string, string | string[]>;
  export type RouterMode = 'history' | 'hash';

  export type RouteContext<T = unknown> = {
    params: RouteParams;
    query: QueryParams;
    pathname: string;
    hash: string;
    data?: T;
    user?: unknown;
    meta?: Record<string, unknown>;
    navigate: (path: string, opts?: NavigateOptions) => void;
  };

  export type RouteHandler<T = unknown> = (
    context: RouteContext<T>
  ) => void | Promise<void>;

  export type Middleware = (
    context: RouteContext,
    next: () => Promise<void>
  ) => void | Promise<void>;

  export type RouteDefinition<T = unknown> = {
    path: string;
    handler: RouteHandler<T>;
    name?: string;
    data?: T;
    middleware?: Middleware | Middleware[];
    children?: RouteDefinition<T>[];
  };

  export type NavigateOptions = {
    replace?: boolean;
    state?: unknown;
  };

  export type RouterOptions = {
    mode?: RouterMode;
    base?: string;
    notFound?: RouteHandler;
    middleware?: Middleware | Middleware[];
  };

  export class Router {
    route(definition: RouteDefinition): Router;
    routes(definitions: RouteDefinition[]): Router;
    get(path: string, handler: RouteHandler): Router;
    start(): Router;
    stop(): void;
    navigate(path: string, options?: NavigateOptions): void;
    navigateTo(name: string, params?: RouteParams, query?: QueryParams): void;
    back(): void;
    forward(): void;
    go(delta: number): void;
    buildUrl(path: string, params?: RouteParams, query?: QueryParams): string;
    urlFor(name: string, params?: RouteParams, query?: QueryParams): string;
    isActive(pattern: string): boolean;
    getCurrentPath(): string;
    getCurrentQuery(): QueryParams;
    getCurrentHash(): string;
    getState(): { pathname: string; params: RouteParams; query: QueryParams };
    getParams(): RouteParams;
    link(href: string, text: string, attributes?: Record<string, string>): HTMLAnchorElement;
    linkTo(name: string, params: RouteParams, text: string, attributes?: Record<string, string>): HTMLAnchorElement;
    subscribe(listener: () => void): () => void;
    debug(): { mode: RouterMode; base: string; routes: any[] };
  }

  export function createRouter(options?: RouterOptions): Router;
}
`;

export const libraryTypes = {
  deposit: depositTypes,
  fetchit: fetchitTypes,
  formit: formitTypes,
  i18nit: i18nitTypes,
  logit: logitTypes,
  permit: permitTypes,
  routeit: routeitTypes,
  stateit: stateitTypes,
  toolkit: toolkitTypes,
  validit: validitTypes,
  wireit: wireitTypes,
};
