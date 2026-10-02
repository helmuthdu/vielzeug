<script lang="ts" setup>
/**
 * The compact game library: every optional box as a switch row grouped by what it adds, with
 * the always-included core box stated once above. This is the working copy inside the game
 * setup dialog: the Settings page's ExpansionPicker keeps the full illustrated cards.
 */
import { t } from '../../../app/i18n';
import type { ExpansionId } from '../../../domain/types';
import { coreExpansion, expansionFamilies, toggleExpansion } from '../../composables/use-expansion-picker';
import '@vielzeug/refine/chip';
import '@vielzeug/refine/switch';
import '@vielzeug/refine/text';

const props = defineProps<{ modelValue: ExpansionId[] }>();
const emit = defineEmits<{ 'update:modelValue': [value: ExpansionId[]] }>();

function toggle(id: ExpansionId, checked: boolean): void {
  emit('update:modelValue', toggleExpansion(props.modelValue, id, checked));
}
</script>

<template>
  <div class="box-list">
    <div class="box-list__core">
      <span class="box-list__name">{{ coreExpansion.name }}</span>
      <ore-chip color="primary" size="sm" variant="flat">{{ t('expansionPicker.alwaysSelected') }}</ore-chip>
    </div>

    <section class="box-list__family" v-for="family in expansionFamilies" :key="family.label">
      <ore-text as="h4" class="box-list__family-label" size="xs" variant="overline">{{ family.label }}</ore-text>
      <div class="box-list__row" v-for="expansion in family.expansions" :key="expansion.id">
        <span class="box-list__copy">
          <span class="box-list__name">{{ expansion.name }}</span>
          <span class="box-list__description">{{ expansion.description }}</span>
        </span>
        <ore-switch
          size="sm"
          :checked="modelValue.includes(expansion.id)"
          :label="t('expansionPicker.selectAria', { name: expansion.name })"
          @change="toggle(expansion.id, ($event.target as HTMLInputElement).checked)" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.box-list {
  display: grid;
  gap: var(--size-3);
}

.box-list__core {
  display: flex;
  gap: var(--size-2);
  align-items: center;
  justify-content: space-between;
  padding-block-end: var(--size-2);
  border-block-end: var(--border) solid var(--p-line);
}

.box-list__family {
  display: grid;
  gap: var(--size-1);
}

.box-list__family-label {
  --text-color: var(--p-text-muted);
}

.box-list__row {
  display: flex;
  gap: var(--size-3);
  align-items: center;
  justify-content: space-between;
  padding-block: var(--size-1);
  border-block-end: var(--border) dashed var(--p-line);
}

.box-list__copy {
  display: grid;
  gap: 0.15rem;
  min-width: 0;
}

.box-list__name {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
}

.box-list__description {
  font-size: var(--text-xs);
  color: var(--p-text-muted);
}
</style>
