/**
 * The game content catalog: hunters, monsters, quests, equipment and potions shipped with the app.
 *
 * Content ids are permanent identifiers. Saved games, backups and synced records reference them,
 * and the persisted schemas validate them against this catalog, so add new ids freely, but never
 * rename, renumber, or delete an existing one: a retired id would orphan every record citing it.
 */
import type { ExpansionId, ExpeditionScenario, GameContent } from '../domain/types';
import { expeditionScenarioById, expeditionScenariosByMonster } from './expeditions';
import { TRIAL_SCENARIOS, type TrialHunt, trialHuntById } from './trials';

/** The biome ids live with the other content id unions in the domain layer. */
export type { TrialBiomeId } from '../domain/types';
export { campaignAggression, chapterByNumber, chapters, finalBattle, TOTAL_CHAPTERS } from './chapters';
export { expansionById, expansions } from './expansions';
export {
  CORE_EXPEDITIONS,
  EXPEDITION_SPECIAL_RULES,
  EXPEDITIONS,
  expeditionScenarioById,
  expeditionScenarios,
  expeditionScenariosByMonster,
} from './expeditions';
export {
  forgeById,
  forgeElementLabel,
  forgeEquipment,
  forgeResourceLabel,
  forgeTypeLabel,
  potionById,
  potions,
  previousForgeEquipment,
  rewardCardEquipment,
  rewardCardPotions,
  weaponById,
  wornById,
} from './forge';
export {
  buildSkillTree,
  hunterCardById,
  hunterCards,
  masteryCards,
  SKILL_BRANCH_IDS,
  SKILL_STEPS,
  starterCards,
  starterMastery,
  stepCardCount,
  stepCards,
} from './hunter-cards';
export { hunterById, hunters, weaponClassById, weaponClasses } from './hunters';
export { cardTokenIcons, coloredCardTokens, type GameIcon, gameIconArt, gameIcons } from './icons';
export { type Keyword, keywords } from './keywords';
export { loreExcerpt, loreSentences, paceLore } from './lore';
export { monsterDamageFor, monsterStances } from './monster-damage';
export { monsterById, monsters } from './monsters';
export { questById, questByNumber, questExpirationLabels, questId, quests } from './quests';
export { resources } from './resources';
export { biomeSpecialRule, SPECIAL_RULES, type SpecialRuleDefinition, type SpecialRuleId } from './special-rules';
export {
  type HunterStatusDefinition,
  hunterStatuses,
  type MonsterStatusDefinition,
  monsterStatusById,
  monsterStatuses,
  type StatusDefinition,
  statusById,
  statusRule,
} from './statuses';
export { terrainById, terrainRuleText, terrains } from './terrain';
export {
  BIOME_EXPANSION,
  TRIAL_HUNTS,
  TRIAL_RANK_LEVELS,
  TRIAL_SCENARIOS,
  TRIAL_SCORE_LEVELS,
  TRIAL_SERIES,
  TRIAL_TOKEN_LABELS,
  type TrialComponent,
  type TrialHunt,
  type TrialRanking,
  type TrialRankLevel,
  type TrialScoreModifier,
  type TrialScoring,
  type TrialSeries,
  type TrialSeriesMonster,
  type TrialSeriesScoringLevel,
  type TrialSeriesSetup,
  type TrialTerrainPlacement,
  type TrialTokenId,
  trialBiomeArtwork,
  trialBiomeName,
  trialEncounterBiome,
  trialEncounterTerrain,
  trialHuntById,
  trialHuntByScenarioId,
  trialHuntsForExpansions,
  trialRankHeat,
  trialRankLevel,
  trialScenarioByHuntId,
  trialScenarioId,
  trialSeriesById,
} from './trials';

/** Keeps only content whose expansion is enabled. Core content is always kept. */
export function enabledContent<T extends GameContent>(items: T[], enabled: readonly ExpansionId[]): T[] {
  return items.filter((item) => item.expansionId === 'core' || enabled.includes(item.expansionId));
}

/** A scenario plays when every box it needs is enabled; trial cards can need several. */
const scenarioEnabled = (scenario: ExpeditionScenario, enabled: readonly ExpansionId[]): boolean =>
  scenario.requiredExpansionIds.every((id) => id === 'core' || enabled.includes(id));

/** The monster's scenarios from the enabled boxes; the monster itself must come from an enabled box too. */
export function availableExpeditionScenarios(monsterId: string, enabled: readonly ExpansionId[]): ExpeditionScenario[] {
  return enabledContent(expeditionScenariosByMonster(monsterId), enabled).filter((scenario) =>
    scenarioEnabled(scenario, enabled),
  );
}

/** Every scenario a monster can be hunted under: its expeditions plus its trial cards. */
export function availableScenarios(monsterId: string, enabled: readonly ExpansionId[]): ExpeditionScenario[] {
  return [
    ...availableExpeditionScenarios(monsterId, enabled),
    ...TRIAL_SCENARIOS.filter((scenario) => scenario.monsterId === monsterId && scenarioEnabled(scenario, enabled)),
  ];
}

/** Every scenario of a monster across all boxes, expedition scenarios first, then trial cards. */
export function scenariosByMonster(monsterId: string): ExpeditionScenario[] {
  return [
    ...expeditionScenariosByMonster(monsterId),
    ...TRIAL_SCENARIOS.filter((entry) => entry.monsterId === monsterId),
  ];
}

/** Finds any scenario by id: expeditions and trial cards alike. */
export function scenarioById(id: string): ExpeditionScenario | undefined {
  return expeditionScenarioById(id) ?? TRIAL_SCENARIOS.find((scenario) => scenario.id === id);
}

/** Resolves the trial card behind a scenario id, when it is one. */
export function trialHuntForScenario(scenarioId: string | null): TrialHunt | undefined {
  if (!scenarioId) return undefined;
  const scenario = scenarioById(scenarioId);
  return scenario?.trialId ? trialHuntById(scenario.trialId) : undefined;
}
