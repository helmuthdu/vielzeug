import { add, type Money, money, multiply, subtract, sum, toDecimal, USD } from '@vielzeug/coins';

import type { Configuration, Model, PriceBreakdown } from './types';

const TAX_RATE = '0.08';

function usd(value: string): Money<typeof USD> {
  return money(value, USD);
}

export interface ResolvedConfiguration {
  color: Model['colors'][number];
  extraPackages: Model['packages'];
  trim: Model['trims'][number];
  wheel: Model['wheels'][number];
}

export function resolveConfiguration(model: Model, configuration: Configuration): ResolvedConfiguration {
  const trim = model.trims.find((item) => item.id === configuration.trimId);
  const color = model.colors.find((item) => item.id === configuration.colorId);
  const wheel = model.wheels.find((item) => item.id === configuration.wheelId);

  if (!trim || !color || !wheel) throw new Error(`Configuration references an unknown option for model "${model.id}".`);

  const extraPackages = configuration.packageIds
    .filter((id) => !trim.includedPackageIds.includes(id))
    .map((id) => model.packages.find((item) => item.id === id))
    .filter((item): item is Model['packages'][number] => Boolean(item));

  return { color, extraPackages, trim, wheel };
}

export function computePriceBreakdown(model: Model, configuration: Configuration): PriceBreakdown {
  const { color, extraPackages, trim, wheel } = resolveConfiguration(model, configuration);
  const base = usd(model.basePrice);
  const trimAmount = usd(trim.priceDelta);
  const colorAmount = usd(color.priceDelta);
  const wheelsAmount = usd(wheel.priceDelta);
  const packagesAmount = sum(extraPackages.map((item) => usd(item.priceDelta)));
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

export function scaleBreakdown(breakdown: PriceBreakdown, quantity: number): PriceBreakdown {
  const factor = String(quantity);
  const scale = (key: keyof PriceBreakdown): string => toDecimal(multiply(usd(breakdown[key]), factor));

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

export function combineBreakdowns(breakdowns: PriceBreakdown[]): PriceBreakdown {
  const pick = (key: keyof PriceBreakdown): Money<typeof USD> => sum(breakdowns.map((item) => usd(item[key])));

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

export function applyTradeInCredit(totalUsd: string, estimatedValueUsd: string): string {
  const remaining = subtract(usd(totalUsd), usd(estimatedValueUsd));

  return toDecimal(remaining.amount < 0n ? money('0', USD) : remaining);
}

export function estimateMonthlyPayment(
  totalUsd: string,
  downPaymentUsd: string,
  aprPercent: number,
  termMonths: number,
): string {
  const principal = Math.max(0, Number.parseFloat(totalUsd) - Number.parseFloat(downPaymentUsd));
  const monthlyRate = aprPercent / 100 / 12;

  if (monthlyRate === 0) return (principal / termMonths).toFixed(2);

  return ((principal * monthlyRate) / (1 - (1 + monthlyRate) ** -termMonths)).toFixed(2);
}
