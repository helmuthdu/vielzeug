import { computed, reactive, ref, type UnwrapNestedRefs, watch } from 'vue';
import { type MessageKey, t } from '../../../../app/i18n';
import { createPhaseRoutes } from '../../../../app/phase-routes';
import { campaigns, runCommand } from '../../../../app/store';
import { useReadable, useRouteParams } from '../../../../app/vue-bridge';
import {
  campaignAggression,
  chapterByNumber,
  finalBattle,
  hunterById,
  monsterById,
  questById,
  TOTAL_CHAPTERS,
  TRIAL_SCORE_LEVELS,
} from '../../../../content/index';
import { narrativeAvailable } from '../../../../content/lore';
import { campaignHuntersDeckStatus, huntersTrialCampaignOver, usesHuntersTrial } from '../../../../domain/campaign';
import type { ChapterEvent } from '../../../../domain/chapter-machine';
import { CHAPTER_PHASES, canTransition } from '../../../../domain/chapter-machine';
import { hunterScore, nightmareHunterTrialRank } from '../../../../domain/scoring';
import { type SeriesSheet, seriesSheet } from '../../../../domain/trial-score';
import type { ChapterPhase, SubjectRef } from '../../../../domain/types';

export const defeatedBackgrounds = [1, 2, 3].map((index) => `/backgrounds/bg_defeated_${index}.webp`);

const PHASE_KEY: Record<ChapterPhase, MessageKey> = {
  hunt: 'phases.hunt',
  preparing: 'phases.preparing',
  'quest-board': 'phases.questBoard',
  result: 'phases.result',
};

/**
 * The campaign dashboard as one reactive view model: chapter/quest derivation, the phase
 * machine actions, the hunt-outcome dialog state, and the live-session chip.
 * CampaignDashboardView calls this once and hands the model to its phase children as one prop.
 */
function createDashboard() {
  const params = useRouteParams();
  const all = useReadable(campaigns);
  const campaign = computed(() => all.value.find((entry) => entry.id === params.value.id));
  const chapter = computed(() => (campaign.value ? chapterByNumber(campaign.value.chapter) : undefined));
  const activeQuest = computed(() =>
    campaign.value?.activeQuestId ? questById(campaign.value.activeQuestId) : undefined,
  );
  const activeMonster = computed(() => (activeQuest.value ? monsterById(activeQuest.value.monsterId) : undefined));
  const resultQuest = computed(() => {
    if (activeQuest.value) return activeQuest.value;
    const completed = campaign.value?.quests.find(
      (entry) => entry.chapter === campaign.value?.chapter && entry.status === 'completed',
    );
    return completed ? questById(completed.questId) : undefined;
  });
  const resultConclusion = computed(() => {
    const quest = resultQuest.value;
    if (!quest) return null;
    const chapter =
      campaign.value?.quests.find((state) => state.questId === quest.id)?.chapter ?? campaign.value?.chapter ?? 0;
    const achievements = campaign.value?.achievements ?? [];
    const passages = quest.lore.conclusions.filter((passage) =>
      narrativeAvailable(passage.condition, chapter, achievements),
    );
    return {
      excerpt: passages.find((passage) => passage.condition)?.summary ?? passages[0]?.summary ?? quest.conclusion,
      paragraphs: passages.flatMap((passage) => passage.paragraphs),
    };
  });
  const resultMonster = computed(() => (resultQuest.value ? monsterById(resultQuest.value.monsterId) : undefined));
  const victoryBackground = computed(() =>
    resultQuest.value ? `/backgrounds/bg_victory_${((resultQuest.value.number - 1) % 3) + 1}.webp` : undefined,
  );
  const instructions = computed(
    () =>
      chapter.value?.instructions.filter(
        (entry) => !entry.expansionId || campaign.value?.expansionIds.includes(entry.expansionId),
      ) ?? [],
  );
  const resultRewards = computed(() => (resultQuest.value ? resultQuest.value.rewardResources : {}));
  const isLastChapter = computed(() => (campaign.value?.chapter ?? 0) >= TOTAL_CHAPTERS);
  const isFinalBattle = computed(() => campaign.value?.chapter === TOTAL_CHAPTERS);
  const phaseEntries = computed(() => {
    const ids: ChapterPhase[] = isFinalBattle.value
      ? ['preparing', 'hunt', 'result']
      : ['quest-board', 'preparing', 'hunt', 'result'];
    return ids.map((id) => ({
      id,
      label: t(
        id === 'hunt' && isFinalBattle.value
          ? 'phases.awakening'
          : id === 'result' && isFinalBattle.value
            ? 'phases.victory'
            : PHASE_KEY[id],
      ),
    }));
  });
  const finalEnding = computed(() =>
    campaign.value?.achievements.includes('The Voice of Woltyar')
      ? finalBattle.endings.rebirth
      : finalBattle.endings.dawn,
  );
  const finalConclusion = computed(() => {
    const chapter = campaign.value?.chapter ?? TOTAL_CHAPTERS;
    const achievements = campaign.value?.achievements ?? [];
    const passages = finalBattle.lore.conclusions.filter((passage) =>
      narrativeAvailable(passage.condition, chapter, achievements),
    );
    return {
      excerpt: passages.find((passage) => passage.condition)?.summary ?? passages[0]?.summary ?? finalBattle.conclusion,
      paragraphs: passages.flatMap((passage) => passage.paragraphs),
    };
  });
  const isHuntersTrial = computed(() => (campaign.value ? usesHuntersTrial(campaign.value) : false));
  const usesNightmare = computed(() => campaign.value?.nightmareVariant ?? false);
  const trialCampaignOver = computed(() => (campaign.value ? huntersTrialCampaignOver(campaign.value) : false));
  /** The run is over — final battle won or the trial's third defeat: no header or stepper past this point. */
  const campaignOver = computed(() => Boolean(campaign.value?.finalBattleWon) || trialCampaignOver.value);
  const finalHunterScore = computed(() => (campaign.value ? hunterScore(campaign.value) : null));
  const finalHunterRank = computed(() =>
    finalHunterScore.value !== null && usesNightmare.value ? nightmareHunterTrialRank(finalHunterScore.value) : null,
  );
  const finalBattleRules = computed(() => [
    ...finalBattle.rules,
    ...finalBattle.conditionalRules
      .filter((rule) => campaign.value?.achievements.includes(rule.achievement))
      .map(({ text, title }) => ({ text, title })),
  ]);
  const pendingOutcome = ref<'victory' | 'defeat' | null>(null);
  const pendingPhase = ref<ChapterPhase | null>(null);
  const selectedHunterId = ref('');
  const partyHunters = computed(
    () => campaign.value?.hunters.flatMap((member) => hunterById(member.hunterId) ?? []) ?? [],
  );
  watch(
    () => campaign.value?.hunters.map((member) => member.hunterId),
    (hunterIds) => {
      if (hunterIds?.length && !hunterIds.includes(selectedHunterId.value)) selectedHunterId.value = hunterIds[0] ?? '';
    },
    { immediate: true },
  );
  const preparingDeckStatuses = computed(() => (campaign.value ? campaignHuntersDeckStatus(campaign.value) : []));
  const invalidPreparingHunters = computed(() =>
    campaign.value?.phase === 'preparing' ? preparingDeckStatuses.value.filter((status) => !status.valid) : [],
  );
  const partyDeckStatus = computed<Record<string, boolean>>(() =>
    Object.fromEntries(preparingDeckStatuses.value.map((status) => [status.hunterId, status.valid])),
  );

  const subject = computed<SubjectRef | null>(() =>
    campaign.value ? { id: campaign.value.id, kind: 'campaign' } : null,
  );

  const phaseName = (phase: ChapterPhase) => t(PHASE_KEY[phase]);
  const send = (event: ChapterEvent) => {
    if (subject.value) runCommand('moveChapterPhase', subject.value, event);
  };
  const advance = () => {
    if (subject.value) runCommand('nextChapter', subject.value);
  };
  function requestRevisit(phase: ChapterPhase): void {
    if (phase !== campaign.value?.phase) pendingPhase.value = phase;
  }

  function confirmRevisit(): void {
    if (pendingPhase.value) send({ phase: pendingPhase.value, type: 'REVISIT' });
    pendingPhase.value = null;
  }

  // ── Phase routes ─────────────────────────────────────────────────────────
  // The shared step-route approach (see `createPhaseRoutes`): the phase is mirrored into the
  // URL as `/campaigns/:id/:phase`, transitions replace so back leaves the flow, mismatched
  // arrivals ask through the revisit dialog or bounce, and the bare dashboard URL
  // canonicalizes onto the current phase.

  const { bounceIfMismatched, followPhase, phaseHref, revisitPhases } = createPhaseRoutes<ChapterPhase>({
    canRevisit: (current, target) => canTransition(current, { phase: target, type: 'REVISIT' }),
    currentPhase: () => campaign.value?.phase ?? null,
    detailRoute: 'campaignDashboard',
    phaseRoute: 'campaignPhase',
    phases: CHAPTER_PHASES,
    requestRevisit,
    subjectId: () => campaign.value?.id ?? null,
  });

  /** Canceling a revisit the URL asked for bounces back to the campaign's actual phase. */
  function cancelRevisit(): void {
    pendingPhase.value = null;
    bounceIfMismatched();
  }

  function requestOutcome(outcome: 'defeat' | 'victory'): void {
    pendingOutcome.value = outcome;
  }

  function cancelOutcome(): void {
    pendingOutcome.value = null;
  }

  /** The trial victory's worksheet: the standard series sheet at the chapter's tier, its
   * rows the printed modifier questions and its answers fresh for the fight — the same
   * sheet the Winds fills at its aggression and the ascent at its chapters. The final
   * battle completes the campaign without a sheet: its victory is a plain confirmation. */
  const victorySheet = computed<SeriesSheet>(() => {
    const current = campaign.value;
    if (!current || !isHuntersTrial.value || isFinalBattle.value) return { answers: [], rows: [] };
    return seriesSheet(TRIAL_SCORE_LEVELS[campaignAggression(current.chapter)], {
      monsterId: activeMonster.value?.id,
      nightmare: usesNightmare.value,
      partySize: current.hunters.length,
    });
  });

  /** The sheet's preview base: the trial's standing sum plus this fight's own base, so the
   * live total previews the campaign sum the ladder will actually judge; the recorded slot
   * keeps the fight's own total. The final battle carries no sheet, so it carries no base. */
  const victorySheetBase = computed(() => {
    const current = campaign.value;
    if (!current || !isHuntersTrial.value || isFinalBattle.value) return 0;
    return (hunterScore(current) ?? 0) + TRIAL_SCORE_LEVELS[campaignAggression(current.chapter)].base;
  });

  function confirmOutcome(answers?: readonly number[]): void {
    const ref = subject.value;
    const outcome = pendingOutcome.value;
    if (ref && outcome) {
      runCommand('recordHuntResult', ref, outcome, outcome === 'victory' ? [...(answers ?? [])] : []);
    }
    pendingOutcome.value = null;
  }

  return {
    activeMonster,
    activeQuest,
    advance,
    campaign,
    campaignOver,
    cancelOutcome,
    cancelRevisit,
    chapter,
    confirmOutcome,
    confirmRevisit,
    defeatedBackgrounds,
    finalBattle,
    finalBattleRules,
    finalConclusion,
    finalEnding,
    finalHunterRank,
    finalHunterScore,
    followPhase,
    instructions,
    invalidPreparingHunters,
    isFinalBattle,
    isHuntersTrial,
    isLastChapter,
    partyDeckStatus,
    partyHunters,
    pendingOutcome,
    pendingPhase,
    phaseEntries,
    phaseHref,
    phaseName,
    requestOutcome,
    requestRevisit,
    resultConclusion,
    resultMonster,
    resultQuest,
    resultRewards,
    revisitPhases,
    selectedHunterId,
    send,
    subject,
    TOTAL_CHAPTERS,
    trialCampaignOver,
    usesNightmare,
    victoryBackground,
    victorySheet,
    victorySheetBase,
  };
}

export type Dashboard = ReturnType<typeof createDashboard>;
/** The dashboard model after reactive() unwraps its refs: the type children receive. */
export type DashboardModel = UnwrapNestedRefs<Dashboard>;

/** Creates the dashboard view model. Must be called during setup. */
export function useDashboard(): DashboardModel {
  return reactive(createDashboard());
}
