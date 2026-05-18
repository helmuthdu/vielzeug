/**
 * @vielzeug/i18nit/format
 *
 * Standalone Intl formatter factory. Import from `@vielzeug/i18nit/format`.
 * Creates formatters for numbers, dates, currencies, lists, durations, and relative time.
 *
 * Pass a static locale string, a reactive locale getter, or an i18n instance.
 *
 * @example
 * ```ts
 * import { createFormatter } from '@vielzeug/i18nit/format';
 *
 * // Static locale
 * const fmt = createFormatter('en-US');
 *
 * // Reactive — always reads the current locale from the i18n instance
 * const fmt = createFormatter(i18n);
 *
 * fmt.number(1_234.56);
 * fmt.currency(9.99, 'USD');
 * fmt.date(new Date());
 * fmt.relative(-1, 'day');
 * fmt.list(['A', 'B', 'C']);
 * fmt.duration({ hours: 1, minutes: 30 });
 * ```
 */

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
  currency(value: number, currency: string, options?: Omit<Intl.NumberFormatOptions, 'currency' | 'style'>): string;
  date(value: Date | number, options?: Intl.DateTimeFormatOptions): string;
  duration(value: DurationValue, options?: DurationFormatOptions): string;
  list(value: unknown[], options?: ListFormatOptions): string;
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

function cacheKey(locale: string, options?: object): string {
  if (!options) return locale;

  const sorted: Record<string, unknown> = {};

  for (const key of Object.keys(options as Record<string, unknown>).sort()) {
    sorted[key] = (options as Record<string, unknown>)[key];
  }

  return `${locale}:${JSON.stringify(sorted)}`;
}

function getOrCreate<F>(cache: Map<string, F>, key: string, build: () => F): F {
  let f = cache.get(key);

  if (!f) {
    f = build();
    cache.set(key, f);
  }

  return f;
}

function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

function durationLabeled(value: DurationValue): string {
  return DURATION_UNITS.map((unit) => {
    const amount = value[unit];

    return typeof amount === 'number' ? `${amount}${DURATION_LABELS[unit]}` : undefined;
  })
    .filter((part): part is string => part !== undefined)
    .join(' ');
}

function durationFallback(value: DurationValue, options?: DurationFormatOptions): string {
  if (options?.style === 'digital') {
    const years = Math.trunc(value.years ?? 0);
    const months = Math.trunc(value.months ?? 0);

    // Calendar units have locale/calendar-dependent lengths, so keep labeled output.
    if (years !== 0 || months !== 0) return durationLabeled(value);

    const weeks = Math.trunc(value.weeks ?? 0);
    const days = Math.trunc(value.days ?? 0);
    const hours = Math.trunc(value.hours ?? 0) + days * 24 + weeks * 24 * 7;
    const minutes = Math.trunc(value.minutes ?? 0);
    const seconds = Math.trunc(value.seconds ?? 0);

    const subsecondNanos =
      Math.trunc(value.milliseconds ?? 0) * 1_000_000 +
      Math.trunc(value.microseconds ?? 0) * 1_000 +
      Math.trunc(value.nanoseconds ?? 0);

    if (subsecondNanos <= 0) {
      return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
    }

    const fraction = String(subsecondNanos).padStart(9, '0').replace(/0+$/, '');

    return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}.${fraction}`;
  }

  return durationLabeled(value);
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Creates a formatter bound to a locale. Pass a string for a static locale,
 * a getter function (() => string), or an object with a `locale` property
 * (e.g. an `I18n` instance) for reactive binding.
 */
export function createFormatter(source: string | (() => string) | { readonly locale: string }): Formatter {
  const numberCache = new Map<string, Intl.NumberFormat>();
  const dateCache = new Map<string, Intl.DateTimeFormat>();
  const relativeCache = new Map<string, Intl.RelativeTimeFormat>();
  const listCache = new Map<string, Intl.ListFormat>();
  const durationCache = new Map<string, { format(value: DurationValue): string }>();

  const getLocale =
    typeof source === 'string' ? () => source : typeof source === 'function' ? source : () => source.locale;

  return {
    currency(value, currency, options) {
      const locale = getLocale();
      const opts: Intl.NumberFormatOptions = { ...options, currency, style: 'currency' };

      return getOrCreate(numberCache, cacheKey(locale, opts), () => new Intl.NumberFormat(locale, opts)).format(value);
    },

    date(value, options) {
      const locale = getLocale();
      const date = typeof value === 'number' ? new Date(value) : value;

      return getOrCreate(dateCache, cacheKey(locale, options), () => new Intl.DateTimeFormat(locale, options)).format(
        date,
      );
    },

    duration(value, options) {
      const locale = getLocale();
      const IntlExt = Intl as typeof Intl & { DurationFormat?: DurationFormatterCtor };

      if (!IntlExt.DurationFormat) return durationFallback(value, options);

      return getOrCreate(
        durationCache,
        cacheKey(locale, options),
        () => new IntlExt.DurationFormat!(locale, options),
      ).format(value);
    },

    list(value, options) {
      const locale = getLocale();
      const items = value.map(String);

      if (items.length === 0) return '';

      const style = options?.style ?? 'long';
      const type = options?.type === 'or' ? 'disjunction' : 'conjunction';

      return getOrCreate(
        listCache,
        `${locale}:${type}:${style}`,
        () => new Intl.ListFormat(locale, { style, type }),
      ).format(items);
    },

    number(value, options) {
      const locale = getLocale();

      return getOrCreate(numberCache, cacheKey(locale, options), () => new Intl.NumberFormat(locale, options)).format(
        value,
      );
    },

    relative(value, unit, options) {
      const locale = getLocale();

      return getOrCreate(
        relativeCache,
        cacheKey(locale, options),
        () => new Intl.RelativeTimeFormat(locale, options),
      ).format(value, unit);
    },
  };
}
