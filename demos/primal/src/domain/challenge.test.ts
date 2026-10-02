import { describe, expect, it } from 'vitest';
import { forgeById, hunterById, potionById, trialSeriesById } from '../content';
import {
  advanceChallengeSession,
  CHALLENGE_EXPEDITIONS_TOTAL,
  CHALLENGE_MAX_WOUNDS,
  challengeAvailableMonsters,
  challengeBountyDue,
  challengeDraftPairs,
  challengePotions,
  challengeRewardPool,
  chooseChallengeBounty,
  createChallenge,
  finishChallengePreparation,
  recordChallengeResult,
  renameChallenge,
  revisitChallengePhase,
  rollChallengeEncounter,
  setChallengeHunters,
  setChallengeNightmareVariant,
  setChallengeWoundCount,
  suggestChallengeName,
  takeChallengeEquipment,
} from './challenge';
import { canTransitionChallenge, transitionChallengePhase } from './challenge-machine';
import { PrimalDomainError } from './errors';
import { assertHuntEditable } from './hunt-timer';
import { challengeRank, challengeTotal } from './scoring';
import type { Challenge, EquipmentSlot, Hunter } from './types';

const NOW = '2026-01-01T00:00:00.000Z';
const daeron = hunterById('daeron') as Hunter;
const ljonar = hunterById('ljonar') as Hunter;

/** All boxes enabled, so every series monster is available. */
const ALL_BOXES = [
  'nightmare',
  'nightmare-2',
  'feather',
  'venom',
  'ice',
  'heart-of-the-wild',
  'mount-havoc',
  'biome-endless-swamp-nightmare',
  'biome-goldarks-thunder-mountains',
  'biome-niz-maraga-sunset-plains',
  'biome-woltyar-frozen-wastes',
  'biome-crystal-caves-flooded-wilds',
] as const;

function created(seriesId = 'winds-of-spring'): Challenge {
  return createChallenge('r1', seriesId, 'Spring Run', ALL_BOXES, NOW);
}

/** Seats the party wearing the first drawn card of each drafted pair: the sheet filled. */
function drafted(run: Challenge): Challenge {
  return {
    ...run,
    hunters: run.hunters.map((member) => ({
      ...member,
      equipment: {
        ...member.equipment,
        armorId: member.draftPairs.armor[0] ?? null,
        helmId: member.draftPairs.helm[0] ?? null,
        weaponId: member.draftPairs.weapon[0] ?? null,
      },
    })),
  };
}

/** A run ready to roll its first expedition: party seated and drafted, on the quest board. */
function setup(seriesId = 'winds-of-spring'): Challenge {
  return drafted(setChallengeHunters(created(seriesId), ['daeron', 'ljonar'], NOW));
}

/** Rolls the encounter and finishes the preparation: the run is now in its hunt. */
function rolled(run: Challenge, monsterId = 'xitheros', face: 1 | 2 | 3 | 4 | 5 | 6 = 1): Challenge {
  return finishChallengePreparation(rollChallengeEncounter(run, monsterId, face, NOW), NOW);
}

/** Plays one whole winning session: roll, prep, win, take the bounty, open the next board. */
function winSession(run: Challenge, monsterId: string, choice: 'keep' | 'raise'): Challenge {
  const won = recordChallengeResult(rolled(run, monsterId), 'victory', [0, 0, 0, 0], NOW);
  return advanceChallengeSession(chooseChallengeBounty(won, choice, NOW), NOW);
}

describe('challenge creation', () => {
  it('suggests a stable name for each Winds series', () => {
    expect(suggestChallengeName('winds-of-spring', () => 0)).toBe('First Winds of Spring');
    expect(suggestChallengeName('winds-of-spring', () => 0.99)).toBe('The Vernal Hunt');
    expect(suggestChallengeName('winds-of-summer', () => 0)).toBe('The Sunlit Hunt');
    expect(suggestChallengeName('winds-of-summer', () => 0.99)).toBe('The Golden Trial');
  });

  it('creates a run on its quest board at aggression 1', () => {
    const run = created();
    expect(run.phase).toBe('quest-board');
    expect(run.aggression).toBe(1);
    expect(run.expeditionNumber).toBe(1);
    expect(run.status).toBe('running');
    expect(run.scores).toEqual([]);
  });

  it('rejects an unknown series and bad names', () => {
    expect(() => createChallenge('r1', 'winds-of-autumn', 'X', ['core'], NOW)).toThrow(PrimalDomainError);
    expect(() => createChallenge('r1', 'winds-of-spring', '  ', ALL_BOXES, NOW)).toThrow(PrimalDomainError);
  });

  it('needs every biome board the series rolls', () => {
    // The five biome boards behind the die faces are required; dropping one is refused.
    const incomplete = ALL_BOXES.filter((id) => id !== 'biome-crystal-caves-flooded-wilds');
    expect(() => createChallenge('r1', 'winds-of-spring', 'Spring Run', incomplete, NOW)).toThrow(
      /biome-crystal-caves-flooded-wilds/,
    );
    expect(() => createChallenge('r1', 'winds-of-spring', 'Spring Run', ALL_BOXES, NOW)).not.toThrow();
  });

  it('seats the party before a fight, not after it begins', () => {
    const run = setup();
    expect(run.hunters).toHaveLength(2);
    expect(run.hunters[0]?.hunterId).toBe('daeron');
    // Re-seating on the quest board keeps the party; once the hunt is live it is frozen.
    expect(() => setChallengeHunters(rolled(run), ['daeron'], NOW)).toThrow(PrimalDomainError);
  });

  it('renames a run', () => {
    const run = created();
    expect(renameChallenge(run, 'New Name', NOW).name).toBe('New Name');
  });

  it('toggles the Nightmare variant between expeditions, box permitting', () => {
    const withBox = createChallenge('r2', 'winds-of-spring', 'X', ALL_BOXES, NOW);
    expect(setChallengeNightmareVariant(withBox, true, NOW).nightmareVariant).toBe(true);
    expect(setChallengeNightmareVariant(withBox, false, NOW).nightmareVariant).toBe(false);
    const withoutBox = { ...withBox, expansionIds: withBox.expansionIds.filter((id) => id !== 'nightmare') };
    expect(() => setChallengeNightmareVariant(withoutBox, true, NOW)).toThrow(/Nightmare Expansion/);
  });
});

describe('challenge preparation draft', () => {
  it('draws two craftable level-1 cards per slot, never the base gear', () => {
    const run = setChallengeHunters(created(), ['daeron', 'ljonar'], NOW);
    const pairs = challengeDraftPairs(run, daeron);
    for (const slot of ['weapon', 'armor', 'helm'] as const) {
      expect(pairs[slot], slot).toHaveLength(2);
      for (const id of pairs[slot]) {
        const piece = forgeById(id);
        expect(piece?.level, `${slot}/${id}`).toBe(1);
        expect(piece?.cost, `${slot}/${id}: base gear is not draftable`).not.toBeNull();
        expect(piece?.type, `${slot}/${id}`).toBe(slot);
      }
    }
    for (const id of pairs.weapon) {
      expect(forgeById(id), id).toMatchObject({ classRestriction: daeron.classId });
    }
  });

  it('draws deterministically from the caller’s random', () => {
    const run = setChallengeHunters(created(), ['daeron', 'ljonar'], NOW);
    let seed = 42;
    const random = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    const first = challengeDraftPairs(run, daeron, random);
    seed = 42;
    const second = challengeDraftPairs(run, daeron, random);
    expect(second).toEqual(first);
  });

  it('deals the draft once when a hunter joins: re-seating the party re-deals nothing', () => {
    const seated = setChallengeHunters(created(), ['daeron', 'ljonar'], NOW);
    for (const member of seated.hunters) {
      for (const slot of ['weapon', 'armor', 'helm'] as const) {
        expect(member.draftPairs[slot], `${member.hunterId}/${slot}`).toHaveLength(2);
      }
    }
    const reseated = setChallengeHunters(seated, ['daeron', 'ljonar'], NOW);
    expect(reseated.hunters).toEqual(seated.hunters);
  });

  it('refuses to begin the first hunt until every hunter wears a drafted weapon, armor and helm', () => {
    // Roll on the quest board opens the preparation; the draft gate holds there.
    const seated = setChallengeHunters(created(), ['daeron', 'ljonar'], NOW);
    const preparing = rollChallengeEncounter(seated, 'xitheros', 1, NOW);
    expect(preparing.phase).toBe('preparing');
    expect(() => finishChallengePreparation(preparing, NOW)).toThrow(PrimalDomainError);
    const ready = rollChallengeEncounter(drafted(seated), 'xitheros', 1, NOW);
    expect(finishChallengePreparation(ready, NOW).phase).toBe('hunt');
  });
});

describe('challenge expedition phase', () => {
  it('rolls the printed biome for the die face', () => {
    const run = rollChallengeEncounter(setup(), 'xitheros', 1, NOW);
    const series = trialSeriesById('winds-of-spring');
    const expected = series?.monsters.find((entry) => entry.monsterId === 'xitheros')?.setups[0];
    expect(run.pending?.monsterId).toBe('xitheros');
    expect(run.pending?.biome).toBe(expected?.biome);
    // The biome's terrain configuration resolves through the biome setup table at read time,
    // so a run in progress picks up a configuration filled in later.
    expect('terrainIds' in (run.pending ?? {})).toBe(false);
  });

  it('rejects monsters outside the series, already defeated, or the wrong phase', () => {
    let run = setup();
    expect(() => rollChallengeEncounter(run, 'vyraxen', 1, NOW)).toThrow(PrimalDomainError);
    run = rolled(run);
    run = recordChallengeResult(run, 'victory', [0, 0, 0, 0], NOW);
    expect(run.defeatedMonsterIds).toContain('xitheros');
    // The next board cannot open before the bounty is taken, and the choice is a one-time call.
    expect(() => advanceChallengeSession(run, NOW)).toThrow(PrimalDomainError);
    const chosen = chooseChallengeBounty(run, 'keep', NOW);
    expect(() => chooseChallengeBounty(chosen, 'raise', NOW)).toThrow(PrimalDomainError);
    expect(() => rollChallengeEncounter(setup(), 'hydar', 9 as 1, NOW)).toThrow(PrimalDomainError);
  });

  it('offers only undefeated series monsters from the enabled boxes', () => {
    const advanced = winSession(setup(), 'xitheros', 'keep');
    const available = challengeAvailableMonsters(advanced).map((entry) => entry.monsterId);
    expect(available).not.toContain('xitheros');
    expect(available).toContain('hydar');
  });

  it('victory lands on the result with a skill point per hunter', () => {
    const before = rolled(setup());
    const won = recordChallengeResult(before, 'victory', [0, 0, 0, 0], NOW);
    expect(won.phase).toBe('result');
    expect(won.result).toBe('victory');
    expect(won.hunters.every((member) => member.skillPoints === 1)).toBe(true);
    expect(won.status).toBe('running');
    expect(challengeBountyDue(won)).toBe(true);
    expect(won.huntHistory?.[0]).toMatchObject({
      monsterId: before.pending?.monsterId,
      outcome: 'victory',
      recordedAt: NOW,
    });
  });

  it('defeat ends the run immediately', () => {
    const before = rolled(setup());
    const monsterId = before.pending?.monsterId;
    const lost = recordChallengeResult(before, 'defeat', [1, 2, 0, 1], NOW);
    expect(lost.phase).toBe('result');
    expect(lost.status).toBe('finished');
    expect(lost.result).toBe('defeat');
    // A defeat never scores: the run ends with only what earlier expeditions recorded.
    expect(lost.scores).toEqual([]);
    expect(lost.huntHistory?.[0]).toMatchObject({ monsterId, outcome: 'defeat', recordedAt: NOW });
    // A finished run has no bounty waiting.
    expect(challengeBountyDue(lost)).toBe(false);
  });

  it('resets the timer when preparation opens a new hunt', () => {
    const setupPhase = rollChallengeEncounter(setup(), 'xitheros', 1, NOW);
    const timed = { ...setupPhase, huntTimer: { durationMs: 1000, elapsedMs: 1000, startedAt: null } };
    expect(finishChallengePreparation(timed, NOW).huntTimer).toEqual({
      durationMs: null,
      elapsedMs: 0,
      startedAt: null,
    });
  });

  it('records the worksheet answers with their tally as part of the victory', () => {
    const run = rolled(setup());
    // Level 1 table: base 10, +5 stance-card flag, +2 per behavior card, −3 per other-player KO.
    const won = recordChallengeResult(run, 'victory', [1, 2, 0, 1], NOW);
    expect(won.scores).toEqual([{ answers: [1, 2, 0, 1], total: 10 + 5 + 4 - 3 }]);
    // Stray answers clamp to whole non-negative counts.
    const clamped = recordChallengeResult(run, 'victory', [-2, 1.7, 0, 0], NOW).scores[0];
    expect(clamped.answers).toEqual([0, 1, 0, 0]);
    expect(clamped.total).toBe(12);
  });
});

describe('challenge equipment reward', () => {
  /** A session-2 preparation: the first hunt won, so the spoils are ready to spend. */
  function spoils(): Challenge {
    return rollChallengeEncounter(winSession(setup(), 'xitheros', 'keep'), 'hydar', 1, NOW);
  }

  it('wears one reward card for the defeated monster’s element at the fought level', () => {
    const run = spoils();
    const piece = challengeRewardPool(run, daeron)[0];
    if (!piece) throw new Error('the reward pool is empty for the defeated monster');
    const taken = takeChallengeEquipment(run, 'daeron', piece.type as EquipmentSlot, piece.id, NOW);
    const member = taken.hunters.find((entry) => entry.hunterId === 'daeron');
    expect(member?.equipment[`${piece.type}Id`]).toBe(piece.id);
    expect(member?.equipmentRewardTaken).toBe(true);
  });

  it('allows exactly one reward card per hunter per hunt', () => {
    const run = spoils();
    const first = challengeRewardPool(run, daeron)[0];
    const second = challengeRewardPool(run, daeron).find((piece) => piece.id !== first.id);
    const taken = takeChallengeEquipment(run, 'daeron', first.type as EquipmentSlot, first.id, NOW);
    if (second) {
      expect(() => takeChallengeEquipment(taken, 'daeron', second.type as EquipmentSlot, second.id, NOW)).toThrow(
        /already taken/,
      );
    }
    // The other hunter still has their reward to take.
    const ljonarPiece = challengeRewardPool(taken, ljonar)[0];
    expect(() =>
      takeChallengeEquipment(taken, 'ljonar', ljonarPiece.type as EquipmentSlot, ljonarPiece.id, NOW),
    ).not.toThrow();
  });

  it('refuses a card outside the defeated monster’s reward pool', () => {
    const run = spoils();
    const pool = new Set(challengeRewardPool(run, daeron).map((piece) => piece.id));
    const outsider = challengePotions(run)[0]; // any id that is not an equipment reward
    expect(pool.has(outsider.id)).toBe(false);
    expect(() => takeChallengeEquipment(run, 'daeron', 'item', outsider.id, NOW)).toThrow(PrimalDomainError);
  });

  it('clears the reward flag when the next expedition opens', () => {
    const run = spoils();
    const piece = challengeRewardPool(run, daeron)[0];
    const taken = takeChallengeEquipment(run, 'daeron', piece.type as EquipmentSlot, piece.id, NOW);
    const won = recordChallengeResult(finishChallengePreparation(taken, NOW), 'victory', [0, 0, 0, 0], NOW);
    const next = advanceChallengeSession(chooseChallengeBounty(won, 'keep', NOW), NOW);
    expect(next.hunters.every((member) => !member.equipmentRewardTaken)).toBe(true);
  });
});

describe('challenge bounty', () => {
  it('keeping heals every wound on the result', () => {
    let run = rolled(setup());
    run = setChallengeWoundCount(run, 'daeron', 2, NOW);
    run = recordChallengeResult(run, 'victory', [0, 0, 0, 0], NOW);
    const kept = chooseChallengeBounty(run, 'keep', NOW);
    expect(kept.hunters.every((member) => member.woundCount === 0)).toBe(true);
    expect(kept.aggression).toBe(1);
    expect(kept.bounty).toBe('keep');
    const next = advanceChallengeSession(kept, NOW);
    expect(next.expeditionNumber).toBe(2);
    expect(next.bounty).toBeNull();
    expect(next.phase).toBe('quest-board');
  });

  it('raising upgrades the aggression and swaps potions to their family at the new level', () => {
    let run = rolled(setup());
    run = recordChallengeResult(run, 'victory', [0, 0, 0, 0], NOW);
    // Slot a level-1 herbalist potion on the first hunter so the raise has something to swap.
    const level1 = challengePotions(run).find((potion) => !potion.rewardOnly);
    if (!level1) throw new Error('the core shelf prints no level-1 herbalist potion');
    run = {
      ...run,
      hunters: run.hunters.map((member, index) =>
        index === 0 ? { ...member, potionLoadoutIds: [level1.id, null, null] } : member,
      ),
    };
    const raised = chooseChallengeBounty(run, 'raise', NOW);
    expect(raised.aggression).toBe(2);
    expect(raised.bounty).toBe('raise');
    // The slotted potion becomes its family's level-2 card, not an empty slot.
    const swapped = potionById(raised.hunters[0].potionLoadoutIds[0] ?? '');
    expect(swapped?.familyId).toBe(level1.familyId);
    expect(swapped?.level).toBe(2);
    // Every slotted potion stays level-legal after the swap.
    const legal = new Set(challengePotions(raised).map((potion) => potion.id));
    for (const member of raised.hunters) {
      for (const id of member.potionLoadoutIds) expect(id === null || legal.has(id)).toBe(true);
    }
    expect(() => chooseChallengeBounty(raised, 'raise', NOW)).toThrow(PrimalDomainError);
  });

  it('caps carried wounds at three cards', () => {
    const run = rolled(setup());
    expect(() => setChallengeWoundCount(run, 'daeron', CHALLENGE_MAX_WOUNDS + 1, NOW)).toThrow(PrimalDomainError);
  });
});

describe('challenge completion', () => {
  it('finishes after the fifth expedition with the summed score and ranking', () => {
    let run = setup();
    for (let session = 1; session <= CHALLENGE_EXPEDITIONS_TOTAL; session++) {
      const monsterId = challengeAvailableMonsters(run)[0]?.monsterId ?? 'xitheros';
      run = rolled(run, monsterId, 1);
      // Each session records a flat 10: one KO penalty against the level table's base
      // (level 1 needs none, level 2 an other-player KO, level 3 an own KO).
      const answers = [0, 0, 0, 0];
      if (run.aggression === 2) answers[3] = 1;
      if (run.aggression === 3) answers[2] = 1;
      run = recordChallengeResult(run, 'victory', answers, NOW);
      // The fifth expedition has no bounty after it: its result totals straight to the ranking.
      if (session < CHALLENGE_EXPEDITIONS_TOTAL) {
        run = advanceChallengeSession(chooseChallengeBounty(run, session < 3 ? 'raise' : 'keep', NOW), NOW);
      }
    }
    expect(run.expeditionNumber).toBe(CHALLENGE_EXPEDITIONS_TOTAL);
    expect(run.status).toBe('finished');
    expect(run.result).toBe('victory');
    expect(challengeTotal(run)).toBe(50);
    // 50 points on the derived Winds ladder: Commander reaches from 50, Beast Master 70.
    expect(challengeRank(challengeTotal(run))).toBe('Commander');
  });
});

describe('challenge machine and guards', () => {
  it('walks the session arc and rejects impossible transitions', () => {
    expect(transitionChallengePhase('quest-board', { type: 'ROLL_ENCOUNTER' })).toBe('preparing');
    expect(transitionChallengePhase('preparing', { type: 'FINISH_PREPARATION' })).toBe('hunt');
    expect(transitionChallengePhase('hunt', { result: 'victory', type: 'RECORD_RESULT' })).toBe('result');
    expect(transitionChallengePhase('hunt', { result: 'defeat', type: 'RECORD_RESULT' })).toBe('result');
    expect(transitionChallengePhase('result', { type: 'NEXT_SESSION' })).toBe('quest-board');
    expect(() => transitionChallengePhase('quest-board', { type: 'FINISH_PREPARATION' })).toThrow(PrimalDomainError);
    expect(canTransitionChallenge('preparing', { type: 'NEXT_SESSION' })).toBe(false);
  });

  it('revisits only through the machine', () => {
    const run = rolled(setup());
    expect(revisitChallengePhase(run, 'preparing', NOW).phase).toBe('preparing');
    expect(() => revisitChallengePhase(created(), 'hunt', NOW)).toThrow(PrimalDomainError);
  });

  it('keeps the boards editable while running and freezes them after', () => {
    const run = rolled(setup());
    expect(() => assertHuntEditable(run)).not.toThrow();
    const lost = recordChallengeResult(run, 'defeat', [], NOW);
    expect(() => assertHuntEditable(lost)).toThrow(PrimalDomainError);
  });

  it('starts hunters with an empty gear belt, a dealt draft and the starter deck', () => {
    const run = setChallengeHunters(created(), ['daeron', 'ljonar'], NOW);
    const member = run.hunters[0]!;
    expect(member.equipment.weaponId).toBeNull();
    expect(member.equipment.armorId).toBeNull();
    expect(member.equipmentRewardTaken).toBe(false);
    expect(member.hunterId).toBe(daeron.id);
    expect(member.draftPairs.weapon).toHaveLength(2);
    expect(member.deckCardIds.length).toBeGreaterThan(0);
    expect(run.hunters[1]?.hunterId).toBe(ljonar.id);
  });
});
