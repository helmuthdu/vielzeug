<script lang="ts" setup>
import '@vielzeug/refine/text';

/**
 * The run's party workspace: the roster and the board it selects for. One open console in every
 * phase: preparation through hunt, so switching hunters mid-fight is always one docked rail
 * away rather than an expansion step.
 */
const props = defineProps<{ headingId: string; subtitle?: string; title: string }>();
</script>

<template>
  <section class="party-section" :aria-labelledby="props.headingId">
    <header class="party-section__header">
      <div>
        <ore-text as="h2" size="xs" variant="overline" :id="props.headingId">{{ props.title }}</ore-text>
        <ore-text color="muted" size="sm" v-if="props.subtitle">{{ props.subtitle }}</ore-text>
      </div>
      <slot name="actions" />
    </header>
    <div class="party-section__content stack" style="--stack-gap: 2rem">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.party-section {
  display: grid;
  gap: 1rem;
  padding-block: 1rem;
}

.party-section__header {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-3);
  align-items: center;
  justify-content: space-between;
}
</style>
