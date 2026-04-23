import {
  effect as _effect,
  isSignal,
  isWritable,
  type CleanupFn,
  type Signal,
  type EffectCallback,
  type EffectOptions,
  type ReadonlySignal,
  type Subscription,
} from '@vielzeug/stateit';

import { fire, type FireApi } from './internal';

export { fire, type FireApi };

let currentElement: HTMLElement | null = null;
let currentScope: RuntimeScope | null = null;

export type RuntimeScope = {
  cleanups: CleanupFn[];
};

export const withCurrentElement = <T>(el: HTMLElement, fn: () => T): T => {
  const previous = currentElement;

  currentElement = el;

  try {
    return fn();
  } finally {
    currentElement = previous;
  }
};

export const currentElementOrThrow = (): HTMLElement => {
  if (currentElement) return currentElement;

  throw new Error('[craftit:E1] lifecycle outside setup');
};

/** @internal */
export const withRuntimeScope = <T>(scope: RuntimeScope, fn: () => T): T => {
  const prev = currentScope;

  currentScope = scope;

  try {
    return fn();
  } finally {
    currentScope = prev;
  }
};

const registerCleanup = (fn: CleanupFn): void => {
  if (!currentScope) throw new Error('[craftit:E1] lifecycle outside setup');

  currentScope.cleanups.push(fn);
};

/**
 * Register a cleanup function to be called on component disconnect.
 * Must be called synchronously during component setup.
 */
export const onCleanup = registerCleanup;

export const effect = (fn: EffectCallback, options?: EffectOptions): Subscription => {
  const dispose = _effect(fn, options);

  registerCleanup(dispose);

  return dispose;
};

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
  registerCleanup(() => target.removeEventListener(event, listener, options));
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

export const toReactiveBindingSource = (value: unknown): ReadonlySignal<unknown> | undefined => {
  if (isSignal(value)) return value as ReadonlySignal<unknown>;

  return undefined;
};

export const hasWritableValueSetter = (value: unknown): value is Signal<unknown> => isWritable(value);
