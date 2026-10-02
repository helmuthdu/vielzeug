<script lang="ts" setup >
import { computed } from 'vue';
import { asset } from '../../../app/assets';
import { t } from '../../../app/i18n';
import { weaponClassById } from '../../../content/index';
import type { Hunter } from '../../../domain/types';
import '@vielzeug/refine/card';
import '@vielzeug/refine/chip';
import '@vielzeug/refine/text';

const props = defineProps<{ hunter: Hunter; selected?: boolean; disabled?: boolean; order?: number; compact?: boolean }>();
const emit = defineEmits<{ toggle: [hunterId: string] }>();
const weapon = computed(() => weaponClassById(props.hunter.classId));
</script>

<template>
  <ore-card
    class="hunter"
    interactive
    padding="none"
    :aria-label="t('hunterCard.ariaLabel', { name: hunter.name, weapon: weapon.name }) + (selected ? t('selectedSuffix') : '')"
    :aria-pressed="selected ? 'true' : 'false'"
    :class="{ 'hunter--compact': compact }"
    :disabled="disabled && !selected"
    @activate="emit('toggle', hunter.id)">
    <span aria-hidden="true" class="pick__mark" >{{ order ?? '✓' }}</span>
    <div class="hunter__art" slot="media" >
      <img alt="" loading="lazy" :src="asset(hunter.artwork)" />
    </div>
    <div class="hunter__body">
      <span class="hunter__weapon">
        <i aria-hidden="true" class="glyph" :style="{ '--glyph': `url(${asset(weapon.icon)})` }" ></i>
        <ore-text size="xs" variant="overline" >{{ weapon.name }}</ore-text>
      </span>
      <ore-text as="h3" class="hunter__name" variant="heading" :size="compact ? 'xs' : 'sm'" >{{ hunter.name }}</ore-text>
      <ore-text color="muted" italic variant="caption" >{{ hunter.title }}</ore-text>
      <template v-if="!compact">
        <ore-text class="hunter__desc" size="sm" >{{ hunter.description }}</ore-text>
        <span class="cluster" style="--cluster-gap: 0.35rem; margin-top: 0.4rem">
          <ore-chip size="sm" variant="outline" v-for="tag in hunter.playstyle" :key="tag" >{{ tag }}</ore-chip>
        </span>
      </template>
    </div>
  </ore-card>
</template>

<style scoped>
.hunter {
  height: 100%;
}

.hunter__art {
  position: relative;
  aspect-ratio: 5 / 4;
  overflow: hidden;
  background:
    radial-gradient(
      70% 60% at 50% 40%,
      color-mix(in oklch, var(--color-contrast-50) 90%, transparent),
      transparent 70%
    ),
    linear-gradient(180deg, var(--p-canvas), var(--p-panel-sunken));
}

.hunter__art::after {
  position: absolute;
  inset: 0;
  content: '';
  background: linear-gradient(180deg, transparent 55%, var(--p-panel) 100%);
}

.hunter__art img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top;
  transform: scale(1.02);
}

.hunter__body {
  display: grid;
  gap: 0.3rem;
  padding: 0.9rem 1rem 1.1rem;
}

.hunter__weapon {
  display: inline-flex;
  gap: 0.5rem;
  align-items: center;
  color: var(--p-gold-dim);
}

.hunter__name {
  --text-color: var(--p-text-strong);
}

.hunter__desc {
  margin-top: 0.25rem;
  line-height: 1.45;
}

.hunter--compact .hunter__art {
  aspect-ratio: 4 / 3;
}
</style>
