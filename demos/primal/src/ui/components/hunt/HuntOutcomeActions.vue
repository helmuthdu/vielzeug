<script lang="ts" setup>
import { useMediaQuery } from '../../../app/vue-bridge';
import '@vielzeug/refine/button';
import '@vielzeug/refine/icon';

const props = defineProps<{
  defeatLabel: string;
  /** Ride as the hunt's own floating pill above the main bar (phone's two-pill split). */
  floating?: boolean;
  victoryLabel: string;
}>();
const emit = defineEmits<{ defeat: []; victory: [] }>();

/* The hunt's verdict pair, the fight's two ends: the goal wears the gold commit
   grammar, the fall the crimson of consequential actions. On phones they wear the
   outcome glyphs as circles, the label rides the aria; on every wider tier they
   keep their words. Floating, they become their own pill above the main bar. */
const isPhone = useMediaQuery('(width < 640px)');
</script>

<template>
  <span :class="['hunt-outcome-actions cluster', { 'hunt-outcome-actions--floating': props.floating }]">
    <ore-button color="error" variant="bordered" :icon-only="isPhone" :label="props.defeatLabel"
      :rounded="isPhone ? 'full' : undefined" @click="emit('defeat')">
      <ore-icon name="skull" v-if="isPhone" />
      <template v-if="!isPhone">{{ props.defeatLabel }}</template>
    </ore-button>
    <ore-button color="secondary" variant="solid" :icon-only="isPhone" :label="props.victoryLabel"
      :rounded="isPhone ? 'full' : undefined" @click="emit('victory')">
      <ore-icon name="trophy" v-if="isPhone" />
      <template v-if="!isPhone">{{ props.victoryLabel }}</template>
    </ore-button>
  </span>
</template>

<style scoped>
.hunt-outcome-actions {
  display: inline-flex;
  flex-wrap: wrap;
}

/* The floating verdict pill: its own frosted pill, centered above the main bar. */
.hunt-outcome-actions--floating {
  gap: var(--size-1-5);
  align-items: center;
  padding: var(--size-1-5) var(--size-2);
  background: color-mix(in oklch, var(--p-canvas) 94%, transparent);
  border: var(--border) solid var(--p-line);
  border-radius: var(--rounded-full);
  backdrop-filter: blur(var(--blur-sm));
}
</style>
