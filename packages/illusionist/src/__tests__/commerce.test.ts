import { department, price, productAdjective, productDescription, productName } from '../commerce/commerce';
import { en } from '../locales/en';
import { createSeed } from '../seed/create-seed';
import type { IllusionistContext, IllusionistLocale } from '../types';

function ctx(seed = 12345, locale: IllusionistLocale = en): IllusionistContext {
  return { locale, source: createSeed(seed) };
}

describe('commerce', () => {
  it('productAdjective is non-empty', () => {
    const value = productAdjective(ctx());

    expect(value.length).toBeGreaterThan(0);
  });

  it('productName contains at least 2 spaces', () => {
    const value = productName(ctx());
    const spaces = (value.match(/ /g) ?? []).length;

    expect(spaces).toBeGreaterThanOrEqual(2);
  });

  it('department is non-empty', () => {
    const value = department(ctx());

    expect(value.length).toBeGreaterThan(0);
  });

  it('price() returns a Money object with amount (bigint) and currency code "USD"', () => {
    const result = price(ctx());

    expect(typeof result.amount).toBe('bigint');
    expect(result.currency.code).toBe('USD');
  });

  it('price({ currency: "EUR" }) returns EUR currency', () => {
    const result = price(ctx(), { currency: 'EUR' });

    expect(result.currency.code).toBe('EUR');
  });

  it('productDescription is non-empty', () => {
    const value = productDescription(ctx());

    expect(value.length).toBeGreaterThan(0);
  });
});
