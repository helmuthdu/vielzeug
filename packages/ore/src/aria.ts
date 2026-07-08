/**
 * Reactive ARIA attribute sync.
 *
 * Public surface: `aria(target, config)`. For simple static/reactive attribute
 * bindings, `bind({ attr: {...} }, { target: el })` also works — `aria()` exists
 * separately because it normalizes bare ARIA property names (`expanded` → `aria-expanded`).
 */

import { effect as rawEffect, isReactive, type Readable } from '@vielzeug/ripple';

import { tryRegisterCleanup } from './runtime';
import { normalizeAriaKey } from './utils/aria';

type AriaScalar = string | number | boolean | null | undefined;
type AriaValue = AriaScalar | (() => AriaScalar) | Readable<AriaScalar>;

export type AriaConfig = Record<string, AriaValue>;

const setA11yAttr = (target: Element, key: string, value: string | number | boolean | null | undefined): void => {
  if (value == null || value === false) {
    target.removeAttribute(key);

    return;
  }

  target.setAttribute(key, value === true ? 'true' : String(value));
};

/** @internal Apply aria config to a target element, returning a cleanup fn. */
const applyAriaConfig = (target: Element, config: AriaConfig): (() => void) => {
  const disposers: Array<() => void> = [];

  for (const [rawKey, rawValue] of Object.entries(config)) {
    const key = normalizeAriaKey(rawKey);

    if (typeof rawValue === 'function') {
      const sub = rawEffect(() => setA11yAttr(target, key, rawValue()));

      disposers.push(() => sub.dispose());

      continue;
    }

    if (isReactive(rawValue)) {
      const sub = rawEffect(() => setA11yAttr(target, key, rawValue.value as AriaScalar));

      disposers.push(() => sub.dispose());

      continue;
    }

    setA11yAttr(target, key, rawValue);
  }

  return () => {
    while (disposers.length > 0) disposers.pop()?.();
  };
};

/**
 * Reactively sync ARIA attributes on any element, auto-cleanup on component
 * disconnect. Returns a cleanup function that removes all reactive bindings.
 */
export const aria = (target: Element, config: AriaConfig): (() => void) => {
  const cleanup = applyAriaConfig(target, config);

  tryRegisterCleanup(cleanup);

  return cleanup;
};
