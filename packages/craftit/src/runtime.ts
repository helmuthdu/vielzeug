import {
  computed,
  effect as _effect,
  isSignal,
  isWritable,
  onCleanup as _onCleanup,
  watch as _watch,
  type CleanupFn,
  type EffectCallback,
  type EffectOptions,
  type ReadonlySignal,
  type Signal,
  type Subscription,
  type WatchOptions,
} from '@vielzeug/stateit';

import type { ComponentHost, ComponentSlots } from './host';

import { fire, listen, type CSSResult, type FireApi } from './internal';

export { fire, type FireApi };

export type ComponentRuntime = {
  cleanups: CleanupFn[];
  el: HTMLElement;
  errorHandlers: ((err: unknown) => void)[];
  host?: ComponentHost;
  onMount: (() => CleanupFn | undefined | void)[];
  props?: Record<string, Signal<unknown>>;
  slots?: ComponentSlots;
  styles?: (string | CSSStyleSheet | CSSResult)[];
};

export const runtimeStack: ComponentRuntime[] = [];

export const currentRuntime = (): ComponentRuntime => {
  const rt = runtimeStack[runtimeStack.length - 1];

  if (!rt) throw new Error('[craftit:E1] lifecycle outside setup');

  return rt;
};

type NoDetail = void | undefined | never;
type HostCustomEventMap<CustomEvents extends Record<string, unknown>> = {
  [K in keyof CustomEvents & string]: [CustomEvents[K]] extends [Event]
    ? CustomEvents[K]
    : [CustomEvents[K]] extends [NoDetail]
      ? CustomEvent<undefined>
      : CustomEvent<CustomEvents[K]>;
};

export type HostEventMap<CustomEvents extends Record<string, unknown> = Record<string, never>> = HTMLElementEventMap &
  HostCustomEventMap<CustomEvents>;

export type HostEventListeners<CustomEvents extends Record<string, unknown> = Record<string, never>> = {
  [K in keyof HostEventMap<CustomEvents>]?: (e: HostEventMap<CustomEvents>[K]) => void;
};

export const onMount = (fn: () => CleanupFn | undefined | void): void => {
  currentRuntime().onMount.push(fn);
};

export const onCleanup = (fn: CleanupFn): void => {
  if (runtimeStack.length > 0) {
    currentRuntime().cleanups.push(fn);
  } else {
    _onCleanup(fn);
  }
};

const autoCleanup = (dispose: Subscription | CleanupFn): void => {
  if (runtimeStack.length > 0) onCleanup(dispose);
};

export const onError = (fn: (err: unknown) => void): void => {
  currentRuntime().errorHandlers.push(fn);
};

export const effect = (fn: EffectCallback, options?: EffectOptions): Subscription => {
  const dispose = _effect(fn, options);

  autoCleanup(dispose);

  return dispose;
};

export function watch<T>(
  source: ReadonlySignal<T>,
  cb: (value: T, prev: T) => void,
  options?: WatchOptions<T>,
): Subscription;
export function watch(
  source: ReadonlySignal<unknown>,
  cb: (value: unknown, prev: unknown) => void,
  options?: WatchOptions<unknown>,
): Subscription {
  const stop = _watch(source, cb, options);

  autoCleanup(stop);

  return stop;
}

export function handle<K extends keyof HTMLElementEventMap>(
  target: EventTarget | null | undefined,
  event: K,
  listener: (e: HTMLElementEventMap[K]) => void,
  options?: AddEventListenerOptions,
): void;
export function handle(
  target: EventTarget | null | undefined,
  event: string,
  listener: EventListener,
  options?: AddEventListenerOptions,
): void;
export function handle(
  target: EventTarget | null | undefined,
  event: string,
  listener: EventListener,
  options?: AddEventListenerOptions,
): void {
  if (!target) return;

  target.addEventListener(event, listener, options);
  onCleanup(() => target.removeEventListener(event, listener, options));
}

export const onElement = <T extends HTMLElement>(
  ref: ReadonlySignal<T | null>,
  callback: (el: T) => CleanupFn | undefined | void,
  options?: EffectOptions,
): Subscription => {
  return effect(() => {
    const el = ref.value;

    if (el) return callback(el);
  }, options);
};

export type RegisterPropertyCleanup = (fn: () => void) => void;

export const toReactiveBindingSource = (value: unknown): ReadonlySignal<unknown> | undefined => {
  if (isSignal(value)) return value as ReadonlySignal<unknown>;

  if (typeof value === 'function') {
    // Treat plain functions as computed getters
    return computed(value as () => unknown);
  }

  return undefined;
};

export const hasWritableValueSetter = (value: unknown): value is Signal<unknown> => isWritable(value);

const updateModelValue = (model: Signal<unknown>, next: unknown): void => {
  if (!Object.is(model.value, next)) model.value = next;
};

export const bindPropertyModel = (
  el: HTMLElement,
  name: string,
  model: Signal<unknown> | undefined,
  registerCleanup: RegisterPropertyCleanup,
): void => {
  if (!model) return;

  if (name === 'value') {
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
      const eventName = el instanceof HTMLSelectElement ? 'change' : 'input';

      registerCleanup(
        listen(el, eventName, () => {
          updateModelValue(model, el.value);
        }),
      );
    }

    return;
  }

  if (name === 'checked' && el instanceof HTMLInputElement) {
    registerCleanup(
      listen(el, 'change', () => {
        updateModelValue(model, el.checked);
      }),
    );
  }
};
