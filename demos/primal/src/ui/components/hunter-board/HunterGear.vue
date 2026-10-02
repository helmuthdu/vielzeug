<script lang="ts" setup>
import { t } from '../../../app/i18n';
import type { BoardBuild, DepletedSlot, Hunter, HunterFightState } from '../../../domain/types';
import LoadoutGrid from '../party/LoadoutGrid.vue';
import '@vielzeug/refine/text';

/**
 * Read-only view of what a hunter carries into the fight, for the hunter board: the shared
 * loadout grid picks its layout from its own width. `fill` stretches it into stretched columns
 * (the desktop gear column); in flow contexts (the mobile party card) it sizes from the card
 * aspect instead. Cards open the full-card detail on tap; potions can be consumed while the
 * hunt is open, and the worn armor/helm carry the fight's deplete flags.
 */
defineProps<{
  /** Whether potions may be consumed right now (hunt in progress, result not recorded). */
  canConsume: boolean;
  /** Stretch into the parent's height: only for columns that actually stretch. */
  fill?: boolean;
  hunter: Hunter;
  member: BoardBuild & { consumedPotionIds: string[] };
  state: HunterFightState;
}>();
const emit = defineEmits<{ consume: [potionId: string]; deplete: [slot: DepletedSlot, depleted: boolean] }>();
</script>

<template>
  <section aria-labelledby="hunter-gear-title" class="gear">
    <ore-text as="h3" class="gear__heading" id="hunter-gear-title" size="sm" variant="heading">
      {{ t('boards.gear') }}
    </ore-text>

    <LoadoutGrid
      :can-consume="canConsume"
      :can-edit="false"
      :depleted="state.depleted"
      :fill="fill ?? false"
      :hunter="hunter"
      :knocked-out="state.knockedOut !== null"
      :member="member"
      :out="state.knockedOut === 'dead'"
      @consume="emit('consume', $event)"
      @deplete="(slot, depleted) => emit('deplete', slot, depleted)" />
  </section>
</template>

<style scoped>
.gear {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: var(--size-3);
  min-width: 0;
  min-height: 0;
}

/* The heading takes the first row; the loadout grid stretches into everything below it. */
.gear > .loadout-frame {
  grid-row: 2;
  min-height: 0;
}

.gear__heading {
  font-family: var(--p-heading);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--p-text-muted);
  text-transform: uppercase;
  letter-spacing: var(--p-tracking);
}
</style>
