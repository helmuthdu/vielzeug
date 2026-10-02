<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { t } from '../../../app/i18n';
import { notifyError, settings, startAscent } from '../../../app/store';
import { navigate, useMediaQuery, useReadable } from '../../../app/vue-bridge';
import { ASCENT_NAME_MAX, ASCENT_PARTY_MIN, suggestAscentName } from '../../../domain/ascent';
import { availableHunters, partyMaxFor } from '../../../domain/party';
import { missingExpansionIds, requiredExpansionsFor } from '../../../domain/prerequisites';
import type { ExpansionId } from '../../../domain/types';
import ExpansionRequirement from '../../components/expansions/ExpansionRequirement.vue';
import GameSetupDialog from '../../components/GameSetupDialog.vue';
import PageHeader from '../../components/PageHeader.vue';
import PageHeaderAction from '../../components/PageHeaderAction.vue';
import PhaseBackButton from '../../components/PhaseBackButton.vue';
import PhaseDock from '../../components/PhaseDock.vue';
import HunterPartyPicker from '../../components/party/HunterPartyPicker.vue';
import '@vielzeug/refine/alert';
import '@vielzeug/refine/button';
import '@vielzeug/refine/card';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/switch';
import '@vielzeug/refine/text';

/**
 * Mount Havoc: the ascent. A fixed three-chapter climb with a random encounter per chapter:
 * choose the game library and party (2–4 hunters, or 2–5 with Mount Havoc), then start the climb.
 */
const owned = useReadable(settings);
const expansionIds = ref<ExpansionId[]>([...owned.value.ownedExpansionIds]);

const suggestedName = suggestAscentName();
const name = ref('');
/** The Nightmare variant: on while its box is picked, off when it leaves. */
const nightmare = ref(false);
const hunterIds = ref<string[]>([]);
const touched = ref(false);
/** The setup ritual: name and boxes: opens with the page and reopens from the dock. */
const setupOpen = ref(settings.value.autoOpenGameSetup);

/* The phone dock's commit reads as an icon: the verb rides the aria. */
const isPhone = useMediaQuery('(width < 640px)');
const partyMax = computed(() => partyMaxFor(expansionIds.value));
// The gate is the shelf, not the working library: a deep link can pull a box into the session,
// but it cannot conjure ownership. Reachable only past the New Game lock, so this is the
// defensive banner for a shared or bookmarked create URL.
const missing = computed(() => missingExpansionIds(requiredExpansionsFor('ascent'), owned.value.ownedExpansionIds));

// Dropping an expansion drops the hunters that came with it, exactly like the physical box.
watch(expansionIds, (next, previous) => {
  const allowed = new Set(availableHunters(next).map((hunter) => hunter.id));
  hunterIds.value = hunterIds.value.filter((id) => allowed.has(id));
  // Adding the Nightmare box turns the variant on, so the climb's boards and score sheets
  // reflect it from the first chapter; taking the box away can only turn it off.
  if (next.includes('nightmare') && !previous?.includes('nightmare')) nightmare.value = true;
  if (!next.includes('nightmare')) nightmare.value = false;
});

const partyError = computed(() => {
  if (hunterIds.value.length < ASCENT_PARTY_MIN) return t('ascentCreate.partyMin');
  if (hunterIds.value.length > partyMax.value) return t('ascentCreate.partyMax', { max: partyMax.value });
  const available = new Set(availableHunters(expansionIds.value).map((hunter) => hunter.id));
  if (hunterIds.value.some((id) => !available.has(id))) return t('ascentCreate.partyUnavailable');
  return null;
});

function create(): void {
  touched.value = true;
  if (missing.value.length > 0 || partyError.value) return;
  try {
    const ascent = startAscent(name.value.trim() || suggestedName, hunterIds.value, expansionIds.value, nightmare.value);
    void navigate('ascentDetail', { id: ascent.id });
  } catch (error) {
    notifyError('ascentCreate.createError', error);
  }
}
</script>

<template>
  <div class="frame stack" style="--stack-gap: var(--size-6)">
    <PageHeader art="/backgrounds/bg_mount_havoc_2.webp" :eyebrow="t('ascentCreate.eyebrow')"
      :subtitle="t('ascentCreate.subtitle')" :title="t('ascentCreate.title')" />

    <!-- The form and its dock share one block-flow context (see .phase-flow): a sticky bar
         could never leave a grid track, and the dock sits outside the form: it submits the
         form through the button's form binding instead. -->
    <div class="phase-flow" style="--phase-gap: var(--size-8)">
      <form class="stack" id="ascent-create" style="--stack-gap: var(--size-8)" @submit.prevent="create">
        <ExpansionRequirement v-if="missing.length > 0" :missing="missing"
          :required="requiredExpansionsFor('ascent')" />
        <HunterPartyPicker v-model="hunterIds" :expansion-ids="expansionIds" :min="ASCENT_PARTY_MIN" />

        <ore-alert color="warning" size="sm" variant="flat" v-if="touched && partyError">
          <ore-icon name="alert-triangle" slot="icon" />
          {{ partyError }}
        </ore-alert>
      </form>

      <PhaseDock>
        <template #back>
          <PhaseBackButton to="newGame" :label="t('common.back')" />
        </template>
        <PageHeaderAction icon="settings" kind="secondary" size="md" @click="setupOpen = true">
          {{ t('gameSetup.open') }}
        </PageHeaderAction>
        <ore-button color="primary" form="ascent-create" type="submit" variant="solid"
          :disabled="!!partyError || missing.length > 0" :icon-only="isPhone" :label="t('ascentCreate.submit')" :rounded="isPhone ? 'full' : undefined" >
          <ore-icon name="check" v-if="isPhone" />
          <template v-if="!isPhone">{{ t('ascentCreate.submit') }}</template>
        </ore-button>
      </PhaseDock>
    </div>

    <GameSetupDialog v-model:expansion-ids="expansionIds" v-model:name="name" :label="t('ascentCreate.title')"
      :name-label="t('ascentCreate.nameLabel')" :name-maxlength="ASCENT_NAME_MAX" :name-placeholder="suggestedName"
      :open="setupOpen" @close="setupOpen = false">
      <template #settings>
        <div class="stack" style="--stack-gap: var(--size-2)">
          <ore-text variant="overline">{{ t('campaignCreate.variantsLabel') }}</ore-text>
          <ore-switch color="error" :checked="nightmare" :disabled="!expansionIds.includes('nightmare')"
            :helper="t(expansionIds.includes('nightmare') ? 'common.nightmareHelperOn' : 'common.nightmareHelperOff')"
            @change="nightmare = ($event.target as HTMLInputElement).checked">
            {{ t('common.nightmareLabel') }}
          </ore-switch>
        </div>
      </template>
    </GameSetupDialog>
  </div>
</template>
