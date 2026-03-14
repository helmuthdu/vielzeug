export const toolkitTypes = `
type MergeStrategy =
  | 'deep'
  | 'shallow'
  | 'lastWins'
  | 'arrayConcat'
  | 'arrayReplace'
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
  type TableDef<T, K extends keyof T = keyof T> = {
    indexes?: K[];
    key: K;
    record: T;
  };

  export type Schema<S = Record<string, Record<string, unknown>>> = {
    [K in keyof S]: TableDef<S[K], keyof S[K]>;
  };

  export type MigrationFn = (
    db: IDBDatabase,
    oldVersion: number,
    newVersion: number | null,
    transaction: IDBTransaction
  ) => void | Promise<void>;

  type AdapterConfig<S extends Schema> = {
    type: 'localStorage' | 'indexedDB';
    dbName: string;
    version?: number;
    schema: S;
    migrationFn?: MigrationFn;
    logger?: any;
  };

  export interface Adapter<S extends Schema> {
    get<K extends keyof S>(table: K, key: any, defaultValue?: S[K]['record']): Promise<S[K]['record'] | undefined>;
    getAll<K extends keyof S>(table: K): Promise<S[K]['record'][]>;
    put<K extends keyof S>(table: K, value: S[K]['record'], ttl?: number): Promise<void>;
    delete<K extends keyof S>(table: K, key: any): Promise<void>;
    clear<K extends keyof S>(table: K): Promise<void>;
    count<K extends keyof S>(table: K): Promise<number>;
    bulkPut<K extends keyof S>(table: K, values: S[K]['record'][], ttl?: number): Promise<void>;
    bulkDelete<K extends keyof S>(table: K, keys: any[]): Promise<void>;
    query<K extends keyof S>(table: K): QueryBuilder<S[K]['record']>;
  }

  export function createDeposit<S extends Schema>(config: AdapterConfig<S>): Adapter<S>;

  export class QueryBuilder<T extends Record<string, unknown>> {
    where<K extends keyof T>(field: K, predicate: (value: T[K], record: T) => boolean): QueryBuilder<T>;
    equals<K extends keyof T>(field: K, value: T[K]): QueryBuilder<T>;
    between<K extends keyof T>(field: K, lower: number, upper: number): QueryBuilder<T>;
    startsWith<K extends keyof T>(field: K, prefix: string, ignoreCase?: boolean): QueryBuilder<T>;
    filter(fn: (record: T) => boolean): QueryBuilder<T>;
    not(fn: (record: T) => boolean): QueryBuilder<T>;
    orderBy<K extends keyof T>(field: K, direction?: 'asc' | 'desc'): QueryBuilder<T>;
    limit(n: number): QueryBuilder<T>;
    offset(n: number): QueryBuilder<T>;
    page(pageNumber: number, pageSize: number): QueryBuilder<T>;
    reverse(): QueryBuilder<T>;
    map(callback: (record: T) => T): QueryBuilder<T>;
    search(query: string, tone?: number): QueryBuilder<T>;
    count(): Promise<number>;
    first(): Promise<T | undefined>;
    last(): Promise<T | undefined>;
    average<K extends keyof T>(field: K): Promise<number>;
    min<K extends keyof T>(field: K): Promise<T | undefined>;
    max<K extends keyof T>(field: K): Promise<T | undefined>;
    sum<K extends keyof T>(field: K): Promise<number>;
    toArray(): Promise<T[]>;
    toGrouped<K extends keyof T>(field: K): Promise<Array<{ key: T[K]; values: T[] }>>;
  }

  export function defineSchema<S extends Record<string, Record<string, unknown>>>(
    schema: { [K in keyof S]: { key: keyof S[K]; indexes?: (keyof S[K])[] } }
  ): Schema<S>;

  export class LocalStorageAdapter<S extends Schema> {
    constructor(dbName: string, schema: S, logger?: any);
    get<K extends keyof S>(table: K, key: any, defaultValue?: S[K]['record']): Promise<S[K]['record'] | undefined>;
    getAll<K extends keyof S>(table: K): Promise<S[K]['record'][]>;
    put<K extends keyof S>(table: K, value: S[K]['record'], ttl?: number): Promise<void>;
    delete<K extends keyof S>(table: K, key: any): Promise<void>;
    clear<K extends keyof S>(table: K): Promise<void>;
    count<K extends keyof S>(table: K): Promise<number>;
    bulkPut<K extends keyof S>(table: K, values: S[K]['record'][], ttl?: number): Promise<void>;
    bulkDelete<K extends keyof S>(table: K, keys: any[]): Promise<void>;
    query<K extends keyof S>(table: K): QueryBuilder<S[K]['record']>;
  }

  export class IndexedDBAdapter<S extends Schema> {
    constructor(dbName: string, version: number, schema: S, migrationFn?: MigrationFn, logger?: any);
    get<K extends keyof S>(table: K, key: any, defaultValue?: S[K]['record']): Promise<S[K]['record'] | undefined>;
    getAll<K extends keyof S>(table: K): Promise<S[K]['record'][]>;
    put<K extends keyof S>(table: K, value: S[K]['record'], ttl?: number): Promise<void>;
    delete<K extends keyof S>(table: K, key: any): Promise<void>;
    clear<K extends keyof S>(table: K): Promise<void>;
    count<K extends keyof S>(table: K): Promise<number>;
    bulkPut<K extends keyof S>(table: K, values: S[K]['record'][], ttl?: number): Promise<void>;
    bulkDelete<K extends keyof S>(table: K, keys: any[]): Promise<void>;
    query<K extends keyof S>(table: K): QueryBuilder<S[K]['record']>;
    transaction<K extends keyof S, T extends { [P in K]: S[P]['record'][] }>(
      tables: K[],
      fn: (stores: T) => Promise<void>,
      ttl?: number
    ): Promise<void>;
  }
}
`;

export const craftitTypes = `
declare module '@vielzeug/craftit' {
  export type CleanupFn = () => void;

  export class Signal<T> {
    get value(): T;
    set value(next: T);
    peek(): T;
    update(fn: (current: T) => T): void;
    assign(partial: T extends object ? Partial<T> : never): void;
    derive<U>(fn: (value: T) => U): Signal<U>;
    map<U>(fn: (item: T extends readonly (infer I)[] ? I : never, index: number) => U): Signal<U[]>;
    subscribe(cb: (value: T, prev: T) => void): CleanupFn;
    get debugName(): string | undefined;
  }

  export type ReadonlySignal<T> = Omit<Signal<T>, 'value' | 'update' | 'assign'> & {
    readonly value: T;
  };

  export type WatchOptions = { immediate?: boolean };

  export type HTMLResult = { strings: TemplateStringsArray; values: unknown[] };

  export type CSSResult = { strings: TemplateStringsArray; values: unknown[] };

  export type SetupContext = { host: HTMLElement };

  export type SetupResult =
    | string
    | HTMLResult
    | {
        template: string | HTMLResult;
        styles?: (string | CSSStyleSheet | CSSResult)[];
      }
    | Promise<unknown>;

  export type DefineOptions = {
    formAssociated?: boolean;
    target?: string | HTMLElement;
  };

  export type PropDescriptor<T> = {
    default?: T;
    reflect?: boolean;
    attribute?: string;
  };

  /** Create and register a web component. */
  export function define(
    name: string,
    setup: (ctx: SetupContext) => SetupResult,
    options?: DefineOptions
  ): void;

  /** Create a reactive signal. */
  export function signal<T>(initial: T, options?: { name?: string }): Signal<T>;

  /** Create a derived (read-only) computed signal. */
  export function computed<T>(fn: () => T): Signal<T>;

  /** Run a side effect whenever its signal dependencies change. Returns cleanup. */
  export function effect(fn: () => CleanupFn | void): CleanupFn;

  /** Watch a signal or selector for changes. Returns cleanup. */
  export function watch<T>(
    source: Signal<T> | (() => T),
    cb: (value: T, prev: T) => void,
    options?: WatchOptions
  ): CleanupFn;

  /** Batch multiple signal writes into a single update flush. */
  export function batch(fn: () => void): void;

  /** Read a signal value without tracking it as a dependency. */
  export function untrack<T>(fn: () => T): T;

  /** Wrap a signal as read-only. */
  export function readonly<T>(sig: Signal<T>): ReadonlySignal<T>;

  /** Returns true if the value is a Signal instance. */
  export function isSignal<T>(value: unknown): value is Signal<T>;

  /** Unwrap a signal value or return the plain value as-is. */
  export function toValue<T>(value: Signal<T> | T): T;

  /** Tagged template for reactive HTML. Returned value is used as the component template. */
  export const html: {
    (strings: TemplateStringsArray, ...values: unknown[]): HTMLResult;
    when(condition: Signal<boolean> | boolean, thenTpl: HTMLResult | string, elseTpl?: HTMLResult | string): HTMLResult;
    each<T>(list: Signal<T[]> | T[], keyFn: (item: T) => unknown, render: (item: T, index: number) => HTMLResult): HTMLResult;
    show(condition: Signal<boolean> | boolean, tpl: HTMLResult | string): HTMLResult;
    match<T>(value: Signal<T> | T, cases: Record<string, HTMLResult | string>): HTMLResult;
    bind(signal: Signal<string>): Record<string, unknown>;
    classes(map: Record<string, Signal<boolean> | boolean>): string;
    style(map: Record<string, Signal<string | number> | string | number>): string;
  };

  /** Tagged template for component-scoped CSS. */
  export const css: {
    (strings: TemplateStringsArray, ...values: unknown[]): CSSResult;
    theme<T extends Record<string, string | number>>(
      light: T,
      dark?: T,
      options?: { selector?: string; attribute?: string }
    ): { vars: { [K in keyof T]: string }; sheet: CSSResult };
  };

  /** Declare a reflected DOM property/attribute. */
  export function prop<T>(descriptor?: PropDescriptor<T>): Signal<T>;

  /** Declare multiple props at once. */
  export function defineProps<T extends Record<string, unknown>>(
    descriptors: { [K in keyof T]: PropDescriptor<T[K]> }
  ): { [K in keyof T]: Signal<T[K]> };

  /** Get a reactive ref to the first matching element in shadow DOM. */
  export function ref<E extends HTMLElement = HTMLElement>(selector: string): Signal<E | null>;

  /** Get a reactive ref to all matching elements in shadow DOM. */
  export function refs<E extends HTMLElement = HTMLElement>(selector: string): Signal<E[]>;

  /** Provide a value to descendant components via context. */
  export function provide<T>(context: { id: symbol }, value: T): void;

  /** Inject a value provided by an ancestor component. */
  export function inject<T>(context: { id: symbol }): T | undefined;

  /** Create a typed context key. */
  export function createContext<T>(defaultValue?: T): { id: symbol; defaultValue?: T };

  /** Declare the slots this component accepts. */
  export function defineSlots<T extends Record<string, boolean>>(slots: T): void;

  /** Declare the custom events this component can emit. */
  export function defineEmits<T extends Record<string, unknown>>(): {
    emit<K extends keyof T>(name: K, detail: T[K], options?: CustomEventInit): void;
  };

  /** Run a callback when the component is first connected to the DOM. */
  export function onMount(cb: () => CleanupFn | void): void;

  /** Run a callback when the component is disconnected from the DOM. */
  export function onUnmount(cb: () => void): void;

  /** Run a callback whenever the component's template re-renders. */
  export function onUpdated(cb: () => void): void;

  /** Register a cleanup callback that runs on unmount. */
  export function onCleanup(cb: () => void): void;

  /** Add a delegated event listener on shadow DOM elements. */
  export function handle<E extends Event = Event>(
    selector: string,
    event: string,
    handler: (e: E, target: Element) => void,
    options?: AddEventListenerOptions
  ): void;

  /** Set ARIA attributes on the component host. */
  export function aria(attrs: Record<string, string | boolean | null>): void;

  /** Associate a form field with this element (used inside form-associated components). */
  export function field(options?: { name?: string }): ElementInternals;

  /** Callback: fired when element is associated with a form. */
  export function onFormAssociated(cb: (form: HTMLFormElement | null) => void): void;

  /** Callback: fired when the containing form is disabled/enabled. */
  export function onFormDisabled(cb: (disabled: boolean) => void): void;

  /** Callback: fired when the containing form is reset. */
  export function onFormReset(cb: () => void): void;

  /** Callback: fired when the browser restores form state (e.g. back navigation). */
  export function onFormStateRestore(
    cb: (state: string | File | FormData | null, mode: 'restore' | 'autocomplete') => void
  ): void;
}
`;

export const fetchitTypes = `
declare module '@vielzeug/fetchit' {
  export type HttpRequestConfig = {
    body?: unknown;
    params?: Record<string, string | number | boolean | undefined>;  // Path parameters (replace :id or {id})
    query?: Record<string, string | number | boolean | undefined>;   // Query string parameters (?key=value)
    dedupe?: boolean;
    headers?: Record<string, string>;
    signal?: AbortSignal;
  };

  export function createHttp(opts?: HttpClientOptions): {
    delete: (url: string, cfg?: HttpRequestConfig) => Promise<unknown>;
    get: (url: string, cfg?: HttpRequestConfig) => Promise<unknown>;
    patch: (url: string, cfg?: HttpRequestConfig) => Promise<unknown>;
    post: (url: string, cfg?: HttpRequestConfig) => Promise<unknown>;
    put: (url: string, cfg?: HttpRequestConfig) => Promise<unknown>;
    request: <T>(method: string, url: string, config?: HttpRequestConfig) => Promise<T>;
    headers(next: Record<string, string | undefined>): void;
  };

  export function createQuery(opts?: QueryClientOptions): {
    clear: () => void;
    fetch: <T>(options: any) => Promise<T>;
    getData: <T>(key: any) => T | undefined;
    getState: <T>(key: any) => any;
    invalidate: (key: any) => void;
    mutate: <TData, TVariables = void>(options: any, variables: TVariables) => Promise<TData>;
    prefetch: <T>(opts: any) => Promise<void | T>;
    setData: <T>(key: any, dataOrUpdater: any) => void;
    subscribe: <T = unknown>(key: any, listener: any) => () => boolean;
  };

  export type HttpClientOptions = {
    baseUrl?: string;
    headers?: Record<string, string>;
    timeout?: number;
    dedupe?: boolean;
    logger?: (level: 'info' | 'error', msg: string, meta?: unknown) => void;
  };

  export type QueryClientOptions = {
    staleTime?: number;
    gcTime?: number;
  };
}
`;

export const formitTypes = `
declare module '@vielzeug/formit' {
  export type Errors = Map<string, string>;
  export type MaybePromise<T> = T | Promise<T>;
  export type FieldValidator = (value: FormDataEntryValue) => MaybePromise<string | undefined | null>;
  export type FormValidator = (formData: FormData) => MaybePromise<Errors | undefined | null>;

  export type FieldConfig<TValue = any> = {
    value: TValue;
    validators?: FieldValidator | Array<FieldValidator>;
  };

  export type FormInit = {
    fields?: Record<string, FieldConfig>;
    validate?: FormValidator;
  };

  export type FormState = {
    errors: Errors;
    touched: Set<string>;
    dirty: Set<string>;
    isValidating: boolean;
    isSubmitting: boolean;
    submitCount: number;
  };

  export type BindConfig = {
    valueExtractor?: (event: any) => any;
    markTouchedOnBlur?: boolean;
  };

  export class ValidationError extends Error {
    readonly errors: Errors;
    readonly type: 'validation';
  }

  export function createForm(init?: FormInit): {
    // Value management
    get(name: string): any;
    set(name: string, value: any, options?: { setDirty?: boolean; setTouched?: boolean }): void;
    set(entries: Record<string, any> | FormData, options?: { replace?: boolean; setDirty?: boolean }): void;
    values(): Record<string, any>;
    data(): FormData;
    clone(): FormData;

    // Error management
    error(name?: string): string | undefined | Errors;
    error(name: string, message: string): void;
    errors(nextErrors: Errors | Record<string, string>): void;

    // Touch/Dirty management
    touch(name: string): boolean;
    touch(name: string, mark: boolean): void;
    dirty(name: string): boolean;

    // Validation
    validate(name: string): Promise<string | undefined>;
    validate(options?: { signal?: AbortSignal; onlyTouched?: boolean; fields?: string[] }): Promise<Errors>;

    // Submission
    submit(onSubmit: (formData: FormData) => MaybePromise<any>, options?: { signal?: AbortSignal; validate?: boolean }): Promise<any>;

    // Subscriptions
    subscribe(listener: (state: FormState) => void): () => void;
    subscribeOnly<TValue>(name: string, listener: (payload: {
      value: TValue | undefined;
      error?: string;
      touched: boolean;
      dirty: boolean;
    }) => void): () => void;

    // Field binding
    bind(name: string, config?: BindConfig): {
      name: string;
      value: any;
      onChange: (event: any) => void;
      onBlur: () => void;
      set: (newValue: any | ((prev: any) => any)) => void;
    };

    // State management
    reset(newFormData?: FormData | Record<string, any>): void;
    snapshot(): FormState;
  };
}
`;

export const i18nitTypes = `
declare module '@vielzeug/i18nit' {
  export type Locale = string;

  export type PluralForm = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

  export type PluralMessages = Partial<Record<PluralForm, string>> & { other: string };

  export type MessageValue = string | PluralMessages;

  export type Messages = {
    [key: string]: MessageValue | Messages;
  };

  export type TranslateOptions = {
    locale?: Locale;
    escape?: boolean;
  };

  export type I18nConfig = {
    locale?: Locale;
    fallback?: Locale | Locale[];
    messages?: Record<Locale, Messages>;
    loaders?: Record<Locale, (locale: Locale) => Promise<Messages>>;
    escape?: boolean;
  };

  export class I18n {
    // Translation Methods
    t(key: string, vars?: Record<string, unknown>, options?: TranslateOptions): string;

    // Locale Management
    getLocale(): Locale;
    setLocale(locale: Locale): void;

    // Message Management
    add(locale: Locale, messages: Messages): void;
    set(locale: Locale, messages: Messages): void;
    getMessages(locale: Locale): Messages | undefined;
    hasLocale(locale: Locale): boolean;
    has(key: string, locale?: Locale): boolean;

    // Async Loaders
    load(locale: Locale): Promise<void>;
    loadAll(locales: Locale[]): Promise<void>;
    register(locale: Locale, loader: (locale: Locale) => Promise<Messages>): void;
    hasAsync(key: string, locale?: Locale): Promise<boolean>;

    // Formatting Helpers
    number(value: number, options?: Intl.NumberFormatOptions, locale?: Locale): string;
    date(value: Date | number, options?: Intl.DateTimeFormatOptions, locale?: Locale): string;

    // Namespaced Translator
    namespace(ns: string): { t: (key: string, vars?: Record<string, unknown>, options?: TranslateOptions) => string };

    // Subscriptions
    subscribe(handler: (locale: Locale) => void): () => void;
  }

  export function createI18n(config?: I18nConfig): I18n;
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

  export type PermissionData = Record<string, unknown>;

  export type BaseUser = {
    id: string;
    roles: string[];
  };

  export type PermissionAction = 'create' | 'read' | 'update' | 'delete';

  export type PermissionCheck<T extends BaseUser = BaseUser, D extends PermissionData = PermissionData> =
    | boolean
    | ((user: T, data?: D) => boolean);

  export type PermissionActions<T extends BaseUser = BaseUser, D extends PermissionData = PermissionData> = Partial<
    Record<PermissionAction, PermissionCheck<T, D>>
  >;

  export class Permit<T extends BaseUser = BaseUser, D extends PermissionData = PermissionData> {
    /** Check if a user can perform an action on a resource. */
    check(user: T, resource: string, action: PermissionAction, data?: D): boolean;
    /** Register or merge permissions for a role+resource. Pass replace=true to overwrite. */
    set(role: string, resource: string, actions: PermissionActions<T, D>, replace?: boolean): void;
    /** Remove permissions for a role+resource (or a single action). */
    remove(role: string, resource: string, action?: PermissionAction): void;
    /** Check if a user has a specific role (case-insensitive). */
    hasRole(user: BaseUser, role: string): boolean;
    /** Clear all registered permissions. */
    clear(): void;
    /** Deep copy of all registered permissions. */
    readonly roles: Map<string, Map<string, PermissionActions<T, D>>>;
  }

  /** Create a new, isolated permit instance. */
  export function createPermit<T extends BaseUser = BaseUser, D extends PermissionData = PermissionData>(): Permit<T, D>;
}
`;

export const snapitTypes = `
declare module '@vielzeug/stateit' {
  export type Listener<T> = (curr: T, prev: T) => void;
  export type Selector<T, U> = (data: T) => U;
  export type Unsubscribe = () => void;
  export type EqualityFn<U> = (a: U, b: U) => boolean;

  export type StateOptions<T> = {
    name?: string;
    equals?: EqualityFn<T>;
  };

  export type Computed<U> = {
    get: () => U;
    subscribe: (listener: Listener<U>) => Unsubscribe;
  };

  export class State<T extends object> {
    get(): T;
    get<U>(selector: Selector<T, U>): U;
    set(patch: Partial<T>): void;
    set(updater: (data: T) => T): void;
    set(updater: (data: T) => Promise<T>): Promise<void>;
    reset(): void;
    subscribe(listener: Listener<T>): Unsubscribe;
    subscribe<U>(
      selector: Selector<T, U>,
      listener: Listener<U>,
      options?: { equality?: EqualityFn<U> }
    ): Unsubscribe;
    computed<U>(
      selector: Selector<T, U>,
      options?: { equality?: EqualityFn<U> }
    ): Computed<U>;
    transaction(fn: () => void): void;
    createChild(patch?: Partial<T>): State<T>;
    runInScope<R>(
      fn: (scopedState: State<T>) => R | Promise<R>,
      patch?: Partial<T>
    ): Promise<R>;
  }

  export function createSnapshot<T extends object>(
    initialState: T,
    options?: StateOptions<T>
  ): State<T>;

  export function createTestState<T extends object>(
    baseState?: State<T>,
    patch?: Partial<T>
  ): {
    state: State<T>;
    dispose: () => void;
  };

  export function withStateMock<T extends object, R>(
    baseState: State<T>,
    patch: Partial<T>,
    fn: (scopedState: State<T>) => R | Promise<R>
  ): Promise<R>;

  export function shallowEqual(a: unknown, b: unknown): boolean;
  export function shallowMerge<T extends object>(state: T, patch: Partial<T>): T;
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
    enum: (...values: any[]) => any;
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
  craftit: craftitTypes,
  deposit: depositTypes,
  fetchit: fetchitTypes,
  formit: formitTypes,
  i18nit: i18nitTypes,
  logit: logitTypes,
  permit: permitTypes,
  routeit: routeitTypes,
  stateit: snapitTypes,
  toolkit: toolkitTypes,
  validit: validitTypes,
  wireit: wireitTypes,
};
