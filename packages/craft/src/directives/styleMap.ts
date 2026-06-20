import { computed, isSignal, type Readable } from '@vielzeug/ripple';

import { toKebab } from '../utils/dom';

type StyleInput =
  | string
  | number
  | null
  | undefined
  | false
  | (() => string | number | null | undefined | false)
  | Readable<string | number | null | undefined | false>;

const toStyleValue = (value: StyleInput): string => {
  const resolved = typeof value === 'function' ? value() : isSignal(value) ? value.value : value;

  if (resolved == null || resolved === false) return '';

  // Strip characters that can break out of a CSS declaration in inline styles.
  // Semicolons end the current declaration; braces are meaningful in stylesheets
  // but not inline style values and signal injection attempts.
  return String(resolved).replace(/[;{}]/g, '');
};

// Strip characters that can break out of a CSS declaration in inline styles.
// This is applied to both property names and values: semicolons end declarations
// and braces are meaningful in stylesheet rules (but not inline style values).
const UNSAFE_CSS_CHARS = /[;{}]/g;

/**
 * Builds a reactive inline style string from a style object.
 *
 * Takes a record of CSS property names (camelCase) with values that can be:
 * - Static strings/numbers
 * - Functions that return strings/numbers
 * - Signals for reactive updates
 *
 * @example
 * ```ts
 * const color = signal('red');
 * const size = signal(16);
 *
 * html`<div :style=${styleMap({
 *   backgroundColor: color,
 *   width: () => `${size.value}px`,
 *   padding: '10px'
 * })}></div>`
 * ```
 */
export const styleMap = (record: Record<string, StyleInput>): Readable<string> => {
  return computed(() => {
    const declarations: string[] = [];

    for (const [name, input] of Object.entries(record)) {
      const value = toStyleValue(input);

      if (!value) continue;

      const safeName = toKebab(name).replace(UNSAFE_CSS_CHARS, '');

      if (!safeName) continue;

      declarations.push(`${safeName}:${value}`);
    }

    return declarations.join(';');
  });
};
