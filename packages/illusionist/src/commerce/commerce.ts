import { type Currency, EUR, GBP, type Money, money, USD } from '@vielzeug/coins';

import { floatFixed } from '../_helpers/float';
import { int } from '../_helpers/int';
import { pick } from '../_helpers/string';
import type { IllusionistContext } from '../types';
import { COMMERCE_DATA } from './data';

const CURRENCIES: Record<'USD' | 'EUR' | 'GBP', Currency> = { EUR, GBP, USD };

export type PriceOptions = {
  readonly min?: number;
  readonly max?: number;
  readonly currency?: 'USD' | 'EUR' | 'GBP';
};

export function productAdjective(ctx: IllusionistContext): string {
  return pick(COMMERCE_DATA.productAdjectives, ctx.source)!;
}

export function productMaterial(ctx: IllusionistContext): string {
  return pick(COMMERCE_DATA.productMaterials, ctx.source)!;
}

export function productNoun(ctx: IllusionistContext): string {
  return pick(COMMERCE_DATA.productNouns, ctx.source)!;
}

export function productName(ctx: IllusionistContext): string {
  return `${productAdjective(ctx)} ${productMaterial(ctx)} ${productNoun(ctx)}`;
}

export function department(ctx: IllusionistContext): string {
  return pick(COMMERCE_DATA.departments, ctx.source)!;
}

export function price(ctx: IllusionistContext, opts: PriceOptions = {}): Money {
  const min = opts.min ?? 0.01;
  const max = opts.max ?? 1000;
  const code = opts.currency ?? 'USD';
  const amount = floatFixed(min, max, 2, ctx.source);

  return money(amount.toFixed(2), CURRENCIES[code]);
}

export function productDescription(ctx: IllusionistContext): string {
  const sentences = int(1, 2, ctx.source);
  const parts: string[] = [];

  for (let i = 0; i < sentences; i++) {
    const adjective = pick(COMMERCE_DATA.productAdjectives, ctx.source)!;
    const material = pick(COMMERCE_DATA.productMaterials, ctx.source)!;
    const noun = pick(COMMERCE_DATA.productNouns, ctx.source)!;
    const department = pick(COMMERCE_DATA.departments, ctx.source)!;

    parts.push(
      `The ${adjective.toLowerCase()} ${material.toLowerCase()} ${noun.toLowerCase()} is a great choice for your ${department.toLowerCase()} needs.`,
    );
  }

  return parts.join(' ');
}
