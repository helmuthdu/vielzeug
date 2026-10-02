<script lang="ts" setup>
import { type ChartHandle, createLineChart, type LineSeriesConfig } from '@vielzeug/prism';
import { createVirtualizer, type Virtualizer, type VirtualizerState } from '@vielzeug/scroll';
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, watch } from 'vue';
import { t } from '../../app/i18n';
import { hunterById, monsterById, monsterStatusById, potionById, statusById, terrainById } from '../../content';
import { fightProgress, fightTimelineMode } from '../../domain/fight-progress';
import type { HuntEvent, HunterCondition, HunterCounter, HuntRecord, MonsterCounter, MonsterToken } from '../../domain/types';

const props = defineProps<{ record: HuntRecord }>();
const chartElement = ref<HTMLDivElement | null>(null);
const listElement = ref<HTMLElement | null>(null);
const virtualState = shallowRef<VirtualizerState>({ items: [], stickyItems: [], totalSize: 0 });
const selectedSequence = ref<number | null>(null);
const virtualized = computed(() => props.record.events.length > 48);
const progress = computed(() => fightProgress(props.record));
const mode = computed(() => fightTimelineMode(props.record));
const selectedEvent = computed(() => props.record.events.find((event) => event.sequence === selectedSequence.value));
const eventHighlights = computed(() => [
  { color: 'var(--p-pink)', name: t('chronicles.timeline.markerStance'), type: 'stance', yAxis: 'right' },
  { color: 'var(--p-blood)', name: t('chronicles.timeline.markerWound'), type: 'wound', yAxis: 'right' },
  { color: 'var(--p-purple)', name: t('chronicles.timeline.markerUnleash'), type: 'unleash', yAxis: 'left' },
  { color: 'var(--p-cyan)', name: t('chronicles.timeline.markerKnockout'), type: 'knockout', yAxis: 'left' },
  { color: 'var(--p-gold)', name: t('chronicles.timeline.markerMasteryFocused'), type: 'mastery-focused', yAxis: 'left' },
] as const);
const progressBySequence = computed(() => new Map(progress.value.map((point) => [point.sequence, point])));
let chart: ChartHandle<LineSeriesConfig[]> | undefined;
let chartRecordId: string | undefined;
let virtualizer: Virtualizer | undefined;

function position(event: HuntEvent): number {
  return mode.value === 'sequence' ? event.sequence : event.elapsedMs!;
}

function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

function timeLabel(event: HuntEvent): string {
  return mode.value === 'sequence'
    ? t('chronicles.timeline.sequence', { number: event.sequence })
    : formatDuration(event.elapsedMs!);
}

function actorName(event: HuntEvent): string {
  return event.actor.kind === 'hunter'
    ? hunterById(event.actor.hunterId)?.name ?? event.actor.hunterId
    : monsterById(event.actor.monsterId)?.name ?? event.actor.monsterId;
}

function nameOfStatus(event: Extract<HuntEvent, { type: 'counter' | 'effect' }>): string {
  const id = event.type === 'counter' ? event.counter : event.effect;
  const status = event.actor.kind === 'hunter' ? statusById(id as HunterCounter | HunterCondition) : monsterStatusById(id as MonsterCounter | MonsterToken);
  return status?.name ?? id;
}

function isMasteryFocusEvent(event: HuntEvent): boolean {
  return progressBySequence.value.get(event.sequence)?.masteryFocused === true;
}

function description(event: HuntEvent): string {
  const actor = actorName(event);
  switch (event.type) {
    case 'potion': return t(event.consumed ? 'chronicles.timeline.potionConsumed' : 'chronicles.timeline.potionConsumptionUndone', { actor, potion: potionById(event.potionId)?.name ?? event.potionId });
    case 'build': return t('chronicles.timeline.buildChanged', { actor });
    case 'damage': return t(event.delta < 0 ? 'chronicles.timeline.heal' : 'chronicles.timeline.damage', { actor, amount: Math.abs(event.delta), value: event.value });
    case 'counter': return isMasteryFocusEvent(event)
      ? t('chronicles.timeline.masteryFocused', { actor })
      : t('chronicles.timeline.counter', { actor, name: nameOfStatus(event), value: event.value });
    case 'effect': return t(event.active ? 'chronicles.timeline.effectOn' : 'chronicles.timeline.effectOff', { actor, name: nameOfStatus(event) });
    case 'knockout': return t('chronicles.timeline.knockout', { actor, token: event.token ?? t('chronicles.timeline.recovered') });
    case 'depletion': return t(event.depleted ? 'chronicles.timeline.depleted' : 'chronicles.timeline.restored', { actor, slot: t(({ armor: 'party.slotArmor', helm: 'party.slotHelm' } as const)[event.slot]) });
    case 'wound-ready': return t('chronicles.timeline.woundReady', { actor, damage: event.damage, threshold: event.threshold });
    case 'wound': return t('chronicles.timeline.wound', { actor, damage: event.damageRemoved, stance: event.stance });
    case 'stance': return t('chronicles.timeline.stance', { actor, from: event.from, to: event.to, toughness: event.toughness });
    case 'unleash': return t('chronicles.timeline.unleash', { actor });
    case 'reset': return t('chronicles.timeline.reset', { actor });
    case 'terrain': return t('chronicles.timeline.terrain', { action: t(`chronicles.timeline.terrainAction.${event.action}`), actor, name: terrainById(event.terrainId)?.name ?? event.terrainId });
  }
}

function selectEvent(sequence: number, scroll = false): void {
  selectedSequence.value = sequence;
  if (scroll) {
    const index = props.record.events.findIndex((event) => event.sequence === sequence);
    if (index >= 0) virtualizer?.scrollToIndex(index, { align: 'center' });
  }
}

function navigateEvents(event: KeyboardEvent, index: number): void {
  const offsets: Record<string, number> = { ArrowDown: 1, ArrowUp: -1, PageDown: 6, PageUp: -6 };
  let nextIndex: number;
  if (event.key === 'Home') nextIndex = 0;
  else if (event.key === 'End') nextIndex = props.record.events.length - 1;
  else if (event.key in offsets) nextIndex = index + offsets[event.key]!;
  else return;
  event.preventDefault();
  nextIndex = Math.max(0, Math.min(props.record.events.length - 1, nextIndex));
  const sequence = props.record.events[nextIndex]!.sequence;
  selectEvent(sequence, true);
  nextTick(() => listElement.value?.querySelector<HTMLElement>(`[data-vz-key="${sequence}"] .hunt-timeline__event`)?.focus());
}

const chartSeries = computed<LineSeriesConfig[]>(() => {
  const series: LineSeriesConfig[] = [];
  if (progress.value.every((point) => point.partyHealth !== null)) {
    series.push({ color: 'var(--p-river)', curve: 'step',
      data: progress.value.map((point) => ({ key: point.key, meta: { sequence: point.sequence }, value: point.partyHealth! })), name: t('chronicles.timeline.partyHealth'), showPoints: false});
  }
  series.push({ color: 'var(--p-blood)', curve: 'step',
    data: progress.value.map((point) => ({ key: point.key, meta: { sequence: point.sequence }, value: point.monsterDamage })), name: t('chronicles.timeline.monsterDamage'), showPoints: false, yAxis: 'right'});
  const marker = (event: HuntEvent) => {
    const point = progressBySequence.value.get(event.sequence)!;
    const value = event.actor.kind === 'hunter' || event.type === 'unleash' ? point.partyHealth : point.monsterDamage;
    if (value === null) return null;
    return {
      key: position(event),
      meta: { description: description(event), sequence: event.sequence, type: event.type },
      value,
    };
  };
  for (const highlight of eventHighlights.value) {
    series.push({
      color: highlight.color,
      data: props.record.events.filter((event) => highlight.type === 'mastery-focused'
        ? isMasteryFocusEvent(event)
        : event.type === highlight.type && !(event.type === 'knockout' && event.token === null)).map(marker).filter((point) => point !== null),
      name: highlight.name,
      pointRadius: 6,
      showPoints: true,
      strokeWidth: 0,
      yAxis: highlight.yAxis,
    });
  }
  if (selectedEvent.value) {
    const selectedMarker = marker(selectedEvent.value);
    series.push({
      color: 'var(--p-river)',
      data: selectedMarker ? [selectedMarker] : [],
      name: t('chronicles.timeline.markerSelected'),
      pointRadius: 8,
      showPoints: true,
      strokeWidth: 0,
      yAxis: selectedEvent.value.actor.kind === 'hunter' || selectedEvent.value.type === 'unleash' ? 'left' : 'right',
    });
  }
  return series;
});

watch([chartElement, chartSeries], () => {
  if (chartRecordId !== props.record.id) {
    chart?.dispose();
    chart = undefined;
    chartRecordId = props.record.id;
  }
  if (!chartElement.value || !props.record.events.length) {
    chart?.dispose(); chart = undefined; return;
  }
  if (chart) chart.update(chartSeries.value);
  else chart = createLineChart(chartElement.value, {
    a11y: { ariaLabel: t('chronicles.timeline.chartLabel', { monster: monsterById(props.record.monsterId)?.name ?? props.record.monsterId }) },crosshair: true,legend: false,
    margin: { left: 64, right: 64 },
    onClick: ({ datum }) => { const sequence = datum.meta?.sequence; if (typeof sequence === 'number' && sequence > 0) selectEvent(sequence, true); },
    rightYAxis: { label: t('chronicles.timeline.damageAxis'), tickCount: 4 },
    series: chartSeries.value,
    tooltip: { render: (datum, series) => {
      const label = document.createElement('span');
      label.textContent = typeof datum.meta?.description === 'string' ? datum.meta.description : `${series.name}: ${datum.value}`;
      return label;
    } },transition: { preference: 'never' },
    xAxis: { tickFormat: (value) => mode.value === 'sequence' ? String(value) : formatDuration(Number(value)) },
    yAxis: { label: t('chronicles.timeline.healthAxis'), tickCount: 4 },
  });
}, { flush: 'post' });

watch([listElement, () => props.record], () => {
  virtualizer?.dispose(); virtualizer = undefined; selectedSequence.value = null;
  if (!listElement.value || !virtualized.value) return;
  listElement.value.scrollTop = 0;
  virtualizer = createVirtualizer(listElement.value, {autoMeasure: true,
    count: props.record.events.length, estimateSize: 64,
    getItemKey: (index) => props.record.events[index]!.sequence,
    onChange: (state) => { virtualState.value = state; },overscan: 4,
  });
  virtualState.value = virtualizer.getSnapshot();
}, { flush: 'post' });

onBeforeUnmount(() => { virtualizer?.dispose(); chart?.dispose(); });
</script>

<template>
  <section class="hunt-timeline" :aria-label="t('chronicles.timeline.title')">
    <h4 class="hunt-timeline__title">{{ t('chronicles.timeline.title') }}</h4>
    <p class="hunt-timeline__empty" v-if="!record.events.length" >{{ t('chronicles.timeline.empty') }}</p>
    <template v-else>
      <div class="hunt-timeline__chart" ref="chartElement" ></div>
      <ul class="hunt-timeline__legend" :aria-label="t('chronicles.timeline.legend')">
        <li v-if="progress.every((point) => point.partyHealth !== null)"><span class="hunt-timeline__swatch hunt-timeline__swatch--health"></span>{{ t('chronicles.timeline.partyHealth') }}</li>
        <li><span class="hunt-timeline__swatch hunt-timeline__swatch--damage"></span>{{ t('chronicles.timeline.monsterDamage') }}</li>
        <li v-for="highlight in eventHighlights" :key="highlight.type">
          <span class="hunt-timeline__swatch hunt-timeline__swatch--marker" :style="{ background: highlight.color }"></span>{{ highlight.name }}
        </li>
      </ul>
      <p class="hunt-timeline__hint">{{ t(record.durationMs === null ? 'chronicles.timeline.sequenceHint' : mode === 'time' ? 'chronicles.timeline.timeHint' : 'chronicles.timeline.incompleteTimeHint') }}</p>
      <p class="hunt-timeline__hint" v-if="progress.some((point) => point.partyHealth === null)" >{{ t('chronicles.timeline.healthUnavailable') }}</p>
      <p class="hunt-timeline__hint">{{ t('chronicles.timeline.targetUnavailable') }}</p>
      <p aria-live="polite" class="hunt-timeline__selection" v-if="selectedEvent" >{{ timeLabel(selectedEvent) }} · {{ description(selectedEvent) }}</p>
      <section class="hunt-timeline__event-viewport" v-if="virtualized" ref="listElement" :aria-label="t('chronicles.timeline.events')">
        <ol class="hunt-timeline__events hunt-timeline__events--virtual" :style="{ height: `${virtualState.totalSize}px` }">
          <li v-for="item in virtualState.items" :key="record.events[item.index]!.sequence" :aria-posinset="item.index + 1" :aria-setsize="record.events.length" :data-vz-key="record.events[item.index]!.sequence" :style="{ position: 'absolute', top: `${item.start}px`, width: '100%' }">
            <ore-button class="hunt-timeline__event" fullwidth variant="ghost" :aria-pressed="selectedSequence === record.events[item.index]!.sequence" @click="selectEvent(record.events[item.index]!.sequence)" @keydown="navigateEvents($event, item.index)">
              <span class="hunt-timeline__time">{{ timeLabel(record.events[item.index]!) }}</span>
              <span class="hunt-timeline__description">{{ description(record.events[item.index]!) }}</span>
            </ore-button>
          </li>
        </ol>
      </section>
      <ol class="hunt-timeline__events" v-else :aria-label="t('chronicles.timeline.events')">
        <li v-for="event in record.events" :key="event.sequence">
          <ore-button class="hunt-timeline__event" fullwidth variant="ghost" :aria-pressed="selectedSequence === event.sequence" @click="selectEvent(event.sequence)">
            <span class="hunt-timeline__time">{{ timeLabel(event) }}</span><span class="hunt-timeline__description">{{ description(event) }}</span>
          </ore-button>
        </li>
      </ol>
    </template>
  </section>
</template>

<style scoped>
.hunt-timeline { display: grid; gap: var(--size-2); min-width: 0; padding: var(--size-3) var(--size-4); margin-block: var(--size-3); background: var(--p-panel-sunken); border-radius: var(--rounded-sm); }
.hunt-timeline__title { margin: 0; font-size: var(--text-sm); }
.hunt-timeline__chart { width: 100%; min-width: 0; height: var(--size-64); }
.hunt-timeline__hint, .hunt-timeline__empty { margin: 0; font-size: var(--text-xs); color: var(--p-text-muted); }
.hunt-timeline__legend { display: flex; flex-wrap: wrap; gap: var(--size-2) var(--size-4); padding: 0; margin: 0; font-size: var(--text-xs); list-style: none; }
.hunt-timeline__legend li { display: flex; gap: var(--size-1); align-items: center; }
.hunt-timeline__swatch { width: var(--size-3); height: var(--size-1); }
.hunt-timeline__swatch--health { background: var(--p-river); }
.hunt-timeline__swatch--damage { background: var(--p-blood); }
.hunt-timeline__swatch--marker { width: var(--size-2); height: var(--size-2); border-radius: var(--rounded-full); }
.hunt-timeline__event-viewport { height: var(--size-96); max-height: var(--size-96); overflow-y: auto; overscroll-behavior: contain; scrollbar-color: var(--p-line) transparent; }
.hunt-timeline__event-viewport:focus-visible { outline: var(--border-2) solid var(--p-gold); outline-offset: var(--size-1); }
.hunt-timeline__events { padding: 0; margin: 0; list-style: none; }
.hunt-timeline__events--virtual { position: relative; }
.hunt-timeline__event { --button-padding: var(--size-2); --button-font-size: var(--text-xs); }
.hunt-timeline__event::part(button) { justify-content: flex-start; height: auto; min-height: var(--size-12); text-align: start; white-space: normal; }
.hunt-timeline__event::part(content) { display: grid; grid-template-columns: var(--size-16) minmax(0, 1fr); gap: var(--size-2); width: 100%; white-space: normal; }
.hunt-timeline__time { display: inline-block; min-width: var(--size-16); font-variant-numeric: tabular-nums; color: var(--p-text-muted); }
.hunt-timeline__description { overflow-wrap: anywhere; white-space: normal; }
.hunt-timeline__selection { padding-block-start: var(--size-2); margin: 0; font-size: var(--text-xs); border-block-start: var(--border) solid var(--p-line); }
</style>
