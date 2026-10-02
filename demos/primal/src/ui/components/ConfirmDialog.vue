<script lang="ts" setup >
import { t } from '../../app/i18n';
import '@vielzeug/refine/button';
import '@vielzeug/refine/dialog';
import '@vielzeug/refine/icon';

withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    confirmDisabled?: boolean;
    confirmIcon?: string;
    confirmLabel?: string;
    danger?: boolean;
    size?: 'sm' | 'md' | 'lg';
  }>(),
  { size: 'sm' },
);
const emit = defineEmits<{ confirm: []; cancel: [] }>();

function onOpenChange(event: Event): void {
  if (event.target !== event.currentTarget) return;
  if (!(event as CustomEvent<{ open: boolean }>).detail.open) emit('cancel');
}
</script>

<template>
  <ore-dialog backdrop="blur" :label="title" :open="open" :size="size" @open-change="onOpenChange">
    <slot />
    <div class="cluster" slot="footer" style="justify-content: flex-end">
      <ore-button size="sm" variant="ghost" @click="emit('cancel')">{{ t('common.cancel') }}</ore-button>
      <ore-button size="sm" variant="solid" :color="danger ? 'error' : 'primary'" :disabled="confirmDisabled" @click="emit('confirm')">
        <ore-icon slot="prefix" v-if="confirmIcon" :name="confirmIcon"></ore-icon>
        {{ confirmLabel ?? t('common.confirm') }}
      </ore-button>
    </div>
  </ore-dialog>
</template>
