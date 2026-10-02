<script lang="ts" setup>
import '@vielzeug/refine/text';
import { computed, ref, watch } from 'vue';
import { t, tp } from '../../../app/i18n';
import { forgeById, hunterById } from '../../../content';
import type { ChroniclesCount, ChroniclesHunterLoadouts } from '../../../domain/chronicles';
import { buildProfile } from '../../../domain/strength';
import type { BoardBuild, EquipmentSlot, Hunter } from '../../../domain/types';
import HunterIdentity from '../../components/party/HunterIdentity.vue';
import { formatCount } from './format';
import HunterComparison, { type HunterComparisonSide } from './HunterComparison.vue';
import HunterDossier from './HunterDossier.vue';

const props = defineProps<{
  byHunter: ChroniclesHunterLoadouts[];
  hunterCounts: ChroniclesCount[];
}>();

const COMPARISON_HUNTER_LIMIT = 2;
const COMPARISON_EQUIPMENT_SLOTS = ['weapon', 'helm', 'armor', 'item'] as const;
type ComparisonEquipmentSlot = (typeof COMPARISON_EQUIPMENT_SLOTS)[number];

/** The hunter selector: one selection opens a dossier, two compare them. */
const roster = computed(() =>
  props.hunterCounts.flatMap(({ count, id }) => {
    const hunter = hunterById(id);

    return hunter ? [{ count, hunter }] : [];
  }),
);
const hunterLoadouts = computed(() => new Map(props.byHunter.map((entry) => [entry.hunterId, entry])));
const selectedHunterIds = ref<string[]>([]);
const selectedHunters = computed(() =>
  selectedHunterIds.value.flatMap((id) => {
    const entry = roster.value.find(({ hunter }) => hunter.id === id);

    return entry ? [entry] : [];
  }),
);
const selectedHunter = computed(() => selectedHunters.value[0] ?? null);
const selectedHunterLoadouts = computed(() =>
  selectedHunter.value ? hunterLoadouts.value.get(selectedHunter.value.hunter.id) : undefined,
);
/** The selection speaks: one hunter opens their dossier, two compare, and a shift is heard. */
const selectionStatus = computed(() => {
  const [first, second] = selectedHunters.value;

  if (!first) return '';
  if (!second) return t('chronicles.hunterInspecting', { name: first.hunter.name });
  return t('chronicles.hunterComparing', { first: first.hunter.name, second: second.hunter.name });
});

/**
 * The comparison's most-used gear: the raw recorded loadout, printed base included, because a
 * slot that only ever wore base gear is worn gear, not an empty slot.
 */
const mostUsedEquipment = (hunter: Hunter, slot: ComparisonEquipmentSlot) =>
  (hunterLoadouts.value.get(hunter.id)?.equipment ?? []).find(
    ({ id }) => forgeById(id)?.type === slot,
  ) ?? null;

/** The two comparison sides: roster entries beside the loadout shape their most-used gear builds. */
const comparisonSides = computed<HunterComparisonSide[]>(() =>
  selectedHunters.value.flatMap((entry) => {
    const equipment = {
      armor: mostUsedEquipment(entry.hunter, 'armor'),
      helm: mostUsedEquipment(entry.hunter, 'helm'),
      item: mostUsedEquipment(entry.hunter, 'item'),
      weapon: mostUsedEquipment(entry.hunter, 'weapon'),
    };
    const equipmentTotals: Partial<Record<EquipmentSlot, string>> = {};

    for (const slot of COMPARISON_EQUIPMENT_SLOTS) {
      const piece = equipment[slot];
      if (piece) equipmentTotals[slot] = formatCount(piece.count);
    }

    const member: Pick<BoardBuild, 'equipment' | 'potionLoadoutIds'> = {
      equipment: {
        armorId: equipment.armor?.id ?? null,
        helmId: equipment.helm?.id ?? null,
        itemId: equipment.item?.id ?? null,
        weaponId: equipment.weapon?.id ?? null,
      },
      potionLoadoutIds: [null, null, null],
    };
    const loadouts = hunterLoadouts.value.get(entry.hunter.id);

    if (!loadouts) return [];

    return [
      {
        ...entry,
        equipmentTotals,
        member,
        profile: buildProfile({ ...loadouts.latestDeck, equipment: member.equipment }, entry.hunter),
      },
    ];
  }),
);

/** Toggling a hunter selects it; a third pick makes room by dropping the oldest selection. */
function toggleHunter(hunterId: string): void {
  if (selectedHunterIds.value.includes(hunterId)) {
    selectedHunterIds.value = selectedHunterIds.value.filter((id) => id !== hunterId);
    return;
  }
  selectedHunterIds.value = [...selectedHunterIds.value, hunterId].slice(-COMPARISON_HUNTER_LIMIT);
}

// Selection stays within the current mode's record; removed hunters do not remain in a dossier or comparison.
watch(
  () => roster.value.map(({ hunter }) => hunter.id),
  (ids) => {
    selectedHunterIds.value = selectedHunterIds.value.filter((id) => ids.includes(id)).slice(0, COMPARISON_HUNTER_LIMIT);
  },
);
</script>

<template>
  <div class="chronicle__hunter-workspace" v-if="roster.length">
    <fieldset class="chronicle__roster">
      <legend class="chronicle__roster-legend">
        {{ t('chronicles.hunterSelectLabel') }}
      </legend>
      <p aria-live="polite" class="chronicle__roster-status" role="status" v-if="selectionStatus">
        {{ selectionStatus }}
      </p>
      <div class="chronicle__roster-options" :style="{ '--chronicle-roster-columns': roster.length }">
        <button class="chronicle__roster-row" type="button" v-for="entry in roster" :key="entry.hunter.id"
          :aria-pressed="selectedHunterIds.includes(entry.hunter.id) ? 'true' : 'false'" @click="toggleHunter(entry.hunter.id)">
          <HunterIdentity :hunter="entry.hunter" />
          <span class="chronicle__roster-count">
            {{ tp('chronicles.huntUnit', entry.count, { count: formatCount(entry.count) }) }}
          </span>
        </button>
      </div>
    </fieldset>

    <div class="chronicle__hunter-detail">
      <!-- Keyed by hunter: switching hunters remounts the dossier, resetting its inspection state. -->
      <HunterDossier v-if="selectedHunters.length === 1" :key="selectedHunter!.hunter.id" :count="selectedHunter!.count"
        :hunter="selectedHunter!.hunter" :loadouts="selectedHunterLoadouts" />
      <p class="chronicle__empty" v-else-if="selectedHunters.length === 0">
        {{ t('chronicles.hunterSelectHint') }}
      </p>

      <HunterComparison v-if="selectedHunters.length === COMPARISON_HUNTER_LIMIT" :sides="comparisonSides" />
    </div>
  </div>
  <p class="chronicle__empty" v-else>{{ t('chronicles.empty') }}</p>
</template>

<style scoped>
.chronicle__hunter-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--size-4);
  margin-top: var(--size-3);
}

.chronicle__roster {
  min-width: 0;
  padding: 0;
  margin: 0;
  border: 0;
}

.chronicle__roster-legend {
  padding: 0;
  font-size: var(--text-xs);
  color: var(--p-text-muted);
}

/* The live selection state sits under the legend: visible to the eye, announced to the ear. */
.chronicle__roster-status {
  margin: var(--size-2) 0 0;
  font-size: var(--text-xs);
  color: var(--p-gold);
}

.chronicle__roster-options {
  display: grid;
  grid-template-columns: repeat(var(--chronicle-roster-columns), minmax(0, 1fr));
  gap: var(--size-2);
  min-width: 0;
  margin-top: var(--size-2);
}

.chronicle__hunter-detail {
  display: grid;
  align-content: start;
  min-width: 0;
}

.chronicle__roster-row {
  --hunter-identity-glyph-color: var(--p-gold-dim);
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--size-3);
  align-content: space-between;
  width: 100%;
  min-width: 0;
  min-height: var(--size-24);
  padding: var(--size-3);
  font-family: inherit;
  text-align: start;
  cursor: pointer;
  scroll-snap-align: start;
  background: var(--p-panel-sunken);
  border: var(--border) solid var(--p-line);
  border-block-end: var(--border-2) solid var(--p-line);
  border-radius: var(--rounded-sm);
  transition:
    background var(--p-motion) var(--p-ease),
    border-color var(--p-motion) var(--p-ease);
}

.chronicle__roster-row:hover {
  background: color-mix(in oklch, var(--p-gold) 6%, var(--p-panel-sunken));
}

.chronicle__roster-row[aria-pressed='true'] {
  --hunter-identity-glyph-color: var(--p-gold);
  background: color-mix(in oklch, var(--p-gold) 10%, var(--p-panel));
  border-color: var(--p-line);
  border-block-end-color: var(--p-gold);
}

.chronicle__roster-row :deep(.hunter-identity__class) {
  display: none;
}

.chronicle__roster-row :deep(.hunter-identity__glyph) {
  width: var(--size-6);
  height: var(--size-6);
}

@media (width < 1024px) {
  .chronicle__roster-options {
    display: flex;
    padding-block-end: var(--size-2);
    overflow-x: auto;
    scroll-snap-type: x proximity;
  }

  .chronicle__roster-row {
    flex: 0 0 min(14rem, 78vw);
    width: auto;
    scroll-snap-align: start;
  }
}
</style>
