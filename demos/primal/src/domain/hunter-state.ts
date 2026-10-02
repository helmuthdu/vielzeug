import { wornById } from '../content';
import { PrimalDomainError } from './errors';
import { assertHuntEditable } from './hunt-timer';
import type {
  DepletedSlot,
  HunterBuild,
  HunterCondition,
  HunterCounter,
  HunterDepletedSlots,
  HunterFightState,
  HuntSubject,
  KoToken,
} from './types';

export const HUNTER_COUNTERS = [
  'damage',
  'defense',
  'disrupt',
  'item',
  'mastery',
  'stamina',
  'strain',
  'weapon',
] as const satisfies readonly HunterCounter[];

export const HUNTER_CONDITIONS = [
  'aggro',
  'burning',
  'dazed',
  'threatened',
] as const satisfies readonly HunterCondition[];

export const idleHunterState = (): HunterFightState => ({
  aggro: false,
  burning: false,
  damage: 0,
  dazed: false,
  defense: 0,
  depleted: { armor: false, helm: false },
  disrupt: 0,
  item: 0,
  knockedOut: null,
  mastery: 0,
  stamina: 0,
  strain: 0,
  threatened: false,
  weapon: 0,
});

/** Whether the board still shows its setup values: no counters, tokens, or deplete marks. */
export const isIdleHunterState = (state: HunterFightState): boolean =>
  Object.entries(state).every(([key, value]) =>
    key === 'depleted' ? !value.armor && !value.helm : value === 0 || value === false || value === null,
  );

/** Rebuilds the state map for a party, preserving existing entries. */
export const syncHunterState = (
  hunterIds: readonly string[],
  current: Record<string, HunterFightState>,
): Record<string, HunterFightState> =>
  Object.fromEntries(hunterIds.map((id) => [id, current[id] ?? idleHunterState()]));

/**
 * A hunter's maximum health is the sum of the health pips on the armor and helm they wear; a
 * depleted piece's pips stop counting, so two deplete tokens leave the hunter with none.
 * `undefined` when neither worn piece grants health: the damage track then has no bound.
 */
export const hunterMaxHealth = (
  hunter: Pick<HunterBuild, 'equipment'>,
  depleted: HunterDepletedSlots = { armor: false, helm: false },
): number | undefined => {
  const grantsHealth = (id: string | null): boolean => id !== null && (wornById(id)?.health ?? null) !== null;
  const { armorId, helmId } = hunter.equipment;
  if (!grantsHealth(armorId) && !grantsHealth(helmId)) return undefined;
  const pips = (id: string | null, isDepleted: boolean): number =>
    id !== null && !isDepleted ? (wornById(id)?.health ?? 0) : 0;
  return pips(armorId, depleted.armor) + pips(helmId, depleted.helm);
};

/** Any subject carrying per-hunter fight state. */
export type FightStateCarrier = HuntSubject;

const editable = (entity: FightStateCarrier, hunterId: string): HunterFightState => {
  assertHuntEditable(entity);
  const state = entity.hunterState[hunterId];
  if (!state) {
    throw new PrimalDomainError('hunter-not-found', `Hunter "${hunterId}" is not in this party.`);
  }
  return state;
};

const withState = <T extends FightStateCarrier>(
  entity: T,
  hunterId: string,
  state: HunterFightState,
  now: string,
): T => ({
  ...entity,
  hunterState: { ...entity.hunterState, [hunterId]: state },
  updatedAt: now,
});

/**
 * Being knocked out removes every damage and other token from the board; only the KO token stays.
 * Deplete tokens sit on the equipment cards and survive the knockout.
 */
const knockedOutState = (depleted: HunterDepletedSlots, knockedOut: KoToken): HunterFightState => ({
  ...idleHunterState(),
  depleted,
  knockedOut,
});

/** A hunter depletes one piece per fight: the first knockout spends it, the next one is final. */
const hasDepletedPiece = (state: HunterFightState): boolean => state.depleted.armor || state.depleted.helm;

/**
 * Applies a standing hunter's knockout: the board clears and: with the one deplete already
 * spent: the knockout is final: the hunter is out of the game.
 */
const knockOutStanding = <T extends FightStateCarrier>(
  entity: T,
  hunterId: string,
  state: HunterFightState,
  token: KoToken,
  now: string,
): T => {
  const final = hasDepletedPiece(state);
  return withState(entity, hunterId, knockedOutState(state.depleted, final ? 'dead' : token), now);
};

/**
 * Applies an integer delta to a counter track, clamped at zero. Damage that reaches or exceeds the
 * health of the worn armor and helm knocks the hunter out instead of accumulating.
 */
export const adjustHunterCounter = <T extends FightStateCarrier>(
  entity: T,
  hunterId: string,
  counter: HunterCounter,
  delta: number,
  now: string,
): T => {
  if (!Number.isInteger(delta)) {
    throw new PrimalDomainError('counter-invalid', `Counter delta must be an integer, received ${String(delta)}.`);
  }
  const state = editable(entity, hunterId);
  const value = Math.max(0, state[counter] + delta);
  if (counter === 'damage' && state.knockedOut === null) {
    const build = entity.hunters.find((hunter) => hunter.hunterId === hunterId);
    const maxHealth = build ? hunterMaxHealth(build, state.depleted) : undefined;
    if (maxHealth !== undefined && value >= maxHealth && value > 0) {
      return knockOutStanding(entity, hunterId, state, 'red', now);
    }
  }
  return withState(entity, hunterId, { ...state, [counter]: value }, now);
};

/**
 * Places, flips or removes the KO token. Knocking a standing hunter out clears their other tokens
 * as the rules demand and: in a campaign fight: adds a wound card to their deck; flipping to
 * black or rising leaves the rest of the board untouched. An out-of-game hunter never returns.
 */
export const setHunterKnockedOut = <T extends FightStateCarrier>(
  entity: T,
  hunterId: string,
  token: KoToken | null,
  now: string,
): T => {
  const state = editable(entity, hunterId);
  if (state.knockedOut === 'dead') {
    throw new PrimalDomainError('hunter-out', 'That hunter is out of the game and cannot return.');
  }
  if (state.knockedOut === null && token !== null) {
    return knockOutStanding(entity, hunterId, state, token, now);
  }
  return withState(entity, hunterId, { ...state, knockedOut: token }, now);
};

/**
 * Places the deplete token on a worn armor or helm card while the hunter is knocked out: the one
 * deplete a fight allows. The first knockout spends it; the second takes the hunter out of the game.
 */
export const setHunterDepleted = <T extends FightStateCarrier>(
  entity: T,
  hunterId: string,
  slot: DepletedSlot,
  depleted: boolean,
  now: string,
): T => {
  const state = editable(entity, hunterId);
  if (state.depleted.armor || state.depleted.helm) {
    throw new PrimalDomainError(
      'equipment-invalid',
      'A hunter depletes only one piece: the next knockout takes them out of the game.',
    );
  }
  if (state.knockedOut === null) {
    throw new PrimalDomainError('equipment-invalid', 'Deplete a piece while the hunter is knocked out.');
  }
  const wornId = entity.hunters.find((member) => member.hunterId === hunterId)?.equipment[`${slot}Id`];
  if (!wornId) {
    throw new PrimalDomainError('equipment-invalid', `That hunter wears no ${slot} to deplete.`);
  }
  return withState(entity, hunterId, { ...state, depleted: { ...state.depleted, [slot]: depleted } }, now);
};

/** Sets a present/absent token condition. For aggro, only one hunter can hold aggro at a time. */
export const setHunterCondition = <T extends FightStateCarrier>(
  entity: T,
  hunterId: string,
  condition: HunterCondition,
  active: boolean,
  now: string,
): T => {
  editable(entity, hunterId);
  if (condition === 'aggro' && active) {
    const nextHunterState = Object.fromEntries(
      Object.entries(entity.hunterState).map(([id, state]) => [
        id,
        id === hunterId ? { ...state, aggro: true } : { ...state, aggro: false },
      ]),
    );
    return {
      ...entity,
      hunterState: nextHunterState,
      updatedAt: now,
    };
  }
  const state = entity.hunterState[hunterId];
  return withState(entity, hunterId, { ...state, [condition]: active }, now);
};

/** Clears all fight state for a hunter back to zero/off. */
export const resetHunterState = <T extends FightStateCarrier>(entity: T, hunterId: string, now: string): T => {
  editable(entity, hunterId);
  return withState(entity, hunterId, idleHunterState(), now);
};
