import {
  effect as _effect,
  onCleanup as _onCleanup,
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
let hasWarnedHandleOutsideScope = false;

export type OnMountedCallback = () => CleanupFn | void;
export type OnUpdatedCallback = () => void;

/**
 * Mutable box shared across all RuntimeScope objects that belong to the same
 * component instance. Mutations to `queued` are visible everywhere that holds
 * the same reference, preventing duplicate microtask scheduling when effects
 * fire from mount callbacks.
 */
export type UpdatedCallbackBox = {
  callbacks: OnUpdatedCallback[];
  queued: boolean;
};

export type RuntimeScope = {
  element: HTMLElement;
  mountCallbacks: OnMountedCallback[];
  updated: UpdatedCallbackBox;
};

const scheduleUpdatedCallbacks = (scope: RuntimeScope): void => {
  const { element, updated } = scope;

  if (updated.callbacks.length === 0 || updated.queued) return;

  updated.queued = true;

  queueMicrotask(() => {
    updated.queued = false;

    for (const callback of updated.callbacks) {
      withCurrentElement(element, callback);
    }
  });
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

/**
 * Register post-update work that runs after reactive updates flush.
 * Does NOT fire during setup-time effect initialization — only on subsequent
 * reactive re-runs.
 */
export const onUpdated = (fn: OnUpdatedCallback): void => {
  if (!currentScope) throw new Error(CRAFTIT_ERRORS.lifecycleOutsideSetup);

  currentScope.updated.callbacks.push(fn);
};

export const effect = (fn: EffectCallback, options?: EffectOptions): Subscription => {
  const scopeForEffect = currentScope;
  // Guard: don't fire onUpdated callbacks during the initial setup-time run.
  let mounted = false;
  const dispose = _effect(() => {
    const cleanup = fn();

    if (mounted && scopeForEffect) scheduleUpdatedCallbacks(scopeForEffect);

    mounted = true;

    return cleanup;
  }, options);

  tryRegisterCleanup(dispose);

  return dispose;
};

export function handle<K extends keyof HTMLElementEventMap>(
  target: EventTarget | null | undefined,
  event: K,
  listener: (e: HTMLElementEventMap[K]) => void,
  options?: AddEventListenerOptions,
): () => void;
export function handle(
  target: EventTarget | null | undefined,
  event: string,
  listener: EventListener,
  options?: AddEventListenerOptions,
): () => void {
  const cleanup = () => {
    if (!target) return;

    target.removeEventListener(event, listener, options);
  };

  if (!target) return cleanup;

  target.addEventListener(event, listener, options);

  const autoCleanupRegistered = tryRegisterCleanup(cleanup);

  if (!autoCleanupRegistered && !hasWarnedHandleOutsideScope) {
    hasWarnedHandleOutsideScope = true;

    // Surface accidental scope leaks: listener is active, but caller must dispose manually.
    console.warn(
      '[craftit] handle() called outside component setup/scope; auto-cleanup is disabled. Call the returned cleanup function manually.',
    );
  }

  return cleanup;
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
