import { computed, isSignal, type ReadonlySignal } from '@vielzeug/stateit';

type StyleInput =
  | string
  | number
  | null
  | undefined
  | false
  | (() => string | number | null | undefined | false)
  | ReadonlySignal<string | number | null | undefined | false>;

const toStyleValue = (value: StyleInput): string => {
  const resolved = typeof value === 'function' ? value() : isSignal(value) ? value.value : value;

  if (resolved == null || resolved === false) return '';

  return String(resolved);
};

const toKebabCase = (name: string): string => name.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);

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
export const styleMap = (record: Record<string, StyleInput>): ReadonlySignal<string> => {
  return computed(() => {
    const declarations: string[] = [];

    for (const [name, input] of Object.entries(record)) {
      const value = toStyleValue(input);

      if (!value) continue;

      declarations.push(`${toKebabCase(name)}:${value}`);
    }

    return declarations.join(';');
  });
};
