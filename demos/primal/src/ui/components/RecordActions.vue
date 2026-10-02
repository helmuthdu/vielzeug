<script lang="ts" setup>
import '@vielzeug/refine/button';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/tooltip';
/**
 * The per-record actions of a saved list row: rename, duplicate, share, delete: as icon-only
 * buttons instead of a "more" menu: every action is one click away and visible at a glance.
 * The parent owns the dialogs; this only reports which action was picked.
 */
export interface RecordAction {
  action: string;
  /** Destructive actions render in the error color. */
  danger?: boolean;
  /** Lucide icon name from the Refine registry. */
  icon: string;
  /** Accessible label: icon-only buttons must say what they do. */
  label: string;
}

defineProps<{ actions: readonly RecordAction[] }>();
const emit = defineEmits<{ select: [action: string] }>();
</script>

<template>
  <span class="record-actions">
    <ore-tooltip v-for="entry in actions" :key="entry.action" :content="entry.label" :delay="400" >
      <ore-button
        icon-only
        size="sm"
        variant="bordered"
        v-bind="entry.danger ? { color: 'error' } : {}"
        :label="entry.label"
        @click="emit('select', entry.action)">
        <ore-icon :name="entry.icon" />
      </ore-button>
    </ore-tooltip>
  </span>
</template>

<style scoped>
.record-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}
</style>
