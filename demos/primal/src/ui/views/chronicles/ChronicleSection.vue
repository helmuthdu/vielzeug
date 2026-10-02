<script lang="ts" setup>
import '@vielzeug/refine/text';

defineProps<{ folio: string; id?: string; intro: string; label: string; title: string }>();
</script>

<template>
  <section class="chronicle__section" :aria-label="label" :id="id">
    <header class="chronicle__head">
      <span aria-hidden="true" class="chronicle__folio">{{ folio }}</span>
      <div class="stack" style="--stack-gap: 0.25rem">
        <ore-text as="h2" size="sm" variant="heading">{{ title }}</ore-text>
        <ore-text color="muted" size="sm">{{ intro }}</ore-text>
      </div>
    </header>
    <slot />
  </section>
</template>

<style scoped>
/* One section grammar: a thin frame, the folio numeral, the title, the intro. */
.chronicle__section {
  padding: var(--size-4);
  margin-top: var(--size-7);
  border: 1px solid var(--p-line);
  border-radius: var(--rounded-lg);
}

/* Anchor jumps from the section chips land clear of the top edge. */
.chronicle__section {
  scroll-margin-block-start: var(--size-6);
}

.chronicle__head {
  display: flex;
  gap: var(--size-4);
  align-items: baseline;
}

.chronicle__folio {
  font-family: var(--p-heading);
  font-size: var(--text-md);
  line-height: 1;
  color: var(--p-gold);
}
</style>
