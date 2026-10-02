<script lang="ts" setup>
import { computed } from 'vue';
import { t } from '../../../app/i18n';
import { DECK_TYPES, type DeckReport, type DeckType } from '../../../domain/deck';
import '@vielzeug/refine/chip';
import '@vielzeug/refine/progress';
import '@vielzeug/refine/text';

/**
 * Printed weapon composition against the selected cards. Full mode renders one segmented bar per
 * type; `compact` renders the four counts as a single line for summaries (party board, loadout list).
 * `conditional` marks a target-less deck whose budget comes from the best available hunt: the
 * advantages only hold against a monster weak to what the build covers.
 */
const props = defineProps<{ compact?: boolean; conditional?: boolean; report: DeckReport }>();

const rows = computed(() =>
  DECK_TYPES.map((type) => {
    const required = props.report.required?.[type] ?? 0;
    const selected = props.report.selected[type];
    return { max: Math.max(required, selected, 1), required, selected, type };
  }),
);
const requiredTotal = computed(() =>
  props.report.required ? Object.values(props.report.required).reduce((sum, count) => sum + count, 0) : 0,
);
const typeLabel = (type: DeckType) => t(`deck.type.${type}`);

const status = computed(() => {
  if (!props.report.required) return { color: 'warning', label: t('deck.statusNoWeapon') } as const;
  if (props.report.valid) return { color: 'success', label: t('deck.statusReady') } as const;
  return { color: 'error', label: t('deck.statusInvalid') } as const;
});
</script>

<template>
  <div class="composition composition--compact" v-if="compact">
    <span class="composition__count" v-for="row in rows" :key="row.type">
      <span class="composition__count-type">{{ typeLabel(row.type) }}</span>
      <span class="composition__numbers" :class="{ 'composition__numbers--off': row.selected !== row.required }">
        {{ row.selected }}<span class="composition__of">/{{ row.required }}</span>
      </span>
    </span>
    <ore-chip size="sm" variant="flat" :color="status.color" :title="t('deck.statusBasis')" >{{ status.label }}</ore-chip>
  </div>

  <div class="composition" v-else>
    <div class="composition__head">
      <ore-text variant="overline">{{ t('deck.compositionTitle') }}</ore-text>
      <span class="cluster" style="--cluster-gap: var(--size-2)">
        <ore-text class="composition__total" variant="heading">
          {{ report.size }}<span class="composition__of"> / {{ requiredTotal }}</span>
        </ore-text>
        <ore-chip size="sm" variant="flat" :color="status.color" :title="t('deck.statusBasis')" >{{ status.label }}</ore-chip>
      </span>
    </div>

    <ol class="composition__rows" :aria-label="t('deck.compositionTitle')">
      <li class="composition__row" v-for="row in rows" :key="row.type">
        <span class="composition__type">{{ typeLabel(row.type) }}</span>
        <ore-progress
          size="sm"
          :color="row.selected === row.required ? 'success' : row.selected > row.required ? 'warning' : 'error'"
          :max="row.max"
          :segments="row.max"
          :value="row.selected"
          :value-text="t('deck.compositionRowAria', { required: row.required, selected: row.selected, type: typeLabel(row.type) })" />
        <span class="composition__numbers" :class="{ 'composition__numbers--off': row.selected !== row.required }">
          {{ row.selected }}<span class="composition__of">/{{ row.required }}</span>
        </span>
      </li>
    </ol>

    <ore-text class="composition__advantages" color="muted" size="sm" v-if="report.required">
      <template v-if="report.advantages">
        {{ t('deck.advantagesUsed', { total: report.advantages, used: report.advantagesUsed }) }}
        <template v-if="conditional"> {{ t('deck.advantagesConditional') }}</template>
      </template>
      <template v-else>{{ t('deck.advantagesNone') }}</template>
    </ore-text>
  </div>
</template>

<style scoped>
.composition {
  display: grid;
  gap: var(--size-3);
}

.composition__head {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-2);
  align-items: baseline;
  justify-content: space-between;
}

.composition__total {
  font-variant-numeric: tabular-nums;
}

.composition__of {
  font-weight: var(--font-normal);
  color: var(--p-text-muted);
}

.composition__rows {
  display: grid;
  gap: var(--size-2);
  padding: 0;
  margin: 0;
  list-style: none;
}

.composition__row {
  display: grid;
  grid-template-columns: minmax(var(--size-20), auto) minmax(0, 1fr) auto;
  gap: var(--size-3);
  align-items: center;
}

.composition__type {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  text-transform: uppercase;
  letter-spacing: var(--p-tracking);
}

.composition__numbers {
  min-width: var(--size-12);
  font-variant-numeric: tabular-nums;
  text-align: end;
}

.composition__numbers--off {
  font-weight: var(--font-semibold);
  color: var(--color-warning);
}

.composition--compact {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-2) var(--size-4);
  align-items: center;
}

.composition__count {
  display: inline-flex;
  gap: var(--size-1);
  align-items: baseline;
  font-size: var(--text-sm);
}

.composition__count-type {
  font-size: var(--text-xs);
  color: var(--p-text-muted);
  text-transform: uppercase;
  letter-spacing: var(--p-tracking);
}

.composition--compact .composition__numbers {
  min-width: 0;
}
</style>
