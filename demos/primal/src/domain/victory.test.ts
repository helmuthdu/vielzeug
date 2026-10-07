import { base64UrlToText, textToBase64Url } from '@vielzeug/arsenal';
import { describe, expect, it } from 'vitest';
import { finalBattle, monsterById, questById, questId, scenarioById } from '../content';
import {
  ASCENT_CHAPTERS_TOTAL,
  advanceAscentChapter,
  beginAscentHunt,
  createAscent,
  recordAscentResult,
  revealAscentEncounter,
  setAscentHunters,
} from './ascent';
import { activateQuest, createCampaign, finishHunt } from './campaign';
import {
  advanceChallengeSession,
  chooseChallengeBounty,
  createChallenge,
  finishChallengePreparation,
  recordChallengeResult,
  rollChallengeEncounter,
  setChallengeHunters,
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
import { startSubjectHuntTimer } from './hunt-timer';
import type { Challenge, VariantId } from './types';
import {
  decodeVictoryCode,
  encodeVictoryCode,
  type SharedVictory,
  victoryFromAscent,
  victoryFromCampaign,
  victoryFromCampaignFinal,
  victoryFromChallenge,
  victoryFromExpedition,
  victoryRank,
} from './victory';

const NOW = '2026-01-01T00:00:00.000Z';

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

/** The Winds of Spring monsters, in series order: five distinct hunts. */
const SERIES_MONSTERS = ['xitheros', 'hydar', 'ozew', 'pazis', 'nagarjas'];

/** Deterministic draw order: with random() = 0 the pile keeps catalog order and pops its tail. */
const noShuffle = () => 0;

function campaign(hunterIds = ['daeron', 'mirah'], variants: VariantId[] = []) {
  return createCampaign({
    config: { expansionIds: ['core'], name: 'Crimson Forest', nightmareVariant: false, variants },
    hunterIds,
    id: 'c1',
    now: NOW,
  });
}

function wonCampaignHunt() {
  const active = activateQuest(campaign(), questId(1), NOW);
  return finishHunt({ ...startSubjectHuntTimer({ ...active, phase: 'hunt' }, NOW), phase: 'hunt' }, 'victory', [], NOW);
}

function playedExpedition() {
  let expedition = createExpedition('e1', ['core'], NOW);
  expedition = setExpeditionHunters(expedition, ['daeron', 'ljonar'], NOW);
  expedition = setExpeditionMonster(expedition, 'vyraxen', NOW);
  expedition = setExpeditionAggression(expedition, 1, NOW);
  expedition = setExpeditionScenario(expedition, 'vyraxen-expedition-1', NOW);
  return recordExpeditionResult(expedition, 'victory', NOW);
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

function wonChallengeSession() {
  const run = drafted(
    setChallengeHunters(
      createChallenge('r1', 'winds-of-spring', 'Spring Run', ALL_BOXES, NOW),
      ['daeron', 'ljonar'],
      NOW,
    ),
  );
  const hunting = finishChallengePreparation(rollChallengeEncounter(run, 'xitheros', 1, NOW), NOW);
  return recordChallengeResult(hunting, 'victory', [0, 0, 0, 0], NOW);
}

function wonAscentChapter() {
  const drawn = revealAscentEncounter(
    setAscentHunters(
      createAscent('a1', 'Mount Havoc', ['core', 'mount-havoc'], NOW, noShuffle),
      ['daeron', 'ljonar'],
      NOW,
    ),
    NOW,
    noShuffle,
  );
  return recordAscentResult(beginAscentHunt(drawn, NOW), 'victory', [0, 0, 0, 0], NOW);
}

describe('victory builders', () => {
  it('summarizes a won campaign hunt with its quest, monster and kill list', () => {
    const won = wonCampaignHunt();
    const victory = victoryFromCampaign(won);
    expect(victory).toMatchObject({
      chapter: 1,
      defeatedMonsterIds: won.trophies,
      hunterIds: ['daeron', 'mirah'],
      mode: 'campaign-hunt',
      monsterId: questById(questId(1))?.monsterId,
      name: 'Crimson Forest',
      questId: questId(1),
    });
    expect(victory?.durationMs).not.toBeNull();
  });

  it('returns null for a campaign hunt that was lost', () => {
    const active = activateQuest(campaign(), questId(1), NOW);
    const lost = finishHunt({ ...active, phase: 'hunt' }, 'defeat', [], NOW);
    expect(victoryFromCampaign(lost)).toBeNull();
  });

  it('summarizes the won final battle with its ending and Hunter’s Trial score', () => {
    const won = { ...campaign(['daeron', 'mirah'], ['hunters-trial']), finalBattleWon: true };
    const victory = victoryFromCampaignFinal(won);
    expect(victory).toMatchObject({
      chapter: 11,
      endingId: 'dawn',
      finished: true,
      hunterIds: ['daeron', 'mirah'],
      mode: 'campaign-final',
      monsterId: finalBattle.monsterId,
      name: 'Crimson Forest',
      score: 0,
    });
  });

  it('picks the rebirth ending when the Voice of Woltyar was achieved', () => {
    const won = { ...campaign(), achievements: ['The Voice of Woltyar'], finalBattleWon: true };
    expect(victoryFromCampaignFinal(won)?.endingId).toBe('rebirth');
  });

  it('returns null until the final battle is won', () => {
    expect(victoryFromCampaignFinal(campaign())).toBeNull();
  });

  it('summarizes a played expedition by its monster, scenario and trial score', () => {
    const played = { ...playedExpedition(), trialScore: { answers: [1, 0], total: 9 } };
    const victory = victoryFromExpedition(played);
    expect(victory).toMatchObject({
      hunterIds: ['daeron', 'ljonar'],
      mode: 'expedition',
      monsterId: 'vyraxen',
      name: null,
      scenarioId: 'vyraxen-expedition-1',
      score: 9,
    });
    expect(scenarioById('vyraxen-expedition-1')).toBeDefined();
  });

  it('returns null for an unplayed or lost expedition', () => {
    expect(victoryFromExpedition(createExpedition('e1', ['core'], NOW))).toBeNull();
    const lost = { ...playedExpedition(), result: 'defeat' as const };
    expect(victoryFromExpedition(lost)).toBeNull();
  });

  it('summarizes a won Winds session with its series, score and newest trophy', () => {
    const victory = victoryFromChallenge(wonChallengeSession());
    expect(victory).toMatchObject({
      defeatedMonsterIds: ['xitheros'],
      expeditionNumber: 1,
      finished: false,
      hunterIds: ['daeron', 'ljonar'],
      mode: 'challenge',
      monsterId: 'xitheros',
      name: 'Spring Run',
      score: 10,
      seriesId: 'winds-of-spring',
    });
  });

  it('marks a finished Winds run', () => {
    let run = wonChallengeSession();
    for (let session = 1; session < SERIES_MONSTERS.length; session += 1) {
      const boarded = advanceChallengeSession(chooseChallengeBounty(run, 'keep', NOW), NOW);
      const hunting = finishChallengePreparation(
        rollChallengeEncounter(boarded, SERIES_MONSTERS[session], 1, NOW),
        NOW,
      );
      run = recordChallengeResult(hunting, 'victory', [0, 0, 0, 0], NOW);
    }
    const victory = victoryFromChallenge(run);
    expect(victory?.finished).toBe(true);
    expect(victory?.expeditionNumber).toBe(5);
    expect(victory?.monsterId).toBe(SERIES_MONSTERS.at(-1));
    expect(victory?.defeatedMonsterIds).toEqual(SERIES_MONSTERS);
  });

  it('summarizes a won ascent chapter with its trophies and monster', () => {
    const won = wonAscentChapter();
    const victory = victoryFromAscent(won);
    expect(victory).toMatchObject({
      chapter: 1,
      defeatedMonsterIds: [won.pending?.monsterId ?? ''],
      finished: false,
      hunterIds: ['daeron', 'ljonar'],
      mode: 'ascent',
      monsterId: won.pending?.monsterId,
      name: 'Mount Havoc',
    });
    expect(monsterById(won.pending?.monsterId ?? '')).toBeDefined();
  });

  it('marks the summit once the third chapter is won and advanced', () => {
    let ascent = advanceAscentChapter(wonAscentChapter(), NOW);
    for (let chapter = 2; chapter <= ASCENT_CHAPTERS_TOTAL; chapter += 1) {
      const drawn = revealAscentEncounter(ascent, NOW, noShuffle);
      ascent = advanceAscentChapter(recordAscentResult(beginAscentHunt(drawn, NOW), 'victory', [0, 0, 0, 0], NOW), NOW);
    }
    const victory = victoryFromAscent(ascent);
    expect(victory?.finished).toBe(true);
    expect(victory?.chapter).toBe(ASCENT_CHAPTERS_TOTAL);
    expect(victory?.defeatedMonsterIds).toHaveLength(ASCENT_CHAPTERS_TOTAL);
    // A plain climb, its sheets empty: the three levels' bases alone score 45.
    expect(victory?.score).toBe(45);
  });

  it('scores the climb by its chapters’ sheets', () => {
    const drawn = revealAscentEncounter(
      setAscentHunters(
        createAscent('scored', 'Mount Havoc', ['core', 'mount-havoc'], NOW, noShuffle),
        ['daeron', 'ljonar'],
        NOW,
      ),
      NOW,
      noShuffle,
    );
    let ascent = advanceAscentChapter(
      recordAscentResult(beginAscentHunt(drawn, NOW), 'victory', [1, 3, 0, 0], NOW),
      NOW,
    );
    for (let chapter = 2; chapter <= ASCENT_CHAPTERS_TOTAL; chapter += 1) {
      const next = revealAscentEncounter(ascent, NOW, noShuffle);
      ascent = advanceAscentChapter(recordAscentResult(beginAscentHunt(next, NOW), 'victory', [1, 3, 0, 0], NOW), NOW);
    }
    const victory = victoryFromAscent(ascent) as SharedVictory;
    // The full nightmare play — stance cards and three behavior cards every chapter — reaches
    // the climb's printed maximum of one hundred: the summit's Nightmare tier.
    expect(victory.score).toBe(21 + 34 + 45);
    expect(victoryRank(victory)).toBe('Nightmare');
    // The running total rides the mid-climb chapter victories too, the Winds' own grammar.
    expect(victoryFromAscent(wonAscentChapter())?.score).toBe(10);
  });
});

describe('victory ranks', () => {
  it('resolves the Winds tier from the derived ladder', () => {
    const base = victoryFromChallenge(wonChallengeSession()) as SharedVictory;
    // One clean level-one expedition: 10 base points, below the Rookie ceiling.
    expect(victoryRank(base)).toBe('Rookie');
    // The most ambitious route's nightmare play — stance and two cards every expedition,
    // 169 — clears the Nightmare bar that rounds under to 165.
    expect(victoryRank({ ...base, score: 169 })).toBe('Nightmare');
    expect(victoryRank({ ...base, score: 165 })).toBe('Nightmare');
    expect(victoryRank({ ...base, score: 164 })).toBe('Primal Beast');
  });

  it('resolves the Hunter’s Trial rank from the recorded sheets', () => {
    const victory = victoryFromCampaignFinal({
      ...campaign(['daeron', 'mirah'], ['hunters-trial']),
      finalBattleWon: true,
      scores: [{ answers: [1, 0, 0, 0], total: 15 }],
    }) as SharedVictory;
    expect(victory.score).toBe(15);
    expect(victoryRank(victory)).toBe('Rookie');
    expect(victoryRank({ ...victory, score: 170 })).toBe('Dragon Slayer');
    expect(victoryRank({ ...victory, score: 337 })).toBe('Nightmare');
    expect(victoryRank({ ...victory, score: 330 })).toBe('Nightmare');
    expect(victoryRank({ ...victory, score: 329 })).toBe('Primal Beast');
    // The Rookie row is the bounded catch-all: any value lower than Expert's 30 lands there.
    expect(victoryRank({ ...victory, score: 29 })).toBe('Rookie');
  });

  it('resolves the summit’s level from the climb’s score', () => {
    const summit = victoryFromAscent({
      ...wonAscentChapter(),
      status: 'finished',
    }) as SharedVictory;
    // The climb's rulebook derivation: bases 45 clean, stance 67, one card each 78,
    // two each 89 — the Nightmare cards never mix levels, three ship per level — with
    // every threshold rounding down to the five.
    expect(victoryRank({ ...summit, score: 100 })).toBe('Nightmare');
    expect(victoryRank({ ...summit, score: 85 })).toBe('Nightmare');
    expect(victoryRank({ ...summit, score: 84 })).toBe('Primal Beast');
    expect(victoryRank({ ...summit, score: 75 })).toBe('Primal Beast');
    expect(victoryRank({ ...summit, score: 74 })).toBe('Indomitable');
    expect(victoryRank({ ...summit, score: 65 })).toBe('Indomitable');
    expect(victoryRank({ ...summit, score: 64 })).toBe('Dragon Slayer');
    expect(victoryRank({ ...summit, score: 45 })).toBe('Dragon Slayer');
    expect(victoryRank({ ...summit, score: 20 })).toBe('Prime Hunter');
    expect(victoryRank({ ...summit, score: 10 })).toBe('Expert');
    // The Rookie row is the bounded catch-all: any value lower than Expert's 10 lands there.
    expect(victoryRank({ ...summit, score: 9 })).toBe('Rookie');
  });
});

describe('victory codes', () => {
  const roundTrip = (victory: SharedVictory | null): SharedVictory => {
    expect(victory).not.toBeNull();
    const encoded = encodeVictoryCode(victory as SharedVictory);
    return decodeVictoryCode(encoded);
  };

  it('round-trips every mode', () => {
    expect(roundTrip(victoryFromCampaign(wonCampaignHunt()))).toEqual(victoryFromCampaign(wonCampaignHunt()));
    expect(
      roundTrip(
        victoryFromCampaignFinal({ ...campaign(['daeron', 'mirah'], ['hunters-trial']), finalBattleWon: true }),
      ),
    ).toEqual(victoryFromCampaignFinal({ ...campaign(['daeron', 'mirah'], ['hunters-trial']), finalBattleWon: true }));
    expect(
      roundTrip(victoryFromExpedition({ ...playedExpedition(), trialScore: { answers: [1, 0], total: 9 } })),
    ).toEqual(victoryFromExpedition({ ...playedExpedition(), trialScore: { answers: [1, 0], total: 9 } }));
    expect(roundTrip(victoryFromChallenge(wonChallengeSession()))).toEqual(victoryFromChallenge(wonChallengeSession()));
    expect(roundTrip(victoryFromAscent(wonAscentChapter()))).toEqual(victoryFromAscent(wonAscentChapter()));
  });

  it('rejects text that is not a code with the victory error code', () => {
    try {
      decodeVictoryCode('not-a-code');
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(PrimalDomainError);
      expect((error as PrimalDomainError).code).toBe('victory-invalid');
    }
  });

  it('rejects codes from another version', () => {
    const raw = JSON.parse(base64UrlToText(encodeVictoryCode(victoryFromAscent(wonAscentChapter()) as SharedVictory)));
    raw.v = 99;
    expect(() => decodeVictoryCode(textToBase64Url(JSON.stringify(raw)))).toThrow(/not supported/);
  });

  it('rejects unknown hunters and monsters', () => {
    const base = victoryFromAscent(wonAscentChapter()) as SharedVictory;
    expect(() => decodeVictoryCode(encodeVictoryCode({ ...base, hunterIds: ['nope'] }))).toThrow(/unknown hunter/);
    const hunted = victoryFromCampaign(wonCampaignHunt()) as SharedVictory;
    expect(() => decodeVictoryCode(encodeVictoryCode({ ...hunted, monsterId: 'nope' }))).toThrow(/unknown monster/);
    expect(() => decodeVictoryCode(encodeVictoryCode({ ...hunted, defeatedMonsterIds: ['nope'] }))).toThrow(
      /unknown monster/,
    );
    expect(() => decodeVictoryCode(encodeVictoryCode({ ...hunted, questId: 'quest-999' }))).toThrow(/unknown quest/);
    const played = victoryFromExpedition({
      ...playedExpedition(),
      trialScore: { answers: [1], total: 1 },
    }) as SharedVictory;
    expect(() => decodeVictoryCode(encodeVictoryCode({ ...played, scenarioId: 'nope-1' }))).toThrow(/unknown scenario/);
    const run = victoryFromChallenge(wonChallengeSession()) as SharedVictory;
    expect(() => decodeVictoryCode(encodeVictoryCode({ ...run, seriesId: 'nope' }))).toThrow(/unknown series/);
  });

  it('rejects records missing what their mode requires', () => {
    const base = victoryFromCampaign(wonCampaignHunt()) as SharedVictory;
    expect(() => decodeVictoryCode(encodeVictoryCode({ ...base, questId: null }))).toThrow(/missing its quest/);
    expect(() => decodeVictoryCode(encodeVictoryCode({ ...base, name: null }))).toThrow(/missing its name/);
    const summit = victoryFromCampaignFinal({ ...campaign(), finalBattleWon: true }) as SharedVictory;
    expect(() => decodeVictoryCode(encodeVictoryCode({ ...summit, endingId: null }))).toThrow(/missing its ending/);
    const challenge = victoryFromChallenge(wonChallengeSession()) as SharedVictory;
    expect(() => decodeVictoryCode(encodeVictoryCode({ ...challenge, seriesId: null }))).toThrow(/missing its series/);
  });
});
