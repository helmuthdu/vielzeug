<script lang="ts" setup>
import '@vielzeug/refine/grid';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/stats';
import { type BarChartConfig, type BarSeriesConfig, type ChartEvent, createBarChart } from '@vielzeug/prism';
import { computed, ref } from 'vue';
import { t, tp } from '../../../app/i18n';
import type { ChroniclesMode, ChroniclesResult } from '../../../domain/chronicles';
import type { GameMode } from '../../../domain/types';
import RouteLink from '../../components/RouteLink.vue';
import { usePrismChart } from '../../composables/use-prism-chart';
import ChronicleSection from './ChronicleSection.vue';
import { formatCount, formatDate, formatPlayTime, formatRate, monsterName, monsterReference, originRoute, standing } from './format';

const props = defineProps<{ metrics: ChroniclesResult; mode: ChroniclesMode }>();
const emit = defineEmits<{ selectMode: [mode: ChroniclesMode] }>();

/** The record's protagonists: pure picks over the ranked results, in the chronicle's voice. */
const mostFaced = computed(() => props.metrics.monsters[0] ?? null);
const bestRecord = computed(() => {
  const candidates = props.metrics.monsters.filter(({ victories }) => victories > 0);

  return (
    candidates.sort(
      (left, right) =>
        right.victories - left.victories || left.defeats - right.defeats || left.id.localeCompare(right.id),
    )[0] ?? null
  );
});
const toughestRival = computed(() => {
  const candidates = props.metrics.monsters.filter(({ defeats }) => defeats > 0);

  return (
    candidates.sort(
      (left, right) =>
        right.defeats - left.defeats || left.victories - right.victories || left.id.localeCompare(right.id),
    )[0] ?? null
  );
});
const fastestHunt = computed(() => props.metrics.durations[0] ?? null);
const longestHunt = computed(
  () =>
    [...props.metrics.durations].sort(
      (left, right) => right.maxMs - left.maxMs || left.monsterId.localeCompare(right.monsterId),
    )[0] ?? null,
);
/** The closing line reads the newest hunt from the record's own newest-first list. */
const lastHunt = computed(() => props.metrics.recentHunts[0] ?? null);

/**
 * The record's provenance band: every mode the table has played, always unfiltered, each mode
 * keeping its own prism color. A chosen mode keeps its segment at full strength while the rest
 * dim, so folio I stays the campaign summary the divider filters — and a segment selects its
 * mode, the pressed segment returning to all.
 */
const BAND_MODES: { color: string; key: GameMode }[] = [
  { color: 'var(--prism-color-1)', key: 'campaign' },
  { color: 'var(--prism-color-2)', key: 'expedition' },
  { color: 'var(--prism-color-3)', key: 'ascent' },
  { color: 'var(--prism-color-4)', key: 'challenge' },
];
const bandSeries = computed<BarSeriesConfig[]>(() =>
  BAND_MODES.filter(({ key }) => props.metrics.byMode[key] > 0).map(({ color, key }) => ({
    color: props.mode === 'all' || props.mode === key ? color : `color-mix(in oklch, ${color} 45%, transparent)`,
    data: [{ key: 'record', value: props.metrics.byMode[key] }],
    name: t(`chronicles.mode.${key}`),
  })),
);

function selectFromBand(event: ChartEvent): void {
  const mode = BAND_MODES.find(({ key }) => t(`chronicles.mode.${key}`) === event.series.name)?.key;

  if (mode) emit('selectMode', props.mode === mode ? 'all' : mode);
}

const recordChartEl = ref<HTMLDivElement | null>(null);
usePrismChart(
  recordChartEl,
  (element, config: BarChartConfig) => createBarChart(element, config),
  (): BarChartConfig => ({
    a11y: { ariaLabel: t('chronicles.modeBar') },
    legend: true,
    margin: { bottom: 12, left: 0, right: 0, top: 12 },
    onClick: selectFromBand,
    series: bandSeries.value,
    tooltip: true,
    // The band is one stacked bar read through the legend: prism's default axes would
    // only repeat what the legend and tooltips already say.
    variant: 'stacked-horizontal',
    xAxis: false,
    yAxis: false,
  }),
);
</script>

<template>
  <ore-grid align="stretch" class="chronicle__overview" cols="1" cols-lg="2" gap="lg">
    <ChronicleSection class="chronicle__record" folio="I" id="chronicle-record" :intro="t('chronicles.recordIntro')"
      :label="t('chronicles.record')" :title="t('chronicles.record')">
      <div class="chronicle__record-body">
        <div class="chronicle__record-chart" ref="recordChartEl"></div>
        <div class="chronicle__stats">
          <ore-stats size="sm" variant="plain" :label="t('chronicles.victories')"
            :value="formatCount(metrics.victories)" />
          <ore-stats size="sm" variant="plain" :label="t('chronicles.defeats')" :value="formatCount(metrics.defeats)" />
          <ore-stats size="sm" variant="plain" :label="t('chronicles.successLabel')"
            :value="formatRate(metrics.winRate)" />
          <ore-stats size="sm" variant="plain" :label="t('chronicles.timedLabel')"
            :value="`${formatCount(metrics.timedAttempts)} / ${formatCount(metrics.attempts)}`" />
        </div>
        <p class="chronicle__record-last" v-if="lastHunt">
          <RouteLink
            class="chronicle__subject-link"
            v-bind="originRoute(lastHunt.origin)"
            :title="t('chronicles.openOrigin', { name: lastHunt.origin.name })">
            {{
              t('chronicles.lastHunt', {
                date: formatDate(lastHunt.recordedAt),
                monster: monsterName(lastHunt.monsterId),
                outcome: t(lastHunt.outcome === 'victory' ? 'chronicles.victoryWord' : 'chronicles.defeatWord'),
              })
            }}
          </RouteLink>
        </p>
      </div>
    </ChronicleSection>

    <aside class="chronicle__highlights" :aria-label="t('chronicles.highlights')">
      <div class="chronicle__highlights-grid">
        <ore-stats size="sm" variant="plain" v-if="mostFaced"
          :description="tp('chronicles.huntUnit', mostFaced.count, { count: mostFaced.count })"
          :label="t('chronicles.mostFaced')">
          <RouteLink class="chronicle__subject-link" slot="value" v-bind="monsterReference(mostFaced.id)">
            {{ monsterName(mostFaced.id) }}
          </RouteLink>
          <ore-icon aria-hidden="true" name="repeat" size="16" slot="icon" />
        </ore-stats>
        <ore-stats size="sm" variant="plain" v-if="metrics.timedAttempts > 0"
          :description="tp('chronicles.durationSamples', metrics.timedAttempts, { count: formatCount(metrics.timedAttempts) })"
          :label="t('chronicles.playTime')" :value="formatPlayTime(metrics.totalDurationMs)">
          <ore-icon aria-hidden="true" name="timer" size="16" slot="icon" />
        </ore-stats>
        <ore-stats size="sm" variant="plain" v-if="toughestRival"
          :description="standing(toughestRival.victories, toughestRival.defeats)" :label="t('chronicles.toughest')">
          <RouteLink class="chronicle__subject-link" slot="value" v-bind="monsterReference(toughestRival.id)">
            {{ monsterName(toughestRival.id) }}
          </RouteLink>
          <ore-icon aria-hidden="true" name="swords" size="16" slot="icon" />
        </ore-stats>
        <ore-stats size="sm" variant="plain" v-if="fastestHunt"
          :description="formatPlayTime(fastestHunt.medianMs)"
          :label="t('chronicles.fastest')">
          <RouteLink class="chronicle__subject-link" slot="value" v-bind="monsterReference(fastestHunt.monsterId)">
            {{ monsterName(fastestHunt.monsterId) }}
          </RouteLink>
          <ore-icon aria-hidden="true" name="fast-forward" size="16" slot="icon" />
        </ore-stats>
        <ore-stats size="sm" variant="plain" v-if="bestRecord"
          :description="standing(bestRecord.victories, bestRecord.defeats)" :label="t('chronicles.bestRecord')">
          <RouteLink class="chronicle__subject-link" slot="value" v-bind="monsterReference(bestRecord.id)">
            {{ monsterName(bestRecord.id) }}
          </RouteLink>
          <ore-icon aria-hidden="true" name="trophy" size="16" slot="icon" />
        </ore-stats>
        <ore-stats size="sm" variant="plain" v-if="longestHunt"
          :description="formatPlayTime(longestHunt.maxMs)"
          :label="t('chronicles.longest')">
          <RouteLink class="chronicle__subject-link" slot="value" v-bind="monsterReference(longestHunt.monsterId)">
            {{ monsterName(longestHunt.monsterId) }}
          </RouteLink>
          <ore-icon aria-hidden="true" name="clock" size="16" slot="icon" />
        </ore-stats>
      </div>
    </aside>
  </ore-grid>
</template>

<style scoped>
.chronicle__overview {
  margin-top: var(--size-7);
}

.chronicle__overview>* {
  margin-top: 0;
}

/* The record's provenance band leads, followed by its measures and the marks its protagonists left. */
.chronicle__record-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--size-4);
  margin-top: var(--size-5);
}

/* A fixed height is prism's documented container contract: the chart auto-sizes its svg to
   the content box, so an auto-height container would let the svg and legend feed each other.
   The band needs only this much; the legend rides inside the remaining height. */
.chronicle__record-chart {
  width: 100%;
  min-width: 0;
  height: 8rem;
}

/* The record's measures stay plain and unframed inside the journal. */
.chronicle__stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--size-2) var(--size-5);
}

.chronicle__stats ore-stats::part(label) {
  font-size: var(--text-sm);
  color: var(--p-text);
}

.chronicle__stats ore-stats::part(description) {
  font-size: var(--text-sm);
}

.chronicle__record-last {
  margin: 0;
  font-size: var(--text-sm);
  font-variant-numeric: tabular-nums;
  color: var(--p-text-muted);
}

.chronicle__highlights {
  min-width: 0;
  padding: var(--size-4);
  border: 1px solid var(--p-line);
  border-radius: var(--rounded-lg);
}

.chronicle__highlights-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--size-2) var(--size-5);
}

.chronicle__highlights-grid ore-stats {
  --stats-icon-bg: transparent;
  --stats-padding: var(--size-2-5);
}

.chronicle__highlights-grid ore-stats::part(header) {
  gap: var(--size-1);
  justify-content: flex-start;
}

.chronicle__highlights-grid ore-stats::part(icon) {
  flex-basis: var(--size-5);
  width: var(--size-5);
  height: var(--size-5);
}

@media (width < 640px) {
  .chronicle__record-chart {
    height: 5rem;
  }
}

@media (width >=1280px) {
  .chronicle__stats {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
</style>
