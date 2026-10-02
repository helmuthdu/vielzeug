import { describe, expect, it } from 'vitest';
import { BIOME_EXPANSION, TRIAL_SERIES } from '../content';
import { missingExpansionIds, requiredExpansionsFor } from './prerequisites';

describe('requiredExpansionsFor', () => {
  it('the ascent needs only Mount Havoc', () => {
    expect(requiredExpansionsFor('ascent')).toEqual(['mount-havoc']);
  });

  it('campaigns and expeditions need nothing beyond their own scenarios', () => {
    expect(requiredExpansionsFor('campaign')).toEqual([]);
    expect(requiredExpansionsFor('expedition')).toEqual([]);
  });

  it('a Winds series needs the biome board behind every die face it rolls', () => {
    for (const series of TRIAL_SERIES) {
      const biomes = new Set(series.monsters.flatMap((monster) => monster.setups.map((setup) => setup.biome)));
      const expected = [...new Set([...biomes].map((biome) => BIOME_EXPANSION[biome]))].sort();
      expect([...requiredExpansionsFor('challenge', series.id)].sort(), series.id).toEqual(expected);
    }
  });

  it('without a series, the Winds shelf needs the union of every series board', () => {
    const union = new Set(TRIAL_SERIES.flatMap((series) => requiredExpansionsFor('challenge', series.id)));
    expect([...requiredExpansionsFor('challenge')].sort()).toEqual([...union].sort());
  });
});

describe('missingExpansionIds', () => {
  it('lists the required boxes the shelf does not own, in required order', () => {
    expect(missingExpansionIds(['mount-havoc'], ['core', 'mount-havoc'])).toEqual([]);
    expect(missingExpansionIds(['mount-havoc'], ['core'])).toEqual(['mount-havoc']);
    const required = ['ice', 'feather', 'venom'] as const;
    expect(missingExpansionIds(required, ['feather'])).toEqual(['ice', 'venom']);
  });
});
