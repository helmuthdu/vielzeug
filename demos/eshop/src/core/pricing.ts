import { add, max, money, multiply, subtract, sum, toDecimal, type Money } from '@vielzeug/coins';

import type { Configuration, Model, PriceBreakdown } from './types';

/** Flat demo sales-tax rate applied to every subtotal — real apps would look this up per region. */
const TAX_RATE = 0.08;

/**
 * `@vielzeug/coins`' `sum()` throws "sum requires at least one Money value" on an empty array —
 * correct for a library that can't infer a currency from nothing, but every call site below sums
 * a list that's legitimately empty in normal use (no optional packages selected yet, an empty
 * cart). Centralizing the empty-array fallback here instead of repeating the length check at
 * every call site.
 */
function sumOrZero(values: Money[]): Money {
  return values.length > 0 ? sum(values) : money('0.00', 'USD');
}

export interface ResolvedConfiguration {
  color: Model['colors'][number];
  extraPackages: Model['packages'];
  trim: Model['trims'][number];
  wheel: Model['wheels'][number];
}

/** Resolves a `Configuration`'s ids against a `Model`'s option catalog. Throws on an unknown id — a
 * configuration referencing an option the model doesn't have is a bug, not a recoverable state. */
export function resolveConfiguration(model: Model, configuration: Configuration): ResolvedConfiguration {
  const trim = model.trims.find((t) => t.id === configuration.trimId);
  const color = model.colors.find((c) => c.id === configuration.colorId);
  const wheel = model.wheels.find((w) => w.id === configuration.wheelId);

  if (!trim || !color || !wheel) {
    throw new Error(`Configuration references an unknown option for model "${model.id}".`);
  }

  // Packages bundled by the trim are already reflected in its own priceDelta — only packages the
  // shopper picked *beyond* that bundle are billed separately.
  const extraPackages = configuration.packageIds
    .filter((id) => !trim.includedPackageIds.includes(id))
    .map((id) => model.packages.find((p) => p.id === id))
    .filter((p): p is Model['packages'][number] => Boolean(p));

  return { color, extraPackages, trim, wheel };
}

export function computePriceBreakdown(model: Model, configuration: Configuration): PriceBreakdown {
  const { color, extraPackages, trim, wheel } = resolveConfiguration(model, configuration);

  const base = money(model.basePrice, 'USD');
  const trimAmount = money(trim.priceDelta, 'USD');
  const colorAmount = money(color.priceDelta, 'USD');
  const wheelsAmount = money(wheel.priceDelta, 'USD');
  const packagesAmount = sumOrZero(extraPackages.map((p) => money(p.priceDelta, 'USD')));

  const subtotal = sum([base, trimAmount, colorAmount, wheelsAmount, packagesAmount]);
  const tax = multiply(subtotal, TAX_RATE);
  const total = add(subtotal, tax);

  return {
    base: toDecimal(base),
    color: toDecimal(colorAmount),
    packages: toDecimal(packagesAmount),
    subtotal: toDecimal(subtotal),
    tax: toDecimal(tax),
    total: toDecimal(total),
    trim: toDecimal(trimAmount),
    wheels: toDecimal(wheelsAmount),
  };
}

/** Scales every field of a breakdown by a cart line's quantity. */
export function scaleBreakdown(breakdown: PriceBreakdown, quantity: number): PriceBreakdown {
  const scale = (key: keyof PriceBreakdown): string => toDecimal(multiply(money(breakdown[key], 'USD'), quantity));

  return {
    base: scale('base'),
    color: scale('color'),
    packages: scale('packages'),
    subtotal: scale('subtotal'),
    tax: scale('tax'),
    total: scale('total'),
    trim: scale('trim'),
    wheels: scale('wheels'),
  };
}

/** Sums a list of already-computed breakdowns (e.g. every cart line) into one grand total. */
export function combineBreakdowns(breakdowns: PriceBreakdown[]): PriceBreakdown {
  const pick = (key: keyof PriceBreakdown): Money => sumOrZero(breakdowns.map((b) => money(b[key], 'USD')));

  return {
    base: toDecimal(pick('base')),
    color: toDecimal(pick('color')),
    packages: toDecimal(pick('packages')),
    subtotal: toDecimal(pick('subtotal')),
    tax: toDecimal(pick('tax')),
    total: toDecimal(pick('total')),
    trim: toDecimal(pick('trim')),
    wheels: toDecimal(pick('wheels')),
  };
}

/** Subtracts a self-reported trade-in estimate from a grand total, floored at zero — a trade-in
 * worth more than the purchase doesn't produce a negative order total in this demo (no cash-back
 * flow exists). Kept out of `PriceBreakdown` itself: trade-in credit applies once to the checkout
 * grand total, not per configuration line, so it's an order-level adjustment shown as its own
 * line (see `checkout.ts`'s review/confirmation steps) rather than a `PriceBreakdown` field. */
export function applyTradeInCredit(totalUsd: string, estimatedValueUsd: string): string {
  const remaining = subtract(money(totalUsd, 'USD'), money(estimatedValueUsd, 'USD'));

  return toDecimal(max([remaining, money('0.00', 'USD')]));
}

/**
 * Estimated monthly payment for the PDP's finance calculator — amortized loan formula on plain
 * floats, not `@vielzeug/coins`. Unlike `computePriceBreakdown()` (an exact ledger figure a
 * shopper is actually charged), this is a "starting at $X/mo*" estimate shown next to an explicit
 * disclaimer (`model.finance.disclaimer`), the same precision real OEM configurators use for this
 * figure — exact decimal arithmetic here would be false precision, not more correctness.
 */
export function estimateMonthlyPayment(
  totalUsd: string,
  downPaymentUsd: string,
  aprPercent: number,
  termMonths: number,
): string {
  const principal = Math.max(0, Number.parseFloat(totalUsd) - Number.parseFloat(downPaymentUsd));
  const monthlyRate = aprPercent / 100 / 12;

  if (monthlyRate === 0) return (principal / termMonths).toFixed(2);

  const payment = (principal * monthlyRate) / (1 - (1 + monthlyRate) ** -termMonths);

  return payment.toFixed(2);
}
