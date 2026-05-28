/**
 * CSS tagged template utility and CSSStyleSheet caching.
 */

export type CSSResult = {
  content: string;
  toString(): string;
};

const cssResultBrand = new WeakSet<CSSResult>();

export const isCssResult = (value: unknown): value is CSSResult =>
  typeof value === 'object' && value !== null && cssResultBrand.has(value as CSSResult);

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

  const result: CSSResult = { content: content.trim(), toString: cssResultToString };

  cssResultBrand.add(result);

  return result;
};

const stylesheetStringCache = new Map<string, CSSStyleSheet>();

export const loadStylesheet = (style: string | CSSStyleSheet | CSSResult): CSSStyleSheet => {
  if (style instanceof CSSStyleSheet) return style;

  const cssText = typeof style === 'string' ? style : style.content;
  const cached = stylesheetStringCache.get(cssText);

  if (cached) return cached;

  const sheet = new CSSStyleSheet();

  try {
    sheet.replaceSync(cssText);
  } catch (err) {
    console.error('Style sheet replace failed', err);
  }

  stylesheetStringCache.set(cssText, sheet);

  return sheet;
};
