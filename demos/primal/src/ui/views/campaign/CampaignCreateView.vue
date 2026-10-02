<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { t } from '../../../app/i18n';
import { notifyError, settings, startCampaign } from '../../../app/store';
import { navigate, useMediaQuery, useReadable } from '../../../app/vue-bridge';
import { suggestCampaignName, validateCampaignConfig } from '../../../domain/campaign';
import { availableHunters, validateParty } from '../../../domain/party';
import type { ExpansionId, VariantId } from '../../../domain/types';
import GameSetupDialog from '../../components/GameSetupDialog.vue';
import PageHeader from '../../components/PageHeader.vue';
import PageHeaderAction from '../../components/PageHeaderAction.vue';
import PhaseBackButton from '../../components/PhaseBackButton.vue';
import PhaseDock from '../../components/PhaseDock.vue';
import HunterPartyPicker from '../../components/party/HunterPartyPicker.vue';
import '@vielzeug/refine/button';
import '@vielzeug/refine/switch';
import '@vielzeug/refine/text';

const owned = useReadable(settings);

const suggestedName = suggestCampaignName();
const name = ref('');
const expansionIds = ref<ExpansionId[]>([...owned.value.ownedExpansionIds]);
const variants = ref<VariantId[]>([]);
/** The Nightmare variant is a live toggle, not a creation stamp: it opens with the box. */
const nightmare = ref(false);
const hunterIds = ref<string[]>([]);
const touched = ref(false);
/** The setup ritual: name, variants, boxes: opens with the page and reopens from the dock. */
const setupOpen = ref(settings.value.autoOpenGameSetup);

/* The phone dock's commit reads as an icon: the verb rides the aria. */
const isPhone = useMediaQuery('(width < 640px)');

const config = computed(() => ({
  expansionIds: expansionIds.value,
  name: name.value,
  nightmareVariant: nightmare.value,
  variants: variants.value,
}));
const configErrors = computed(() => validateCampaignConfig(config.value).fieldErrors);
const nightmareExpansionSelected = computed(() => expansionIds.value.includes('nightmare'));
const partyValid = computed(() => validateParty(hunterIds.value, expansionIds.value).length === 0);

// Dropping an expansion drops the hunters that came with it, exactly like the physical box.
watch(expansionIds, (next, previous) => {
  const allowed = new Set(availableHunters(next).map((hunter) => hunter.id));
  hunterIds.value = hunterIds.value.filter((id) => allowed.has(id));
  // Adding the Nightmare box turns the variant on, so the quest board reflects Nightmare
  // damage from the first quest; taking the box away can only turn it off.
  if (next.includes('nightmare') && !previous?.includes('nightmare')) nightmare.value = true;
  if (!next.includes('nightmare')) nightmare.value = false;
});

function setVariant(id: VariantId, on: boolean): void {
  const without = variants.value.filter((v) => v !== id);
  variants.value = on ? [...without, id] : without;
}

function create(): void {
  touched.value = true;
  // The name and variants live in the setup dialog: a blocked submit reopens it, error in place.
  if (Object.keys(configErrors.value).length) {
    setupOpen.value = true;
    return;
  }
  if (!partyValid.value) return;
  try {
    const campaign = startCampaign({ ...config.value, name: name.value.trim() || suggestedName }, hunterIds.value);
    void navigate('campaignDashboard', { id: campaign.id });
  } catch (error) {
    notifyError('campaignCreate.createError', error);
  }
}
</script>

<template>
  <div class="frame stack" style="--stack-gap: var(--size-6)">
    <PageHeader art="/backgrounds/bg_campaign.webp" :eyebrow="t('campaignCreate.eyebrow')"
      :subtitle="t('campaignCreate.subtitle')" :title="t('campaignCreate.title')" />

    <!-- The form and its dock share one block-flow context (see .phase-flow): a sticky bar
         could never leave a grid track, and the dock sits outside the form: it submits the
         form through the button's form binding instead. -->
    <div class="phase-flow" style="--phase-gap: var(--size-8)">
      <form class="stack" id="campaign-create" style="--stack-gap: var(--size-8)" @submit.prevent="create">
        <HunterPartyPicker v-model="hunterIds" :expansion-ids="expansionIds" />
      </form>

      <PhaseDock>
        <template #back>
          <PhaseBackButton to="newGame" :label="t('common.back')" />
        </template>
        <PageHeaderAction icon="settings" kind="secondary" size="md" @click="setupOpen = true">
          {{ t('gameSetup.open') }}
        </PageHeaderAction>
        <ore-button color="primary" form="campaign-create" type="submit" variant="solid" :disabled="!partyValid"
          :icon-only="isPhone" :label="t('campaignCreate.submit')" :rounded="isPhone ? 'full' : undefined" >
          <ore-icon name="check" v-if="isPhone" />
          <template v-if="!isPhone">{{ t('campaignCreate.submit') }}</template>
        </ore-button>
      </PhaseDock>
    </div>

    <GameSetupDialog v-model:expansion-ids="expansionIds" v-model:name="name" :label="t('campaignCreate.title')"
      :name-error="touched ? configErrors.name : undefined" :name-label="t('campaignCreate.nameLabel')"
      :name-placeholder="suggestedName" :open="setupOpen" @close="setupOpen = false">
      <template #settings>
        <div class="stack" style="--stack-gap: var(--size-2)">
          <ore-text variant="overline">{{ t('campaignCreate.variantsLabel') }}</ore-text>
          <ore-switch color="primary" :checked="variants.includes('hunters-trial')"
            :helper="t('campaignCreate.trialHelper')"
            @change="setVariant('hunters-trial', ($event.target as HTMLInputElement).checked)">
            {{ t('campaignCreate.trialLabel') }}
          </ore-switch>
          <ore-switch color="error" :checked="nightmare" :disabled="!nightmareExpansionSelected"
            :error="touched ? configErrors.nightmareVariant : undefined"
            :helper="t(nightmareExpansionSelected ? 'common.nightmareHelperOn' : 'common.nightmareHelperOff')"
            @change="nightmare = ($event.target as HTMLInputElement).checked">
            {{ t('common.nightmareLabel') }}
          </ore-switch>
        </div>
      </template>
    </GameSetupDialog>
  </div>
</template>
