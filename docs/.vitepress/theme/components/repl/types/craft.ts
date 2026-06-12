export const craftTypes = `
declare module '/craft' {
  export type CleanupFn = () => void;

  export type Signal<T> = {
    value: T;
    peek(): T;
    update(fn: (current: T) => T): void;
    subscribe(cb: (value: T, prev: T) => void): CleanupFn;
  };

  export type ReadonlySignal<T> = {
    readonly value: T;
    peek(): T;
    subscribe(cb: (value: T, prev: T) => void): CleanupFn;
  };

  export type WatchOptions = { immediate?: boolean };

  export type HTMLResult = unknown;
  export type CSSResult = unknown;
  export type InjectionKey<T> = symbol & { __type?: T };
  export type Ref<T extends Element = Element> = Signal<T | null>;
  export type Refs<T extends Element = Element> = Signal<T[]>;
  export type RefCallback<T extends Element = Element> = (el: T | null) => void;

  export type PropDef<T> = {
    default: T;
    parse?: (value: string | null) => T;
    reflect?: boolean;
  };

  export type HostBindConfig = {
    attr?: Record<string, string | (() => string) | ReadonlySignal<string>>;
    class?: Record<string, boolean | (() => boolean) | ReadonlySignal<boolean> | Signal<boolean>>;
    style?: Record<string, string | (() => string) | ReadonlySignal<string>>;
    prop?: Record<string, { get: () => unknown; set: (v: unknown) => void }>;
    on?: Record<string, (e: Event) => void>;
  };

  export type HostBindFn = (config: HostBindConfig) => void;

  export type ComponentSlots<S extends string = string> = {
    has(name?: S): ReadonlySignal<boolean>;
    elements(name?: S): ReadonlySignal<Element[]>;
  };

  export type SetupContextBag<Emits = Record<string, unknown>, SlotNames extends string = string> = {
    bind: HostBindFn;
    el: HTMLElement;
    emit: <K extends keyof Emits>(event: K, ...args: Emits[K] extends void ? [] : [Emits[K]]) => void;
    slots: ComponentSlots<SlotNames>;
  };

  export type ComponentDefinition<Props = {}, Emits = {}, SlotNames extends string = string> = {
    formAssociated?: boolean;
    props?: Record<string, PropDef<unknown>>;
    setup: (props: { [K in keyof Props]: Signal<Props[K]> }, ctx: SetupContextBag<Emits, SlotNames>) => HTMLResult;
    shadow?: Partial<ShadowRootInit>;
    slots?: readonly SlotNames[];
    styles?: (string | CSSStyleSheet | CSSResult)[];
  };

  export const prop: {
    bool(defaultValue?: boolean): PropDef<boolean>;
    json<T>(defaultValue: T): PropDef<T>;
    number(defaultValue?: number): PropDef<number>;
    oneOf<T extends string>(allowed: readonly T[], defaultValue: T): PropDef<T>;
    string(defaultValue?: string): PropDef<string>;
  };

  export function define<Props = {}, Emits = {}, SlotNames extends string = string>(
    tag: string,
    definition: ComponentDefinition<Props, Emits, SlotNames>,
  ): string;

  export function signal<T>(initial: T): Signal<T>;
  export function computed<T>(fn: () => T): ReadonlySignal<T>;
  export function effect(fn: () => CleanupFn | void): CleanupFn;
  export function watch<T>(
    source: Signal<T> | ReadonlySignal<T> | (() => T),
    cb: (value: T, prev: T) => void,
    options?: WatchOptions,
  ): CleanupFn;
  export function batch(fn: () => void): void;
  export function untrack<T>(fn: () => T): T;
  export function isSignal<T>(value: unknown): value is Signal<T> | ReadonlySignal<T>;

  export function onMounted(fn: () => void | CleanupFn): void;
  export function onCleanup(fn: CleanupFn): void;
  export function onElement<T extends Element>(ref: Ref<T>, callback: (el: T) => void | CleanupFn): void;
  export function onEvent<K extends keyof HTMLElementEventMap>(
    target: EventTarget,
    event: K,
    listener: (e: HTMLElementEventMap[K]) => void,
    options?: AddEventListenerOptions,
  ): void;
  export function listen(
    target: EventTarget,
    event: string,
    listener: EventListener,
    options?: AddEventListenerOptions,
  ): CleanupFn;
  export function getCurrentElement(): HTMLElement;

  export function memo<T>(deps: () => readonly unknown[], fn: () => T): ReadonlySignal<T>;
  export function syncedSignal<TIn, TOut = TIn>(
    source: ReadonlySignal<TIn>,
    transform?: (v: TIn) => TOut,
  ): [Signal<TOut>, CleanupFn];

  export function suspend<T>(
    asyncFn: () => Promise<T>,
    options: {
      fallback?: () => HTMLResult;
      error?: (e: unknown) => HTMLResult;
      render: (data: T) => HTMLResult;
    },
  ): ReadonlySignal<HTMLResult>;

  export function defineField<T>(options: {
    disabled?: ReadonlySignal<boolean> | Signal<boolean>;
    toFormValue?: (v: T) => string | FormData | File | null;
    value: Signal<T> | ReadonlySignal<T>;
  }): {
    checkValidity(): boolean;
    reportValidity(): boolean;
    setCustomValidity(message: string): void;
    setValidity(flags?: ValidityStateFlags, message?: string, anchor?: HTMLElement | null): void;
  };

  export function createContext<T>(description?: string): InjectionKey<T>;
  export function provide<T>(key: InjectionKey<T>, value: T): void;
  export function inject<T>(key: InjectionKey<T>): T | undefined;
  export function inject<T>(key: InjectionKey<T>, fallback: T): T;
  export function injectStrict<T>(key: InjectionKey<T>): T;

  export function syncAria(
    target: HTMLElement,
    config: Record<string, string | (() => string)>,
  ): void;

  export function createBind(el: HTMLElement): HostBindFn;
  export function createSlots<S extends string = string>(el: HTMLElement, names?: readonly S[]): ComponentSlots<S>;
  export function createId(prefix?: string): string;

  export const html: (strings: TemplateStringsArray, ...values: unknown[]) => HTMLResult;
  export const css: (strings: TemplateStringsArray, ...values: unknown[]) => CSSResult;

  export function each<T>(
    source: ReadonlySignal<T[]> | Signal<T[]> | (() => T[]) | T[],
    key: (item: T, index: number) => string | number,
    render: (item: Signal<T>, index: Signal<number>) => HTMLResult,
    fallback?: () => HTMLResult,
  ): HTMLResult;

  export function when(
    condition: (() => boolean) | ReadonlySignal<boolean>,
    truthy: () => HTMLResult,
    falsy?: () => HTMLResult,
  ): HTMLResult;

  export function classMap(
    map: Record<string, (() => boolean) | ReadonlySignal<boolean> | boolean>,
  ): ReadonlySignal<string>;

  export function styleMap(
    map: Record<string, (() => string) | ReadonlySignal<string> | string>,
  ): ReadonlySignal<string>;

  export function live<T>(signal: Signal<T>): { __live: true; signal: Signal<T> };

  export function raw(value: string | Signal<string> | ReadonlySignal<string>): HTMLResult;
  export function setRawSanitizer(fn: (html: string) => string): void;

  export function ref<E extends Element = Element>(): Ref<E>;
  export function refs<E extends Element = Element>(): Refs<E>;
}
`;
