import { base64UrlToText, textToBase64Url } from '@vielzeug/arsenal';
import { s } from '@vielzeug/spell';
import {
  finalBattle,
  hunterById,
  monsterById,
  questById,
  scenarioById,
  TOTAL_CHAPTERS,
  trialSeriesById,
} from '../content';
import { ascentSummitRank, ascentTotal } from './ascent';
import { huntersTrialScore, nightmareHunterTrialRank } from './campaign';
import { CHALLENGE_EXPEDITIONS_TOTAL, challengeRank, challengeTotal } from './challenge';
import { PrimalDomainError } from './errors';
import { RUN_NAME_MAX } from './run';
import type { Ascent, Campaign, Challenge, Expedition } from './types';

/**
 * Victory codes let players pass a resolved hunt record between devices as text, a link or a QR
 * code: the "we beat it" counterpart of a build code. Like build codes the payload references
 * content by stable ids (never embedded) plus the few numbers a result carries, wrapped as
 * base64url JSON with a version literal. Unlike build codes nothing campaign-shaped travels:
 * the record is a summary to read, not state to import.
 */
const VICTORY_CODE_VERSION = 1;

/** The modes that resolve into a shareable victory. */
export type VictoryMode = 'ascent' | 'campaign-final' | 'campaign-hunt' | 'challenge' | 'expedition';

const VICTORY_MODES = ['ascent', 'campaign-final', 'campaign-hunt', 'challenge', 'expedition'] as const;

/** One resolved hunt's shareable summary: what the poster draws and the record view shows. */
export interface SharedVictory {
  /** Campaign/ascent chapter the victory happened in; null where chapters do not apply. */
  chapter: number | null;
  /** Every distinct monster the subject beat, in first-kill order; null where the mode does not track kills. */
  defeatedMonsterIds: string[] | null;
  /** The fight's stopwatch total, frozen when the result was recorded. */
  durationMs: number | null;
  /** Which printed ending the campaign concluded with; campaign-final only. */
  endingId: 'dawn' | 'rebirth' | null;
  /** The Winds expedition counter at the victory; challenge only. */
  expeditionNumber: number | null;
  /** True when the victory also finished the run: the summit, the fifth expedition, the final battle. */
  finished: boolean;
  /** The party lineup, in board order; portraits resolve through the hunter catalog. */
  hunterIds: string[];
  mode: VictoryMode;
  /** The hunted monster; the trophy and banner art resolve through the monster catalog. */
  monsterId: string | null;
  /** The subject's name; null for expeditions, which are named by their monster and scenario. */
  name: string | null;
  /** The completed quest; campaign-hunt only. */
  questId: string | null;
  /** The trial-card scenario; expedition only. */
  scenarioId: string | null;
  /** The recorded score: trial tally, Winds total, Hunter's Trial or summit score; null where none exists. */
  score: number | null;
  /** The Winds series the run plays; challenge only. */
  seriesId: string | null;
}

const codeSchema = s.object({
  b: s.array(s.string().min(1)).unique().max(24).nullable(),
  c: s.number().int().min(1).max(TOTAL_CHAPTERS).nullable(),
  d: s.number().int().min(0).nullable(),
  e: s.enum(['dawn', 'rebirth'] as const).nullable(),
  f: s.boolean(),
  h: s.array(s.string().min(1)).unique().min(1).max(5),
  m: s.enum(VICTORY_MODES),
  n: s.string().min(1).max(RUN_NAME_MAX).nullable(),
  q: s.string().min(1).nullable(),
  r: s.string().min(1).nullable(),
  s: s.string().min(1).nullable(),
  t: s.number().int().min(0).nullable(),
  v: s.literal(VICTORY_CODE_VERSION),
  x: s.number().int().min(1).max(CHALLENGE_EXPEDITIONS_TOTAL).nullable(),
  z: s.string().min(1).nullable(),
});

const invalid = (message: string) => new PrimalDomainError('victory-invalid', message);

export function encodeVictoryCode(victory: SharedVictory): string {
  return textToBase64Url(
    JSON.stringify({
      b: victory.defeatedMonsterIds,
      c: victory.chapter,
      d: victory.durationMs,
      e: victory.endingId,
      f: victory.finished,
      h: victory.hunterIds,
      m: victory.mode,
      n: victory.name,
      q: victory.questId,
      r: victory.scenarioId,
      s: victory.monsterId,
      t: victory.score,
      v: VICTORY_CODE_VERSION,
      x: victory.expeditionNumber,
      z: victory.seriesId,
    }),
  );
}

export function decodeVictoryCode(code: string): SharedVictory {
  let parsed: unknown;
  try {
    parsed = JSON.parse(base64UrlToText(code.trim()));
  } catch {
    throw invalid('That is not a Primal hunt record code.');
  }
  const result = codeSchema.safeParse(parsed);
  if (!result.success) throw invalid('That hunt record code is not supported.');
  const { b, c, d, e, f, h, m, n, q, r, s, t, x, z } = result.data;
  for (const id of h) {
    if (!hunterById(id)) throw invalid(`The hunt record names unknown hunter "${id}".`);
  }
  if (s && !monsterById(s)) throw invalid(`The hunt record names unknown monster "${s}".`);
  for (const id of b ?? []) {
    if (!monsterById(id)) throw invalid(`The hunt record names unknown monster "${id}".`);
  }
  if (q && !questById(q)) throw invalid(`The hunt record names unknown quest "${q}".`);
  if (r && !scenarioById(r)) throw invalid(`The hunt record names unknown scenario "${r}".`);
  if (z && !trialSeriesById(z)) throw invalid(`The hunt record names unknown series "${z}".`);
  const victory: SharedVictory = {
    chapter: c,
    defeatedMonsterIds: b,
    durationMs: d,
    endingId: e,
    expeditionNumber: x,
    finished: f,
    hunterIds: h,
    mode: m,
    monsterId: s,
    name: n,
    questId: q,
    scenarioId: r,
    score: t,
    seriesId: z,
  };
  for (const [field, present] of Object.entries(modeRequirements(victory))) {
    if (!present) throw invalid(`That hunt record is missing its ${field}.`);
  }
  return victory;
}

/** What each mode must carry so a decoded record can render its poster and stats. */
function modeRequirements(victory: SharedVictory): Record<string, boolean> {
  switch (victory.mode) {
    case 'campaign-hunt':
      return {
        chapter: victory.chapter !== null,
        name: victory.name !== null,
        quest: victory.questId !== null,
        trophies: victory.defeatedMonsterIds !== null,
      };
    case 'campaign-final':
      return {
        ending: victory.endingId !== null,
        name: victory.name !== null,
        trophies: victory.defeatedMonsterIds !== null,
      };
    case 'expedition':
      return { monster: victory.monsterId !== null, scenario: victory.scenarioId !== null };
    case 'challenge':
      return {
        expeditionNumber: victory.expeditionNumber !== null,
        name: victory.name !== null,
        score: victory.score !== null,
        series: victory.seriesId !== null,
        trophies: victory.defeatedMonsterIds !== null,
      };
    case 'ascent':
      return {
        chapter: victory.chapter !== null,
        name: victory.name !== null,
        trophies: victory.defeatedMonsterIds !== null,
      };
  }
}

/** The quest a campaign's result screen resolves: the active one, else the chapter's completed quest. */
function campaignResultQuest(campaign: Campaign) {
  if (campaign.activeQuestId) {
    const quest = questById(campaign.activeQuestId);
    if (quest) return quest;
  }
  for (let index = campaign.quests.length - 1; index >= 0; index -= 1) {
    const state = campaign.quests[index];
    if (state.chapter === campaign.chapter && state.status === 'completed') {
      const quest = questById(state.questId);
      if (quest) return quest;
    }
  }
  return undefined;
}

/** A campaign's hunt result, or null while the current result is a defeat or nothing is resolved. */
export function victoryFromCampaign(campaign: Campaign): SharedVictory | null {
  if (campaign.defeats > 0) return null;
  const quest = campaignResultQuest(campaign);
  if (!quest) return null;
  return {
    chapter: campaign.chapter,
    defeatedMonsterIds: [...campaign.trophies],
    durationMs: campaign.huntTimer.durationMs,
    endingId: null,
    expeditionNumber: null,
    finished: false,
    hunterIds: campaign.hunters.map((member) => member.hunterId),
    mode: 'campaign-hunt',
    monsterId: quest.monsterId,
    name: campaign.name,
    questId: quest.id,
    scenarioId: null,
    score: huntersTrialScore(campaign),
    seriesId: null,
  };
}

/** The campaign's closing record, or null until the final battle is won. */
export function victoryFromCampaignFinal(campaign: Campaign): SharedVictory | null {
  if (!campaign.finalBattleWon) return null;
  return {
    chapter: TOTAL_CHAPTERS,
    defeatedMonsterIds: [...campaign.trophies],
    durationMs: campaign.huntTimer.durationMs,
    endingId: campaign.achievements.includes('The Voice of Woltyar') ? 'rebirth' : 'dawn',
    expeditionNumber: null,
    finished: true,
    hunterIds: campaign.hunters.map((member) => member.hunterId),
    mode: 'campaign-final',
    monsterId: finalBattle.monsterId,
    name: campaign.name,
    questId: null,
    scenarioId: null,
    score: huntersTrialScore(campaign),
    seriesId: null,
  };
}

/** An expedition's played result, or null while it is unplayed or lost. */
export function victoryFromExpedition(expedition: Expedition): SharedVictory | null {
  if (expedition.status !== 'played' || expedition.result !== 'victory') return null;
  return {
    chapter: null,
    defeatedMonsterIds: null,
    durationMs: expedition.huntTimer.durationMs,
    endingId: null,
    expeditionNumber: null,
    finished: false,
    hunterIds: expedition.hunters.map((member) => member.hunterId),
    mode: 'expedition',
    monsterId: expedition.monsterId,
    name: null,
    questId: null,
    scenarioId: expedition.scenarioId,
    score: expedition.trialScore?.total ?? null,
    seriesId: null,
  };
}

/** A Winds run's victory, or null until one expedition is won. */
export function victoryFromChallenge(run: Challenge): SharedVictory | null {
  if (run.result !== 'victory') return null;
  return {
    chapter: null,
    defeatedMonsterIds: [...run.defeatedMonsterIds],
    durationMs: run.huntTimer.durationMs,
    endingId: null,
    expeditionNumber: run.expeditionNumber,
    finished: run.status === 'finished',
    hunterIds: run.hunters.map((member) => member.hunterId),
    mode: 'challenge',
    // The record clears the rolled encounter, so the hunt's monster is the run's newest trophy.
    monsterId: run.defeatedMonsterIds.at(-1) ?? null,
    name: run.name,
    questId: null,
    scenarioId: null,
    score: challengeTotal(run),
    seriesId: run.seriesId,
  };
}

/** An ascent's victory, or null until a chapter is won. */
export function victoryFromAscent(ascent: Ascent): SharedVictory | null {
  if (ascent.result !== 'victory') return null;
  return {
    chapter: ascent.chapter,
    defeatedMonsterIds: [...ascent.defeatedMonsterIds],
    durationMs: ascent.huntTimer.durationMs,
    endingId: null,
    expeditionNumber: null,
    finished: ascent.status === 'finished',
    hunterIds: ascent.hunters.map((member) => member.hunterId),
    mode: 'ascent',
    monsterId: ascent.pending?.monsterId ?? ascent.defeatedMonsterIds.at(-1) ?? null,
    name: ascent.name,
    questId: null,
    scenarioId: null,
    score: ascentTotal(ascent),
    seriesId: null,
  };
}

/** The named rank a victory's score earned: the Winds tier, the Hunter's Trial rank or the
 *  summit ladder's level. */
export function victoryRank(victory: SharedVictory): string | null {
  if (victory.mode === 'challenge' && victory.seriesId && victory.score !== null) {
    return challengeRank(victory.score);
  }
  if (victory.mode === 'campaign-final' && victory.score !== null) {
    return nightmareHunterTrialRank(victory.score);
  }
  if (victory.mode === 'ascent' && victory.score !== null) {
    return ascentSummitRank(victory.score);
  }
  return null;
}
