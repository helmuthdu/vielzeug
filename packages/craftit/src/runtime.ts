import {
  effect as _effect,
  onCleanup as _onCleanup,
  type CleanupFn,
  type EffectCallback,
  type ReadonlySignal,
  type Subscription,
} from '@vielzeug/stateit';

import { CRAFTIT_ERRORS } from './errors';
import { fire, listen as listenInternal } from './internal';

export { fire };

let currentElement: HTMLElement | null = null;
let currentScope: RuntimeScope | null = null;

export type OnMountedCallback = () => CleanupFn | void;

export type RuntimeScope = {
  element: HTMLElement;
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
export const withRuntimeScope = <T>(runtimeScope: RuntimeScope, fn: () => T): T => {
  const prev = currentScope;

  currentScope = runtimeScope;

  try {
    return fn();
  } finally {
    currentScope = prev;
  }
};

export const tryRegisterCleanup = (fn: CleanupFn): boolean => {
  if (!currentScope) return false;

  _onCleanup(fn);

  return true;
};

/**
 * Register a cleanup function to be called on component disconnect.
 * Must be called synchronously during component setup or inside scope.run().
 */
export const onCleanup = _onCleanup;

/**
 * Register work to run after the component template mounts.
 * Multiple callbacks are supported and run in registration order.
 */
export const onMounted = (fn: OnMountedCallback): void => {
  if (!currentScope) throw new Error(CRAFTIT_ERRORS.lifecycleOutsideSetup);

  currentScope.mountCallbacks.push(fn);
};

export const effect = (fn: EffectCallback): Subscription => {
  const dispose = _effect(() => {
    return fn();
  });

  tryRegisterCleanup(dispose);

  return dispose;
};

export function on<K extends keyof HTMLElementEventMap>(
  target: EventTarget | null | undefined,
  event: K,
  listener: (e: HTMLElementEventMap[K]) => void,
  options?: AddEventListenerOptions,
): void;
export function on(
  target: EventTarget | null | undefined,
  event: string,
  listener: EventListener,
  options?: AddEventListenerOptions,
): void {
  if (!currentScope) throw new Error(CRAFTIT_ERRORS.lifecycleOutsideSetup);

  if (!target) return;

  const cleanup = listenInternal(target, event, listener, options);

  tryRegisterCleanup(cleanup);
}

/**
 * Attaches an event listener and returns a disposal function.
 * Unlike `on()`, this does not require a runtime scope and cleanup must be
 * managed manually by calling the returned function.
 */
export function listen<K extends keyof HTMLElementEventMap>(
  target: EventTarget | null | undefined,
  event: K,
  listener: (e: HTMLElementEventMap[K]) => void,
  options?: AddEventListenerOptions,
): () => void;
export function listen(
  target: EventTarget | null | undefined,
  event: string,
  listener: EventListener,
  options?: AddEventListenerOptions,
): () => void {
  return listenInternal(target, event, listener, options);
}

export const onElement = <T extends HTMLElement>(
  ref: ReadonlySignal<T | null>,
  callback: (el: T) => CleanupFn | undefined | void,
): Subscription => {
  return effect(() => {
    const el = ref.value;

    if (el) return callback(el);
  });
};
