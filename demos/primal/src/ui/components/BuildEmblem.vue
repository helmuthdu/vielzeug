<script lang="ts" setup>
import { asset } from '../../app/assets';
import { weaponClassById } from '../../content';
import type { Hunter } from '../../domain/types';

/**
 * The build rows' hunter marker: the weapon class emblem. One home for the emblem's
 * styling, dark mode included, so every list that shows builds (the local library,
 * the online catalog) renders it the same way.
 */
const props = defineProps<{ hunter: Hunter | undefined }>();
</script>

<template>
  <img
    alt=""
    class="build-save__emblem"
    v-if="props.hunter"
    :src="asset(weaponClassById(props.hunter.classId).icon)" />
</template>

<style scoped>
.build-save__emblem {
  object-fit: contain;
  filter: drop-shadow(var(--drop-shadow-sm));
}

/* The weapon class icons are printed black; invert them like the aggression mark so they read on dark. */
html[data-theme='dark'] .build-save__emblem {
  filter: invert(1) brightness(1.1) opacity(0.86) drop-shadow(var(--drop-shadow-sm));
}
</style>
