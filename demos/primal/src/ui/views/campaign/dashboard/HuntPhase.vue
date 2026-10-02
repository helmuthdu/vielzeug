<script lang="ts" setup>
import { computed } from 'vue';
import { t } from '../../../../app/i18n';
import { runCommand } from '../../../../app/store';
import { monsterById } from '../../../../content';
import HuntControls from '../../../components/hunt/HuntControls.vue';
import HuntOutcomeActions from '../../../components/hunt/HuntOutcomeActions.vue';
import HuntSetup from '../../../components/hunt/HuntSetup.vue';
import HuntTimer from '../../../components/hunt/HuntTimer.vue';
import PhaseBackButton from '../../../components/PhaseBackButton.vue';
import PhaseDock from '../../../components/PhaseDock.vue';
import HunterRoster from '../../../components/party/HunterRoster.vue';
import PartySection from '../../../components/party/PartySection.vue';
import CampaignHuntParty from './CampaignHuntParty.vue';
import type { DashboardModel } from './use-dashboard';
import '@vielzeug/refine/chip';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/text';

const props = defineProps<{ dashboard: DashboardModel }>();
const finalBattleMeta = computed(() => {
  const monster = monsterById(props.dashboard.finalBattle.monsterId);

  return monster ? { element: monster.element, weaknesses: monster.weaknesses } : undefined;
});
</script>

<template>
  <div class="phase-flow" v-if="dashboard.campaign">
    <section class="hunt-reference" v-if="dashboard.isFinalBattle" :aria-label="t('dashboard.huntReference')">
      <HuntSetup :battlefield-objects="dashboard.finalBattle.battlefieldObjects"
        :description="dashboard.finalBattle.introduction" :eyebrow="t('dashboard.finalBattleEyebrow')"
        :habitat="t('dashboard.finalBattleHabitat')" :monster-icon="dashboard.finalBattle.icon"
        :monster-meta="finalBattleMeta" :monster-name="dashboard.finalBattle.name"
        :special-rules="dashboard.finalBattleRules" :terrain="dashboard.finalBattle.terrain"
        :title="dashboard.finalBattle.name">
        <template #meta>
          <div class="cluster" style="--cluster-gap: 0.4rem">
            <ore-chip color="warning" size="sm" variant="flat">{{ t('dashboard.finalBattleChip') }}</ore-chip>
          </div>
        </template>
      </HuntSetup>
    </section>
    <PartySection heading-id="campaign-hunt-party-title" v-if="dashboard.isFinalBattle"
      :subtitle="t('expeditionDetail.partyConsumeHint')" :title="t('expeditionDetail.partyTitle')">
      <div class="party-workspace">
        <HunterRoster :hunters="dashboard.partyHunters" :selected-id="dashboard.selectedHunterId"
          @select="dashboard.selectedHunterId = $event" />
        <CampaignHuntParty :campaign-id="dashboard.campaign.id" :selected-hunter-id="dashboard.selectedHunterId" />
      </div>
    </PartySection>
    <section class="hunt-reference" v-else-if="dashboard.activeQuest && dashboard.activeMonster"
      :aria-label="t('dashboard.huntReference')">
      <HuntSetup :description="dashboard.activeQuest.introduction"
        :eyebrow="t('dashboard.questEyebrow', { monster: dashboard.activeMonster.name, number: dashboard.activeQuest.number })"
        :habitat="dashboard.activeMonster.habitat" :monster-icon="dashboard.activeMonster.trophyIcon"
        :monster-meta="{ element: dashboard.activeMonster.element, weaknesses: dashboard.activeMonster.weaknesses }"
        :monster-name="dashboard.activeMonster.name" :special-rules="dashboard.activeQuest.specialRules"
        :terrain="dashboard.activeQuest.terrain" :title="dashboard.activeQuest.name">
      </HuntSetup>
    </section>
    <PartySection heading-id="campaign-hunt-party-title" v-if="dashboard.activeQuest && dashboard.activeMonster"
      :subtitle="t('expeditionDetail.partyConsumeHint')" :title="t('expeditionDetail.partyTitle')">
      <div class="party-workspace">
        <HunterRoster :hunters="dashboard.partyHunters" :selected-id="dashboard.selectedHunterId"
          @select="dashboard.selectedHunterId = $event" />
        <CampaignHuntParty :campaign-id="dashboard.campaign.id" :selected-hunter-id="dashboard.selectedHunterId" />
      </div>
    </PartySection>
    <PhaseDock>
      <!-- The revisit is the revisitable phase's step back: one confirm away on every tier. -->
      <template #back>
        <PhaseBackButton :label="t('dashboard.backToPreparation')" @back="dashboard.requestRevisit('preparing')" />
      </template>
      <!-- The fight's clock claims the dock's center place: floating above the bar on
           phones, dead-center on every wider tier. -->
      <template #center>
        <HuntTimer :timer="dashboard.campaign.huntTimer"
          @pause="runCommand('pauseHuntTimer', { id: dashboard.campaign.id, kind: 'campaign' })"
          @reset="runCommand('resetHuntTimer', { id: dashboard.campaign.id, kind: 'campaign' })"
          @start="runCommand('startHuntTimer', { id: dashboard.campaign.id, kind: 'campaign' })" />
      </template>
      <!-- The hunt's boards and the fight's two ends share the row. -->
      <HuntControls hunter-board-to="campaignHunterBoard" monster-board-to="campaignMonsterBoard"
        :hunter-board-params="{ hunterId: dashboard.campaign.hunters[0]?.hunterId ?? '', id: dashboard.campaign.id }"
        :monster-board-params="{ id: dashboard.campaign.id }"
        :show-hunter-board="dashboard.campaign.hunters.length > 0" />
      <HuntOutcomeActions :defeat-label="t('huntOutcome.recordDefeat')" :victory-label="t('huntOutcome.recordVictory')"
        @defeat="dashboard.requestOutcome('defeat')" @victory="dashboard.requestOutcome('victory')" />
    </PhaseDock>
  </div>
</template>

<style scoped>
.hunt-reference {
  min-width: 0;
}

/* Game glyphs masked in currentColor so they follow the button color in either theme. */
</style>
