<script lang="ts" setup>
import { computed, ref } from 'vue';
import { type MessageKey, t } from '../../../app/i18n';
import type { RouteName } from '../../../app/router';
import { weaponClassById } from '../../../content';
import type { DeckReport } from '../../../domain/deck';
import type { BoardBuild, EquipmentSlot, ForgeEquipment, Hunter, Monster, Potion, PotionSlot } from '../../../domain/types';
import DeckComposition from '../deck/DeckComposition.vue';
import TargetStrip from '../deck/TargetStrip.vue';
import LinkButton from '../LinkButton.vue';
import LoadoutGrid from './LoadoutGrid.vue';
import { equipmentPickerEntry, potionPickerEntry } from './picker-entry';
import SlotPicker, { type PickerDisabled, type PickerEntry } from './SlotPicker.vue';
import '@vielzeug/refine/button';
import '@vielzeug/refine/chip';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/text';
import '@vielzeug/refine/tooltip';

/**
 * The physical player board: the shared loadout grid plus the hunt target and, when a `report`
 * is given, the action-deck summary. Campaign, expedition and the build editor differ only in
 * what the picker offers and when editing is allowed, which the parent passes in. Editing
 * happens through the shared slot picker drawer; every worn card opens the full-card detail.
 */
const props = withDefaults(
  defineProps<{
    canConsume: boolean;
    canEdit: boolean;
    /** Pins the two-column sketch for side rails next to the deck editor. */
    compact?: boolean;
    /** Where the deck summary links to; omitted when the deck is edited right below the board. */
    deckRoute?: { params: Record<string, string>; query?: Record<string, string>; to: RouteName };
    /** Pieces the picker offers, already restricted to what this hunter may wear here. */
    equipment: ForgeEquipment[];
    /** Pieces a level rule hides from the picker: surfaced as a count so the gate is visible. */
    hiddenEquipment?: ForgeEquipment[];
    /** Overrides `canEdit` for the equipment slots alone: locks gear while potions stay editable.
     *  Absent must stay `undefined` (not Vue's boolean-cast `false`), so the grid falls back to
     *  `canEdit`: only an explicit pass locks the gear. */
    equipmentPickable?: boolean;
    /** The reason the hidden pieces are not offered, already localized. */
    hiddenReason?: string;
    /** Potions a level rule hides from the picker. */
    hiddenPotions?: Potion[];
    hunter: Hunter;
    /** Name of the saved loadout the current build matches, if any. */
    loadoutName?: string;
    /** The board's build; hunt boards also carry the potions consumed this hunt. */
    member: BoardBuild & { consumedPotionIds?: string[] };
    monster: Monster | null;
    /** Potions the picker offers. */
    potions: Potion[];
    report?: DeckReport;
  }>(),
  { equipmentPickable: undefined },
);
const emit = defineEmits<{
  consume: [potionId: string];
  equip: [slot: EquipmentSlot, equipmentId: string | null];
  equipPotion: [slot: PotionSlot, potionId: string | null];
  /** Open the saved-build picker. */
  autoFit: [];
  load: [];
  share: [];
}>();

const SLOT_LABEL: Record<EquipmentSlot, MessageKey> = {
  armor: 'party.slotArmor',
  helm: 'party.slotHelm',
  item: 'party.slotItem',
  weapon: 'party.slotWeapon',
};

// ── Slot picker ─────────────────────────────────────────────────────────────
const picking = ref<{ kind: 'equipment'; slot: EquipmentSlot } | { kind: 'potion'; slot: PotionSlot } | null>(null);

const pickerTitle = computed(() => {
  const active = picking.value;
  if (!active) return '';
  if (active.kind === 'potion') return t('party.potionSlot', { index: active.slot + 1 });
  return t(SLOT_LABEL[active.slot]);
});

const pickerEntries = computed<PickerEntry[]>(() => {
  const active = picking.value;
  if (!active) return [];
  if (active.kind === 'potion') {
    return props.potions.map((potion) => potionPickerEntry(potion));
  }
  return props.equipment
    .filter((piece) => piece.type === active.slot)
    // Effective pieces lead within their level group: matching the hunt target pays first.
    .sort(
      (a, b) =>
        Number(Boolean(props.monster && b.element && props.monster.weaknesses.includes(b.element))) -
          Number(Boolean(props.monster && a.element && props.monster.weaknesses.includes(a.element))) ||
        a.name.localeCompare(b.name) ||
        a.level - b.level,
    )
    .map((piece) =>
      equipmentPickerEntry(
        piece,
        Boolean(props.monster && piece.element && props.monster.weaknesses.includes(piece.element)),
        active.slot === 'weapon',
      ),
    );
});

/** How many pieces the level rule hides for the slot being picked. */
const hiddenCount = computed(() => {
  const active = picking.value;
  if (!active || !props.hiddenReason) return 0;
  return active.kind === 'potion'
    ? props.hiddenPotions?.length ?? 0
    : props.hiddenEquipment?.filter((piece) => piece.type === active.slot).length ?? 0;
});

const pickerCurrentId = computed(() => {
  const active = picking.value;
  if (!active) return null;
  return active.kind === 'potion'
    ? (props.member.potionLoadoutIds[active.slot] ?? null)
    : (props.member.equipment[`${active.slot}Id`] ?? null);
});

/** Potions already slotted elsewhere are offered but unchooseable: one copy of each, reason named. */
const pickerDisabled = computed<PickerDisabled[]>(() => {
  const active = picking.value;
  if (active?.kind !== 'potion') return [];
  return props.member.potionLoadoutIds.flatMap((id, index) =>
    index !== active.slot && id
      ? [{ id, reason: t('party.inSlot', { slot: t('party.potionSlot', { index: index + 1 }) }) }]
      : [],
  );
});

/** Tooltip naming the hunt target behind the effective badges. */
const effectiveTitle = computed(() =>
  props.monster ? t('party.effectiveVs', { monster: props.monster.name }) : undefined,
);

/** The weapon refits the deck, so changing it deserves a warning before the pick commits. */
const pickerWarning = computed(() => {
  const active = picking.value;
  return active?.kind === 'equipment' && active.slot === 'weapon' ? t('deck.refitWarning') : undefined;
});

function pickEquipment(slot: EquipmentSlot): void {
  picking.value = { kind: 'equipment', slot };
}

function pickPotion(slot: PotionSlot): void {
  picking.value = { kind: 'potion', slot };
}

function choosePicked(equipmentId: string | null): void {
  const active = picking.value;
  if (!active) return;
  if (active.kind === 'potion') emit('equipPotion', active.slot, equipmentId);
  else emit('equip', active.slot, equipmentId);
}
</script>

<template>
  <section aria-labelledby="player-board-title" class="player-board">
    <div class="card-title">
      <div>
        <ore-text variant="overline">{{ t('party.loadoutEyebrow') }}</ore-text>
        <ore-text as="h3" id="player-board-title" size="sm" variant="heading">{{ t('party.playerBoard') }}</ore-text>
        <ore-text color="muted" size="sm" v-if="$slots.hint"><slot name="hint" /></ore-text>
      </div>
      <slot name="actions" />
    </div>

    <LoadoutGrid
      :can-consume="canConsume"
      :can-edit="canEdit"
      :compact="compact"
      :equipment-pickable="equipmentPickable"
      :hunter="hunter"
      :member="member"
      @consume="emit('consume', $event)"
      @pick="pickEquipment"
      @pick-potion="pickPotion" />

    <SlotPicker
      :current-id="pickerCurrentId"
      :disabled="pickerDisabled"
      :effective-title="effectiveTitle"
      :entries="pickerEntries"
      :hidden-count="hiddenCount"
      :hidden-note="hiddenReason"
      :open="picking !== null"
      :title="pickerTitle"
      :warning="pickerWarning"
      :weapon-icon="weaponClassById(hunter.classId).icon"
      @close="picking = null"
      @select="choosePicked" />

    <TargetStrip v-if="monster" :equipment="member.equipment" :monster="monster" />

    <div class="deck-row" v-if="report">
      <div class="stack" style="--stack-gap: var(--size-1)">
        <div class="cluster" style="--cluster-gap: var(--size-2)">
          <ore-text as="h4" size="xs" variant="heading">{{ t('party.deckTitle') }}</ore-text>
          <ore-chip color="primary" size="sm" variant="flat" v-if="loadoutName">{{ loadoutName }}</ore-chip>
        </div>
        <DeckComposition compact :report="report" />
      </div>
      <div class="cluster" style="--cluster-gap: var(--size-2)">
        <ore-button
          color="warning"
          size="sm"
          variant="bordered"
          v-if="canEdit && report && !report.valid && report.required"
          :label="t('deck.autoFit')"
          @click="emit('autoFit')">
          <ore-icon name="wand-2" slot="prefix" />
          {{ t('deck.autoFit') }}
        </ore-button>
        <ore-tooltip v-if="canEdit" :content="t('deck.loadBuild')" :delay="400" >
          <ore-button icon-only size="sm" variant="bordered" :label="t('deck.loadBuild')" @click="emit('load')">
            <ore-icon name="library" />
          </ore-button>
        </ore-tooltip>
        <ore-tooltip :content="t('deck.shareCurrent')" :delay="400" >
          <ore-button icon-only size="sm" variant="bordered" :disabled="!report.valid" :label="t('deck.shareCurrent')" @click="emit('share')">
            <ore-icon name="share-2" />
          </ore-button>
        </ore-tooltip>
        <LinkButton
          color="primary"
          size="sm"
          v-if="deckRoute"
          :params="deckRoute.params"
          :query="deckRoute.query"
          :to="deckRoute.to"
          :variant="report.valid ? 'bordered' : 'solid'">
          {{ canEdit ? t('party.editDeck') : t('party.viewDeck') }}
        </LinkButton>
      </div>
    </div>
  </section>
</template>

<style scoped>
.player-board {
  display: grid;
  gap: 1rem;
}

.deck-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-3);
  align-items: center;
  justify-content: space-between;
  padding: var(--size-3) var(--size-4);
  background: var(--p-panel-sunken);
  border: var(--border) solid var(--p-line);
  border-radius: var(--rounded-sm);
}
</style>
