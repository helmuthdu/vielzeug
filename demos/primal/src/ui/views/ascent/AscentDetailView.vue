<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { asset } from '../../../app/assets';
import { notify } from '../../../app/events';
import { t, tp } from '../../../app/i18n';
import { createPhaseRoutes } from '../../../app/phase-routes';
import type { SubjectCommandArgs, SubjectCommandName } from '../../../app/store';
import { ascents, duplicateAscent, notifyError, removeSubject, runCommand, startAscent } from '../../../app/store';
import { navigate, useMediaQuery, useReadable, useRouteParams } from '../../../app/vue-bridge';
import { ASCENT_CHAPTERS, ASCENT_EPILOGUE } from '../../../content/ascent';
import { hunterById, monsterById, TRIAL_SCORE_LEVELS } from '../../../content/index';
import {
  ASCENT_CHAPTERS_TOTAL,
  ASCENT_PARTY_MIN,
  ascentChapter,
  ascentScenario,
} from '../../../domain/ascent';
import { ASCENT_PHASES, canTransitionAscent } from '../../../domain/ascent-machine';
import { ascentDeckContext, validateDeck } from '../../../domain/deck';
import { canHostSubject } from '../../../domain/host-eligibility';
import { partyMaxFor } from '../../../domain/party';
import { ascentSummitLadder, ascentSummitRank, ascentTotal } from '../../../domain/scoring';
import { type SeriesSheet, seriesSheet } from '../../../domain/trial-score';
import type { AscentPhase, HunterLoadout, SubjectRef } from '../../../domain/types';
import { victoryFromAscent } from '../../../domain/victory';
import ActionsMenu from '../../components/ActionsMenu.vue';
import AscentEncounterBoard from '../../components/ascent/AscentEncounterBoard.vue';
import ConfirmDialog from '../../components/ConfirmDialog.vue';
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
import AscentParty from '../../components/party/AscentParty.vue';
import HunterRoster from '../../components/party/HunterRoster.vue';
import HunterSelect from '../../components/party/HunterSelect.vue';
import PartySection from '../../components/party/PartySection.vue';
import ResultBanner from '../../components/ResultBanner.vue';
import { resultArtwork } from '../../components/result-art';
import ScoreDialog from '../../components/scoring/ScoreDialog.vue';
import ScoreRankingLadder from '../../components/scoring/ScoreRankingLadder.vue';
import ShareDialog from '../../components/share/ShareDialog.vue';
import { type ShareSubject, victoryShareSubject } from '../../components/share/share-subject';
import { usePartyBuilds } from '../../composables/use-party-builds';
import { useSessionGuest } from '../../composables/use-session-guest';
import '@vielzeug/refine/alert';
import '@vielzeug/refine/button';
import '@vielzeug/refine/button-group';
import '@vielzeug/refine/card';
import '@vielzeug/refine/chip';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/stats';
import '@vielzeug/refine/text';

/**
 * Mount Havoc: the ascent. One screen per chapter phase: the party preparation (the chapter's
 * story as a journal band over gear, potions, decks, skill steps, wounds), the drawn random
 * encounter, the hunt boards, and the result. Sudden death: a defeat ends the run; three wins
 * reach the summit.
 */
const params = useRouteParams();
const all = useReadable(ascents);
const ascent = computed(() => all.value.find((entry) => entry.id === params.value.id));
const subject = computed<SubjectRef | null>(
  () => (ascent.value ? { id: ascent.value.id, kind: 'ascent' as const } : null),
);
const chapter = computed(() => (ascent.value ? ascentChapter(ascent.value) : undefined));
const monster = computed(() => (ascent.value?.pending ? monsterById(ascent.value.pending.monsterId) : undefined));
const scenario = computed(() => (ascent.value ? ascentScenario(ascent.value) : undefined));
const finished = computed(() => ascent.value?.status === 'finished');
const selectedHunterId = ref('');
const partyHunters = computed(() => ascent.value?.hunters.flatMap((member) => hunterById(member.hunterId) ?? []) ?? []);
const partyDeckStatus = computed<Record<string, boolean>>(() => {
  const current = ascent.value;
  if (!current) return {};
  return Object.fromEntries(
    current.hunters.flatMap((member) => {
      const hunter = hunterById(member.hunterId);
      if (!hunter) return [];
      const context = ascentDeckContext(current, member, hunter);
      return [[member.hunterId, validateDeck(member.deckCardIds, context).valid]];
    }),
  );
});
watch(
  () => ascent.value?.hunters.map((member) => member.hunterId),
  (hunterIds) => {
    if (hunterIds?.length && !hunterIds.includes(selectedHunterId.value)) selectedHunterId.value = hunterIds[0] ?? '';
  },
  { immediate: true },
);
const phaseEntries = computed(() => ASCENT_PHASES.map((id) => ({ id, label: phaseLabel(id) })));

function command<K extends SubjectCommandName>(name: K, ...args: SubjectCommandArgs<K>): void {
  if (!subject.value) return;
  runCommand(name, subject.value, ...args);
}

// The one-click party load: each hunter's newest saved build, pre-checked in the dialog.
const partyLoadOpen = ref(false);
const partyBuilds = usePartyBuilds(
  () => ascent.value,
  (current, member, hunter) => ascentDeckContext(current, member, hunter),
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

/** A revisit the URL or a control asked for: confirmed through the dialog before it runs. */
const pendingPhase = ref<AscentPhase | null>(null);

function requestRevisit(phase: AscentPhase): void {
  if (phase !== ascent.value?.phase) pendingPhase.value = phase;
}

function confirmRevisit(): void {
  if (pendingPhase.value) command('revisitAscent', pendingPhase.value);
  pendingPhase.value = null;
}

function cancelRevisit(): void {
  pendingPhase.value = null;
  bounceIfMismatched();
}

const { bounceIfMismatched, followPhase, phaseHref, revisitPhases } = createPhaseRoutes<AscentPhase>({
  canRevisit: (current, target) => canTransitionAscent(current, { phase: target, type: 'REVISIT' }),
  currentPhase: () => ascent.value?.phase ?? null,
  detailRoute: 'ascentDetail',
  phaseRoute: 'ascentPhase',
  phases: ASCENT_PHASES,
  requestRevisit,
  subjectId: () => ascent.value?.id ?? null,
});

// ---------------------------------------------------------------------------
// Story: the chapter's journal band over the party work
// ---------------------------------------------------------------------------

const storyArt = computed(() => chapter.value?.art ?? ASCENT_CHAPTERS[0]?.art ?? '');
const chapterLore = computed(() => chapter.value?.paragraphs.join(' ') ?? '');

/** The climb so far: the trophies and wounds the party carries into this chapter. */
const climbTrophies = computed(
  () => ascent.value?.defeatedMonsterIds.flatMap((id) => monsterById(id) ?? []) ?? [],
);
const climbWounds = computed(
  () => ascent.value?.hunters.reduce((total, member) => total + member.woundCount, 0) ?? 0,
);

// ---------------------------------------------------------------------------
// Preparation: party editing
// ---------------------------------------------------------------------------

const editingParty = ref(false);
const partyDraft = ref<string[]>([]);
const partyMax = computed(() => partyMaxFor(ascent.value?.expansionIds ?? []));

const partyDraftValid = computed(
  () => partyDraft.value.length >= ASCENT_PARTY_MIN && partyDraft.value.length <= partyMax.value,
);

function openPartyEdit(): void {
  partyDraft.value = (ascent.value?.hunters ?? []).map((member) => member.hunterId);
  editingParty.value = true;
}

function confirmPartyEdit(): void {
  if (!partyDraftValid.value) return;
  command('setSubjectParty', partyDraft.value);
  editingParty.value = false;
}

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------

const pendingResult = ref<'defeat' | 'victory' | null>(null);
/** The shared hunt record this result resolves, opened on demand. */
const sharing = ref<ShareSubject | null>(null);

function shareVictory(): void {
  if (!ascent.value) return;
  const victory = victoryFromAscent(ascent.value);
  if (victory) sharing.value = victoryShareSubject(victory);
}
const summitReached = computed(() => finished.value && ascent.value?.result === 'victory');
/** The climb's running score: the chapters' recorded worksheets added up, the Winds' own
 *  running total grammar. */
const scoreTotal = computed(() => (ascent.value ? ascentTotal(ascent.value) : 0));
/** The level the climb reaches on the summit ladder. */
const summitRank = computed(() => ascentSummitRank(scoreTotal.value));
/** The chapter's score sheet: the standard worksheet's level the climb has reached — the
 *  same bases and modifier rows the Winds fill at their aggression. While the climb plays
 *  the Nightmare variant, the stance row opens marked. */
const scoreLevel = computed(() => TRIAL_SCORE_LEVELS[ascent.value?.chapter ?? 1]);
/** The sheet's preview base: the climb's standing sum plus this chapter's own base, so the
 * live total previews the summit sum the ladder will judge; the recorded sheet keeps the
 * chapter's own total. */
const sheetBase = computed(() => scoreTotal.value + (scoreLevel.value?.base ?? 0));
/** The chapter's score sheet as the dialog opens it: capped rows, the stance row
 * pre-marked while the climb plays the Nightmare variant. */
const sheet = computed<SeriesSheet>(() => {
  const current = ascent.value;
  if (!current) return { answers: [], rows: [] };
  return seriesSheet(scoreLevel.value, {
    monsterId: monster.value?.id,
    nightmare: current.nightmareVariant,
    partySize: current.hunters.length,
  });
});
const resultArt = computed(() => resultArtwork(ascent.value?.result ?? null, ascent.value?.chapter ?? 1, summitReached.value));
/** The summit's journal entry: the run's closing account, read as a band on the result screen. */
const epilogueLore = ASCENT_EPILOGUE.join(' ');

function confirmDefeat(): void {
  command('recordAscentHunt', 'defeat', []);
  pendingResult.value = null;
}

/** Confirms the victory with its score sheet: the answers record together with the result. */
function confirmVictory(answers: number[]): void {
  command('recordAscentHunt', 'victory', answers);
  pendingResult.value = null;
}

function advance(): void {
  command('advanceAscent');
}

// ---------------------------------------------------------------------------
// Session & management
// ---------------------------------------------------------------------------

/** Guest gating: the host-only flow actions disable while this tab joined the session. */
const sessionGuest = useSessionGuest('ascent', () => ascent.value?.id);

/* The phone dock's commit zone reads as icons: the verb rides the aria. */
const isPhone = useMediaQuery('(width < 640px)');

/* Only the tablet portrait squares the utilities: phones carry them as the actions menu,
   every wider tier keeps the labels. */
const hideUtilityText = useMediaQuery('(width < 900px)');

/** The phone actions menu's one pick: one action, routed exactly like the desktop buttons. */
function runPrepTool(value: string): void {
  if (value === 'decks') {
    void navigate('ascentDeck', { hunterId: selectedHunterId.value ?? '', id: ascent.value?.id ?? '' });
  } else if (value === 'builds') {
    partyLoadOpen.value = true;
  }
}

function remove(): void {
  if (ascent.value) removeSubject({ id: ascent.value.id, kind: 'ascent' });
  void navigate('home');
}

function rename(name: string): void {
  if (!subject.value) return;
  if (runCommand('setSubjectName', subject.value, name))
    notify('toasts.ascentRenamed', 'success', { values: { name } });
}

function duplicate(): void {
  if (!ascent.value) return;
  const next = duplicateAscent(ascent.value.id);
  if (next) void navigate('ascentDetail', { id: next.id });
}

function restart(): void {
  if (!ascent.value) return;
  const next = startAscent('', ascent.value.hunters.map((member) => member.hunterId), ascent.value.expansionIds, ascent.value.nightmareVariant);
  void navigate('ascentDetail', { id: next.id });
}

const phaseLabel = (phase: AscentPhase) => t(`ascentDetail.phase.${phase}`);
</script>

<template>
  <div class="frame stack ascent" style="--stack-gap: 1.5rem" v-if="ascent && chapter">
    <!-- A finished climb (summit or sudden death) tells its whole story on the result
         screen: the header stats and the phase stepper narrate a run still moving. -->
    <template v-if="!finished">
    <PageHeader :art="storyArt" :eyebrow="t('ascentDetail.eyebrow', { chapter: ascent.chapter, name: ascent.name })"
      :subtitle="chapter.title" :title="t('ascentDetail.title')">
      <template #center>
        <div class="ascent-header__primary">
          <!-- The climb's standing: the same stats grammar the campaign and challenge headers wear. -->
          <section class="ascent-header__status" :aria-label="t('ascentDetail.statusLabel')">
            <ore-stats size="sm" variant="plain" :label="t('ascentDetail.statChapter')"
              :value="`${ascent.chapter} / ${ASCENT_CHAPTERS_TOTAL}`" />
            <ore-stats size="sm" variant="plain" :label="t('ascentDetail.statTrophies')"
              :value="String(climbTrophies.length)" />
            <ore-stats size="sm" variant="plain" :label="t('ascentDetail.statWounds')" :value="String(climbWounds)" />
          </section>
        </div>
      </template>
    </PageHeader>

    <PhaseTracker :current="ascent.phase" :entries="phaseEntries" :follow="followPhase" :href-of="phaseHref"
      :revisit="revisitPhases" />
    </template>

    <ore-alert color="warning" size="sm" variant="flat" v-if="finished && ascent.result === 'defeat'">
      <ore-icon name="skull" slot="icon" />
      {{ t('ascentDetail.suddenDeath', { chapter: ascent.chapter }) }}
    </ore-alert>

    <!-- Preparation: the chapter's story as a journal band over the party work. -->
    <div class="phase-flow" style="--phase-gap: 1.5rem" v-if="ascent.phase === 'preparing'">
      <div class="card-title">
        <ore-text as="h2" size="xs" variant="overline">{{ t('ascentDetail.chapterLabel') }}</ore-text>
        <ore-text color="muted" variant="caption">{{ t('ascentDetail.chapterHint') }}</ore-text>
      </div>

      <ore-card class="lore-band" padding="none">
        <LoreEntry :art="storyArt" :excerpt="chapter.summary" :lore="chapterLore"
          :overline="t('ascentDetail.chapterOf', { chapter: ascent.chapter, total: 3 })" />
      </ore-card>

      <!-- The climb so far: what the party carries into the chapter. -->
      <div class="ascent-story__brief" v-if="ascent.chapter > 1">
        <ore-text variant="overline">{{ t('ascentDetail.recapLabel') }}</ore-text>
        <div class="cluster ascent-story__chips">
          <ore-chip size="sm" variant="bordered" v-for="monster in climbTrophies" :key="monster.id">
            <img alt="" slot="icon" :src="asset(monster.trophyIcon)" />
            {{ monster.name }}
          </ore-chip>
          <ore-chip size="sm" variant="bordered" v-if="climbWounds > 0">
            {{ tp('ascentDetail.recapWounds', climbWounds) }}
          </ore-chip>
        </div>
      </div>

      <PartySection heading-id="ascent-party-title"
        :subtitle="t('ascentDetail.partyLevelHint', { level: ascent.chapter })" :title="t('ascentDetail.partyTitle')">
        <template #actions>
          <ore-button size="sm" variant="bordered" :disabled="sessionGuest" @click="openPartyEdit">
            <ore-icon name="users" slot="prefix" />
            {{ t('ascentDetail.editParty') }}
          </ore-button>
        </template>
        <div class="party-workspace">
          <HunterRoster :deck-status="partyDeckStatus" :hunters="partyHunters" :selected-id="selectedHunterId"
            @select="selectedHunterId = $event" />
          <AscentParty :ascent-id="ascent.id" :selected-hunter-id="selectedHunterId" :show-profile="true" />
        </div>
      </PartySection>

      <PhaseDock>
        <!-- No back flank: the preparation is the chapter's start, the campaign's final
             battle grammar. -->
        <!-- The preparation utilities, the campaign's own cluster: phones carry them as
             the actions menu, one pick one action; wider tiers the bordered group, the
             tablet portrait squaring them to their glyphs. Ascents have no forge: gear
             follows the chapter. -->
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
          <LinkButton to="ascentDeck" :icon-only="hideUtilityText" :label="t('challenge.openDeck')"
            :params="{ hunterId: selectedHunterId ?? '', id: ascent.id }">
            <ore-icon name="layers" :slot="hideUtilityText ? null : 'prefix'" />
            <template v-if="!hideUtilityText">{{ t('challenge.openDeck') }}</template>
          </LinkButton>
          <ore-button :icon-only="hideUtilityText" :label="t('deck.loadBuilds')" @click="partyLoadOpen = true">
            <ore-icon name="library" :slot="hideUtilityText ? null : 'prefix'" />
            <template v-if="!hideUtilityText">{{ t('deck.loadBuilds') }}</template>
          </ore-button>
        </ore-button-group>
        <ore-button color="secondary" variant="solid" :disabled="sessionGuest" :icon-only="isPhone"
          :label="t('ascentDetail.drawEncounter')" :rounded="isPhone ? 'full' : undefined" @click="command('revealAscentEncounter')">
          <ore-icon name="dices" :slot="isPhone ? null : 'prefix'" />
          <template v-if="!isPhone">{{ t('ascentDetail.drawEncounter') }}</template>
        </ore-button>
      </PhaseDock>
    </div>

    <!-- Encounter: the quest board's own grammar, the battlefield area in the list's
         place — the chapter tools over the terrain, the drawn monster's briefing beside. -->
    <AscentEncounterBoard v-if="ascent.phase === 'encounter'" :ascent-id="ascent.id" 
      @back="requestRevisit('preparing')" />

    <!-- Hunt -->
    <div class="phase-flow" style="--phase-gap: 1.5rem" v-if="ascent.phase === 'hunt' && monster && scenario">
      <section class="hunt-reference" :aria-label="t('ascentDetail.huntReference')">
        <HuntSetup :description="scenario.objective"
          :eyebrow="t('ascentDetail.huntEyebrow', { chapter: ascent.chapter, monster: monster.name })"
          :habitat="monster.habitat" :monster-icon="monster.trophyIcon"
          :monster-meta="{ element: monster.element, weaknesses: monster.weaknesses }" :monster-name="monster.name"
          :special-rules="[...(scenario.specialRules ?? []), ...(monster.specialRules ?? [])]"
          :terrain="[...scenario.terrain, ...(chapter.terrain ?? [])]" :title="scenario.name">
        </HuntSetup>
      </section>

      <PartySection heading-id="ascent-hunt-party-title" :subtitle="t('ascentDetail.partyConsumeHint')"
        :title="t('ascentDetail.partyTitle')">
        <div class="party-workspace">
          <HunterRoster :deck-status="partyDeckStatus" :hunters="partyHunters" :selected-id="selectedHunterId"
            @select="selectedHunterId = $event" />
          <AscentParty :ascent-id="ascent.id" :selected-hunter-id="selectedHunterId" :show-profile="false" />
        </div>
      </PartySection>

      <!-- A finished chapter keeps the dock for its boards: the timer froze with the outcome
           recorded, so the controls reduce to the boards pair. -->
      <PhaseDock>
        <template #back>
          <PhaseBackButton :label="t('ascentDetail.backToPreparation')" @back="requestRevisit('preparing')" />
        </template>
        <template v-if="!finished" #center>
          <HuntTimer :timer="ascent.huntTimer" @pause="command('pauseHuntTimer')" @reset="command('resetHuntTimer')"
            @start="command('startHuntTimer')" />
        </template>
        <HuntControls hunter-board-to="ascentHunterBoard" monster-board-to="ascentMonsterBoard"
          :hunter-board-params="{ hunterId: ascent.hunters[0]?.hunterId ?? '', id: ascent.id }"
          :monster-board-params="{ id: ascent.id }" :show-hunter-board="ascent.hunters.length > 0" />
        <HuntOutcomeActions v-if="!finished" :defeat-label="t('huntOutcome.recordDefeat')"
          :victory-label="t('huntOutcome.recordVictory')" @defeat="pendingResult = 'defeat'"
          @victory="pendingResult = 'victory'" />
      </PhaseDock>
    </div>

    <!-- Result -->
    <div class="phase-flow" style="--phase-gap: 1.5rem" v-if="ascent.phase === 'result'">
      <ResultBanner :defeated="ascent.result === 'defeat'" :emblem-icon="monster?.trophyIcon" :final="summitReached"
        :image="resultArt" :overline="t('ascentDetail.outcomeEyebrow', { chapter: ascent.chapter })"
        :score="scoreTotal"
        :title="ascent.result === 'victory'
          ? summitReached
            ? t('ascentDetail.summitTitle')
            : t('ascentDetail.victoryTitle')
          : t('ascentDetail.defeatTitle')"
        :trophy-icons="ascent.result === 'victory' ? climbTrophies.map((defeated) => defeated.trophyIcon) : undefined">
        <template v-if="ascent.result === 'defeat'" #lead >{{ t('ascentDetail.defeatBody') }}</template>
      </ResultBanner>

      <!-- The summit's closing account: the same journal band the chapter stories wear. -->
      <ore-card class="lore-band" padding="none" v-if="summitReached">
        <LoreEntry :art="storyArt" :lore="epilogueLore" :overline="t('ascentDetail.epilogueTitle')" />
      </ore-card>

      <!-- The climb's running comparison ends the page: the hint, the reached level and the
           shared rank ladder, read after the story it settles. -->
      <div class="ascent-result__ranking">
        <ore-text color="muted" variant="caption">{{ t('ascentDetail.scoreHint') }}</ore-text>
        <ore-text variant="overline">{{ summitRank }}</ore-text>
        <ScoreRankingLadder :rankings="ascentSummitLadder" :total="scoreTotal" />
      </div>

      <PhaseDock v-if="!finished">
        <template #back>
          <PhaseBackButton to="home" :label="t('ascentDetail.leaveAscent')" />
        </template>
        <ore-button
          color="secondary"
          variant="bordered"
          v-if="ascent.result === 'victory'"
          :icon-only="isPhone"
          :label="t('victory.share')"
          :rounded="isPhone ? 'full' : undefined"
          @click="shareVictory">
          <ore-icon name="share-2" v-if="isPhone" />
          <template v-if="!isPhone">{{ t('victory.share') }}</template>
        </ore-button>
        <ore-button color="primary" variant="solid"
          v-if="ascent.result === 'victory' && !summitReached" :icon-only="isPhone" 
          :label="t('ascentDetail.nextChapter')" :rounded="isPhone ? 'full' : undefined" @click="advance">
          <ore-icon name="chevron-right" v-if="isPhone" />
          <template v-if="!isPhone">{{ t('ascentDetail.nextChapter') }}</template>
        </ore-button>
      </PhaseDock>
      <PhaseDock v-else-if="ascent.result === 'victory'">
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
    </div>

    <ManagementSection :delete-body="t('ascentDetail.deleteBody')" :delete-label="t('ascentDetail.deleteAscent')"
      :delete-title="t('ascentDetail.deleteTitle')" :guest="sessionGuest" :hostable="canHostSubject(ascent)"
      :name="ascent.name" :name-label="t('ascentCreate.nameLabel')" :rename-title="t('ascentDetail.renameTitle')"
      :subject="{ id: ascent.id, kind: 'ascent' }" @remove="remove" @rename="rename">
      <template v-if="finished" #primary>
        <ore-button color="primary" size="md" variant="solid" @click="restart">
          <ore-icon name="rotate-ccw" slot="prefix" />
          {{ t(ascent.result === 'defeat' ? 'ascentDetail.retryAscent' : 'ascentDetail.restartAscent') }}
        </ore-button>
      </template>
      <ore-button size="sm" variant="ghost" v-if="!finished" @click="duplicate">
        <ore-icon name="copy" slot="prefix" />
        {{ t('campaigns.duplicate') }}
      </ore-button>
    </ManagementSection>

    <!-- The victory's confirmation is its wound sheet: the climb's score is filled where the
         fight ends, the same ritual as the Winds' expedition sheet. -->
    <ScoreDialog :aggression-level="ascent.chapter"
      :base="sheetBase" :confirm-label="t('ascentDetail.confirmVictoryLabel')"
      :initial-answers="sheet.answers" :label="t('ascentDetail.scoreVictoryTitle')"
      :modifiers="sheet.rows" :open="pendingResult === 'victory'" :rankings="ascentSummitLadder"
      @close="pendingResult = null" @confirm="confirmVictory" />

    <ConfirmDialog :confirm-label="t('ascentDetail.confirmDefeatLabel')" :danger="true" :open="pendingResult === 'defeat'"
      :title="t('ascentDetail.confirmDefeatTitle')" @cancel="pendingResult = null" @confirm="confirmDefeat">
      <ore-text>{{ t('ascentDetail.confirmDefeatBody') }}</ore-text>
    </ConfirmDialog>

    <ConfirmDialog :confirm-disabled="!partyDraftValid" :confirm-label="t('common.save')" :open="editingParty"
      :title="t('ascentDetail.partyDialogTitle')" @cancel="editingParty = false" @confirm="confirmPartyEdit">
      <div class="stack">
        <HunterSelect v-model="partyDraft" :expansion-ids="ascent.expansionIds" :max="partyMax"
          :min="ASCENT_PARTY_MIN" />
        <ore-text color="muted" size="sm">{{ t('ascentDetail.partyDialogHint') }}</ore-text>
      </div>
    </ConfirmDialog>

    <ConfirmDialog :confirm-label="t('ascentDetail.revisitLabel')" :open="pendingPhase !== null"
      :title="t('ascentDetail.revisitTitle', { phase: pendingPhase ? phaseLabel(pendingPhase) : '' })"
      @cancel="cancelRevisit" @confirm="confirmRevisit">
      <ore-text>{{ t('ascentDetail.revisitBody') }}</ore-text>
    </ConfirmDialog>

    <PartyBuildPickerDialog :open="partyLoadOpen" :rows="partyBuilds" @apply="applyPartyBuilds"
      @close="partyLoadOpen = false" />

    <ShareDialog :subject="sharing" @close="sharing = null" />

  </div>

  <div class="frame stack" style="text-align: center; padding-block: var(--size-16); justify-items: center" v-else>
    <ore-text variant="overline">{{ t('ascentDetail.eyebrowStatic') }}</ore-text>
    <ore-text as="h1" size="lg" variant="heading">{{ t('common.noSuchAscent') }}</ore-text>
    <LinkButton to="home" variant="bordered">{{ t('common.back') }}</LinkButton>
  </div>
</template>

<style scoped>
/* The climb's closing comparison: the Winds result's own rhythm under the banner. */
.ascent-result__ranking {
  display: grid;
  gap: var(--size-4);
  padding-top: var(--size-4);
  border-top: var(--border) solid var(--p-line);
}

.ascent-header__primary {
  display: flex;
  flex-direction: column;
  gap: var(--size-4);
  align-items: center;
  justify-content: center;
  min-width: 0;
}

.ascent-header__status {
  display: grid;
  grid-template-columns: repeat(3, minmax(var(--size-20), 1fr));
  gap: var(--size-2);
  min-width: var(--size-72);
}

.ascent-header__status ore-stats {
  --stats-bg: transparent;
  --stats-padding: 0 var(--size-2);
  --stats-value-size: var(--text-xl);
}

@media (width < 640px) {
  .ascent-header__primary {
    gap: var(--size-2);
    width: 100%;
    min-width: 0;
  }

  /* Phones keep all three stats on one row: the cells shrink and ellipsize, never wrap;
     the padding step buys the longest labels their full width. */
  .ascent-header__status {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    width: 100%;
    min-width: 0;
  }

  .ascent-header__status ore-stats {
    --stats-padding: 0 var(--size-1);
  }
}

/* The chapter title rides its band directly: the description reads stacked below the
   overline, and no rule line sits between the title and the story. */
.ascent .card-title {
  flex-direction: column;
  gap: var(--size-1);
  align-items: flex-start;
  border-bottom: 0;
}

/* The climb so far: the recap chip row between the story band and the party work. */
.ascent-story__brief {
  display: grid;
  gap: var(--size-2);
}

.ascent-story__chips {
  --cluster-gap: var(--size-2);
}

.ascent-story__chips img {
  width: 1.25em;
  height: 1.25em;
  object-fit: contain;
}
</style>
