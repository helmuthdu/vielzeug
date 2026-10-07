<script lang="ts" setup>
import '@vielzeug/refine/text';
import { createRadarChart, type RadarChartConfig, type RadarSeriesConfig } from '@vielzeug/prism';
import { computed, ref } from 'vue';
import { asset } from '../../../app/assets';
import { t, tp } from '../../../app/i18n';
import { STRENGTH_AXES } from '../../../domain/strength';
import type { BoardBuild, EquipmentSlot, Hunter, HunterStrengthAxis, HunterStrengths } from '../../../domain/types';
import HunterIdentity from '../../components/party/HunterIdentity.vue';
import LoadoutGrid from '../../components/party/LoadoutGrid.vue';
import { usePrismChart } from '../../composables/use-prism-chart';
import { formatCount } from './format';

/** One comparison side: the roster entry beside the loadout shape its most-used gear builds. */
export interface HunterComparisonSide {
  count: number;
  equipmentTotals: Partial<Record<EquipmentSlot, string>>;
  hunter: Hunter;
  member: Pick<BoardBuild, 'equipment' | 'potionLoadoutIds'>;
  /** The side's recorded build profiled: most-used gear scored with the latest deck. */
  profile: HunterStrengths;
}

const props = defineProps<{ sides: HunterComparisonSide[] }>();

const strengthAxisLabels = computed(
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
const strengthSeries = computed<RadarSeriesConfig[]>(() =>
  props.sides.map(({ hunter, profile }) => ({
    data: STRENGTH_AXES.map((axis) => ({ key: axis, value: profile[axis] })),
    name: hunter.name,
  })),
);
/** One shared radar of the overlaid shapes: fixed six axes, a 0-5 domain. */
const radarConfig = computed<RadarChartConfig>(() => ({
  a11y: {
    ariaLabel: t('chronicles.strength.chart', {
      first: props.sides[0]?.hunter.name ?? '',
      second: props.sides[1]?.hunter.name ?? '',
    }),
  },
  axes: STRENGTH_AXES.map((axis) => ({ key: axis, label: strengthAxisLabels.value[axis], max: 5 })),
  domain: [0, 5],
  grid: { levels: 5 },
  legend: true,
  series: strengthSeries.value,
}));
const strengthChartEl = ref<HTMLDivElement | null>(null);
usePrismChart(strengthChartEl, createRadarChart, () => radarConfig.value);
</script>

<template>
  <section class="chronicle__comparison">
    <ore-text color="muted" size="xs">{{ t('chronicles.strength.intro') }}</ore-text>
    <div class="chronicle__comparison-layout">
      <article v-for="(side, index) in sides" :key="side.hunter.id" :aria-label="side.hunter.name"
        :class="index === 1 ? 'chronicle__comparison-side chronicle__comparison-side--right' : 'chronicle__comparison-side'">
        <header class="chronicle__comparison-header">
          <img alt="" class="chronicle__comparison-portrait" :src="asset(side.hunter.artwork)" />
          <HunterIdentity :hunter="side.hunter" />
          <span class="chronicle__roster-count">
            {{ tp('chronicles.huntUnit', side.count, { count: formatCount(side.count) }) }}
          </span>
        </header>
        <div class="chronicle__comparison-equipment">
          <LoadoutGrid :can-consume="false" :can-edit="false" :compact="true" :equipment-totals="side.equipmentTotals"
            :hunter="side.hunter" :member="side.member" :show-potions="false" />
        </div>
      </article>

      <div class="chronicle__comparison-center">
        <div class="chronicle__strength-chart" ref="strengthChartEl"></div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Comparison is secondary to the selected hunter's recorded dossier. */
.chronicle__comparison {
  display: grid;
  gap: var(--size-3);
}

.chronicle__comparison-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(15rem, 1.1fr) minmax(0, 1fr);
  gap: var(--size-3);
  align-items: center;
}

.chronicle__comparison-side,
.chronicle__comparison-center {
  min-width: 0;
}

/* The sides render in template order; the grid places them around the center chart. */
.chronicle__comparison-side {
  display: grid;
  grid-row: 1;
  grid-column: 1;
  gap: var(--size-2);
}

.chronicle__comparison-side--right {
  grid-column: 3;
}

.chronicle__comparison-center {
  display: grid;
  grid-row: 1;
  grid-column: 2;
  gap: var(--size-2);
  align-content: center;
}

.chronicle__comparison-header {
  display: flex;
  gap: var(--size-2);
  align-items: center;
  min-width: 0;
  padding-block-end: var(--size-2);
  border-block-end: 1px solid var(--p-line);
}

.chronicle__comparison-portrait {
  flex: none;
  width: var(--size-14);
  height: var(--size-14);
  object-fit: cover;
  object-position: center 30%;
  background: var(--p-panel-sunken);
  border-radius: var(--rounded-sm);
}

.chronicle__comparison-header .hunter-identity {
  flex: 1 1 auto;
  min-width: 0;
}

.chronicle__comparison-header .chronicle__roster-count {
  flex: none;
}

.chronicle__comparison-equipment {
  min-width: 0;
}

.chronicle__comparison-equipment> :deep(.loadout-frame) {
  width: 100%;
}

.chronicle__strength-chart {
  justify-self: center;
  width: min(100%, 26rem);
  min-width: 0;
  aspect-ratio: 1;
}

@media (width < 640px) {
  .chronicle__strength-chart {
    width: min(100%, 20rem);
  }

  .chronicle__comparison-layout {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .chronicle__comparison-center {
    grid-row: 1;
    grid-column: 1 / -1;
  }

  .chronicle__comparison-side {
    grid-row: 2;
    grid-column: 1;
  }

  .chronicle__comparison-side--right {
    grid-row: 2;
    grid-column: 2;
  }

  .chronicle__comparison-header {
    display: grid;
    grid-template-columns: var(--size-14) minmax(0, 1fr);
  }

  .chronicle__comparison-header .hunter-identity,
  .chronicle__comparison-header .chronicle__roster-count {
    grid-column: 2;
  }

  .chronicle__comparison-header .chronicle__roster-count {
    justify-self: start;
  }
}

@media (width < 400px) {
  .chronicle__comparison-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .chronicle__comparison-side,
  .chronicle__comparison-side--right {
    grid-row: auto;
    grid-column: 1;
  }

  .chronicle__comparison-header {
    display: flex;
  }
}

@media (640px <=width < 1000px) {
  .chronicle__comparison-layout {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .chronicle__comparison-center {
    grid-row: 2;
    grid-column: 1 / -1;
  }

  .chronicle__comparison-side--right {
    grid-row: 1;
    grid-column: 2;
  }
}
</style>
