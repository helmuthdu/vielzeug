/**
 * Reactive ARIA attribute sync.
 *
 * `aria()` is a thin convenience wrapper over `bind({ aria: config }, { target })` for the
 * common "just ARIA, on one element" case — normalizing bare ARIA property names
 * (`expanded` → `aria-expanded`) is `HostBindConfig.aria`'s job, not this function's; both
 * this and `bind()` share the exact same write path (`applyAttribute`/`setAttr`, including
 * its `on*`/dangerous-URL-scheme hardening), so there's nothing left to duplicate here.
 *
 * A component that needs both a regular attribute and ARIA attributes on the same element
 * can skip this wrapper entirely and pass `attr`/`aria` together in one `bind()` call —
 * one call, one cleanup function, instead of two.
 */

import { bind, type HostBindingValue } from './host-bind';

export type AriaConfig = Record<string, HostBindingValue>;

/**
 * Reactively sync ARIA attributes on any element, auto-cleanup on component
 * disconnect. Returns a cleanup function that removes all reactive bindings.
 */
export const aria = (target: Element, config: AriaConfig): (() => void) => bind({ aria: config }, { target });
