<script lang="ts" setup>
import { notify } from '../../../app/events';
import { t } from '../../../app/i18n';
import { duplicateCampaign, removeSubject, runCommand } from '../../../app/store';
import { navigate } from '../../../app/vue-bridge';
import { campaignAggression } from '../../../content/index';
import { nightmareHunterTrialLadder } from '../../../domain/campaign';
import { canHostSubject } from '../../../domain/host-eligibility';
import ConfirmDialog from '../../components/ConfirmDialog.vue';
import CampaignHeader from '../../components/campaign/CampaignHeader.vue';
import CampaignQuestBoard from '../../components/campaign/CampaignQuestBoard.vue';
import LinkButton from '../../components/LinkButton.vue';
import ManagementSection from '../../components/ManagementSection.vue';
import PhaseTracker from '../../components/PhaseTracker.vue';
import ScoreDialog from '../../components/scoring/ScoreDialog.vue';
import { useSessionGuest } from '../../composables/use-session-guest';
import HuntPhase from './dashboard/HuntPhase.vue';
import PreparingPhase from './dashboard/PreparingPhase.vue';
import ResultPhase from './dashboard/ResultPhase.vue';
import { useDashboard } from './dashboard/use-dashboard';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/text';

const dashboard = useDashboard();
const sessionGuest = useSessionGuest('campaign', () => dashboard.campaign?.id);

function remove(): void {
  if (dashboard.campaign) removeSubject({ id: dashboard.campaign.id, kind: 'campaign' });
  void navigate('campaigns');
}

function rename(name: string): void {
  if (!dashboard.campaign) return;
  if (runCommand('setSubjectName', { id: dashboard.campaign.id, kind: 'campaign' }, name))
    notify('campaigns.renamed', 'success', { values: { name } });
}

function duplicate(): void {
  if (!dashboard.campaign) return;
  const next = duplicateCampaign(dashboard.campaign.id);
  if (next) void navigate('campaignDashboard', { id: next.id });
}
</script>

<template>
  <div class="frame stack dashboard" style="--stack-gap: 1.5rem" v-if="dashboard.campaign && dashboard.chapter">
    <!-- The finished campaign's screen is the result alone: the header and the chapter
         stepper narrate a run in progress, and past its end they frame an epilogue. -->
    <template v-if="!dashboard.campaignOver">
      <CampaignHeader
        art="/backgrounds/bg_history.webp"
        :campaign="dashboard.campaign"
        :eyebrow="t('dashboard.eyebrow', { chapter: dashboard.campaign.chapter, total: dashboard.TOTAL_CHAPTERS })"
        :subtitle="dashboard.chapter.title"
      />

      <!-- Chapter flow -->
      <PhaseTracker
        :current="dashboard.campaign.phase"
        :entries="dashboard.phaseEntries"
        :follow="dashboard.followPhase"
        :href-of="dashboard.phaseHref"
        :revisit="dashboard.revisitPhases" />
    </template>

    <div class="phase-screen phase-screen--quests" v-if="dashboard.campaign.phase === 'quest-board'">
      <CampaignQuestBoard :campaign-id="dashboard.campaign.id" />
    </div>
    <PreparingPhase v-else-if="dashboard.campaign.phase === 'preparing'" :dashboard="dashboard" />
    <HuntPhase v-else-if="dashboard.campaign.phase === 'hunt'" :dashboard="dashboard" />
    <ResultPhase v-else :dashboard="dashboard" />

    <ManagementSection
      :delete-body="t('campaigns.deleteBody', { name: dashboard.campaign.name })"
      :delete-label="t('common.delete')"
      :delete-title="t('campaigns.deleteTitle')"
      :guest="sessionGuest"
      :hostable="canHostSubject(dashboard.campaign)"
      :name="dashboard.campaign.name"
      :name-label="t('campaignCreate.nameLabel')"
      :rename-title="t('campaigns.renameTitle')"
      :subject="{ id: dashboard.campaign.id, kind: 'campaign' }"
      @remove="remove"
      @rename="rename">
      <template v-if="dashboard.trialCampaignOver || dashboard.campaign.finalBattleWon" #primary>
        <LinkButton color="primary" size="md" to="campaignCreate" variant="solid">
          <ore-icon name="rotate-ccw" slot="prefix" />
          {{ t('dashboard.startNewCampaign') }}
        </LinkButton>
      </template>
      <ore-button size="sm" variant="ghost" v-if="!dashboard.trialCampaignOver && !dashboard.campaign.finalBattleWon" @click="duplicate">
        <ore-icon name="copy" slot="prefix" />
        {{ t('campaigns.duplicate') }}
      </ore-button>
    </ManagementSection>

    <!-- The trial victory's confirmation is its score sheet: the standard worksheet at the
         chapter's tier, the live total previewing the fight's score against the Nightmare
         ladder — the Winds' own ritual. The final battle records no sheet: its victory is
         the plain Awakened confirmation below. -->
    <ScoreDialog :aggression-level="campaignAggression(dashboard.campaign?.chapter ?? 1)"
      :base="dashboard.victorySheetBase"
      :confirm-label="t('huntOutcome.recordVictory')"
      :initial-answers="dashboard.victorySheet.answers" :label="t('dashboard.scoreVictoryTitle')"
      :modifiers="dashboard.victorySheet.rows"
      :open="dashboard.pendingOutcome === 'victory' && dashboard.isHuntersTrial && !dashboard.isFinalBattle"
      :rankings="nightmareHunterTrialLadder" @close="dashboard.cancelOutcome"
      @confirm="dashboard.confirmOutcome">
      <template #context>
        <div class="trial-sheet__context">
          <ore-text color="muted" size="sm">
            {{ t('dashboard.victoryBody', { monster: dashboard.activeMonster?.name, quest: dashboard.activeQuest?.name }) }}
          </ore-text>
        </div>
      </template>
    </ScoreDialog>

    <ConfirmDialog
      :confirm-label="
        dashboard.pendingOutcome === 'victory' ? t('huntOutcome.recordVictory') : t('huntOutcome.recordDefeat')
      "
      :danger="dashboard.pendingOutcome === 'defeat'"
      :open="dashboard.pendingOutcome !== null && !(dashboard.pendingOutcome === 'victory' && dashboard.isHuntersTrial && !dashboard.isFinalBattle)"
      :title="dashboard.pendingOutcome === 'victory' ? t('dashboard.confirmVictory') : t('dashboard.confirmDefeat')"
      @cancel="dashboard.cancelOutcome"
      @confirm="dashboard.confirmOutcome"
    >
      <ore-text v-if="dashboard.pendingOutcome === 'victory' && dashboard.isFinalBattle">
        {{ t('dashboard.victoryFinalBody') }}
      </ore-text>
      <ore-text v-else-if="dashboard.pendingOutcome === 'victory'">
        {{ t('dashboard.victoryBody', { monster: dashboard.activeMonster?.name, quest: dashboard.activeQuest?.name }) }}
      </ore-text>
      <ore-text v-else-if="dashboard.isHuntersTrial && dashboard.campaign.defeats >= 2">
        {{ t('dashboard.defeatTrialBody') }}
      </ore-text>
      <ore-text v-else>
        {{ t('dashboard.defeatBody') }}
      </ore-text>
    </ConfirmDialog>

    <ConfirmDialog
      :confirm-label="t('dashboard.revisitLabel')"
      :open="dashboard.pendingPhase !== null"
      :title="
        t('dashboard.revisitTitle', { phase: dashboard.pendingPhase ? dashboard.phaseName(dashboard.pendingPhase) : t('dashboard.revisitFallback') })
      "
      @cancel="dashboard.cancelRevisit"
      @confirm="dashboard.confirmRevisit"
    >
      <ore-text>{{ t('dashboard.revisitBody') }}</ore-text>
    </ConfirmDialog>
  </div>

  <div class="frame stack" style="text-align: center; padding-block: 4rem; justify-items: center" v-else>
    <ore-text variant="overline">{{ t('campaigns.campaign') }}</ore-text>
    <ore-text as="h1" size="lg" variant="heading">{{ t('common.noSuchCampaign') }}</ore-text>
    <LinkButton to="campaigns" variant="bordered">{{ t('campaignLog.backToCampaigns') }}</LinkButton>
  </div>
</template>

<style scoped>
/* The Valor sheet's context line: the fight it records, kept clear of the worksheet
   below at the dialog's own rhythm. */
.trial-sheet__context {
  margin-block-end: var(--size-2);
}

.dashboard > * {
  min-width: 0;
}

.dashboard .card-title {
  flex-wrap: wrap;
  padding-bottom: 0;
  border-bottom: 0;
}

.dashboard ore-card {
  --card-radius: var(--rounded-md);
  --card-shadow: none;
  --card-padding: clamp(0.25rem, 1vw, 0.75rem);
}

.dashboard ore-card::before,
.dashboard ore-card::after {
  display: none;
}

.dashboard ore-button {
  --button-radius: 0.15rem;
  min-height: 2.5rem;
}

.dashboard ore-text[variant='heading'] {
  --text-letter-spacing: var(--tracking-normal);
  font-family: var(--font-serif);
  text-transform: none;
}

.phase-screen--quests {
  display: grid;
  gap: 1.25rem;
}
</style>
