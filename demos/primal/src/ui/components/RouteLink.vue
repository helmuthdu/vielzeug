<script lang="ts" setup >
import { computed } from 'vue';
import { href, type RouteTarget } from '../../app/router';
import { navigate } from '../../app/vue-bridge';

/** A plain text link to an in-app route, with in-app navigation on plain left clicks. */
const props = defineProps<RouteTarget>();
const target = computed(() => href(props.to, props.params, props.query));

function open(event: MouseEvent): void {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  void navigate(props.to, props.params, props.query);
}
</script>

<template>
  <!-- biome-ignore lint/a11y/useAnchorContent: link text is provided through the slot -->
  <a :href="target" @click="open"><slot /></a>
</template>
