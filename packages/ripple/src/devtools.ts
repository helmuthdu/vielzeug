import type { ReadonlySignal } from './types';

// ── Signal registry (F3) ──────────────────────────────────────────────────────
//
// A WeakMap-based registry that maps signal instances to their names.
// Used by DevTools integrations and the __RIPPLE_DEVTOOLS__ global hook.
//
// Registration happens automatically when a signal is created with a `name`
// option. Zero overhead for unnamed signals.

const registry = new WeakMap<object, string>();

/** @internal Called by SignalImpl / ComputedImpl constructors when `name` is set. */
export const registerSignal = (signal: object, name: string): void => {
  registry.set(signal, name);
};

/** Returns the registered name for a signal, or `undefined` if unnamed or unknown. */
export const getSignalName = (signal: object): string | undefined => registry.get(signal);

// ── DevTools global hook ──────────────────────────────────────────────────────

export type RippleDevToolsHook = {
  /** Called when a computed recomputes. */
  onComputedRecompute?(name: string | undefined): void;
  /** Called when an effect is disposed. */
  onEffectDispose?(name: string | undefined): void;
  /** Called when an effect starts running. */
  onEffectRun?(name: string | undefined): void;
  /** Called when a signal's value changes. */
  onSignalWrite?(signal: ReadonlySignal<unknown>, name: string | undefined, newValue: unknown): void;
};

declare global {
  var __RIPPLE_DEVTOOLS__: RippleDevToolsHook | undefined;
}

/** Returns the currently installed DevTools hook, or `null` if none is installed. */
export const getDevToolsHook = (): RippleDevToolsHook | null =>
  (typeof globalThis !== 'undefined' && globalThis.__RIPPLE_DEVTOOLS__) || null;

/**
 * Installs a DevTools hook for observing ripple internals.
 * Pass `null` to uninstall.
 *
 * @example
 * ```ts
 * import { installDevTools } from '@vielzeug/ripple';
 *
 * installDevTools({
 *   onSignalWrite(signal, name, newValue) {
 *     console.log(`[ripple] ${name ?? '(unnamed)'} =`, newValue);
 *   },
 * });
 * ```
 */
export const installDevTools = (hook: RippleDevToolsHook | null): void => {
  if (typeof globalThis !== 'undefined') {
    if (hook === null) {
      delete globalThis.__RIPPLE_DEVTOOLS__;
    } else {
      globalThis.__RIPPLE_DEVTOOLS__ = hook;
    }
  }
};
