<script lang="ts" setup>
import { computed, reactive, watch } from 'vue';
import { asset } from '../../../app/assets';
import { t } from '../../../app/i18n';
import { forgeById, resources } from '../../../content';
import type { CraftRequirement, CraftTender } from '../../../domain/campaign';
import type { ResourceId } from '../../../domain/types';
import ResourceIcon from '../../components/ResourceIcon.vue';
import type { WorkshopModel } from './use-workshop';
import '@vielzeug/refine/alert';
import '@vielzeug/refine/button';
import '@vielzeug/refine/checkbox';
import '@vielzeug/refine/text';

const props = defineProps<{ workshop: WorkshopModel }>();
const workshop = props.workshop;

const resourceName = (id: ResourceId) => resources.find((resource) => resource.id === id)?.name ?? id;

// Per-requirement "Pay differently" disclosure state and in-progress pair picks.
const expanded = reactive<Record<string, boolean>>({});
const pairDraft = reactive<Record<string, ResourceId[]>>({});

watch(
  () => workshop.pendingAction,
  (action) => {
    for (const key of Object.keys(expanded)) delete expanded[key];
    for (const key of Object.keys(pairDraft)) delete pairDraft[key];
    // A requirement with no affordable exact payment starts expanded: the player
    // must choose an alternative, so hide nothing behind the disclosure.
    if (action?.kind === 'craft') {
      for (const requirement of workshop.pendingRequirements) {
        if (!workshop.craftPaymentDraft.allocations[requirement.id]) expanded[requirement.id] = true;
      }
    }
  },
  { immediate: true },
);

const isCraft = computed(() => workshop.pendingAction?.kind === 'craft');

const allocationOf = (requirement: CraftRequirement) => workshop.craftPaymentDraft.allocations[requirement.id];

const isSelected = (requirement: CraftRequirement, tender: CraftTender): boolean => {
  const selected = allocationOf(requirement);
  return selected?.kind === tender.kind && selected?.kind === 'resources' && tender.kind === 'resources'
    ? selected.resourceIds.join('+') === tender.resourceIds.join('+')
    : selected?.kind === 'equipment' && tender.kind === 'equipment' && selected.equipmentId === tender.equipmentId;
};

/** Tender options partitioned into the chip groups the panel renders. */
const groupsFor = (requirement: CraftRequirement) => {
  const options = workshop.paymentOptions(requirement);
  return {
    discards: options.filter((option) => option.kind === 'equipment'),
    elements: options.filter(
      (option) =>
        option.kind === 'resources' &&
        option.resourceIds.length === 1 &&
        option.resourceIds[0] !== requirement.resourceId,
    ),
    exact: options.filter(
      (option) =>
        option.kind === 'resources' &&
        option.resourceIds.length === 1 &&
        option.resourceIds[0] === requirement.resourceId,
    ),
    pairs: requirement.kind === 'material',
  };
};

/** Materials available to the two-material picker: owned, with the count left after other requirements' allocations. */
const pickerMaterials = (requirement: CraftRequirement) =>
  resources
    .filter((resource) => resource.category === 'material' && workshop.resourceCount(resource.id) > 0)
    .map((resource) => ({
      ...resource,
      remaining: Math.max(0, workshop.resourceCount(resource.id) - workshop.allocatedResourceCount(requirement.id, resource.id)),
    }));

const tenderChipLabel = (tender: CraftTender): string => {
  if (tender.kind === 'equipment') return forgeById(tender.equipmentId)?.name ?? tender.equipmentId;
  const counts = new Map<ResourceId, number>();
  for (const id of tender.resourceIds) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts].map(([id, count]) => `${resourceName(id)} ×${count}`).join(' + ');
};

const pairUnitsSelected = (requirement: CraftRequirement, materialId: ResourceId): number => {
  const draft = pairDraft[requirement.id];
  if (draft?.length) return draft.filter((entry) => entry === materialId).length;
  const selected = allocationOf(requirement);
  return selected?.kind === 'resources' ? selected.resourceIds.filter((entry) => entry === materialId).length : 0;
};

/** Clearing a payment means the player wants a different one, so open the alternatives. */
function clearTender(requirement: CraftRequirement): void {
  workshop.setTender(requirement.id, null);
  expanded[requirement.id] = true;
}

/** Tap-to-pick two material units; a completed pair becomes the requirement's tender. */
function tapMaterial(requirement: CraftRequirement, materialId: ResourceId): void {
  const draft = pairDraft[requirement.id] ?? [];
  const inDraft = draft.filter((entry) => entry === materialId).length;
  const owned = workshop.resourceCount(materialId);
  let next: ResourceId[];
  if (draft.length >= 2 || (inDraft > 0 && inDraft >= owned)) next = [materialId];
  else if (!draft.includes(materialId) || inDraft < owned) next = [...draft, materialId];
  else next = [materialId];

  pairDraft[requirement.id] = next;
  if (next.length === 2) {
    const candidate: CraftTender = { kind: 'resources', resourceIds: next };
    if (!workshop.paymentOptionDisabled(requirement, candidate)) workshop.setTender(requirement.id, candidate);
    pairDraft[requirement.id] = [];
  }
}
</script>

<template>
  <section class="craft-panel" v-if="workshop.pendingAction" :aria-label="t('forge.paymentPanel')" >
    <ore-alert color="info" v-if="workshop.pendingUpgradeSource">
      <strong>{{ t('forge.upgradeTag') }}</strong>
      {{ t('forge.upgradeReturnNote', { level: workshop.pendingUpgradeSource.level, name: workshop.pendingUpgradeSource.name }) }}
    </ore-alert>

    <template v-if="isCraft">
      <div class="craft-panel__requirement" v-for="requirement in workshop.pendingRequirements" :key="requirement.id">
        <div class="craft-panel__requirement-head">
          <ore-text class="craft-panel__requirement-label" size="sm" variant="overline">
            {{ workshop.requirementLabel(requirement) }}
          </ore-text>
          <button
            class="craft-panel__disclose"
            type="button"
            :aria-expanded="expanded[requirement.id] ? 'true' : 'false'"
            @click="expanded[requirement.id] = !expanded[requirement.id]"
          >
            {{ t('forge.payDifferently') }}
            <span aria-hidden="true">{{ expanded[requirement.id] ? '▴' : '▾' }}</span>
          </button>
        </div>

        <button
          class="pay-chip"
          type="button"
          v-if="allocationOf(requirement)"
          :class="{ 'pay-chip--selected': Boolean(allocationOf(requirement)) }"
          @click="clearTender(requirement)"
        >
          <!-- Equipment tenders carry black-filled glyphs: masked over currentcolor they follow
               the chip's text; resource tenders keep their colored art as images. -->
          <template v-for="icon in workshop.tenderOptionIcons(allocationOf(requirement)!)" :key="icon">
            <i
              aria-hidden="true"
              class="pay-chip__icon pay-chip__icon--glyph"
              v-if="allocationOf(requirement)!.kind === 'equipment'"
              :style="{ '--pay-icon': `url(${icon})` }"></i>
            <img alt="" class="pay-chip__icon" v-else :src="icon" />
          </template>
          <span>{{ tenderChipLabel(allocationOf(requirement)!) }}</span>
          <span aria-hidden="true" class="pay-chip__clear">✕</span>
        </button>
        <button class="pay-chip pay-chip--empty" type="button" v-else @click="expanded[requirement.id] = true">
          {{ t('forge.choosePayment') }}
        </button>

        <div class="craft-panel__groups" v-if="expanded[requirement.id]">
          <div class="pay-group" v-if="groupsFor(requirement).exact.length">
            <span class="pay-group__label">{{ t('forge.exactPayment') }}</span>
            <div class="pay-group__chips">
              <button
                class="pay-chip"
                type="button"
                v-for="option in groupsFor(requirement).exact"
                :key="workshop.tenderValue(option)"
                :class="{ 'pay-chip--selected': isSelected(requirement, option) }"
                :disabled="workshop.paymentOptionDisabled(requirement, option)"
                @click="workshop.setTender(requirement.id, option)"
              >
                <img
                  alt=""
                  class="pay-chip__icon"
                  v-for="icon in workshop.tenderOptionIcons(option)"
                  :key="icon"
                  :src="icon"
                />
                <span>{{ tenderChipLabel(option) }}</span>
              </button>
            </div>
          </div>

          <div class="pay-group" v-if="groupsFor(requirement).elements.length">
            <span class="pay-group__label">{{ t('forge.useElement') }}</span>
            <span class="pay-group__hint">{{ t('forge.ruleElementHint') }}</span>
            <div class="pay-group__chips">
              <button
                class="pay-chip"
                type="button"
                v-for="option in groupsFor(requirement).elements"
                :key="workshop.tenderValue(option)"
                :class="{ 'pay-chip--selected': isSelected(requirement, option) }"
                :disabled="workshop.paymentOptionDisabled(requirement, option)"
                @click="workshop.setTender(requirement.id, option)"
              >
                <img
                  alt=""
                  class="pay-chip__icon"
                  v-for="icon in workshop.tenderOptionIcons(option)"
                  :key="icon"
                  :src="icon"
                />
                <span>{{ tenderChipLabel(option) }}</span>
              </button>
            </div>
          </div>

          <div class="pay-group" v-if="groupsFor(requirement).pairs">
            <span class="pay-group__label">{{ t('forge.useTwoMaterials') }}</span>
            <span class="pay-group__hint">{{ t('forge.ruleTwoMaterialsHint') }}</span>
            <div class="pay-group__chips">
              <button
                class="pay-chip"
                type="button"
                v-for="material in pickerMaterials(requirement)"
                :key="material.id"
                :class="{ 'pay-chip--selected': pairUnitsSelected(requirement, material.id) > 0 }"
                :disabled="material.remaining === 0"
                @click="tapMaterial(requirement, material.id)"
              >
                <img alt="" class="pay-chip__icon" :src="asset(material.icon)" />
                <span>{{ material.name }} ×{{ material.remaining }}</span>
                <span class="pay-chip__units" v-if="pairUnitsSelected(requirement, material.id)">
                  {{ pairUnitsSelected(requirement, material.id) }}
                </span>
              </button>
            </div>
          </div>

          <div class="pay-group" v-if="groupsFor(requirement).discards.length">
            <span class="pay-group__label">{{ t('forge.discardEquipment') }}</span>
            <span class="pay-group__hint">
              {{
                requirement.kind === 'element'
                  ? t('forge.ruleDiscardElementHint', { element: resourceName(requirement.resourceId) })
                  : t('forge.ruleDiscardHint')
              }}
            </span>
            <div class="pay-group__chips">
              <button
                class="pay-chip pay-chip--danger"
                type="button"
                v-for="option in groupsFor(requirement).discards"
                :key="workshop.tenderValue(option)"
                :class="{ 'pay-chip--selected': isSelected(requirement, option) }"
                :disabled="workshop.paymentOptionDisabled(requirement, option)"
                :title="workshop.equipmentPaymentConsequence(option.kind === 'equipment' ? option.equipmentId : undefined)"
                @click="workshop.setTender(requirement.id, option)"
              >
                <i
                  aria-hidden="true"
                  class="pay-chip__icon pay-chip__icon--glyph"
                  v-for="icon in workshop.tenderOptionIcons(option)"
                  :key="icon"
                  :style="{ '--pay-icon': `url(${icon})` }"></i>
                <span>{{ tenderChipLabel(option) }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <ore-alert color="warning" v-if="!workshop.paymentValid">
        {{ t('forge.paymentInvalid') }}
      </ore-alert>

      <section class="craft-panel__outcome" v-if="workshop.paymentValid" :aria-label="t('forge.afterCrafting')" >
        <ore-text size="sm" variant="overline">{{ t('forge.afterCrafting') }}</ore-text>
        <div class="craft-panel__deltas">
          <div class="craft-panel__delta" v-for="resource in workshop.paymentResourceSummary" :key="resource.id">
            <ResourceIcon size="sm" :count="resource.spent" :id="resource.id" />
            <span class="numeral">{{ resource.available }} → {{ resource.remaining }}</span>
          </div>
        </div>
        <div class="craft-panel__rows">
          <span class="craft-panel__row-label">{{ t('forge.equipmentDeck') }}</span>
          <span>{{ t('forge.equipmentDeckAdd', { name: workshop.pendingAction?.entry.name }) }}</span>
        </div>
        <div class="craft-panel__rows">
          <span class="craft-panel__row-label">{{ t('forge.loadoutRow') }}</span>
          <div class="stack" style="--stack-gap: 0.25rem">
            <ore-checkbox
              :checked="workshop.equipAfterCraft"
              @change="workshop.equipAfterCraft = ($event.target as HTMLInputElement).checked"
            >
              {{ t('forge.equipImmediately') }}
            </ore-checkbox>
            <ore-text color="muted" size="sm">{{ workshop.loadoutOutcome }}</ore-text>
          </div>
        </div>
      </section>
    </template>

    <template v-else>
      <div class="stack" style="--stack-gap: 0.5rem" v-if="workshop.pendingCost && 'anyPlants' in workshop.pendingCost">
        <ore-text size="sm" variant="overline">
          {{ t('forge.plantsSelected', { count: workshop.pendingCost.anyPlants, selected: workshop.selectedPlantTotal }) }}
        </ore-text>
        <div class="payment-plant" v-for="plant in workshop.plants" :key="plant.id">
          <ResourceIcon size="sm" :count="workshop.resourceCount(plant.id)" :id="plant.id" />
          <ore-button
            variant="ghost"
            :disabled="(workshop.paymentDraft[plant.id] ?? 0) === 0"
            @click="workshop.adjustPlant(plant.id, -1)"
          >
            <span aria-hidden="true">−</span>
            <span class="visually-hidden">{{ t('forge.removeFromPayment', { name: plant.name }) }}</span>
          </ore-button>
          <ore-text class="numeral" size="sm">{{ workshop.paymentDraft[plant.id] ?? 0 }}</ore-text>
          <ore-button
            variant="ghost"
            :disabled="
              (workshop.paymentDraft[plant.id] ?? 0) >= workshop.resourceCount(plant.id) ||
              workshop.selectedPlantTotal >= workshop.pendingCost.anyPlants
            "
            @click="workshop.adjustPlant(plant.id, 1)"
          >
            <span aria-hidden="true">+</span>
            <span class="visually-hidden">{{ t('forge.addToPayment', { name: plant.name }) }}</span>
          </ore-button>
        </div>
      </div>

      <ore-alert color="warning" v-if="!workshop.paymentValid">
        {{ t('forge.plantsInvalid') }}
      </ore-alert>

      <section class="craft-panel__outcome" v-if="workshop.paymentValid" :aria-label="t('forge.afterPreparing')" >
        <ore-text size="sm" variant="overline">{{ t('forge.afterPreparing') }}</ore-text>
        <div class="craft-panel__deltas">
          <div class="craft-panel__delta" v-for="resource in workshop.potionResourceSummary" :key="resource.id">
            <ResourceIcon size="sm" :count="resource.spent" :id="resource.id" />
            <span class="numeral">{{ resource.available }} → {{ resource.remaining }}</span>
          </div>
        </div>
      </section>
    </template>
  </section>
</template>

<style scoped>
.craft-panel {
  display: grid;
  gap: 0.75rem;
}

.craft-panel__requirement {
  display: grid;
  gap: 0.4rem;
}

.craft-panel__requirement-head {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  justify-content: space-between;
}

.craft-panel__requirement-label {
  color: var(--p-text-muted);
}

.craft-panel__disclose {
  padding: 0.15rem 0.35rem;
  font-family: inherit;
  font-size: var(--text-xs);
  color: var(--p-text-muted);
  cursor: pointer;
  background: none;
  border: none;
}

.craft-panel__disclose:hover {
  color: var(--p-text);
  text-decoration: underline;
}

.craft-panel__groups {
  display: grid;
  gap: 0.6rem;
  padding-top: 0.35rem;
  border-top: 1px dashed var(--p-line);
}

.pay-group {
  display: grid;
  gap: 0.3rem;
}

.pay-group__label {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--p-text-muted);
}

.pay-group__hint {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.pay-group__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.pay-chip {
  display: inline-flex;
  gap: 0.4rem;
  align-items: center;
  padding: 0.3rem 0.55rem;
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--p-text);
  cursor: pointer;
  background: var(--p-panel-sunken);
  border: 1px solid var(--p-line-strong);
  border-radius: var(--rounded-sm);
  transition:
    background var(--p-motion) var(--p-ease),
    border-color var(--p-motion) var(--p-ease);
}

.pay-chip:hover:not(:disabled) {
  border-color: var(--p-gold);
}

.pay-chip:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.pay-chip--selected {
  color: light-dark(var(--color-primary-content), var(--p-gold));
  background: light-dark(oklch(92% 0.025 92), oklch(30% 0.02 92));
  border-color: var(--p-gold-dim);
}

.pay-chip--selected:hover:not(:disabled) {
  background: light-dark(oklch(89% 0.035 92), oklch(36% 0.025 92));
}

.pay-chip--danger:not(.pay-chip--selected) {
  border-color: color-mix(in oklch, var(--color-error) 35%, var(--p-line-strong));
}

.pay-chip--danger.pay-chip--selected {
  color: var(--p-text);
  background: color-mix(in oklch, var(--color-error) 16%, var(--p-panel));
  border-color: var(--color-error);
}

.pay-chip--empty {
  color: var(--color-error);
  cursor: pointer;
  border-color: color-mix(in oklch, var(--color-error) 40%, transparent);
  border-style: dashed;
}

.pay-chip--empty:hover {
  background: color-mix(in oklch, var(--color-error) 8%, transparent);
  border-color: var(--color-error);
}

.pay-chip__icon {
  width: 1.25em;
  height: 1.25em;
  object-fit: contain;
}

/* The class icons are black-filled glyphs: masked over currentcolor they follow the chip's
   text through its resting, selected, and danger states in either theme. */
.pay-chip__icon--glyph {
  flex: none;
  background: currentcolor;
  mask: var(--pay-icon) center / contain no-repeat;
}

.pay-chip__clear {
  font-size: var(--text-xs);
  opacity: 0.7;
}

.pay-chip__units {
  min-width: 1.1em;
  padding: 0 0.25em;
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: light-dark(var(--p-gold-dim), var(--p-gold));
  background: var(--p-panel);
  border-radius: var(--rounded-full, 999px);
}

.craft-panel__outcome {
  display: grid;
  gap: 0.5rem;
  padding-top: 0.6rem;
  border-top: 1px solid var(--p-line);
}

.craft-panel__deltas {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
}

.craft-panel__delta {
  display: flex;
  gap: 0.35rem;
  align-items: center;
  font-size: var(--text-sm);
}

.craft-panel__rows {
  display: grid;
  grid-template-columns: minmax(7rem, auto) minmax(0, 1fr);
  gap: 0.6rem;
  align-items: start;
}

.craft-panel__row-label {
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.payment-plant {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto auto;
  gap: 0.4rem;
  align-items: center;
}

.payment-plant ore-button {
  min-width: 2.75rem;
  min-height: 2.75rem;
}
</style>
