<script lang="ts" setup>
import { t } from '../../../app/i18n';
import '@vielzeug/refine/alert';
import '@vielzeug/refine/button';
import '@vielzeug/refine/icon';

/** Bottom row of a fight board: the read-only notice while locked, otherwise the clear action. */
defineProps<{
  /** Nothing to clear: every counter is zero and no condition is set. */
  idle: boolean;
  locked: boolean;
  lockReason: string;
}>();
const emit = defineEmits<{ clear: [] }>();
</script>

<template>
  <footer class="board-foot">
    <ore-alert color="warning" size="sm" variant="flat" v-if="locked">
      <ore-icon aria-hidden="true" name="lock" slot="icon" />
      {{ t('board.readOnly', { reason: lockReason }) }}
    </ore-alert>
    <ore-button size="sm" variant="ghost" v-else :disabled="idle" @click="emit('clear')">
      <ore-icon aria-hidden="true" name="eraser" slot="prefix" />
      {{ t('board.clearBoard') }}
    </ore-button>
  </footer>
</template>

<style scoped>
.board-foot {
  display: flex;
  justify-content: center;
}

.board-foot > ore-alert {
  width: 100%;
}
</style>
