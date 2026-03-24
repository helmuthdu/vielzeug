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
  export type MigrationFn = (
    db: IDBDatabase,
    oldVersion: number,
    newVersion: number | null,
    transaction: IDBTransaction
  ) => void;

  export interface Adapter<S extends Schema<any>> {
    count<K extends keyof S>(table: K): Promise<number>;
    delete<K extends keyof S>(table: K, key: any): Promise<void>;
    deleteAll<K extends keyof S>(table: K): Promise<void>;
    deleteMany<K extends keyof S>(table: K, keys: any[]): Promise<void>;
    from<K extends keyof S>(table: K): QueryBuilder<any>;
    get<K extends keyof S>(table: K, key: any): Promise<any | undefined>;
    getAll<K extends keyof S>(table: K): Promise<any[]>;
    getMany<K extends keyof S>(table: K, keys: any[]): Promise<any[]>;
    getOr<K extends keyof S>(table: K, key: any, defaultValue: any): Promise<any>;
    getOrPut<K extends keyof S>(table: K, key: any, factory: () => any | Promise<any>, ttl?: number): Promise<any>;
    has<K extends keyof S>(table: K, key: any): Promise<boolean>;
    patch<K extends keyof S>(table: K, key: any, partial: Partial<any>): Promise<any | undefined>;
    put<K extends keyof S>(table: K, value: any, ttl?: number): Promise<void>;
    putMany<K extends keyof S>(table: K, values: any[], ttl?: number): Promise<void>;
  }

  export interface IndexedDBHandle<S extends Schema<any>> extends Adapter<S> {
    transaction<K extends keyof S>(tables: K[], fn: (tx: any) => Promise<void>): Promise<void>;
    close(): void;
  }

  export interface Schema<S extends Record<string, Record<string, unknown>>> {}

  export function defineSchema<S extends Record<string, Record<string, unknown>>>(
    schema: { [K in keyof S]: { key: keyof S[K] & string; indexes?: (keyof S[K] & string)[] } }
  ): Schema<S>;

  export function createLocalStorage<S extends Record<string, Record<string, unknown>>>(options: {
    dbName: string;
    schema: Schema<S>;
    logger?: { error(...args: unknown[]): void; warn(...args: unknown[]): void };
  }): Adapter<Schema<S>>;

  export function createIndexedDB<S extends Record<string, Record<string, unknown>>>(options: {
    dbName: string;
    version: number;
    schema: Schema<S>;
    migrationFn?: MigrationFn;
    logger?: { error(...args: unknown[]): void; warn(...args: unknown[]): void };
  }): IndexedDBHandle<Schema<S>>;

  export function storeField(field: string): string;

  export const ttl: {
    seconds(n: number): number;
    minutes(n: number): number;
    hours(n: number): number;
    days(n: number): number;
    at(date: Date | number): number;
  };

  export class QueryBuilder<T extends Record<string, unknown>> {
    where<K extends keyof T>(field: K, predicate: (value: T[K], record: T) => boolean): QueryBuilder<T>;
    equals<K extends keyof T>(field: K, value: T[K]): QueryBuilder<T>;
    orderBy<K extends keyof T>(field: K, direction?: 'asc' | 'desc'): QueryBuilder<T>;
    limit(n: number): QueryBuilder<T>;
    offset(n: number): QueryBuilder<T>;
    filter(fn: (record: T) => boolean): QueryBuilder<T>;
    map<U>(callback: (record: T) => U): any;
    search(query: string, tone?: number): QueryBuilder<T>;
    count(): Promise<number>;
    first(): Promise<T | undefined>;
    last(): Promise<T | undefined>;
    toArray(): Promise<T[]>;
    toGrouped<K extends keyof T>(field: K): Promise<Array<{ key: T[K]; values: T[] }>>;
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
  export type ApiClientOptions = {
    baseUrl?: string;
    dedupe?: boolean;
    headers?: Record<string, string>;
    timeout?: number;
    logger?: (level: 'info' | 'warn' | 'error', msg: string, meta?: unknown) => void;
  };

  export type HttpRequestConfig<P extends string = string> = RequestInit & {
    body?: unknown;
    query?: Record<string, string | number | boolean | undefined>;
    params?: Record<string, string | number | boolean>;
    dedupe?: boolean;
    timeout?: number;
  };

  export type Interceptor = (
    ctx: { init: RequestInit; url: string },
    next: (ctx: { init: RequestInit; url: string }) => Promise<Response>
  ) => Promise<Response>;

  export function createApi(opts?: ApiClientOptions): {
    get<T = unknown>(url: string, cfg?: HttpRequestConfig): Promise<T>;
    post<T = unknown>(url: string, cfg?: HttpRequestConfig): Promise<T>;
    put<T = unknown>(url: string, cfg?: HttpRequestConfig): Promise<T>;
    patch<T = unknown>(url: string, cfg?: HttpRequestConfig): Promise<T>;
    delete<T = unknown>(url: string, cfg?: HttpRequestConfig): Promise<T>;
    request<T = unknown>(method: string, url: string, config?: HttpRequestConfig): Promise<T>;
    headers(updates: Record<string, string | undefined>): void;
    use(interceptor: Interceptor): () => void;
    dispose(): void;
    readonly disposed: boolean;
    [Symbol.dispose](): void;
  };

  export type QueryClientOptions = {
    staleTime?: number;
    gcTime?: number;
  };

  export type QueryOptions<T> = {
    queryKey: unknown[];
    queryFn: () => Promise<T>;
    staleTime?: number;
    enabled?: boolean;
  };

  export type QueryState<T> = {
    data: T | undefined;
    error: Error | null;
    status: 'pending' | 'success' | 'error';
    isLoading: boolean;
    isSuccess: boolean;
    isError: boolean;
    dataUpdatedAt: number;
  };

  export function createQuery(opts?: QueryClientOptions): {
    query<T>(options: QueryOptions<T>): Promise<T>;
    get<T>(key: unknown[]): T | undefined;
    getState<T>(key: unknown[]): QueryState<T> | null;
    set<T>(key: unknown[], data: T): void;
    invalidate(key: unknown[]): void;
    prefetch<T>(options: Omit<QueryOptions<T>, 'enabled'>): Promise<T | undefined>;
    subscribe<T>(key: unknown[], listener: (state: QueryState<T>) => void): () => void;
    cancel(key: unknown[]): void;
    clear(): void;
    dispose(): void;
    readonly disposed: boolean;
    [Symbol.dispose](): void;
  };

  export type MutationOptions<TData = unknown, TVariables = unknown> = {
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: Error, variables: TVariables) => void;
    onSettled?: (data: TData | undefined, error: Error | null, variables: TVariables) => void;
    retries?: number;
    retryDelay?: number;
  };

  export type MutationState<TData = unknown> = {
    data: TData | undefined;
    error: Error | null;
    status: 'idle' | 'pending' | 'success' | 'error';
    isIdle: boolean;
    isPending: boolean;
    isSuccess: boolean;
    isError: boolean;
  };

  export function createMutation<TData, TVariables = void>(
    mutationFn: (variables: TVariables) => Promise<TData>,
    opts?: MutationOptions<TData, TVariables>
  ): {
    mutate(variables: TVariables, callOpts?: { signal?: AbortSignal }): Promise<TData>;
    getState(): MutationState<TData>;
    reset(): void;
    cancel(): void;
    subscribe(listener: (state: MutationState<TData>) => void): () => void;
  };

  export class HttpError extends Error {
    readonly name: 'HttpError';
    readonly url: string;
    readonly method: string;
    readonly status?: number;
    readonly data?: unknown;
    readonly response?: Response;
    readonly isTimeout: boolean;
    readonly isAborted: boolean;
    static is(err: unknown, status?: number): err is HttpError;
  }

  export function serializeKey(value: unknown): string;
}
`;

export const formitTypes = `
declare module '@vielzeug/formit' {
  export type MaybePromise<T> = T | Promise<T>;
  export type FieldValidator<V = unknown> = (value: V, signal: AbortSignal) => MaybePromise<string | undefined>;

  export type FieldConfig<V = unknown> = {
    value?: V;
    validators?: FieldValidator<V> | FieldValidator<V>[];
  };

  export type FormOptions<TValues extends Record<string, unknown>> = {
    fields?: { [K in keyof TValues]?: TValues[K] | FieldConfig<TValues[K]> } | Record<string, any | FieldConfig>;
    validator?: (values: TValues) => MaybePromise<Record<string, string> | null | undefined>;
  };

  export type FieldState<V = unknown> = {
    value: V;
    error: string | undefined;
    touched: boolean;
    dirty: boolean;
  };

  export type FormState<TValues extends Record<string, unknown> = Record<string, unknown>> = {
    errors: Record<string, string>;
    isDirty: boolean;
    isTouched: boolean;
    isValid: boolean;
    isValidating: boolean;
    isSubmitting: boolean;
    submitCount: number;
    dirtyFields: string[];
  };

  export type BindConfig = {
    touchOnBlur?: boolean;
    validateOnBlur?: boolean;
    validateOnChange?: boolean;
    valueExtractor?: (event: unknown) => unknown;
  };

  export type BindResult<V = unknown, K extends string = string> = {
    readonly name: K;
    readonly value: V;
    readonly error: string | undefined;
    readonly touched: boolean;
    readonly dirty: boolean;
    onChange(event: unknown): void;
    onBlur(): void;
  };

  export type ValidateResult = {
    errors: Record<string, string>;
    valid: boolean;
  };

  export type SetOptions = { setDirty?: boolean; setTouched?: boolean };

  export interface Form<TValues extends Record<string, unknown> = Record<string, unknown>> {
    // Value management
    get<K extends string>(name: K): any;
    set<K extends string>(name: K, value: unknown, options?: SetOptions): void;
    patch(entries: Partial<TValues>, options?: SetOptions): void;
    values(): TValues;
    toFormData(): FormData;

    // Field state
    field(name: string): FieldState;
    getError(name: string): string | undefined;
    readonly errors: Record<string, string>;
    isFieldDirty(name: string): boolean;
    isFieldTouched(name: string): boolean;

    // Touch management
    touch(...names: string[]): void;
    touchAll(): void;
    untouch(name: string): void;
    untouchAll(): void;

    // Error management
    setError(name: string, message?: string): void;
    setErrors(errors: Record<string, string>): void;
    clearErrors(): void;

    // Array fields
    appendField(name: string, value: unknown): void;
    removeField(name: string, index: number): void;
    moveField(name: string, from: number, to: number): void;
    resetField(name: string): void;

    // Validation
    validate(options?: { fields?: string[]; onlyTouched?: boolean; signal?: AbortSignal }): Promise<ValidateResult>;
    validateField(name: string, signal?: AbortSignal): Promise<string | undefined>;

    // Submission
    submit<TResult = void>(
      handler: (values: TValues) => MaybePromise<TResult>,
      options?: { signal?: AbortSignal; skipValidation?: boolean; fields?: string[] }
    ): Promise<TResult>;

    // Subscriptions
    subscribe(listener: (state: FormState<TValues>) => void, options?: { immediate?: boolean }): () => void;
    watch(name: string, listener: (state: FieldState) => void, options?: { immediate?: boolean }): () => void;

    // Binding
    bind(name: string, config?: BindConfig): BindResult;

    // State
    readonly state: FormState<TValues>;
    readonly isDirty: boolean;
    readonly isTouched: boolean;
    readonly isValid: boolean;
    readonly isValidating: boolean;
    readonly isSubmitting: boolean;
    readonly submitCount: number;
    reset(newValues?: Partial<TValues>): void;
    dispose(): void;
    readonly disposed: boolean;
  }

  export function createForm<TValues extends Record<string, unknown> = Record<string, unknown>>(
    init?: FormOptions<TValues>
  ): Form<TValues>;

  export type SafeParseSchema = {
    safeParseAsync(data: unknown): Promise<{ success: boolean; data?: unknown; error?: unknown }>;
  };

  export function fromSchema<TValues extends Record<string, unknown>>(
    schema: SafeParseSchema
  ): Pick<FormOptions<TValues>, 'validator'>;

  export function toFormData(values: Record<string, unknown>): FormData;

  export class FormValidationError extends Error {
    readonly errors: Record<string, string>;
    readonly type: 'validation';
    constructor(errors: Record<string, string>);
  }

  export class SubmitError extends Error {
    readonly cause: unknown;
  }
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

export const stateitTypes = `
declare module '@vielzeug/stateit' {
  export type CleanupFn = () => void;
  export type EqualityFn<T> = (a: T, b: T) => boolean;
  export type ReactiveOptions<T> = { equals?: EqualityFn<T> };
  export type WatchOptions<T> = { immediate?: boolean; equals?: EqualityFn<T> };

  export interface Subscription {
    dispose(): void;
    [Symbol.dispose](): void;
  }

  export interface Disposable {
    dispose(): void;
    [Symbol.dispose](): void;
  }

  export interface ReadonlySignal<T> {
    readonly value: T;
    peek(): T;
    subscribe(listener: (value: T, prev: T) => void): Subscription;
  }

  export interface Signal<T> extends ReadonlySignal<T> {
    value: T;
    set(next: T): void;
  }

  export interface ComputedSignal<T> extends ReadonlySignal<T>, Disposable {
    readonly stale: boolean;
  }

  export interface WritableSignal<T> extends Signal<T>, Disposable {}

  export interface Store<T extends object> extends Signal<T> {
    readonly frozen: boolean;
    /** Shallow-merge a partial object into the current state. */
    patch(partial: Partial<T>): void;
    /** Derive next state from current state via updater function. */
    update(fn: (s: T) => T): void;
    /** Reset to original initial state. */
    reset(): void;
    /** Create a lazily recomputed derived signal from a slice of this store. */
    select<U>(selector: (s: T) => U, options?: ReactiveOptions<U>): ComputedSignal<U>;
    /** Freeze the store; further writes are silently ignored. */
    freeze(): void;
  }

  /** Create a reactive signal atom. */
  export function signal<T>(initial: T, options?: ReactiveOptions<T>): Signal<T>;

  /** Create a derived read-only computed signal. Auto-updates when dependencies change. */
  export function computed<T>(fn: () => T, options?: ReactiveOptions<T> & { lazy?: boolean }): ComputedSignal<T>;

  /** Derive from multiple source signals through a projector function. */
  export function derived<T>(
    sources: ReadonlySignal<any>[],
    fn: (...values: any[]) => T,
    options?: ReactiveOptions<T>
  ): ComputedSignal<T>;

  /** Create a read/write signal backed by custom getter/setter logic. */
  export function writable<T>(
    get: () => T,
    set: (value: T) => void,
    options?: ReactiveOptions<T>
  ): WritableSignal<T>;

  /** Create a reactive object-state store with patch/update/reset/select/freeze. */
  export function store<T extends object>(initial: T, options?: { equals?: EqualityFn<T> }): Store<T>;

  /** Run a side effect whenever its signal dependencies change. Returns a subscription handle. */
  export function effect(fn: () => CleanupFn | void, options?: { maxIterations?: number; onError?: (err: unknown) => void }): Subscription;

  /** Watch a signal for changes. Returns a subscription handle. */
  export function watch<T>(
    source: ReadonlySignal<T>,
    cb: (value: T, prev: T) => void,
    options?: WatchOptions<T>
  ): Subscription;

  /** Batch multiple signal writes into a single flush. */
  export function batch<T>(fn: () => T): T;

  /** Read a signal value without tracking it as a dependency. */
  export function untrack<T>(fn: () => T): T;

  /** Wrap a signal as read-only. */
  export function readonly<T>(sig: ReadonlySignal<T>): ReadonlySignal<T>;

  /** Type guard — identifies Signal instances. */
  export function isSignal<T = unknown>(value: unknown): value is ReadonlySignal<T>;

  /** Type guard — identifies Store instances. */
  export function isStore<T extends object = Record<string, unknown>>(value: unknown): value is Store<T>;

  /** Unwrap a signal value, or return the plain value as-is. */
  export function toValue<T>(v: T | ReadonlySignal<T>): T;

  /** Promise that resolves with the next signal value satisfying an optional predicate. */
  export function nextValue<T>(source: ReadonlySignal<T>, predicate?: (v: T) => boolean): Promise<T>;

  /** Register a cleanup function in the currently running effect. */
  export function onCleanup(fn: CleanupFn): void;

  /** Shallow equality helper (compares object properties by reference). */
  export function shallowEqual(a: unknown, b: unknown): boolean;

  /** Configure global stateit behaviour. */
  export function configureStateit(opts: { maxEffectIterations?: number }): void;
}
`;

export const validitTypes = `
declare module '@vielzeug/validit' {
  export class ValidationError extends Error {
    readonly issues: { message: string; path: (string | number)[] }[];
    flatten(): { fieldErrors: Record<string, string[]>; formErrors: string[] };
    static is(value: unknown): value is ValidationError;
  }

  export const ErrorCode: Record<string, string>;

  export const v: {
    any(): any;
    array<T>(schema: any): any;
    boolean(): any;
    coerce: {
      boolean(): any;
      date(): any;
      number(): any;
      string(): any;
    };
    date(): any;
    enum<T extends readonly [string, ...string[]] | readonly [number, ...number[]]>(values: T): any;
    instanceof<T>(cls: new (...args: any[]) => T): any;
    intersect<T extends readonly [any, any, ...any[]]>(...items: T): any;
    lazy<T>(getter: () => any): any;
    literal<T extends string | number | boolean | null | undefined>(value: T): any;
    nativeEnum<T extends Record<string, string | number>>(enumObj: T): any;
    never(): any;
    null(): any;
    nullable<T>(schema: any): any;
    nullish<T>(schema: any): any;
    number(): any;
    object<T extends Record<string, any>>(shape: T): any;
    optional<T>(schema: any): any;
    record<K extends string, V>(keySchema: any, valueSchema: any): any;
    string(): any;
    tuple<T extends readonly any[]>(items: T): any;
    undefined(): any;
    union<T extends readonly [any, any, ...any[]]>(...items: T): any;
    unknown(): any;
    variant<K extends string, M extends Record<string, any>>(discriminator: K, map: M): any;
  };
}
`;

export const wireitTypes = `
declare module '@vielzeug/wireit' {
  export type Token<T = unknown> = symbol & { __type?: T };
  export type Lifetime = 'singleton' | 'transient' | 'scoped';
  export type Snapshot = { readonly __snapshot: never };

  export type ValueProvider<T> = { useValue: T };

  export type ClassProvider<T, Deps extends unknown[] = any[]> = {
    useClass: new (...args: Deps) => T;
    deps?: { [K in keyof Deps]: Token<Deps[K]> };
    lifetime?: Lifetime;
    dispose?: (instance: T) => void | Promise<void>;
  };

  export type FactoryProvider<T, Deps extends unknown[] = any[]> = {
    useFactory: (...deps: Deps) => T | Promise<T>;
    deps?: { [K in keyof Deps]: Token<Deps[K]> };
    lifetime?: Lifetime;
    dispose?: (instance: T) => void | Promise<void>;
  };

  export type Provider<T> = ValueProvider<T> | ClassProvider<T> | FactoryProvider<T>;

  export type ProviderOptions<T, Deps extends unknown[] = any[]> = {
    deps?: { [K in keyof Deps]: Token<Deps[K]> };
    lifetime?: Lifetime;
    dispose?: (instance: T) => void | Promise<void>;
    overwrite?: boolean;
  };

  export type TokenValues<T extends readonly Token<any>[]> = {
    [K in keyof T]: T[K] extends Token<infer V> ? V : never;
  };

  export class Container {
    // Registration
    register<T>(token: Token<T>, provider: Provider<T>, opts?: { overwrite?: boolean }): this;
    value<T>(token: Token<T>, val: T, opts?: { overwrite?: boolean }): this;
    factory<T, Deps extends unknown[] = any[]>(
      token: Token<T>,
      fn: (...deps: Deps) => T | Promise<T>,
      opts?: ProviderOptions<T, Deps>
    ): this;
    bind<T, Deps extends unknown[] = any[]>(
      token: Token<T>,
      cls: new (...args: Deps) => T,
      opts?: ProviderOptions<T, Deps>
    ): this;
    alias<T>(token: Token<T>, source: Token<T>): this;
    unregister<T>(token: Token<T>): this;
    clear(): this;

    // Resolution
    get<T>(token: Token<T>): T;
    getAsync<T>(token: Token<T>): Promise<T>;
    getAll<T extends readonly Token<any>[]>(tokens: [...T]): TokenValues<T>;
    getAllAsync<T extends readonly Token<any>[]>(tokens: [...T]): Promise<TokenValues<T>>;
    getOptional<T>(token: Token<T>): T | undefined;
    getOptionalAsync<T>(token: Token<T>): Promise<T | undefined>;
    has(token: Token<any>): boolean;

    // Hierarchy
    createChild(): Container;
    runInScope<T>(fn: (scope: Container) => Promise<T> | T): Promise<Awaited<T>>;

    // Lifecycle
    dispose(): Promise<void>;
    readonly disposed: boolean;
    [Symbol.asyncDispose](): Promise<void>;

    // Testing & introspection
    mock<T, R>(token: Token<T>, mock: T | Provider<T>, fn: () => Promise<R> | R): Promise<R>;
    snapshot(): Snapshot;
    restore(snap: Snapshot): this;
    debug(): { aliases: Array<[string, string]>; tokens: string[] };
  }

  export function createToken<T>(description: string): Token<T>;
  export function createContainer(): Container;
  export function createTestContainer(base?: Container): {
    container: Container;
    dispose: () => Promise<void>;
  };

  export class CircularDependencyError extends Error {}
  export class ProviderNotFoundError extends Error {}
  export class AsyncProviderError extends Error {}
  export class AliasCycleError extends Error {}
  export class ContainerDisposedError extends Error {}
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

export const dragitTypes = `
declare module '@vielzeug/dragit' {
  export interface DropZoneOptions {
    element: HTMLElement;
    accept?: string[];
    disabled?: () => boolean;
    dropEffect?: 'copy' | 'move' | 'link' | 'none';
    onDragEnter?: (event: DragEvent) => void;
    onDragLeave?: (event: DragEvent) => void;
    onDragOver?: (event: DragEvent) => void;
    onDrop?: (files: File[], event: DragEvent) => void;
    onDropRejected?: (files: File[], event: DragEvent) => void;
    onHoverChange?: (hovered: boolean) => void;
  }

  export interface DropZone {
    readonly hovered: boolean;
    destroy(): void;
    [Symbol.dispose](): void;
  }

  export interface SortableOptions {
    container: HTMLElement;
    handle?: string;
    disabled?: () => boolean;
    onDragStart?: (id: string, event: DragEvent) => void;
    onDragEnd?: (event: DragEvent) => void;
    onReorder?: (orderedIds: string[]) => void;
  }

  export interface Sortable {
    refresh(): void;
    destroy(): void;
    [Symbol.dispose](): void;
  }

  /** Attach drag-and-drop file handling to a DOM element. */
  export function createDropZone(options: DropZoneOptions): DropZone;

  /** Make direct children of a container reorderable via drag. Each child must have a \`data-sort-id\` attribute. */
  export function createSortable(options: SortableOptions): Sortable;
}
`;

export const eventitTypes = `
declare module '@vielzeug/eventit' {
  export type EventMap = Record<string, unknown>;
  export type Unsubscribe = () => void;
  export type Listener<T> = (payload: T) => void;

  export type BusOptions<T extends EventMap> = {
    onEmit?: <K extends keyof T & string>(event: K, payload: T[K]) => void;
    onError?: <K extends keyof T & string>(err: unknown, event: K, payload: T[K]) => void;
  };

  export interface Bus<T extends EventMap> {
    readonly disposed: boolean;
    on<K extends keyof T & string>(event: K, listener: Listener<T[K]>, signal?: AbortSignal): Unsubscribe;
    once<K extends keyof T & string>(event: K, listener: Listener<T[K]>, signal?: AbortSignal): Unsubscribe;
    wait<K extends keyof T & string>(event: K, signal?: AbortSignal): Promise<T[K]>;
    events<K extends keyof T & string>(event: K, signal?: AbortSignal): AsyncGenerator<T[K]>;
    emit<K extends keyof T & string>(event: K, ...args: T[K] extends void ? [] : [payload: T[K]]): void;
    listenerCount(event?: keyof T & string): number;
    dispose(): void;
    [Symbol.dispose](): void;
  }

  export class BusDisposedError extends Error {
    readonly name: 'BusDisposedError';
  }

  /** Create a typed event bus. */
  export function createBus<T extends EventMap = Record<string, unknown>>(options?: BusOptions<T>): Bus<T>;
}
`;

export const floatitTypes = `
declare module '@vielzeug/floatit' {
  export type Side = 'top' | 'bottom' | 'left' | 'right';
  export type Alignment = 'start' | 'end';
  export type Placement = Side | \`\${Side}-\${Alignment}\`;
  export type Strategy = 'fixed' | 'absolute';

  export interface FloatOptions {
    placement?: Placement;
    strategy?: Strategy;
    middleware?: Array<Middleware | null | undefined | false>;
  }

  export interface ComputePositionResult {
    x: number;
    y: number;
    placement: Placement;
  }

  export interface Middleware {
    name: string;
    fn: (state: MiddlewareState) => MiddlewareState;
  }

  export interface MiddlewareState {
    x: number;
    y: number;
    placement: Placement;
    rects: { floating: DOMRect; reference: DOMRect };
    elements: { floating: HTMLElement; reference: Element };
  }

  export interface FlipOptions { padding?: number }
  export interface ShiftOptions { padding?: number }
  export interface SizeOptions {
    padding?: number;
    apply?: (args: { availableWidth: number; availableHeight: number; elements: { reference: Element; floating: HTMLElement } }) => void;
  }

  /** Compute position AND apply left/top inline styles. Returns the resolved placement. */
  export function positionFloat(reference: Element, floating: HTMLElement, options?: FloatOptions): Promise<Placement>;

  /** Compute position without touching the DOM. */
  export function computePosition(reference: Element, floating: HTMLElement, config?: FloatOptions): Promise<ComputePositionResult>;

  /** Subscribe to scroll/resize and call update() when position may have changed. Returns cleanup. */
  export function autoUpdate(reference: Element, floating: HTMLElement, update: () => void): () => void;

  /** Adds a pixel gap along the main axis between reference and floating. */
  export function offset(value: number): Middleware;

  /** Flips to the opposite side when it would overflow the viewport. */
  export function flip(options?: FlipOptions): Middleware;

  /** Slides along the cross axis to stay inside the viewport. */
  export function shift(options?: ShiftOptions): Middleware;

  /** Calls apply() with available dimensions for resizing the floating element. */
  export function size(options?: SizeOptions): Middleware;
}
`;

export const timitTypes = `
declare module '@vielzeug/timit' {
  export { Temporal };

  export type DateTimeDisambiguation = 'compatible' | 'earlier' | 'later' | 'reject';
  export type TimeInput = Date | Temporal.Instant | Temporal.PlainDateTime | Temporal.ZonedDateTime | number | string;

  export interface TimeOptions {
    tz?: string;
    when?: DateTimeDisambiguation;
  }

  export interface DifferenceOptions extends TimeOptions {
    largestUnit?: Temporal.DateTimeUnit;
    roundingIncrement?: number;
    roundingMode?: Temporal.RoundingMode;
    smallestUnit?: Temporal.DateTimeUnit;
  }

  export type FormatPattern = 'iso' | 'short' | 'long' | 'date-only' | 'time-only';

  export interface FormatOptions {
    pattern?: FormatPattern;
    locale?: Intl.LocalesArgument;
    tz?: string;
    intl?: Intl.DateTimeFormatOptions;
  }

  export function now(tz?: string): Temporal.ZonedDateTime;
  export function asInstant(input: TimeInput, options?: TimeOptions): Temporal.Instant;
  export function asZoned(input: TimeInput, options?: TimeOptions): Temporal.ZonedDateTime;
  export function add(input: TimeInput, duration: Temporal.DurationLike, options?: TimeOptions): Temporal.ZonedDateTime;
  export function subtract(
    input: TimeInput,
    duration: Temporal.DurationLike,
    options?: TimeOptions,
  ): Temporal.ZonedDateTime;
  export function diff(start: TimeInput, end: TimeInput, options?: DifferenceOptions): Temporal.Duration;
  export function within(input: TimeInput, start: TimeInput, end: TimeInput, options?: TimeOptions): boolean;
  export function format(input: TimeInput, options?: FormatOptions): string;
  export function formatRange(start: TimeInput, end: TimeInput, options?: FormatOptions): string;

  export const d: {
    add: typeof add;
    asInstant: typeof asInstant;
    asZoned: typeof asZoned;
    diff: typeof diff;
    format: typeof format;
    formatRange: typeof formatRange;
    now: typeof now;
    subtract: typeof subtract;
    within: typeof within;
  };
}
`;

export const virtualitTypes = `
declare module '@vielzeug/virtualit' {
  export interface VirtualItem {
    index: number;
    top: number;
    height: number;
  }

  export interface ScrollToIndexOptions {
    align?: 'start' | 'end' | 'center' | 'auto';
    behavior?: ScrollBehavior;
  }

  export interface VirtualizerOptions {
    count: number;
    estimateSize?: number | ((index: number) => number);
    overscan?: number;
    onChange?: (items: VirtualItem[], totalSize: number) => void;
  }

  export class Virtualizer {
    constructor(options: VirtualizerOptions);
    get count(): number;
    set count(n: number);
    set estimateSize(value: number | ((index: number) => number));
    attach(el: HTMLElement): void;
    destroy(): void;
    [Symbol.dispose](): void;
    getVirtualItems(): VirtualItem[];
    getTotalSize(): number;
    measureElement(index: number, height: number): void;
    scrollToIndex(index: number, options?: ScrollToIndexOptions): void;
    scrollToOffset(offset: number, options?: { behavior?: ScrollBehavior }): void;
    invalidate(): void;
  }

  /** Create a Virtualizer and immediately attach it to the scroll container. */
  export function createVirtualizer(el: HTMLElement, options: VirtualizerOptions): Virtualizer;
}
`;

export const workitTypes = `
declare module '@vielzeug/workit' {
  export type WorkerStatus = 'idle' | 'running' | 'terminated';

  export type WorkerOptions = {
    size?: number | 'auto';
    timeout?: number;
    fallback?: boolean;
    scripts?: string[];
  };

  export type RunOptions = {
    signal?: AbortSignal;
    transfer?: Transferable[];
  };

  export interface WorkerHandle<TInput, TOutput> {
    run(input: TInput, options?: RunOptions): Promise<TOutput>;
    dispose(): void;
    readonly size: number;
    readonly status: WorkerStatus;
    readonly isNative: boolean;
    [Symbol.dispose](): void;
  }

  export class WorkerError extends Error {}
  export class TaskTimeoutError extends WorkerError {
    constructor(ms: number);
  }
  export class TerminatedError extends WorkerError {}
  export class TaskError extends WorkerError {
    readonly cause?: unknown;
  }

  /**
   * Create a Web Worker pool. The task function is serialized via .toString()
   * and cannot close over outer-scope variables.
   */
  export function createWorker<TInput = unknown, TOutput = unknown>(
    fn: (input: TInput) => TOutput | Promise<TOutput>,
    options?: WorkerOptions
  ): WorkerHandle<TInput, TOutput>;
}
`;

export const libraryTypes = {
  craftit: craftitTypes,
  deposit: depositTypes,
  dragit: dragitTypes,
  eventit: eventitTypes,
  fetchit: fetchitTypes,
  floatit: floatitTypes,
  formit: formitTypes,
  i18nit: i18nitTypes,
  logit: logitTypes,
  permit: permitTypes,
  routeit: routeitTypes,
  stateit: stateitTypes,
  timit: timitTypes,
  toolkit: toolkitTypes,
  validit: validitTypes,
  virtualit: virtualitTypes,
  wireit: wireitTypes,
  workit: workitTypes,
};
