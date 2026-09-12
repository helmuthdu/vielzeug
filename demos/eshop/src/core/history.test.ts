import { beforeEach, describe, expect, it } from 'vitest';
import { savedModelIds } from './cart-store';
import { toggleSavedModel } from './history';

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
