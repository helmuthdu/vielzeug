import { computed, isSignal, type ReadonlySignal, type Signal } from '@vielzeug/stateit';

import { htmlResult, type HTMLResult } from '../core/internal';

/**
 * Renders a trusted HTML string without escaping.
 * **Only use with content you control** — passing user-supplied strings
 * directly is an XSS risk.
 *
 * Supports static strings, writable Signals, and getter functions.
 * When reactive, the DOM is updated in-place whenever the value changes.
 *
 * @example
 * import { raw } from '@vielzeug/craftit/directives';
 *
 * // Static
 * html`<div>${raw('<strong>bold</strong>')}</div>`
 *
 * // Reactive signal
 * const content = signal('<em>hello</em>');
 * html`<div>${raw(content)}</div>`
 *
 * // Getter
 * html`<div>${raw(() => sanitize(props.body.value))}</div>`
 */
export function raw(
  value: string | Signal<string> | ReadonlySignal<string> | (() => string),
): HTMLResult | ReadonlySignal<HTMLResult> {
  if (isSignal(value)) {
    return computed(() => htmlResult((value as ReadonlySignal<string>).value));
  }

  if (typeof value === 'function') {
    return computed(() => htmlResult((value as () => string)()));
  }

  return htmlResult(value);
}
