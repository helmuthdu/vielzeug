<script lang="ts" setup>
import { computed, ref } from 'vue';
import { formatDuration } from '../../../app/format';
import { t } from '../../../app/i18n';
import { expeditions, removeSubject, replayExpedition, runCommand } from '../../../app/store';
import { navigate, useMediaQuery, useReadable, useRouteParams } from '../../../app/vue-bridge';
import { monsterById, scenarioById, trialHuntForScenario } from '../../../content/index';
import { canHostSubject } from '../../../domain/host-eligibility';
import type { HuntResult, SpecialRule } from '../../../domain/types';
import { victoryFromExpedition } from '../../../domain/victory';
import AggressionMark from '../../components/AggressionMark.vue';
import ConfirmDialog from '../../components/ConfirmDialog.vue';
import ExpeditionScoreDialog from '../../components/expedition/ExpeditionScoreDialog.vue';
import HuntControls from '../../components/hunt/HuntControls.vue';
import HuntOutcomeActions from '../../components/hunt/HuntOutcomeActions.vue';
import HuntSetup from '../../components/hunt/HuntSetup.vue';
import HuntTimer from '../../components/hunt/HuntTimer.vue';
import LinkButton from '../../components/LinkButton.vue';
import ManagementSection from '../../components/ManagementSection.vue';
import PageHeader from '../../components/PageHeader.vue';
import PhaseDock from '../../components/PhaseDock.vue';
import ExpeditionParty from '../../components/party/ExpeditionParty.vue';
import PartySection from '../../components/party/PartySection.vue';
import TrialScoreSheet from '../../components/scoring/TrialScoreSheet.vue';
import ShareDialog from '../../components/share/ShareDialog.vue';
import { type ShareSubject, victoryShareSubject } from '../../components/share/share-subject';
import { useSessionGuest } from '../../composables/use-session-guest';
import '@vielzeug/refine/button';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/stats';
import '@vielzeug/refine/text';

const params = useRouteParams();
const all = useReadable(expeditions);
const expedition = computed(() => all.value.find((entry) => entry.id === params.value.id));
const sessionGuest = useSessionGuest('expedition', () => expedition.value?.id);
const monster = computed(() => (expedition.value?.monsterId ? monsterById(expedition.value.monsterId) : undefined));
const scenario = computed(() => (expedition.value?.scenarioId ? scenarioById(expedition.value.scenarioId) : undefined));
const huntRules = computed<SpecialRule[]>(() => [
  ...(scenario.value?.specialRules ?? []),
  ...(monster.value?.specialRules ?? []),
]);
const pendingResult = ref<'defeat' | 'victory' | null>(null);
/* The dock's phone tiers: the commit action shrinks to its glyph circle. */
const isPhone = useMediaQuery('(width < 640px)');

/** The shared hunt record this played expedition resolves, opened on demand. */
const sharing = ref<ShareSubject | null>(null);

function shareVictory(): void {
  if (!expedition.value) return;
  const victory = victoryFromExpedition(expedition.value);
  if (victory) sharing.value = victoryShareSubject(victory);
}
/** Re-opens a played hunt's recorded sheet for correction. */
const correcting = ref(false);
/** The trial card the expedition plays, if it plays one. */
const trialHunt = computed(() =>
  expedition.value ? trialHuntForScenario(expedition.value.scenarioId) : undefined,
);
/** Challenge results record through the score dialog: a victory, or a defeat on a card that
 *  prints "even in case of defeat". Everything else confirms plainly. */
const scoredResult = computed(
  () =>
    pendingResult.value !== null &&
    trialHunt.value !== undefined &&
    (pendingResult.value === 'victory' || trialHunt.value.scoring.scoredOnDefeat),
);
// The dialogs render behind null-guards TypeScript cannot see, so the label tolerates null.
const statusLabel = (value: HuntResult | null) => (value ? t(`expeditions.status.${value}`) : '');

function confirmResult(): void {
  if (expedition.value && pendingResult.value)
    runCommand('finishExpedition', { id: expedition.value.id, kind: 'expedition' }, pendingResult.value);
  pendingResult.value = null;
}

function remove(): void {
  if (expedition.value) removeSubject({ id: expedition.value.id, kind: 'expedition' });
  void navigate('expeditions');
}

function replay(): void {
  if (!expedition.value) return;
  const next = replayExpedition(expedition.value.id);
  if (next) void navigate('expeditionDetail', { id: next.id });
}
</script>

<template>
  <div class="frame stack expedition" style="--stack-gap: 1.5rem" v-if="expedition && monster && scenario">
    <PageHeader
      art="/backgrounds/bg_expedition.webp"
      :eyebrow="t('expeditionDetail.eyebrow', { number: scenario.number })"
      :subtitle="scenario.name"
      :title="monster.name">
      <template #center>
        <div class="expedition-header__primary">
          <section class="expedition-header__status" :aria-label="t('expeditionDetail.statusLabel')">
            <ore-stats size="sm" variant="plain" :label="t('expeditionDetail.statAggression')">
              <AggressionMark
                size="sm"
                slot="value"
                v-if="expedition.aggression !== null"
                :level="expedition.aggression" />
            </ore-stats>
            <ore-stats
              size="sm"
              variant="plain"
              :label="t('expeditionDetail.statPartySize')"
              :value="String(expedition.hunters.length)" />
          </section>
        </div>
      </template>
    </PageHeader>

    <!-- The hunt's working span: the dock's outcome action rides with the reference and the
         party console to the page's end. -->
    <div class="phase-flow" style="--phase-gap: 1.5rem">
    <section class="hunt-reference" :aria-label="t('expeditionDetail.huntReference')">
      <HuntSetup
        :description="scenario.objective"
        :eyebrow="t('expeditionDetail.huntEyebrow', { monster: monster.name, number: scenario.number })"
        :habitat="monster.habitat"
        :monster-icon="monster.trophyIcon"
        :monster-meta="{ element: monster.element, weaknesses: monster.weaknesses }"
        :monster-name="monster.name"
        :special-rules="huntRules"
        :terrain="scenario.terrain"
        :title="scenario.name">
      </HuntSetup>
    </section>

    <PartySection
      heading-id="expedition-party-title"
      :subtitle="t('expeditionDetail.partyConsumeHint')"
      :title="t('expeditionDetail.partyTitle')">
      <ExpeditionParty :expedition-id="expedition.id" />
    </PartySection>

    <!-- A played hunt keeps the dock for its boards: the timer froze and the outcome is
         already recorded, so the controls reduce to the boards pair. -->
    <PhaseDock>
      <!-- The fight's clock claims the dock's center place while the hunt is live;
           the played hunt passes no clock, and the empty center leaves no gap. -->
      <template v-if="expedition.status !== 'played'" #center>
        <HuntTimer
          :timer="expedition.huntTimer"
          @pause="runCommand('pauseHuntTimer', { id: expedition.id, kind: 'expedition' })"
          @reset="runCommand('resetHuntTimer', { id: expedition.id, kind: 'expedition' })"
          @start="runCommand('startHuntTimer', { id: expedition.id, kind: 'expedition' })" />
      </template>
      <!-- The hunt's boards ride as one icon pair before the outcome actions. -->
      <HuntControls
        hunter-board-to="expeditionHunterBoard"
        monster-board-to="expeditionMonsterBoard"
        :hunter-board-params="{ hunterId: expedition.hunters[0]?.hunterId ?? '', id: expedition.id }"
        :monster-board-params="{ id: expedition.id }"
        :show-hunter-board="expedition.hunters.length > 0"
        :show-monster-board="!!expedition.monsterId" />
      <ore-button
        color="secondary"
        variant="bordered"
        v-if="expedition.status === 'played' && expedition.result === 'victory'"
        :icon-only="isPhone"
        :label="t('victory.share')"
        :rounded="isPhone ? 'full' : undefined"
        @click="shareVictory">
        <ore-icon name="share-2" v-if="isPhone" />
        <template v-if="!isPhone">{{ t('victory.share') }}</template>
      </ore-button>
      <HuntOutcomeActions
        v-if="expedition.status !== 'played'"
        :defeat-label="t('huntOutcome.recordDefeat')"
        :victory-label="t('huntOutcome.recordVictory')"
        @defeat="pendingResult = 'defeat'"
        @victory="pendingResult = 'victory'" />
    </PhaseDock>

    <section aria-labelledby="expedition-result-title" class="expedition-result" v-if="expedition.status === 'played'">
      <div class="expedition-result__head">
        <div>
          <ore-text as="h2" id="expedition-result-title" size="xs" variant="overline">
            {{ t('expeditionDetail.resultTitle') }}
          </ore-text>
          <ore-text color="muted" size="sm">{{ t('expeditionDetail.resultHint') }}</ore-text>
        </div>
      </div>
      <template v-if="expedition.status === 'played'">
        <ore-text>
          {{
            expedition.huntTimer.durationMs !== null
              ? t('expeditionDetail.resultRecorded', {
                  duration: formatDuration(expedition.huntTimer.durationMs),
                  result: statusLabel(expedition.result),
                })
              : t('expeditionDetail.resultRecordedNoTime', { result: statusLabel(expedition.result) })
          }}
        </ore-text>
        <TrialScoreSheet :expedition="expedition" @correct="correcting = true" />
      </template>
    </section>
    </div>

    <ManagementSection
      :delete-body="t('expeditions.deleteBody')"
      :delete-label="t('common.delete')"
      :delete-title="t('expeditions.deleteTitle')"
      :guest="sessionGuest"
      :hostable="canHostSubject(expedition)"
      :subject="{ id: expedition.id, kind: 'expedition' }"
      @remove="remove">
      <template v-if="expedition.status === 'played'" #primary>
        <ore-button color="primary" size="md" variant="solid" @click="replay">
          <ore-icon name="rotate-ccw" slot="prefix" />
          {{ t('expeditions.playAgain') }}
        </ore-button>
      </template>
    </ManagementSection>

    <ConfirmDialog
      :confirm-label="
        pendingResult === 'victory'
          ? t('expeditionDetail.confirmVictoryLabel')
          : t('expeditionDetail.confirmDefeatLabel')
      "
      :danger="pendingResult === 'defeat'"
      :open="pendingResult !== null && !scoredResult"
      :title="
        pendingResult === 'victory'
          ? t('expeditionDetail.confirmVictoryTitle')
          : t('expeditionDetail.confirmDefeatTitle')
      "
      @cancel="pendingResult = null"
      @confirm="confirmResult">
      <ore-text>
        {{
          t('expeditionDetail.confirmResultBody', {
            monster: monster.name,
            result: statusLabel(pendingResult),
            scenario: scenario.name,
          })
        }}
      </ore-text>
    </ConfirmDialog>

    <!-- The trial card's score rides with the result, filled once where the fight ends. -->
    <ExpeditionScoreDialog
      :expedition-id="expedition.id"
      :open="scoredResult"
      :result="pendingResult ?? 'victory'"
      @close="pendingResult = null" />

    <!-- The played hunt's sheet, corrected: re-opens with the recorded answers. -->
    <ExpeditionScoreDialog
      correcting
      :expedition-id="expedition.id"
      :open="correcting"
      :result="expedition.result ?? 'victory'"
      @close="correcting = false" />

    <ShareDialog :subject="sharing" @close="sharing = null" />
  </div>

  <div class="frame stack" style="text-align: center; padding-block: 4rem; justify-items: center" v-else>
    <ore-text variant="overline">{{ t('expeditions.expeditionFallback') }}</ore-text>
    <ore-text as="h1" size="lg" variant="heading">{{ t('common.noSuchExpedition') }}</ore-text>
    <LinkButton to="expeditions" variant="bordered">{{ t('expeditionDetail.backToList') }}</LinkButton>
  </div>
</template>

<style scoped>
.expedition-header__primary {
  display: flex;
  flex-direction: column;
  gap: var(--size-4);
  align-items: center;
  justify-content: center;
  min-width: 0;
}

.expedition-header__status {
  display: grid;
  grid-template-columns: repeat(3, minmax(var(--size-20), 1fr));
  gap: var(--size-3);
  min-width: var(--size-72);
}

.expedition-header__status ore-stats {
  --stats-bg: transparent;
  --stats-padding: 0 var(--size-2);
  --stats-value-size: var(--text-xl);
}

.hunt-reference {
  min-width: 0;
}

/* The played result flows full width: the recorded line and the score sheet stack below the
   heading, so the ladder spans the section instead of sharing a row with the result line. */
.expedition-result {
  display: grid;
  gap: var(--size-4);
  padding-block: 1rem;
  border-top: var(--border) solid var(--p-line);
}

.expedition-result__head {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
  justify-content: space-between;
}

@media (width < 640px) {
  /* Phones keep all three stats on one row, the same grammar the other headers wear. */
  .expedition-header__status {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    width: 100%;
    min-width: 0;
  }

  .expedition-header__status ore-stats {
    --stats-padding: 0 var(--size-1);
  }
}

</style>
