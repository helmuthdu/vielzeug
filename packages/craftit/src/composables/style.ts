/**
 * Craftit - CSS Helpers
 * Utilities for component styling with CSP support
 */

import { toKebab } from '../utils/string';

/**
 * Get CSP nonce from meta tag
 */
function getCSPNonce(): string | null {
  if (typeof document === 'undefined') return null;

  const meta = document.querySelector('meta[name="csp-nonce"], meta[property="csp-nonce"]');
  return meta?.getAttribute('content') || null;
}

/**
 * CSS style result with nonce support
 */
export interface CSSResult {
  content: string;
  nonce?: string;
}

/**
 * CSS tagged template function
 * Supports CSP nonce for inline styles
 *
 * @example
 * // With CSP nonce in meta tag
 * <meta name="csp-nonce" content="abc123">
 *
 * // CSS will automatically use the nonce
 * const styles = css`color: red;`;
 */
export function css(strings: TemplateStringsArray, ...values: unknown[]): CSSResult {
  const content = strings.reduce((result, str, i) => {
    return result + str + (values[i] ?? '');
  }, '');

  const nonce = getCSPNonce();

  return {
    content,
    ...(nonce && { nonce }),
  };
}

/**
 * Create a style element with CSP nonce
 */
export function createStyleElement(cssResult: CSSResult | string): HTMLStyleElement {
  const style = document.createElement('style');

  if (typeof cssResult === 'string') {
    style.textContent = cssResult;
  } else {
    style.textContent = cssResult.content;
    if (cssResult.nonce) {
      style.setAttribute('nonce', cssResult.nonce);
    }
  }

  return style;
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
