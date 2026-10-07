<script lang="ts" setup>
/**
 * A Winds series: one screen per session phase: the quest board (monster choice and die roll),
 * the preparation (draft the sheet's gear or spend the last hunt's spoils, build the deck),
 * the hunt (the rolled encounter, the fight boards and its result), and the result (the
 * score, the bounty that raises or heals, and on the fifth expedition the series ranking).
 */
import { computed, ref, watch } from 'vue';
import { notify } from '../../../app/events';
import { t, tp } from '../../../app/i18n';
import { createPhaseRoutes } from '../../../app/phase-routes';
import { challenges, notifyError, removeSubject, restartChallenge, runCommand } from '../../../app/store';
import { navigate, useMediaQuery, useReadable, useRouteParams } from '../../../app/vue-bridge';
import {
  biomeSpecialRule,
  hunterById,
  monsterById,
  trialBiomeName,
  trialEncounterTerrain,
} from '../../../content/index';
import {
  CHALLENGE_EXPEDITIONS_TOTAL,
  challengeBountyDue,
  challengeDraftedCount,challengeLadder, challengeRank, 
  challengeSeries,challengeTotal 
} from '../../../domain/challenge';
import { CHALLENGE_PHASES, canTransitionChallenge } from '../../../domain/challenge-machine';
import { challengeDeckContext, validateDeck } from '../../../domain/deck';
import { canHostSubject } from '../../../domain/host-eligibility';
import type { ChallengePhase, HunterLoadout, SubjectRef } from '../../../domain/types';
import { victoryFromChallenge } from '../../../domain/victory';
import ActionsMenu from '../../components/ActionsMenu.vue';
import AggressionMark from '../../components/AggressionMark.vue';
import ConfirmDialog from '../../components/ConfirmDialog.vue';
import ChallengeBoard from '../../components/challenge/ChallengeBoard.vue';
import ChallengeScoreDialog from '../../components/challenge/ChallengeScoreDialog.vue';
import PartyBuildPickerDialog from '../../components/deck/PartyBuildPickerDialog.vue';
import HuntControls from '../../components/hunt/HuntControls.vue';
import HuntOutcomeActions from '../../components/hunt/HuntOutcomeActions.vue';
import HuntSetup from '../../components/hunt/HuntSetup.vue';
import HuntTimer from '../../components/hunt/HuntTimer.vue';
import LinkButton from '../../components/LinkButton.vue';
import LoreEntry from '../../components/LoreEntry.vue';
import ManagementSection from '../../components/ManagementSection.vue';
import PageHeader from '../../components/PageHeader.vue';
import PhaseBackButton from '../../components/PhaseBackButton.vue';
import PhaseDock from '../../components/PhaseDock.vue';
import PhaseTracker from '../../components/PhaseTracker.vue';
import ChallengeParty from '../../components/party/ChallengeParty.vue';
import HunterRoster from '../../components/party/HunterRoster.vue';
import PartySection from '../../components/party/PartySection.vue';
import ResultBanner from '../../components/ResultBanner.vue';
import { resultArtwork } from '../../components/result-art';
import ScoreRankingLadder from '../../components/scoring/ScoreRankingLadder.vue';
import ShareDialog from '../../components/share/ShareDialog.vue';
import { type ShareSubject, victoryShareSubject } from '../../components/share/share-subject';
import { usePartyBuilds } from '../../composables/use-party-builds';
import { useSessionGuest } from '../../composables/use-session-guest';
import { useSubjectCommands } from '../../composables/use-subject-commands';
import '@vielzeug/refine/alert';
import '@vielzeug/refine/button';
import '@vielzeug/refine/button-group';
import '@vielzeug/refine/card';
import '@vielzeug/refine/chip';
import '@vielzeug/refine/stats';
import '@vielzeug/refine/text';

const params = useRouteParams();
const all = useReadable(challenges);
const run = computed(() => all.value.find((entry) => entry.id === params.value.id));
const subject = computed<SubjectRef | null>(() =>
  run.value ? { id: run.value.id, kind: 'challenge' as const } : null,
);
const series = computed(() => (run.value ? challengeSeries(run.value) : undefined));
const editable = computed(() => run.value?.status === 'running');

const command = useSubjectCommands(subject);

// The one-click party load: each hunter's newest saved build, pre-checked in the dialog.
const partyLoadOpen = ref(false);
const partyBuilds = usePartyBuilds(
  () => run.value,
  (current, member, hunter) => challengeDeckContext(current, member, hunter),
);

function applyPartyBuilds(list: HunterLoadout[]): void {
  try {
    for (const loadout of list) command('applyLoadout', loadout.hunterId, loadout);
  } catch (error) {
    notifyError('toasts.actionNotPossible', error);
  }
  partyLoadOpen.value = false;
}

// ---------------------------------------------------------------------------
// Phase routes: the shared step-route approach (see `createPhaseRoutes`)
// ---------------------------------------------------------------------------

const pendingPhase = ref<ChallengePhase | null>(null);

function requestRevisit(phase: string): void {
  if (phase !== run.value?.phase) pendingPhase.value = phase as ChallengePhase;
}

function confirmRevisit(): void {
  if (pendingPhase.value) command('revisitChallenge', pendingPhase.value);
  pendingPhase.value = null;
}

function cancelRevisit(): void {
  pendingPhase.value = null;
  bounceIfMismatched();
}

const { bounceIfMismatched, phaseHref, revisitPhases } = createPhaseRoutes<ChallengePhase>({
  canRevisit: (current, target) => canTransitionChallenge(current, { phase: target, type: 'REVISIT' }),
  currentPhase: () => run.value?.phase ?? null,
  detailRoute: 'challengeDetail',
  phaseRoute: 'challengePhase',
  phases: CHALLENGE_PHASES,
  requestRevisit,
  subjectId: () => run.value?.id ?? null,
});

const phaseLabels: Record<ChallengePhase, string> = {
  hunt: t('challenge.phaseHunt'),
  preparing: t('challenge.phasePreparation'),
  'quest-board': t('challenge.phaseQuestBoard'),
  result: t('challenge.phaseResult'),
};
const phaseEntries = computed(() => CHALLENGE_PHASES.map((id) => ({ id, label: phaseLabels[id] })));

// ---------------------------------------------------------------------------
// Expedition phase: the rolled encounter and its result
// ---------------------------------------------------------------------------

const pendingResult = ref<'victory' | 'defeat' | null>(null);
/** The shared hunt record this result resolves, opened on demand. */
const sharing = ref<ShareSubject | null>(null);

function shareVictory(): void {
  if (!run.value) return;
  const victory = victoryFromChallenge(run.value);
  if (victory) sharing.value = victoryShareSubject(victory);
}
const monster = computed(() => (run.value?.pending ? monsterById(run.value.pending.monsterId) : undefined));
/** The rolled face's printed terrain configuration, resolved through the monster's setup. */
const encounterTerrain = computed(() =>
  run.value?.pending ? trialEncounterTerrain(run.value.pending.monsterId, run.value.pending.roll) : [],
);
/** The biome board's printed name: the die face's scenario title. */
const biomeLabel = computed(() => {
  const biome = run.value?.pending?.biome;
  return biome ? trialBiomeName(biome) : '';
});
/** The encounter's lead line: the rolled face and the biome it printed, so the die's
 *  decision stays visible after the roll is committed. */
const encounterDescription = computed(() =>
  run.value?.pending
    ? t('challenge.encounterRolled', { biome: biomeLabel.value, face: run.value.pending.roll })
    : '',
);
/** The secret monster's printed "Unknown" habitat reads as missing data under the biome
 *  title: the line shows only for monsters with a known home. */
const encounterHabitat = computed(() => {
  const habitat = monster.value?.habitat ?? '';
  return habitat === 'Unknown' ? '' : habitat;
});
/** The encounter's rules: the monster's own, plus the rolled biome's board rule. */
const encounterSpecialRules = computed(() => {
  const rules = monster.value?.specialRules ?? [];
  const biomeRule = run.value?.pending ? biomeSpecialRule(run.value.pending.biome) : undefined;
  return biomeRule ? [...rules, biomeRule] : rules;
});

// ---------------------------------------------------------------------------
// Hunter selection: shared by the preparation draft and the party consoles
// ---------------------------------------------------------------------------

const selectedHunterId = ref('');
watch(
  () => run.value?.hunters.map((member) => member.hunterId),
  (hunterIds) => {
    if (hunterIds?.length && !hunterIds.includes(selectedHunterId.value)) selectedHunterId.value = hunterIds[0] ?? '';
  },
  { immediate: true },
);

/** Hunters still missing a drafted starting piece: Begin the run waits for this to reach zero. */
const draftIncomplete = computed(
  () => run.value?.hunters.filter((member) => challengeDraftedCount(member) < 3).length ?? 0,
);

// ---------------------------------------------------------------------------
// Result phase: the outcome, the bounty, the final tally
// ---------------------------------------------------------------------------

const bountyDue = computed(() => (run.value ? challengeBountyDue(run.value) : false));
const nextAggression = computed(() => Math.min(3, (run.value?.aggression ?? 1) + 1) as 1 | 2 | 3);
/** The result's headline: the defeat that ended the run, the finished victory, or the
 *  expedition won with its bounty still to take. */
const resultHeadline = computed(() => {
  const current = run.value;
  if (!current) return '';
  if (current.result === 'defeat') return t('challenge.resultLost');
  return current.status === 'finished' ? t('challenge.resultWon') : t('challenge.resultExpedition');
});
/** The result's overline: the run's end once finished, the expedition's outcome while it runs. */
const resultOverline = computed(() => (run.value?.status === 'finished' ? t('challenge.resultTitle') : t('challenge.resultSessionTitle')));
const resultArt = computed(() => resultArtwork(run.value?.result ?? null, run.value?.expeditionNumber ?? 1, run.value?.status === 'finished'));

/** The party roster drives the preparation and hunt workspaces: the ascent console's structure. */
const partyHunters = computed(() =>
  (run.value?.hunters ?? []).map((member) => hunterById(member.hunterId)).filter((entry) => entry !== undefined),
);
const partyDeckStatus = computed<Record<string, boolean>>(() => {
  const current = run.value;
  if (!current) return {};
  // Preparation reads the whole sheet: a hunter is ready only once their deck is legal and
  // their drafted starting gear is complete, so the roster's not-ready mark never clears
  // while armor or helm are still missing behind a drafted weapon.
  const preparing = current.phase === 'preparing';
  return Object.fromEntries(
    current.hunters.flatMap((member) => {
      const hunter = hunterById(member.hunterId);
      if (!hunter) return [];
      const deckValid = validateDeck(member.deckCardIds, challengeDeckContext(current, member, hunter)).valid;
      const ready = deckValid && (!preparing || challengeDraftedCount(member) === 3);
      return [[member.hunterId, ready]];
    }),
  );
});
/** What the preparation still misses, spoken where the player proceeds: the dock names it. */
const draftMissing = computed(() =>
  run.value && run.value.phase === 'preparing'
    ? run.value.hunters.filter((member) => challengeDraftedCount(member) < 3).length
    : 0,
);

// ---------------------------------------------------------------------------
// Session: guest gating for the host-only flow actions
// ---------------------------------------------------------------------------

const sessionGuest = useSessionGuest('challenge', () => run.value?.id);

/* The phone dock's commit zone reads as icons: the verb rides the aria. */
const isPhone = useMediaQuery('(width < 640px)');

/* Only the tablet portrait squares the utilities: phones carry them as the actions menu,
   every wider tier keeps the labels. */
const hideUtilityText = useMediaQuery('(width < 900px)');

/** The phone actions menu's one pick: one action, routed exactly like the desktop buttons. */
function runPrepTool(value: string): void {
  if (value === 'decks') {
    void navigate('challengeDeck', { hunterId: selectedHunterId.value ?? '', id: run.value?.id ?? '' });
  } else if (value === 'builds') {
    partyLoadOpen.value = true;
  }
}

// ---------------------------------------------------------------------------
// Result and ranking
// ---------------------------------------------------------------------------

const ranking = computed(() => (run.value ? challengeRank(challengeTotal(run.value)) : 'Rookie'));
const totalScore = computed(() => (run.value ? challengeTotal(run.value) : 0));

/** The run's kills as the banner's trophy row; a defeat keeps the single greyed emblem. */
const trophyIcons = computed(() =>
  run.value?.result === 'victory'
    ? run.value.defeatedMonsterIds.flatMap((id) => {
        const defeated = monsterById(id);
        return defeated ? [defeated.trophyIcon] : [];
      })
    : undefined,
);

function deleteRun(): void {
  if (!subject.value) return;
  removeSubject(subject.value);
  void navigate('campaigns');
}

function rename(name: string): void {
  if (!subject.value) return;
  if (runCommand('setSubjectName', subject.value, name))
    notify('campaigns.renamed', 'success', { values: { name } });
}

/** Restarts the Winds series: same party and boxes, a fresh sheet with fresh drafts. */
function restartRun(): void {
  if (!run.value) return;
  const next = restartChallenge(run.value.id);
  if (next) void navigate('challengeDetail', { id: next.id });
}
</script>

<template>
  <div class="frame stack" style="--stack-gap: var(--size-6)" v-if="run">
    <!-- A finished series (the fifth victory or the sudden-death defeat) is the result
         screen's story alone: the header stats and the wizard stepper track a live run. -->
    <template v-if="run.status !== 'finished'">
    <PageHeader :art="series?.art ?? '/backgrounds/bg_challenges.webp'" :eyebrow="series?.name ?? ''"
      :subtitle="t('challenge.subtitle')" :title="run.name">
      <template #center>
        <div class="run-header__primary">
          <section class="run-header__status" :aria-label="t('challenge.statusLabel')">
            <ore-stats size="sm" variant="plain" :label="t('challenge.aggression')">
              <AggressionMark size="sm" slot="value" :level="run.aggression" />
            </ore-stats>
            <ore-stats size="sm" variant="plain" :label="t('challenge.expeditionNumber')"
              :value="`${run.expeditionNumber} / ${CHALLENGE_EXPEDITIONS_TOTAL}`" />
            <ore-stats size="sm" variant="plain" :label="t('challenge.score')" :value="String(totalScore)" />
          </section>
        </div>
      </template>
    </PageHeader>

    <div class="wizard">
      <PhaseTracker :current="run.phase" :entries="phaseEntries" :href-of="phaseHref"
        :label="t('challenge.stepperLabel')" :revisit="revisitPhases" @revisit="requestRevisit" />
    </div>
    </template>

    <!-- Preparation: draft the sheet's gear before the first fight, or spend the last hunt's
         spoils and build the deck before each later one. -->
    <section aria-labelledby="preparation-title" class="phase-flow" style="--phase-gap: var(--size-4)"
      v-if="run.phase === 'preparing'">
      <div class="card-title">
        <ore-text as="h2" id="preparation-title" size="xs" variant="overline">{{ t('challenge.preparationTitle')
        }}</ore-text>
        <ore-text color="muted" variant="caption">{{ t(run.expeditionNumber > 1 ? 'challenge.preparationSpoilsHint' :
          'challenge.preparationHint') }}</ore-text>
      </div>
      <!-- The series' journal entry: a prologue band beside the run's actual work: the
           excerpt and its art ride the header, the full account reads on demand. The
           plate art is the right-sized variant; the band never shows the full render.
           It rides every preparation, like the ascent's chapter band: the series' story
           frames each expedition's setup. -->
      <ore-card class="lore-band" padding="none">
        <LoreEntry :art="series?.artPlate ?? series?.art" :lore="series?.lore ?? ''" :overline="series?.name ?? ''" />
      </ore-card>

      <PartySection heading-id="run-preparation-party-title"
        :subtitle="t(run.expeditionNumber > 1 ? 'challenge.rewardPartyHint' : 'challenge.preparationPartyHint')"
        :title="t('challenge.preparationPartyTitle')">
        <div class="party-workspace">
          <HunterRoster :deck-status="partyDeckStatus" :hunters="partyHunters"
            :invalid-label="t('challenge.hunterNotReady')" :selected-id="selectedHunterId"
            @select="selectedHunterId = $event" />
          <ChallengeParty :run-id="run.id" :selected-hunter-id="selectedHunterId" :show-profile="true" />
        </div>
      </PartySection>

      <PhaseDock>
        <!-- No back flank: the roll is forward-only, so the quest board cannot be
             revisited from the preparation — the expedition's target is fixed. -->
        <!-- The preparation utilities, the campaign's own cluster: phones carry them as
             the actions menu, one pick one action; wider tiers the bordered group, the
             tablet portrait squaring them to their glyphs. The series has no forge:
             gear follows the drafts. -->
        <ActionsMenu v-if="isPhone" @select="runPrepTool">
          <ore-menu-item value="decks">
            <ore-icon name="layers" slot="icon" />
            {{ t('challenge.openDeck') }}
          </ore-menu-item>
          <ore-menu-item value="builds">
            <ore-icon name="library" slot="icon" />
            {{ t('deck.loadBuilds') }}
          </ore-menu-item>
        </ActionsMenu>
        <ore-button-group attached variant="bordered" v-else>
          <LinkButton to="challengeDeck" :icon-only="hideUtilityText" :label="t('challenge.openDeck')"
            :params="{ hunterId: selectedHunterId ?? '', id: run.id }">
            <ore-icon name="layers" :slot="hideUtilityText ? null : 'prefix'" />
            <template v-if="!hideUtilityText">{{ t('challenge.openDeck') }}</template>
          </LinkButton>
          <ore-button :icon-only="hideUtilityText" :label="t('deck.loadBuilds')" @click="partyLoadOpen = true">
            <ore-icon name="library" :slot="hideUtilityText ? null : 'prefix'" />
            <template v-if="!hideUtilityText">{{ t('deck.loadBuilds') }}</template>
          </ore-button>
        </ore-button-group>
        <ore-button color="secondary" variant="solid"
          :disabled="run.hunters.length === 0 || draftIncomplete > 0 || sessionGuest" :icon-only="isPhone"
          :label="t('challenge.finishPreparation')" :rounded="isPhone ? 'full' : undefined" @click="command('finishChallengePreparation')">
          <ore-icon name="swords" :slot="isPhone ? null : 'prefix'" />
          <template v-if="!isPhone">{{ t('challenge.finishPreparation') }}</template>
        </ore-button>
      </PhaseDock>

      <!-- The blocked gate speaks after the bar: the alert under the dock names the hunters
           and the slots the draft still misses, without wrapping the bar's own layout. -->
      <ore-alert color="warning" role="status" size="sm" variant="flat" v-if="draftMissing > 0">
        {{ tp('challenge.draftMissing', draftMissing, { count: draftMissing }) }}
      </ore-alert>
    </section>

    <!-- Quest board: the die roll and the monster choice. -->
    <section aria-labelledby="quest-board-title" class="stack" style="--stack-gap: var(--size-4)"
      v-else-if="run.phase === 'quest-board'">
      <div class="card-title">
        <ore-text as="h2" id="quest-board-title" size="xs" variant="overline">
          {{ t('challenge.expeditionTitle', { number: run.expeditionNumber }) }}
        </ore-text>
        <ore-text color="muted" variant="caption">{{ t('challenge.questBoardHint') }}</ore-text>
      </div>

      <!-- The roll is the host's call: forward-only, it fixes the expedition's target. -->
      <ChallengeBoard :locked="sessionGuest" :run-id="run.id" />
    </section>

    <!-- Hunt: the rolled encounter, the party console and its result. -->
    <section aria-labelledby="hunt-title" class="phase-flow" style="--phase-gap: var(--size-4)"
      v-else-if="run.phase === 'hunt'">
      <div class="card-title">
        <ore-text as="h2" id="hunt-title" size="xs" variant="overline">
          {{ t('challenge.expeditionTitle', { number: run.expeditionNumber }) }}
        </ore-text>
        <ore-text color="muted" variant="caption">{{ t('challenge.huntHint') }}</ore-text>
      </div>

      <section class="hunt-reference" :aria-label="t('challenge.huntReference')">
        <HuntSetup :description="encounterDescription" :eyebrow="t('challenge.encounterEyebrow')"
          :habitat="encounterHabitat" :monster-icon="monster?.trophyIcon ?? ''"
          :monster-meta="monster ? { aggression: run.aggression, element: monster.element, weaknesses: monster.weaknesses } : undefined"
          :monster-name="monster?.name ?? ''" :special-rules="encounterSpecialRules" :terrain="encounterTerrain"
          :title="biomeLabel">
        </HuntSetup>
      </section>

      <!-- The party console rides under the hunt reference: it is the fight's working
             surface (wounds, potions, gear) consulted mid-hunt; recording the result closes
             the phase after it. -->
      <PartySection heading-id="run-hunt-party-title" :subtitle="t('challenge.partyConsumeHint')"
        :title="t('challenge.huntPartyTitle')">
        <div class="party-workspace">
          <HunterRoster :deck-status="partyDeckStatus" :hunters="partyHunters" :selected-id="selectedHunterId"
            @select="selectedHunterId = $event" />
          <ChallengeParty :run-id="run.id" :selected-hunter-id="selectedHunterId" :show-profile="false" />
        </div>
      </PartySection>

      <!-- A finished run keeps the dock for its boards: the timer froze with the outcome
             recorded, so the controls reduce to the boards pair. -->
      <PhaseDock>
        <template v-if="editable" #back>
          <PhaseBackButton :label="t('dashboard.backToPreparation')" @back="requestRevisit('preparing')" />
        </template>
        <template v-if="editable" #center>
          <HuntTimer :timer="run.huntTimer" @pause="command('pauseHuntTimer')" @reset="command('resetHuntTimer')"
            @start="command('startHuntTimer')" />
        </template>
        <HuntControls hunter-board-to="challengeHunterBoard" monster-board-to="challengeMonsterBoard"
          :hunter-board-params="{ hunterId: run.hunters[0]?.hunterId ?? '', id: run.id }"
          :monster-board-params="{ id: run.id }" :show-hunter-board="run.hunters.length > 0" />
        <HuntOutcomeActions v-if="editable" :defeat-label="t('huntOutcome.recordDefeat')"
          :victory-label="t('huntOutcome.recordVictory')" @defeat="pendingResult = 'defeat'"
          @victory="pendingResult = 'victory'" />
      </PhaseDock>
    </section>

    <!-- Result: the expedition's outcome, the bounty that decides the next session's
         stakes, and: on the fifth expedition or a defeat: the final tally and ranking. -->
    <section aria-labelledby="result-title" class="phase-flow" style="--phase-gap: var(--size-4)" v-else>
      <div class="result">
        <ResultBanner title-id="result-title" :defeated="run.result === 'defeat'"
          :emblem-icon="monsterById(run.defeatedMonsterIds.at(-1) ?? '')?.trophyIcon"
          :final="run.status === 'finished' && run.result === 'victory'" :image="resultArt"
          :overline="resultOverline" :score="totalScore" :title="resultHeadline"
          :trophy-icons="trophyIcons" />
        <div class="result__body">
          <ore-text color="muted" variant="caption">{{ t('challenge.resultHint') }}</ore-text>
          <div class="result__ranking" v-if="ranking">
            <ore-text variant="overline">{{ ranking }}</ore-text>
          </div>
          <ScoreRankingLadder :rankings="challengeLadder" :total="totalScore" />
        </div>
      </div>

      <!-- The bounty: only between expeditions, on a won session the run has not finished.
           Raising lifts the level and every piece; keeping heals the wounds. -->
      <section aria-labelledby="run-bounty-title" class="bounty-block" v-if="run.status === 'running'">
        <div class="bounty-block__heading">
          <ore-text as="h3" id="run-bounty-title" size="xs" variant="heading">
            {{ t('challenge.bountyTitle') }}
          </ore-text>
          <ore-text color="muted" size="xs">{{ t('challenge.bountyHint') }}</ore-text>
        </div>
        <div class="bounty-block__choices" v-if="bountyDue">
          <button class="bounty-block__card" type="button" :disabled="run.aggression >= 3"
            @click="command('chooseChallengeBounty', 'raise')">
            <AggressionMark :level="nextAggression" />
            <ore-text size="sm" variant="heading">{{ t('challenge.bountyRaiseTitle') }}</ore-text>
            <ore-text color="muted" size="xs">{{ t('challenge.bountyRaiseHint') }}</ore-text>
          </button>
          <button class="bounty-block__card" type="button" @click="command('chooseChallengeBounty', 'keep')">
            <AggressionMark :level="run.aggression" />
            <ore-text size="sm" variant="heading">{{ t('challenge.bountyKeepTitle') }}</ore-text>
            <ore-text color="muted" size="xs">{{ t('challenge.bountyKeepHint') }}</ore-text>
          </button>
        </div>
        <div class="bounty-block__chosen" v-else-if="run.bounty">
          <AggressionMark :level="run.aggression" />
          <ore-text color="muted" size="sm">
            {{ t(run.bounty === 'raise' ? 'challenge.bountyRaiseHint' : 'challenge.bountyKeepHint') }}
          </ore-text>
        </div>
      </section>

      <PhaseDock v-if="run.status === 'running'">
        <ore-button
          color="secondary"
          variant="bordered"
          v-if="run.result === 'victory'"
          :icon-only="isPhone"
          :label="t('victory.share')"
          :rounded="isPhone ? 'full' : undefined"
          @click="shareVictory">
          <ore-icon name="share-2" v-if="isPhone" />
          <template v-if="!isPhone">{{ t('victory.share') }}</template>
        </ore-button>
        <ore-button color="primary" variant="solid" :disabled="bountyDue"
          :icon-only="isPhone" :label="t('challenge.nextExpedition')" :rounded="isPhone ? 'full' : undefined" @click="command('advanceChallengeSession')">
          <ore-icon name="chevron-right" v-if="isPhone" />
          <template v-if="!isPhone">{{ t('challenge.nextExpedition') }}</template>
        </ore-button>
      </PhaseDock>
      <PhaseDock v-else-if="run.result === 'victory'">
        <ore-button
          color="secondary"
          variant="bordered"
          :icon-only="isPhone"
          :label="t('victory.share')"
          :rounded="isPhone ? 'full' : undefined"
          @click="shareVictory">
          <ore-icon name="share-2" v-if="isPhone" />
          <template v-if="!isPhone">{{ t('victory.share') }}</template>
        </ore-button>
      </PhaseDock>
    </section>

    <ManagementSection :delete-body="t('challenge.deleteBody', { name: run.name })"
      :delete-label="t('challenge.deleteRun')" :delete-title="t('challenge.deleteTitle')" :guest="sessionGuest"
      :hostable="canHostSubject(run)" :name="run.name" :name-label="t('challengeCreate.nameLabel')"
      :rename-title="t('challenge.renameTitle')" :subject="{ id: run.id, kind: 'challenge' }" @remove="deleteRun"
      @rename="rename">
      <template #primary>
        <ore-button color="primary" size="md" variant="solid" @click="restartRun">
          <ore-icon name="rotate-ccw" slot="prefix" />
          {{ t(run.result === 'defeat' ? 'challenge.retryRun' : run.status === 'finished' ? 'challenge.restartRun' :
            'challenge.startFreshRun') }}
        </ore-button>
      </template>
    </ManagementSection>

    <!-- The fight's two endings: a defeat confirms plainly and ends the run; a victory
         confirms through the score sheet, recording the result and its tally together. -->
    <ChallengeScoreDialog :open="pendingResult === 'victory'" :run-id="run.id" @close="pendingResult = null" />

    <PartyBuildPickerDialog :open="partyLoadOpen" :rows="partyBuilds" @apply="applyPartyBuilds"
      @close="partyLoadOpen = false" />

    <ShareDialog :subject="sharing" @close="sharing = null" />

    <ConfirmDialog danger :confirm-label="t('challenge.confirmDefeat')" :open="pendingResult === 'defeat'"
      :title="t('challenge.confirmDefeatTitle')" @cancel="pendingResult = null" @confirm="
        command('recordChallengeResult', 'defeat', []);
      pendingResult = null;
      ">
      <ore-text>
        {{ t('challenge.confirmResultBody', { monster: monster?.name ?? '', result: 'defeat' }) }}
      </ore-text>
    </ConfirmDialog>

    <ConfirmDialog :confirm-label="t('common.confirm')" :open="pendingPhase !== null"
      :title="t('challenge.revisitTitle')" @cancel="cancelRevisit" @confirm="confirmRevisit">
      <ore-text>{{ t('challenge.revisitBody', { phase: phaseLabels[pendingPhase ?? 'preparing'] }) }}</ore-text>
    </ConfirmDialog>
  </div>
</template>

<style scoped>
.wizard {
  margin-bottom: var(--size-2);
}

/* The phase titles' hints read as their captions: stacked below the overline, not beside it. */
section[aria-labelledby='preparation-title'] .card-title,
section[aria-labelledby='quest-board-title'] .card-title,
section[aria-labelledby='hunt-title'] .card-title {
  flex-direction: column;
  gap: var(--size-1);
  align-items: flex-start;
  border-bottom: 0;
}

/* The header's centered column: the session row over the status row, the same shape the
   campaign, expedition and ascent headers keep. */
.run-header__primary {
  display: flex;
  flex-direction: column;
  gap: var(--size-4);
  align-items: center;
  justify-content: center;
  min-width: 0;
}

/* The header's centered status row: the same shape the campaign and expedition headers keep. */
.run-header__status {
  display: grid;
  grid-template-columns: repeat(3, minmax(var(--size-20), 1fr));
  gap: var(--size-2);
  min-width: var(--size-72);
}

.run-header__status ore-stats {
  --stats-bg: transparent;
  --stats-padding: 0 var(--size-2);
  --stats-value-size: var(--text-xl);
}

@media (width < 640px) {
  .run-header__primary {
    gap: var(--size-2);
    width: 100%;
    min-width: 0;
  }

  /* Phones keep all three stats on one row: the cells shrink and ellipsize, never wrap;
     the padding step buys the longest labels their full width. */
  .run-header__status {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    width: 100%;
    min-width: 0;
  }

  .run-header__status ore-stats {
    --stats-padding: 0 var(--size-1);
  }
}

.result__hint {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--p-text-muted);
}

.hunt-reference {
  min-width: 0;
}

.bounty-block {
  display: grid;
  gap: var(--size-3);
  padding: var(--size-4);
  background: var(--p-panel-sunken);
  border-radius: var(--rounded-sm);
}

.bounty-block__heading {
  display: grid;
  gap: var(--size-1);
}

.bounty-block__choices {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  gap: var(--size-3);
}

.bounty-block__card {
  display: grid;
  gap: var(--size-1);
  justify-items: start;
  padding: var(--size-3);
  text-align: left;
  cursor: pointer;
  background: var(--p-panel);
  border: var(--border) solid var(--p-line);
  border-radius: var(--rounded-sm);
}

.bounty-block__card:disabled {
  cursor: default;
  opacity: 0.5;
}

.bounty-block__card:not(:disabled):hover {
  border-color: var(--p-gold-dim);
}

.bounty-block__chosen {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-3);
  align-items: center;
}

.reward-party {
  display: grid;
  gap: var(--size-3);
}

.result {
  display: grid;
  gap: var(--size-4);
}

.result__body {
  display: grid;
  gap: var(--size-4);
  padding-top: var(--size-4);
  border-top: var(--border) solid var(--p-line);
}
</style>
