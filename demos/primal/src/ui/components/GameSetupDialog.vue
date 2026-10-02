<script lang="ts" setup>
/**
 * The game's setup dialog: name the record and set the table's boxes before the hunters take
 * the page. It opens when a game type is chosen and reopens from the create page's header :
 * seeded from the flow's own state, edited in place, closed with one Continue. The library
 * stays collapsed behind its selected count; most tables run the default library.
 */
import { t, tp } from '../../app/i18n';
import type { ExpansionId } from '../../domain/types';
import ExpansionSwitchList from './expansions/ExpansionSwitchList.vue';
import '@vielzeug/refine/accordion';
import '@vielzeug/refine/accordion-item';
import '@vielzeug/refine/button';
import '@vielzeug/refine/dialog';
import '@vielzeug/refine/input';
import '@vielzeug/refine/text';

defineProps<{
  /** The boxes at the table: the flow's own list, edited in place. */
  expansionIds: ExpansionId[];
  /** The accessible name and visible heading: the game being set up. */
  label: string;
  name?: string;
  nameError?: string;
  nameLabel?: string;
  nameMaxlength?: number;
  namePlaceholder?: string;
  open: boolean;
}>();
const emit = defineEmits<{
  close: [];
  'update:expansionIds': [value: ExpansionId[]];
  'update:name': [value: string];
}>();

function onOpenChange(event: Event): void {
  if (event.target !== event.currentTarget) return;
  if (!(event as CustomEvent<{ open: boolean }>).detail.open) emit('close');
}
</script>

<template>
  <ore-dialog backdrop="blur" size="md" :label="label" :open="open" @open-change="onOpenChange">
    <div class="stack" style="--stack-gap: var(--size-4)">
      <ore-text as="h2" size="md" variant="heading">{{ label }}</ore-text>
      <ore-input
        fullwidth
        v-if="nameLabel"
        :error="nameError"
        :label="nameLabel"
        :maxlength="nameMaxlength"
        :placeholder="namePlaceholder"
        :value="name"
        @input="emit('update:name', ($event.target as HTMLInputElement).value)" />
      <slot name="settings" />
      <ore-accordion size="sm">
        <ore-accordion-item>
          <span slot="title">{{ t('gameSetup.libraryTitle') }}</span>
          <span slot="subtitle">{{ tp('gameSetup.libraryCount', expansionIds.length) }}</span>
          <ExpansionSwitchList
            :model-value="expansionIds"
            @update:model-value="emit('update:expansionIds', $event)" />
        </ore-accordion-item>
      </ore-accordion>
    </div>
    <div class="cluster" slot="footer" style="justify-content: flex-end">
      <ore-button color="primary" variant="solid" @click="emit('close')">{{ t('common.continue') }}</ore-button>
    </div>
  </ore-dialog>
</template>
