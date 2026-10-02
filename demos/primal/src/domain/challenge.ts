import { forgeById, hunterById, monsterById, potionById, potions, starterCards, trialSeriesById } from '../content';
import { transitionChallengePhase } from './challenge-machine';
import {
  challengeDeckContext,
  challengeEquipmentPool,
  challengePotionPool,
  deckTypeOf,
  starterMasteryId,
  wearEquipment,
} from './deck';
import { PrimalDomainError } from './errors';
import { appendHuntRecord } from './hunt-history';
import { idleHuntTimer, stopHuntTimer } from './hunt-timer';
import { syncHunterState } from './hunter-state';
import { carrierMonster, idleMonsterState, setupMonsterState } from './monster-state';
import { assertParty } from './party';
import { emptyPotionLoadout } from './potion';
import { missingExpansionIds, requiredExpansionsFor } from './prerequisites';
import { renameRun, runName, setRunWoundCount } from './run';
import { challengeScoreRecord } from './scoring';
import { emptySkillTree } from './skill-tree';
import type {
  Challenge,
  ChallengeDraftSlot,
  ChallengeHunter,
  EquipmentIds,
  EquipmentSlot,
  ExpansionId,
  Hunter,
  PotionLoadout,
} from './types';

/** A Winds series is five expeditions. */
export const CHALLENGE_EXPEDITIONS_TOTAL = 5;
export { RUN_MAX_WOUNDS as CHALLENGE_MAX_WOUNDS, RUN_NAME_MAX as CHALLENGE_NAME_MAX } from './run';

const suggestedNamesBySeries: Record<string, readonly string[]> = {
  'winds-of-spring': [
    'First Winds of Spring',
    'The Blooming Path',
    'Seeds of Valor',
    'Spring’s Reckoning',
    'The Green Awakening',
    'The Vernal Hunt',
  ],
  'winds-of-summer': [
    'The Sunlit Hunt',
    'Embers of Summer',
    'The Longest Day',
    'Summer’s Reckoning',
    'Heat of the Wilds',
    'The Golden Trial',
  ],
};

export function suggestChallengeName(seriesId: string, random = Math.random): string {
  const names = suggestedNamesBySeries[seriesId];
  return names?.[Math.floor(random() * names.length)] ?? trialSeriesById(seriesId)?.name ?? 'Winds';
}

export function createChallenge(
  id: string,
  seriesId: string,
  name: string,
  expansionIds: readonly ExpansionId[],
  now: string,
): Challenge {
  const series = trialSeriesById(seriesId);
  if (!series) throw new PrimalDomainError('challenge-series', 'Unknown Winds series.');
  const missing = missingExpansionIds(requiredExpansionsFor('challenge', seriesId), expansionIds);
  if (missing.length > 0) {
    throw new PrimalDomainError('expansion-required', `The Winds series needs the boxes: ${missing.join(', ')}.`);
  }
  const nextName = runName(name);
  return {
    aggression: 1,
    bounty: null,
    createdAt: now,
    defeatedMonsterIds: [],
    expansionIds: ['core', ...expansionIds.filter((entry) => entry !== 'core')],
    expeditionNumber: 1,
    fightEvents: [],
    fightStart: null,
    hunterState: {},
    hunters: [],
    huntHistory: [],
    huntTimer: idleHuntTimer(),
    id,
    kind: 'challenge',
    monsterState: idleMonsterState(),
    name: nextName,
    nightmareVariant: false,
    pending: null,
    phase: 'quest-board',
    result: null,
    rev: 0,
    scores: [],
    seriesId,
    status: 'running',
    updatedAt: now,
  };
}

export const renameChallenge = (run: Challenge, name: string, now: string): Challenge => renameRun(run, name, now);

/** Toggles the Nightmare variant between expeditions: the stance cards join the behavior
 *  decks while the series' boxes carry the Nightmare Expansion. */
export function setChallengeNightmareVariant(run: Challenge, on: boolean, now: string): Challenge {
  if (on && !run.expansionIds.includes('nightmare')) {
    throw new PrimalDomainError('expansion-required', 'The Nightmare variant needs the Nightmare Expansion.');
  }
  if (run.nightmareVariant === on) return run;
  return { ...run, nightmareVariant: on, updatedAt: now };
}

export const challengeHunterIds = (run: Pick<Challenge, 'hunters'>): string[] =>
  run.hunters.map((member) => member.hunterId);

/**
 * A hunter joins with an empty gear belt, the starter deck and the sheet's draft: two drawn
 * level-1 cards per slot, of which the setup phase wears one. The pairs are dealt once, here :
 * a later reload or remount reads the same cards, never a re-deal. Skill points arrive one per
 * won expedition, like the ascent.
 */
export function createChallengeHunter(run: Challenge, hunterId: string): ChallengeHunter {
  const hunter = hunterById(hunterId);
  if (!hunter) throw new PrimalDomainError('party-unavailable', `Unknown hunter: ${hunterId}`);
  const member: ChallengeHunter = {
    consumedPotionIds: [],
    deckCardIds: [],
    draftPairs: challengeDraftPairs(run, hunter),
    equipment: { armorId: null, helmId: null, itemId: null, weaponId: null },
    equipmentRewardTaken: false,
    hunterId,
    masteryCardId: starterMasteryId(hunter),
    playerName: '',
    potionLoadoutIds: emptyPotionLoadout(),
    skillPoints: 0,
    skillTree: emptySkillTree(),
    woundCount: 0,
  };
  // The sheet's starter deck: every printed 'S' action card, before any weapon refits it.
  return {
    ...member,
    deckCardIds: starterCards(hunter)
      .filter((card) => deckTypeOf(card) !== null)
      .map((card) => card.id),
  };
}

/** Sets the party before a session's fight; hunters already in it keep their build. */
export function setChallengeHunters(run: Challenge, hunterIds: string[], now: string): Challenge {
  const partyChanged =
    hunterIds.length !== run.hunters.length ||
    hunterIds.some((id) => !run.hunters.some((hunter) => hunter.hunterId === id));
  if (run.phase !== 'quest-board' && run.phase !== 'preparing') {
    throw new PrimalDomainError('phase-transition', 'The party is only chosen before the fight begins.');
  }
  assertParty(hunterIds, run.expansionIds);
  const hunters = hunterIds.map(
    (hunterId) => run.hunters.find((member) => member.hunterId === hunterId) ?? createChallengeHunter(run, hunterId),
  );
  return {
    ...run,
    fightEvents: partyChanged ? [] : run.fightEvents,
    fightStart: partyChanged ? null : run.fightStart,
    hunterState: syncHunterState(hunterIds, run.hunterState),
    hunters,
    updatedAt: now,
  };
}

/** Wounds are the sheet's tracker; they persist between expeditions until a bounty heals them. */
export const setChallengeWoundCount = (run: Challenge, hunterId: string, woundCount: number, now: string) =>
  setRunWoundCount(run, hunterId, woundCount, now);

/** The three slots the sheet's draft fills before the run may begin. */
const DRAFTED_SLOTS: readonly (keyof EquipmentIds)[] = ['weaponId', 'armorId', 'helmId'];

/** The number of drafted starting pieces (weapon, armor, helm) the member wears. */
export const challengeDraftedCount = (member: Pick<ChallengeHunter, 'equipment'>): number =>
  DRAFTED_SLOTS.filter((slot) => member.equipment[slot] !== null).length;

/**
 * The preparation is complete and the run moves to its fight. The first session gates on the
 * printed setup: every hunter wears their drafted weapon, armor and helm; no hunter enters
 * the first fight without starting gear. Later sessions prepare with the last hunt's spoils
 * and the deck build, which the sheet leaves unguarded.
 */
export function finishChallengePreparation(run: Challenge, now: string): Challenge {
  if (
    run.expeditionNumber === 1 &&
    run.hunters.some((member) => challengeDraftedCount(member) < DRAFTED_SLOTS.length)
  ) {
    throw new PrimalDomainError(
      'challenge-draft',
      'Every hunter must wear a drafted weapon, armor and helm before the run begins.',
    );
  }
  return {
    ...run,
    fightEvents: [],
    fightStart: null,
    huntTimer: idleHuntTimer(),
    phase: transitionChallengePhase(run.phase, { type: 'FINISH_PREPARATION' }),
    updatedAt: now,
  };
}

/** Steps back to an earlier phase of the current session (the machine's REVISIT). */
export function revisitChallengePhase(run: Challenge, phase: Challenge['phase'], now: string): Challenge {
  return { ...run, phase: transitionChallengePhase(run.phase, { phase, type: 'REVISIT' }), updatedAt: now };
}

// ---------------------------------------------------------------------------
// Expedition phase: monster choice, die roll, result
// ---------------------------------------------------------------------------

/** The series monsters not yet defeated and enabled in this run: the choice pool. */
export function challengeAvailableMonsters(run: Challenge) {
  const series = trialSeriesById(run.seriesId);
  return (series?.monsters ?? []).filter((entry) => {
    const monster = monsterById(entry.monsterId);
    return (
      monster !== undefined &&
      !run.defeatedMonsterIds.includes(entry.monsterId) &&
      (monster.expansionId === 'core' || run.expansionIds.includes(monster.expansionId))
    );
  });
}

/**
 * Rolls the expedition's setup: the chosen monster plus the die face's biome and terrain.
 * The die is the table's: the app records the rolled number, it does not roll for the party.
 * The roll opens the session's preparation: the party builds their deck for the rolled fight
 * before the hunt begins.
 */
export function rollChallengeEncounter(
  run: Challenge,
  monsterId: string,
  roll: 1 | 2 | 3 | 4 | 5 | 6,
  now: string,
): Challenge {
  if (run.phase !== 'quest-board') {
    throw new PrimalDomainError('phase-transition', 'Roll the expedition on the quest board.');
  }
  const series = trialSeriesById(run.seriesId);
  const entry = series?.monsters.find((candidate) => candidate.monsterId === monsterId);
  if (!entry) throw new PrimalDomainError('challenge-series', 'That monster is not part of this series.');
  if (run.defeatedMonsterIds.includes(monsterId)) {
    throw new PrimalDomainError('challenge-series', 'That monster is already defeated: pick another.');
  }
  const setup = entry.setups.find((candidate) => candidate.roll === roll);
  if (!setup) throw new PrimalDomainError('challenge-series', `No setup printed for die face ${roll}.`);
  // The face's terrain configuration resolves through the monster's printed setup at read
  // time, so a catalog fix reaches runs already in progress.
  const pending = { biome: setup.biome, monsterId, roll };
  return {
    ...run,
    monsterState: setupMonsterState({ ...run, pending }),
    pending,
    phase: transitionChallengePhase(run.phase, { type: 'ROLL_ENCOUNTER' }),
    updatedAt: now,
  };
}

/**
 * Records the fight with its score sheet on the result phase. A defeat ends the run; a win
 * carries the sheet's answers and their tally, scored on the level the fight was fought at :
 * the victory confirmation fills the sheet once, with the result. The win's skill-tree step:
 * one upgrade point per hunter, spent in the next session's preparation.
 */
export function recordChallengeResult(
  run: Challenge,
  result: 'victory' | 'defeat',
  answers: readonly number[],
  now: string,
): Challenge {
  if (!run.pending) throw new PrimalDomainError('challenge-series', 'Roll the expedition before recording a result.');
  const phase = transitionChallengePhase(run.phase, { result, type: 'RECORD_RESULT' });
  const huntHistory = appendHuntRecord(run, run.pending.monsterId, result, now);
  // The fight is over: the rolled setup leaves with it, so the next session's board starts clean.
  const stopped = {
    ...run,
    huntHistory,
    huntTimer: stopHuntTimer(run.huntTimer, now),
    pending: null,
  };
  if (result === 'defeat') {
    return { ...stopped, phase, result: 'defeat', status: 'finished', updatedAt: now };
  }
  // The victory's score sheet: tallied against the level the fight was fought at, so a later
  // bounty raise must not move the table. The fifth win ends the series: the result totals
  // straight to the ranking, with no bounty after it.
  const record = challengeScoreRecord(run, answers);
  const scores = [...run.scores];
  scores[run.expeditionNumber - 1] = record;
  const won = {
    ...stopped,
    defeatedMonsterIds: [...run.defeatedMonsterIds, run.pending.monsterId],
    hunters: run.hunters.map((member) => ({ ...member, skillPoints: member.skillPoints + 1 })),
    phase,
    result: 'victory' as const,
    scores,
    updatedAt: now,
  };
  if (run.expeditionNumber >= CHALLENGE_EXPEDITIONS_TOTAL) {
    return { ...won, status: 'finished' };
  }
  return won;
}

/**
 * True while a won session's result waits on its bounty: the choice that raises the stakes
 * or heals the wounds. The fifth expedition has none: its result is the run's end.
 */
export const challengeBountyDue = (run: Challenge): boolean =>
  run.phase === 'result' &&
  run.result === 'victory' &&
  run.status === 'running' &&
  run.expeditionNumber < CHALLENGE_EXPEDITIONS_TOTAL &&
  run.bounty === null;

/**
 * Takes the result's bounty. Raising lifts the aggression and every worn piece and slotted
 * potion to the new level's same-family card: the next preparation then offers the new
 * level's gear to adjust directly; keeping clears every hunter's wound cards. Either way
 * the choice is recorded, and the next expedition cannot open without one.
 */
export function chooseChallengeBounty(run: Challenge, choice: 'keep' | 'raise', now: string): Challenge {
  if (!challengeBountyDue(run)) {
    throw new PrimalDomainError('phase-transition', 'The bounty is not waiting to be chosen.');
  }
  if (choice === 'keep') {
    return {
      ...run,
      bounty: choice,
      hunters: run.hunters.map((member) => ({ ...member, woundCount: 0 })),
      updatedAt: now,
    };
  }
  if (run.aggression >= 3) {
    throw new PrimalDomainError('counter-invalid', 'The challenge is already at its highest aggression.');
  }
  const aggression = (run.aggression + 1) as 2 | 3;
  const raised: Challenge = { ...run, aggression };
  const hunters = run.hunters.map((member) => {
    const hunter = hunterById(member.hunterId);
    if (!hunter) return member;
    const equipment = upgradeEquipmentToAggression(raised, hunter, member.equipment);
    const potionLoadoutIds: PotionLoadout = [
      upgradePotionToAggression(member.potionLoadoutIds[0], aggression),
      upgradePotionToAggression(member.potionLoadoutIds[1], aggression),
      upgradePotionToAggression(member.potionLoadoutIds[2], aggression),
    ];
    return { ...member, equipment, potionLoadoutIds };
  });
  return { ...raised, bounty: choice, hunters, updatedAt: now };
}

/**
 * Opens the next expedition from the result. The bounty must be taken first: it decides the
 * next session's stakes. The fifth expedition has no bounty, so this is unreachable there:
 * its result already finished the run.
 */
export function advanceChallengeSession(run: Challenge, now: string): Challenge {
  if (challengeBountyDue(run)) {
    throw new PrimalDomainError('phase-transition', 'Take the bounty before the next expedition.');
  }
  if (run.status === 'finished') {
    throw new PrimalDomainError('run-finished', 'This run has already ended.');
  }
  return {
    ...run,
    bounty: null,
    expeditionNumber: (run.expeditionNumber + 1) as 2 | 3 | 4 | 5,
    fightEvents: [],
    fightStart: null,
    hunters: run.hunters.map((member) => ({ ...member, equipmentRewardTaken: false })),
    monsterState: idleMonsterState(run.hunters.length),
    pending: null,
    phase: transitionChallengePhase(run.phase, { type: 'NEXT_SESSION' }),
    result: null,
    updatedAt: now,
  };
}

/**
 * The bounty's potion swap: a slotted potion moves to the same family at the new level :
 * the printed rule replaces the card rather than dropping it. Reward-only potions print a
 * single level, so one with no next level leaves the slot; the refill picks a new one.
 */
function upgradePotionToAggression(id: string | null, aggression: 2 | 3): string | null {
  if (!id) return null;
  const potion = potionById(id);
  if (!potion || potion.level >= aggression) return id;
  const upgrade = potions.find((entry) => entry.familyId === potion.familyId && entry.level === aggression);
  return upgrade?.id ?? null;
}

/** The bounty's gear swap: each worn piece moves to the same family at the new level. */
export function upgradeEquipmentToAggression(run: Challenge, hunter: Hunter, equipment: EquipmentIds): EquipmentIds {
  const pool = challengeEquipmentPool(run.expansionIds, run.aggression, hunter);
  const next = { ...equipment };
  for (const slot of ['weapon', 'armor', 'helm', 'item'] as const) {
    const current = equipment[`${slot}Id`];
    if (!current) continue;
    const piece = forgeById(current);
    if (!piece || piece.level >= run.aggression) continue;
    const upgrade = pool.find(
      (candidate) => candidate.familyId === piece.familyId && candidate.level === run.aggression,
    );
    if (upgrade) next[`${slot}Id`] = upgrade.id;
  }
  return next;
}

/**
 * Wears the hunt's equipment reward: the sheet's "choose 1 Equipment card for the level and
 * element of the monster you defeated, replacing your current one of that type". The reward is
 * exactly one card per hunter per hunt: the pool is the defeated monster's element at the
 * fought level, and once a hunter has worn one their `equipmentRewardTaken` flag closes it.
 * The pick happens in the next session's preparation, where the party console is open.
 */
export function takeChallengeEquipment(
  run: Challenge,
  hunterId: string,
  slot: EquipmentSlot,
  equipmentId: string,
  now: string,
): Challenge {
  if (run.phase !== 'preparing') {
    throw new PrimalDomainError('phase-transition', 'Take the equipment reward during preparation.');
  }
  if (run.status === 'finished') throw new PrimalDomainError('run-finished', 'This run has already ended.');
  const member = run.hunters.find((entry) => entry.hunterId === hunterId);
  const hunter = hunterById(hunterId);
  if (!member || !hunter) throw new PrimalDomainError('hunter-not-found', `Hunter "${hunterId}" is not in this party.`);
  if (member.equipmentRewardTaken) {
    throw new PrimalDomainError('challenge-reward-taken', 'That hunter has already taken this hunt’s equipment.');
  }
  const reward = challengeRewardPool(run, hunter).find((piece) => piece.id === equipmentId);
  if (!reward) {
    throw new PrimalDomainError('equipment-restricted', 'That card is not this hunt’s equipment reward.');
  }
  if (reward.type !== slot) {
    throw new PrimalDomainError('equipment-invalid', 'That card does not fit this equipment slot.');
  }
  const worn = wearEquipment(member, slot, equipmentId, challengeDeckContext(run, member, hunter));
  return {
    ...run,
    hunters: run.hunters.map((entry) =>
      entry.hunterId === hunterId ? { ...worn, equipmentRewardTaken: true } : entry,
    ),
    updatedAt: now,
  };
}

// ---------------------------------------------------------------------------
// Pools and reads for the UI
// ---------------------------------------------------------------------------

/** The reward pool after a won expedition: pieces at the fight's level in the monster's element. */
export function challengeRewardPool(run: Challenge, hunter: Hunter) {
  const monsterId = run.defeatedMonsterIds.at(-1);
  const monster = monsterId ? monsterById(monsterId) : undefined;
  return challengeEquipmentPool(run.expansionIds, run.aggression, hunter).filter(
    (piece) =>
      piece.level === run.aggression &&
      (piece.type !== 'weapon' || piece.classRestriction === hunter.classId) &&
      (monster ? piece.element === monster.element : true),
  );
}

/** Fisher–Yates with the caller's random so tests stay deterministic. */
function shuffle(values: readonly string[], random: () => number): string[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * The sheet's printed draft: two drawn craftable level-1 cards per slot, of which the hunter
 * wears one. The base starting gear is not part of the deck the sheet shuffles: every pair
 * draws from the forge's level-1 craftables for the hunter's class.
 */
export function challengeDraftPairs(
  run: Challenge,
  hunter: Hunter,
  random: () => number = Math.random,
): Record<ChallengeDraftSlot, string[]> {
  const pool = challengeEquipmentPool(run.expansionIds, 1, hunter).filter((piece) => piece.level === 1);
  const pair = (slot: ChallengeDraftSlot): string[] =>
    shuffle(
      pool
        .filter(
          (piece) => piece.type === slot && (piece.type !== 'weapon' || piece.classRestriction === hunter.classId),
        )
        .map((piece) => piece.id),
      random,
    ).slice(0, 2);
  return { armor: pair('armor'), helm: pair('helm'), weapon: pair('weapon') };
}

/** The potions a run's level offers: the reward phase's three-slot refill. */
export const challengePotions = (run: Pick<Challenge, 'aggression' | 'expansionIds'>) =>
  challengePotionPool(run.expansionIds, run.aggression);

export const challengeMonster = (run: Challenge) =>
  run.pending ? monsterById(run.pending.monsterId) : carrierMonster(run);

export const challengeSeries = (run: Challenge) => trialSeriesById(run.seriesId);
