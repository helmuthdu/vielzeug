<script lang="ts" setup>
import { computed, ref } from 'vue';
import { formatDuration } from '../../../../app/format';
import { t } from '../../../../app/i18n';
import { useMediaQuery } from '../../../../app/vue-bridge';
import { monsterById } from '../../../../content';
import { nightmareHunterTrialLadder } from '../../../../domain/campaign';
import { victoryFromCampaign, victoryFromCampaignFinal } from '../../../../domain/victory';
import LinkButton from '../../../components/LinkButton.vue';
import LoreEntry from '../../../components/LoreEntry.vue';
import PhaseBackButton from '../../../components/PhaseBackButton.vue';
import PhaseDock from '../../../components/PhaseDock.vue';
import ResourceIcon from '../../../components/ResourceIcon.vue';
import ResultBanner from '../../../components/ResultBanner.vue';
import ScoreRankingLadder from '../../../components/scoring/ScoreRankingLadder.vue';
import ShareDialog from '../../../components/share/ShareDialog.vue';
import { type ShareSubject, victoryShareSubject } from '../../../components/share/share-subject';
import { type DashboardModel, defeatedBackgrounds } from './use-dashboard';
import '@vielzeug/refine/button';
import '@vielzeug/refine/card';
import '@vielzeug/refine/chip';
import '@vielzeug/refine/text';

const props = defineProps<{ dashboard: DashboardModel }>();

/** The shared hunt record this result screen resolves, opened on demand. */
const sharing = ref<ShareSubject | null>(null);

/** The campaign's trophies so far: the circular portrait row the result banner carries. */
const trophyIcons = computed(() =>
  props.dashboard.campaign?.trophies.flatMap((id) => {
    const defeated = monsterById(id);
    return defeated ? [defeated.trophyIcon] : [];
  }) ?? [],
);

/** The final battle's record wins over the hunt's when the campaign is complete. */
function shareVictory(): void {
  const campaign = props.dashboard.campaign;
  if (!campaign) return;
  const victory = victoryFromCampaignFinal(campaign) ?? victoryFromCampaign(campaign);
  if (victory) sharing.value = victoryShareSubject(victory);
}

/* The result's commit reads as an icon on phones: the verb rides its aria. */
const isPhone = useMediaQuery('(width < 640px)');
</script>

<template>
  <div class="final-result phase-flow" style="--phase-gap: var(--size-4)" v-if="dashboard.isFinalBattle">
    <ResultBanner :defeat-images="dashboard.campaign?.finalBattleWon ? undefined : defeatedBackgrounds"
      :defeated="!dashboard.campaign?.finalBattleWon" :emblem-icon="dashboard.finalBattle.icon"
      :final="Boolean(dashboard.campaign?.finalBattleWon)"
      :image="dashboard.campaign?.finalBattleWon ? '/backgrounds/bg_final_1.webp' : undefined"
      :overline="dashboard.campaign?.finalBattleWon
        ? t('dashboard.campaignComplete')
        : dashboard.trialCampaignOver
          ? t('dashboard.trialFailed')
          : t('dashboard.awakeningFailed')"
      :score="dashboard.finalHunterScore"
      :title="dashboard.campaign?.finalBattleWon
        ? t('dashboard.awakenedDefeated')
        : dashboard.trialCampaignOver
          ? t('dashboard.campaignOver')
          : t('dashboard.stormRages')"
      :trophy-icons="dashboard.campaign?.finalBattleWon ? trophyIcons : undefined">
      <!-- The victory's story lives in the journal bands below the banner; only a defeat
           still needs its short regroup note. -->
      <template v-if="!dashboard.campaign?.finalBattleWon" #lead >
        {{ dashboard.trialCampaignOver ? t('dashboard.trialOverTrack') : t('dashboard.dragonSurvives') }}
      </template>
    </ResultBanner>
    <template v-if="dashboard.campaign?.finalBattleWon">
      <ore-card class="lore-band" padding="none">
        <LoreEntry :excerpt="dashboard.finalConclusion.excerpt" :lore="dashboard.finalConclusion.paragraphs.join(' ')"
          :overline="t('dashboard.finalBattleConclusion')" />
      </ore-card>
      <ore-card class="lore-band" padding="none">
        <LoreEntry :excerpt="dashboard.finalBattle.lore.vision.summary"
          :lore="dashboard.finalBattle.lore.vision.paragraphs.join(' ')" :overline="t('dashboard.bloodVision')" />
      </ore-card>
      <section class="final-result__ending">
        <ore-text as="h4" size="md" variant="heading">{{ dashboard.finalEnding.title }}</ore-text>
        <ore-card class="lore-band" padding="none">
          <LoreEntry :excerpt="dashboard.finalEnding.summary" :lore="dashboard.finalEnding.paragraphs.join(' ')"
            :overline="t('dashboard.campaignEnding')" />
        </ore-card>
      </section>
    </template>
    <!-- The trial's closing comparison ends the page: the final score against the Nightmare
         ladder, read after the story it settles. -->
    <div class="final-result__ranking" v-if="dashboard.finalHunterRank">
      <ore-text color="muted" variant="caption">{{ t('dashboard.scoreHint') }}</ore-text>
      <ore-text variant="overline">{{ dashboard.finalHunterRank }}</ore-text>
      <ScoreRankingLadder :rankings="nightmareHunterTrialLadder" :total="dashboard.finalHunterScore ?? 0" />
    </div>
    <!-- The final battle's dock: the retry rides the back while the Awakened stands, the
         share rides the front once it falls, and the logs link rides both ends. -->
    <PhaseDock v-if="!dashboard.trialCampaignOver">
      <template #back>
        <PhaseBackButton v-if="!dashboard.campaign?.finalBattleWon" :label="t('dashboard.returnToPreparation')"
          @back="dashboard.send({ type: 'RETRY_HUNT' })" />
      </template>
      <LinkButton to="campaignLog" variant="bordered" :icon-only="isPhone" :label="t('dashboard.viewLogs')" :params="{ id: dashboard.campaign?.id ?? '' }"
        :rounded="isPhone ? 'full' : undefined" >
        <ore-icon name="scroll" v-if="isPhone" />
        <template v-if="!isPhone">{{ t('dashboard.viewLogs') }}</template>
      </LinkButton>
      <ore-button color="secondary" variant="bordered" v-if="dashboard.campaign?.finalBattleWon" :icon-only="isPhone" :label="t('victory.share')"
        :rounded="isPhone ? 'full' : undefined" @click="shareVictory">
        <ore-icon name="share-2" v-if="isPhone" />
        <template v-if="!isPhone">{{ t('victory.share') }}</template>
      </ore-button>
    </PhaseDock>

    <ShareDialog :subject="sharing" @close="sharing = null" />
  </div>
  <div class="phase-screen phase-screen--result phase-flow" v-else-if="dashboard.campaign"
    :class="{ 'phase-screen--defeat': dashboard.campaign.defeats }">
    <ResultBanner :defeat-images="dashboard.campaign.defeats ? defeatedBackgrounds : undefined"
      :defeated="Boolean(dashboard.campaign.defeats)" :emblem-icon="dashboard.resultMonster?.trophyIcon"
      :image="dashboard.campaign.defeats ? undefined : dashboard.victoryBackground"
      :overline="dashboard.trialCampaignOver
        ? t('dashboard.trialFailed')
        : dashboard.campaign.defeats
          ? t('dashboard.huntFailed')
          : t('dashboard.questComplete')"
      :score="dashboard.isHuntersTrial ? dashboard.finalHunterScore : null"
      :title="dashboard.trialCampaignOver
        ? t('dashboard.campaignOver')
        : dashboard.campaign.defeats
          ? t('dashboard.regroup')
          : t('dashboard.huntWon')"
      :trophy-icons="dashboard.campaign.defeats ? undefined : trophyIcons">
      <template v-if="!dashboard.isHuntersTrial && dashboard.campaign.huntTimer.durationMs !== null" #stats >
        <ore-text color="muted" size="sm">
          {{ t('dashboard.fightTime', { duration: formatDuration(dashboard.campaign.huntTimer.durationMs) }) }}
        </ore-text>
      </template>
      <template #lead>
        {{
          dashboard.campaign.defeats
            ? dashboard.trialCampaignOver
              ? t('dashboard.trialDefeatNote')
              : t('dashboard.defeatNote', { count: dashboard.campaign.defeats })
            : t('dashboard.victoryNote')
        }}
      </template>
    </ResultBanner>
    <div class="result-narrative"
      v-if="dashboard.resultQuest && dashboard.resultConclusion && !dashboard.campaign.defeats">
      <ore-card class="lore-band" padding="none">
        <LoreEntry :excerpt="dashboard.resultConclusion.excerpt" :lore="dashboard.resultConclusion.paragraphs.join(' ')"
          :overline="t('dashboard.questConclusion')" />
      </ore-card>
      <ore-card class="lore-band" padding="none" v-for="vision in dashboard.resultQuest.lore.visions" :key="vision.id">
        <LoreEntry :excerpt="vision.summary" :lore="vision.paragraphs.join(' ')"
          :overline="vision.title === 'Blood Vision' ? t('dashboard.bloodVision') : vision.title" />
      </ore-card>
    </div>
    <section class="result-rewards" v-if="dashboard.resultQuest && !dashboard.campaign.defeats">
      <div class="game-panel__heading">
        <div>
          <ore-text as="h4" size="sm" variant="heading">{{ t('dashboard.rewardsApplied') }}</ore-text>
          <ore-text color="muted" size="sm">{{ t('dashboard.rewardsAppliedHint') }}</ore-text>
        </div>
      </div>
      <div class="cluster" style="--cluster-gap: 0.35rem">
        <ResourceIcon size="sm" v-for="(count, id) in dashboard.resultRewards" :key="id" :count="count" :id="id" />
      </div>
      <ul class="result-rewards__list">
        <li v-for="reward in dashboard.resultQuest.rewards" :key="reward">{{ reward }}</li>
      </ul>
    </section>
    <!-- The trial's running comparison ends the page, the ascent's own grammar. -->
    <div class="final-result__ranking" v-if="!dashboard.isFinalBattle && dashboard.finalHunterRank">
      <ore-text color="muted" variant="caption">{{ t('dashboard.scoreHint') }}</ore-text>
      <ore-text variant="overline">{{ dashboard.finalHunterRank }}</ore-text>
      <ScoreRankingLadder :rankings="nightmareHunterTrialLadder" :total="dashboard.finalHunterScore ?? 0" />
    </div>

    <PhaseDock v-if="!dashboard.trialCampaignOver">
      <template #back>
        <PhaseBackButton v-if="dashboard.campaign.defeats" :label="t('dashboard.returnToPreparation')"
          @back="dashboard.send({ type: 'RETRY_HUNT' })" />
      </template>
      <LinkButton to="campaignLog" variant="bordered" :icon-only="isPhone" :label="t('dashboard.viewLogs')" :params="{ id: dashboard.campaign.id }"
        :rounded="isPhone ? 'full' : undefined" >
        <ore-icon name="scroll" v-if="isPhone" />
        <template v-if="!isPhone">{{ t('dashboard.viewLogs') }}</template>
      </LinkButton>
      <ore-button color="secondary" variant="bordered" v-if="!dashboard.campaign.defeats" :icon-only="isPhone"
        :label="t('victory.share')" :rounded="isPhone ? 'full' : undefined" @click="shareVictory">
        <ore-icon name="share-2" v-if="isPhone" />
        <template v-if="!isPhone">{{ t('victory.share') }}</template>
      </ore-button>
      <ore-button color="secondary" variant="solid" v-if="!dashboard.campaign.defeats"
        :disabled="dashboard.isLastChapter" :icon-only="isPhone" :label="dashboard.isLastChapter
          ? t('dashboard.campaignComplete')
          : t('dashboard.beginChapter', { number: (dashboard.campaign?.chapter ?? 0) + 1 })" :rounded="isPhone ? 'full' : undefined"
        @click="dashboard.advance">
        <ore-icon name="chevron-right" v-if="isPhone" />
        <template v-if="!isPhone">
          {{
            dashboard.isLastChapter
              ? t('dashboard.campaignComplete')
              : t('dashboard.beginChapter', { number: (dashboard.campaign?.chapter ?? 0) + 1 })
          }}
        </template>
      </ore-button>
    </PhaseDock>

    <ShareDialog :subject="sharing" @close="sharing = null" />
  </div>
</template>

<style scoped>

.phase-screen--result {
  padding: 0;
  color: var(--p-text-strong);
  background: transparent;
}

.phase-screen--result ore-text {
  --text-color: var(--p-text-strong);
}

.game-panel__heading {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  padding-bottom: 0.75rem;
}

.final-result__ranking {
  display: grid;
  gap: var(--size-3);
  padding-top: var(--size-4);
  border-top: var(--border) solid var(--p-line);
}

.final-result__ending {
  display: grid;
  gap: 0.45rem;
  padding-top: 1rem;
  border-top: 1px solid var(--p-line);
}

.result-narrative {
  display: grid;
  gap: 0.75rem;
  text-align: left;
}

.result-rewards {
  --text-color: var(--p-text-strong);
  display: grid;
  gap: 0.85rem;
  padding-top: 1rem;
  color: var(--p-text-strong);
  text-align: left;
  border-top: 1px solid var(--p-line);
}

.result-rewards ore-text {
  --text-color: var(--p-text-strong);
}

.result-rewards__list {
  display: grid;
  gap: 0.35rem;
  padding-left: 1.2rem;
  margin: 0;
  font-size: 0.875rem;
}

</style>
