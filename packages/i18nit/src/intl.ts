import type { FormatInput, Locale } from './types';

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
 */
function intlKey(locale: string, options?: object): string {
  if (!options) return locale;

  const input = options as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};

  for (const key of Object.keys(input).sort()) {
    sorted[key] = input[key];
  }

  return `${locale}:${JSON.stringify(sorted)}`;
}

/* -------------------- Format Function -------------------- */

export function format(caches: IntlCaches, locale: Locale, input: FormatInput): string {
  try {
    if (input.kind === 'number') {
      const key = intlKey(locale, input.options);

      return intlFmt(caches.numberFormat, key, () => new Intl.NumberFormat(locale, input.options)).format(input.value);
    }

    if (input.kind === 'currency') {
      const options: Intl.NumberFormatOptions = { ...input.options, currency: input.currency, style: 'currency' };
      const key = intlKey(locale, options);

      return intlFmt(caches.numberFormat, key, () => new Intl.NumberFormat(locale, options)).format(input.value);
    }

    if (input.kind === 'date') {
      const date = typeof input.value === 'number' ? new Date(input.value) : input.value;
      const key = intlKey(locale, input.options);

      return intlFmt(caches.dateFormat, key, () => new Intl.DateTimeFormat(locale, input.options)).format(date);
    }

    if (input.kind === 'relative') {
      const key = intlKey(locale, input.options);

      return intlFmt(caches.relativeTimeFormat, key, () => new Intl.RelativeTimeFormat(locale, input.options)).format(
        input.value,
        input.unit,
      );
    }

    const items = input.value.map(String);

    if (items.length === 0) return '';

    const type = input.options?.type === 'or' ? 'disjunction' : 'conjunction';
    const style = input.options?.style ?? 'long';

    return intlFmt(
      caches.listFormat,
      `${locale}:${type}:${style}`,
      () => new Intl.ListFormat(locale, { style, type }),
    ).format(items);
  } catch {
    if (input.kind === 'date') {
      return typeof input.value === 'number' ? new Date(input.value).toString() : input.value.toString();
    }

    return input.kind === 'list' ? input.value.map(String).join(', ') : String(input.value);
  }
}

/* -------------------- Plural Selection -------------------- */

export function selectPluralForm(caches: IntlCaches, locale: Locale, count: number): string {
  const n = Math.floor(Math.abs(count));

  try {
    return intlFmt(caches.pluralRules, locale, () => new Intl.PluralRules(locale)).select(n);
  } catch {
    return n === 1 ? 'one' : 'other';
  }
}
