/**
 * CSS tagged template utility and CSSStyleSheet caching.
 */

import { error } from '../_dev';
import { makeBrand } from './brand';

export type CSSResult = {
  content: string;
  toString(): string;
};

const cssResultBrand = makeBrand<CSSResult>('ore:css-result');

export const isCssResult = cssResultBrand.is;

const cssResultToString = function (this: CSSResult): string {
  return this.content;
};

export const css = (strings: TemplateStringsArray, ...values: Array<CSSResult | string | number>): CSSResult => {
  let content = '';

  for (let i = 0; i < strings.length; i++) {
    content += strings[i];

    if (i < values.length) {
      const v = values[i];

      content += isCssResult(v) ? v.content : String(v);
    }
  }

  return cssResultBrand.stamp({ content: content.trim(), toString: cssResultToString });
};

const stylesheetStringCache = new Map<string, CSSStyleSheet>();
const STYLESHEET_CACHE_LIMIT = 256;

/** @internal Clear the stylesheet cache. Used for test isolation and HMR. */
export const _clearStylesheetCache = (): void => {
  stylesheetStringCache.clear();
};

/** @internal Visible to cache-behavior tests. */
export const _getStylesheetCacheSize = (): number => stylesheetStringCache.size;

export const loadStylesheet = (style: string | CSSStyleSheet | CSSResult): CSSStyleSheet => {
  if (style instanceof CSSStyleSheet) return style;

  const cssText = typeof style === 'string' ? style : style.content;
  const cached = stylesheetStringCache.get(cssText);

  if (cached) {
    // Refresh recency so styles repeatedly adopted by components survive eviction.
    stylesheetStringCache.delete(cssText);
    stylesheetStringCache.set(cssText, cached);

    return cached;
  }

  const sheet = new CSSStyleSheet();

  try {
    sheet.replaceSync(cssText);
  } catch (err) {
    // Deliberately not cached: a broken sheet served from cache would fail silently
    // for every subsequent caller with no further error.
    error('Style sheet replace failed', err);

    return sheet;
  }

  stylesheetStringCache.set(cssText, sheet);

  if (stylesheetStringCache.size > STYLESHEET_CACHE_LIMIT) {
    const oldestKey = stylesheetStringCache.keys().next().value;

    if (oldestKey !== undefined) stylesheetStringCache.delete(oldestKey);
  }

  return sheet;
};
