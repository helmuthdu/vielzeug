import type { Currency, Money, MoneyJSON } from './types';

import { resolveBuiltinCurrency } from './currency';
import { CoinsError } from './errors';
import { money } from './money';

const INTEGER = /^(?:0|-[1-9]\d*|[1-9]\d*)$/;
const KEYS = ['amount', 'currency', 'unit'] as const;

export function toJSON(value: Money): MoneyJSON {
  return { amount: value.amount.toString(), currency: value.currency.code, unit: 'minor' };
}

export function parseMoneyJSON(value: unknown, options: { currency?: (code: string) => Currency } = {}): Money {
  try {
    const payload = readPayload(value);
    const resolveCurrency = options.currency ?? resolveBuiltinCurrency;

    return money(BigInt(payload.amount), resolveCurrency(payload.currency), { unit: 'minor' });
  } catch (error) {
    throw new CoinsError('INVALID_MONEY', 'Invalid Money JSON', { cause: error });
  }
}

function readPayload(value: unknown): MoneyJSON {
  if (typeof value !== 'object' || value === null || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new TypeError('Money JSON must be a plain object');
  }

  const descriptors = Object.getOwnPropertyDescriptors(value);
  const ownKeys = Reflect.ownKeys(value);

  if (ownKeys.length !== KEYS.length || !KEYS.every((key) => ownKeys.includes(key))) {
    throw new TypeError('Money JSON must contain only amount, currency, and unit');
  }

  for (const key of KEYS) {
    const descriptor = descriptors[key];

    if (!descriptor || !('value' in descriptor) || descriptor.get || descriptor.set) {
      throw new TypeError(`Money JSON property "${key}" must be a data value`);
    }
  }

  const amount = descriptors.amount!.value;
  const currency = descriptors.currency!.value;
  const unit = descriptors.unit!.value;

  if (typeof amount !== 'string' || !INTEGER.test(amount))
    throw new TypeError('Money JSON amount must be a canonical integer string');

  if (typeof currency !== 'string' || unit !== 'minor') throw new TypeError('Money JSON currency/unit are invalid');

  return { amount, currency, unit };
}
