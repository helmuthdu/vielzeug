<script lang="ts" setup>
import { t } from '../../../app/i18n';
import type { ResourceId } from '../../../domain/types';
import ConfirmDialog from '../../components/ConfirmDialog.vue';
import type { WorkshopModel } from './use-workshop';
import '@vielzeug/refine/select';
import '@vielzeug/refine/text';

defineProps<{ workshop: WorkshopModel }>();
</script>

<template>
  <ConfirmDialog
    :confirm-disabled="!workshop.tradeValid"
    :confirm-label="t('forge.tradeLabel')"
    :open="workshop.trading"
    :title="t('forge.tradeLabel')"
    @cancel="workshop.trading = false"
    @confirm="workshop.confirmTrade"
  >
    <div class="stack" style="--stack-gap: var(--size-4)">
      <ore-text>
        {{ t('forge.tradeBody') }}
      </ore-text>
      <ore-select fullwidth :label="t('forge.tradeWith')" :value="workshop.tradeToHunterId" @change="workshop.changeTradePartner">
        <option value="">{{ t('forge.selectHunter') }}</option>
        <option v-for="hunter in workshop.tradePartners" :key="hunter.hunterId" :value="hunter.hunterId">
          {{ workshop.hunterById(hunter.hunterId)?.name ?? hunter.hunterId }}
        </option>
      </ore-select>
      <ore-select fullwidth :label="t('forge.giveLabel')" :value="workshop.offeredResourceId" @change="workshop.changeOfferedResource">
        <option value="">{{ t('forge.selectResource') }}</option>
        <option v-for="resource in workshop.offeredResources" :key="resource.id" :value="resource.id">
          {{ resource.name }} · {{ t('forge.availableSuffix', { count: workshop.selectedMember?.resources[resource.id] ?? 0 }) }}
        </option>
      </ore-select>
      <ore-select
        fullwidth
        :disabled="!workshop.offeredResourceId || !workshop.tradeTarget"
        :label="t('forge.receiveLabel')"
        :value="workshop.requestedResourceId"
        @change="workshop.requestedResourceId = workshop.eventValue($event) as ResourceId | ''"
      >
        <option value="">{{ t('forge.selectResource') }}</option>
        <option v-for="resource in workshop.requestedResources" :key="resource.id" :value="resource.id">
          {{ resource.name }} · {{ t('forge.availableSuffix', { count: workshop.tradeTarget?.resources[resource.id] ?? 0 }) }}
        </option>
      </ore-select>
    </div>
  </ConfirmDialog>
</template>
