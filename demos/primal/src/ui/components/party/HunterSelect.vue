<script lang="ts" setup >
import { computed } from 'vue';
import { t } from '../../../app/i18n';
import { availableHunters, PARTY_MAX, PARTY_MIN, toggleHunter, validateParty } from '../../../domain/party';
import type { ExpansionId } from '../../../domain/types';
import HunterCard from './HunterCard.vue';
import '@vielzeug/refine/grid';
import '@vielzeug/refine/text';

const props = withDefaults(
  defineProps<{
    expansionIds: readonly ExpansionId[];
    /** Upper bound of the picker: the ascent allows five hunters around the table. */
    max?: number;
    /** Lower bound of the picker: the ascent is played solo too. */
    min?: number;
    modelValue: string[];
  }>(),
  { max: PARTY_MAX, min: PARTY_MIN },
);
const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>();

const hunters = computed(() => availableHunters(props.expansionIds));
const issues = computed(() =>
  validateParty(props.modelValue, props.expansionIds, { max: props.max, min: props.min }),
);
const full = computed(() => props.modelValue.length >= props.max);
const orderOf = (id: string) => {
  const index = props.modelValue.indexOf(id);
  return index === -1 ? undefined : index + 1;
};
const toggle = (id: string) => emit('update:modelValue', toggleHunter(props.modelValue, id, props.max));
</script>

<template>
  <section aria-labelledby="hunter-select-title" class="stack" >
    <div class="select-head">
      <div class="stack" style="--stack-gap: 0.25rem">
        <ore-text as="h2" id="hunter-select-title" size="sm" variant="heading" >{{ t('hunterSelect.title') }}</ore-text>
        <ore-text color="muted" size="sm">{{ t('hunterSelect.hint', { max: props.max, min: props.min }) }}</ore-text>
      </div>
      <div aria-live="polite" class="select-count">
        <ore-text as="span" size="md" variant="heading">{{ modelValue.length }}</ore-text>
        <ore-text as="span" color="muted" size="md"> / {{ props.max }}</ore-text>
      </div>
    </div>
    <ore-grid gap="md" min-col-width="16rem" responsive>
      <HunterCard
        v-for="hunter in hunters"
        :key="hunter.id"
        :disabled="full"
        :hunter="hunter"
        :order="orderOf(hunter.id)"
        :selected="modelValue.includes(hunter.id)"
        @toggle="toggle" />
    </ore-grid>
    <ul aria-live="polite" class="list-plain stack" style="--stack-gap: 0.25rem" v-if="issues.length" >
      <li v-for="issue in issues" :key="issue.code"><ore-text color="warning" size="sm">◆ {{ issue.message }}</ore-text></li>
    </ul>
  </section>
</template>

<style scoped>
.select-head {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  justify-content: space-between;
}

.select-count {
  display: flex;
  gap: var(--size-0-5);
  align-items: baseline;
  white-space: nowrap;
}
</style>
