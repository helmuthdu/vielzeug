import type { DurationFormatOptions, DurationValue, FormatInput, Locale } from './types';

/* -------------------- Cache Container -------------------- */

/** Holds all Intl formatter caches for one I18n instance — GC'd with the instance. */
export type IntlCaches = {
  dateFormat: Map<string, Intl.DateTimeFormat>;
  durationFormat: Map<string, { format(value: DurationValue): string }>;
  listFormat: Map<string, Intl.ListFormat>;
  numberFormat: Map<string, Intl.NumberFormat>;
  pluralRules: Map<string, Intl.PluralRules>;
  relativeTimeFormat: Map<string, Intl.RelativeTimeFormat>;
};

export function makeIntlCaches(): IntlCaches {
  return {
    dateFormat: new Map(),
    durationFormat: new Map(),
    listFormat: new Map(),
    numberFormat: new Map(),
    pluralRules: new Map(),
    relativeTimeFormat: new Map(),
  };
}

const durationUnits: Array<keyof DurationValue> = [
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

function formatDurationFallback(value: DurationValue): string {
  const parts = durationUnits
    .map((unit) => {
      const amount = value[unit];

      return typeof amount === 'number' ? `${amount}${unit[0]}` : undefined;
    })
    .filter((item): item is string => item !== undefined);

  return parts.join(' ');
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

    if (input.kind === 'list') {
      const items = input.value.map(String);

      if (items.length === 0) return '';

      const type = input.options?.type === 'or' ? 'disjunction' : 'conjunction';
      const style = input.options?.style ?? 'long';

      return intlFmt(
        caches.listFormat,
        `${locale}:${type}:${style}`,
        () => new Intl.ListFormat(locale, { style, type }),
      ).format(items);
    }

    const IntlCtor = Intl as unknown as {
      DurationFormat?: new (
        locale: string,
        options?: DurationFormatOptions,
      ) => {
        format(value: DurationValue): string;
      };
    };

    if (!IntlCtor.DurationFormat) return formatDurationFallback(input.value);

    const key = intlKey(locale, input.options);

    return intlFmt(caches.durationFormat, key, () => new IntlCtor.DurationFormat!(locale, input.options)).format(
      input.value,
    );
  } catch {
    if (input.kind === 'date') {
      return typeof input.value === 'number' ? new Date(input.value).toString() : input.value.toString();
    }

    if (input.kind === 'list') return input.value.map(String).join(', ');

    if (input.kind === 'duration') return formatDurationFallback(input.value);

    return String(input.value);
  }
}

/* -------------------- Plural Selection -------------------- */

export function selectPluralForm(caches: IntlCaches, locale: Locale, count: number, ordinal = false): string {
  const n = Math.floor(Math.abs(count));
  const key = `${locale}:${ordinal ? 'ordinal' : 'cardinal'}`;

  try {
    return intlFmt(
      caches.pluralRules,
      key,
      () => new Intl.PluralRules(locale, { type: ordinal ? 'ordinal' : 'cardinal' }),
    ).select(n);
  } catch {
    return n === 1 ? 'one' : 'other';
  }
}
