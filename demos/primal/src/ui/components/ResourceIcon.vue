<script lang="ts" setup >
import { computed } from 'vue';
import { asset } from '../../app/assets';
import { t } from '../../app/i18n';
import { resources } from '../../content';
import '@vielzeug/refine/chip';

const props = defineProps<{ id: string; count?: number; owned?: number; required?: number; size?: 'sm' | 'md' }>();
const resource = computed(() => resources.find((entry) => entry.id === props.id));
const label = computed(() => {
  const name = resource.value?.name ?? props.id;
  return props.required === undefined
    ? name
    : t('resourceIcon.count', { name, owned: props.owned ?? 0, required: props.required });
});
</script>

<template>
  <ore-chip class="resource" variant="bordered" :label="label" :size="size ?? 'md'" >
    <img alt="" class="resource__img" slot="icon" v-if="resource" :src="asset(resource.icon)" />
    {{ resource?.name ?? id }}
    <span class="resource__count numeral" v-if="required !== undefined" > {{ owned ?? 0 }}/{{ required }}</span>
    <span class="resource__count numeral" v-else-if="count !== undefined" > ×{{ count }}</span>
  </ore-chip>
</template>

<style scoped>
.resource {
  --chip-font-size: 0.8rem;
  font-family: var(--p-body);
  text-transform: none;
  letter-spacing: 0.02em;
}

.resource[size='sm'] {
  --chip-font-size: 0.72rem;
}

.resource__img {
  width: 1.5rem;
  height: 1.5rem;
  object-fit: contain;
  filter: drop-shadow(var(--drop-shadow-xs));
}

.resource[size='sm'] .resource__img {
  width: 1.15rem;
  height: 1.15rem;
}

.resource__count {
  color: var(--p-gold);
}
</style>
