import { describe, expect, it } from 'vitest';
import { TRIAL_SCORE_LEVELS, trialHuntById } from '../content';
import {
  clampAnswer,
  clampAnswers,
  nextRankingFor,
  rankingFor,
  scoreRecord,
  seriesSheet,
  tallyTrial,
  withWorksheetCaps,
  worksheetTotal,
} from './trial-score';

const trialByFire = trialHuntById('trial-by-fire')!;
const hunger = trialHuntById('hunger')!;
const jungleBane = trialHuntById('jungle-bane')!;
const korowon = trialHuntById('korowon-stole-christmas')!;

describe('worksheetTotal', () => {
  const modifiers = [
    { condition: 'each wound', kind: 'count' as const, points: 10, scope: 'always' as const },
    { condition: 'stance II reached', kind: 'flag' as const, points: 20, scope: 'victory' as const },
    { condition: 'each hunter down', kind: 'count' as const, points: -5, scope: 'always' as const },
  ];

  it('sums the base and counted modifiers', () => {
    expect(worksheetTotal(70, modifiers, [3, 1, 2])).toBe(70 + 30 + 20 - 10);
  });

  it('floors the total at zero', () => {
    expect(worksheetTotal(0, modifiers, [0, 0, 4])).toBe(0);
  });

  it('skips victory-scoped rows in defeat', () => {
    expect(worksheetTotal(0, modifiers, [3, 1, 2], true)).toBe(30 - 10);
    expect(worksheetTotal(0, modifiers, [3, 1, 2], false)).toBe(30 + 20 - 10);
  });
});

describe('tallyTrial', () => {
  it('sums base and applied modifiers', () => {
    const tally = tallyTrial(trialByFire, 'victory', [1, 1, 2, 1, 2]);
    expect(tally?.total).toBe(70 + 20 + 10 + 20 - 5 - 10);
  });

  it('counts victory-gated rows only in victory', () => {
    // Hunger scores in defeat, but only its always-rows count there.
    const defeat = tallyTrial(hunger, 'defeat', [3, 1, 1, 1, 1, 1]);
    expect(defeat?.total).toBe(3 * 10 - 5 - 5);
    // In victory the stance-II and nightmare rows join: 3 wounds, stance II, nightmare stances.
    const victory = tallyTrial(hunger, 'victory', [3, 1, 1, 0, 1, 1]);
    expect(victory?.total).toBe(3 * 10 + 20 + 10 - 5 - 5);
  });

  it('produces no score for a defeat on a victory-scored card', () => {
    expect(tallyTrial(trialByFire, 'defeat', [1, 1, 1, 1, 1])).toBeNull();
  });

  it('clamps answers to whole non-negative counts', () => {
    const tally = tallyTrial(trialByFire, 'victory', [-4, 1.7, 0, 0, 0]);
    expect(tally?.rows[0]?.count).toBe(0);
    expect(tally?.rows[1]?.count).toBe(1);
  });

  it('ranks by the highest tier reached, Rookie as the fallback', () => {
    expect(rankingFor(trialByFire.rankings, 130)?.name).toBe('Dragon Slayer');
    expect(rankingFor(trialByFire.rankings, 129)?.name).toBe('Beast Master');
    expect(rankingFor(trialByFire.rankings, 45)?.name).toBe('Rookie');
    expect(rankingFor(jungleBane.rankings, -10)?.name).toBe('Rookie');
  });

  it('keeps the row breakdown aligned with the printed modifiers', () => {
    const tally = tallyTrial(jungleBane, 'victory', [2, 1, 2, 1]);
    expect(tally?.rows.map((row) => row.contribution)).toEqual([20, -5, 20, -5]);
    expect(tally?.rows[2]?.modifier.condition).toContain('Reikal');
  });
});

describe('withWorksheetCaps', () => {
  // The standard sheet every run mode shares: the stance flag, the behavior cards, then
  // the two KO counts.
  const rows = TRIAL_SCORE_LEVELS[1].modifiers;

  it('caps the counters at the table facts: three cards, two own KOs, two per other hunter', () => {
    const capped = withWorksheetCaps(rows, { monsterId: 'kharja', partySize: 3 });
    expect(capped.map((row) => row.max)).toEqual([undefined, 3, 2, 4]);
    // The flag row and the printed questions pass through untouched.
    expect(capped[0]).toBe(rows[0]);
    expect(capped.map((row) => row.condition)).toEqual(rows.map((row) => row.condition));
  });

  it('lets the Awakened count nine behavior cards', () => {
    const capped = withWorksheetCaps(rows, { monsterId: 'the-awakened', partySize: 2 });
    expect(capped.map((row) => row.max)).toEqual([undefined, 9, 2, 2]);
  });

  it('leaves a lone hunter with no other-hunter KOs to count', () => {
    const capped = withWorksheetCaps(rows, { monsterId: 'kharja', partySize: 1 });
    expect(capped[3]?.max).toBe(0);
  });

  it('leaves count rows beyond the standard three at their own bounds', () => {
    const extended = [
      ...rows,
      { condition: 'each wound dealt', kind: 'count' as const, max: 6, points: 10, scope: 'always' as const },
    ];
    const capped = withWorksheetCaps(extended, { monsterId: 'kharja', partySize: 3 });
    expect(capped.map((row) => row.max)).toEqual([undefined, 3, 2, 4, 6]);
  });
});

describe('clampAnswer', () => {
  const flag = { condition: 'stance card', kind: 'flag' as const, points: 5, scope: 'always' as const };
  const counter = { condition: 'behavior cards', kind: 'count' as const, max: 2, points: 5, scope: 'always' as const };

  it('holds a flag row to zero or one', () => {
    expect(clampAnswer(flag, 1)).toBe(1);
    expect(clampAnswer(flag, 3)).toBe(1);
    expect(clampAnswer(flag, -3)).toBe(0);
    expect(clampAnswer(flag, 0.9)).toBe(0);
  });

  it('stops a counter at its printed cap and floors at zero', () => {
    expect(clampAnswer(counter, 7)).toBe(2);
    expect(clampAnswer(counter, -1)).toBe(0);
    expect(clampAnswer(counter, 1.9)).toBe(1);
  });

  it('leaves a counter without a printed cap unbounded above zero', () => {
    const uncapped = { condition: 'cards', kind: 'count' as const, points: 2, scope: 'always' as const };
    expect(clampAnswer(uncapped, 99)).toBe(99);
  });

  it('clamps every row against short and long answer arrays', () => {
    expect(clampAnswers([flag, counter], [2, 99, 5])).toEqual([1, 2]);
  });
});

describe('seriesSheet', () => {
  it('caps the counters at the table facts and pre-marks the stance row while the variant is on', () => {
    const sheet = seriesSheet(TRIAL_SCORE_LEVELS[1], { monsterId: 'toramat', nightmare: true, partySize: 2 });
    expect(sheet.rows.map((row) => row.max)).toEqual([undefined, 3, 2, 2]);
    expect(sheet.answers).toEqual([1, 0, 0, 0]);
  });

  it('leaves the answers at zero while the variant is off', () => {
    const sheet = seriesSheet(TRIAL_SCORE_LEVELS[1], { monsterId: 'toramat', nightmare: false, partySize: 2 });
    expect(sheet.answers).toEqual([0, 0, 0, 0]);
  });
});

describe('scoreRecord', () => {
  it('records the fight sheet with its answers clamped at the same caps the dialog fills', () => {
    // The Awakened fight allows nine behavior cards; the flag row is the stance card.
    const record = scoreRecord(TRIAL_SCORE_LEVELS[1], { monsterId: 'the-awakened', partySize: 3 }, [2, 99, -1, 1]);
    expect(record.answers).toEqual([1, 9, 0, 1]);
    expect(record.total).toBe(10 + 5 + 2 * 9 - 3);
  });
});

describe('nextRankingFor', () => {
  it('names the next tier up and the points still needed for it', () => {
    expect(nextRankingFor(trialByFire.rankings, 129)).toEqual({ name: 'Dragon Slayer', needed: 1 });
    expect(nextRankingFor(trialByFire.rankings, 110)).toEqual({ name: 'Dragon Slayer', needed: 20 });
    expect(nextRankingFor(trialByFire.rankings, 45)).toEqual({ name: 'Expert', needed: 20 });
  });

  it('runs out of tiers once the highest is reached', () => {
    expect(nextRankingFor(trialByFire.rankings, 130)).toBeUndefined();
    expect(nextRankingFor(trialByFire.rankings, 500)).toBeUndefined();
  });

  it('falls back to the catch-all tier when nothing is reached', () => {
    // Korowon's Rookie row prints no minimum: the catch-all for any total.
    expect(rankingFor(korowon.rankings, 0)?.name).toBe('Rookie');
    expect(nextRankingFor(korowon.rankings, 0)).toEqual({ name: 'Expert', needed: 65 });
  });
});
