<script lang="ts" setup>
import '@vielzeug/refine/text';
import { createRadarChart, type RadarChartConfig } from '@vielzeug/prism';
import { computed, ref } from 'vue';
import { t } from '../../../app/i18n';
import { buildProfile, hunterProfile, STRENGTH_AXES } from '../../../domain/strength';
import type { Hunter, HunterBuild, HunterStrengthAxis, HunterStrengths } from '../../../domain/types';
import { usePrismChart } from '../../composables/use-prism-chart';

const props = defineProps<{ build: HunterBuild; hunter: Hunter }>();

const axisLabels = computed(
  () =>
    ({
      control: t('strength.axis.control'),
      defense: t('strength.axis.defense'),
      mobility: t('strength.axis.mobility'),
      power: t('strength.axis.power'),
      speed: t('strength.axis.speed'),
      support: t('strength.axis.support'),
    }) satisfies Record<HunterStrengthAxis, string>,
);

const starter = computed<HunterStrengths>(() => hunterProfile(props.hunter));
const current = computed<HunterStrengths>(() => buildProfile(props.build, props.hunter));

const rows = computed(() =>
  STRENGTH_AXES.map((axis) => {
    const delta = Math.round((current.value[axis] - starter.value[axis]) * 10) / 10;

    return { axis, delta, label: axisLabels.value[axis], value: current.value[axis] };
  }),
);

const radarConfig = computed<RadarChartConfig>(() => ({
  a11y: { ariaLabel: t('builds.profileChart', { hunter: props.hunter.name }) },
  axes: STRENGTH_AXES.map((axis) => ({ key: axis, label: axisLabels.value[axis], max: 5 })),
  domain: [0, 5],
  grid: { levels: 5 },
  legend: true,
  series: [
    {
      // The starter baseline rides the river-blue token: against the gold current line
      // the two shapes stay distinct in light mode, where the muted gray it used before
      // sat a breath away from the gold in hue and lightness.
      color: 'var(--p-river)',
      data: STRENGTH_AXES.map((axis) => ({ key: axis, value: starter.value[axis] })),
      name: t('builds.profileStarter'),
    },
    {
      color: 'var(--p-gold)',
      data: STRENGTH_AXES.map((axis) => ({ key: axis, value: current.value[axis] })),
      name: t('builds.profileCurrent'),
    },
  ],
}));
const chartEl = ref<HTMLDivElement | null>(null);
usePrismChart(chartEl, createRadarChart, () => radarConfig.value);

const formatDelta = (delta: number) => (delta > 0 ? `+${delta.toFixed(1)}` : `−${Math.abs(delta).toFixed(1)}`);
</script>

<template>
  <section aria-labelledby="build-profile-title" class="panel stack">
    <div class="card-title">
      <div>
        <ore-text as="h2" id="build-profile-title" size="sm" variant="heading">{{ t('builds.profileTitle')
          }}</ore-text>
        <ore-text color="muted" size="sm">{{ t('builds.profileHint', { hunter: hunter.name }) }}</ore-text>
      </div>
    </div>

    <div class="build-profile__chart" ref="chartEl"></div>

    <dl class="build-profile__rows">
      <div class="build-profile__row" v-for="row in rows" :key="row.axis">
        <dt>{{ row.label }}</dt>
        <dd class="build-profile__value">{{ row.value.toFixed(1) }}</dd>
        <dd
          class="build-profile__delta"
          v-if="row.delta !== 0"
          :class="row.delta > 0 ? 'build-profile__delta--up' : 'build-profile__delta--down'"
        >
          <span aria-hidden="true">{{ formatDelta(row.delta) }}</span>
          <span class="visually-hidden">{{
            row.delta > 0
              ? t('builds.profileDeltaAbove', { delta: Math.abs(row.delta).toFixed(1) })
              : t('builds.profileDeltaBelow', { delta: Math.abs(row.delta).toFixed(1) })
          }}</span>
        </dd>
      </div>
    </dl>
  </section>
</template>

<style scoped>
.build-profile__chart {
  justify-self: center;
  width: min(100%, 20rem);
  aspect-ratio: 1;
}

.build-profile__rows {
  display: grid;
  gap: var(--size-1);
  margin: 0;
}

.build-profile__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: var(--size-2);
  align-items: baseline;
}

.build-profile__value {
  margin: 0;
  font-variant-numeric: tabular-nums;
}

.build-profile__delta {
  min-width: var(--size-8);
  margin: 0;
  font-variant-numeric: tabular-nums;
  text-align: end;
}

.build-profile__delta--up {
  color: var(--p-gold);
}

.build-profile__delta--down {
  color: var(--p-blood);
}
</style>
