import {
  effect as _effect,
  onCleanup as _onCleanup,
  signal,
  watch as _watch,
  type CleanupFn,
  type EffectCallback,
  type EffectOptions,
  type ReadonlySignal,
  type Subscription,
  type WatchOptions,
} from '@vielzeug/stateit';

import { currentRuntime, runtimeStack } from './runtime-core';

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

export const createCleanupSignal = () => {
  const cleanup = signal<CleanupFn | null>(null);

  const clear = () => {
    cleanup.value?.();
    cleanup.value = null;
  };

  const set = (next: CleanupFn | null | undefined) => {
    if (cleanup.value === next) return;

    clear();
    cleanup.value = next ?? null;
  };

  onCleanup(clear);

  return { clear, set, value: cleanup as ReadonlySignal<CleanupFn | null> };
};

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
