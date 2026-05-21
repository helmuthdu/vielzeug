/**
 * Reactive ARIA attribute sync utility.
 *
 * `syncAria(target, config, options?)` — reactively syncs ARIA attributes to a target element.
 * Static values are applied once; getter functions are tracked as reactive effects.
 */

import { effect as rawEffect } from '@vielzeug/stateit';

import { tryRegisterCleanup } from './runtime';
import { normalizeAriaKey } from './utils/aria';

type AriaValue = string | number | boolean | null | undefined | (() => string | number | boolean | null | undefined);

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
      const getter = rawValue as () => string | number | boolean | null | undefined;

      disposers.push(
        rawEffect(() => {
          setA11yAttr(target, key, getter());
        }),
      );

      continue;
    }

    setA11yAttr(target, key, rawValue as string | number | boolean | null | undefined);
  }

  const cleanup = () => {
    while (disposers.length > 0) disposers.pop()?.();
  };

  if (autoCleanup) tryRegisterCleanup(cleanup);

  return cleanup;
};
