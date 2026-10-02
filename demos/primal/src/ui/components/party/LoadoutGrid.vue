<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { type MessageKey, t } from '../../../app/i18n';
import { forgeById, potionById, weaponClassById } from '../../../content';
import { EQUIPMENT_SLOTS } from '../../../domain/deck';
import { MAX_POTION_LOADOUT } from '../../../domain/potion';
import type {
  BoardBuild,
  DepletedSlot,
  EquipmentSlot,
  ForgeEquipment,
  Hunter,
  HunterDepletedSlots,
  Potion,
  PotionSlot,
} from '../../../domain/types';
import PickerDetailDialog from './PickerDetailDialog.vue';
import { equipmentPickerEntry, potionPickerEntry } from './picker-entry';
import SlotCard from './SlotCard.vue';
import type { PickerEntry } from './SlotPicker.vue';
import '@vielzeug/refine/button';

/**
 * The physical equipment board: the tall weapon, helm/armor/item and the three potion slots: as
 * one grid that renders correctly wherever it is placed: narrow frames get the two-column sketch,
 * wide frames (≥44rem) the two-row board. `compact` pins the
 * sketch for side rails next to deck editors; `fill` stretches the grid to the parent's height
 * instead of sizing rows from the card aspect. Every worn card opens the shared full-card detail
 * (the face when read-only, a corner magnifier when editable, which also opens the parent's
 * picker); potion consume buttons ride on the slots, and hunt boards pass `depleted` so a
 * knockout's deplete token can be flagged on the worn armor or helm.
 */
const props = withDefaults(
  defineProps<{
    /** Potions may be consumed right now (hunt in progress, result not recorded). */
    canConsume: boolean;
    /** Slots open the picker instead of zooming the worn card. */
    canEdit: boolean;
    /** Recorded inclusion totals rendered over the matching equipment cards. */
    equipmentTotals?: Partial<Record<EquipmentSlot, string>>;
    /** Overrides `canEdit` for the equipment slots alone: locks gear while potions stay editable.
     *  Absent must stay `undefined` (not Vue's boolean-cast `false`), so the fallback `?? canEdit`
     *  keeps the gear editable: only an explicit pass locks it. */
    equipmentPickable?: boolean;
    /** Pins the two-column sketch regardless of width: for side rails next to deck editors. */
    compact?: boolean;
    /** Deplete flags on the worn armor/helm; hunt boards only: omitted elsewhere. */
    depleted?: HunterDepletedSlots;
    /** Stretch to the parent's height instead of sizing rows from the card aspect. */
    fill?: boolean;
    hunter: Hunter;
    /** The hunter holds the KO token: the only moment a piece may be flagged depleted. */
    knockedOut?: boolean;
    /** The hunter is out of the game: the whole kit renders spent. */
    out?: boolean;
    /** Hides the potion row for equipment-only views. */
    showPotions?: boolean;
    member: Pick<BoardBuild, 'equipment' | 'potionLoadoutIds'> & { consumedPotionIds?: string[] };
  }>(),
  { equipmentPickable: undefined, showPotions: true },
);
const emit = defineEmits<{
  consume: [potionId: string];
  deplete: [slot: DepletedSlot, depleted: boolean];
  pick: [slot: EquipmentSlot];
  pickPotion: [slot: PotionSlot];
}>();

/** The board flips to its wide layout at 44rem of frame width. A matched `@container` on this
 *  grid makes Chromium re-run the query and its layout in a loop: every page layout touching
 *  the board paid ~700ms for it, so the breakpoint is a ResizeObserver class instead. */
const frameEl = ref<HTMLElement | null>(null);
const wide = ref(false);
const WIDE_MIN_PX = 44 * parseFloat(getComputedStyle(document.documentElement).fontSize);
let frameObserver: ResizeObserver | undefined;

onMounted(() => {
  if (!frameEl.value) return;
  frameObserver = new ResizeObserver((entries) => {
    wide.value = (entries[0]?.contentRect.width ?? 0) >= WIDE_MIN_PX;
  });
  frameObserver.observe(frameEl.value);
});
onBeforeUnmount(() => frameObserver?.disconnect());

const SLOT_LABEL: Record<EquipmentSlot, MessageKey> = {
  armor: 'party.slotArmor',
  helm: 'party.slotHelm',
  item: 'party.slotItem',
  weapon: 'party.slotWeapon',
};

const slots = computed(() =>
  EQUIPMENT_SLOTS.map((slot) => {
    const id = props.member.equipment[`${slot}Id`] ?? null;
    const depletable = slot === 'armor' || slot === 'helm';
    return {
      depletable,
      depleted: depletable ? (props.depleted?.[slot] ?? false) : false,
      icon: slot === 'weapon' ? weaponClassById(props.hunter.classId).icon : `/icons/icon_${slot === 'helm' ? 'helmet' : slot}.svg`,
      id,
      label: t(SLOT_LABEL[slot]),
      piece: id ? forgeById(id) : undefined,
      slot,
    };
  }),
);

/** The deplete flag rides on the worn piece and can only ever be placed, never taken back. */
function onDeplete(slot: EquipmentSlot): void {
  if (slot === 'armor' || slot === 'helm') emit('deplete', slot, true);
}

/** One deplete per fight: once any piece carries it, no other piece offers the action. */
const anyDepleted = computed(() => Boolean(props.depleted?.armor || props.depleted?.helm));

const potionSlots = computed(() =>
  Array.from({ length: MAX_POTION_LOADOUT }, (_, index) => {
    const id = props.member.potionLoadoutIds[index] ?? null;
    const potion = id ? potionById(id) : undefined;
    return {
      consumed: Boolean(id && props.member.consumedPotionIds?.includes(id)),
      id,
      label: t('party.potionSlot', { index: index + 1 }),
      name: potion?.name ?? t('party.potion'),
      potion,
      slot: index as PotionSlot,
    };
  }),
);

/** The worn entry opened from a card's corner magnifier; the shared detail dialog shows it. */
const inspecting = ref<PickerEntry | null>(null);
/** Every worn piece and potion: the detail dialog's browse set behind its footer arrows. */
const inspectCards = computed<PickerEntry[]>(() => [
  ...slots.value.flatMap((entry) =>
    entry.piece ? [equipmentPickerEntry(entry.piece, false, entry.slot === 'weapon')] : [],
  ),
  ...potionSlots.value.flatMap((entry) => (entry.potion ? [potionPickerEntry(entry.potion)] : [])),
]);

function inspectEquipment(entry: { piece?: ForgeEquipment; slot: EquipmentSlot }): void {
  if (!entry.piece) return;
  inspecting.value = equipmentPickerEntry(entry.piece, false, entry.slot === 'weapon');
}

function inspectPotion(entry: { potion?: Potion }): void {
  if (!entry.potion) return;
  inspecting.value = potionPickerEntry(entry.potion);
}

</script>

<template>
  <div
    class="loadout-frame"
    ref="frameEl"
    :class="{
      'loadout-frame--compact': compact,
      'loadout-frame--fill': fill,
      'loadout-frame--wide': wide,
    }">
    <div class="loadout-grid" :class="{ 'loadout-grid--no-potions': !showPotions }">
      <div
        class="loadout-slot"
        v-for="entry in slots"
        :key="entry.slot"
        :class="`loadout-slot--${entry.slot}`">
        <SlotCard
          :art="entry.piece?.artwork ?? null"
          :depleted="entry.depleted"
          :empty-icon="entry.icon"
          :label="entry.label"
          :name="entry.piece?.name ?? entry.label"
          :out="out"
          :pickable="equipmentPickable ?? canEdit"
          @inspect="inspectEquipment(entry)"
          @pick="emit('pick', entry.slot)">
          <span class="loadout-slot__total" v-if="entry.id && equipmentTotals?.[entry.slot] !== undefined">
            {{ equipmentTotals[entry.slot] }}
          </span>
          <!-- The one deplete a fight allows: offered while the hunter is KO, gone once spent. -->
          <ore-button
            class="loadout-slot__deplete"
            color="warning"
            size="sm"
            variant="frost"
            v-if="entry.depletable && entry.id && knockedOut && !anyDepleted"
            :disabled="!canConsume"
            :label="t('board.depleteAria', { name: entry.piece?.name ?? entry.label })"
            @click="onDeplete(entry.slot)">
            {{ t('board.deplete') }}
          </ore-button>
        </SlotCard>
      </div>

      <template v-if="showPotions">
        <article
          class="loadout-slot"
          v-for="entry in potionSlots"
          :key="entry.slot"
          :class="`loadout-slot--potion${entry.slot + 1}`">
          <SlotCard
            empty-icon="/icons/icon_potion.svg"
            :art="entry.potion?.artwork ?? null"
            :consumed="entry.consumed"
            :label="entry.label"
            :name="entry.name"
            :out="out"
            :pickable="canEdit"
            @inspect="inspectPotion(entry)"
            @pick="emit('pickPotion', entry.slot)">
            <ore-button
              class="loadout-slot__consume"
              color="warning"
              size="sm"
              variant="frost"
              v-if="canConsume && entry.id"
              :disabled="entry.consumed || Boolean(knockedOut)"
              :label="t(entry.consumed ? 'party.consumedAria' : 'party.consumeAria', { name: entry.name })"
              @click="emit('consume', entry.id)">
              {{ entry.consumed ? t('party.consumed') : t('party.consume') }}
            </ore-button>
          </SlotCard>
        </article>
      </template>
    </div>
  </div>

  <!-- The corner magnifier's full-card view: the same detail the slot picker shows. -->
  <PickerDetailDialog
    :card="inspecting"
    :cards="inspectCards"
    :label="inspecting?.name"
    @close="inspecting = null"
    @show="inspecting = $event" />
</template>

<style scoped>
.loadout-frame {
  display: grid;
  min-width: 0;
}

.loadout-frame--fill {
  display: block;
  height: 100%;
}

/* The physical player board: the weapon stands tall on the left, helm/armor/item stack beside it,
   and the three potion slots run below. Scans are square for equipment and potions (640×640) and
   tall for weapons (640×1088), so the weapon column is twice the equipment width: its art then
   fills the three stacked rows almost exactly. */
.loadout-grid {
  display: grid;
  grid-template-areas:
    'weapon weapon weapon weapon helm helm'
    'weapon weapon weapon weapon armor armor'
    'weapon weapon weapon weapon item item'
    'potion1 potion1 potion2 potion2 potion3 potion3';
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: var(--size-2);
}

.loadout-slot {
  display: grid;
  min-width: 0;
  min-height: 0;
}

.loadout-slot:not(.loadout-slot--weapon) {
  aspect-ratio: 1 / 1;
}

.loadout-slot--weapon {
  grid-area: weapon;
}

.loadout-slot--helm {
  grid-area: helm;
}

.loadout-slot--armor {
  grid-area: armor;
}

.loadout-slot--item {
  grid-area: item;
}

.loadout-slot--potion1 {
  grid-area: potion1;
}

.loadout-slot--potion2 {
  grid-area: potion2;
}

.loadout-slot--potion3 {
  grid-area: potion3;
}

.loadout-grid--no-potions {
  grid-template-areas:
    'weapon weapon weapon weapon helm helm'
    'weapon weapon weapon weapon armor armor'
    'weapon weapon weapon weapon item item';
}

.loadout-slot__total {
  position: absolute;
  right: var(--size-2);
  bottom: var(--size-2);
  z-index: 2;
  display: grid;
  place-items: center;
  min-width: var(--size-6);
  min-height: var(--size-6);
  padding-inline: var(--size-1);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  font-variant-numeric: tabular-nums;
  color: var(--p-on-dark);
  pointer-events: none;
  background: var(--p-overlay-strong);
  border-radius: var(--rounded-full);
}

.loadout-slot__consume {
  position: absolute;
  right: 0.5rem;
  bottom: 0.5rem;
  left: 0.5rem;
  z-index: 2;
}

/* The deplete action rides on the card's bottom edge, exactly like the potion Consume button :
   a direct overlay child of the card, out of its grid flow. */
.loadout-slot__deplete {
  position: absolute;
  right: 0.5rem;
  bottom: 0.5rem;
  left: 0.5rem;
  z-index: 2;
}

/* Stretched grids size rows from the container height instead of the card aspect. */
.loadout-frame--fill .loadout-grid {
  grid-template-rows: repeat(4, minmax(0, 1fr));
  height: 100%;
}

.loadout-frame--fill .loadout-slot:not(.loadout-slot--weapon) {
  aspect-ratio: auto;
}

/* The wide two-row board for full page widths: the square scans sit in square cells and the
   weapon column is sized so its tall art fills the two stacked rows: 0.588 × (2w + gap) ≈ 1.21w.
   Side rails (`compact`) keep the tall sketch whatever their width: a wide rail must not flip
   into the two-row page layout. */
.loadout-frame--wide:not(.loadout-frame--compact) .loadout-grid {
  grid-template-areas:
    'weapon helm armor item'
    'weapon potion1 potion2 potion3';
  grid-template-columns: minmax(0, 1.21fr) repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.loadout-frame--wide.loadout-frame--fill .loadout-grid {
  grid-template-rows: repeat(2, minmax(0, 1fr));
}
</style>
