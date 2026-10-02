<script lang="ts" setup>
import '@vielzeug/refine/accordion';
import '@vielzeug/refine/accordion-item';
import { computed, ref } from 'vue';
import { t } from '../../../app/i18n';
import type { ChroniclesHuntRecord } from '../../../domain/chronicles';
import HuntRecordDetails from '../../components/HuntRecordDetails.vue';
import LinkButton from '../../components/LinkButton.vue';
import { formatDuration, formatSampleDate, monsterName, originRoute, page, tail } from './format';
import ShowMoreButton from './ShowMoreButton.vue';

const props = defineProps<{ records: ChroniclesHuntRecord[] }>();

const expanded = ref(false);
const recentHuntPage = computed(() => (expanded.value ? props.records : page(props.records)));
const recentHuntTail = computed(() => tail(props.records));
</script>

<template>
  <ore-accordion class="chronicle__recent-accordion" id="chronicle-recent-hunt-list" selection-mode="single"
    variant="text" :aria-label="t('chronicles.recentHunts')">
    <ore-accordion-item v-for="record in recentHuntPage" :key="record.id">
      <span class="chronicle__hunt-outcome" slot="prefix" :class="{
        'chronicle__hunt-outcome--defeat': record.outcome === 'defeat',
        'chronicle__hunt-outcome--victory': record.outcome === 'victory',
      }">
        {{ t(record.outcome === 'victory' ? 'chronicles.victoryWord' : 'chronicles.defeatWord') }}
      </span>
      <span slot="title">{{ monsterName(record.monsterId) }}</span>
      <span class="chronicle__hunt-date" slot="subtitle">
        <time :datetime="record.recordedAt">{{ formatSampleDate(record.recordedAt) }}</time>
        · {{ record.origin.name }}
      </span>
      <span class="chronicle__hunt-duration" slot="suffix">
        {{ record.durationMs === null ? t('chronicles.untimed') : formatDuration(record.durationMs) }}
      </span>
      <div class="chronicle__hunt-record">
        <LinkButton class="chronicle__hunt-origin" size="sm" v-bind="originRoute(record.origin)">
          {{ t('chronicles.openOrigin', { name: record.origin.name }) }}
        </LinkButton>
        <HuntRecordDetails layout="responsive" :record="record" />
      </div>
    </ore-accordion-item>
  </ore-accordion>
  <ShowMoreButton class="chronicle__recent-more" controls="chronicle-recent-hunt-list" v-if="recentHuntTail.length" :expanded="expanded"
    :hidden-count="recentHuntTail.length" :label="t(
      expanded ? 'chronicles.showFewerHunts' : 'chronicles.showMoreHunts',
      expanded ? {} : { count: recentHuntTail.length },
    )
      " @toggle="expanded = !expanded" />
</template>

<style scoped>
.chronicle__recent-accordion {
  --accordion-divider-color: transparent;
  --accordion-item-bg: transparent;
  --accordion-item-border-color: transparent;
  --accordion-item-hover-bg: color-mix(in oklch, var(--p-gold) 5%, transparent);
  margin-top: var(--size-3);
}

.chronicle__recent-accordion ore-accordion-item {
  --accordion-item-summary-padding: var(--size-2);
}

.chronicle__recent-accordion ore-accordion-item::part(summary) {
  gap: var(--size-3);
  min-height: var(--size-12);
  border: 0;
  border-radius: 0;
}

/* The row names the game it was recorded in beside its date; on narrow rows the name gives. */
.chronicle__recent-accordion ore-accordion-item::part(subtitle) {
  min-width: 0;
}

.chronicle__hunt-outcome {
  flex: none;
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
}

.chronicle__hunt-outcome--victory {
  color: var(--p-moss);
}

.chronicle__hunt-outcome--defeat {
  color: var(--p-blood);
}

.chronicle__hunt-date,
.chronicle__hunt-duration {
  font-variant-numeric: tabular-nums;
}

.chronicle__hunt-date {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  font-variant-numeric: tabular-nums;
  color: var(--p-text-muted);
  white-space: nowrap;
}

.chronicle__hunt-duration {
  color: var(--p-text-strong);
}

/* The record's way back: the owning game opens beside the details it produced. The grid
   stretches every row to the accordion's full width; only the link hugs its own size. */
.chronicle__hunt-record {
  display: grid;
  gap: var(--size-2);
}

.chronicle__hunt-origin {
  justify-self: start;
}
</style>
