import {
  availableExpeditionScenarios,
  enabledContent,
  forgeById,
  hunterById,
  monsterById,
  monsters,
  scenarioById,
} from '../content';
import { ascentChapterByNumber } from '../content/ascent';
import { transitionAscentPhase } from './ascent-machine';
import {
  ascentDeckContext,
  ascentEquipmentPool,
  ascentPotionPool,
  baseEquipment,
  fitDeck,
  starterMasteryId,
  validateDeck,
} from './deck';
import { PrimalDomainError } from './errors';
import { appendHuntRecord } from './hunt-history';
import { idleHuntTimer, stopHuntTimer } from './hunt-timer';
import { syncHunterState } from './hunter-state';
import { carrierMonster, idleMonsterState, setupMonsterState } from './monster-state';
import { partyMaxFor } from './party';
import { emptyPotionLoadout } from './potion';
import { missingExpansionIds, requiredExpansionsFor } from './prerequisites';
import { duplicateRun, renameRun, setRunWoundCount } from './run';
import { ascentScoreRecord } from './scoring';
import { emptySkillTree, type SkillProgress, unlockedCards } from './skill-tree';
import type { Ascent, AscentHunter, EquipmentIds, ExpansionId, Hunter, PotionLoadout } from './types';

/** Ascent parties need 2–4 hunters; the Mount Havoc expansion permits a fifth. */
export const ASCENT_PARTY_MIN = 2;
export const ASCENT_CHAPTERS_TOTAL = 3;
export { RUN_MAX_WOUNDS as ASCENT_MAX_WOUNDS, RUN_NAME_MAX as ASCENT_NAME_MAX } from './run';

const suggestedNames = [
  'The Summit Call',
  'Echoes of Havoc',
  'The Long Climb',
  'Path to the Summit',
  'Shadows on the Ridge',
  'The Mountain’s Trial',
];

export function suggestAscentName(random = Math.random): string {
  return suggestedNames[Math.floor(random() * suggestedNames.length)] ?? 'Mount Havoc';
}

/** Fisher–Yates with the caller's random so tests stay deterministic. */
function shuffle(ids: readonly string[], random: () => number): string[] {
  const result = [...ids];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createAscent(
  id: string,
  name: string,
  expansionIds: readonly ExpansionId[],
  now: string,
  random: () => number = Math.random,
): Ascent {
  const missing = missingExpansionIds(requiredExpansionsFor('ascent'), expansionIds);
  if (missing.length > 0) {
    throw new PrimalDomainError('expansion-required', `The ascent needs the boxes: ${missing.join(', ')}.`);
  }
  const pool = enabledContent(monsters, expansionIds).filter(
    (monster) => availableExpeditionScenarios(monster.id, expansionIds).length > 0,
  );
  if (pool.length < ASCENT_CHAPTERS_TOTAL) {
    throw new PrimalDomainError('ascent-draw', 'At least three monsters are needed to face the ascent.');
  }
  return {
    chapter: 1,
    createdAt: now,
    defeatedMonsterIds: [],
    drawPile: shuffle(
      pool.map((monster) => monster.id),
      random,
    ),
    expansionIds: ['core', ...expansionIds.filter((entry) => entry !== 'core')],
    fightEvents: [],
    fightStart: null,
    hunterState: {},
    hunters: [],
    huntHistory: [],
    huntTimer: idleHuntTimer(),
    id,
    kind: 'ascent',
    monsterState: idleMonsterState(),
    name,
    nightmareVariant: false,
    pending: null,
    phase: 'preparing',
    result: null,
    rev: 0,
    scores: [],
    status: 'running',
    updatedAt: now,
  };
}

export const renameAscent = (ascent: Ascent, name: string, now: string): Ascent => renameRun(ascent, name, now);

/** Toggles the Nightmare variant between chapters: the stance cards join the behavior decks
 *  while the climb's boxes carry the Nightmare Expansion. */
export function setAscentNightmareVariant(ascent: Ascent, on: boolean, now: string): Ascent {
  if (on && !ascent.expansionIds.includes('nightmare')) {
    throw new PrimalDomainError('expansion-required', 'The Nightmare variant needs the Nightmare Expansion.');
  }
  if (ascent.nightmareVariant === on) return ascent;
  return { ...ascent, nightmareVariant: on, updatedAt: now };
}

export const duplicateAscent = (ascent: Ascent, id: string, now: string): Ascent => ({
  ...duplicateRun(ascent, id, now),
  fightEvents: [],
  fightStart: null,
  huntHistory: [],
  scores: [],
});

export const ascentHunterIds = (ascent: Pick<Ascent, 'hunters'>): string[] =>
  ascent.hunters.map((member) => member.hunterId);

/**
 * The chapter's gear swap: for each worn piece, take the same family at the chapter's level when it
 * exists. Pieces whose family has no card at this level (basic weapons, base armor) stay worn.
 */
export function upgradeEquipmentToChapter(ascent: Ascent, hunter: Hunter, equipment: EquipmentIds): EquipmentIds {
  const pool = ascentEquipmentPool(ascent.expansionIds, hunter, ascent.chapter);
  const next = { ...equipment };
  for (const slot of ['weapon', 'armor', 'helm', 'item'] as const) {
    const current = equipment[`${slot}Id`];
    if (!current) continue;
    const piece = forgeById(current);
    if (!piece || piece.level >= ascent.chapter) continue;
    const upgrade = pool.find(
      (candidate) => candidate.familyId === piece.familyId && candidate.level === ascent.chapter,
    );
    if (upgrade) next[`${slot}Id`] = upgrade.id;
  }
  return next;
}

/** A hunter joins with base gear, the starter deck and no wounds; chapter advances re-fit instead. */
export function createAscentHunter(ascent: Ascent, hunterId: string): AscentHunter {
  const hunter = hunterById(hunterId);
  if (!hunter) throw new PrimalDomainError('party-unavailable', `Unknown hunter: ${hunterId}`);
  const member: AscentHunter = {
    consumedPotionIds: [],
    deckCardIds: [],
    equipment: baseEquipment(hunter),
    hunterId,
    masteryCardId: starterMasteryId(hunter),
    playerName: '',
    potionLoadoutIds: emptyPotionLoadout(),
    skillPoints: ascent.chapter,
    skillTree: emptySkillTree(),
    woundCount: 0,
  };
  return { ...member, deckCardIds: fitDeck([], ascentDeckContext(ascent, member, hunter)) };
}

/** Sets the party before the first hunt; hunters already in it keep their build. */
export function setAscentHunters(ascent: Ascent, hunterIds: string[], now: string): Ascent {
  const partyChanged =
    hunterIds.length !== ascent.hunters.length ||
    hunterIds.some((id) => !ascent.hunters.some((hunter) => hunter.hunterId === id));
  if (ascent.phase !== 'preparing') {
    throw new PrimalDomainError('phase-transition', 'The party is only chosen before the hunt begins.');
  }
  const max = partyMaxFor(ascent.expansionIds);
  if (hunterIds.length < ASCENT_PARTY_MIN || hunterIds.length > max) {
    throw new PrimalDomainError(
      'party-size',
      `The ascent is played with ${ASCENT_PARTY_MIN}–${max} hunters (${hunterIds.length} selected).`,
    );
  }
  if (new Set(hunterIds).size !== hunterIds.length) {
    throw new PrimalDomainError('party-duplicate', 'Each hunter can only be chosen once.');
  }
  for (const id of hunterIds) {
    if (!hunterById(id)) throw new PrimalDomainError('party-unavailable', `Hunter "${id}" is not available.`);
  }
  const hunters = hunterIds.map(
    (hunterId) => ascent.hunters.find((member) => member.hunterId === hunterId) ?? createAscentHunter(ascent, hunterId),
  );
  return {
    ...ascent,
    fightEvents: partyChanged ? [] : ascent.fightEvents,
    fightStart: partyChanged ? null : ascent.fightStart,
    hunterState: syncHunterState(hunterIds, ascent.hunterState),
    hunters,
    updatedAt: now,
  };
}

/** Wounds are the sheet's tracker; the hunt itself is resolved on paper. */
export const setAscentWoundCount = (ascent: Ascent, hunterId: string, woundCount: number, now: string): Ascent =>
  setRunWoundCount(ascent, hunterId, woundCount, now);

/**
 * Weakness-based deck adjustment: when the drawn monster is weak to something the party wears,
 * each hunter may re-adjust their deck before the hunt. Reported, not enforced.
 */
export const ascentMayAdjustDecks = (ascent: Ascent): boolean => {
  const monster = carrierMonster(ascent);
  if (!monster) return false;
  return ascent.hunters.some((member) => {
    const hunter = hunterById(member.hunterId);
    return hunter
      ? validateDeck(member.deckCardIds, ascentDeckContext(ascent, member, hunter)).effectiveEquipment > 0
      : false;
  });
};

// ---------------------------------------------------------------------------
// Phase transitions
// ---------------------------------------------------------------------------

/**
 * Draws the chapter's random encounter: pops the last monster from the pile and pairs it with one
 * of its scenarios. A defeated monster never returns to the pile.
 */
export function revealAscentEncounter(ascent: Ascent, now: string, random: () => number = Math.random): Ascent {
  const drawPile = ascent.drawPile.filter((id) => availableExpeditionScenarios(id, ascent.expansionIds).length > 0);
  const monsterId = drawPile.at(-1);
  if (!monsterId) throw new PrimalDomainError('ascent-pile-empty', 'No playable encounters remain in the ascent.');
  const scenarios = availableExpeditionScenarios(monsterId, ascent.expansionIds);
  const scenario = scenarios[Math.floor(random() * scenarios.length)];
  const pending = { monsterId, scenarioId: scenario.id };
  const seeded = { ...ascent, pending };
  return {
    ...ascent,
    drawPile: drawPile.slice(0, -1),
    monsterState: setupMonsterState(seeded),
    pending,
    phase: transitionAscentPhase(ascent.phase, { type: 'REVEAL_ENCOUNTER' }),
    updatedAt: now,
  };
}

export function beginAscentHunt(ascent: Ascent, now: string): Ascent {
  if (!ascent.pending) throw new PrimalDomainError('ascent-draw', 'Draw the encounter before the hunt begins.');
  return {
    ...ascent,
    fightEvents: [],
    fightStart: null,
    huntTimer: idleHuntTimer(),
    phase: transitionAscentPhase(ascent.phase, { type: 'BEGIN_HUNT' }),
    updatedAt: now,
  };
}

/**
 * Records the hunt result with its score sheet. A defeat ends the run (sudden death). A win
 * carries the sheet's answers and their tally — scored at the standard worksheet's level the
 * climb has reached, the same levels the Winds fill at their aggression — adds the trophy,
 * and the chapter either advances (granting the next skill point, swapping gear to the new
 * level and re-fitting decks) or ends the ascent after chapter 3.
 */
export function recordAscentResult(
  ascent: Ascent,
  result: 'victory' | 'defeat',
  answers: readonly number[],
  now: string,
): Ascent {
  if (ascent.phase !== 'hunt') {
    throw new PrimalDomainError('phase-transition', 'Record the result during the Hunt phase.');
  }
  if (!ascent.pending) throw new PrimalDomainError('ascent-draw', 'There is no hunt to record.');
  const stopped = {
    ...ascent,
    huntHistory: appendHuntRecord(ascent, ascent.pending.monsterId, result, now),
    huntTimer: stopHuntTimer(ascent.huntTimer, now),
  };
  if (result === 'defeat') {
    return { ...stopped, phase: 'result', result: 'defeat', status: 'finished', updatedAt: now };
  }
  // The chapter's worksheet, the standard series sheet at the climb's level: the recorded
  // scores overwrite their chapter's slot, so a revisited chapter re-fills its own sheet.
  const scores = [...stopped.scores];
  scores[ascent.chapter - 1] = ascentScoreRecord(ascent, answers);
  return {
    ...stopped,
    defeatedMonsterIds: [...ascent.defeatedMonsterIds, ascent.pending.monsterId],
    phase: 'result',
    result: 'victory',
    scores,
    updatedAt: now,
  };
}

/** After a win: advance to the next chapter's story, or finish the ascent after chapter 3. */
export function advanceAscentChapter(ascent: Ascent, now: string): Ascent {
  if (ascent.result !== 'victory')
    throw new PrimalDomainError('phase-transition', 'Only a won hunt advances the chapter.');
  if (ascent.chapter >= ASCENT_CHAPTERS_TOTAL) {
    // The summit is reached: the run is over, the result screen shows the epilogue.
    return { ...ascent, status: 'finished', updatedAt: now };
  }
  transitionAscentPhase(ascent.phase, { type: 'NEXT_CHAPTER' });
  const chapter = (ascent.chapter + 1) as 2 | 3;
  const advanced: Ascent = {
    ...ascent,
    chapter,
    // The party prepares again; pending clears so the boards show the new monster only after the draw.
    monsterState: idleMonsterState(ascent.hunters.length),
    pending: null,
    phase: 'preparing',
    result: null,
    updatedAt: now,
  };
  const hunters = ascent.hunters.map((member) => {
    const hunter = hunterById(member.hunterId);
    if (!hunter) return member;
    const equipment = upgradeEquipmentToChapter(advanced, hunter, member.equipment);
    const upgraded = { ...member, equipment, skillPoints: member.skillPoints + 1 };
    // Potion slots only hold this chapter's level; anything else is emptied for the party to refill.
    const legalPotions = new Set(ascentPotionPool(advanced.expansionIds, chapter).map((potion) => potion.id));
    const [p1, p2, p3] = upgraded.potionLoadoutIds;
    const potionLoadoutIds: PotionLoadout = [
      p1 && legalPotions.has(p1) ? p1 : null,
      p2 && legalPotions.has(p2) ? p2 : null,
      p3 && legalPotions.has(p3) ? p3 : null,
    ];
    return {
      ...upgraded,
      deckCardIds: fitDeck(upgraded.deckCardIds, ascentDeckContext(advanced, upgraded, hunter)),
      potionLoadoutIds,
    };
  });
  return { ...advanced, hunters };
}

/** Steps back to an earlier phase of the same chapter (the machine's REVISIT). */
export function revisitAscentPhase(ascent: Ascent, phase: Ascent['phase'], now: string): Ascent {
  return { ...ascent, phase: transitionAscentPhase(ascent.phase, { phase, type: 'REVISIT' }), updatedAt: now };
}

// ---------------------------------------------------------------------------
// Deck context helpers for the UI
// ---------------------------------------------------------------------------

export const ascentPotions = (ascent: Pick<Ascent, 'expansionIds' | 'chapter'>) =>
  ascentPotionPool(ascent.expansionIds, ascent.chapter);

export const ascentEquipmentFor = (ascent: Pick<Ascent, 'expansionIds' | 'chapter'>, hunter: Hunter) =>
  ascentEquipmentPool(ascent.expansionIds, hunter, ascent.chapter);

export const ascentCardPool = (member: SkillProgress, hunter: Hunter) => unlockedCards(member, hunter);

export const ascentScenario = (ascent: Ascent) =>
  ascent.pending ? scenarioById(ascent.pending.scenarioId) : undefined;

export const ascentMonster = (ascent: Ascent) => (ascent.pending ? monsterById(ascent.pending.monsterId) : undefined);

export const ascentChapter = (ascent: Pick<Ascent, 'chapter'>) => ascentChapterByNumber(ascent.chapter);
