import { computed, isSignal, type ReadonlySignal, type Signal } from '@vielzeug/stateit';

import { htmlResult, type HTMLResult } from '../internal';

/**
 * Renders a trusted HTML string without escaping.
 * **Only use with content you control** — passing user-supplied strings
 * directly is an XSS risk.
 *
 * Supports static strings and signals.
 * When reactive, the DOM is updated in-place whenever the value changes.
 *
 * @example
 * ```ts
 * import { raw } from '@vielzeug/craftit';
 *
 * // Static
 * html`<div>${raw('<strong>bold</strong>')}</div>`
 *
 * // Reactive signal
 * const content = signal('<em>hello</em>');
 * html`<div>${raw(content)}</div>`
 * ```
 */
export function raw(value: string | Signal<string> | ReadonlySignal<string>): HTMLResult | ReadonlySignal<HTMLResult> {
  if (isSignal(value)) {
    return computed(() => htmlResult((value as ReadonlySignal<string>).value));
  }

  return htmlResult(value);
}
