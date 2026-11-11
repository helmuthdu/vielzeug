/**
 * Component runtime: implicit "current component" context plus every lifecycle
 * hook a `setup()` function can call.
 *
 * Design note: hooks are plain module-level functions (not a bag/context object
 * passed into `setup`). They resolve the active component through a single
 * module-level pointer (`currentContext`), set for the duration of `setup()` and
 * of each queued `onMounted` callback. This is the same mechanism React/Vue/Solid
 * use for their composable hooks: it lets any helper function (not just the
 * top-level `setup()` body) call `onMounted`/`onCleanup`/`bind`/... directly,
 * with no context object to thread through every layer of a composable.
 */
import {
  effect as _effect,
  type Cleanup,
  createScope,
  type Readable,
  onCleanup as rippleOnCleanup,
  type Scope,
} from '@vielzeug/ripple';

import { ORE_ERRORS, OreApiError } from './errors';
import { listen as listenInternal } from './utils/dom';

// ─── Runtime context ──────────────────────────────────────────────────────────

export type OnMountedCallback = () => Cleanup | undefined;
export type OnFormResetCallback = () => void;

/**
 * One component connection: everything `setup()` and its `onMounted` callbacks
 * register, owned by `scope`. The same object stays active for the connection's
 * whole lifetime, so identity-keyed caches (e.g. `inject()`) are per connection.
 */
export type RuntimeContext = {
  readonly element: HTMLElement;
  readonly formResetCallbacks: OnFormResetCallback[];
  /** Queue drained by the mount microtask; nested `onMounted` calls append to it. */
  readonly mountCallbacks: OnMountedCallback[];
  readonly scope: Scope;
};

let currentContext: RuntimeContext | null = null;

/** @internal Create the context for one component connection. */
export const createRuntimeContext = (element: HTMLElement): RuntimeContext => ({
  element,
  formResetCallbacks: [],
  mountCallbacks: [],
  scope: createScope(),
});

// ─── Pending work tracking ──────────────────────────────────────────────────
// A single counter of "in-flight scheduled work" across every live component
// instance on the page: incremented when a mount-callback microtask is scheduled
// (base-element.ts's _scheduleMountCallbacks()), decremented when it completes.
//
// Why this exists: `@vielzeug/ripple`'s reactive graph settles fully synchronously on
// every signal write (see ripple's scheduling.ts): there is no async flush queue to wait
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

/** @internal Execute fn inside the context's scope with the context active. */
export const runWithContext = <T>(ctx: RuntimeContext, fn: () => T): T => {
  const prev = currentContext;

  currentContext = ctx;

  try {
    return ctx.scope.run(fn);
  } finally {
    currentContext = prev;
  }
};

/**
 * Returns the current runtime context, throwing a consistently-worded error
 * (naming the calling API) if called outside `setup()`. Every lifecycle/context
 * hook below routes through this: it's the single place that decides both
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
 * called from it): throws otherwise.
 */
export const getHost = (): HTMLElement => requireSetupContext('getHost').element;

/** True while a component's setup (or one of its `onMounted` callbacks) is running. */
export const hasSetupContext = (): boolean => currentContext !== null;

/**
 * Registers cleanup work for component disconnect. The callback is owned by the
 * component's ripple scope, so it runs when that scope is disposed.
 */
export const onCleanup = (fn: Cleanup): void => {
  requireSetupContext('onCleanup');
  rippleOnCleanup(fn);
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
 * registration order, every time the form resets: unlike `onMounted`, this isn't a
 * one-shot hook.
 */
export const onFormReset = (fn: OnFormResetCallback): void => {
  requireSetupContext('onFormReset').formResetCallbacks.push(fn);
};

/**
 * Create a reactive effect owned by the current component: disposed on disconnect.
 * Returns a stop function that disposes the effect immediately. Throws outside
 * setup, where the effect would have no owner and live forever; use ripple's
 * `effect()` for an explicitly owned effect elsewhere.
 *
 * Named `watchEffect` (not `watch`) to avoid shadowing `@vielzeug/ripple`'s
 * `watch(source, callback)`, which has different semantics (explicit source,
 * old/new value pair): the two are commonly imported in the same file.
 */
export const watchEffect = (fn: () => Cleanup | undefined): (() => void) => {
  requireSetupContext('watchEffect');

  const sub = _effect(fn);

  return () => sub.dispose();
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
  listener: (e: Event) => void,
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

  rippleOnCleanup(listenInternal(target, event, listener, options));
}

/**
 * Watch a ref signal and run a callback when it resolves to a non-null element.
 * The callback's return value is used as a cleanup function.
 */
export const onElement = <T extends HTMLElement>(
  ref: Readable<T | null>,
  callback: (el: T) => Cleanup | undefined,
): (() => void) => {
  return watchEffect(() => {
    const el = ref.value;

    if (el) return callback(el);
  });
};
