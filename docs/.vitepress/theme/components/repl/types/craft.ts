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

  export function define(name: string, setup: (ctx: SetupContext) => SetupResult, options?: DefineOptions): void;
  export function signal<T>(initial: T, options?: { name?: string }): Signal<T>;
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

  export function defineField<T>(
    state: { value: Signal<T> },
    options?: {
      onAssociated?: (form: HTMLFormElement | null) => void;
      onDisabled?: (disabled: boolean) => void;
      onReset?: () => void;
      onRestore?: (state: string | File | FormData | null, mode: 'restore' | 'autocomplete') => void;
    },
  ):
    | {
        checkValidity(): boolean;
        reportValidity(): boolean;
        setCustomValidity(message: string): void;
        setValidity(flags?: ValidityStateFlags, message?: string, anchor?: HTMLElement | null): void;
      }
    | undefined;

  export const html: (strings: TemplateStringsArray, ...values: unknown[]) => HTMLResult;
  export function each<T>(
    source: ReadonlySignal<T[]> | Signal<T[]>,
    options: {
      key: (item: T, index: number) => string | number;
      render: (item: T, index: number) => string | HTMLResult;
      fallback?: () => string | HTMLResult;
    },
  ): HTMLResult;

  export function classMap(
    map: Record<string, (() => boolean) | ReadonlySignal<boolean> | boolean>,
  ): ReadonlySignal<string>;

  export function raw(value: string | Signal<string> | ReadonlySignal<string>): HTMLResult | ReadonlySignal<HTMLResult>;

  export const css: (strings: TemplateStringsArray, ...values: unknown[]) => CSSResult;
  export function ref<E extends HTMLElement = HTMLElement>(selector: string): Signal<E | null>;
  export function refs<E extends HTMLElement = HTMLElement>(selector: string): Signal<E[]>;
}
`;
