<script lang="ts" setup>
import '@vielzeug/refine/badge';
import '@vielzeug/refine/button';
import { t } from '../../../app/i18n';

defineProps<{
  /** Id of the list this control expands, so assistive tech can pair them. */
  controls: string;
  expanded: boolean;
  /** Rows past the first page: the badge announces how many wait behind the fold. */
  hiddenCount: number;
  /** Pre-built accessible label, counts included: each list names itself. */
  label: string;
}>();

const emit = defineEmits<{ toggle: [] }>();
</script>

<template>
  <ore-button
    class="chronicle__more"
    size="sm"
    variant="bordered"
    :aria-controls="controls"
    :aria-expanded="String(expanded)"
    :label="label"
    @click="emit('toggle')">
    {{ t(expanded ? 'chronicles.showLess' : 'chronicles.showMore') }}
    <ore-badge
      aria-hidden="true"
      color="primary"
      size="sm"
      slot="suffix"
      variant="flat"
      v-if="!expanded" 
      :count="hiddenCount"
      :max="hiddenCount"/>
  </ore-button>
</template>

<style scoped>
/* The expansion footers: the record's lists never dead-end at their first eight rows. */
.chronicle__more {
  justify-self: start;
  margin-top: var(--size-2);
}
</style>
