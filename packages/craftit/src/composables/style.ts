/**
 * Craftit - CSS Helpers
 * Utilities for component styling
 */

/**
 * CSS tagged template function
 */
export function css(strings: TemplateStringsArray, ...values: unknown[]): string {
  return strings.reduce((result, str, i) => {
    return result + str + (values[i] ?? '');
  }, '');
}

/**
 * Convert camelCase to kebab-case
 */
function toKebab(str: string): string {
  return str.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

/**
 * Theme variable proxy
 */
type ThemeVars<T extends Record<string, string | number>> = {
  readonly [K in keyof T]: string;
} & {
  toString(): string;
};

/**
 * Create a theme with CSS variables
 */
css.theme = <T extends Record<string, string | number>>(
  light: T,
  dark?: T,
  options?: {
    selector?: string;
    attribute?: string;
  },
): ThemeVars<T> => {
  const selector = options?.selector ?? ':host';
  const attribute = options?.attribute ?? 'data-theme';

  const toVars = (obj: T) =>
    Object.entries(obj)
      .map(([key, val]) => {
        const cssVar = key.startsWith('--') ? key : `--${toKebab(key)}`;
        return `${cssVar}: ${val};`;
      })
      .join(' ');

  const cssRule = dark
    ? // Light/dark mode
      [
        `${selector} { ${toVars(light)} }`,
        '@media (prefers-color-scheme: dark) {',
        `  ${selector}:not([${attribute}="light"]) { ${toVars(dark)} }`,
        '}',
        `${selector}[${attribute}="dark"] { ${toVars(dark)} }`,
        `${selector}[${attribute}="light"] { ${toVars(light)} }`,
      ].join('\n')
    : // Single theme
      `${selector} { ${toVars(light)} }`;

  return new Proxy({} as ThemeVars<T>, {
    get(_, prop) {
      if (prop === 'toString' || prop === Symbol.toPrimitive) {
        return () => cssRule;
      }
      if (typeof prop === 'string' && prop in light) {
        const cssVar = prop.startsWith('--') ? prop : `--${toKebab(prop)}`;
        return `var(${cssVar})`;
      }
      return undefined;
    },
  });
};

/**
 * Helper to create class names conditionally
 */
css.classes = (
  classes:
    | Record<string, boolean | undefined>
    | (string | false | undefined | null | Record<string, boolean | undefined>)[],
): string => {
  // Array support
  if (Array.isArray(classes)) {
    return classes
      .map((item) => {
        if (!item) return '';
        if (typeof item === 'string') return item;
        if (typeof item === 'object') {
          // Nested object
          return Object.entries(item)
            .filter(([, value]) => value)
            .map(([key]) => key)
            .join(' ');
        }
        return '';
      })
      .filter(Boolean)
      .join(' ');
  }

  // Object support
  return Object.entries(classes)
    .filter(([, value]) => value)
    .map(([key]) => key)
    .join(' ');
};

/**
 * Helper to create inline styles from object
 */
css.styles = (styles: Partial<CSSStyleDeclaration> | Record<string, string | number | undefined | null>): string => {
  return Object.entries(styles)
    .filter(([, value]) => value != null)
    .map(([key, value]) => `${toKebab(key)}: ${value}`)
    .join('; ');
};
