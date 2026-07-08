/**
 * Reactive ARIA attribute sync.
 *
 * `aria()` is a thin wrapper over `bind({ attr })` — the two used to carry
 * independent copies of the same "static | getter | signal → attribute write"
 * logic, which had already drifted (this file's writes bypassed the
 * `on*`/dangerous-URL-scheme hardening that `setAttr()` gives every other
 * attribute write in the package). `aria()` now exists purely to normalize
 * bare ARIA property names (`expanded` → `aria-expanded`) before delegating —
 * for attributes that are already fully-qualified, `bind({ attr }, { target })`
 * is equivalent.
 */

import { bind, type HostBindingValue } from './host-bind';
import { normalizeAriaKey } from './utils/aria';

export type AriaConfig = Record<string, HostBindingValue>;

/**
 * Reactively sync ARIA attributes on any element, auto-cleanup on component
 * disconnect. Returns a cleanup function that removes all reactive bindings.
 */
export const aria = (target: Element, config: AriaConfig): (() => void) => {
  const attr: Record<string, HostBindingValue> = {};

  for (const [key, value] of Object.entries(config)) attr[normalizeAriaKey(key)] = value;

  return bind({ attr }, { target });
};
