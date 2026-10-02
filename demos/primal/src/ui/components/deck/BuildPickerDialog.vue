<script lang="ts" setup>
import { computed } from 'vue';
import { t, tp } from '../../../app/i18n';
import { loadouts } from '../../../app/store';
import { useReadable } from '../../../app/vue-bridge';
import { forgeById } from '../../../content';
import { buildAvailability, type DeckContext, sameBuild, validateDeck } from '../../../domain/deck';
import type { BoardBuild, HunterLoadout } from '../../../domain/types';
import LinkButton from '../LinkButton.vue';
import DeckComposition from './DeckComposition.vue';
import '@vielzeug/refine/button';
import '@vielzeug/refine/chip';
import '@vielzeug/refine/dialog';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/list';
import '@vielzeug/refine/list-item';
import '@vielzeug/refine/text';

/**
 * Picks a saved build from the library for the hunter on a board. Builds are validated against what this
 * campaign or expedition can supply; managing the library itself happens on the Builds page.
 */
const props = defineProps<{
  /** What the mode can supply; builds with missing pieces cannot be equipped. */
  context: DeckContext;
  /** The build currently on the board: its matching entry is marked as equipped. */
  current: BoardBuild;
  hunterId: string;
  open: boolean;
}>();
const emit = defineEmits<{ apply: [loadout: HunterLoadout]; close: [] }>();

const all = useReadable(loadouts);
const rows = computed(() =>
  all.value
    .filter((loadout) => loadout.hunterId === props.hunterId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((loadout) => {
      const availability = buildAvailability(loadout, props.context);
      return {
        availability,
        equipped: sameBuild(loadout, props.current),
        loadout,
        missing:
          availability.missingCardIds.length +
          availability.missingEquipmentIds.length +
          availability.missingPotionIds.length,
        report: validateDeck(loadout.deckCardIds, { ...props.context, equipment: loadout.equipment }),
        weapon: loadout.equipment.weaponId ? forgeById(loadout.equipment.weaponId)?.name : undefined,
      };
    }),
);

function onOpenChange(event: Event): void {
  if (event.target !== event.currentTarget) return;
  if (!(event as CustomEvent<{ open: boolean }>).detail.open) emit('close');
}
</script>

<template>
  <ore-dialog backdrop="blur" size="md" :label="t('deck.loadBuildTitle')" :open="open" @open-change="onOpenChange">
    <div class="picker stack">
      <ore-text color="muted" size="sm">{{ t('deck.loadBuildHint') }}</ore-text>

      <ore-list class="picker__list" v-if="rows.length" :aria-label="t('deck.loadBuildTitle')">
        <ore-list-item v-for="row in rows" :key="row.loadout.id">
          <div class="picker__row">
            <div class="picker__body">
              <div class="cluster" style="--cluster-gap: var(--size-2)">
                <ore-text as="span" size="sm" variant="heading">{{ row.loadout.name }}</ore-text>
                <ore-chip color="primary" size="sm" variant="solid" v-if="row.equipped">{{ t('deck.equipped') }}</ore-chip>
                <ore-chip color="warning" size="sm" variant="flat" v-else-if="row.missing">
                  {{ tp('deck.loadoutUnavailable', row.missing) }}
                </ore-chip>
              </div>
              <ore-text color="muted" size="sm">{{ row.weapon ?? t('deck.noWeapon') }}</ore-text>
              <DeckComposition compact :report="row.report" />
            </div>
            <ore-button
              color="primary"
              size="sm"
              variant="solid"
              :disabled="row.equipped || !row.availability.available"
              :label="t('deck.equipAria', { name: row.loadout.name })"
              @click="emit('apply', row.loadout)">
              {{ t('deck.equip') }}
            </ore-button>
          </div>
        </ore-list-item>
      </ore-list>
      <ore-text color="muted" size="sm" v-else>{{ t('deck.loadoutsEmpty') }}</ore-text>

      <div class="cluster" style="justify-content: space-between">
        <LinkButton size="sm" to="builds" variant="ghost">
          <ore-icon name="library" slot="prefix" />
          {{ t('deck.manageBuilds') }}
        </LinkButton>
        <ore-button size="sm" variant="bordered" @click="emit('close')">{{ t('common.close') }}</ore-button>
      </div>
    </div>
  </ore-dialog>
</template>

<style scoped>
.picker__row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-3);
  align-items: flex-start;
  justify-content: space-between;
  width: 100%;
}

.picker__body {
  display: grid;
  flex: 1 1 var(--size-64);
  gap: var(--size-1-5);
  min-width: 0;
}
</style>
