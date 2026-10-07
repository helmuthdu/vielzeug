import { describe, expect, it } from 'vitest';
import { monsterById, questId, TOTAL_CHAPTERS } from '../content';
import {
  beginAscentHunt,
  createAscent,
  revealAscentEncounter,
  setAscentHunters,
  setAscentNightmareVariant,
} from './ascent';
import { commitQuestSelection, createCampaign, finishHunt, sendChapterEvent } from './campaign';
import {
  createChallenge,
  rollChallengeEncounter,
  setChallengeHunters,
  setChallengeNightmareVariant,
} from './challenge';
import { PrimalDomainError } from './errors';
import {
  createExpedition,
  recordExpeditionResult,
  setExpeditionAggression,
  setExpeditionHunters,
  setExpeditionMonster,
  setExpeditionScenario,
} from './expedition';
import {
  adjustMonsterCounter,
  adjustMonsterToken,
  canWound,
  carrierMonster,
  confirmMonsterWound,
  idleMonsterState,
  isIdleMonsterState,
  resetMonsterState,
  setMonsterStance,
  setupMonsterState,
  stanceToughness,
  struggleAtUnleash,
  unleashMonster,
  unleashThreshold,
  upkeepStruggleGain,
  woundThreshold,
} from './monster-state';
import type { Ascent, Campaign, Challenge, Expedition } from './types';

const NOW = '2026-01-01T00:00:00.000Z';
const LATER = '2026-01-01T00:12:30.000Z';

/** Deterministic draw order: with random() = 0 the pile keeps catalog order and pops its tail. */
const noShuffle = () => 0;

const freshCampaign = (): Campaign =>
  createCampaign({
    config: { expansionIds: ['core'], name: 'Crimson Forest', nightmareVariant: false, variants: [] },
    hunterIds: ['daeron', 'mirah'],
    id: 'c1',
    now: NOW,
  });
const preparing = (): Campaign => commitQuestSelection(freshCampaign(), questId(1), NOW);
/** Quest 1 hunts Toramat. */
const hunting = (): Campaign => sendChapterEvent(preparing(), { type: 'FINISH_PREPARING' }, NOW);

/** A Nightmare ascent with its party seated: the unshuffled pile draws Vyraxen on reveal. */
const nightmareAscent = (): Ascent =>
  setAscentHunters(
    setAscentNightmareVariant(
      createAscent('a1', 'Mount Havoc', ['core', 'mount-havoc', 'nightmare'], NOW, noShuffle),
      true,
      NOW,
    ),
    ['daeron', 'mirah'],
    NOW,
  );

/** A Nightmare Winds run with its party seated, ready to roll its first expedition. */
const nightmareRun = (): Challenge =>
  setChallengeNightmareVariant(
    setChallengeHunters(
      createChallenge(
        'r1',
        'winds-of-spring',
        'Spring Run',
        [
          'core',
          'nightmare',
          'biome-woltyar-frozen-wastes',
          'biome-niz-maraga-sunset-plains',
          'biome-endless-swamp-nightmare',
          'biome-crystal-caves-flooded-wilds',
          'biome-goldarks-thunder-mountains',
        ],
        NOW,
      ),
      ['daeron', 'ljonar'],
      NOW,
    ),
    true,
    NOW,
  );

const expedition = (monsterId = 'vyraxen'): Expedition => {
  let result = createExpedition('e1', ['core'], NOW);
  result = setExpeditionHunters(result, ['daeron', 'ljonar'], NOW);
  return setExpeditionMonster(result, monsterId, NOW);
};

describe('idle state', () => {
  it('starts with no damage or tokens and one struggle per player', () => {
    expect(idleMonsterState(3)).toEqual({
      acceleration: 0,
      bonus: 0,
      damage: 0,
      stance: 1,
      struggle: 3,
      terrain: { placed: [], removed: [], transformed: {} },
      tokens: { blind: 0, confuse: 0, double: 0, slow: 0, stun: 0, unstoppable: 0, vulnerable: 0 },
      toughness: 0,
    });
    expect(idleMonsterState().struggle).toBe(0);
  });

  it('is seeded for the party when the hunt begins and resolves the quest monster once a quest is committed', () => {
    expect(freshCampaign().monsterState).toEqual(idleMonsterState());
    expect(carrierMonster(preparing())?.id).toBe('toramat');
    // Toramat's stance I card prints toughness 4 per player at aggression 1.
    expect(hunting().monsterState).toEqual({ ...idleMonsterState(2), toughness: 4 });
  });

  it('seeds toughness from the nightmare stance card when the variant is on', () => {
    const nightmare = createCampaign({
      config: { expansionIds: ['core', 'nightmare'], name: 'Crimson Forest', nightmareVariant: true, variants: [] },
      hunterIds: ['daeron', 'mirah'],
      id: 'c2',
      now: NOW,
    });
    const prepared = commitQuestSelection(nightmare, questId(1), NOW);
    // Toramat's nightmare stance I card prints toughness 5 at aggression 1.
    expect(sendChapterEvent(prepared, { type: 'FINISH_PREPARING' }, NOW).monsterState.toughness).toBe(5);
  });

  it('seeds the nightmare stance toughness when a Nightmare ascent reveals its encounter', () => {
    // The unshuffled pile draws Vyraxen: the nightmare stance I card prints 6 at aggression 1, not the standard 5.
    const revealed = revealAscentEncounter(nightmareAscent(), NOW, noShuffle);
    expect(revealed.pending?.monsterId).toBe('vyraxen');
    expect(revealed.monsterState.toughness).toBe(6);
  });

  it('seeds the nightmare stance toughness when a Nightmare Winds run rolls its expedition', () => {
    // Xitheros: the nightmare stance I card prints 9 at aggression 1, not the standard 7.
    expect(rollChallengeEncounter(nightmareRun(), 'xitheros', 1, NOW).monsterState.toughness).toBe(9);
  });

  it('re-loads the nightmare stance toughness when a Nightmare ascent changes stance', () => {
    const huntingAscent = beginAscentHunt(revealAscentEncounter(nightmareAscent(), NOW, noShuffle), NOW);
    // Vyraxen: the nightmare stance II card prints 9 at aggression 1, not the standard 7.
    expect(setMonsterStance(huntingAscent, 2, NOW).monsterState).toMatchObject({ stance: 2, toughness: 9 });
  });

  it('resolves The Awakened as the carrier monster during the final battle', () => {
    const finale = { ...hunting(), activeQuestId: null, chapter: TOTAL_CHAPTERS };
    expect(carrierMonster(finale)?.id).toBe('the-awakened');
    expect(setupMonsterState(finale).toughness).toBe(30);
  });

  it('is reset for the party when the expedition monster changes', () => {
    const damaged = adjustMonsterCounter(expedition('toramat'), 'damage', 4, NOW);
    expect(setExpeditionMonster(damaged, 'vyraxen', LATER).monsterState).toEqual(idleMonsterState(2));
  });

  it('follows the expedition party while still at setup, but not once the fight is under way', () => {
    const fresh = setExpeditionHunters(expedition(), ['daeron', 'ljonar', 'mirah'], LATER);
    expect(fresh.monsterState.struggle).toBe(3);
    const inPlay = adjustMonsterCounter(expedition(), 'damage', 1, NOW);
    expect(setExpeditionHunters(inPlay, ['daeron', 'ljonar', 'mirah'], LATER).monsterState).toEqual(
      inPlay.monsterState,
    );
  });

  it('seeds toughness when the expedition aggression is chosen, but not once the fight is under way', () => {
    // Vyraxen's stance I card prints toughness 5 per player at aggression 1.
    const ready = setExpeditionAggression(expedition(), 1, NOW);
    expect(ready.monsterState.toughness).toBe(5);
    const moved = setExpeditionHunters(ready, ['daeron', 'ljonar', 'mirah'], LATER);
    expect(moved.monsterState).toEqual({ ...idleMonsterState(3), toughness: 5 });
    // A toughness override is still setup data: a new aggression level re-derives it.
    const overridden = adjustMonsterCounter(ready, 'toughness', -2, NOW);
    expect(setExpeditionAggression(overridden, 2, LATER).monsterState.toughness).toBe(10);
    const inPlay = adjustMonsterCounter(ready, 'damage', 1, NOW);
    expect(setExpeditionAggression(inPlay, 2, LATER).monsterState.toughness).toBe(5);
  });

  it('knows when the board still shows the setup values', () => {
    expect(isIdleMonsterState(idleMonsterState(2), 2)).toBe(true);
    expect(isIdleMonsterState(idleMonsterState(2), 3)).toBe(false);
    expect(isIdleMonsterState({ ...idleMonsterState(2), damage: 1 }, 2)).toBe(false);
    // Toughness is printed card data seeded at setup, not fight progress.
    expect(isIdleMonsterState({ ...idleMonsterState(2), toughness: 4 }, 2)).toBe(true);
  });
});

describe('guards', () => {
  it('is only editable during the Hunt phase', () => {
    for (const entity of [freshCampaign(), preparing(), finishHunt(hunting(), 'victory', [], NOW)]) {
      expect(() => adjustMonsterCounter(entity, 'damage', 1, NOW)).toThrow(PrimalDomainError);
      expect(() => adjustMonsterToken(entity, 'stun', 1, NOW)).toThrow(PrimalDomainError);
      expect(() => resetMonsterState(entity, NOW)).toThrow(PrimalDomainError);
    }
  });

  it('locks a played expedition and requires a chosen monster', () => {
    let ready = setExpeditionAggression(expedition(), 1, NOW);
    ready = setExpeditionScenario(ready, 'vyraxen-expedition-1', NOW);
    const played = recordExpeditionResult(ready, 'victory', NOW);
    expect(() => adjustMonsterCounter(played, 'damage', 1, NOW)).toThrow(PrimalDomainError);

    const noMonster = createExpedition('e2', ['core'], NOW);
    expect(() => adjustMonsterCounter(noMonster, 'damage', 1, NOW)).toThrow(
      expect.objectContaining({ code: 'monster-not-found' }),
    );
  });

  it('rejects non-integer deltas', () => {
    expect(() => adjustMonsterCounter(hunting(), 'damage', 0.5, NOW)).toThrow(PrimalDomainError);
    expect(() => adjustMonsterToken(hunting(), 'blind', Number.NaN, NOW)).toThrow(PrimalDomainError);
  });
});

describe('counters', () => {
  it('clamps amounts at zero', () => {
    let result = adjustMonsterCounter(hunting(), 'damage', 5, NOW);
    expect(result.monsterState.damage).toBe(5);
    result = adjustMonsterCounter(result, 'damage', -9, NOW);
    expect(result.monsterState.damage).toBe(0);
    result = adjustMonsterCounter(result, 'bonus', 2, NOW);
    expect(result.monsterState.bonus).toBe(2);
    expect(adjustMonsterCounter(result, 'bonus', -5, NOW).monsterState.bonus).toBe(0);
    expect(result.updatedAt).toBe(NOW);
  });

  it('scales the wound threshold by party size and needs toughness to be set', () => {
    // The seeded stance I toughness is 4: a wound needs 16 damage from a party of 4.
    let result = adjustMonsterCounter(hunting(), 'damage', 13, NOW);
    expect(woundThreshold(result.monsterState, 4)).toBe(16);
    expect(canWound(result.monsterState, 4)).toBe(false);
    result = adjustMonsterCounter(result, 'damage', 3, NOW);
    expect(canWound(result.monsterState, 4)).toBe(true);
    result = adjustMonsterCounter(result, 'damage', -woundThreshold(result.monsterState, 4), NOW);
    expect(result.monsterState.damage).toBe(0);
    expect(canWound(result.monsterState, 4)).toBe(false);
    result = adjustMonsterCounter(result, 'toughness', -4, NOW);
    expect(woundThreshold(result.monsterState, 0)).toBe(0);
    expect(canWound(result.monsterState, 4)).toBe(false);
  });

  it('requires confirmation to convert monster damage into a wound', () => {
    const before = hunting();
    const threshold = woundThreshold(before.monsterState, before.hunters.length);
    const belowThreshold = adjustMonsterCounter(before, 'damage', threshold - 1, NOW);

    expect(() => confirmMonsterWound(belowThreshold, NOW)).toThrow(PrimalDomainError);
    expect(belowThreshold.monsterState.damage).toBe(threshold - 1);

    const ready = adjustMonsterCounter(belowThreshold, 'damage', 1, NOW);
    const confirmed = confirmMonsterWound(ready, NOW);
    expect(confirmed.monsterState.damage).toBe(0);
  });

  it('changes the current stance and loads its printed toughness', () => {
    const before = hunting();
    const changed = setMonsterStance(before, 2, NOW);

    expect(changed.monsterState.stance).toBe(2);
    expect(changed.monsterState.toughness).toBe(stanceToughness(carrierMonster(before), 1, 2));
  });

  it('drops struggle to one per hunter after an unleash without touching the rest of the board', () => {
    let result = adjustMonsterCounter(hunting(), 'struggle', 6, NOW);
    result = adjustMonsterCounter(result, 'acceleration', 2, NOW);
    result = unleashMonster(result, NOW);
    expect(result.monsterState).toMatchObject({ acceleration: 2, struggle: 2 });
  });
});

describe('tokens', () => {
  it('holds at most one of each token and ignores extra applications', () => {
    let result = adjustMonsterToken(hunting(), 'confuse', 3, NOW);
    expect(result.monsterState.tokens.confuse).toBe(1);
    result = adjustMonsterToken(result, 'stun', 1, NOW);
    result = adjustMonsterToken(result, 'stun', 1, NOW);
    expect(result.monsterState.tokens.stun).toBe(1);
    result = adjustMonsterToken(result, 'stun', -5, NOW);
    expect(result.monsterState.tokens.stun).toBe(0);
  });

  it('resets the whole board back to the setup values', () => {
    let result = adjustMonsterCounter(hunting(), 'damage', 3, NOW);
    result = adjustMonsterToken(result, 'blind', 2, NOW);
    result = adjustMonsterCounter(result, 'acceleration', 1, NOW);
    // Clearing restores the seeded stance I toughness for the current fight.
    expect(resetMonsterState(result, NOW).monsterState).toEqual({ ...idleMonsterState(2), toughness: 4 });
  });
});

describe('derived helpers', () => {
  it('reads the printed stance toughness for an aggression, nightmare falling back to standard', () => {
    const vyraxen = monsterById('vyraxen');
    expect(stanceToughness(vyraxen, 1)).toBe(5);
    expect(stanceToughness(vyraxen, 1, 2)).toBe(7);
    expect(stanceToughness(vyraxen, 3, 1, true)).toBe(25);
    // Vyraxen has no nightmare row at aggression 0: the standard card applies.
    expect(stanceToughness(vyraxen, 0, 1, true)).toBe(2);
    expect(stanceToughness(undefined, 1)).toBe(0);
    expect(stanceToughness(vyraxen, null)).toBe(0);
  });

  it('derives the unleash threshold from party size', () => {
    expect(unleashThreshold(2)).toBe(6);
    expect(unleashThreshold(5)).toBe(15);
    expect(unleashThreshold(0)).toBe(3);
    expect(struggleAtUnleash({ ...idleMonsterState(), struggle: 6 }, 2)).toBe(true);
    expect(struggleAtUnleash({ ...idleMonsterState(), struggle: 5 }, 2)).toBe(false);
  });

  it('adds one struggle per acceleration token at upkeep', () => {
    expect(upkeepStruggleGain(idleMonsterState())).toBe(1);
    expect(upkeepStruggleGain({ ...idleMonsterState(), acceleration: 2 })).toBe(3);
  });
});
