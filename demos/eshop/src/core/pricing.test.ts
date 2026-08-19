import { describe, expect, it } from 'vitest';
import { combineBreakdowns, computePriceBreakdown } from './pricing';
import { models } from './seed-data';

const x300 = models.find((model) => model.id === 'x300')!;
const baseConfiguration = {
  colorId: x300.colors[0].id,
  modelId: x300.id,
  packageIds: [],
  trimId: x300.trims[0].id,
  wheelId: x300.wheels[0].id,
};

describe('pricing', () => {
  it('prices a base configuration with no optional packages', () => {
    const breakdown = computePriceBreakdown(x300, baseConfiguration);

    expect(breakdown).toMatchObject({
      base: '52900.00',
      color: x300.colors[0].priceDelta,
      packages: '0.00',
      trim: '0.00',
      wheels: '0.00',
    });
    expect(Number(breakdown.total)).toBeGreaterThan(Number(breakdown.base));
  });

  it('does not charge duplicate package IDs twice', () => {
    const packageId = x300.packages[0].id;
    const single = computePriceBreakdown(x300, { ...baseConfiguration, packageIds: [packageId] });
    const duplicate = computePriceBreakdown(x300, { ...baseConfiguration, packageIds: [packageId, packageId] });

    expect(duplicate.packages).toBe(single.packages);
    expect(duplicate.total).toBe(single.total);
  });

  it('returns a zero-valued USD breakdown for an empty cart', () => {
    expect(combineBreakdowns([])).toEqual({
      base: '0.00',
      color: '0.00',
      packages: '0.00',
      subtotal: '0.00',
      tax: '0.00',
      total: '0.00',
      trim: '0.00',
      wheels: '0.00',
    });
  });
});
