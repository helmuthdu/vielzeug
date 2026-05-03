import {
  effect as _effect,
  type CleanupFn,
  type EffectCallback,
  type EffectOptions,
  type ReadonlySignal,
  type Subscription,
} from '@vielzeug/stateit';

import { CRAFTIT_ERRORS } from './errors';
import { fire } from './internal';

export { fire };

let currentElement: HTMLElement | null = null;
let currentScope: RuntimeScope | null = null;

export type OnMountedCallback = () => CleanupFn | void;

export type RuntimeScope = {
  cleanups: CleanupFn[];
  mountCallbacks: OnMountedCallback[];
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

  throw new Error(CRAFTIT_ERRORS.lifecycleOutsideSetup);
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
  if (!currentScope) throw new Error(CRAFTIT_ERRORS.lifecycleOutsideSetup);

  currentScope.cleanups.push(fn);
};

export const tryRegisterCleanup = (fn: CleanupFn): boolean => {
  if (!currentScope) return false;

  currentScope.cleanups.push(fn);

  return true;
};

/**
 * Register a cleanup function to be called on component disconnect.
 * Must be called synchronously during component setup.
 */
export const onCleanup = registerCleanup;

/**
 * Register work to run after the component template mounts.
 * Multiple callbacks are supported and run in registration order.
 */
export const onMounted = (fn: OnMountedCallback): void => {
  if (!currentScope) throw new Error(CRAFTIT_ERRORS.lifecycleOutsideSetup);

  currentScope.mountCallbacks.push(fn);
};

export const effect = (fn: EffectCallback, options?: EffectOptions): Subscription => {
  const dispose = _effect(fn, options);

  tryRegisterCleanup(dispose);

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
): void {
  if (!target) return;

  target.addEventListener(event, listener, options);
  tryRegisterCleanup(() => target.removeEventListener(event, listener, options));
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
