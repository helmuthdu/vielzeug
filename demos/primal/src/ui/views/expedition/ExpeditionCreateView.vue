<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { asset } from '../../../app/assets';
import { type MessageKey, t, tp } from '../../../app/i18n';
import { expeditionById, expeditions, notifyError, runCommand, saveExpedition, settings } from '../../../app/store';
import { navigate, useMediaQuery, useReadable, useRouteQuery } from '../../../app/vue-bridge';
import { availableScenarios, monsterById, monsterDamageFor, trialHuntById, trialHuntForScenario } from '../../../content/index';
import { expeditionDeckContext } from '../../../domain/deck';
import { availableMonsters, buildSetupChecklist } from '../../../domain/expedition';
import { availableHunters, validateParty } from '../../../domain/party';
import type { AggressionLevel, ExpansionId, HunterLoadout, MonsterStanceDamage } from '../../../domain/types';
import ActionsMenu from '../../components/ActionsMenu.vue';
import AggressionMark from '../../components/AggressionMark.vue';
import BattlefieldMap from '../../components/BattlefieldMap.vue';
import PartyBuildPickerDialog from '../../components/deck/PartyBuildPickerDialog.vue';
import ExpeditionTargetBoard from '../../components/expedition/ExpeditionTargetBoard.vue';
import GameSetupDialog from '../../components/GameSetupDialog.vue';
import LinkButton from '../../components/LinkButton.vue';
import LoreEntry from '../../components/LoreEntry.vue';
import NightmareModeToggle from '../../components/NightmareModeToggle.vue';
import PageHeader from '../../components/PageHeader.vue';
import PageHeaderAction from '../../components/PageHeaderAction.vue';
import PhaseBackButton from '../../components/PhaseBackButton.vue';
import PhaseDock from '../../components/PhaseDock.vue';
import PhaseTracker from '../../components/PhaseTracker.vue';
import ExpeditionParty from '../../components/party/ExpeditionParty.vue';
import HunterPartyPicker from '../../components/party/HunterPartyPicker.vue';
import PartySection from '../../components/party/PartySection.vue';
import ResourceIcon from '../../components/ResourceIcon.vue';
import SetupChecklist from '../../components/SetupChecklist.vue';
import { usePartyBuilds } from '../../composables/use-party-builds';
import '@vielzeug/refine/button';
import '@vielzeug/refine/button-group';
import '@vielzeug/refine/card';
import '@vielzeug/refine/chip';
import '@vielzeug/refine/grid';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/text';

type Step = 'party' | 'monster' | 'scenario' | 'preparation';
const STEP_KEYS: Record<Step, MessageKey> = {
  monster: 'expeditionCreate.stepMonster',
  party: 'expeditionCreate.stepParty',
  preparation: 'expeditionCreate.stepPreparation',
  scenario: 'expeditionCreate.stepScenario',
};
const STEPS: { id: Step }[] = [
  { id: 'party' },
  { id: 'monster' },
  { id: 'scenario' },
  { id: 'preparation' },
];

const owned = useReadable(settings);
const query = useRouteQuery();
const expansionIds = ref<ExpansionId[]>([...owned.value.ownedExpansionIds]);
const hunterIds = ref<string[]>([]);
const monsterId = ref<string | null>(null);
const inspectedMonsterId = ref<string | null>(null);
const aggression = ref<AggressionLevel | null>(null);
/** True while the hunt plays the Nightmare variant: the stance damage below reflects it. */
const nightmare = ref(false);
const scenarioId = ref<string | null>(null);
const step = ref<Step>('party');
/** The wizard's committed record: the preparation step opens on it, revisits update it. */
const savedExpeditionId = ref<string | null>(null);

// A deck edit from the preparation step returns here: the committed record re-attaches,
// its draft restored field by field, and the wizard re-opens where it left off. A gallery
// deep link (`/new/expedition?challenge=<huntId>`) pre-selects its card instead — the two
// entries never combine.
const continued =
  typeof query.value.continue === 'string' ? expeditionById(query.value.continue) : undefined;
const preselectedHunt =
  typeof query.value.challenge === 'string' ? trialHuntById(query.value.challenge) : undefined;
if (continued && continued.status !== 'played') {
  expansionIds.value = [...continued.expansionIds];
  hunterIds.value = continued.hunters.map((member) => member.hunterId);
  monsterId.value = continued.monsterId;
  inspectedMonsterId.value = continued.monsterId;
  aggression.value = continued.aggression;
  nightmare.value = continued.nightmareVariant;
  scenarioId.value = continued.scenarioId;
  savedExpeditionId.value = continued.id;
  step.value = 'preparation';
} else if (preselectedHunt) {
  // The monster and its fixed aggression settle immediately, the scenario picks itself.
  monsterId.value = preselectedHunt.monsterId;
  inspectedMonsterId.value = preselectedHunt.monsterId;
  aggression.value = preselectedHunt.aggression;
  scenarioId.value = `trial-${preselectedHunt.id}`;
  // The card's required boxes join the session even when the shelf does not own them.
  expansionIds.value = [...new Set([...expansionIds.value, ...preselectedHunt.requiredExpansionIds])];
}

/** The setup ritual: the table's boxes: opens with a fresh page, never a restored one. */
const setupOpen = ref(!continued && settings.value.autoOpenGameSetup);

/* The phone dock's commit reads as an icon: the verb rides the aria. */
const isPhone = useMediaQuery('(width < 640px)');

const phaseEntries = computed(() => STEPS.map(({ id }) => ({ id, label: t(STEP_KEYS[id]) })));
const monsters = computed(() => availableMonsters(expansionIds.value));
const monster = computed(() => (monsterId.value ? monsterById(monsterId.value) : undefined));
const inspectedMonster = computed(() => monsters.value.find((entry) => entry.id === inspectedMonsterId.value));
const scenarios = computed(() => (monsterId.value ? availableScenarios(monsterId.value, expansionIds.value) : []));
const scenario = computed(() => scenarios.value.find((entry) => entry.id === scenarioId.value));
// The printed trial card behind the scenario, when this is a Hunter's Trial: its lore
// and printed extras ride along into the summary.
const challenge = computed(() => trialHuntForScenario(scenarioId.value));
const hasTrialConstraints = computed(
  () =>
    challenge.value !== undefined &&
    (challenge.value.forbiddenElementIds.length > 0 ||
      challenge.value.maxPotionSlots !== null ||
      challenge.value.nightmareVariant === 'optional' ||
      challenge.value.aggressionNote !== null),
);
const setupChecklist = computed(() =>
  monster.value && scenario.value && aggression.value !== null
    ? buildSetupChecklist(scenario.value, monster.value, hunterIds.value, aggression.value).filter(
      (section) => section.id === 'general' || section.id === 'hunters',
    )
    : [],
);
const currentDamage = computed(() =>
  inspectedMonster.value && aggression.value !== null
    ? (monsterDamageFor(inspectedMonster.value, aggression.value, nightmare.value) ??
      monsterDamageFor(inspectedMonster.value, aggression.value, false))
    : undefined,
);
/** The box is on the table: the switch waits; otherwise it names what would enable it. */
const nightmareAvailable = computed(() => expansionIds.value.includes('nightmare'));

function setNightmare(on: boolean): void {
  nightmare.value = on;
}

/** The stance panel's tier chip: the nightmare card's tier while the variant governs the
 *  fight, the standard tier while it is off — and, when the variant is on but this level
 *  ships no nightmare stance cards, the standard card named as such, so the toggle never
 *  reads dead. The prologue level and The Awakened carry no nightmare rows at all. */
const stanceChip = computed(() => {
  if (!currentDamage.value) return undefined;
  if (currentDamage.value.nightmare) return { color: 'error' as const, label: t('questBoard.nightmare') };
  if (nightmare.value) return { color: 'error' as const, label: t('questBoard.nightmareNoCards') };
  return { color: undefined, label: t('questBoard.standard') };
});
const stanceLabels = ['I', 'II', 'III', 'IV', 'V'] as const;
const stanceEntries = (row: MonsterStanceDamage | undefined) =>
  Object.entries(row?.stances ?? {}).map(([stance, damage]) => ({
    damage,
    label: stanceLabels[Number(stance) - 1],
  }));
const damageGlyphs = {
  perPlayer: { '--glyph': `url(${asset('/icons/icon_per_player.svg')})` },
  wound: { '--glyph': `url(${asset('/icons/icon_wound.svg')})` },
} as const;
const stepIndex = computed(() => STEPS.findIndex((entry) => entry.id === step.value));
const revisitSteps = computed(() => STEPS.slice(0, stepIndex.value).map(({ id }) => id));

watch(
  monsters,
  (available) => {
    if (available.some((entry) => entry.id === inspectedMonsterId.value)) return;
    inspectedMonsterId.value = available.find((entry) => entry.id === monsterId.value)?.id ?? available[0]?.id ?? null;
    aggression.value = null;
  },
  { immediate: true },
);

const canContinue = computed(() => {
  switch (step.value) {
    case 'party':
      return validateParty(hunterIds.value, expansionIds.value).length === 0;
    case 'monster':
      return monsterId.value !== null && aggression.value !== null;
    case 'scenario':
      return scenarioId.value !== null;
    default:
      return true;
  }
});

watch(expansionIds, (next, previous) => {
  const availableHunterIds = new Set(availableHunters(next).map((hunter) => hunter.id));
  hunterIds.value = hunterIds.value.filter((id) => availableHunterIds.has(id));
  if (monsterId.value && !availableMonsters(next).some((entry) => entry.id === monsterId.value)) {
    monsterId.value = null;
    scenarioId.value = null;
    aggression.value = null;
  }
  // A kept monster can still lose its scenario when the box it ships in is switched off.
  if (scenarioId.value && !scenarios.value.some((entry) => entry.id === scenarioId.value)) {
    scenarioId.value = null;
  }
  // Adding the Nightmare box turns the variant on, so the stance damage reflects it from
  // the first inspection; taking the box away can only turn it off.
  if (next.includes('nightmare') && !previous?.includes('nightmare')) nightmare.value = true;
  if (!next.includes('nightmare')) nightmare.value = false;
});

// A trial card that prints no Nightmare rows carries no variant: the card plays standard.
watch(scenarioId, (id) => {
  if (id && trialHuntForScenario(id)?.nightmareVariant === 'none') nightmare.value = false;
});

const go = (index: number) => {
  const target = STEPS[index];
  if (target) step.value = target.id;
};

function revisitStep(id: string): void {
  const index = STEPS.findIndex((entry) => entry.id === id);
  if (index !== -1 && index < stepIndex.value) go(index);
}

function inspectMonster(id: string): void {
  if (id !== inspectedMonsterId.value) aggression.value = null;
  inspectedMonsterId.value = id;
}

function confirmQuest(id: string): void {
  const candidate = monsters.value.find((entry) => entry.id === id);
  if (!candidate || aggression.value === null || !candidate.aggressionLevels.includes(aggression.value)) return;
  // Confirming a different monster drops its scenario; the same one keeps a pre-selected challenge.
  if (monsterId.value !== candidate.id) scenarioId.value = null;
  monsterId.value = candidate.id;
  go(STEPS.findIndex((entry) => entry.id === 'scenario'));
}

/** Commits the draft and opens the preparation step: the first commit creates the
 *  expedition, later ones update it after the steps above were revisited. */
function commitDraft(): void {
  try {
    const expedition = saveExpedition(
      {
        aggression: aggression.value,
        expansionIds: expansionIds.value,
        hunterIds: hunterIds.value,
        monsterId: monsterId.value,
        nightmareVariant: nightmare.value,
        scenarioId: scenarioId.value,
      },
      savedExpeditionId.value ?? undefined,
    );
    savedExpeditionId.value = expedition.id;
    go(STEPS.findIndex((entry) => entry.id === 'preparation'));
  } catch (error) {
    notifyError('expeditionCreate.saveError', error);
  }
}

/** Enters the hunt console: the preparation's commit already saved the expedition. */
function enterHunt(): void {
  if (savedExpeditionId.value) void navigate('expeditionDetail', { id: savedExpeditionId.value });
}

/** The dock's forward action: the scenario's continue commits before the preparation opens. */
function continueFrom(): void {
  if (step.value === 'scenario') commitDraft();
  else go(stepIndex.value + 1);
}

/** The committed record the preparation step works on. */
const allExpeditions = useReadable(expeditions);
const savedExpedition = computed(() =>
  savedExpeditionId.value ? allExpeditions.value.find((entry) => entry.id === savedExpeditionId.value) : undefined,
);
/** One selection for every face of the party: the workspace below, the dock's deck link. */
const selectedHunterId = ref('');
watch(
  () => savedExpedition.value?.hunters.map((member) => member.hunterId),
  (hunterIds) => {
    if (hunterIds?.length && !hunterIds.includes(selectedHunterId.value)) selectedHunterId.value = hunterIds[0] ?? '';
  },
  { immediate: true },
);

// The one-click party load: each hunter's saved builds, newest first, the campaign's own
// dialog with the expedition's deck context supplying the verdicts.
const partyLoadOpen = ref(false);
const partyBuilds = usePartyBuilds(
  () => savedExpedition.value,
  (current, member, hunter) => expeditionDeckContext(current, member, hunter),
);

function applyPartyBuilds(list: HunterLoadout[]): void {
  const id = savedExpeditionId.value;
  if (!id) return;
  try {
    for (const loadout of list) runCommand('applyLoadout', { id, kind: 'expedition' }, loadout.hunterId, loadout);
  } catch (error) {
    notifyError('toasts.actionNotPossible', error);
  }
  partyLoadOpen.value = false;
}

/** The phone actions menu's one pick: one action, routed exactly like the desktop buttons.
 *  The deck edit carries its return marker: the deck page's back re-opens this wizard. */
function runPrepTool(value: string): void {
  if (value === 'decks') {
    void navigate(
      'expeditionDeck',
      {
        hunterId: selectedHunterId.value || savedExpedition.value?.hunters[0]?.hunterId || '',
        id: savedExpeditionId.value ?? '',
      },
      { back: 'expeditionCreate' },
    );
  } else if (value === 'builds') {
    partyLoadOpen.value = true;
  }
}

/* Only the tablet portrait squares the utilities: phones carry them in the tools menu,
   every wider tier keeps the labeled cluster — the campaign dock's own densities. */
const hideUtilityText = useMediaQuery('(min-width: 640px) and (max-width: 900px)');

const aggressionHint = computed<Record<AggressionLevel, string>>(() => ({
  0: t('expeditionCreate.aggressionHint0'),
  1: t('expeditionCreate.aggressionHint1'),
  2: t('expeditionCreate.aggressionHint2'),
  3: t('expeditionCreate.aggressionHint3'),
}));
</script>
<template>
  <div class="frame">
    <PageHeader art="/backgrounds/bg_expedition.webp" :eyebrow="t('expeditionCreate.eyebrow')"
      :subtitle="t('expeditionCreate.subtitle')" :title="t('expeditionCreate.title')" />

    <div class="wizard">
      <PhaseTracker :current="step" :entries="phaseEntries" :label="t('expeditionCreate.stepperLabel')"
        :revisit="revisitSteps" @revisit="revisitStep" />
    </div>

    <!-- The wizard's steps and their dock share one block-flow context, so the bar pins at
         the viewport's foot while the step scrolls above it (see .phase-flow). -->
    <div class="phase-flow" style="--phase-gap: var(--size-8)">
      <section class="stack" style="--stack-gap: var(--size-8)" v-if="step === 'party'">
        <HunterPartyPicker v-model="hunterIds" :expansion-ids="expansionIds" />
      </section>

      <ExpeditionTargetBoard v-else-if="step === 'monster'" v-model="monsterId" :monsters="monsters"
        @inspect="inspectMonster">
        <template #tools>
          <!-- The Nightmare variant rides the board's tools row like the campaign's and the
               Winds' own: flip it between inspections, and the stance damage below
               re-reflects the card. -->
          <NightmareModeToggle :checked="nightmare" :disabled="!nightmareAvailable" @change="setNightmare" />
        </template>
        <template #after-details="{ monster: detailMonster }">
          <section class="expedition-aggression" v-if="detailMonster">
            <div class="expedition-aggression__heading">
              <ore-text as="h3" size="sm" variant="heading">{{ t('expeditionCreate.aggressionTitle') }}</ore-text>
              <ore-text color="muted" size="xs">
                {{ t('expeditionCreate.aggressionSupports', {
                  levels: detailMonster.aggressionLevels.join(', '), name:
                detailMonster.name }) }}
              </ore-text>
            </div>
            <ore-grid class="expedition-aggression__options" cols="2" gap="sm">
              <ore-card class="aggression" interactive v-for="level in ([0, 1, 2, 3] as AggressionLevel[])" :key="level"
                :aria-label="t('expeditionCreate.aggressionLevel', { level })"
                :aria-pressed="aggression === level ? 'true' : 'false'"
                :class="{ 'aggression--selected': aggression === level }"
                :disabled="!detailMonster.aggressionLevels.includes(level)" @activate="aggression = level">
                <div class="aggression__content">
                  <AggressionMark size="sm" :level="level" />
                  <ore-text variant="overline">{{ t('expeditionCreate.aggressionLevel', { level }) }}</ore-text>
                  <ore-text color="muted" size="xs">{{ aggressionHint[level] }}</ore-text>
                </div>
              </ore-card>
            </ore-grid>
            <section class="expedition-damage" v-if="currentDamage">
              <div class="expedition-damage__heading">
                <ore-text variant="overline">{{ t('questBoard.damagePerHunter') }}</ore-text>
                <ore-text color="muted" size="xs">{{ t('questBoard.damageHint') }}</ore-text>
                <div class="cluster expedition-damage__tags">
                  <ore-chip size="sm" variant="flat" v-if="aggression !== null">
                    {{ t('questBoard.aggression', { level: aggression }) }}
                  </ore-chip>
                  <ore-chip size="sm" variant="flat" :color="stanceChip?.color">
                    {{ stanceChip?.label }}
                  </ore-chip>
                </div>
              </div>
              <div class="expedition-damage__stances">
                <article class="expedition-damage__stance" v-for="target in stanceEntries(currentDamage)"
                  :key="target.label"
                  :aria-label="t('questBoard.stanceAria', { damage: target.damage, stance: target.label })">
                  <ore-text color="muted" size="xs" variant="overline">
                    {{ t('questBoard.stance', { stance: target.label }) }}
                  </ore-text>
                  <div class="expedition-damage__equation">
                    <strong>{{ target.damage }}</strong>
                    <span aria-hidden="true" class="expedition-damage__glyph expedition-damage__glyph--player"
                      :style="damageGlyphs.perPlayer" />
                    <span aria-hidden="true" class="expedition-damage__arrow">→</span>
                    <span aria-hidden="true" class="expedition-damage__glyph expedition-damage__glyph--wound"
                      :style="damageGlyphs.wound" />
                  </div>
                </article>
              </div>
            </section>
          </section>
        </template>
        <template #selection-action="{ monster: detailMonster }">
          <ore-button color="secondary" variant="solid"
            :disabled="aggression === null || !detailMonster.aggressionLevels.includes(aggression)"
            @click="confirmQuest(detailMonster.id)">
            {{ t('expeditionCreate.confirmQuest', { name: detailMonster.name }) }}
          </ore-button>
        </template>
      </ExpeditionTargetBoard>

      <section class="stack" v-else-if="step === 'scenario' && monster">
        <div>
          <ore-text as="h2" size="sm" variant="heading">{{ t('expeditionCreate.scenarioTitle') }}</ore-text>
          <ore-text color="muted">{{ t('expeditionCreate.scenarioHint') }}</ore-text>
        </div>
        <ore-grid gap="md" min-col-width="20rem" responsive>
          <ore-card interactive v-for="entry in scenarios" :key="entry.id"
            :aria-pressed="scenarioId === entry.id ? 'true' : 'false'" @activate="scenarioId = entry.id">
            <span aria-hidden="true" class="pick__mark">✓</span>
            <div class="stack" style="--stack-gap: 0.5rem">
              <ore-text variant="overline">
                {{ entry.trialId ? (trialHuntById(entry.trialId)?.series ?? '') : t('expeditionCreate.number', {
                  number:
                entry.number }) }}
              </ore-text>
              <ore-text as="h3" size="sm" variant="heading">{{ entry.name }}</ore-text>
              <ore-text size="sm">{{ entry.objective }}</ore-text>
              <BattlefieldMap compact :label="t('expeditionCreate.battlefieldLabel', { name: entry.name })"
                :terrain="entry.terrain" />
              <ore-text color="muted" variant="caption" v-if="entry.specialRules.length">
                {{ tp('expeditionCreate.specialRules', entry.specialRules.length) }}
              </ore-text>
            </div>
          </ore-card>
        </ore-grid>
      </section>

      <section class="stack" v-else-if="step === 'preparation' && monster && scenario">
        <ore-card orientation="horizontal" padding="lg">
          <img alt="" class="summary__emblem" slot="media" :src="asset(monster.trophyIcon)" />
          <div class="review-summary">
            <div class="stack" style="--stack-gap: 0.4rem">
              <ore-text variant="overline">
                {{
                  challenge
                    ? `${challenge.series} · #${challenge.number}`
                    : t('expeditionCreate.number', { number: scenario.number })
                }}
              </ore-text>
              <ore-text as="h2" size="lg" variant="heading">{{ scenario.name }}</ore-text>
              <ore-text color="muted">{{ monster.name }} · {{ monster.habitat }}</ore-text>
              <ore-text size="sm">{{ scenario.objective }}</ore-text>
            </div>
            <div class="review-summary__meta">
              <AggressionMark size="md" v-if="aggression !== null" :level="aggression" />
              <ResourceIcon size="sm" :id="monster.element" />
              <ore-chip size="sm" variant="outline">{{ tp('expeditionCreate.huntersCount', hunterIds.length)
                }}</ore-chip>
            </div>
          </div>
        </ore-card>

        <ore-card class="lore-band" padding="none" v-if="challenge">
          <LoreEntry art="/backgrounds/bg_expedition.webp" :lore="challenge.lore" :overline="challenge.name" />
        </ore-card>

        <!-- Printed trial rules and constraints stay separate from the narrative band. -->
        <ore-card class="summary-challenge" padding="lg"
          v-if="challenge && (scenario.specialRules.length || hasTrialConstraints || challenge.aggressionNote)">
          <div class="stack" style="--stack-gap: var(--size-4)">
            <div class="stack" style="--stack-gap: var(--size-2)" v-if="scenario.specialRules.length">
              <ore-text as="h3" size="xs" variant="heading">{{ t('expeditionCreate.trialRules') }}</ore-text>
              <ul class="summary-trial__rules">
                <li v-for="rule in scenario.specialRules" :key="rule.title">{{ rule.text }}</li>
              </ul>
            </div>
            <div class="cluster summary-trial__constraints" v-if="hasTrialConstraints">
              <span class="summary-trial__constraint" v-if="challenge.forbiddenElementIds.length">
                {{ t('expeditionCreate.trialForbidden') }}
                <ResourceIcon size="sm" v-for="id in challenge.forbiddenElementIds" :key="id" :id="id" />
              </span>
              <span class="summary-trial__constraint" v-if="challenge.maxPotionSlots !== null">
                {{ t('expeditionCreate.trialPotions', { count: challenge.maxPotionSlots }) }}
              </span>
              <span class="summary-trial__constraint" v-if="challenge.nightmareVariant === 'optional'">
                {{ t('expeditionCreate.trialNightmare') }}
              </span>
            </div>
            <p class="summary-trial__note" v-if="challenge.aggressionNote">{{ challenge.aggressionNote }}</p>
          </div>
        </ore-card>

        <ore-text color="muted" size="sm">{{ t('expeditionCreate.summaryHint') }}</ore-text>

        <!-- The party readies here, the campaign's own preparation grammar adjusted for the
             mode: decks and loadouts on the committed record, no forge and no progression. -->
        <PartySection heading-id="expedition-preparing-party-title" :title="t('expeditionDetail.partyTitle')">
          <ExpeditionParty v-if="savedExpeditionId" v-model="selectedHunterId" :deck-query="{ back: 'expeditionCreate' }"
            :expedition-id="savedExpeditionId" />
        </PartySection>
        <!-- The physical setup is the review's own body: always shown in full, never
             folded away behind a toggle. -->
        <div class="physical-setup">
          <div class="physical-setup__head">
            <ore-text as="h2" size="sm" variant="heading">{{ t('expeditionDetail.setupTitle') }}</ore-text>
            <ore-text color="muted" size="sm">{{ t('expeditionDetail.setupSubtitle') }}</ore-text>
          </div>
          <SetupChecklist :sections="setupChecklist" />
        </div>
      </section>

      <!-- The quest step is a target board that commits straight from the selected card, so it
           carries no dock at all (see PhaseDock). -->
      <PhaseDock v-if="step !== 'monster'">
        <template v-if="stepIndex > 0" #back>
          <PhaseBackButton :label="t('common.back')" @back="go(stepIndex - 1)" />
        </template>
        <!-- Setup picks the boxes the run is built from, so it ends where the expedition is
             committed: the preparation step's expansions are locked to the saved record. -->
        <PageHeaderAction icon="settings" kind="secondary" size="md" v-if="step !== 'preparation'"
          @click="setupOpen = true">
          {{ t('gameSetup.open') }}
        </PageHeaderAction>
        <!-- The preparation utilities: fixing decks and gearing up, one glance from the
             primary they unblock — the campaign's own cluster, adjusted for the mode: no
             forge, no logs. Phones carry the cluster as the actions menu: one pick, one
             action; the deck page redirects a stale hunter id itself. -->
        <template v-if="step === 'preparation'">
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
            <LinkButton to="expeditionDeck" :icon-only="hideUtilityText" :label="t('challenge.openDeck')"
              :params="{
                hunterId: selectedHunterId || savedExpedition?.hunters[0]?.hunterId || '',
                id: savedExpeditionId ?? '',
              }"
              :query="{ back: 'expeditionCreate' }">
              <ore-icon name="layers" :slot="hideUtilityText ? null : 'prefix'" />
              <template v-if="!hideUtilityText">{{ t('challenge.openDeck') }}</template>
            </LinkButton>
            <ore-button :icon-only="hideUtilityText" :label="t('deck.loadBuilds')" @click="partyLoadOpen = true">
              <ore-icon name="library" :slot="hideUtilityText ? null : 'prefix'" />
              <template v-if="!hideUtilityText">{{ t('deck.loadBuilds') }}</template>
            </ore-button>
          </ore-button-group>
        </template>
        <ore-button color="primary" variant="solid" v-if="step !== 'preparation'"
          :disabled="!canContinue" :icon-only="isPhone" :label="t('common.continue')" :rounded="isPhone ? 'full' : undefined" @click="continueFrom">
          <ore-icon name="chevron-right" v-if="isPhone" />
          <template v-if="!isPhone">{{ t('common.continue') }}</template>
        </ore-button>
        <ore-button color="primary" variant="solid" v-if="step === 'preparation'" :icon-only="isPhone"
          :label="t('dashboard.enterHunt')" :rounded="isPhone ? 'full' : undefined" @click="enterHunt">
          <ore-icon name="swords" :slot="isPhone ? null : 'prefix'" />
          <template v-if="!isPhone">{{ t('dashboard.enterHunt') }}</template>
        </ore-button>
      </PhaseDock>
    </div>

    <GameSetupDialog v-model:expansion-ids="expansionIds" :label="t('expeditionCreate.title')" :open="setupOpen"
      @close="setupOpen = false" />
    <PartyBuildPickerDialog :open="partyLoadOpen" :rows="partyBuilds" @apply="applyPartyBuilds"
      @close="partyLoadOpen = false" />
  </div>
</template>

<style scoped>
.wizard {
  margin-bottom: 1.5rem;
}

.expedition-aggression {
  display: grid;
  gap: var(--size-3);
  padding-top: var(--size-3);
}

.expedition-aggression__heading {
  display: grid;
  gap: var(--size-1);
}

.aggression {
  --card-padding: var(--size-2);
  --card-shadow: none;
  min-width: 0;
}

.aggression--selected {
  --card-border-color: var(--p-gold-dim);
}

.aggression__content {
  display: grid;
  gap: var(--size-1);
  justify-items: center;
  text-align: center;
}

.expedition-damage {
  display: grid;
  gap: var(--size-2);
}

.expedition-damage__heading {
  display: grid;
  gap: var(--size-1);
}

.expedition-damage__stances {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--size-2);
}

.expedition-damage__stance {
  display: grid;
  gap: var(--size-1);
  min-width: 0;
  padding: var(--size-2);
  background: var(--p-panel);
  border: var(--border) solid var(--p-line);
  border-radius: var(--rounded-sm);
}

.expedition-damage__equation {
  display: flex;
  gap: var(--size-1);
  align-items: center;
  min-width: 0;
}

.expedition-damage__equation strong {
  font-family: var(--p-heading);
  font-size: var(--text-lg);
  color: var(--p-text-strong);
}

.expedition-damage__glyph {
  display: inline-block;
  flex-shrink: 0;
  inline-size: var(--size-4);
  block-size: var(--size-4);
  background: currentcolor;
  mask: var(--glyph) center / contain no-repeat;
}

.expedition-damage__glyph--player {
  color: var(--p-text-muted);
}

.expedition-damage__glyph--wound {
  color: var(--p-blood);
}

.expedition-damage__arrow {
  color: var(--p-text-muted);
}

.review-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
  justify-content: space-between;
}

.review-summary__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}

.summary__emblem {
  width: 7rem;
  height: 7rem;
  padding: 1rem;
  object-fit: contain;
  filter: drop-shadow(var(--drop-shadow-xl));
}

.summary-trial__rules {
  display: grid;
  gap: var(--size-2);
  padding: 0;
  margin: 0;
  list-style: none;
}

/* The review's physical setup: an open section: the checklist is the step's body,
   never an aside folded behind a toggle. */
.physical-setup {
  display: grid;
  gap: var(--size-2);
}

.physical-setup__head {
  display: grid;
  gap: var(--size-0-5);
}

.summary-trial__rules li {
  padding: var(--size-2);
  font-size: var(--text-xs);
  color: var(--p-text-muted);
  background: var(--p-panel-sunken);
  border-radius: var(--rounded-sm);
}

/* The card's printed extras read as quiet chips beside the rules they constrain. */
.summary-trial__constraints {
  --cluster-gap: var(--size-2);
}

.summary-trial__constraint {
  display: inline-flex;
  flex-wrap: wrap;
  gap: var(--size-1);
  align-items: center;
  padding: var(--size-1) var(--size-2);
  font-size: var(--text-xs);
  color: var(--p-text-muted);
  background: var(--p-panel-sunken);
  border: var(--border) solid var(--p-line);
  border-radius: var(--rounded-sm);
}

.summary-trial__note {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--p-text-muted);
}
</style>
