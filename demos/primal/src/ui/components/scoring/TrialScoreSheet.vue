<script lang="ts" setup>
/**
 * A played trial expedition's score summary: the recorded total and its tier as the
 * section's headline, the ranking ladder below with the reached tier marked and the delta to
 * the next tier, and a correction action: the score itself is filled once, in the result
 * dialog; this sheet reads it back and lets a mis-entered table fact be fixed. Hunts without
 * a score (a plain defeat, or a non-trial expedition) render nothing.
 */
import { computed } from 'vue';
import { t } from '../../../app/i18n';
import { trialHuntForScenario } from '../../../content/index';
import { rankingFor } from '../../../domain/trial-score';
import type { Expedition } from '../../../domain/types';
import '@vielzeug/refine/button';
import '@vielzeug/refine/text';
import ScoreRankingLadder from './ScoreRankingLadder.vue';

const props = defineProps<{ expedition: Expedition }>();
const emit = defineEmits<{ correct: [] }>();

const hunt = computed(() => trialHuntForScenario(props.expedition.scenarioId));
const scored = computed(() => props.expedition.status === 'played' && props.expedition.trialScore);
const total = computed(() => props.expedition.trialScore?.total ?? 0);
const reached = computed(() => (hunt.value ? rankingFor(hunt.value.rankings, total.value) : undefined));
</script>

<template>
  <section aria-labelledby="trial-score-title" class="trial-score" v-if="hunt && scored">
    <div class="trial-score__heading">
      <ore-text as="h3" id="trial-score-title" size="xs" variant="overline">
        {{ t('trialScore.title') }}
      </ore-text>
      <div class="trial-score__standing" v-if="reached">
        <ore-text class="trial-score__points" size="lg" variant="label">{{ total }}</ore-text>
        <ore-text class="trial-score__tier" size="md" variant="heading">{{ reached.name }}</ore-text>
      </div>
    </div>

    <ScoreRankingLadder :rankings="hunt.rankings" :total="total" />

    <div class="trial-score__actions">
      <ore-button size="sm" variant="ghost" @click="emit('correct')">
        {{ t('trialScore.correct') }}
      </ore-button>
    </div>
  </section>
</template>

<style scoped>
.trial-score {
  display: grid;
  gap: var(--size-3);
}

.trial-score__heading {
  display: grid;
  gap: var(--size-2);
}

.trial-score__standing {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-2) var(--size-3);
  align-items: baseline;
}

.trial-score__points {
  font-family: var(--p-heading);
}

.trial-score__actions {
  display: flex;
  justify-content: flex-end;
}
</style>
