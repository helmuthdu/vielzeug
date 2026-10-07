<script lang="ts" setup>
/**
 * The Winds victory confirmation's score sheet: the fight's worksheet opens with the result,
 * so the score is filled once, where the fight ends: the same ritual as a challenge
 * expedition's result. Confirming records the victory with its answers and tally together;
 * canceling leaves the fight pending.
 */
import { computed } from 'vue';
import { t } from '../../../app/i18n';
import { challenges, runCommand } from '../../../app/store';
import { useReadable } from '../../../app/vue-bridge';
import { monsterById } from '../../../content/index';
import { CHALLENGE_EXPEDITIONS_TOTAL, challengeLadder, challengeSeries, challengeTotal } from '../../../domain/challenge';
import { type SeriesSheet, seriesSheet } from '../../../domain/trial-score';
import '@vielzeug/refine/text';
import ScoreDialog from '../scoring/ScoreDialog.vue';

const props = defineProps<{ open: boolean; runId: string }>();
const emit = defineEmits<{ close: [] }>();

const all = useReadable(challenges);
const run = computed(() => all.value.find((entry) => entry.id === props.runId));
const series = computed(() => (run.value ? challengeSeries(run.value) : undefined));
// The fight being confirmed runs at the run's current aggression: the level the sheet scores.
const level = computed(() => series.value?.scoreLevels[run.value?.aggression ?? 1]);
/** The sheet the dialog opens: capped rows, the stance row pre-marked while the series
 * plays the Nightmare variant. */
const sheet = computed<SeriesSheet>(() => {
  const current = run.value;
  if (!current || !level.value) return { answers: [], rows: [] };
  return seriesSheet(level.value, {
    monsterId: current.pending?.monsterId,
    nightmare: current.nightmareVariant,
    partySize: current.hunters.length,
  });
});
/** The preview's base: the run's standing sum plus this expedition's own base, so the live
 * total previews the series sum the ladder will judge; the recorded sheet keeps the
 * expedition's own total. */
const previewBase = computed(() => (run.value ? challengeTotal(run.value) + (level.value?.base ?? 0) : 0));
/** The monster the party is recording a victory over. */
const monster = computed(() => {
  const monsterId = run.value?.pending?.monsterId;
  return monsterId ? monsterById(monsterId) : undefined;
});

function confirm(answers: number[]): void {
  runCommand('recordChallengeResult', { id: props.runId, kind: 'challenge' }, 'victory', answers);
  emit('close');
}
</script>

<template>
  <ScoreDialog
    :aggression-level="run?.aggression ?? 1"
    :base="previewBase"
    :confirm-label="t('challenge.confirmVictory')"
    :initial-answers="sheet.answers"
    :label="t('challenge.scoreVictoryTitle', { monster: monster?.name ?? '' })"
    :modifiers="sheet.rows"
    :open="open"
    :rankings="challengeLadder"
    @close="emit('close')"
    @confirm="confirm">
    <template #context>
      <div class="score-dialog__context">
        <ore-text color="muted" size="sm">
          {{
            t('challenge.scoreTableContext', {
              expedition: run?.expeditionNumber ?? 1,
              level: run?.aggression ?? 1,
              total: CHALLENGE_EXPEDITIONS_TOTAL,
            })
          }}
        </ore-text>
      </div>
    </template>
  </ScoreDialog>
</template>

<style scoped>
/* The dialog body is plain block flow: the fight's context line needs its own separation
   from the worksheet, at the same rhythm the dialog's own header keeps above the body. */
.score-dialog__context {
  display: flex;
  gap: var(--size-3);
  align-items: center;
  margin-block-end: var(--size-2);
}

/* The mark's global negative top margin is an optical tune for definition lists; in this
   centered flex row it would bleed above the row and sit off the text's center. */
.score-dialog__context :deep(.aggression-mark) {
  margin-top: 0;
}
</style>
