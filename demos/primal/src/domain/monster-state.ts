import { campaignAggression, finalBattle, monsterById, monsterDamageFor, questById, TOTAL_CHAPTERS } from '../content';
import { PrimalDomainError } from './errors';
import { assertHuntEditable } from './hunt-timer';
import {
  type AggressionLevel,
  type HuntSubject,
  isAscentSubject,
  isCampaignSubject,
  isChallengeSubject,
  type Monster,
  type MonsterCounter,
  type MonsterFightState,
  type MonsterStance,
  type MonsterToken,
  type TerrainChanges,
} from './types';

export const MONSTER_COUNTERS = [
  'damage',
  'toughness',
  'bonus',
  'struggle',
  'acceleration',
] as const satisfies readonly MonsterCounter[];

export const MONSTER_TOKENS = [
  'blind',
  'confuse',
  'stun',
  'vulnerable',
  'slow',
  'unstoppable',
  'double',
] as const satisfies readonly MonsterToken[];

/** Struggle the monster starts a fight with, and returns to after an unleash: 1 per player. */
export const setupStruggle = (partySize: number): number => Math.max(0, partySize);

/** The board's terrain untouched: no placements, no melts, no removals. */
const idleTerrainChanges = (): TerrainChanges => ({ placed: [], removed: [], transformed: {} });

/** The board as set up for a fight; `partySize` seeds the starting struggle. */
export const idleMonsterState = (partySize = 0): MonsterFightState => ({
  acceleration: 0,
  bonus: 0,
  damage: 0,
  stance: 1,
  struggle: setupStruggle(partySize),
  terrain: idleTerrainChanges(),
  tokens: { blind: 0, confuse: 0, double: 0, slow: 0, stun: 0, unstoppable: 0, vulnerable: 0 },
  toughness: 0,
});

const sameState = (a: MonsterFightState, b: MonsterFightState): boolean =>
  MONSTER_COUNTERS.every((counter) => a[counter] === b[counter]) &&
  a.stance === b.stance &&
  MONSTER_TOKENS.every((token) => a.tokens[token] === b.tokens[token]) &&
  a.terrain.placed.length === 0 &&
  Object.keys(a.terrain.transformed).length === 0 &&
  a.terrain.removed.length === 0;

/**
 * Whether the board still shows the setup values for a party of this size. Toughness is printed
 * stance-card data seeded at setup rather than fight progress, so it does not count as activity.
 */
export const isIdleMonsterState = (state: MonsterFightState, partySize: number): boolean =>
  sameState({ ...state, toughness: 0 }, idleMonsterState(partySize));

/** Any subject carrying monster fight state. */
export type MonsterStateCarrier = HuntSubject;

/** The monster currently being fought, or `undefined` when none is chosen yet. */
export const carrierMonster = (entity: MonsterStateCarrier): Monster | undefined => {
  const monsterId = isCampaignSubject(entity)
    ? entity.chapter === TOTAL_CHAPTERS
      ? finalBattle.monsterId
      : entity.activeQuestId
        ? questById(entity.activeQuestId)?.monsterId
        : null
    : isAscentSubject(entity)
      ? (entity.pending?.monsterId ?? null)
      : isChallengeSubject(entity)
        ? (entity.pending?.monsterId ?? null)
        : entity.monsterId;
  return monsterId ? monsterById(monsterId) : undefined;
};

/** Hunters in the fight: the unleash threshold and the post-unleash struggle scale with it. */
export const carrierPartySize = (entity: MonsterStateCarrier): number => entity.hunters.length;

/**
 * Per-player toughness printed on a stance card for the fight's aggression level; a wound costs
 * `toughness × party` damage. Falls back to the standard row when the monster has no nightmare row
 * at that aggression, and to 0 when the aggression is not chosen yet.
 */
export const stanceToughness = (
  monster: Monster | undefined,
  aggression: AggressionLevel | null,
  stance: MonsterStance = 1,
  nightmare = false,
): number => {
  if (!monster || aggression === null) return 0;
  const row = monsterDamageFor(monster, aggression, nightmare) ?? monsterDamageFor(monster, aggression, false);
  return row?.stances[stance] ?? 0;
};

/** The aggression and variant the carrier's fight is set up with: the stance card's lookup key. */
const carrierSetup = (entity: MonsterStateCarrier): { aggression: AggressionLevel | null; nightmare: boolean } =>
  isCampaignSubject(entity)
    ? { aggression: campaignAggression(entity.chapter), nightmare: entity.nightmareVariant }
    : isAscentSubject(entity)
      ? // The chapter number is the aggression the Mount Havoc sheet fights at.
        { aggression: entity.chapter, nightmare: entity.nightmareVariant }
      : // Winds runs and expeditions carry their aggression directly.
        { aggression: entity.aggression ?? null, nightmare: entity.nightmareVariant };

/** The board as set up for a fight: struggle seeds from the party, toughness from the stance I card. */
export const setupMonsterState = (entity: MonsterStateCarrier): MonsterFightState => {
  const { aggression, nightmare } = carrierSetup(entity);
  return {
    ...idleMonsterState(carrierPartySize(entity)),
    toughness: stanceToughness(carrierMonster(entity), aggression, 1, nightmare),
  };
};

/** Struggle at which the monster unleashes: 3 per player. */
export const unleashThreshold = (partySize: number): number => 3 * Math.max(1, partySize);

export const struggleAtUnleash = (state: MonsterFightState, partySize: number): boolean =>
  state.struggle >= unleashThreshold(partySize);

/** Damage needed for one wound: the stance card's toughness multiplied by the player count. */
export const woundThreshold = (state: MonsterFightState, partySize: number): number =>
  state.toughness * Math.max(1, partySize);

/** Whether the damage on the stance card is enough to inflict a wound. Wounds resolve one at a time. */
export const canWound = (state: MonsterFightState, partySize: number): boolean =>
  state.toughness > 0 && state.damage >= woundThreshold(state, partySize);

/** Struggle gained during Monster Upkeep: the base 1 plus one per acceleration token. */
export const upkeepStruggleGain = (state: MonsterFightState): number => 1 + state.acceleration;

/** Confirms a physical stance change and syncs that stance's printed toughness into the board. */
export function setMonsterStance<T extends MonsterStateCarrier>(entity: T, stance: MonsterStance, now: string): T {
  const { monster, state } = editable(entity);
  const { aggression, nightmare } = carrierSetup(entity);

  return withState(
    entity,
    { ...state, stance, toughness: stanceToughness(monster, aggression, stance, nightmare) },
    now,
  );
}

/** Confirms one physical wound after its threshold is reached, carrying excess damage forward. */
export function confirmMonsterWound<T extends MonsterStateCarrier>(entity: T, now: string): T {
  const { state } = editable(entity);
  if (!canWound(state, carrierPartySize(entity))) {
    throw new PrimalDomainError('counter-invalid', 'The monster has not reached its wound threshold.');
  }

  return withState(
    entity,
    { ...state, damage: Math.max(0, state.damage - woundThreshold(state, carrierPartySize(entity))) },
    now,
  );
}

const editable = (entity: MonsterStateCarrier): { monster: Monster; state: MonsterFightState } => {
  assertHuntEditable(entity);
  const monster = carrierMonster(entity);
  if (!monster) {
    throw new PrimalDomainError('monster-not-found', 'Choose a monster before using the monster board.');
  }
  return { monster, state: entity.monsterState };
};

const withState = <T extends MonsterStateCarrier>(entity: T, monsterState: MonsterFightState, now: string): T => ({
  ...entity,
  monsterState,
  updatedAt: now,
});

const assertInteger = (delta: number): void => {
  if (!Number.isInteger(delta)) {
    throw new PrimalDomainError('counter-invalid', `Counter delta must be an integer, received ${String(delta)}.`);
  }
};

const clamp = (value: number, min: number, max: number | null): number =>
  Math.max(min, max === null ? value : Math.min(max, value));

/** Applies an integer delta to a counter; amounts clamp at 0. */
export const adjustMonsterCounter = <T extends MonsterStateCarrier>(
  entity: T,
  counter: MonsterCounter,
  delta: number,
  now: string,
): T => {
  assertInteger(delta);
  const { state } = editable(entity);
  return withState(entity, { ...state, [counter]: clamp(state[counter] + delta, 0, null) }, now);
};

/** Places or removes a status token. The monster holds at most one of each; extra applications have no effect. */
export const adjustMonsterToken = <T extends MonsterStateCarrier>(
  entity: T,
  token: MonsterToken,
  delta: number,
  now: string,
): T => {
  assertInteger(delta);
  const { state } = editable(entity);
  return withState(
    entity,
    { ...state, tokens: { ...state.tokens, [token]: clamp(state.tokens[token] + delta, 0, 1) } },
    now,
  );
};

/** The monster unleashed: struggle drops back to one per hunter in the fight. */
export const unleashMonster = <T extends MonsterStateCarrier>(entity: T, now: string): T => {
  const { state } = editable(entity);
  return withState(entity, { ...state, struggle: setupStruggle(carrierPartySize(entity)) }, now);
};

/** Clears all monster fight state back to the setup values for the current fight. */
export const resetMonsterState = <T extends MonsterStateCarrier>(entity: T, now: string): T => {
  editable(entity);
  return withState(entity, setupMonsterState(entity), now);
};
