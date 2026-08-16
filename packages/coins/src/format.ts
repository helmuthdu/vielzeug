import { roundDivision } from './decimal';
import { CoinsError } from './errors';
import { isMoney } from './money';
import type { FormatOptions, Money, MoneyFormatPart, RoundingMode } from './types';

const MAX_FRACTION_DIGITS = 20;
const defaultFormatRounding: RoundingMode = 'halfAwayFromZero';
const integerFormatters = new Map<string, Intl.NumberFormat>();
const templates = new Map<string, Intl.NumberFormatPart[]>();

export function format(value: Money, options: FormatOptions = {}): string {
  return formatParts(value, options)
    .map((part) => part.value)
    .join('');
}

export function formatParts(value: Money, options: FormatOptions = {}): MoneyFormatPart[] {
  if (!isMoney(value)) throw new CoinsError('INVALID_MONEY', 'format() requires canonical money');

  const {
    locale = 'en-US',
    maximumFractionDigits = value.currency.minorUnit,
    minimumFractionDigits = value.currency.minorUnit,
    rounding = defaultFormatRounding,
    style = 'symbol',
  } = options;

  validateFractionDigits(minimumFractionDigits, maximumFractionDigits);

  const targetScale = 10n ** BigInt(maximumFractionDigits);
  const scaled =
    maximumFractionDigits >= value.currency.minorUnit
      ? value.amount * 10n ** BigInt(maximumFractionDigits - value.currency.minorUnit)
      : roundDivision(value.amount, 10n ** BigInt(value.currency.minorUnit - maximumFractionDigits), rounding);
  const negative = scaled < 0n;
  const absolute = negative ? -scaled : scaled;
  const integer = absolute / targetScale;
  const rawFraction =
    maximumFractionDigits === 0 ? '' : (absolute % targetScale).toString().padStart(maximumFractionDigits, '0');
  const fraction = rawFraction.replace(
    new RegExp(`0{0,${Math.max(0, maximumFractionDigits - minimumFractionDigits)}}$`),
    '',
  );
  const template = getTemplate(locale, value.currency.code, style, negative);
  const parts: MoneyFormatPart[] = [];
  let insertedInteger = false;

  for (const part of template) {
    if (part.type === 'group') continue;

    if (part.type === 'integer') {
      if (!insertedInteger) {
        parts.push({ type: 'integer', value: getIntegerFormatter(locale).format(integer) });
        insertedInteger = true;
      }
    } else if (part.type === 'decimal') {
      if (fraction) parts.push({ type: 'decimal', value: part.value });
    } else if (part.type === 'fraction') {
      if (fraction) parts.push({ type: 'fraction', value: fraction });
    } else if (part.type === 'currency' || part.type === 'minusSign' || part.type === 'plusSign') {
      parts.push({ type: part.type, value: part.value });
    } else {
      parts.push({ type: 'literal', value: part.value });
    }
  }

  return parts;
}

function validateFractionDigits(minimum: number, maximum: number): void {
  if (
    !Number.isInteger(maximum) ||
    !Number.isInteger(minimum) ||
    minimum < 0 ||
    maximum < minimum ||
    maximum > MAX_FRACTION_DIGITS
  ) {
    throw new CoinsError(
      'FORMAT_ERROR',
      `Fraction digits must be integers satisfying 0 ≤ minimum ≤ maximum ≤ ${MAX_FRACTION_DIGITS}`,
    );
  }
}

function getTemplate(
  locale: string,
  currency: string,
  style: NonNullable<FormatOptions['style']>,
  negative: boolean,
): Intl.NumberFormatPart[] {
  const key = `${locale}\0${currency}\0${style}\0${negative}`;
  const cached = templates.get(key);

  if (cached) return cached;

  try {
    const template = new Intl.NumberFormat(locale, {
      currency,
      currencyDisplay: style,
      maximumFractionDigits: 1,
      minimumFractionDigits: 1,
      style: 'currency',
    }).formatToParts(negative ? -1.1 : 1.1);

    templates.set(key, template);

    return template;
  } catch (error) {
    throw new CoinsError('FORMAT_ERROR', `Cannot format currency "${currency}" for locale "${locale}"`, {
      cause: error,
    });
  }
}

function getIntegerFormatter(locale: string): Intl.NumberFormat {
  const cached = integerFormatters.get(locale);

  if (cached) return cached;

  try {
    const formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 0, useGrouping: true });

    integerFormatters.set(locale, formatter);

    return formatter;
  } catch (error) {
    throw new CoinsError('FORMAT_ERROR', `Cannot create number formatter for locale "${locale}"`, { cause: error });
  }
}
