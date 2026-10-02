<script lang="ts" setup>
/**
 * The score-recording dialog: the challenge worksheet opens with the fight's result, so the
 * score is filled once, where the fight ends. Every score surface composes it: the Winds
 * victory sheet, the ascent's chapter sheet and the trial's hunt sheet, so the ritual stays
 * one thing. A fresh sheet per fight: it opens with every count at zero, or with the
 * recorded answers when a played hunt's sheet is being corrected. The heading always carries
 * the fight's aggression mark beside its title. The worksheet's live
 * total carries a live ranking preview, so the party sees the tier it is heading for before
 * the confirm is final.
 */
import { computed, ref, watch } from 'vue';
import { t, tp } from '../../../app/i18n';
import type { TrialRanking, TrialScoreModifier } from '../../../content/index';
import { nextRankingFor, rankingFor, worksheetTotal } from '../../../domain/trial-score';
import type { AggressionLevel } from '../../../domain/types';
import '@vielzeug/refine/button';
import '@vielzeug/refine/dialog';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/text';
import AggressionMark from '../AggressionMark.vue';
import ScoreWorksheet from './ScoreWorksheet.vue';

const props = defineProps<{
  base: number;
  /** The hunt was lost: victory-scoped rows read only and dimmed. */
  defeat?: boolean;
  /** The confirm button's label: it records the result together with the sheet. */
  confirmLabel: string;
  /** The sheet's own fill hint; the trial sheet's printed line when omitted. */
  hint?: string;
  /** The fight's aggression level, carried as the heading's right-side mark. */
  aggressionLevel?: AggressionLevel;
  /** The dialog's accessible name. */
  label: string;
  /** The recorded answers a correction re-opens with, per modifier in printed order. */
  initialAnswers?: readonly number[];
  modifiers: TrialScoreModifier[];
  open: boolean;
  /** The card's ranking ladder: drives the live preview of the tier being confirmed. */
  rankings?: readonly TrialRanking[];
}>();
const emit = defineEmits<{ close: []; confirm: [answers: number[]] }>();

// A fresh sheet per fight, or the recorded one when correcting it.
const answers = ref<number[]>(props.modifiers.map((_, index) => props.initialAnswers?.[index] ?? 0));
watch(
  () => props.open,
  (open) => {
    if (open) answers.value = props.modifiers.map((_, index) => props.initialAnswers?.[index] ?? 0);
  },
);

/** The sheet's live total: the same arithmetic the worksheet shows. */
const liveTotal = computed(() => worksheetTotal(props.base, props.modifiers, answers.value, props.defeat ?? false));
const reached = computed(() => (props.rankings ? rankingFor(props.rankings, liveTotal.value) : undefined));
const next = computed(() => (props.rankings ? nextRankingFor(props.rankings, liveTotal.value) : undefined));

function confirm(): void {
  emit('confirm', [...answers.value]);
}

function onOpenChange(event: Event): void {
  if (event.target !== event.currentTarget) return;
  if (!(event as CustomEvent<{ open: boolean }>).detail.open) emit('close');
}
</script>

<template>
  <ore-dialog
    backdrop="blur"
    size="md"
    :label="label"
    :open="open"
    @open-change="onOpenChange">
    <!-- The heading: the sheet's title, the fight's aggression mark beside it, and the same
         close the default header carried — the custom header slot replaces the built-in layout. -->
    <div class="score-dialog__heading" slot="header">
      <span class="score-dialog__heading-title">{{ label }}</span>
      <AggressionMark class="score-dialog__aggression" size="sm" 
        v-if="aggressionLevel" :level="aggressionLevel"/>
      <ore-button icon-only variant="ghost" :label="t('common.close')" @click="emit('close')">
        <ore-icon name="x" />
      </ore-button>
    </div>
    <slot name="context" />
    <ore-text class="score-dialog__hint" color="muted" size="sm">{{ hint ?? t('trialScore.hint') }}</ore-text>
    <ScoreWorksheet v-model="answers" :base="base" :defeat="defeat" :modifiers="modifiers" />
    <ore-text class="score-dialog__rank" color="muted" role="status" size="sm" v-if="reached">
      {{
        next
          ? `${t('trialScore.rankNow', { tier: reached.name })} · ${tp('trialScore.moreTo', next.needed, { tier: next.name })}`
          : `${t('trialScore.rankNow', { tier: reached.name })} · ${t('trialScore.topReached')}`
      }}
    </ore-text>
    <div class="cluster" slot="footer" style="justify-content: flex-end">
      <ore-button variant="ghost" @click="emit('close')">{{ t('common.cancel') }}</ore-button>
      <ore-button color="primary" variant="solid" @click="confirm">{{ confirmLabel }}</ore-button>
    </div>
  </ore-dialog>
</template>

<style scoped>
/* The heading: the title, the aggression chip beside it, the close flush right. */
.score-dialog__heading {
  display: flex;
  flex: 1;
  gap: var(--size-3);
  align-items: center;
}

.score-dialog__heading-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--text-md);
  font-weight: var(--font-semibold);
  white-space: nowrap;
}

.score-dialog__aggression {
  margin-inline-start: auto;
}

.score-dialog__hint {
  display: block;
  margin-block-end: var(--size-4);
}

.score-dialog__rank {
  display: block;
  margin-block-start: var(--size-3);
  text-align: end;
}
</style>
