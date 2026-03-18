import type { Vars } from './types';

import { resolvePath } from './helpers';
import { type IntlCaches, formatList, formatNumber } from './intl';

/* -------------------- Token Resolution -------------------- */

function resolveToken(caches: IntlCaches, value: unknown, separator: string | undefined, locale: string): string {
  if (value == null) return '';

  if (Array.isArray(value)) {
    if (separator === 'and') return formatList(caches, value, locale, 'and');

    if (separator === 'or') return formatList(caches, value, locale, 'or');

    if (separator !== undefined) return value.map(String).join(separator);

    return value.map(String).join(', ');
  }

  if (typeof value === 'number') {
    return formatNumber(caches, value, undefined, locale);
  }

  return String(value);
}

/* -------------------- Interpolation -------------------- */

/**
 * Interpolates variables into a template string. Supports Unicode variable names
 * via `\p{ID_Continue}` so non-ASCII identifiers like `{prénom}` or `{名前}` work correctly.
 *
 * Supported formats: `{name}` · `{user.name}` · `{items[0]}` · `{items}` ·
 * `{items|and}` · `{items|or}` · `{items| - }` · `{items.length}`
 */
export function interpolate(template: string, vars: Vars, locale: string, caches: IntlCaches): string {
  if (!template.includes('{')) return template;

  return template.replace(/\{([\p{ID_Continue}\-.[\]]+)(?:\|([^}]+))?\}/gu, (_match, key: string, separator?: string) =>
    resolveToken(caches, resolvePath(vars, key), separator, locale),
  );
}
