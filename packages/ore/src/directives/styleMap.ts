import { computed, type Readable } from '@vielzeug/ripple';

import { resolveMaybeReactive, sanitizeCssToken, toKebab } from '../utils/dom';

type StyleInput =
  | string
  | number
  | null
  | undefined
  | false
  | (() => string | number | null | undefined | false)
  | Readable<string | number | null | undefined | false>;

const toStyleValue = (value: StyleInput): string => {
  const resolved = resolveMaybeReactive(value);

  if (resolved == null || resolved === false) return '';

  return sanitizeCssToken(String(resolved));
};

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
 * html`<div style=${styleMap({
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

      const safeName = sanitizeCssToken(toKebab(name));

      if (!safeName) continue;

      declarations.push(`${safeName}:${value}`);
    }

    return declarations.join(';');
  });
};
