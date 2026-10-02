<script lang="ts" setup>
/**
 * One hunter's hero copy: class overline, name with join-order badge, identity line,
 * playstyle chips and the party action. Both party-picker surfaces render it: the filmstrip
 * hero's caption and each page of the phone deck, so the copy and action stay one thing.
 */
import { t } from '../../../app/i18n';
import { weaponClassById } from '../../../content/index';
import type { Hunter } from '../../../domain/types';
import '@vielzeug/refine/button';
import '@vielzeug/refine/chip';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/text';

defineProps<{
  full: boolean;
  hunter: Hunter;
  member: boolean;
  /** The hunter's join order, when they are in the party. */
  order?: number;
}>();
const emit = defineEmits<{ toggle: [] }>();
</script>

<template>
  <div class="hero">
    <ore-text variant="overline">{{ weaponClassById(hunter.classId).name }}</ore-text>
    <span class="hero__title-row">
      <ore-text as="h3" size="lg" variant="heading">{{ hunter.name }}</ore-text>
      <span aria-hidden="true" class="hero__order" v-if="order">{{ order }}</span>
    </span>
    <ore-text class="hero__copy" size="sm">{{ hunter.title }} · {{ hunter.description }}</ore-text>
    <span class="cluster" style="--cluster-gap: 0.3rem; margin-top: 0.4rem">
      <ore-chip size="sm" variant="outline" v-for="tag in hunter.playstyle" :key="tag">{{ tag }}</ore-chip>
    </span>
    <ore-button
      class="hero__toggle"
      :color="member ? 'error' : 'primary'"
      :disabled="full && !member"
      :variant="member ? 'ghost' : 'solid'"
      @click="emit('toggle')">
      <ore-icon slot="prefix" :name="member ? 'x' : 'plus'" />
      {{ member ? t('hunterSelect.remove') : t('hunterSelect.add') }}
    </ore-button>
  </div>
</template>

<style scoped>
.hero {
  display: grid;
  gap: 0.15rem;
}

.hero__title-row {
  display: flex;
  gap: var(--size-2);
  align-items: center;
}

.hero__order {
  display: inline-grid;
  place-items: center;
  min-width: var(--size-5);
  height: var(--size-5);
  padding-inline: var(--size-1);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--p-on-dark);
  background: var(--p-gold);
  border-radius: var(--rounded-full);
}

.hero__copy {
  max-width: 64ch;
}

/* The action sits at the copy's foot: on the phone deck pages, inside the thumb zone. */
.hero__toggle {
  justify-self: start;
  margin-block-start: var(--size-2);
}
</style>
