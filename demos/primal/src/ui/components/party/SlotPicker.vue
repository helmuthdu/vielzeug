<script lang="ts" setup>
import { createQuickLookGrid } from '@vielzeug/focus';
import { computed, nextTick, ref, watch } from 'vue';
import { asset } from '../../../app/assets';
import { t } from '../../../app/i18n';
import { useMediaQuery } from '../../../app/vue-bridge';
import { useLongPress } from '../../composables/use-long-press';
import PickerDetailDialog from './PickerDetailDialog.vue';
import '@vielzeug/refine/alert';
import '@vielzeug/refine/button';
import '@vielzeug/refine/chip';
import '@vielzeug/refine/drawer';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/keyboard-key';
import '@vielzeug/refine/text';
import '@vielzeug/refine/tooltip';

/** One pickable card in the drawer: equipment or potion. */
export interface PickerEntry {
  artwork: string;
  /** Weapon damage: a plain number or [normal, piercing]. */
  damage?: number | readonly [number, number] | null;
  /** The deck composition a weapon demands, shown in the detail dialog. */
  deckComposition?: { attack: number; dodge: number; maneuver: number; parry: number } | null;
  /** Rules text, shown in the detail dialog. */
  description?: string | null;
  /** Marked when the piece's element hits the hunt target's weakness. */
  effective?: boolean;
  /** Localized element name for the detail facts. */
  elementLabel?: string;
  /** Armor and helm vitality. */
  health?: number | null;
  id: string;
  /** Shown as a small badge on the art so same-name levels stay distinguishable. */
  level?: number;
  name: string;
  subtitle: string;
  /** Weapon scans are tall (640×1088); every other scan is square. */
  tall?: boolean;
}

/** A potion already slotted elsewhere: offered but unchooseable, with the reason. */
export interface PickerDisabled {
  id: string;
  reason: string;
}

/**
 * The shared slot picker: one drawer listing every card the board may wear in the clicked slot,
 * the currently worn card marked, an empty option, and an optional warning (a weapon change
 * refits the deck: those choices arm first and commit from the footer). Equipment and potions
 * differ only in the entries the parent passes; every card opens a full detail dialog, and the
 * keyboard drives the whole loop: arrows walk the tiles, Space previews the focused card and
 * Enter commits it.
 */
const props = defineProps<{
  currentId: string | null;
  /** Disabled entries with the reason shown in place of the subtitle. */
  disabled?: PickerDisabled[];
  /** Tooltip for effective badges, naming the hunt target. */
  effectiveTitle?: string;
  entries: PickerEntry[];
  /** Pieces a level rule hides from this list: announced so the gate is visible. */
  hiddenCount?: number;
  /** The reason the hidden pieces are not offered, already localized. */
  hiddenNote?: string;
  open: boolean;
  title: string;
  /** The hunter's weapon-class icon, printed for "[weapon]" in the detail dialog. */
  weaponIcon?: string;
  warning?: string;
}>();
const emit = defineEmits<{
  close: [];
  select: [equipmentId: string | null];
}>();

const wide = useMediaQuery('(min-width: 768px)');
/** On a desktop the drawer keeps the deck panel readable behind it: no blur scrim. */
const desktop = useMediaQuery('(min-width: 1280px)');

/** The pending weapon choice: armed by the first tap, committed from the footer. */
const armed = ref<{ id: string | null; name: string } | null>(null);
/** The entry shown in the full-card detail dialog. */
const inspectingId = ref<string | null>(null);
const inspecting = computed(() => visibleEntries.value.find((entry) => entry.id === inspectingId.value) ?? null);

/** Element filter: one chip per element present in the list, plus an All reset. */
const elementOptions = computed(() => {
  const labels = new Set<string>();
  for (const entry of props.entries) if (entry.elementLabel) labels.add(entry.elementLabel);
  return [...labels];
});
/** Filters earn their row only when scanning stops beating them: a two-card preparation
 *  draft would carry as many chips as cards. */
const FILTER_MIN_ENTRIES = 4;
const activeElement = ref<string | null>(null);
const visibleEntries = computed(() =>
  activeElement.value
    ? props.entries.filter((entry) => entry.elementLabel === activeElement.value)
    : props.entries,
);

/** Entries grouped by level; a single level stays a flat list so short pickers carry no headers. */
const levelGroups = computed(() => {
  const groups = new Map<number, PickerEntry[]>();
  for (const entry of visibleEntries.value) {
    const level = entry.level ?? 0;
    groups.set(level, [...(groups.get(level) ?? []), entry]);
  }
  const ordered = [...groups.entries()].sort((a, b) => a[0] - b[0]).map(([level, entries]) => ({ entries, level }));
  return ordered.length === 1 ? ordered.map((group) => ({ ...group, level: null })) : ordered;
});

/** The currently equipped entry: the detail dialog renders its facts as current → candidate deltas. */
const currentEntry = computed(() => props.entries.find((entry) => entry.id === props.currentId) ?? null);

function toggleElement(label: string | null, event: Event): void {
  const { checked } = (event as CustomEvent<{ checked: boolean }>).detail;
  activeElement.value = checked ? label : null;
}

const disabledFor = (id: string) => props.disabled?.find((entry) => entry.id === id);

function onOpenChange(event: Event): void {
  if (event.target !== event.currentTarget) return;
  if (!(event as CustomEvent<{ open: boolean }>).detail.open) {
    armed.value = null;
    inspectingId.value = null;
    activeElement.value = null;
    emit('close');
  }
}

const grid = ref<HTMLElement | null>(null);
const tiles = (): HTMLElement[] => [...(grid.value?.querySelectorAll<HTMLElement>('.slot-picker__tile') ?? [])];

/**
 * Keyboard browsing over the picker grid: arrows and Home/End walk the tiles in display order,
 * and Space opens the focused card's detail, Quick Look style: Enter keeps committing the pick.
 * The same Space convention the deck editor's grid and the detail dialog's close already share.
 * Rows are responsive, so the primitive measures the row length at the focused tile.
 */
const quickLook = createQuickLookGrid({
  getItems: tiles,
  onInspect: (item) => {
    const id = item.dataset.entryId;
    if (id) inspectingId.value = id;
  },
});

function onGridKeydown(event: KeyboardEvent): void {
  quickLook.handleKeydown(event);
}

/** Opening the drawer lands focus on the worn tile, so the arrows work without Tabbing in first. */
watch(
  () => props.open,
  (open) => {
    if (!open) return;
    void nextTick(() => {
      const list = tiles();
      (list.find((tile) => tile.getAttribute('aria-current') === 'true') ?? list[0])?.focus();
    });
  },
);

function tap(equipmentId: string | null): void {
  if (disabledFor(equipmentId ?? '')) return;
  // An empty slot has nothing to refit: the first pick commits directly. The arm-first
  // confirm is for replacing a worn weapon, where the deck really does refit.
  if (!props.warning || props.currentId === null) {
    choose(equipmentId);
    return;
  }
  const entry = equipmentId === null ? undefined : props.entries.find((candidate) => candidate.id === equipmentId);
  armed.value = { id: equipmentId, name: entry?.name ?? t('party.clearSlot') };
}

/** Holding a tile opens its detail: the touch counterpart of Space Quick Look. */
useLongPress(
  grid,
  (detail) => {
    const id = (detail.event.target as HTMLElement).closest<HTMLElement>('.slot-picker__tile')?.dataset.entryId;
    if (id) inspectingId.value = id;
  },
  (event) =>
    event.pointerType !== 'mouse' && (event.target as HTMLElement).closest('.slot-picker__tile') !== null,
);

function confirmArmed(): void {
  if (!armed.value) return;
  choose(armed.value.id);
}

/** Enter in the detail dialog commits the same Equip its footer offers. */
function confirmInspecting(): void {
  const entry = inspecting.value;
  if (!entry || entry.id === props.currentId || disabledFor(entry.id)) return;
  choose(entry.id);
}

/**
 * Commits the choice but keeps the drawer open: the board behind updates, the current marker moves,
 * and the player can keep iterating. Escape, the backdrop or Done closes.
 */
function choose(equipmentId: string | null): void {
  armed.value = null;
  inspectingId.value = null;
  emit('select', equipmentId);
}
</script>

<template>
  <ore-drawer
    :backdrop="desktop ? 'transparent' : 'blur'"
    :label="title"
    :open="open"
    :placement="wide ? 'right' : 'bottom'"
    :style="{ '--drawer-size': wide ? '26rem' : 'min(48rem, 92dvh)' }"
    @open-change="onOpenChange">
    <div class="slot-picker stack" style="--stack-gap: var(--size-2-5)" v-if="open">
      <ore-alert color="warning" size="sm" v-if="warning">{{ warning }}</ore-alert>
      <button class="slot-picker__empty" type="button" v-if="props.currentId !== null" @click="tap(null)">
        <ore-icon aria-hidden="true" name="minus" size="16" />
        {{ t('party.clearSlot') }}
      </button>
      <fieldset
        class="cluster slot-picker__filters"
        v-if="elementOptions.length > 1 && props.entries.length >= FILTER_MIN_ENTRIES"
        :aria-label="t('party.filterElement')"
      >
        <ore-chip
          mode="selectable"
          size="sm"
          value=""
          :checked="!activeElement"
          :variant="!activeElement ? 'solid' : 'bordered'"
          @change="toggleElement(null, $event)">
          {{ t('common.all') }}
        </ore-chip>
        <ore-chip
          mode="selectable"
          size="sm"
          v-for="label in elementOptions"
          :key="label"
          :checked="activeElement === label"
          :value="label"
          :variant="activeElement === label ? 'solid' : 'bordered'"
          @change="toggleElement(label, $event)">
          {{ label }}
        </ore-chip>
      </fieldset>
      <div class="slot-picker__keys">
        <ore-keyboard-shortcut aria-hidden="true">
          <ore-keyboard-key>←</ore-keyboard-key>
          <ore-keyboard-key>→</ore-keyboard-key>
        </ore-keyboard-shortcut>
        <ore-text color="muted" size="sm">{{ t('deck.keysMove') }}</ore-text>
        <ore-keyboard-shortcut aria-hidden="true">
          <ore-keyboard-key>Space</ore-keyboard-key>
        </ore-keyboard-shortcut>
        <ore-text color="muted" size="sm">{{ t('deck.keysPreview') }}</ore-text>
        <ore-keyboard-shortcut aria-hidden="true">
          <ore-keyboard-key>Enter</ore-keyboard-key>
        </ore-keyboard-shortcut>
        <ore-text color="muted" size="sm">{{ t('deck.equip') }}</ore-text>
      </div>
      <ore-text class="slot-picker__hold-hint" color="muted" size="sm">
        {{ t('party.holdHint') }}
      </ore-text>
      <div class="slot-picker__list" ref="grid">
        <section class="slot-picker__group" v-for="group in levelGroups" :key="group.level ?? 'flat'">
          <ore-text class="slot-picker__group-label" variant="overline" v-if="group.level !== null">
            {{ t('party.levelGroup', { level: group.level }) }}
          </ore-text>
          <div class="slot-picker__grid">
            <div
              class="slot-picker__frame"
              v-for="entry in group.entries"
              :key="entry.id"
              :class="{ 'slot-picker__frame--off': disabledFor(entry.id) }">
          <button
            class="slot-picker__tile"
            type="button"
            :aria-current="entry.id === props.currentId ? 'true' : undefined"
            :aria-disabled="disabledFor(entry.id) ? 'true' : undefined"
            :aria-label="`${entry.name}, ${entry.subtitle}`"
            :class="{
              'slot-picker__tile--armed': armed?.id === entry.id,
              'slot-picker__tile--current': entry.id === props.currentId,
              'slot-picker__tile--tall': entry.tall,
            }"
            :data-entry-id="entry.id"
            @click="tap(entry.id)"
            @contextmenu.prevent
            @keydown="onGridKeydown">
            <span class="slot-picker__art-wrap">
              <img alt="" class="slot-picker__art" decoding="async" loading="lazy" :src="asset(entry.artwork)" />
              <span aria-hidden="true" class="slot-picker__level" v-if="entry.level">{{ entry.level }}</span>
              <span
                class="slot-picker__effective"
                v-if="entry.effective"
                :title="props.effectiveTitle">
                <ore-icon aria-hidden="true" name="check" size="12" />
                {{ t('party.effectiveChip') }}
              </span>
            </span>
            <span class="slot-picker__body">
              <span class="slot-picker__name-row">
                <span class="slot-picker__name">{{ entry.name }}</span>
                <ore-chip color="primary" size="sm" variant="solid" v-if="entry.id === props.currentId">
                  {{ t('deck.equipped') }}
                </ore-chip>
              </span>
              <span class="slot-picker__subtitle">
                {{ disabledFor(entry.id)?.reason ?? entry.subtitle }}
              </span>
            </span>
          </button>
          <ore-tooltip class="slot-picker__inspect-tip" :content="t('party.viewCard')" :delay="400" >
            <button
              class="slot-picker__inspect"
              type="button"
              :aria-label="t('party.viewCardAria', { name: entry.name })"
              @click="inspectingId = entry.id">
              <ore-icon aria-hidden="true" name="maximize-2" size="14" />
            </button>
          </ore-tooltip>
            </div>
          </div>
        </section>
      </div>
      <ore-text color="muted" size="sm" v-if="!visibleEntries.length">{{ t('party.pickerEmpty') }}</ore-text>
      <ore-text color="muted" size="sm" v-if="hiddenCount">
        {{ t('party.hiddenPieces', { count: hiddenCount, reason: hiddenNote }) }}
      </ore-text>
    </div>

    <div class="slot-picker__footer" slot="footer">
      <div class="stack" style="--stack-gap: 0" v-if="armed">
        <ore-text class="slot-picker__armed-name" size="sm">{{ armed.name }}</ore-text>
        <!-- The reason rides with the confirm, so it stays visible even when the top alert scrolled away. -->
        <ore-text color="warning" size="xs" v-if="warning">{{ warning }}</ore-text>
      </div>
      <span class="cluster" style="--cluster-gap: var(--size-2)">
        <template v-if="armed">
          <ore-button size="sm" variant="bordered" @click="armed = null">{{ t('common.cancel') }}</ore-button>
          <ore-button color="primary" size="sm" variant="solid" @click="confirmArmed()">
            <ore-icon name="check" slot="prefix" />
            {{ t('deck.equip') }}
          </ore-button>
        </template>
        <ore-button size="sm" variant="bordered" v-else @click="emit('close')">{{ t('common.done') }}</ore-button>
      </span>
    </div>
  </ore-drawer>

  <PickerDetailDialog
    :card="inspecting"
    :cards="visibleEntries"
    :compare="currentEntry"
    :current-id="currentId"
    :effective-title="effectiveTitle"
    :label="inspecting?.name"
    :weapon-icon="weaponIcon"
    @close="inspectingId = null"
    @confirm="confirmInspecting"
    @show="inspectingId = $event.id">
    <template #notice>
      <ore-alert color="warning" size="sm" v-if="warning">{{ warning }}</ore-alert>
    </template>

    <template #action>
      <template v-if="inspecting">
        <ore-chip size="sm" variant="flat" v-if="disabledFor(inspecting.id)">
          <ore-icon name="lock" slot="icon" />
          {{ disabledFor(inspecting.id)?.reason }}
        </ore-chip>
        <ore-button
          color="primary"
          size="sm"
          variant="solid"
          v-else-if="inspecting.id !== currentId"
          :aria-label="t('deck.equipAria', { name: inspecting.name })"
          @click="choose(inspecting.id)">
          <ore-icon name="check" slot="prefix" />
          {{ t('deck.equip') }}
        </ore-button>
      </template>
    </template>
  </PickerDetailDialog>
</template>

<style scoped>
.slot-picker__empty {
  display: flex;
  gap: var(--size-2);
  align-items: center;
  width: 100%;
  padding: var(--size-1-5) var(--size-2);
  font-family: inherit;
  color: var(--p-text);
  cursor: pointer;
  background: var(--p-panel-sunken);
  border: var(--border) dashed var(--p-line-strong);
  border-radius: var(--rounded-sm);
}

.slot-picker__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--size-32), 1fr));
  gap: var(--size-2);
}

.slot-picker__list {
  display: grid;
  gap: var(--size-3);
}

/* A fieldset so the filter group is semantic; the chip row keeps its cluster layout. */
.slot-picker__filters {
  min-width: 0;
  padding: 0;
  margin: 0;
  border: 0;
}

.slot-picker__keys {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-1) var(--size-2);
  align-items: center;
}

/* Touch has no keyboard: the shortcut hints only show where keys exist. */
@media (pointer: coarse) {
  .slot-picker__keys {
    display: none;
  }
}

.slot-picker__hold-hint {
  display: none;
}

/* Where fingers replaced keys, the hold hint takes the shortcut row's place. */
@media (pointer: coarse) {
  .slot-picker__hold-hint {
    display: block;
  }
}

.slot-picker__group {
  display: grid;
  gap: var(--size-2);
}

.slot-picker__frame {
  position: relative;
  min-width: 0;
}

.slot-picker__frame--off {
  opacity: 0.55;
}

.slot-picker__tile {
  position: relative;
  display: grid;
  gap: var(--size-1);
  width: 100%;
  padding: var(--size-1-5);
  font-family: inherit;
  text-align: start;
  cursor: pointer;
  background: var(--p-panel-sunken);
  border: var(--border-2) solid transparent;
  border-radius: var(--rounded-sm);
  transition: border-color var(--p-motion) var(--p-ease);
  /* The hold must not summon the browser's image callout or a text selection. */
  -webkit-touch-callout: none;
  user-select: none;
}

.slot-picker__tile:hover:not([aria-disabled]),
.slot-picker__tile:focus-visible {
  border-color: var(--p-gold-dim);
}

.slot-picker__tile--current {
  border-color: light-dark(var(--color-primary-content), var(--p-gold));
}

.slot-picker__tile--armed {
  border-color: var(--color-warning-border);
  box-shadow: inset 0 0 0 var(--border-2) color-mix(in oklch, var(--color-warning) 30%, transparent);
}

.slot-picker__tile[aria-disabled] {
  cursor: not-allowed;
}

.slot-picker__art-wrap {
  position: relative;
  display: block;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border-radius: var(--rounded-sm);
}

.slot-picker__tile--tall .slot-picker__art-wrap {
  aspect-ratio: 10 / 17;
}

.slot-picker__art {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.slot-picker__level {
  position: absolute;
  top: var(--size-1);
  left: var(--size-1);
  padding: 0 var(--size-1);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--p-text-strong);
  background: color-mix(in oklch, var(--p-panel) 85%, transparent);
  border-radius: var(--rounded-sm);
}

.slot-picker__effective {
  position: absolute;
  bottom: var(--size-1);
  left: var(--size-1);
  display: inline-flex;
  gap: 0.15rem;
  align-items: center;
  padding: 0 var(--size-1);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--color-success-content);
  background: color-mix(in oklch, var(--color-success) 18%, transparent);
  border-radius: var(--rounded-sm);
}

/* The magnifier stays on every tile: a hover-only reveal reads as "keyboard is the only way in",
   and the tile itself is a commit action, not a preview. The tooltip HOST carries the absolute
   position: ore-tooltip is a zero-width positioned inline-block, so a `right` on the button would
   measure from the frame's left edge and land the button one full tile to the left. */
.slot-picker__inspect-tip {
  position: absolute;
  top: var(--size-1-5);
  right: var(--size-1-5);
  z-index: 2;
}

.slot-picker__inspect {
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

.slot-picker__body {
  display: grid;
  min-width: 0;
}

.slot-picker__name-row {
  display: flex;
  gap: var(--size-1);
  align-items: center;
}

.slot-picker__name {
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--text-sm);
  font-weight: 600;
  white-space: nowrap;
}

.slot-picker__subtitle {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--text-xs);
  color: var(--p-text-muted);
  white-space: nowrap;
}

.slot-picker__footer {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-2);
  align-items: center;
  justify-content: space-between;
}

.slot-picker__armed-name {
  font-weight: 600;
}

</style>
