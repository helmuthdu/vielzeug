<script lang="ts" setup>
import { computed, onUnmounted, ref } from 'vue';
import { t } from '../../../../app/i18n';
import { notifyError, runCommand } from '../../../../app/store';
import { navigate } from '../../../../app/vue-bridge';
import { campaignDeckContext } from '../../../../domain/deck';
import type { HunterLoadout } from '../../../../domain/types';
import ActionsMenu from '../../../components/ActionsMenu.vue';
import PartyBuildPickerDialog from '../../../components/deck/PartyBuildPickerDialog.vue';
import LinkButton from '../../../components/LinkButton.vue';
import LoreEntry from '../../../components/LoreEntry.vue';
import PhaseBackButton from '../../../components/PhaseBackButton.vue';
import PhaseDock from '../../../components/PhaseDock.vue';
import CampaignParty from '../../../components/party/CampaignParty.vue';
import HunterRoster from '../../../components/party/HunterRoster.vue';
import PartySection from '../../../components/party/PartySection.vue';
import { usePartyBuilds } from '../../../composables/use-party-builds';
import type { DashboardModel } from './use-dashboard';
import '@vielzeug/refine/accordion';
import '@vielzeug/refine/accordion-item';
import '@vielzeug/refine/button';
import '@vielzeug/refine/button-group';
import '@vielzeug/refine/card';
import '@vielzeug/refine/chip';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/text';

const props = defineProps<{ dashboard: DashboardModel }>();

/** The chapter's prose: the band shows the summary, the accordion opens the full account. */
const chapterLore = computed(() => props.dashboard.chapter?.paragraphs.join(' ') ?? '');
const questIntroduction = computed(() => props.dashboard.activeQuest?.lore.introductions[0]);
const lanternBearer = computed(() => {
  const campaign = props.dashboard.campaign;
  return campaign?.expansionIds.includes('feather') && campaign.achievements.includes('The Lantern Bearer')
    ? props.dashboard.finalBattle.lanternBearer
    : undefined;
});
const storyArt = '/backgrounds/bg_story.webp';

// The dock's densities: phones run the arrow-back rail, tablet portrait squares the
// utilities so the framing fits one row, and every wider width shows the labels.
function dockTier(): 'phone' | 'portrait' | 'full' {
  if (window.innerWidth < 640) return 'phone';
  if (window.innerWidth < 900) return 'portrait';
  return 'full';
}
const tier = ref(dockTier());
const syncTier = () => {
  tier.value = dockTier();
};
window.addEventListener('resize', syncTier);
onUnmounted(() => window.removeEventListener('resize', syncTier));
const isPhone = computed(() => tier.value === 'phone');
// Only the tablet portrait squares the utilities: phones carry them in the tools menu, every
// wider tier keeps the labeled cluster.
const hideUtilityText = computed(() => tier.value === 'portrait');

/** The phone actions menu's one pick: one action, routed exactly like the desktop buttons. */
function runPrepTool(value: string): void {
  const { dashboard } = props;

  if (value === 'decks') {
    void navigate('campaignDeck', {
      hunterId: dashboard.selectedHunterId ?? '',
      id: dashboard.campaign?.id ?? '',
    });
  } else if (value === 'forge') {
    void navigate('campaignForge', { id: dashboard.campaign?.id ?? '' });
  } else if (value === 'builds') {
    partyLoadOpen.value = true;
  } else if (value === 'logs') {
    void navigate('campaignLog', { id: dashboard.campaign?.id ?? '' });
  }
}

// The one-click party load: each hunter's newest saved build, pre-checked in the dialog.
const partyLoadOpen = ref(false);
const partyBuilds = usePartyBuilds(
  () => props.dashboard.campaign,
  (current, member, hunter) => campaignDeckContext(current, member, hunter),
);

function applyPartyBuilds(list: HunterLoadout[]): void {
  const ref = props.dashboard.subject;
  if (!ref) return;
  try {
    for (const loadout of list) runCommand('applyLoadout', ref, loadout.hunterId, loadout);
  } catch (error) {
    notifyError('toasts.actionNotPossible', error);
  }
  partyLoadOpen.value = false;
}
</script>

<template>
  <div class="phase-screen phase-screen--preparing phase-flow">
    <header class="phase-heading">
      <ore-text variant="overline">{{ t('dashboard.preparing') }}</ore-text>
      <ore-text as="h3" size="lg" variant="heading">{{ t('dashboard.prepareTitle') }}</ore-text>
      <ore-text color="muted">{{ t('dashboard.prepareHint') }}</ore-text>
    </header>

    <!-- The chapter's story as a journal band over the party work: the ascent chapters'
         and the Winds series' grammar: the summary rides the band, the full account
         reads on demand. -->
    <ore-card class="lore-band" padding="none" v-if="dashboard.chapter">
      <LoreEntry :art="storyArt" :excerpt="dashboard.chapter.summary" :lore="chapterLore"
        :overline="t('dashboard.eyebrow', { chapter: dashboard.campaign?.chapter ?? 0, total: dashboard.TOTAL_CHAPTERS })" />
    </ore-card>

    <ore-card class="lore-band" padding="none"
      v-if="questIntroduction && !dashboard.isFinalBattle && dashboard.activeQuest">
      <LoreEntry art="/backgrounds/bg_expedition.webp" :excerpt="questIntroduction.summary"
        :lore="questIntroduction.paragraphs.join(' ')"
        :overline="t('dashboard.questIntroduction', { number: dashboard.activeQuest.number })" />
    </ore-card>

    <ore-card class="lore-band" padding="none" v-if="lanternBearer">
      <LoreEntry :excerpt="lanternBearer.summary" :lore="lanternBearer.paragraphs.join(' ')"
        :overline="t('dashboard.lanternBearer')" />
    </ore-card>

    <ore-card class="lore-band" padding="none" v-if="dashboard.isFinalBattle">
      <LoreEntry :excerpt="dashboard.finalBattle.lore.introduction.summary"
        :lore="dashboard.finalBattle.lore.introduction.paragraphs.join(' ')"
        :overline="t('dashboard.finalBattleEyebrow')" />
    </ore-card>

    <!-- The chapter box applied automatically as the chapter started: its printed steps stay
         beside the party work as the table-side checklist. -->
    <ore-accordion class="chapter-box" size="sm" variant="text" v-if="dashboard.instructions.length">
      <ore-accordion-item>
        <span slot="title">{{ t('dashboard.chapterRewards') }}</span>
        <span class="chapter-box__hint" slot="subtitle">{{ t('dashboard.chapterRewardsHint') }}</span>
        <ol class="chapter-box__list">
          <li v-for="(instruction, index) in dashboard.instructions" :key="instruction.text">
            <span aria-hidden="true" class="chapter-box__number">{{ index + 1 }}</span>
            <ore-text size="sm">{{ instruction.text }}</ore-text>
            <ore-chip size="sm" variant="outline" v-if="instruction.expansionId">
              {{ instruction.expansionId }}
            </ore-chip>
          </li>
        </ol>
      </ore-accordion-item>
    </ore-accordion>

    <!-- The final briefing's discussion questions: read aloud as a group before the last hunt. -->
    <section aria-labelledby="lore-questions-title" class="game-panel"
      v-if="dashboard.isFinalBattle && dashboard.chapter?.loreQuestions">
      <div class="game-panel__heading">
        <div>
          <ore-text as="h4" id="lore-questions-title" size="sm" variant="heading">
            {{ t('dashboard.loreQuestionsTitle') }}
          </ore-text>
        </div>
      </div>
      <ul class="lore-questions">
        <li v-for="question in dashboard.chapter?.loreQuestions" :key="question">
          <ore-text size="sm">{{ question }}</ore-text>
        </li>
      </ul>
    </section>

    <PartySection heading-id="campaign-preparing-party-title" :title="t('expeditionDetail.partyTitle')">
      <div class="party-workspace">
        <HunterRoster :deck-status="dashboard.partyDeckStatus" :hunters="dashboard.partyHunters"
          :selected-id="dashboard.selectedHunterId" @select="dashboard.selectedHunterId = $event" />
        <CampaignParty v-model="dashboard.selectedHunterId" :campaign-id="dashboard.campaign?.id ?? ''" />
      </div>
    </PartySection>

    <!-- Blocking alert banner when any hero deck is invalid -->
    <div class="deck-blocking-alert" v-if="dashboard.invalidPreparingHunters.length > 0">
      <div class="deck-blocking-alert__header">
        <span aria-hidden="true" class="deck-blocking-alert__icon">
          <ore-icon name="alert-triangle" />
        </span>
        <ore-text class="deck-blocking-alert__title" color="error" size="sm" weight="semibold">
          {{ t('dashboard.invalidDecksNotice') }}
        </ore-text>
      </div>
      <div class="deck-blocking-alert__actions cluster" style="--cluster-gap: var(--size-2)">
        <ore-button color="error" size="sm" variant="bordered" v-for="item in dashboard.invalidPreparingHunters"
          :key="item.hunter.id" :label="t('dashboard.selectHunterToFixDeck', { name: item.hunter.name })"
          @click="dashboard.selectedHunterId = item.hunter.id">
          {{ item.hunter.name }}
        </ore-button>
      </div>
    </div>

    <PhaseDock>
      <!-- The quest board sits one revisit back. The final battle's preparation is the
           chapter's start, so it carries no back: the ascent's grammar. -->
      <template #back>
        <PhaseBackButton v-if="!dashboard.isFinalBattle" :label="t('dashboard.backChangeQuest')"
          @back="dashboard.requestRevisit('quest-board')" />
      </template>
      <!-- The preparation utilities: fixing decks and gearing up, one glance from the
           primary they unblock. The deck page redirects a stale hunter id itself.
           Phones carry the cluster as the actions menu: one pick, one action. -->
      <ActionsMenu v-if="isPhone" @select="runPrepTool">
        <ore-menu-item value="decks">
          <ore-icon name="layers" slot="icon" />
          {{ t('challenge.openDeck') }}
        </ore-menu-item>
        <ore-menu-item value="forge">
          <ore-icon name="flame" slot="icon" />
          {{ t('party.openForge') }}
        </ore-menu-item>
        <ore-menu-item value="builds">
          <ore-icon name="library" slot="icon" />
          {{ t('deck.loadBuilds') }}
        </ore-menu-item>
        <ore-menu-item value="logs">
          <ore-icon name="scroll" slot="icon" />
          {{ t('dashboard.viewLogs') }}
        </ore-menu-item>
      </ActionsMenu>
      <ore-button-group attached variant="bordered" v-else>
        <LinkButton to="campaignDeck" :icon-only="hideUtilityText" :label="t('challenge.openDeck')"
          :params="{ hunterId: dashboard.selectedHunterId ?? '', id: dashboard.campaign?.id ?? '' }">
          <ore-icon name="layers" :slot="hideUtilityText ? null : 'prefix'" />
          <template v-if="!hideUtilityText">{{ t('challenge.openDeck') }}</template>
        </LinkButton>
        <LinkButton to="campaignForge" :icon-only="hideUtilityText" :label="t('party.openForge')"
          :params="{ id: dashboard.campaign?.id ?? '' }">
          <ore-icon name="flame" :slot="hideUtilityText ? null : 'prefix'" />
          <template v-if="!hideUtilityText">{{ t('party.openForge') }}</template>
        </LinkButton>
        <ore-button :icon-only="hideUtilityText" :label="t('deck.loadBuilds')" @click="partyLoadOpen = true">
          <ore-icon name="library" :slot="hideUtilityText ? null : 'prefix'" />
          <template v-if="!hideUtilityText">{{ t('deck.loadBuilds') }}</template>
        </ore-button>
        <LinkButton to="campaignLog" :icon-only="hideUtilityText" :label="t('dashboard.viewLogs')"
          :params="{ id: dashboard.campaign?.id ?? '' }">
          <ore-icon name="scroll" :slot="hideUtilityText ? null : 'prefix'" />
          <template v-if="!hideUtilityText">{{ t('dashboard.viewLogs') }}</template>
        </LinkButton>
      </ore-button-group>
      <ore-button color="secondary" variant="solid" :disabled="dashboard.invalidPreparingHunters.length > 0"
        :icon-only="isPhone" :label="t('dashboard.enterHunt')" :rounded="isPhone ? 'full' : undefined"
        @click="dashboard.send({ type: 'FINISH_PREPARING' })">
        <ore-icon name="swords" :slot="isPhone ? null : 'prefix'" />
        <template v-if="!isPhone">{{ t('dashboard.enterHunt') }}</template>
      </ore-button>
    </PhaseDock>

    <PartyBuildPickerDialog :open="partyLoadOpen" :rows="partyBuilds" @apply="applyPartyBuilds"
      @close="partyLoadOpen = false" />
  </div>
</template>

<style scoped>
.phase-heading {
  display: grid;
  gap: var(--size-1-5);
  max-width: min(100%, calc(var(--size-96) * 2));
  padding-block: var(--size-1) var(--size-3);
}

/* The chapter box's printed steps: the numbered checklist the story screen used to carry. */
.chapter-box__list {
  display: grid;
  gap: 0;
  padding: 0;
  margin: 0;
  list-style: none;
}

.chapter-box__list li {
  display: grid;
  grid-template-columns: 1.75rem minmax(0, 1fr) auto;
  gap: 0.6rem;
  align-items: center;
  min-height: 2.75rem;
  padding-block: 0.3rem;
}

.chapter-box__number {
  display: grid;
  place-items: center;
  width: 1.5rem;
  height: 1.5rem;
  font-family: var(--p-heading);
  color: var(--p-gold);
  background: color-mix(in oklch, var(--p-gold) 10%, var(--p-panel-raised));
  border-radius: 50%;
}

@media (width < 760px) {
  .chapter-box__list li {
    grid-template-columns: 2.25rem minmax(0, 1fr);
  }

  .chapter-box__list ore-chip {
    grid-column: 2;
    justify-self: start;
  }
}

/* The final briefing's questions panel. */
.game-panel {
  padding: clamp(1rem, 2vw, 1.5rem);
  background: var(--p-panel);
  border-radius: var(--rounded-md);
}

.game-panel__heading {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  padding-bottom: 0.75rem;
}

.lore-questions {
  display: grid;
  gap: 0.6rem;
  padding: 0 0 0 1.25rem;
  margin: 0;
  color: var(--p-text);
  list-style: disc;
}

.lore-questions li::marker {
  color: var(--p-gold);
}

.deck-blocking-alert {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-2) var(--size-4);
  align-items: center;
  justify-content: space-between;
  padding: var(--size-3) var(--size-4);
  background: color-mix(in oklch, var(--color-error) 10%, var(--p-panel-sunken));
  border: var(--border) solid color-mix(in oklch, var(--color-error) 40%, var(--p-line));
  border-radius: var(--rounded-md);
}

.deck-blocking-alert__header {
  display: inline-flex;
  gap: var(--size-2);
  align-items: center;
}

.deck-blocking-alert__icon {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  font-size: 1.15rem;
  color: var(--color-error);
}

.deck-blocking-alert__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-2);
  align-items: center;
}

@media (width < 760px) {
  .deck-blocking-alert {
    flex-direction: column;
    gap: var(--size-2-5);
    align-items: stretch;
  }

  .deck-blocking-alert__actions {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
    gap: var(--size-2);
    width: 100%;
  }

  .deck-blocking-alert__actions ore-button {
    width: 100%;
  }
}
</style>
