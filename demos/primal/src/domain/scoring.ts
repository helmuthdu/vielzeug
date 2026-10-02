import {
  campaignAggression,
  finalBattle,
  questById,
  TOTAL_CHAPTERS,
  TRIAL_SCORE_LEVELS,
  type TrialRanking,
  trialRankLevel,
  trialSeriesById,
} from '../content';
import { completeQuest, sendChapterEvent, usesHuntersTrial } from './campaign';
import { PrimalDomainError } from './errors';
import { appendHuntRecord } from './hunt-history';
import { stopHuntTimer } from './hunt-timer';
import { refillPotion } from './potion';
import { rankingFor, scoreRecord, scoreTotal } from './trial-score';
import type { Ascent, Campaign, Challenge, TrialScoreRecord } from './types';

/**
 * Hunt outcomes, Hunter's Trial scoring, Nightmare rankings, and campaign
 * statistics: everything that reads or records how well the party is doing.
 */

export type HuntOutcome = 'victory' | 'defeat';

/** One ladder row as the ranking ladder renders it: the tier's threshold, its flavor
 *  line, and — only for the Rookie catch-all — its ceiling. */
const tier = (name: string, minScore: number | null, maxScore?: number): TrialRanking => ({
  maxScore,
  minScore,
  name,
  text: trialRankLevel(name)?.text,
});

/** The trial's running score: the recorded hunt sheets added up, the Winds' own logic. */
export function hunterScore(campaign: Campaign): number | null {
  return usesHuntersTrial(campaign) ? scoreTotal(campaign.scores) : null;
}

/** The Hunter's Trial table, derived from the rulebook's own arithmetic: the campaign's
 *  eleven hunts fight at three aggression tiers (chapters 1–3, 4–7, 8–11), so a clean
 *  sweep — every hunt won, no KO, no cards — sums its bases to 170: Dragon Slayer's bar.
 *  The Nightmare behavior cards never mix levels into one deck (about three ship per
 *  level), so the reference plays stack one card at a time: the stance flag every hunt
 *  reaches 253 (Indomitable), one behavior card each 295 (Primal Beast), two each 337
 *  (Nightmare); every threshold rounds down to the five. The four mortal tiers below
 *  split the clean base evenly, each step a handful of KOs deep. The Rookie row is the
 *  catch-all below Expert, highest first like every ladder. */
export const nightmareHunterTrialLadder: readonly TrialRanking[] = [
  tier('Nightmare', 330),
  tier('Primal Beast', 290),
  tier('Indomitable', 250),
  tier('Dragon Slayer', 170),
  tier('Beast Master', 135),
  tier('Commander', 100),
  tier('Prime Hunter', 65),
  tier('Expert', 30),
  tier('Rookie', null, 30),
];

/** The tier a trial total earns on the Nightmare ladder; the Rookie row is the catch-all. */
export function nightmareHunterTrialRank(score: number): string {
  return rankingFor(nightmareHunterTrialLadder, score)?.name ?? 'Rookie';
}

/** The Ascent's summit table, the same rulebook derivation on the climb's three chapters
 *  (one per level): a clean sweep sums its bases to 45, the stance flag every chapter
 *  reaches 67, and — the Nightmare behavior cards never mix levels into one deck, about
 *  three ship per level — one behavior card each reaches 78, two each 89. Every
 *  threshold rounds down to the five. The mortal tiers split the clean base evenly;
 *  the Rookie row is the catch-all below Expert, highest first like every ladder. */
export const ascentSummitLadder: readonly TrialRanking[] = [
  tier('Nightmare', 85),
  tier('Primal Beast', 75),
  tier('Indomitable', 65),
  tier('Dragon Slayer', 45),
  tier('Beast Master', 40),
  tier('Commander', 30),
  tier('Prime Hunter', 20),
  tier('Expert', 10),
  tier('Rookie', null, 10),
];

/** The climb's score so far: the chapters' recorded worksheets added up. */
export function ascentTotal(ascent: Pick<Ascent, 'scores'>): number {
  return scoreTotal(ascent.scores);
}

/** The level the climb reaches on the summit ladder; the Rookie row is the catch-all. */
export function ascentSummitRank(score: number): string {
  return rankingFor(ascentSummitLadder, score)?.name ?? 'Rookie';
}

/** One chapter's recorded sheet: the standard series worksheet at the climb's level, its
 * answers clamped at the sheet's own caps for the fight's monster and party. */
export function ascentScoreRecord(
  ascent: Pick<Ascent, 'chapter' | 'hunters' | 'pending'>,
  answers: readonly number[],
): TrialScoreRecord {
  return scoreRecord(
    TRIAL_SCORE_LEVELS[ascent.chapter],
    { monsterId: ascent.pending?.monsterId, partySize: ascent.hunters.length },
    answers,
  );
}

/** The Winds series table, the same rulebook derivation on the series' most ambitious
 *  route — raise at every bounty, so the five expeditions fight at L1, L2, L3, L3, L3: a
 *  clean sweep sums its bases to 85, the stance flag every expedition reaches 127, and —
 *  the Nightmare behavior cards never mix levels into one deck, about three ship per
 *  level — one behavior card each reaches 148, two each 169; every threshold rounds down
 *  to the five. The mortal tiers split the clean base evenly; the Rookie row is the
 *  catch-all below Expert, highest first like every ladder. */
export const challengeLadder: readonly TrialRanking[] = [
  tier('Nightmare', 165),
  tier('Primal Beast', 145),
  tier('Indomitable', 125),
  tier('Dragon Slayer', 85),
  tier('Beast Master', 70),
  tier('Commander', 50),
  tier('Prime Hunter', 35),
  tier('Expert', 15),
  tier('Rookie', null, 15),
];

/** The run's final score: the recorded expedition sheets added up. */
export const challengeTotal = (run: Pick<Challenge, 'scores'>): number => scoreTotal(run.scores);

/** The tier a total earns on the Winds ladder; the Rookie row is the catch-all. */
export function challengeRank(total: number): string {
  return rankingFor(challengeLadder, total)?.name ?? 'Rookie';
}

/** One expedition's recorded sheet: the standard series worksheet at the run's aggression,
 * its answers clamped at the sheet's own caps for the fight's monster and party. */
export function challengeScoreRecord(
  run: Pick<Challenge, 'aggression' | 'hunters' | 'pending' | 'seriesId'>,
  answers: readonly number[],
): TrialScoreRecord {
  const level = trialSeriesById(run.seriesId)?.scoreLevels[run.aggression];
  if (!level) throw new PrimalDomainError('challenge-series', 'The series has no score table for its level.');
  return scoreRecord(level, { monsterId: run.pending?.monsterId, partySize: run.hunters.length }, answers);
}

function settleConsumedPotions(campaign: Campaign, restore: boolean): Campaign {
  return {
    ...campaign,
    hunters: campaign.hunters.map((hunter) => {
      if (restore || !hunter.consumedPotionIds.length) return { ...hunter, consumedPotionIds: [] };
      // Reward potions refill after every hunt: only crafted ones are spent on victory.
      const reward = new Set(hunter.rewardPotionIds);
      const spent = new Set(hunter.consumedPotionIds.filter((id) => !reward.has(id)));
      return {
        ...hunter,
        consumedPotionIds: [],
        potionInventoryIds: hunter.potionInventoryIds.filter((id) => !spent.has(id)),
        // Spelled out per slot: the loadout is a fixed three-slot tuple, and map would widen it.
        potionLoadoutIds: [
          refillPotion(hunter.potionLoadoutIds[0], spent),
          refillPotion(hunter.potionLoadoutIds[1], spent),
          refillPotion(hunter.potionLoadoutIds[2], spent),
        ],
      };
    }),
  };
}

/**
 * Records the outcome of the chapter's hunt with its score sheet. Victory completes the
 * active quest and moves to the Result phase; defeat counts against the campaign and keeps
 * the quest active so the hunt can be retried after another Preparation phase unless
 * Hunter's Trial ends the campaign. A trial quest victory carries the sheet's answers and
 * their tally — the standard series worksheet at the chapter's aggression — while the
 * final battle completes the campaign without a sheet: the trial's score is its eleven
 * quest hunts' sheets summed.
 */
export function finishHunt(
  campaign: Campaign,
  outcome: HuntOutcome,
  answers: readonly number[],
  now: string,
): Campaign {
  if (campaign.phase !== 'hunt') {
    throw new PrimalDomainError('phase-transition', 'Results can only be recorded during the Hunt phase.');
  }
  const isFinalBattle = campaign.chapter === TOTAL_CHAPTERS && campaign.resolvedChapter === TOTAL_CHAPTERS;
  if (!campaign.activeQuestId && !isFinalBattle) {
    throw new PrimalDomainError('quest-state', 'No quest is active for this hunt.');
  }
  const activeQuest = campaign.activeQuestId ? questById(campaign.activeQuestId) : undefined;
  const monsterId = activeQuest?.monsterId ?? (isFinalBattle ? finalBattle.monsterId : null);
  if (!monsterId) throw new PrimalDomainError('quest-state', 'No monster is active for this hunt.');
  const next = sendChapterEvent(campaign, { type: 'RECORD_RESULT' }, now);
  const timed = {
    ...next,
    huntHistory: appendHuntRecord(campaign, monsterId, outcome, now),
    huntTimer: stopHuntTimer(campaign.huntTimer, now),
  };
  if (outcome === 'defeat') return recordDefeat(settleConsumedPotions(timed, true), now);

  const completed = isFinalBattle
    ? { ...timed, finalBattleWon: true }
    : completeQuest(timed, campaign.activeQuestId as string, now);
  const settled = settleConsumedPotions(completed, false);
  if (!usesHuntersTrial(campaign) || isFinalBattle) {
    return { ...settled, defeats: 0, totalDefeats: campaign.totalDefeats + campaign.defeats };
  }

  // The quest hunt's worksheet, the standard series sheet at the chapter's aggression
  // (chapters 1–3 the first level, 4–7 the second, 8–11 the summit's): the eleven sheets
  // sum to the trial's score, so a retried or re-recorded hunt re-fills its own slot. The
  // final battle completes the campaign without a sheet of its own. The recorded answers
  // clamp at the sheet's own caps, whatever the wire carried.
  const scores = [...settled.scores];
  scores[campaign.chapter - 1] = scoreRecord(
    TRIAL_SCORE_LEVELS[campaignAggression(campaign.chapter)],
    { monsterId, partySize: campaign.hunters.length },
    answers,
  );
  return {
    ...settled,
    defeats: 0,
    scores,
    totalDefeats: campaign.totalDefeats + campaign.defeats,
  };
}

// ---------------------------------------------------------------------------
// Bookkeeping
// ---------------------------------------------------------------------------

export function recordAchievement(campaign: Campaign, achievement: string, now: string): Campaign {
  if (campaign.achievements.includes(achievement)) return campaign;
  return { ...campaign, achievements: [...campaign.achievements, achievement], updatedAt: now };
}

export function recordDefeat(campaign: Campaign, now: string): Campaign {
  return { ...campaign, defeats: campaign.defeats + 1, updatedAt: now };
}

export interface CampaignStatistics {
  achievements: number;
  chaptersCompleted: number;
  hunterScore: number | null;
  questsCompleted: number;
  questsExpired: number;
  totalDefeats: number;
  trophies: number;
}

export function campaignStatistics(campaign: Campaign): CampaignStatistics {
  return {
    achievements: campaign.achievements.length,
    chaptersCompleted: campaign.chapter - 1,
    hunterScore: hunterScore(campaign),
    questsCompleted: campaign.quests.filter((quest) => quest.status === 'completed').length,
    questsExpired: campaign.quests.filter((quest) => quest.status === 'expired').length,
    totalDefeats: campaign.totalDefeats,
    trophies: campaign.trophies.length,
  };
}
