<script lang="ts" setup>
import { computed } from 'vue';
import { asset } from '../../../app/assets';
import { t } from '../../../app/i18n';
import { forgeById, type HunterStatusDefinition, hunterCardById, starterMastery, weaponClassById } from '../../../content';
import type { BoardBuild, Hunter, HunterBuild, HunterCounter, HunterFightState } from '../../../domain/types';
import CardText from '../CardText.vue';
import '@vielzeug/refine/button';
import '@vielzeug/refine/counter';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/progress';
import '@vielzeug/refine/tooltip';

/**
 * The mastery, weapon and item tallies: the three counters that sit under the mastery progress
 * bar on the board. Extracted from HunterBoardCard so the desktop hunter layout can place them in
 * the gear column. Pure presentation: every edit is emitted and the parent decides how to apply it.
 */
const props = defineProps<{
  hunter: Hunter;
  locked: boolean;
  member?: BoardBuild | HunterBuild;
  state: HunterFightState;
}>();

const emit = defineEmits<{
  adjust: [counter: HunterCounter, delta: number];
  rule: [status: HunterStatusDefinition];
}>();

const weapon = computed(() => weaponClassById(props.hunter.classId).name);
const isDown = computed(() => props.state.knockedOut !== null);

const masteryCard = computed(() => {
  if (props.member?.masteryCardId) {
    return hunterCardById(props.hunter, props.member.masteryCardId);
  }
  return starterMastery(props.hunter);
});
const masteryGoal = computed(() => masteryCard.value?.unfocused?.counters ?? 2);
const masteryValue = computed(() => Math.min(props.state.mastery ?? 0, masteryGoal.value));
const isMasteryFocused = computed(() => (props.state.mastery ?? 0) >= masteryGoal.value && masteryGoal.value > 0);
/** Focused, the tally shows what the mastery does now: its focused text, not the path there. */
const masteryHint = computed(() => {
  const card = masteryCard.value;
  if (isMasteryFocused.value && card?.focused?.text) return card.focused.text;
  return card?.unfocused?.text ?? t('hunterBoard.focusAt', { count: masteryGoal.value });
});

const weaponPiece = computed(() => {
  const weaponId = props.member?.equipment.weaponId;
  return weaponId ? forgeById(weaponId) : undefined;
});
const weaponHint = computed(() => t('hunterBoard.weaponHint'));

const masteryStatus = computed<HunterStatusDefinition>(() => ({
  art: null,
  hint: isMasteryFocused.value ? t('party.cardFocused') : t('hunterBoard.focusAt', { count: masteryGoal.value }),
  icon: 'sparkles',
  id: 'mastery',
  keywordId: null,
  kind: 'counter',
  name: masteryCard.value?.name ?? t('hunterBoard.mastery'),
  rule: masteryCard.value
    ? [
        masteryCard.value.unfocused?.text
          ? `${t('party.cardUnfocused')}: ${masteryCard.value.unfocused.text}`
          : null,
        masteryCard.value.focused?.text ? `${t('party.cardFocused')}: ${masteryCard.value.focused.text}` : null,
      ]
        // The drawer prints each line as its own paragraph: the card's two faces
        // never share one run-on line.
        .filter(Boolean)
        .join('\n')
    : null,
}));

const weaponStatus = computed<HunterStatusDefinition>(() => ({
  art: null,
  hint: weaponHint.value,
  icon: 'swords',
  id: 'weapon',
  keywordId: null,
  kind: 'counter',
  name: weaponPiece.value?.name ?? weapon.value,
  rule: t('hunterBoard.weaponRule'),
}));

const itemPiece = computed(() => {
  const itemId = props.member?.equipment.itemId;
  return itemId ? forgeById(itemId) : undefined;
});

/** Only the counter-carrying items (Lava Buckler, Tome of Creatures, Ancestors' Gift, Northern Star) show a tally. */
const itemHasCounters = computed(() => {
  const piece = itemPiece.value;
  return Boolean(piece && /counter/i.test(piece.description ?? ''));
});

const itemStatus = computed<HunterStatusDefinition>(() => ({
  art: null,
  hint: t('hunterBoard.itemHint'),
  icon: 'backpack',
  id: 'item',
  keywordId: null,
  kind: 'counter',
  name: itemPiece.value?.name ?? t('party.slotItem'),
  rule: itemPiece.value?.description ?? null,
}));

function onCounter(counter: HunterCounter, event: Event): void {
  if (props.locked) return;
  const { delta } = (event as CustomEvent<{ delta: number; value: number }>).detail;
  if (delta !== 0) emit('adjust', counter, delta);
}
</script>

<template>
  <section class="hc__tracks" :aria-label="t('hunterBoard.tracks')">
    <ore-progress
      class="hc__track"
      size="md"
      :class="{ 'hc__track--focused': isMasteryFocused }"
      :label="`${state.mastery ?? 0} / ${masteryGoal}`"
      :max="masteryGoal"
      :segments="masteryGoal"
      :value="masteryValue"
      :value-text="t('hunterBoard.masteryOf', { max: masteryGoal, value: state.mastery ?? 0 })" />
    <div class="hc__counters-row">
    <div class="hc__tile">
      <ore-counter
        class="hc__tally hc__tally--mastery"
        :class="{ 'hc__tally--focused': isMasteryFocused, 'hc__tally--on': (state.mastery ?? 0) > 0 }"
        :disabled="isDown"
        :hint="masteryHint"
        :label="masteryCard?.name ?? t('hunterBoard.mastery')"
        :max="masteryGoal"
        :readonly="locked"
        :value="state.mastery ?? 0"
        @change="onCounter('mastery', $event)">
        <span
          aria-hidden="true"
          class="hc__glyph"
          slot="icon"
          :style="{ '--glyph': `url(${asset('/icons/icon_mastery.svg')})` }" />
        <!-- The mastery text prints its bracketed keywords as the icons they name, like
             the card details in the deck builder and forge; the hint attr stays as the
             text twin for the counter's aria-describedby. -->
        <span class="hc__mastery-hint" slot="hint">
          <CardText :text="masteryHint" />
        </span>
      </ore-counter>
      <!-- The tooltip is the positioned anchor: its :host is relative, so the rule
           class belongs on it, never on the button inside. -->
      <ore-tooltip
        class="hc__rule"
        v-if="masteryCard"
        :content="t('board.ruleLabel', { name: masteryCard.name })"
        :delay="400">
        <ore-button
          icon-only
          size="sm"
          variant="ghost"
          :label="t('board.ruleLabel', { name: masteryCard.name })"
          @click="emit('rule', masteryStatus)">
          <ore-icon aria-hidden="true" name="info" />
        </ore-button>
      </ore-tooltip>
    </div>
    <div class="hc__stack" :class="{ 'hc__stack--trio': itemHasCounters }">
      <div class="hc__tile">
        <ore-counter
          class="hc__tally hc__tally--weapon hc__tally--compact"
        :class="{ 'hc__tally--on': (state.weapon ?? 0) > 0 }"
        :disabled="isDown"
        :hint="weaponHint"
        :label="weaponPiece?.name ?? weapon"
        :readonly="locked"
        :value="state.weapon ?? 0"
        @change="onCounter('weapon', $event)">
        <span
          aria-hidden="true"
          class="hc__glyph"
          slot="icon"
          :style="{ '--glyph': `url(${asset(weaponClassById(hunter.classId).icon)})` }" />
      </ore-counter>
      <ore-tooltip
        class="hc__rule"
        v-if="weaponPiece"
        :content="t('board.ruleLabel', { name: weaponPiece.name })"
        :delay="400">
        <ore-button
          icon-only
          size="sm"
          variant="ghost"
          :label="t('board.ruleLabel', { name: weaponPiece.name })"
          @click="emit('rule', weaponStatus)">
          <ore-icon aria-hidden="true" name="info" />
        </ore-button>
      </ore-tooltip>
    </div>
    <div class="hc__tile" v-if="itemHasCounters">
      <ore-counter
        class="hc__tally hc__tally--item hc__tally--compact"
        :class="{ 'hc__tally--on': (state.item ?? 0) > 0 }"
        :disabled="isDown"
        :hint="t('hunterBoard.itemHint')"
        :label="itemPiece?.name ?? t('party.slotItem')"
        :readonly="locked"
        :value="state.item ?? 0"
        @change="onCounter('item', $event)">
        <span
          aria-hidden="true"
          class="hc__glyph"
          slot="icon"
          :style="{ '--glyph': `url(${asset('/icons/icon_item.svg')})` }" />
      </ore-counter>
      <ore-tooltip
        class="hc__rule"
        v-if="itemPiece"
        :content="t('board.ruleLabel', { name: itemPiece.name })"
        :delay="400">
        <ore-button
          icon-only
          size="sm"
          variant="ghost"
          :label="t('board.ruleLabel', { name: itemPiece.name })"
          @click="emit('rule', itemStatus)">
          <ore-icon aria-hidden="true" name="info" />
        </ore-button>
      </ore-tooltip>
    </div>
    </div>
  </div>
  </section>
</template>

<style scoped>
.hc__tracks {
  display: flex;
  flex-direction: column;
  gap: var(--size-3);
}

.hc__track {
  --progress-fill: var(--color-contrast-500);
  --progress-track-bg: var(--color-contrast-200);
  width: 100%;
}

.hc__track--focused {
  --progress-fill: var(--color-primary);
}

/* The mastery tally keeps its full form; the weapon and item tallies stack beside it, compact.
   Both columns are definite (1fr): an auto column collapses, the counters size themselves in %. */
.hc__counters-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--size-3);
  align-items: stretch;
}

.hc__stack {
  display: grid;
  gap: var(--size-1-5);
  align-content: start;
}

/* With all three tallies the stacked pair drops its hints: the label stays, the info button
   explains. Two tallies have the room and keep the full text. */
.hc__stack--trio .hc__tally--compact::part(hint) {
  display: none;
}

.hc__tile {
  position: relative;
  display: flex;
  min-width: 0;
  container: tile / inline-size;
}

.hc__glyph {
  display: inline-block;
  width: var(--size-7);
  height: var(--size-7);
  background: currentcolor;
  mask: var(--glyph) center / contain no-repeat;
}

.hc__tally {
  --counter-bg: var(--p-panel-sunken);
  --counter-border-color: var(--p-line);
  --counter-icon-size: var(--size-7);

  flex: 1;
}

.hc__tally--on {
  --counter-border-color: var(--p-gold);
}

.hc__tally--on::part(value) {
  color: var(--p-gold);
}

.hc__tally--on .hc__glyph {
  color: var(--p-gold);
}

.hc__tally--mastery {
  --counter-border-color: var(--p-line);
}

.hc__tally--mastery .hc__glyph {
  color: var(--p-text-muted);
}

.hc__tally--mastery.hc__tally--on {
  --counter-border-color: var(--color-contrast-400);
}

.hc__tally--mastery.hc__tally--on::part(value) {
  color: var(--p-text-strong);
}

.hc__tally--mastery.hc__tally--on .hc__glyph {
  color: var(--p-text-strong);
}

.hc__tally--mastery.hc__tally--focused {
  --counter-bg: var(--color-primary);
  --counter-border-color: var(--color-primary);
  box-shadow: var(--shadow-sm);
}

.hc__tally--mastery.hc__tally--focused::part(counter) {
  color: var(--color-primary-contrast);
}

.hc__tally--mastery.hc__tally--focused::part(label),
.hc__tally--mastery.hc__tally--focused::part(value) {
  color: var(--color-primary-contrast);
}

.hc__tally--mastery.hc__tally--focused::part(hint),
.hc__tally--mastery.hc__tally--focused .hc__mastery-hint {
  color: color-mix(in oklch, var(--color-primary-contrast) 85%, transparent);
}

.hc__tally--mastery.hc__tally--focused::part(decrement-btn),
.hc__tally--mastery.hc__tally--focused::part(increment-btn) {
  color: var(--color-primary-contrast);
  background: color-mix(in oklch, var(--color-primary-contrast) 15%, transparent);
}

.hc__tally--mastery.hc__tally--focused::part(decrement-btn):hover:not(:disabled),
.hc__tally--mastery.hc__tally--focused::part(increment-btn):hover:not(:disabled) {
  background: color-mix(in oklch, var(--color-primary-contrast) 25%, transparent);
}

.hc__tally--mastery.hc__tally--focused .hc__glyph {
  color: var(--color-primary-contrast);
}

.hc__rule {
  position: absolute;
  inset-block-start: var(--size-1);
  inset-inline-end: var(--size-1);
  z-index: 1;
  color: var(--p-text-muted);
}

.hc__tile:has(.hc__tally--mastery.hc__tally--focused) .hc__rule {
  color: var(--color-primary-contrast);
}
</style>
