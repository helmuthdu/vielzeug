import type { Locale, PluralForm } from './types';

/* -------------------- Cache Container -------------------- */

/** Holds all Intl formatter caches for one I18n instance — GC'd with the instance. */
export type IntlCaches = {
  dateFormat: Map<string, Intl.DateTimeFormat>;
  listFormat: Map<string, Intl.ListFormat>;
  numberFormat: Map<string, Intl.NumberFormat>;
  pluralRules: Map<string, Intl.PluralRules>;
  relativeTimeFormat: Map<string, Intl.RelativeTimeFormat>;
};

export function makeIntlCaches(): IntlCaches {
  return {
    dateFormat: new Map(),
    listFormat: new Map(),
    numberFormat: new Map(),
    pluralRules: new Map(),
    relativeTimeFormat: new Map(),
  };
}

/* -------------------- Cache Helpers -------------------- */

function intlFmt<F extends object>(cache: Map<string, F>, key: string, build: () => F): F {
  let fmt = cache.get(key);

  if (!fmt) {
    fmt = build();
    cache.set(key, fmt);
  }

  return fmt;
}

/**
 * Builds a stable string key for an Intl formatter cache.
 * Call this once per formatter construction path — not on every format call — so key
 * serialization cost is paid only on cache misses.
 */
function intlKey(locale: string, options?: object): string {
  return options ? `${locale}:${JSON.stringify(options, Object.keys(options).sort())}` : locale;
}

/* -------------------- Format Functions -------------------- */

export function formatNumber(
  caches: IntlCaches,
  value: number,
  options: Intl.NumberFormatOptions | undefined,
  locale: Locale,
): string {
  const key = intlKey(locale, options);

  try {
    return intlFmt(caches.numberFormat, key, () => new Intl.NumberFormat(locale, options)).format(value);
  } catch {
    return String(value);
  }
}

export function formatDate(
  caches: IntlCaches,
  value: Date | number,
  options: Intl.DateTimeFormatOptions | undefined,
  locale: Locale,
): string {
  const d = typeof value === 'number' ? new Date(value) : value;
  const key = intlKey(locale, options);

  try {
    return intlFmt(caches.dateFormat, key, () => new Intl.DateTimeFormat(locale, options)).format(d);
  } catch {
    return d.toString();
  }
}

export function formatRelative(
  caches: IntlCaches,
  value: number,
  unit: Intl.RelativeTimeFormatUnit,
  options: Intl.RelativeTimeFormatOptions | undefined,
  locale: Locale,
): string {
  const key = intlKey(locale, options);

  try {
    return intlFmt(caches.relativeTimeFormat, key, () => new Intl.RelativeTimeFormat(locale, options)).format(
      value,
      unit,
    );
  } catch {
    return String(value);
  }
}

export function formatList(caches: IntlCaches, items: unknown[], locale: string, type: 'and' | 'or'): string {
  if (items.length === 0) return '';

  const stringItems = items.map(String);
  const intlType = type === 'and' ? 'conjunction' : 'disjunction';

  try {
    return intlFmt(
      caches.listFormat,
      `${locale}:${intlType}`,
      () => new Intl.ListFormat(locale, { style: 'long', type: intlType }),
    ).format(stringItems);
  } catch {
    // Fallback for environments without Intl.ListFormat
    if (stringItems.length === 1) return stringItems[0];

    if (stringItems.length === 2) return `${stringItems[0]} ${type} ${stringItems[1]}`;

    return `${stringItems.slice(0, -1).join(', ')} ${type} ${stringItems.at(-1)}`;
  }
}

export function getPluralForm(caches: IntlCaches, locale: Locale, count: number): PluralForm {
  const n = Math.floor(Math.abs(count));

  try {
    return intlFmt(caches.pluralRules, locale, () => new Intl.PluralRules(locale)).select(n) as PluralForm;
  } catch {
    return n === 1 ? 'one' : 'other';
  }
}
