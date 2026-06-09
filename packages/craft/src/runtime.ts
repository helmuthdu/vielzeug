import {
  type CleanupFn,
  effect as _effect,
  type EffectCallback,
  onCleanup as _onCleanup,
  type ReadonlySignal,
} from '@vielzeug/ripple';

import { CRAFTIT_ERRORS } from './errors';
import { listen as listenInternal } from './utils/dom';

// ─── Runtime context ──────────────────────────────────────────────────────────
// A single context object carries both the host element and mount callbacks,
// eliminating two parallel globals that were always set together.

export type OnMountedCallback = () => CleanupFn | void;

export type RuntimeContext = {
  /** @internal Lazily-populated ancestor chain used by inject() for cached lookups. */
  _ancestorChain?: HTMLElement[];
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

/** @internal Access to the current runtime context for context.ts caching (R9). */
export const _getCurrentRuntimeContext = (): RuntimeContext | null => currentContext;

/**
 * Returns the current component's host element.
 * Only valid synchronously during component `setup()`.
 * @internal — consumers should use `ctx.el` from the setup context bag.
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
 * Register a cleanup function to run on component disconnect.
 * Must be called synchronously during component setup or inside scope.run().
 */
export const onCleanup = _onCleanup;

/**
 * Register work to run after the component template mounts to the DOM.
 * Multiple callbacks run in registration order.
 */
export const onMounted = (fn: OnMountedCallback): void => {
  if (!currentContext) throw new Error(CRAFTIT_ERRORS.lifecycleOutsideSetup);

  currentContext.mountCallbacks.push(fn);
};

/**
 * Create a reactive effect scoped to the component lifecycle.
 * Automatically cleaned up on component disconnect.
 * Returns a stop function that disposes the effect immediately.
 */
export const effect = (fn: EffectCallback): (() => void) => {
  const sub = _effect(fn);
  const stop = (): void => sub.dispose();

  tryRegisterCleanup(stop);

  return stop;
};

/**
 * Attach a scoped event listener that is automatically removed on component disconnect.
 * Silently no-ops when `target` is `null` or `undefined` (safe for reactive targets).
 */
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

  if (!tryRegisterCleanup(cleanup)) cleanup();
}

/**
 * Watch a ref signal and run a callback when it resolves to a non-null element.
 * The callback's return value is used as a cleanup function.
 */
export const onElement = <T extends HTMLElement>(
  ref: ReadonlySignal<T | null>,
  callback: (el: T) => CleanupFn | undefined | void,
): (() => void) => {
  return effect(() => {
    const el = ref.value;

    if (el) return callback(el);
  });
};
