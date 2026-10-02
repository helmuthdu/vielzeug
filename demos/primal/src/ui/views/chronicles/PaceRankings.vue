<script lang="ts" setup>
import '@vielzeug/refine/accordion';
import '@vielzeug/refine/accordion-item';
import { computed, ref } from 'vue';
import { asset } from '../../../app/assets';
import { t, tp } from '../../../app/i18n';
import { monsterById } from '../../../content';
import type { ChroniclesDuration } from '../../../domain/chronicles';
import HuntRecordDetails from '../../components/HuntRecordDetails.vue';
import LinkButton from '../../components/LinkButton.vue';
import { formatCount, formatDuration, formatSampleDate, monsterName, originRoute, page, tail } from './format';
import ShowMoreButton from './ShowMoreButton.vue';

const props = defineProps<{ durations: ChroniclesDuration[] }>();

/**
 * Medians need more than one hunt to mean anything: creatures with a single timed hunt stay
 * out of the ranking and close it, marked as too sparse to place.
 */
const rankedRows = computed(() => props.durations.filter(({ records }) => records.length >= 2));
const sparseRows = computed(() => props.durations.filter(({ records }) => records.length < 2));
const paceEntries = computed(() => [
  ...rankedRows.value.map((row, index) => ({ ranked: index + 1, row })),
  ...sparseRows.value.map((row) => ({ ranked: null, row })),
]);
const expanded = ref(false);
const pacePage = computed(() => (expanded.value ? paceEntries.value : page(paceEntries.value)));
const paceTail = computed(() => tail(paceEntries.value));
/** Per creature, the sample the reader is inspecting; defaults to the newest record. */
const selectedPaceHuntIds = ref<Record<string, string>>({});

const selectedPaceRecord = (row: ChroniclesDuration) =>
  row.records.find(({ id }) => id === selectedPaceHuntIds.value[row.monsterId]) ?? row.records[0]!;

function pickPaceHunt(row: ChroniclesDuration, id: string): void {
  selectedPaceHuntIds.value = { ...selectedPaceHuntIds.value, [row.monsterId]: id };
}
</script>

<template>
  <template v-if="durations.length">
    <ore-accordion
      class="chronicle__pace-accordion"
      id="chronicle-pace-list"
      selection-mode="single"
      variant="text"
      :aria-label="t('chronicles.pace')">
      <ore-accordion-item v-for="entry in pacePage" :key="entry.row.monsterId">
        <span class="chronicle__pace-prefix" slot="prefix">
          <span aria-hidden="true" class="chronicle__pace-rank" v-if="entry.ranked">{{ entry.ranked }}</span>
          <img
            alt=""
            class="chronicle__pace-monster"
            v-if="monsterById(entry.row.monsterId)?.trophyIcon"
            :src="asset(monsterById(entry.row.monsterId)?.trophyIcon ?? '')" />
        </span>
        <span slot="title">{{ monsterName(entry.row.monsterId) }}</span>
        <span class="chronicle__pace-summary" slot="subtitle" v-if="entry.ranked">
          {{ t('chronicles.durationRange', { max: formatDuration(entry.row.maxMs), min: formatDuration(entry.row.minMs) }) }}
        </span>
        <span class="chronicle__pace-summary" slot="subtitle" v-else>{{ t('chronicles.paceSparse') }}</span>
        <span class="chronicle__pace-metric" slot="suffix">
          <span class="chronicle__pace-median">{{ formatDuration(entry.row.medianMs) }}</span>
          <span class="chronicle__pace-samples">
            {{ tp('chronicles.durationSamples', entry.row.records.length, { count: formatCount(entry.row.records.length) }) }}
          </span>
        </span>
        <div class="chronicle__duration-record">
          <fieldset class="chronicle__pace-picks">
            <legend class="visually-hidden">
              {{ t('chronicles.paceRecordFilter', { monster: monsterName(entry.row.monsterId) }) }}
            </legend>
            <button
              class="chronicle__pace-pick"
              type="button"
              v-for="record in entry.row.records"
              :key="record.id"
              :aria-pressed="selectedPaceRecord(entry.row).id === record.id ? 'true' : 'false'"
              @click="pickPaceHunt(entry.row, record.id)">
              <span class="chronicle__pace-pick-time">{{ formatDuration(record.durationMs) }}</span>
              <time :datetime="record.recordedAt">{{ formatSampleDate(record.recordedAt) }}</time>
              <span
                class="chronicle__pace-pick-outcome"
                :class="record.outcome === 'victory' ? 'chronicle__pace-pick-outcome--victory' : 'chronicle__pace-pick-outcome--defeat'">
                {{ t(record.outcome === 'victory' ? 'chronicles.victoryWord' : 'chronicles.defeatWord') }}
              </span>
            </button>
          </fieldset>
          <LinkButton
            class="chronicle__pace-origin"
            size="sm"
            v-bind="originRoute(selectedPaceRecord(entry.row).origin)">
            {{ t('chronicles.openOrigin', { name: selectedPaceRecord(entry.row).origin.name }) }}
          </LinkButton>
          <HuntRecordDetails :record="selectedPaceRecord(entry.row)" />
        </div>
      </ore-accordion-item>
    </ore-accordion>
    <ShowMoreButton
      class="chronicle__pace-more"
      controls="chronicle-pace-list"
      v-if="paceTail.length"
      :expanded="expanded"
      :hidden-count="paceTail.length"
      :label="
        t(
          expanded ? 'chronicles.showFewerPace' : 'chronicles.showMorePace',
          expanded ? {} : { count: paceTail.length },
        )
      "
      @toggle="expanded = !expanded" />
  </template>
  <p class="chronicle__empty" v-else>{{ t('chronicles.paceEmpty') }}</p>
  <p class="chronicle__coverage" role="note" v-if="durations.length">{{ t('chronicles.timerNote') }}</p>
</template>

<style scoped>
.chronicle__pace-accordion {
  --accordion-divider-color: transparent;
  --accordion-item-bg: transparent;
  --accordion-item-border-color: transparent;
  --accordion-item-hover-bg: color-mix(in oklch, var(--p-gold) 5%, transparent);
  margin-top: var(--size-3);
}

.chronicle__pace-accordion ore-accordion-item {
  --accordion-item-details-padding: var(--size-1) 0;
  --accordion-item-summary-padding: var(--size-2) 0;
}

.chronicle__pace-accordion ore-accordion-item::part(summary) {
  gap: var(--size-3);
  min-height: var(--chronicle-ranked-row-height);
  border: 0;
  border-radius: 0;
}

.chronicle__pace-accordion ore-accordion-item::part(suffix) {
  margin-inline-start: auto;
}

.chronicle__pace-accordion ore-accordion-item::part(content) {
  border: 0;
  border-radius: 0;
}

.chronicle__pace-prefix {
  display: flex;
  flex: none;
  gap: var(--size-3);
  align-items: center;
}

.chronicle__pace-rank {
  min-width: var(--size-6);
  font-family: var(--p-heading);
  font-size: var(--text-xs);
  font-variant-numeric: tabular-nums;
  color: var(--p-gold);
  text-align: end;
}

.chronicle__pace-monster {
  box-sizing: border-box;
  flex: none;
  width: var(--size-9);
  height: var(--size-9);
  padding: var(--size-1);
  object-fit: contain;
  background: var(--p-panel-sunken);
  border: var(--border) solid var(--p-line);
  border-radius: var(--rounded-sm);
}

.chronicle__pace-summary {
  color: var(--p-text-muted);
}

.chronicle__pace-metric {
  display: grid;
  gap: var(--size-0-5);
  justify-items: end;
}

.chronicle__pace-median {
  flex: none;
  font-variant-numeric: tabular-nums;
  color: var(--p-text-strong);
}

.chronicle__pace-samples {
  font-size: var(--text-sm);
  color: var(--p-text-muted);
}

.chronicle__duration-record {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--size-3);
  min-width: 0;
  padding-inline: 0;
  margin-top: var(--size-2);
}

/* One record-picker grammar: every timed hunt of the creature as a compact row — time, date,
   outcome — wrapping on narrow screens, never hiding behind a scroll affordance. */
.chronicle__pace-picks {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-2);
  min-width: 0;
  padding: 0;
  margin: 0;
  border: 0;
}

.chronicle__pace-pick {
  display: inline-flex;
  gap: var(--size-2);
  align-items: baseline;
  padding: var(--size-1-5) var(--size-3);
  font: inherit;
  font-size: var(--text-sm);
  font-variant-numeric: tabular-nums;
  text-align: start;
  cursor: pointer;
  background: var(--p-panel-sunken);
  border: var(--border) solid var(--p-line);
  border-radius: var(--rounded-full);
  transition:
    background var(--p-motion) var(--p-ease),
    border-color var(--p-motion) var(--p-ease);
}

.chronicle__pace-pick:hover {
  background: color-mix(in oklch, var(--p-gold) 6%, var(--p-panel-sunken));
}

.chronicle__pace-pick[aria-pressed='true'] {
  background: color-mix(in oklch, var(--p-gold) 14%, var(--p-panel));
  border-color: var(--p-gold);
}

.chronicle__pace-pick time {
  font-size: var(--text-xs);
  color: var(--p-text-muted);
}

.chronicle__pace-pick-outcome {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
}

.chronicle__pace-pick-outcome--victory {
  color: var(--p-moss);
}

.chronicle__pace-pick-outcome--defeat {
  color: var(--p-blood);
}

.chronicle__pace-origin {
  justify-self: start;
}

.chronicle__coverage {
  max-width: 76ch;
  margin: var(--size-3) 0 0;
  font-size: var(--text-xs);
  color: var(--p-text-muted);
}
</style>
