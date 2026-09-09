import { assertMoney } from './money';
import type { Money, MoneyJSON } from './types';

export function toJSON(value: Money): MoneyJSON {
  assertMoney(value);

  return { amount: value.amount.toString(), currency: value.currency.code, unit: 'minor' };
}
