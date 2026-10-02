<script lang="ts" setup>
import { asset } from '../../app/assets';
import { t } from '../../app/i18n';
import type { AggressionLevel } from '../../domain/types';

withDefaults(
  defineProps<{
    level: AggressionLevel;
    size?: 'sm' | 'md' | 'lg';
  }>(),
  { size: 'md' },
);
</script>

<template>
  <img
    class="aggression-mark"
    :alt="t('aggressionMark.alt', { level })"
    :class="`aggression-mark--${size}`"
    :src="asset(`/aggression_level/aggression_lvl_${level}.svg`)" />
</template>

<style scoped>
.aggression-mark {
  display: block;
  margin-top: calc(var(--size-2) * -1);
  object-fit: contain;
}

.aggression-mark--sm {
  width: var(--size-14);
  height: var(--size-10);
}

.aggression-mark--md {
  width: var(--size-20);
  height: var(--size-10);
}

.aggression-mark--lg {
  width: var(--size-28);
  height: var(--size-16);
}
</style>
