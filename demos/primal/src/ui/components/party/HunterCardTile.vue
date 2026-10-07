<script lang="ts" setup>
import { computed } from 'vue';
import { asset } from '../../../app/assets';
import { t, tp } from '../../../app/i18n';
import type { HunterCard } from '../../../domain/types';
import '@vielzeug/refine/button';
import '@vielzeug/refine/chip';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/text';

/**
 * One hunter card as a tappable tile: the scan when one exists, otherwise a typed placeholder.
 * Clicking the tile always inspects (zooms) the card. With `selected` set, a corner check button
 * (deck builder) toggles the card instead: it sits beside the tile button, never inside it, so its
 * click cannot bubble into the inspect handler.
 */
const props = defineProps<{
  card: HunterCard;
  /** Show the focused side of a double-sided card when one exists. */
  focused?: boolean;
  /** Why the card cannot be chosen: shown as a lock chip; implies a muted tile. */
  lockedLabel?: string;
  muted?: boolean;
  /** Mark the selection with a radio dot instead of a check. */
  radio?: boolean;
  selected?: boolean;
}>();
const emit = defineEmits<{ inspect: [card: HunterCard]; toggle: [card: HunterCard] }>();

const artSrc = computed(() => (props.focused && props.card.artFocused ? props.card.artFocused : props.card.art));

/** The corner toggle's accessible label, mirroring the detail dialog's add/remove/select wording. */
const toggleLabel = computed(() =>
  t(
    props.radio
      ? props.selected
        ? 'deck.selectedCardAria'
        : 'deck.selectCardAria'
      : props.selected
        ? 'deck.removeCardAria'
        : 'deck.addCardAria',
    { name: props.card.name },
  ),
);

/**
 * Safari and Firefox do not focus buttons on click, which would leave the keyboard grid without a
 * focused tile: arrows, A/R and Space would do nothing until the player Tabs in. Focus the tile on
 * pointer-down so a click always lands focus where the shortcuts listen, and the detail dialog's
 * return-focus has a tile to restore to.
 */
function focusTile(event: PointerEvent): void {
  (event.currentTarget as HTMLElement).focus({ preventScroll: true });
}
</script>

<template>
  <div
    class="tile-frame"
    :class="{
      'tile-frame--locked': lockedLabel,
      'tile-frame--selectable': selected !== undefined,
      'tile-frame--selected': selected === true,
    }">
    <ore-button
      class="tile"
      fullwidth
      variant="ghost"
      :class="{ 'tile--muted': muted || lockedLabel, 'tile--placeholder': !card.art }"
      :label="t('party.viewCardAria', { name: card.name })"
      @click="emit('inspect', card)"
      @pointerdown="focusTile">
      <span aria-hidden="true" class="tile__face">
        <img alt="" class="tile__art" decoding="sync" v-if="artSrc" :src="asset(artSrc)" />
        <span class="tile__placeholder" v-else>
          <span class="tile__name">{{ card.name }}</span>
          <span class="tile__type" v-if="card.kind || card.cardType">
            {{ card.kind === 'mastery' ? t('party.mastery') : card.cardType }}
          </span>
        </span>
      </span>
    </ore-button>
    <ore-button
      class="tile__check"
      icon-only
      rounded="full"
      size="sm"
      v-if="selected !== undefined && !lockedLabel"
      :aria-pressed="selected"
      :class="{ 'tile__check--on': selected === true }"
      :label="toggleLabel"
      @click="emit('toggle', card)">
      <ore-icon
        aria-hidden="true"
        :name="radio ? (selected ? 'circle-dot' : 'circle') : selected ? 'check' : 'plus'"
        :solid="radio && selected === true"
      />
    </ore-button>
    <ore-chip class="tile__lock" size="sm" variant="solid" v-if="lockedLabel">
      <ore-icon name="lock" slot="icon" />
      {{ lockedLabel }}
    </ore-chip>
    <ore-text
      class="tile__focus-threshold"
      color="muted"
      size="xs"
      v-if="card.kind === 'mastery' && card.unfocused">
      {{ tp('party.cardFlipsAt', card.unfocused.counters) }}
    </ore-text>
  </div>
</template>

<style scoped>
.tile-frame {
  position: relative;
  display: grid;
  gap: var(--size-1);
  min-width: 0;
}

.tile__focus-threshold {
  line-height: var(--leading-tight);
  text-align: center;
}

/* The toggle lives above the tile button (a button cannot nest inside one): clicking it
   toggles the card, while clicks anywhere else on the tile still reach the inspect button. */
.tile__check {
  --button-bg: var(--p-panel);
  --button-border: 0;
  --button-color: var(--p-text);
  position: absolute;
  inset-block-start: var(--size-1-5);
  inset-inline-start: var(--size-1-5);
  z-index: 1;
  /* The shadow draws on this host box, not the inner circle: without the radius it is a square. */
  border-radius: var(--rounded-full);
  box-shadow: var(--shadow-sm);
}

.tile__check--on {
  --button-bg: var(--p-gold);
  --button-color: var(--p-ink);
}

.tile__lock {
  position: absolute;
  inset-block-start: var(--size-1-5);
  inset-inline-start: var(--size-1-5);
  max-width: calc(100% - var(--size-3));
  pointer-events: none;
}

.tile {
  --button-padding: 0;
  --button-radius: var(--rounded-sm);
  display: block;
}

.tile::part(button) {
  height: auto;
  min-height: 0;
}

.tile::part(content) {
  display: block;
  width: 100%;
  white-space: normal;
}

.tile__face {
  position: relative;
  display: block;
  aspect-ratio: 61 / 85;
  overflow: hidden;
  background: var(--p-panel-sunken);
  border-radius: var(--rounded-md);
  box-shadow: inset 0 0 0 var(--border) var(--p-line);
  transition:
    translate var(--transition-fast),
    box-shadow var(--transition-fast);
}

.tile--muted .tile__face {
  opacity: 0.6;
  filter: grayscale(0.7);
}

.tile-frame--selected .tile__face {
  box-shadow:
    inset 0 0 0 var(--border-2) var(--p-gold),
    var(--shadow-sm);
}

.tile:hover .tile__face,
.tile:focus-visible .tile__face {
  box-shadow:
    inset 0 0 0 var(--border) var(--p-line-strong),
    var(--shadow-md);
  translate: 0 calc(-1 * var(--size-0-5));
}

.tile-frame--selected .tile:hover .tile__face,
.tile-frame--selected .tile:focus-visible .tile__face {
  box-shadow:
    inset 0 0 0 var(--border-2) var(--p-gold),
    var(--shadow-md);
}

.tile-frame--selectable:not(.tile-frame--selected):not(.tile-frame--locked) .tile__face {
  opacity: 0.72;
}

.tile-frame--selectable:not(.tile-frame--selected):not(.tile-frame--locked) .tile:hover .tile__face,
.tile-frame--selectable:not(.tile-frame--selected):not(.tile-frame--locked) .tile:focus-visible .tile__face {
  opacity: 1;
}

.tile__art {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}


.tile__placeholder {
  display: grid;
  gap: var(--size-1);
  align-content: center;
  justify-items: center;
  height: 100%;
  padding: var(--size-2);
  text-align: center;
  border: var(--border) dashed var(--p-line-strong);
  border-radius: inherit;
}

.tile__name {
  font-family: var(--p-heading);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  line-height: var(--leading-snug);
  color: var(--p-text-strong);
  text-wrap: balance;
}

.tile__type {
  font-size: calc(var(--text-xs) * 0.85);
  color: var(--p-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
</style>
