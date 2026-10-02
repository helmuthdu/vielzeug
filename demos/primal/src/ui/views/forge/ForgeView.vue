<script lang="ts" setup>
import { computed } from 'vue';
import { t } from '../../../app/i18n';
import { useMediaQuery } from '../../../app/vue-bridge';
import type { ElementId, ExpansionId } from '../../../domain/types';
import LinkButton from '../../components/LinkButton.vue';
import PageHeader from '../../components/PageHeader.vue';
import PhaseDock from '../../components/PhaseDock.vue';
import { isEquipment, useWorkshop } from './use-workshop';
import WorkshopDetail from './WorkshopDetail.vue';
import WorkshopPayment from './WorkshopPayment.vue';
import WorkshopShelf from './WorkshopShelf.vue';
import WorkshopTradeDialog from './WorkshopTradeDialog.vue';
import WorkshopTray from './WorkshopTray.vue';
import '@vielzeug/refine/button';
import '@vielzeug/refine/card';
import '@vielzeug/refine/drawer';
import '@vielzeug/refine/input';
import '@vielzeug/refine/select';
import '@vielzeug/refine/tab-item';
import '@vielzeug/refine/tabs';
import '@vielzeug/refine/text';
import '@vielzeug/refine/tooltip';

const workshop = useWorkshop();
const wide = useMediaQuery('(min-width: 768px)');
/* The phone dock's commit reads as the state's own verb glyph; the label rides the aria. */
const isPhone = useMediaQuery('(width < 640px)');

/** The dock's commit verb: label and phone icon resolve from one state so they never drift. */
const forgeVerb = computed(() => {
  if (isEquipment(workshop.selectedEntry)) {
    if (workshop.selectedState === 'craftable') {
      return {
        icon: workshop.selectedUpgradeSource ? 'arrow-up-circle' : 'hammer',
        label: workshop.selectedUpgradeSource
          ? t('forge.upgradeEquipment')
          : workshop.selectedCost
            ? t('forge.craftEquipment')
            : t('forge.addStartingEquipment'),
      };
    }

    if (workshop.selectedState === 'owned') return { icon: 'shield-check', label: t('forge.equip') };
    if (workshop.selectedState === 'equipped') return { icon: 'shield-off', label: t('forge.unequip') };
  }

  if (workshop.selectedState === 'craftable') return { icon: 'hammer', label: t('forge.preparePotion') };

  return null;
});

/** Escape, backdrop, and drag-to-close all map to abandoning the drafted payment. */
function onPaymentDrawerChange(event: Event): void {
  if (event.target !== event.currentTarget) return;
  if (!(event as CustomEvent<{ open: boolean }>).detail.open) workshop.cancelAction();
}
</script>

<template>
  <div class="frame workshop" v-if="!workshop.campaignRoute || workshop.campaign">
    <PageHeader class="workshop-masthead" :art="workshop.mastheadArt" :eyebrow="t('forge.eyebrow')"
      :subtitle="workshop.mastheadSubtitle" :title="workshop.mastheadTitle">
      <template #center>
        <ore-tabs color="primary" variant="frost" :label="t('forge.stationLabel')" :value="workshop.mode"
          @change="workshop.changeMode">
          <ore-tab-item slot="tabs" value="forge">{{ t('forge.modeForge') }}</ore-tab-item>
          <ore-tab-item slot="tabs" value="herbalist">{{ t('forge.modeHerbalist') }}</ore-tab-item>
        </ore-tabs>
      </template>
    </PageHeader>

    <!-- The workshop's working span: the dock's craft action rides with it to the page's end. -->
    <div class="phase-flow" style="--phase-gap: 1rem">
      <WorkshopTray :workshop="workshop" />

      <ore-card class="workbench" padding="none">
        <div class="workbench__nav">
          <ore-tabs class="equipment-tabs" color="info" density="compact" variant="ghost"
            v-if="workshop.mode === 'forge'" :label="t('forge.slotLabel')" :value="workshop.slot"
            @change="workshop.changeSlot">
            <ore-tab-item slot="tabs" value="all">{{ t('common.all') }}</ore-tab-item>
            <ore-tab-item slot="tabs" v-for="equipmentSlot in workshop.equipmentSlots" :key="equipmentSlot"
              :value="equipmentSlot">
              {{ workshop.forgeTypeLabel(equipmentSlot) }}
            </ore-tab-item>
          </ore-tabs>
          <ore-tabs class="equipment-tabs" color="info" density="compact" variant="ghost" v-else
            :label="t('forge.potionCategoryLabel')" :value="workshop.potionCategory"
            @change="workshop.changePotionCategory">
            <ore-tab-item slot="tabs" value="all">{{ t('common.all') }}</ore-tab-item>
            <ore-tab-item slot="tabs" v-for="potionCategory in workshop.potionCategories" :key="potionCategory"
              :value="potionCategory">
              {{ workshop.potionCategoryLabel(potionCategory) }}
            </ore-tab-item>
          </ore-tabs>
          <div class="codex-tools" v-if="workshop.codexMode">
            <ore-input rounded="sm" type="search" variant="bordered" :label="t('forge.searchLabel')"
              :placeholder="t('forge.searchPlaceholder')" :value="workshop.query"
              @input="workshop.query = ($event.target as HTMLInputElement).value" />
            <ore-select rounded="sm" variant="bordered" v-if="workshop.mode === 'forge'" :label="t('forge.element')"
              :value="workshop.elementFilter"
              @change="workshop.elementFilter = workshop.eventValue($event) as 'all' | ElementId">
              <option value="all">{{ t('forge.allElements') }}</option>
              <option v-for="entry in workshop.elements" :key="entry.id" :value="entry.id">{{ entry.name }}</option>
            </ore-select>
            <ore-select rounded="sm" variant="bordered" :label="t('forge.expansionLabel')"
              :value="workshop.expansionFilter"
              @change="workshop.expansionFilter = workshop.eventValue($event) as 'all' | ExpansionId">
              <option value="all">{{ t('forge.allExpansions') }}</option>
              <option v-for="entry in workshop.expansions" :key="entry.id" :value="entry.id">{{ entry.name }}</option>
            </ore-select>
          </div>
        </div>

        <div class="workbench__body" :class="{ 'workbench__body--detail': workshop.mobileDetail }">
          <WorkshopShelf :workshop="workshop" />
          <WorkshopDetail :workshop="workshop" />
        </div>
      </ore-card>

      <!-- The recipe's action bar: the selected piece's craft state, pinned at the
           foot like every phase's primary. Codex browsing carries no bar. -->
      <PhaseDock v-if="workshop.campaign && workshop.selectedEntry">
        <template #back>
          <ore-tooltip v-if="!isPhone" :content="t('deck.backToCampaign')" :delay="400">
            <LinkButton to="campaignDashboard" variant="ghost" v-if="workshop.campaign"
              :params="{ id: workshop.campaign.id }">
              <ore-icon name="arrow-left" slot="prefix" />
              {{ t('common.back') }}
            </LinkButton>
          </ore-tooltip>
          <LinkButton icon-only rounded="full" to="campaignDashboard"
            variant="ghost" v-if="isPhone && workshop.campaign" :label="t('common.back')" :params="{ id: workshop.campaign.id }">
            <ore-icon name="arrow-left" />
          </LinkButton>
        </template>

        <template v-if="isEquipment(workshop.selectedEntry)">
          <ore-button color="primary" variant="solid" v-if="workshop.selectedState === 'craftable'" :icon-only="isPhone" :label="forgeVerb?.label"
            :rounded="isPhone ? 'full' : undefined" 
            @click="workshop.requestAction({ entry: workshop.selectedEntry, kind: 'craft' })">
            <ore-icon v-if="isPhone" :name="forgeVerb?.icon" />
            <template v-if="!isPhone">{{ forgeVerb?.label }}</template>
          </ore-button>
          <ore-button color="primary" variant="bordered" v-else-if="workshop.selectedState === 'owned'"
            :icon-only="isPhone" :label="forgeVerb?.label" :rounded="isPhone ? 'full' : undefined" 
            @click="workshop.equip(workshop.selectedEntry, workshop.selectedEntry.type)">
            <ore-icon v-if="isPhone" :name="forgeVerb?.icon" />
            <template v-if="!isPhone">{{ forgeVerb?.label }}</template>
          </ore-button>
          <ore-button variant="ghost" v-else-if="workshop.selectedState === 'equipped'" :icon-only="isPhone" :label="forgeVerb?.label"
            :rounded="isPhone ? 'full' : undefined" 
            @click="workshop.equip(null, workshop.selectedEntry.type)">
            <ore-icon v-if="isPhone" :name="forgeVerb?.icon" />
            <template v-if="!isPhone">{{ forgeVerb?.label }}</template>
          </ore-button>
        </template>
        <ore-button color="primary" variant="solid" v-else-if="workshop.selectedState === 'craftable'"
          :icon-only="isPhone" :label="forgeVerb?.label" :rounded="isPhone ? 'full' : undefined" 
          @click="workshop.requestAction({ entry: workshop.selectedEntry, kind: 'prepare' })">
          <ore-icon v-if="isPhone" :name="forgeVerb?.icon" />
          <template v-if="!isPhone">{{ forgeVerb?.label }}</template>
        </ore-button>
      </PhaseDock>
    </div>

    <ore-drawer backdrop="blur" :label="t('forge.paymentPanel')" :open="workshop.pendingAction !== null"
      :placement="wide ? 'right' : 'bottom'" :style="{ '--drawer-size': wide ? '32rem' : 'min(48rem, 92dvh)' }"
      @open-change="onPaymentDrawerChange">
      <template v-if="workshop.pendingAction">
        <div class="payment-drawer__head" slot="header">
          <ore-text as="h2" size="md" variant="heading">{{ workshop.paymentTitle }}</ore-text>
          <ore-text color="muted" size="sm">
            {{
              workshop.pendingAction.kind === 'prepare'
                ? t('forge.preparingFor', { name: workshop.selectedHunter?.name })
                : t('forge.craftingFor', { name: workshop.selectedHunter?.name })
            }}
          </ore-text>
        </div>
        <WorkshopPayment :workshop="workshop" />
        <div class="payment-drawer__footer" slot="footer">
          <ore-button fullwidth variant="ghost" @click="workshop.cancelAction">
            {{ t('common.cancel') }}
          </ore-button>
          <ore-button color="primary" fullwidth variant="solid" :disabled="!workshop.paymentValid"
            @click="workshop.confirmAction">
            {{ workshop.confirmLabel }}
          </ore-button>
        </div>
      </template>
    </ore-drawer>

    <WorkshopTradeDialog :workshop="workshop" />
  </div>

  <div class="frame empty-page stack" v-else>
    <ore-text variant="overline">{{ t('forge.noCampaignEyebrow') }}</ore-text>
    <ore-text as="h1" size="lg" variant="heading">{{ t('common.noSuchCampaign') }}</ore-text>
    <LinkButton to="campaigns" variant="bordered">{{ t('forge.noCampaignBack') }}</LinkButton>
  </div>
</template>

<style scoped>
.workshop {
  display: grid;
  gap: 1rem;
  min-width: 0;
}

.workshop-masthead,
.workbench {
  box-sizing: border-box;
  min-width: 0;
}

.workshop-masthead {
  margin-bottom: 0;
}

.workbench {
  min-height: 38rem;
  overflow: clip;
}

.workbench__nav {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.75rem;
  align-items: center;
  padding: 0.85rem 1rem;
  background: var(--p-panel-sunken);
  border-bottom: 1px solid var(--p-line);
}

.workbench__nav ore-tabs {
  --tabs-indicator-color: var(--color-info);
}

.equipment-tabs {
  grid-column: 1;
}

.codex-tools {
  grid-column: 1 / -1;
}

.workbench__nav ore-tab-item {
  --tab-item-color: var(--p-text-muted);
  --tab-item-hover-bg: var(--p-panel-sunken);
  --tab-item-active-bg: var(--p-panel-sunken);
  --tab-item-active-color: var(--p-text-strong);
  --tab-item-active-shadow: inset 0 0 0 var(--border) var(--p-line-strong);
}

.codex-tools {
  display: grid;
  grid-template-columns: minmax(14rem, 1.4fr) minmax(10rem, 0.7fr) minmax(10rem, 0.7fr);
  gap: 0.65rem;
}

.codex-tools ore-input {
  --input-radius: var(--rounded-sm);
}

.codex-tools ore-select {
  --input-radius: var(--rounded-sm);
  --select-radius: var(--rounded-sm);
}

.workbench__body {
  display: grid;
  grid-template-columns: minmax(20rem, 0.88fr) minmax(0, 1.8fr);
  min-height: 36rem;
}

.payment-drawer__head {
  display: grid;
  gap: 0.15rem;
}

.payment-drawer__footer {
  display: flex;
  gap: 0.75rem;
}

.empty-page {
  place-items: center;
  padding-block: 4rem;
  text-align: center;
}

@media (width < 980px) {
  .workbench__body {
    grid-template-columns: minmax(15rem, 0.8fr) minmax(0, 1.4fr);
  }
}

@media (width < 720px) {
  .workshop {
    width: calc(100% - 2rem);
    padding-block-start: 0.75rem;
  }

  .codex-tools {
    grid-template-columns: 1fr;
  }

  .workbench__nav {
    grid-template-columns: minmax(0, 1fr);
  }

  .equipment-tabs,
  .workbench-view,
  .recipe-scope-tabs,
  .codex-tools {
    grid-column: 1;
  }

  .workbench-view {
    justify-self: stretch;
    width: 100%;
  }

  .workbench__nav ore-tabs {
    min-width: 0;
    overflow-x: auto;
  }

  .workbench__body {
    display: block;
  }

  .workbench__body--detail :deep(.recipe-shelf) {
    display: none;
  }

  .workbench__body--detail :deep(.recipe-detail) {
    display: grid;
  }
}
</style>
