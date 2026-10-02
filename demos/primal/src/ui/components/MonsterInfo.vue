<script lang="ts" setup>
import { t } from '../../app/i18n';
import type { Monster } from '../../domain/types';
import ResourceIcon from './ResourceIcon.vue';
import '@vielzeug/refine/text';

defineProps<{ monster: Monster }>();
</script>

<template>
  <ore-text variant="overline">{{ t('questBoard.monster') }}</ore-text>
  <div class="monster-info__affinities">
    <div>
      <ore-text size="xs" variant="overline">{{ t('targetBoard.element') }}</ore-text>
      <ResourceIcon size="sm" :id="monster.element" />
    </div>
    <div>
      <ore-text size="xs" variant="overline">{{ t('targetBoard.weakTo') }}</ore-text>
      <div class="monster-info__weaknesses">
        <ResourceIcon size="sm" v-for="id in monster.weaknesses" :key="id" :id="id" />
      </div>
    </div>
  </div>
  <ore-text size="sm">{{ monster.description }}</ore-text>
</template>

<style scoped>
.monster-info__affinities {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-6);
}

.monster-info__affinities > div {
  display: grid;
  gap: var(--size-1);
  align-content: start;
}

.monster-info__weaknesses {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}
</style>
