import { BIOME_EXPANSION, TRIAL_SERIES, trialSeriesById } from '../content';
import type { ExpansionId, GameMode } from './types';

/**
 * The boxes a mode cannot be played without, derived from the content it actually needs :
 * never a hand-maintained list. The Ascent is the Mount Havoc climb, so it needs that box;
 * a Winds series rolls its biomes on the die maps, so it needs the biome board behind every
 * face it can land on. Campaigns and standalone expeditions carry their own per-scenario
 * requirements (`requiredExpansionIds`), so they need nothing here.
 */
export function requiredExpansionsFor(mode: GameMode, seriesId?: string): ExpansionId[] {
  switch (mode) {
    case 'ascent':
      return ['mount-havoc'];
    case 'challenge':
      return seriesBiomeExpansions(seriesId);
    default:
      return [];
  }
}

/**
 * The biome boards a series needs. With a series id, only the boards its die faces can roll;
 * without one, the union across every series: the shelf test for "can any Winds series be
 * started". Deriving from the printed die maps keeps this correct when a future series rolls
 * fewer biomes.
 */
function seriesBiomeExpansions(seriesId: string | undefined): ExpansionId[] {
  const series = seriesId ? [trialSeriesById(seriesId)] : TRIAL_SERIES;
  const biomes = new Set(
    series.flatMap((entry) => (entry ? entry.monsters.flatMap((monster) => monster.setups.map((s) => s.biome)) : [])),
  );
  return [...new Set([...biomes].map((biome) => BIOME_EXPANSION[biome]))];
}

/** The required boxes the shelf does not already own, in required order. */
export function missingExpansionIds(required: readonly ExpansionId[], owned: readonly ExpansionId[]): ExpansionId[] {
  return required.filter((id) => !owned.includes(id));
}
