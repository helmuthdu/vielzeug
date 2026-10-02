<script lang="ts" setup>
/**
 * The shared score worksheet: the base row, one row per printed modifier (points chip +
 * condition and a counter or, for yes/no conditions, a flag switch) and the live total.
 * Both score surfaces render it: the Hunter's Trial's inline sheet and the Winds reward's
 * dialog, so the ritual stays one thing. Most inputs are table facts the companion does
 * not track, so the party fills it by hand; this only does the arithmetic.
 */
import { computed } from 'vue';
import { t } from '../../../app/i18n';
import type { TrialScoreModifier } from '../../../content/index';
import { worksheetTotal } from '../../../domain/trial-score';
import '@vielzeug/refine/counter';
import '@vielzeug/refine/switch';
import '@vielzeug/refine/text';

const props = defineProps<{
  base: number;
  /** The hunt was lost: victory-scoped rows read only and dimmed. */
  defeat?: boolean;
  modifiers: TrialScoreModifier[];
  /** One answer per modifier, in printed order: flags are 0 or 1. */
  modelValue: number[];
}>();

const emit = defineEmits<{ 'update:modelValue': [answers: number[]] }>();

const total = computed(() => worksheetTotal(props.base, props.modifiers, props.modelValue, props.defeat ?? false));
const gated = (scope: 'always' | 'victory') => scope === 'victory' && (props.defeat ?? false);
/** The row's accessible name: points and condition together, so bonus and penalty rows tell apart. */
const rowName = (modifier: TrialScoreModifier): string =>
  t('trialScore.rowAria', {
    condition: modifier.condition,
    points: modifier.points > 0 ? `+${modifier.points}` : String(modifier.points),
  });

/** The counter reports through a CustomEvent carrying the new value. */
function setCount(index: number, event: Event): void {
  const { value } = (event as CustomEvent<{ value: number }>).detail;
  const answers = [...props.modelValue];
  answers[index] = value;
  emit('update:modelValue', answers);
}

/** The switch flips its own flag; the answers follow the new state. */
function toggleFlag(index: number): void {
  const answers = [...props.modelValue];
  answers[index] = (answers[index] ?? 0) > 0 ? 0 : 1;
  emit('update:modelValue', answers);
}
</script>

<template>
  <div class="score-worksheet">
    <div class="score-worksheet__base" v-if="base > 0">
      <ore-text color="muted" size="sm">{{ t('trialScore.base') }}</ore-text>
      <ore-text class="score-worksheet__points" size="md" variant="label">{{ base }}</ore-text>
    </div>

    <ul class="score-worksheet__rows">
      <li
        class="score-worksheet__row"
        v-for="(modifier, index) in modifiers"
        :key="index"
        :aria-label="rowName(modifier)"
        :class="{
          'score-worksheet__row--count': modifier.kind === 'count',
          'score-worksheet__row--gated': gated(modifier.scope),
        }">
        <div class="score-worksheet__row-copy">
          <span
            class="score-worksheet__badge"
            :aria-hidden="true"
            :class="modifier.points > 0 ? 'score-worksheet__badge--plus' : 'score-worksheet__badge--minus'">
            {{ modifier.points > 0 ? `+${modifier.points}` : modifier.points }}
          </span>
          <ore-text class="score-worksheet__condition" size="sm">{{ modifier.condition }}</ore-text>
          <span class="score-worksheet__scope" v-if="gated(modifier.scope)">
            {{ t('trialScore.victoryOnly') }}
          </span>
        </div>
        <ore-switch
          size="sm"
          v-if="modifier.kind === 'flag'"
          :aria-label="rowName(modifier)"
          :checked="(modelValue[index] ?? 0) > 0"
          :disabled="gated(modifier.scope)"
          @change="toggleFlag(index)"/>
        <ore-counter
          size="sm"
          v-else
          :aria-label="rowName(modifier)"
          :max="modifier.max ?? 30"
          :readonly="gated(modifier.scope)"
          :value="modelValue[index] ?? 0"
          @change="setCount(index, $event)"/>
      </li>
    </ul>

    <div aria-live="polite" class="score-worksheet__total">
      <ore-text size="sm" variant="label">{{ t('trialScore.total') }}</ore-text>
      <ore-text class="score-worksheet__points score-worksheet__total-points" size="xl" variant="label">
        {{ total }}
      </ore-text>
    </div>
  </div>
</template>

<style scoped>
.score-worksheet {
  display: grid;
  gap: var(--size-3);
}

.score-worksheet__base,
.score-worksheet__total {
  display: flex;
  gap: var(--size-3);
  align-items: baseline;
  justify-content: space-between;
}

.score-worksheet__base {
  padding-bottom: var(--size-3);
  border-bottom: var(--border) solid var(--p-line);
}

.score-worksheet__rows {
  display: grid;
  gap: var(--size-2);
  padding: 0;
  margin: 0;
  list-style: none;
}

/* Every row shares one height: the borderless compact counter is exactly --size-8 tall, and
   the min-height stretches switch rows to match. On coarse pointers both controls' 44px
   touch targets grow together, so the rhythm holds there too. */
.score-worksheet__row {
  display: flex;
  gap: var(--size-3);
  align-items: center;
  justify-content: space-between;
  min-height: var(--size-8);
  padding-block: var(--size-1);
  border-bottom: var(--border) dashed var(--p-line);
}

/* Invisible rather than removed: the divider's 1px belongs to every row's shared height. */
.score-worksheet__row:last-child {
  border-bottom-color: transparent;
}

.score-worksheet__row--gated {
  opacity: 0.5;
}

.score-worksheet__row-copy {
  display: flex;
  flex: 1;
  gap: var(--size-2);
  align-items: center;
  min-width: 0;
}

/* The counter ships as a boxed tally widget (surface, border, padding) for standalone
   scoreboard use. Inside a worksheet row it must read as a bare control like the flag
   switch beside it: restyled only through its public custom properties and parts. */
.score-worksheet__row ore-counter {
  --counter-bg: transparent;
  --counter-border-color: transparent;
  --counter-button-size: var(--size-8);
  --counter-gap: var(--size-1-5);
  --counter-value-size: var(--text-lg);
}

.score-worksheet__row ore-counter::part(counter) {
  padding: 0;
  /* The already-transparent border would still add 2px and break the shared row height. */
  border: none;
}

.score-worksheet__condition {
  min-width: 0;
}

/* Why a victory-scoped row reads only after a lost hunt. */
.score-worksheet__scope {
  flex-shrink: 0;
  padding: 0 var(--size-1);
  font-size: var(--text-xs);
  color: var(--p-text-muted);
  border: var(--border) solid var(--p-line);
  border-radius: var(--rounded-sm);
}

/* The printed points read as a small score chip: gains in gold, losses in blood. */
.score-worksheet__badge {
  flex-shrink: 0;
  min-width: 2.25rem;
  padding: 0.1rem var(--size-2);
  font-family: var(--p-heading);
  font-size: var(--text-sm);
  text-align: center;
  border-radius: var(--rounded-sm);
}

.score-worksheet__badge--plus {
  color: var(--p-gold);
  background: color-mix(in oklch, var(--p-gold) 14%, transparent);
}

.score-worksheet__badge--minus {
  color: var(--p-blood);
  background: color-mix(in oklch, var(--p-blood) 14%, transparent);
}

.score-worksheet__total {
  padding-top: var(--size-3);
  border-top: var(--border) solid var(--p-line);
}

.score-worksheet__total-points {
  color: var(--p-text-strong);
}

.score-worksheet__points {
  font-family: var(--p-heading);
}

/* Below phone width the tally cannot sit beside readable condition text; it drops under
   the copy, right-aligned, keeping its touch targets. Flag switches stay inline. */
@media (width < 560px) {
  .score-worksheet__row--count {
    flex-wrap: wrap;
  }

  .score-worksheet__row--count .score-worksheet__row-copy {
    flex-basis: 100%;
  }

  .score-worksheet__row--count ore-counter {
    margin-left: auto;
  }
}
</style>
