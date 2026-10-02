import type { ExpansionId, Sector, SpecialRule, TerrainPlacement } from '../domain/types';
import expeditionData from './data/expeditions.json';
import { monsters } from './monsters';
import { SPECIAL_RULES, type SpecialRuleDefinition, type SpecialRuleId } from './special-rules';

export type ExpeditionSector = 'front' | 'left-flank' | 'right-flank' | 'rear' | 'edges';

export type TerrainId =
  | 'rock'
  | 'brush'
  | 'cyricae'
  | 'plateau'
  | 'baethanis'
  | 'water'
  | 'deep-water'
  | 'sand'
  | 'wildmaw'
  | 'synaerea'
  | 'fog'
  | 'ice'
  | 'jungle-brush'
  | 'swamp'
  | 'fire';

export type ExpeditionSpecialRuleId = SpecialRuleId;
export type ExpeditionSpecialRule = SpecialRuleDefinition;
export const EXPEDITION_SPECIAL_RULES: Record<ExpeditionSpecialRuleId, ExpeditionSpecialRule> = SPECIAL_RULES;

export interface ExpeditionTerrainPlacement {
  /** Null = in play without a fixed sector: hidden from the battlefield map, listed with the tokens. */
  sector: ExpeditionSector | null;
  terrainId: TerrainId;
}

export interface RawExpedition {
  expansionId: ExpansionId;
  id: string;
  monsterId: string;
  number: 1 | 2;
  rulebookPage: number;
  specialRules: ExpeditionSpecialRuleId[];
  terrain: ExpeditionTerrainPlacement[];
}

export function aggregateTerrain(placements: ExpeditionTerrainPlacement[]): TerrainPlacement[] {
  const grouped = new Map<string, TerrainPlacement>();
  for (const placement of placements) {
    const key = `${placement.sector}:${placement.terrainId}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.count += 1;
      continue;
    }
    grouped.set(key, { count: 1, sector: placement.sector as Sector, terrainId: placement.terrainId });
  }
  return [...grouped.values()];
}

function toScenario(scenario: RawExpedition): import('../domain/types').ExpeditionScenario {
  const monster = monsters.find((entry) => entry.id === scenario.monsterId);

  const biomeMatch = scenario.id.match(/-biome-([a-z-]+)-expedition-/);
  const biomeLabel = biomeMatch
    ? biomeMatch[1]
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    : null;

  const name = biomeLabel
    ? `${monster?.name ?? scenario.monsterId}: ${biomeLabel} Expedition ${scenario.number}`
    : `${monster?.name ?? scenario.monsterId}: Expedition ${scenario.number}`;

  const objective = biomeLabel
    ? `Defeat ${monster?.name ?? 'the monster'} in the ${biomeLabel} biome and follow the scenario setup and objective instructions for Expedition ${scenario.number}.`
    : `Defeat ${monster?.name ?? 'the monster'} and follow the scenario setup and objective instructions for Expedition ${scenario.number}.`;

  return {
    expansionId: scenario.expansionId,
    id: scenario.id,
    monsterId: scenario.monsterId,
    name,
    number: scenario.number,
    objective,
    requiredExpansionIds: [scenario.expansionId],
    rulebookPage: scenario.rulebookPage,
    source: scenario.expansionId === 'core' ? 'core' : undefined,
    specialRules: scenario.specialRules.map((id) => {
      const rule = EXPEDITION_SPECIAL_RULES[id];
      if (!rule) {
        throw new Error(`Missing special rule metadata for ${id}`);
      }
      return { text: rule.description, title: rule.name } satisfies SpecialRule;
    }),
    terrain: aggregateTerrain(scenario.terrain),
  };
}

export const EXPEDITIONS: RawExpedition[] = expeditionData as RawExpedition[];

export const CORE_EXPEDITIONS: RawExpedition[] = EXPEDITIONS.filter((entry) => entry.expansionId === 'core');

export const expeditionScenarios: import('../domain/types').ExpeditionScenario[] = EXPEDITIONS.map(toScenario);

export const expeditionScenarioById = (id: string): import('../domain/types').ExpeditionScenario | undefined =>
  expeditionScenarios.find((scenario) => scenario.id === id);

export const expeditionScenariosByMonster = (monsterId: string): import('../domain/types').ExpeditionScenario[] =>
  expeditionScenarios.filter((scenario) => scenario.monsterId === monsterId);
