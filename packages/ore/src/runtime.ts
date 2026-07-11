/**
 * Component runtime — implicit "current component" context plus every lifecycle
 * hook a `setup()` function can call.
 *
 * Design note: hooks are plain module-level functions (not a bag/context object
 * passed into `setup`). They resolve the active component through a single
 * module-level pointer (`currentContext`), set for the duration of `setup()` and
 * of each queued `onMounted` callback. This is the same mechanism React/Vue/Solid
 * use for their composable hooks — it lets any helper function (not just the
 * top-level `setup()` body) call `onMounted`/`onCleanup`/`bind`/... directly,
 * with no context object to thread through every layer of a composable.
 */
import {
  type CleanupFn,
  effect as _effect,
  type EffectCallback,
  onCleanup as _onCleanup,
  type Readable,
} from '@vielzeug/ripple';

import { OreApiError, ORE_ERRORS } from './errors';
import { listen as listenInternal } from './utils/dom';

// ─── Runtime context ──────────────────────────────────────────────────────────
// A single context object carries both the host element and mount callbacks,
// eliminating two parallel globals that were always set together.

export type OnMountedCallback = () => CleanupFn | void;
export type OnFormResetCallback = () => void;

export type RuntimeContext = {
  element: HTMLElement;
  formResetCallbacks: OnFormResetCallback[];
  mountCallbacks: OnMountedCallback[];
};

let currentContext: RuntimeContext | null = null;

/** @internal Execute fn with a given runtime context active. */
export const runWithContext = <T>(ctx: RuntimeContext, fn: () => T): T => {
  const prev = currentContext;

  currentContext = ctx;

  try {
    return fn();
  } finally {
    currentContext = prev;
  }
};

/**
 * Returns the current runtime context, throwing a consistently-worded error
 * (naming the calling API) if called outside `setup()`. Every lifecycle/context
 * hook below routes through this — it's the single place that decides both
 * "are we inside setup?" and what the resulting error looks like, so the error
 * message is never worse for one hook than another.
 * @internal
 */
export const requireSetupContext = (api: string): RuntimeContext => {
  if (currentContext) return currentContext;

  throw new OreApiError(`${api}: ${ORE_ERRORS.lifecycleOutsideSetup}`);
};

/**
 * Returns the current component's host element.
 * Only valid synchronously during component `setup()` (or inside a composable
 * called from it) — throws otherwise.
 */
export const getHost = (): HTMLElement => requireSetupContext('getHost').element;

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
  requireSetupContext('onMounted').mountCallbacks.push(fn);
};

/**
 * Register work to run when the ancestor `<form>` is reset (native `formResetCallback`,
 * only fires for `formAssociated: true` components). Multiple callbacks run in
 * registration order, every time the form resets — unlike `onMounted`, this isn't a
 * one-shot hook.
 */
export const onFormReset = (fn: OnFormResetCallback): void => {
  requireSetupContext('onFormReset').formResetCallbacks.push(fn);
};

/**
 * Create a reactive effect scoped to the component lifecycle.
 * Automatically cleaned up on component disconnect.
 * Returns a stop function that disposes the effect immediately.
 *
 * Named `watchEffect` (not `watch`) to avoid shadowing `@vielzeug/ripple`'s
 * `watch(source, callback)`, which has different semantics (explicit source,
 * old/new value pair) — the two are commonly imported in the same file.
 */
export const watchEffect = (fn: EffectCallback): (() => void) => {
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
  requireSetupContext('onEvent');

  if (!target) return;

  const cleanup = listenInternal(target, event, listener, options);

  if (!tryRegisterCleanup(cleanup)) cleanup();
}

/**
 * Watch a ref signal and run a callback when it resolves to a non-null element.
 * The callback's return value is used as a cleanup function.
 */
export const onElement = <T extends HTMLElement>(
  ref: Readable<T | null>,
  callback: (el: T) => CleanupFn | undefined | void,
): (() => void) => {
  return watchEffect(() => {
    const el = ref.value;

    if (el) return callback(el);
  });
};
