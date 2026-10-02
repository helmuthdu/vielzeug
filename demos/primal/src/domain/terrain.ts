import { finalBattle, questById, scenarioById, TOTAL_CHAPTERS, terrainById, trialEncounterTerrain } from '../content';
import { ascentChapterByNumber } from '../content/ascent';
import { PrimalDomainError } from './errors';
import { assertHuntEditable } from './hunt-timer';
import {
  type HuntSubject,
  isAscentSubject,
  isCampaignSubject,
  isChallengeSubject,
  type Sector,
  type TerrainChanges,
  type TerrainPlacement,
  type TerrainToken,
} from './types';

/**
 * The board's terrain as the physical game plays it: individual tokens that can be placed
 * by monster behaviors, removed (Rock prevents attrition damage) and transformed along
 * content-declared chains: fire melts ice to water, and water turns to fog.
 *
 * The printed placements stay the source of truth; only what the fight did to them persists
 * on the monster state, so a content fix reaches runs already in progress.
 */

/** Mints a terrain token id. */
const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36)}`;

/** The fight's printed terrain placements: the quest, scenario or biome the subject is set up with. */
export const carrierTerrain = (entity: HuntSubject): TerrainPlacement[] =>
  isCampaignSubject(entity)
    ? entity.chapter === TOTAL_CHAPTERS
      ? finalBattle.terrain
      : entity.activeQuestId
        ? (questById(entity.activeQuestId)?.terrain ?? [])
        : []
    : isAscentSubject(entity)
      ? [
          ...(entity.pending ? (scenarioById(entity.pending.scenarioId)?.terrain ?? []) : []),
          ...(ascentChapterByNumber(entity.chapter)?.terrain ?? []),
        ]
      : isChallengeSubject(entity)
        ? entity.pending
          ? trialEncounterTerrain(entity.pending.monsterId, entity.pending.roll)
          : []
        : entity.scenarioId
          ? (scenarioById(entity.scenarioId)?.terrain ?? [])
          : [];

/** The scenario's placements as individual tokens: one per printed count, with stable ids. */
export const baseTerrainTokens = (placements: readonly TerrainPlacement[]): TerrainToken[] =>
  placements.flatMap((placement, group) =>
    Array.from({ length: placement.count }, (_, unit) => ({
      id: `b${group}-${unit}`,
      sector: placement.sector,
      terrainId: placement.terrainId,
    })),
  );

/** The board's live terrain: printed tokens plus placements, minus removals, transforms applied. */
export function liveTerrain(entity: HuntSubject): TerrainToken[] {
  const changes = entity.monsterState.terrain;
  const apply = (token: TerrainToken): TerrainToken => ({
    ...token,
    terrainId: changes.transformed[token.id] ?? token.terrainId,
  });
  return [
    ...baseTerrainTokens(carrierTerrain(entity))
      .filter((token) => !changes.removed.includes(token.id))
      .map(apply),
    ...changes.placed.map(apply),
  ];
}

const withTerrain = <T extends HuntSubject>(entity: T, terrain: TerrainChanges, now: string): T => ({
  ...entity,
  monsterState: { ...entity.monsterState, terrain },
  updatedAt: now,
});

const editable = (entity: HuntSubject): TerrainChanges => {
  assertHuntEditable(entity);
  return entity.monsterState.terrain;
};

const tokenById = (entity: HuntSubject, tokenId: string): TerrainToken => {
  const token = liveTerrain(entity).find((entry) => entry.id === tokenId);
  if (!token) throw new PrimalDomainError('terrain-unknown', 'That terrain token is not on the board.');
  return token;
};

/** Takes one token out of the changes: chips placed during the fight are dropped, printed ones are masked. */
const withoutToken = (changes: TerrainChanges, tokenId: string): TerrainChanges =>
  changes.placed.some((entry) => entry.id === tokenId)
    ? {
        ...changes,
        placed: changes.placed.filter((entry) => entry.id !== tokenId),
        transformed: Object.fromEntries(Object.entries(changes.transformed).filter(([id]) => id !== tokenId)),
      }
    : { ...changes, removed: [...changes.removed, tokenId] };

/**
 * Fire's printed interaction with the sector it lands in: every Brush there burns, and Water and
 * Ice transform in place: Water to Fog, Ice to Water: the way the melt does, not by swapping
 * chips: digitally the token just changes.
 */
const applyFireInteractions = (entity: HuntSubject, changes: TerrainChanges, sector: Sector): TerrainChanges => {
  let next = changes;
  for (const token of liveTerrain(entity).filter((entry) => entry.sector === sector)) {
    if (token.terrainId === 'brush') next = withoutToken(next, token.id);
    else if (token.terrainId === 'water') next = { ...next, transformed: { ...next.transformed, [token.id]: 'fog' } };
    else if (token.terrainId === 'ice') next = { ...next, transformed: { ...next.transformed, [token.id]: 'water' } };
  }
  return next;
};

/** Places a terrain token on the board: a monster behavior or the table adding one. */
export function placeTerrain<T extends HuntSubject>(
  entity: T,
  sector: Sector | null,
  terrainId: string,
  now: string,
): T {
  if (!terrainById(terrainId)) {
    throw new PrimalDomainError('terrain-unknown', 'That terrain token is not in the catalog.');
  }
  const changes = editable(entity);
  let next: TerrainChanges = { ...changes, placed: [...changes.placed, { id: uid('terrain'), sector, terrainId }] };
  if (terrainId === 'fire' && sector !== null) next = applyFireInteractions(entity, next, sector);
  return withTerrain(entity, next, now);
}

/** Advances one token along its transformation chain: ice melts to water, water to fog. */
export function transformTerrain<T extends HuntSubject>(entity: T, tokenId: string, now: string): T {
  const changes = editable(entity);
  const token = tokenById(entity, tokenId);
  const target = terrainById(token.terrainId)?.transformsTo;
  if (!target) {
    throw new PrimalDomainError(
      'terrain-transform',
      `${terrainById(token.terrainId)?.name ?? token.terrainId} does not transform.`,
    );
  }
  return withTerrain(entity, { ...changes, transformed: { ...changes.transformed, [tokenId]: target } }, now);
}

/** Takes a token off the board: Rock's prevent, fire cleanup, or a table correction. */
export function removeTerrain<T extends HuntSubject>(entity: T, tokenId: string, now: string): T {
  const changes = editable(entity);
  tokenById(entity, tokenId);
  return withTerrain(entity, withoutToken(changes, tokenId), now);
}
