/**
 * Reactive ARIA attribute sync — internal implementation.
 *
 * Public surface: `ctx.aria(target, config)` on the SetupContextBag.
 * For off-component usage (e.g. floating trigger callbacks), use `ctx.bind({ attr: {...} }, { target: el })`.
 */

import { effect as rawEffect, isSignal, type Readable } from '@vielzeug/ripple';

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

    if (isSignal(rawValue)) {
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
 * Create an `aria()` function scoped to a component's lifecycle.
 * Cleanup is auto-registered with `onCleanup` when inside a setup context.
 * @internal — consumed by context-bag.ts to produce `ctx.aria(target, config)`.
 */
export const createAriaFn =
  () =>
  (target: Element, config: AriaConfig): (() => void) => {
    const cleanup = applyAriaConfig(target, config);

    tryRegisterCleanup(cleanup);

    return cleanup;
  };
