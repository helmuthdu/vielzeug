import { computed, isSignal, type ReadonlySignal, type Signal } from '@vielzeug/stateit';

import { htmlResult, type HTMLResult } from '../internal';

type RawSanitizer = (html: string) => string;

let _sanitizer: RawSanitizer | null = null;

/**
 * Registers a global HTML sanitizer used by `raw()` before injecting content
 * into the DOM. Call once at application startup with a trusted sanitizer such
 * as DOMPurify.
 *
 * @example
 * ```ts
 * import DOMPurify from 'dompurify';
 * import { setRawSanitizer } from '@vielzeug/craftit';
 *
 * setRawSanitizer((html) => DOMPurify.sanitize(html));
 * ```
 */
export const setRawSanitizer = (fn: RawSanitizer | null): void => {
  _sanitizer = fn;
};

/**
 * @internal — resets the global sanitizer to `null`. Used by the test harness to
 * prevent sanitizer state from leaking between test files.
 */
export const _resetRawSanitizer = (): void => {
  _sanitizer = null;
};

const sanitize = (value: string): string => {
  if (_sanitizer) return _sanitizer(value);

  // Warn in all environments — omitting a sanitizer when passing user-supplied
  // HTML to raw() is a production XSS risk, not only a development mistake.
  if (value) {
    console.warn(
      '[craftit] raw() was called without a sanitizer registered. ' +
        'Passing user-supplied HTML directly to raw() is an XSS risk. ' +
        'Register a sanitizer with setRawSanitizer() — e.g. setRawSanitizer(DOMPurify.sanitize).',
    );
  }

  return value;
};

/**
 * Renders a trusted HTML string without escaping.
 * **Only use with content you control** — passing user-supplied strings
 * directly is an XSS risk. Register a sanitizer with `setRawSanitizer()`
 * to add a runtime safety net.
 *
 * Supports static strings and signals.
 * When reactive, the DOM is updated in-place whenever the value changes.
 *
 * @example
 * ```ts
 * import { raw, setRawSanitizer } from '@vielzeug/craftit';
 * import DOMPurify from 'dompurify';
 *
 * setRawSanitizer((html) => DOMPurify.sanitize(html));
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
    return computed(() => htmlResult(sanitize((value as ReadonlySignal<string>).value)));
  }

  return htmlResult(sanitize(value));
}
