import {
  effect as _effect,
  onCleanup as _onCleanup,
  type CleanupFn,
  type EffectCallback,
  type ReadonlySignal,
  type Subscription,
} from '@vielzeug/stateit';

import { CRAFTIT_ERRORS } from './errors';
import { listen as listenInternal } from './utils/dom';

// ─── Runtime context ─────────────────────────────────────────────────────────
// A single context object replaces the previous two parallel globals
// (currentElement + currentScope). They were always set together; merging them
// removes the double-wrap pattern and the hidden invariant between them.

export type OnMountedCallback = () => CleanupFn | void;

export type RuntimeContext = {
  element: HTMLElement;
  mountCallbacks: OnMountedCallback[];
};

let currentContext: RuntimeContext | null = null;

/** @internal */
export const withRuntimeContext = <T>(ctx: RuntimeContext, fn: () => T): T => {
  const prev = currentContext;

  currentContext = ctx;

  try {
    return fn();
  } finally {
    currentContext = prev;
  }
};

/**
 * Returns the current component's host element.
 * Must be called synchronously during component `setup()`.
 *
 * Useful for composables and controls that need direct access to the host element.
 */
export const getCurrentElement = (): HTMLElement => {
  if (currentContext) return currentContext.element;

  throw new Error(CRAFTIT_ERRORS.lifecycleOutsideSetup);
};

export const tryRegisterCleanup = (fn: CleanupFn): boolean => {
  if (!currentContext) return false;

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
  if (!currentContext) throw new Error(CRAFTIT_ERRORS.lifecycleOutsideSetup);

  currentContext.mountCallbacks.push(fn);
};

export const effect = (fn: EffectCallback): Subscription => {
  const dispose = _effect(() => {
    return fn();
  });

  tryRegisterCleanup(dispose);

  return dispose;
};

export function onEvent<K extends keyof HTMLElementEventMap>(
  target: EventTarget | null | undefined,
  event: K,
  listener: (e: HTMLElementEventMap[K]) => void,
  options?: AddEventListenerOptions,
): void;
export function onEvent(
  target: EventTarget | null | undefined,
  event: string,
  listener: EventListener,
  options?: AddEventListenerOptions,
): void {
  if (!currentContext) throw new Error(CRAFTIT_ERRORS.lifecycleOutsideSetup);

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
