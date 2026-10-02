import type { TrialHunt, TrialRanking, TrialScoreModifier, TrialSeriesScoringLevel } from '../content';
import type { HuntOutcome } from './scoring';
import type { TrialScoreRecord } from './types';

/** The worksheet's answers: one occurrence count per scoring modifier, in printed order. */
export type TrialScoreAnswers = readonly number[];

/** One worksheet row: the printed modifier, how often it applied and what it contributed. */
export interface TrialScoreRow {
  contribution: number;
  count: number;
  modifier: TrialScoreModifier;
}

export interface TrialScore {
  ranking: TrialRanking | undefined;
  rows: TrialScoreRow[];
  total: number;
}

/**
 * The answer one worksheet row can record: floored at zero, a flag row holds 0 or 1, and a
 * counter stops at its printed cap — the physical sheet cannot be ticked past either. The
 * domain runs every recorded sheet through this, so the wire cannot out-tick the sheet.
 */
export function clampAnswer(modifier: TrialScoreModifier, answer: number): number {
  const count = Math.max(0, Math.trunc(answer));
  if (modifier.kind === 'flag') return count > 0 ? 1 : 0;
  return modifier.max === undefined ? count : Math.min(count, modifier.max);
}

/** Every row's answer, clamped to the sheet it is recorded on. */
export function clampAnswers(modifiers: readonly TrialScoreModifier[], answers: readonly number[]): number[] {
  return modifiers.map((modifier, index) => clampAnswer(modifier, answers[index] ?? 0));
}

/** The run's running score: the recorded sheets' totals added up. */
export const scoreTotal = (scores: readonly TrialScoreRecord[]): number =>
  scores.reduce((total, score) => total + score.total, 0);

/**
 * The worksheet's live total: the base plus every counted modifier, floored at zero.
 * Victory-scoped rows never count in defeat. Both score surfaces run this: the Hunter's
 * Trial sheet and the Winds reward dialog, so the displayed total always matches the saved one.
 */
export function worksheetTotal(
  base: number,
  modifiers: readonly TrialScoreModifier[],
  counts: readonly number[],
  defeat = false,
): number {
  let total = base;
  for (const [index, modifier] of modifiers.entries()) {
    if (defeat && modifier.scope === 'victory') continue;
    total += modifier.points * Math.max(0, Math.trunc(counts[index] ?? 0));
  }
  return Math.max(0, total);
}

/**
 * Tallies a trial card's score from the worksheet answers. Most inputs are table facts the
 * companion does not track (wounds dealt, rounds reached, exiled cards), so the sheet is filled
 * by hand; this only does the arithmetic. Cards that score on victory alone produce no score in
 * defeat, and victory-gated rows never count in defeat.
 */
export function tallyTrial(hunt: TrialHunt, result: HuntOutcome, answers: TrialScoreAnswers): TrialScore | null {
  if (result === 'defeat' && !hunt.scoring.scoredOnDefeat) return null;
  const counts = clampAnswers(hunt.scoring.modifiers, answers);
  const rows: TrialScoreRow[] = [];
  for (const [index, modifier] of hunt.scoring.modifiers.entries()) {
    const count = counts[index] ?? 0;
    const applies = modifier.scope === 'always' || result === 'victory';
    rows.push({ contribution: applies ? modifier.points * count : 0, count, modifier });
  }
  const total = worksheetTotal(hunt.scoring.base, hunt.scoring.modifiers, counts, result === 'defeat');
  return { ranking: trialRankingFor(hunt, total), rows, total };
}

/**
 * The standard worksheet's counter caps, written onto its modifier rows: the table's own
 * facts, so the tally never counts past what a fight can print — three Nightmare behavior
 * cards (nine against the Awakened, whose deck joins every level's set), two own KOs, and
 * two KOs per other hunter at the table. The rows are the shared sheet's own — the stance
 * flag, the behavior cards, then the two KO counts — in printed order; other sheets (the
 * solo hunts' printed cards) carry their own maxes and pass through untouched.
 */
export function withWorksheetCaps(
  modifiers: readonly TrialScoreModifier[],
  fight: { monsterId: string | null | undefined; partySize: number },
): TrialScoreModifier[] {
  const caps = [fight.monsterId === 'the-awakened' ? 9 : 3, 2, Math.max(0, (fight.partySize - 1) * 2)];
  let next = 0;
  return modifiers.map((modifier) => {
    if (modifier.kind !== 'count') return modifier;
    const cap = caps[next++];
    return cap === undefined ? modifier : { ...modifier, max: cap };
  });
}

/** The standard worksheet as a score dialog opens it: its capped rows and its fresh answers. */
export interface SeriesSheet {
  answers: number[];
  rows: TrialScoreModifier[];
}

/**
 * The standard series worksheet composed for one fight: the counters capped at the
 * table's own facts, and while the run plays the Nightmare variant the stance row opens
 * marked — the party answers the questions it actually varied.
 */
export function seriesSheet(
  level: TrialSeriesScoringLevel,
  fight: { monsterId: string | null | undefined; nightmare: boolean; partySize: number },
): SeriesSheet {
  const rows = withWorksheetCaps(level.modifiers, fight);
  const answers = rows.map(() => 0);
  if (fight.nightmare && rows[0]?.kind === 'flag') answers[0] = 1;
  return { answers, rows };
}

/**
 * The sheet one series fight records: its answers clamped to the same capped rows the
 * dialog fills, and the tally taken from them — the fight's own total, not the run's.
 */
export function scoreRecord(
  level: TrialSeriesScoringLevel,
  fight: { monsterId: string | null | undefined; partySize: number },
  answers: readonly number[],
): TrialScoreRecord {
  const modifiers = withWorksheetCaps(level.modifiers, fight);
  const counts = clampAnswers(modifiers, answers);
  return { answers: counts, total: worksheetTotal(level.base, modifiers, counts) };
}

/** The highest tier whose minimum the total reaches; the Rookie row is the catch-all. */
export function rankingFor(rankings: readonly TrialRanking[], total: number): TrialRanking | undefined {
  return rankings.find((tier) => tier.minScore !== null && total >= tier.minScore) ?? rankings.at(-1);
}

/**
 * The next tier up and how many points the total still needs for it: `undefined` once the
 * highest tier is reached. Rankings print highest-first, so the tier above the reached one
 * sits before it in the list.
 */
export function nextRankingFor(
  rankings: readonly TrialRanking[],
  total: number,
): { name: string; needed: number } | undefined {
  const reached = rankingFor(rankings, total);
  const above = reached ? rankings[rankings.indexOf(reached) - 1] : undefined;
  return above?.minScore != null ? { name: above.name, needed: above.minScore - total } : undefined;
}

/** The highest tier whose minimum the total reaches; the Rookie row is the catch-all. */
export function trialRankingFor(hunt: TrialHunt, total: number): TrialRanking | undefined {
  return rankingFor(hunt.rankings, total);
}
