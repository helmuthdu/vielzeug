/**
 * Reactive ARIA attribute sync utility.
 *
 * `syncAria(target, config, options?)` — reactively syncs ARIA attributes to a target element.
 * Static values are applied once; getter functions are tracked as reactive effects.
 */

import { effect as rawEffect, isSignal, type ReadonlySignal } from '@vielzeug/ripple';

import { tryRegisterCleanup } from './runtime';
import { normalizeAriaKey } from './utils/aria';

type AriaScalar = string | number | boolean | null | undefined;
type AriaValue = AriaScalar | (() => AriaScalar) | ReadonlySignal<AriaScalar>;

type AriaConfig = Record<string, AriaValue>;

export type SyncAriaOptions = {
  autoCleanup?: boolean;
};

const setA11yAttr = (target: Element, key: string, value: string | number | boolean | null | undefined): void => {
  if (value == null || value === false) {
    target.removeAttribute(key);

    return;
  }

  target.setAttribute(key, value === true ? 'true' : String(value));
};

/**
 * Reactively syncs ARIA attributes to a target element.
 * Static values are set immediately; getter functions are tracked as effects.
 * Returns a cleanup function that removes all reactive bindings.
 *
 * @example
 * syncAria(element, {
 *   role: 'button',
 *   expanded: () => isOpen.value,
 *   disabled: () => isDisabled.value,
 * });
 */
export const syncAria = (target: Element, config: AriaConfig, options: SyncAriaOptions = {}): (() => void) => {
  const { autoCleanup = true } = options;
  const disposers: Array<() => void> = [];

  for (const [rawKey, rawValue] of Object.entries(config)) {
    const key = normalizeAriaKey(rawKey);

    if (typeof rawValue === 'function') {
      const sub = rawEffect(() => setA11yAttr(target, key, rawValue()));

      disposers.push(() => sub.dispose());

      continue;
    }

    if (isSignal(rawValue)) {
      const sub = rawEffect(() => setA11yAttr(target, key, rawValue.value as AriaScalar));

      disposers.push(() => sub.dispose());

      continue;
    }

    setA11yAttr(target, key, rawValue);
  }

  const cleanup = () => {
    while (disposers.length > 0) disposers.pop()?.();
  };

  if (autoCleanup) {
    const registered = tryRegisterCleanup(cleanup);

    if (!registered) {
      console.warn(
        '[craft] syncAria() called with autoCleanup:true but no active setup context. ' +
          'Effects will leak unless you call the returned cleanup function manually.',
      );
    }
  }

  return cleanup;
};
