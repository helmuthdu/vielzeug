import type {
  AggressionLevel,
  ElementId,
  ExpansionId,
  ExpeditionScenario,
  SpecialRule,
  TerrainPlacement,
  TrialBiomeId,
} from '../domain/types';
import trialData from './data/trials.json';
import { aggregateTerrain, type ExpeditionSector, type TerrainId } from './expeditions';
import { monsterById } from './monsters';
import { terrainById } from './terrain';

/**
 * Primal Challenges content.
 *
 * Two shapes ship in the files:
 * - hunts (#1–#10): a single fight against a fixed monster under trial special rules,
 *   scored against a ranking ladder.
 * - series (#11–#12, "Winds of …"): a five-expedition mini-campaign: die-rolled biome
 *   setups per monster, each face printing the terrain its board starts with, a reward
 *   phase between expeditions and a bounty phase that pushes the trial's aggression
 *   level up.
 *
 * The terrain ids on components and series setups reference the same tokens the
 * expeditions use; biome labels reference the biome expansion boxes.
 */

/** Biome labels as printed on the die maps, mapped to the box that ships the board. */
export const BIOME_EXPANSION: Record<TrialBiomeId, ExpansionId> = {
  'crystal-caves': 'biome-crystal-caves-flooded-wilds',
  'endless-swamp': 'biome-endless-swamp-nightmare',
  'flooded-wilds': 'biome-crystal-caves-flooded-wilds',
  'frozen-wastes': 'biome-woltyar-frozen-wastes',
  goldarks: 'biome-goldarks-thunder-mountains',
  /** The Nightmare board ships in the Endless Swamp & Nightmare biome box. */
  nightmare: 'biome-endless-swamp-nightmare',
  'niz-maraga': 'biome-niz-maraga-sunset-plains',
  'sunset-plains': 'biome-niz-maraga-sunset-plains',
  'thunder-mountains': 'biome-goldarks-thunder-mountains',
  woltyar: 'biome-woltyar-frozen-wastes',
};

const BIOME_ARTWORK: Record<TrialBiomeId, string> = {
  'crystal-caves': '/backgrounds/bg_bioma_crystal_cave.webp',
  'endless-swamp': '/backgrounds/bg_bioma_endless_swamp.webp',
  'flooded-wilds': '/backgrounds/bg_bioma_flooded_wilds.webp',
  'frozen-wastes': '/backgrounds/bg_bioma_frozen_wastes.webp',
  goldarks: '/backgrounds/bg_bioma_goldarks.webp',
  nightmare: '/backgrounds/bg_bioma_nightmare.webp',
  'niz-maraga': '/backgrounds/bg_bioma_niz_maraga.webp',
  'sunset-plains': '/backgrounds/bg_bioma_sunset_plains.webp',
  'thunder-mountains': '/backgrounds/bg_bioma_thundner_mountains.webp',
  woltyar: '/backgrounds/bg_bioma_woltyar.webp',
};

export interface TrialScoreModifier {
  /** Printed condition text, e.g. "each wound you dealt to Kharja". */
  condition: string;
  /**
   * How the row is answered: `count` tallies how often the condition applied ("each …");
   * `flag` is a single yes/no condition ("if you…"). Drives the worksheet's control.
   */
  kind: 'count' | 'flag';
  /** The count's printed cap, where the tracker has one: the climb's wounds stop at three. */
  max?: number;
  /** Points added when the condition holds; negative for penalties. */
  points: number;
  /** Victory-gated modifiers only apply when the hunt was won. */
  scope: 'always' | 'victory';
}

export interface TrialScoring {
  /** Points the calculation starts from. */
  base: number;
  /** Printed score modifiers, applied to the base. */
  modifiers: TrialScoreModifier[];
  /** Whether the score is calculated even in defeat (cards printing "Even in case of defeat…"). */
  scoredOnDefeat: boolean;
}

export interface TrialRanking {
  /** The catch-all's printed ceiling: any value lower than this lands in the tier. */
  maxScore?: number;
  /** Minimum total score for the tier; `null` is the catch-all bottom tier (Rookie). */
  minScore: number | null;
  name: string;
  /** The level's printed flavor line; the ranking grid renders it when present. */
  text?: string;
}

/** One hunter rank level: the printed flavor line shared by every trial table that names it. */
export interface TrialRankLevel {
  /** The level's name, as the ranking tables print it. */
  name: string;
  /** The level's printed flavor line. */
  text: string;
}

/** The hunter rank levels every trial table prints its tiers from, coldest first. A level's
 *  place on this ladder is its shade of a ranking's rising heat, so every table that names
 *  the level — the full Nightmare table or a series' subset — colors it the same. */
export const TRIAL_RANK_LEVELS: readonly TrialRankLevel[] = [
  { name: 'Rookie', text: 'Survived the hunt through basic tactics.' },
  { name: 'Expert', text: 'Mastered card chains and tactical positioning.' },
  { name: 'Prime Hunter', text: 'Demonstrated flawless execution against apex beasts.' },
  { name: 'Commander', text: 'Led the hunting party with strategic dominance.' },
  { name: 'Beast Master', text: 'Predicted and countered complex monster behaviors.' },
  { name: 'Dragon Slayer', text: 'Vanquished colossal threats with minimal losses.' },
  { name: 'Indomitable', text: 'Unbroken resilience through brutal campaign pressure.' },
  { name: 'Primal Beast', text: 'Embodied raw instinct and supreme combat mastery.' },
  { name: 'Nightmare', text: 'Pinnacle campaign score. A legendary feat accomplished.' },
];

/** The named level, if the rank ladder prints it. */
export const trialRankLevel = (name: string): TrialRankLevel | undefined =>
  TRIAL_RANK_LEVELS.find((level) => level.name === name);

/** The level's heat on the shared scale: 0% at Rookie, 100% at Nightmare. */
export const trialRankHeat = (name: string): number | undefined => {
  const index = TRIAL_RANK_LEVELS.findIndex((level) => level.name === name);
  return index === -1 ? undefined : (index / (TRIAL_RANK_LEVELS.length - 1)) * 100;
};

export interface TrialComponent {
  /** Copies to place; `null` for uncounted stacks of cards. */
  count: number | null;
  /** Component label as printed on the card. */
  label: string;
  /** Terrain token id when the component is a terrain piece. */
  terrainId: TerrainId | null;
}

/** Special tokens the trial cards place on the board that are not terrain: named markers
 * like the Damage token or Hydar's Thornvines, printed at board positions like any terrain. */
export type TrialTokenId = 'damage-token' | 'fire-back' | 'thornvine-token';

export const TRIAL_TOKEN_LABELS: Record<TrialTokenId, string> = {
  'damage-token': 'Damage token',
  'fire-back': 'Fire token (back)',
  'thornvine-token': 'Thornvine token',
};

/** Terrain tokens placed on the combat board, as printed on the card's setup diagram. */
export interface TrialTerrainPlacement {
  /** Null = in play without a fixed sector: hidden from the battlefield map, listed with the tokens. */
  sector: ExpeditionSector | null;
  /** A terrain token from the catalog, or one of the cards' special board tokens. */
  terrainId: TerrainId | TrialTokenId;
}

/** A single-fight trial (#1–#10). */
export interface TrialHunt {
  /** Aggression level the fight is played at. */
  aggression: AggressionLevel;
  /** Extra text printed under AGGRESSION LEVEL beyond the fixed level. */
  aggressionNote: string | null;
  components: TrialComponent[];
  /** Elements whose equipment cannot be used (e.g. Ice in #4/#9/#10). */
  forbiddenElementIds: ElementId[];
  id: string;
  lore: string;
  /** Potion slots the party may fill (#9 caps at two); `null` is the standard three. */
  maxPotionSlots: number | null;
  monsterId: string;
  name: string;
  /** Whether players may add the Nightmare variant, which changes the score. */
  nightmareVariant: 'none' | 'optional';
  number: number;
  /** The hunt's printed ranking table: the score sheet's compact ladder. */
  rankings: TrialRanking[];
  /** Boxes needed beyond the monster's own (e.g. Venom cards in #3). */
  requiredExpansionIds: ExpansionId[];
  scoring: TrialScoring;
  /** Series label printed on the card, e.g. "Primal Challenges 2024". */
  series: string;
  specialRules: string[];
  /** One entry per token instance, as printed on the card's board diagram. */
  terrain: TrialTerrainPlacement[];
}

/** One die face of a Winds monster's map: the biome it fights on and the board it prints. */
export interface TrialSeriesSetup {
  biome: TrialBiomeId;
  roll: 1 | 2 | 3 | 4 | 5 | 6;
  /** Terrain tokens printed on the die face's board: one entry per token instance. */
  terrain: TrialTerrainPlacement[];
}

/** One monster's die-rolled setups inside a Winds series: faces 1–6, each a biome. */
export interface TrialSeriesMonster {
  monsterId: string;
  setups: TrialSeriesSetup[];
}

export interface TrialSeriesScoringLevel {
  base: number;
  modifiers: TrialScoreModifier[];
}

/** A five-expedition mini-campaign (#11–#12, "Winds of …"). */
export interface TrialSeries {
  /** The series' cover art, shown where the series is chosen and identified. */
  art: string /** A right-sized variant of the cover art for the journal band's plate: the full
   *  render is 4× the display size and its decode/raster is paid on every appearance. */;
  artPlate?: string;
  /** CSS `background-position` for the cover art: portrait art anchors its subject above the
   *  copy gradient instead of the default centre, which crops a standing figure. */
  artPosition?: string;
  /** Expeditions played before the run is complete. */
  expeditionCount: number;
  id: string;
  lore: string;
  /** Wound cards a hunter may keep in their deck (the sheet's wound reserve). */
  maxWoundCards: number;
  monsters: TrialSeriesMonster[];
  name: string;
  nightmareVariant: 'none' | 'optional';
  number: number;
  /** Boxes the mode is designed around (the die maps draw on the biome boxes). */
  recommendedExpansionIds: ExpansionId[];
  /** Per-expedition score table by the trial's current aggression level. */
  scoreLevels: Record<1 | 2 | 3, TrialSeriesScoringLevel>;
  series: string;
  /** The trial's aggression level: starts here and rises through bounty phases. */
  startingAggression: 1;
}

/** The standard trial worksheet: the score levels every series prints — both Winds series
 *  carry them identically, which the catalog test pins — and the ascent's chapters climb
 *  the same levels. */
export const TRIAL_SCORE_LEVELS: Record<1 | 2 | 3, TrialSeriesScoringLevel> = structuredClone(
  (trialData.series[0] as TrialSeries).scoreLevels,
);

export const TRIAL_HUNTS: TrialHunt[] = trialData.hunts as TrialHunt[];

export const TRIAL_SERIES: TrialSeries[] = trialData.series as TrialSeries[];

/**
 * The terrain a rolled die face fights on: each monster's map prints its own configuration
 * per face: the same biome can print different tokens on two faces of the same map, so the
 * setup is keyed by monster and roll, not by biome. Aggregated per sector like every other
 * placement list; catalog terrain only, so special board tokens stay on the setup checklist.
 */
export const trialEncounterTerrain = (monsterId: string, roll: 1 | 2 | 3 | 4 | 5 | 6): TerrainPlacement[] => {
  const setup = TRIAL_SERIES.flatMap((series) => series.monsters)
    .find((monster) => monster.monsterId === monsterId)
    ?.setups.find((candidate) => candidate.roll === roll);
  return aggregateTerrain(
    (setup?.terrain ?? []).filter(
      (placement): placement is { sector: ExpeditionSector | null; terrainId: TerrainId } =>
        terrainById(placement.terrainId) !== undefined,
    ),
  );
};

/** The biome a rolled die face fights on: the printed die map's face → biome lookup. */
export const trialEncounterBiome = (monsterId: string, roll: 1 | 2 | 3 | 4 | 5 | 6): TrialBiomeId | undefined =>
  TRIAL_SERIES.flatMap((series) => series.monsters)
    .find((monster) => monster.monsterId === monsterId)
    ?.setups.find((candidate) => candidate.roll === roll)?.biome;

/** A biome id as printed on its box, e.g. 'thunder-mountains' → 'Thunder Mountains'. */
export const trialBiomeName = (biome: TrialBiomeId): string =>
  biome
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

/** Existing art is shared by biome faces that belong to the same expansion box. */
export const trialBiomeArtwork = (biome: TrialBiomeId): string => BIOME_ARTWORK[biome];

export const trialHuntById = (id: string): TrialHunt | undefined => TRIAL_HUNTS.find((hunt) => hunt.id === id);

export const trialSeriesById = (id: string): TrialSeries | undefined => TRIAL_SERIES.find((series) => series.id === id);

/** Trials whose required boxes are all enabled, in printed order. */
export const trialHuntsForExpansions = (expansionIds: readonly ExpansionId[]): TrialHunt[] =>
  TRIAL_HUNTS.filter((hunt) => hunt.requiredExpansionIds.every((id) => expansionIds.includes(id)));

/** The scenario id a trial card renders as: one per hunt, stable across releases. */
export const trialScenarioId = (hunt: Pick<TrialHunt, 'id'>): string => `trial-${hunt.id}`;

/** Resolves the hunt behind a trial scenario id (also accepts the hunt's own id). */
export const trialHuntByScenarioId = (scenarioId: string): TrialHunt | undefined =>
  TRIAL_HUNTS.find((hunt) => trialScenarioId(hunt) === scenarioId || hunt.id === scenarioId);

/**
 * A trial card as a hunt scenario: the monster and its fixed aggression, the card's special
 * rules, and the component list as terrain. Terrain carries no sector placement: the printed
 * card's setup diagram is the source of truth, so the pieces are listed, not mapped.
 */
function toScenario(hunt: TrialHunt): ExpeditionScenario {
  const monster = monsterById(hunt.monsterId);
  const specialRules: SpecialRule[] = hunt.specialRules.map((text, index) => ({
    text,
    title: `Special rule ${index + 1}`,
  }));
  // The battlefield map renders catalog terrain only; the cards' special board tokens
  // (Damage, Thornvine, the Fire token's back) stay on the setup checklist.
  const boardTerrain = hunt.terrain.filter(
    (placement): placement is { sector: ExpeditionSector | null; terrainId: TerrainId } =>
      terrainById(placement.terrainId) !== undefined,
  );
  return {
    expansionId: monster?.expansionId ?? 'core',
    id: trialScenarioId(hunt),
    monsterId: hunt.monsterId,
    name: hunt.name,
    number: hunt.number,
    objective: `Defeat ${monster?.name ?? 'the monster'} under this trial card's special rules and setup.`,
    requiredExpansionIds: [...new Set([monster?.expansionId ?? 'core', ...hunt.requiredExpansionIds])],
    specialRules,
    terrain: aggregateTerrain(boardTerrain),
    trialId: hunt.id,
  };
}

/** Every trial card as a scenario, ready to merge into the scenario lookups. */
export const TRIAL_SCENARIOS: ExpeditionScenario[] = TRIAL_HUNTS.map(toScenario);

export const trialScenarioByHuntId = (huntId: string): ExpeditionScenario | undefined =>
  TRIAL_SCENARIOS.find((scenario) => scenario.trialId === huntId);
