<script lang="ts" setup>
import type { RouteName } from '../../app/router';
import LinkButton from './LinkButton.vue';
import '@vielzeug/refine/button';
import '@vielzeug/refine/icon';

const props = withDefaults(
  defineProps<{
    desktopOnly?: boolean;
    label: string;
    params?: Record<string, string>;
    /** Query entries the destination carries (e.g. a scope the player should return to). */
    query?: Record<string, string>;
    to?: RouteName;
  }>(),
  { desktopOnly: false },
);
const emit = defineEmits<{ back: [] }>();
</script>

<template>
  <template v-if="to">
    <LinkButton class="phase-back__labeled" variant="ghost" :class="{ 'phase-back__desktop-only': props.desktopOnly }"
      :params="params" :query="query" :to="to">
      <ore-icon aria-hidden="true" name="arrow-left" slot="prefix" />
      {{ label }}
    </LinkButton>
    <LinkButton class="phase-back__compact" icon-only rounded="full" variant="ghost"
      :class="{ 'phase-back__desktop-only': props.desktopOnly }" :label="label" :params="params" :query="query" :to="to">
      <ore-icon aria-hidden="true" name="arrow-left" />
    </LinkButton>
  </template>
  <template v-else>
    <ore-button class="phase-back__labeled" variant="ghost" :class="{ 'phase-back__desktop-only': props.desktopOnly }"
      @click="emit('back')">
      <ore-icon aria-hidden="true" name="arrow-left" slot="prefix" />
      {{ label }}
    </ore-button>
    <ore-button class="phase-back__compact" icon-only rounded="full" variant="ghost"
      :class="{ 'phase-back__desktop-only': props.desktopOnly }" :label="label" @click="emit('back')">
      <ore-icon aria-hidden="true" name="arrow-left" />
    </ore-button>
  </template>
</template>

<style scoped>
.phase-back__compact {
  display: none;
}

@media (width < 1280px) {

  .phase-back__labeled,
  .phase-back__desktop-only {
    display: none;
  }

  .phase-back__compact {
    display: inline-flex;
  }

  .phase-back__compact.phase-back__desktop-only {
    display: none;
  }
}
</style>
