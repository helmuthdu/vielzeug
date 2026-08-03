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
import { type Cleanup, effect as _effect, type Readable } from '@vielzeug/ripple';

import { OreApiError, ORE_ERRORS } from './errors';
import { listen as listenInternal } from './utils/dom';

// ─── Runtime context ──────────────────────────────────────────────────────────
// A single context object carries both the host element and mount callbacks,
// eliminating two parallel globals that were always set together.

export type OnMountedCallback = () => Cleanup | void;
export type OnFormResetCallback = () => void;

export type RuntimeContext = {
  element: HTMLElement;
  formResetCallbacks: OnFormResetCallback[];
  mountCallbacks: OnMountedCallback[];
};

let currentContext: RuntimeContext | null = null;

/**
 * @internal Create a fresh runtime context for a component element. The single
 * construction site for `RuntimeContext` — used by `BaseElement` (setup and
 * per-callback mount contexts) and by `testing/render-hook.ts`, so the test
 * harness can never silently desync from a new required field.
 */
export const createRuntimeContext = (element: HTMLElement): RuntimeContext => ({
  element,
  formResetCallbacks: [],
  mountCallbacks: [],
});

// ─── Pending work tracking ──────────────────────────────────────────────────
// A single counter of "in-flight scheduled work" across every live component
// instance on the page — incremented when a mount-callback microtask is scheduled
// (base-element.ts's _scheduleMountCallbacks()), decremented when it completes.
//
// Why this exists: `@vielzeug/ripple`'s reactive graph settles fully synchronously on
// every signal write (see ripple's scheduling.ts) — there is no async flush queue to wait
// for there. The only genuinely async work `testing/flush()` needs to wait for is ore's own
// bounded, internal scheduling: `queueMicrotask`-scheduled onMounted callbacks.
// `testing/flush()` polls `hasPendingWork()` to know precisely when that work has
// settled, instead of draining a fixed, guessed number of microtask turns.
let pendingWork = 0;

/**
 * @internal Mark one scheduled mount-callback microtask as started. Call the
 * returned function exactly once when it completes.
 */
export const beginPendingWork = (): (() => void) => {
  pendingWork++;

  let ended = false;

  return () => {
    if (ended) return;

    ended = true;
    pendingWork--;
  };
};

/** @internal True while any tracked component work is in flight. Polled by `testing/flush()`. */
export const hasPendingWork = (): boolean => pendingWork > 0;

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

export const tryRegisterCleanup = (fn: Cleanup): boolean => {
  if (!currentContext) return false;

  _effect(() => fn);

  return true;
};

/** Registers cleanup work for component disconnect. */
export const onCleanup = (fn: Cleanup): void => {
  if (!tryRegisterCleanup(fn)) throw new OreApiError(`onCleanup: ${ORE_ERRORS.lifecycleOutsideSetup}`);
};

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
export const watchEffect = (fn: () => Cleanup | void): (() => void) => {
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
  callback: (el: T) => Cleanup | undefined | void,
): (() => void) => {
  return watchEffect(() => {
    const el = ref.value;

    if (el) return callback(el);
  });
};
