<script lang="ts" setup>
import { ref } from 'vue';
import { asset } from '../../../app/assets';
import { t } from '../../../app/i18n';
import { useLongPress } from '../../composables/use-long-press';
import '@vielzeug/refine/button';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/tooltip';

/**
 * The card face of one board slot: the scan when a card is worn, a dashed placeholder with the slot
 * icon otherwise. Overlays (e.g. a potion's Consume button) go in the default slot. `pickable` turns
 * the whole face into a Change action that opens the slot picker; otherwise the face opens the
 * full-card detail. The corner magnifier offers that detail on editable slots too.
 */
defineProps<{
  /** Scan of the worn card; `null` renders the empty state. */
  art: string | null;
  consumed?: boolean;
  /**
   * Marks the worn piece as depleted: greyscale with an error ring. Only its health points stop
   * counting; the piece keeps its printed text and abilities, so the card stays fully interactive.
   */
  depleted?: boolean;
  /** Icon shown while the slot is empty. */
  emptyIcon: string;
  /** Slot label, used for the empty-state description. */
  label: string;
  /** Name of the worn card, used for the detail label. */
  name: string;
  /** The owning hunter is out of the game: the scan desaturates without the spent-card ring. */
  out?: boolean;
  /** When true the face emits `pick` (open the slot picker) instead of `inspect` (full-card detail). */
  pickable?: boolean;
}>();
const emit = defineEmits<{ inspect: []; pick: [] }>();

/** Holding a worn card opens its detail: the touch counterpart of Space Quick Look. */
const pressTarget = ref<HTMLElement | null>(null);
useLongPress(
  pressTarget,
  () => emit('inspect'),
  (event) =>
    event.pointerType !== 'mouse' && (event.target as HTMLElement).closest('.slot-card__zoom') !== null,
);
</script>

<template>
  <div
    class="slot-card"
    ref="pressTarget"
    :class="{
      'slot-card--consumed': consumed,
      'slot-card--depleted': depleted,
      'slot-card--empty': !art,
      'slot-card--out': out,
    }">
    <ore-button
      class="slot-card__zoom"
      fullheight
      variant="text"
      v-if="art && !pickable"
      :label="t('party.viewCardAria', { name })"
      @click="emit('inspect')"
      @contextmenu.prevent>
      <img alt="" class="slot-card__art" :src="asset(art)" />
    </ore-button>
    <button
      class="slot-card__zoom slot-card__pick"
      type="button"
      v-else-if="pickable"
      :aria-label="t(art ? 'party.changeSlotAria' : 'party.equipSlotAria', { slot: label })"
      @click="emit('pick')"
      @contextmenu.prevent>
      <img alt="" class="slot-card__art" v-if="art" :src="asset(art)" />
      <template v-else>
        <span aria-hidden="true" class="slot-card__empty-icon" :style="{ '--slot-icon': `url(${asset(emptyIcon)})` }"></span>
        <!-- The plus marks the empty slot as the entry point to the picker. -->
        <span aria-hidden="true" class="slot-card__add">
          <ore-icon name="plus" size="14" />
        </span>
      </template>
    </button>
    <!-- Editable cards still carry the full-card view: the magnifier rides the corner, absolutely
         positioned so it never becomes a grid item and shrink the art below the pick control. -->
    <ore-tooltip class="slot-card__inspect-tip" v-if="pickable && art" :content="t('party.viewCard')" :delay="400" >
      <button
        class="slot-card__inspect"
        type="button"
        :aria-label="t('party.viewCardAria', { name })"
        @click="emit('inspect')">
        <ore-icon aria-hidden="true" name="maximize-2" size="14" />
      </button>
    </ore-tooltip>
    <span class="slot-card__empty" v-if="!art && !pickable">
      <span aria-hidden="true" class="slot-card__empty-icon" :style="{ '--slot-icon': `url(${asset(emptyIcon)})` }"></span>
      <span class="visually-hidden">{{ t('party.emptySlot', { slot: label }) }}</span>
    </span>
    <slot />
  </div>
</template>

<style scoped>
.slot-card {
  position: relative;
  box-sizing: border-box;
  display: grid;
  place-items: center;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: var(--p-panel-sunken);
  border-radius: var(--rounded-md);
  box-shadow: inset 0 0 0 var(--border) var(--p-line);
  /* The hold must not summon the browser's image callout or a text selection. */
  -webkit-touch-callout: none;
  user-select: none;
}

.slot-card__art {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: var(--p-panel-sunken);
}

.slot-card__zoom {
  --button-padding: 0;
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* One hover affordance: the clickable face lights up with the same gold ring the picker tiles use. */
.slot-card__zoom:hover,
.slot-card__zoom:focus-visible {
  box-shadow: inset 0 0 0 var(--border-2) var(--p-gold-dim);
}

.slot-card__pick {
  display: grid;
  place-items: center;
  padding: 0;
  font-family: inherit;
  color: inherit;
  cursor: pointer;
  background: none;
  border: 0;
}

.slot-card__add {
  position: absolute;
  right: var(--size-1-5);
  bottom: var(--size-1-5);
  display: grid;
  place-items: center;
  width: var(--size-8);
  height: var(--size-8);
  color: var(--p-text-strong);
  background: color-mix(in oklch, var(--p-panel) 85%, transparent);
  border-radius: var(--rounded-full);
}

/* The full-card view on an editable slot: the same top-right corner magnifier the picker tiles
   carry. The tooltip host carries the absolute position: a static host would become a second
   grid item and collapse the pick control to half the card. */
.slot-card__inspect-tip {
  position: absolute;
  top: var(--size-1-5);
  right: var(--size-1-5);
  z-index: 2;
}

.slot-card__inspect {
  display: grid;
  place-items: center;
  width: var(--size-8);
  height: var(--size-8);
  font-family: inherit;
  color: var(--p-text-strong);
  cursor: pointer;
  background: color-mix(in oklch, var(--p-panel) 85%, transparent);
  border: 0;
  border-radius: var(--rounded-sm);
}

.slot-card--consumed {
  background: var(--color-warning-backdrop);
  box-shadow: inset 0 0 0 var(--border-2) var(--color-warning-border);
}

.slot-card--consumed .slot-card__art {
  filter: grayscale(1);
}

.slot-card--depleted {
  background: var(--color-error-backdrop);
  box-shadow: inset 0 0 0 var(--border-2) var(--color-error-border);
}

.slot-card--depleted .slot-card__art {
  filter: grayscale(1);
}

.slot-card--out .slot-card__art {
  filter: grayscale(1);
}

.slot-card--empty {
  color: var(--p-text-muted);
  border: var(--border) dashed var(--p-line-strong);
  box-shadow: none;
}

.slot-card__empty {
  display: grid;
  place-items: center;
}

.slot-card__empty-icon {
  width: var(--size-16);
  height: var(--size-16);
  color: inherit;
  background: currentcolor;
  opacity: 0.55;
  mask: var(--slot-icon) center / contain no-repeat;
}
</style>
