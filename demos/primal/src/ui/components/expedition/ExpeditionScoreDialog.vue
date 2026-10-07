<script lang="ts" setup>
/**
 * A trial expedition's result confirmation: the card's score sheet opens with the result,
 * so the score is filled once, where the fight ends: the same ritual as the Winds victory.
 * Confirming records the result with its answers and tally together. Plain defeats confirm
 * without a sheet; cards that print "even in case of defeat" score both ways. A played hunt's
 * sheet can be corrected: the dialog re-opens with the recorded answers and re-tallies them.
 */
import { computed } from 'vue';
import { t } from '../../../app/i18n';
import { expeditions, runCommand } from '../../../app/store';
import { useReadable } from '../../../app/vue-bridge';
import { trialHuntForScenario } from '../../../content/index';
import type { HuntResult } from '../../../domain/types';
import '@vielzeug/refine/text';
import ScoreDialog from '../scoring/ScoreDialog.vue';

const props = defineProps<{ correcting?: boolean; expeditionId: string; open: boolean; result: HuntResult }>();
const emit = defineEmits<{ close: [] }>();

const all = useReadable(expeditions);
const expedition = computed(() => all.value.find((entry) => entry.id === props.expeditionId));
/** The trial card the expedition plays: its printed score table fills the sheet. */
const hunt = computed(() =>
  expedition.value ? trialHuntForScenario(expedition.value.scenarioId) : undefined,
);
/** A correction re-opens the recorded sheet; a fresh fight starts from zero. */
const initialAnswers = computed(() =>
  props.correcting ? expedition.value?.trialScore?.answers : undefined,
);

function confirm(answers: number[]): void {
  if (!expedition.value) return;
  if (props.correcting) {
    runCommand('correctTrialScore', { id: props.expeditionId, kind: 'expedition' }, answers);
  } else {
    runCommand('finishExpedition', { id: props.expeditionId, kind: 'expedition' }, props.result, answers);
  }
  emit('close');
}
</script>

<template>
  <ScoreDialog
    :base="hunt?.scoring.base ?? 0"
    :confirm-label="correcting ? t('trialScore.correct') : result === 'victory' ? t('expeditionDetail.confirmVictoryLabel') : t('expeditionDetail.confirmDefeatLabel')"
    :defeat="result === 'defeat'"
    :initial-answers="initialAnswers"
    :label="t('trialScore.title')"
    :modifiers="hunt?.scoring.modifiers ?? []"
    :open="open"
    :rankings="hunt?.rankings"
    @close="emit('close')"
    @confirm="confirm">
    <template #context>
      <div class="score-dialog__context">
        <ore-text color="muted" size="sm">{{ hunt?.name }}</ore-text>
      </div>
    </template>
  </ScoreDialog>
</template>

<style scoped>
/* The dialog body is plain block flow: the card's context line needs its own separation
   from the worksheet, at the same rhythm the dialog's own header keeps above the body. */
.score-dialog__context {
  margin-block-end: var(--size-2);
}
</style>
