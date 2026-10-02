<script lang="ts" setup>
import { computed } from 'vue';
import type { RouteName } from '../../app/router';
import LinkButton from './LinkButton.vue';
import '@vielzeug/refine/button';
import '@vielzeug/refine/icon';

type ActionKind = 'back' | 'danger' | 'primary' | 'secondary';

const props = defineProps<{
  disabled?: boolean;
  icon?: string;
  kind: ActionKind;
  params?: Record<string, string>;
  size?: 'sm' | 'md' | 'lg';
  to?: RouteName;
}>();
const emit = defineEmits<{ click: [event: MouseEvent] }>();

const color = computed(() => (props.kind === 'primary' ? 'primary' : props.kind === 'danger' ? 'error' : 'secondary'));
const variant = computed(() =>
  props.kind === 'primary' ? 'flat' : props.kind === 'back' ? 'ghost' : 'bordered',
);
const iconName = computed(() => props.icon ?? (props.kind === 'back' ? 'arrow-left' : undefined));
const iconSize = computed(() => (iconName.value === 'arrow-left' ? 14 : undefined));
</script>

<template>
  <LinkButton
    rounded="sm"
    v-if="props.to"
    :color="color"
    :params="props.params"
    :size="props.size ?? 'sm'"
    :to="props.to"
    :variant="variant">
    <ore-icon slot="prefix" v-if="iconName" :name="iconName" :size="iconSize" />
    <slot />
  </LinkButton>
  <ore-button
    rounded="sm"
    type="button"
    v-else
    :color="color"
    :disabled="props.disabled"
    :size="props.size ?? 'sm'"
    :variant="variant"
    @click="emit('click', $event)">
    <ore-icon slot="prefix" v-if="iconName" :name="iconName" :size="iconSize" />
    <slot />
  </ore-button>
</template>
