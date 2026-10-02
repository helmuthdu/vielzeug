<script lang="ts" setup >
import { computed } from 'vue';
import { href, type RouteTarget } from '../../app/router';
import { navigate } from '../../app/vue-bridge';

/** `ore-button` rendered as a real link, with in-app navigation on plain left clicks. */
const props = defineProps<RouteTarget & { size?: 'sm' | 'md' | 'lg' }>();
const target = computed(() => href(props.to, props.params, props.query));

function open(event: MouseEvent): void {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  void navigate(props.to, props.params, props.query);
}
</script>

<template>
  <ore-button :href="target" :size="props.size" @click="open"><slot /></ore-button>
</template>
