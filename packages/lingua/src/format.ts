/**
 * /lingua/format
 *
 * Standalone Intl formatter factory. Import from `/lingua/format`.
 * Creates formatters for numbers, dates, currencies, lists, durations, and relative time.
 *
 * Pass a static locale string or a reactive locale getter.
 *
 * @example
 * ```ts
 * import { createFormatter } from '@vielzeug/lingua/format';
 *
 * // Static locale
 * const fmt = createFormatter('en-US');
 *
 * // Reactive — always reads the current locale from the i18n instance
 * const fmt = createFormatter(() => i18n.locale);
 *
 * fmt.number(1_234.56);
 * fmt.currency(9.99, 'USD');
 * fmt.date(new Date());
 * fmt.relative(-1, 'day');
 * fmt.list(['A', 'B', 'C']);
 * fmt.duration({ hours: 1, minutes: 30 });
 * ```
 */

const FORMAT_CACHE_MAX = 128;

function getOrCreate<F>(cache: Map<string, F>, key: string, build: () => F): F {
  const cached = cache.get(key);

  if (cached !== undefined) return cached;

  const value = build();

  if (cache.size >= FORMAT_CACHE_MAX) cache.delete(cache.keys().next().value as string);

  cache.set(key, value);

  return value;
}

export type DurationValue = Partial<
  Record<
    | 'days'
    | 'hours'
    | 'microseconds'
    | 'milliseconds'
    | 'minutes'
    | 'months'
    | 'nanoseconds'
    | 'seconds'
    | 'weeks'
    | 'years',
    number
  >
>;

export type DurationFormatOptions = {
  hours?: '2-digit' | 'numeric';
  microseconds?: 'numeric';
  milliseconds?: 'numeric';
  minutes?: '2-digit' | 'numeric';
  nanoseconds?: 'numeric';
  seconds?: '2-digit' | 'numeric';
  style?: 'digital' | 'long' | 'narrow' | 'short';
};

export type ListFormatOptions = {
  style?: 'long' | 'narrow' | 'short';
  type?: 'and' | 'or';
};

export type Formatter = {
  /**
   * Clears all cached `Intl` formatter instances. Useful after a locale change on a long-running
   * SSR server, or to reclaim memory.
   *
   * @note This clears the cache for **all callers sharing this formatter instance**. When called on
   * `i18n.fmt`, the cache is cleared for every part of the application that reads `i18n.fmt`.
   * `setLocale()` already calls `clear()` automatically — manual calls are rarely needed.
   */
  clear(): void;
  currency(value: number, currency: string, options?: Omit<Intl.NumberFormatOptions, 'currency' | 'style'>): string;
  date(value: Date | number, options?: Intl.DateTimeFormatOptions): string;
  /**
   * Formats a duration using `Intl.DurationFormat` when available, or a compact labeled fallback
   * (e.g. `'1h 30min'`). Returns `''` when every field of `value` is `undefined`.
   *
   * @note The fallback labels (`h`, `min`, `s`, `ms`, etc.) are English-only and are not
   * locale-aware. If `Intl.DurationFormat` is unavailable in your target environment and
   * you need localised duration output, provide your own formatter using the individual
   * duration fields from `DurationValue`.
   */
  duration(value: DurationValue, options?: DurationFormatOptions): string;
  list(value: Array<string | number>, options?: ListFormatOptions): string;
  /** Formats a number with the current locale. */
  number(value: number, options?: Intl.NumberFormatOptions): string;
  relative(value: number, unit: Intl.RelativeTimeFormatUnit, options?: Intl.RelativeTimeFormatOptions): string;
};

// ─── Internal ─────────────────────────────────────────────────────────────────

const DURATION_UNITS: Array<keyof DurationValue> = [
  'years',
  'months',
  'weeks',
  'days',
  'hours',
  'minutes',
  'seconds',
  'milliseconds',
  'microseconds',
  'nanoseconds',
];

const DURATION_LABELS: Record<keyof DurationValue, string> = {
  days: 'd',
  hours: 'h',
  microseconds: 'us',
  milliseconds: 'ms',
  minutes: 'min',
  months: 'mo',
  nanoseconds: 'ns',
  seconds: 's',
  weeks: 'w',
  years: 'y',
};

type DurationFormatterCtor = new (
  locale: string,
  options?: DurationFormatOptions,
) => { format(value: DurationValue): string };

function durationLabeled(value: DurationValue): string {
  return DURATION_UNITS.map((unit) => {
    const amount = value[unit];

    return typeof amount === 'number' ? `${amount}${DURATION_LABELS[unit]}` : undefined;
  })
    .filter((part): part is string => part !== undefined)
    .join(' ');
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Creates a formatter bound to a locale. Pass a static locale string or a
 * reactive getter function `() => string` (e.g. `() => i18n.locale`).
 */
export function createFormatter(source: string | (() => string)): Formatter {
  const numberCache = new Map<string, Intl.NumberFormat>();
  const currencyCache = new Map<string, Intl.NumberFormat>();
  const dateCache = new Map<string, Intl.DateTimeFormat>();
  const relativeCache = new Map<string, Intl.RelativeTimeFormat>();
  const listCache = new Map<string, Intl.ListFormat>();
  const durationCache = new Map<string, { format(value: DurationValue): string }>();

  const getLocale = typeof source === 'string' ? () => source : source;

  function cachedKey(locale: string, options?: object): string {
    if (!options) return locale;

    const sorted: Record<string, unknown> = {};

    for (const key of Object.keys(options as Record<string, unknown>).sort()) {
      sorted[key] = (options as Record<string, unknown>)[key];
    }

    try {
      return `${locale}:${JSON.stringify(sorted)}`;
    } catch {
      // Circular references or BigInt values — fall back to locale-only key.
      // Multiple callers with different unserializable options will share the same formatter instance.
      return locale;
    }
  }

  return {
    clear() {
      numberCache.clear();
      currencyCache.clear();
      dateCache.clear();
      relativeCache.clear();
      listCache.clear();
      durationCache.clear();
    },

    currency(value, currency, options) {
      const locale = getLocale();
      const opts: Intl.NumberFormatOptions = { ...options, currency, style: 'currency' };

      return getOrCreate(currencyCache, cachedKey(locale, opts), () => new Intl.NumberFormat(locale, opts)).format(
        value,
      );
    },

    date(value, options) {
      const locale = getLocale();

      return getOrCreate(dateCache, cachedKey(locale, options), () => new Intl.DateTimeFormat(locale, options)).format(
        value,
      );
    },

    duration(value, options) {
      const locale = getLocale();
      const IntlExt = Intl as typeof Intl & { DurationFormat?: DurationFormatterCtor };

      if (!IntlExt.DurationFormat) return durationLabeled(value);

      if (DURATION_UNITS.every((u) => value[u] === undefined)) return '';

      return getOrCreate(
        durationCache,
        cachedKey(locale, options),
        () => new IntlExt.DurationFormat!(locale, options),
      ).format(value);
    },

    list(value, options) {
      const locale = getLocale();
      const items = value.map((v) => String(v));
      // list() has exactly two string options with small finite value domains.
      // We normalize both to their resolved defaults and build the key directly
      // rather than using cachedKey(). This also prevents cache misses when
      // callers pass { style: 'long', type: 'and' } vs {} (same ListFormat).
      const style = options?.style ?? 'long';
      const type = options?.type === 'or' ? 'disjunction' : 'conjunction';

      return getOrCreate(
        listCache,
        cachedKey(locale, { style, type }),
        () => new Intl.ListFormat(locale, { style, type }),
      ).format(items);
    },

    number(value, options) {
      const locale = getLocale();

      return getOrCreate(numberCache, cachedKey(locale, options), () => new Intl.NumberFormat(locale, options)).format(
        value,
      );
    },

    relative(value, unit, options) {
      const locale = getLocale();

      return getOrCreate(
        relativeCache,
        cachedKey(locale, options),
        () => new Intl.RelativeTimeFormat(locale, options),
      ).format(value, unit);
    },
  };
}
