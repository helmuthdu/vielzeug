import { beforeEach, describe, expect, it } from 'vitest';
import { cartItems, savedModelIds } from './cart-store';
import { addToCart, toggleSavedModel } from './history';
import { models } from './seed-data';

describe('cart availability', () => {
  beforeEach(() => {
    cartItems.value = [];
  });

  it('rejects coming-soon vehicles', () => {
    const model = models.find((candidate) => candidate.availability === 'coming-soon')!;
    const result = addToCart({
      colorId: model.colors[0].id,
      modelId: model.id,
      packageIds: [],
      trimId: model.trims[0].id,
      wheelId: model.wheels[0].id,
    });

    expect(result).toBeNull();
    expect(cartItems.value).toEqual([]);
  });
});

describe('saved vehicles', () => {
  beforeEach(() => {
    savedModelIds.value = [];
  });

  it('toggles a model without duplicating it', () => {
    toggleSavedModel('a200');
    toggleSavedModel('a200');

    expect(savedModelIds.value).toEqual([]);
  });

  it('preserves other saved models', () => {
    savedModelIds.value = ['r350'];

    toggleSavedModel('a200');

    expect(savedModelIds.value).toEqual(['r350', 'a200']);
  });
});
