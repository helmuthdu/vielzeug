<script lang="ts" setup>
/**
 * A Winds series' creation: pick Spring or Summer, name the series, choose the
 * library and seat the party. The run starts in its setup phase, where the level-1 gear
 * draft and the first monster choice wait.
 */
import { computed, ref, watch } from 'vue';
import { asset } from '../../../app/assets';
import { t } from '../../../app/i18n';
import { notifyError, settings, startChallenge } from '../../../app/store';
import { navigate, useMediaQuery, useReadable, useRouteQuery } from '../../../app/vue-bridge';
import { loreExcerpt, TRIAL_SERIES, trialSeriesById } from '../../../content/index';
import { CHALLENGE_NAME_MAX, suggestChallengeName } from '../../../domain/challenge';
import { availableHunters, validateParty } from '../../../domain/party';
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
import '@vielzeug/refine/text';

const owned = useReadable(settings);
const query = useRouteQuery();
const expansionIds = ref<ExpansionId[]>([...owned.value.ownedExpansionIds]);

const seriesId = ref<string>(TRIAL_SERIES[0]?.id ?? '');
/** The Nightmare variant: on while its box is picked, off when it leaves. */
const nightmare = ref(false);
/** The chosen series must print the variant as optional for the toggle to appear. */
const seriesAllowsNightmare = computed(() => trialSeriesById(seriesId.value)?.nightmareVariant === 'optional');
const name = ref('');
const hunterIds = ref<string[]>([]);
const touched = ref(false);
/** The setup ritual: name and boxes: opens with the page and reopens from the dock. */
const setupOpen = ref(settings.value.autoOpenGameSetup);

/* The phone dock's commit reads as an icon: the verb rides the aria. */
const isPhone = useMediaQuery('(width < 640px)');

// A gallery deep link (`/new/challenge?series=<id>`) pre-selects the series card.
const preselectedSeries = typeof query.value.series === 'string' ? query.value.series : null;
if (preselectedSeries && TRIAL_SERIES.some((series) => series.id === preselectedSeries)) {
  seriesId.value = preselectedSeries;
  // The series' monster boxes join the session even when the shelf does not own them.
  expansionIds.value = [
    ...new Set([
      ...expansionIds.value,
      ...((trialSeriesById(preselectedSeries)?.recommendedExpansionIds ?? []) as ExpansionId[]),
    ]),
  ];
}

const suggestedNames = Object.fromEntries(TRIAL_SERIES.map((series) => [series.id, suggestChallengeName(series.id)]));
const suggestedName = computed(() => suggestedNames[seriesId.value] ?? suggestChallengeName(seriesId.value));

// The biome boards the chosen series rolls. The shelf owns them or the mode is locked at the
// New Game gate; here they are pinned into the session so a run cannot be started without them.
const seriesRequired = computed(() => requiredExpansionsFor('challenge', seriesId.value));
const missing = computed(() => missingExpansionIds(seriesRequired.value, owned.value.ownedExpansionIds));

// Choosing a series brings its biome boards to the table, exactly like laying out the boxes.
watch(seriesId, (id) => {
  const boards = requiredExpansionsFor('challenge', id);
  if (boards.every((board) => expansionIds.value.includes(board))) return;
  expansionIds.value = [...new Set([...expansionIds.value, ...boards])];
});

// Dropping an expansion drops the hunters that came with it, exactly like the physical box.
watch(expansionIds, (next, previous) => {
  const allowed = new Set(availableHunters(next).map((hunter) => hunter.id));
  hunterIds.value = hunterIds.value.filter((id) => allowed.has(id));
  // Adding the Nightmare box turns the variant on, so the board and the score sheets reflect
  // it from the first expedition; taking the box away can only turn it off.
  if (next.includes('nightmare') && !previous?.includes('nightmare')) nightmare.value = true;
  if (!next.includes('nightmare')) nightmare.value = false;
});

const partyError = computed(() => {
  const issues = validateParty(hunterIds.value, expansionIds.value);
  return issues[0]?.message ?? null;
});

function create(): void {
  touched.value = true;
  if (missing.value.length > 0 || partyError.value || !seriesId.value) return;
  try {
    const run = startChallenge(seriesId.value, name.value.trim() || suggestedName.value, hunterIds.value, expansionIds.value, nightmare.value);
    void navigate('challengeDetail', { id: run.id });
  } catch (error) {
    notifyError('challengeCreate.createError', error);
  }
}
</script>

<template>
  <div class="frame stack" style="--stack-gap: var(--size-6)">
    <PageHeader art="/backgrounds/bg_challenges.webp" art-position="center 25%" :eyebrow="t('challengeCreate.eyebrow')"
      :subtitle="t('challengeCreate.subtitle')" :title="t('challengeCreate.title')" />

    <!-- The form and its dock share one block-flow context (see .phase-flow): a sticky bar
         could never leave a grid track, and the dock sits outside the form: it submits the
         form through the button's form binding instead. -->
    <div class="phase-flow" style="--phase-gap: var(--size-8)">
      <form class="stack" id="challenge-create" style="--stack-gap: var(--size-8)" @submit.prevent="create">
        <ExpansionRequirement v-if="missing.length > 0" :missing="missing" :required="seriesRequired" />
        <section aria-labelledby="series-title" class="stack" style="--stack-gap: var(--size-3)">
          <div class="card-title">
            <ore-text as="h2" id="series-title" size="xs" variant="heading">
              {{ t('challengeCreate.seriesTitle') }}
            </ore-text>
            <ore-text color="muted" variant="caption">{{ t('challengeCreate.seriesHint') }}</ore-text>
          </div>
          <div class="series-grid">
            <ore-card class="series" interactive padding="none" v-for="series in TRIAL_SERIES" :key="series.id"
              :aria-pressed="seriesId === series.id ? 'true' : 'false'"
              :class="{ 'series--selected': seriesId === series.id }" @activate="seriesId = series.id">
              <div class="series__surface" :style="{
                '--art': `url(${asset(series.art)})`,
                ...(series.artPosition ? { '--series-art-position': series.artPosition } : {}),
              }">
                <div class="series__copy stack" style="--stack-gap: 0.4rem">
                  <ore-text color="muted" size="xs" variant="overline">{{ series.series }}</ore-text>
                  <ore-text as="h3" class="series__title" size="sm" variant="heading">
                    {{ series.name }}
                  </ore-text>
                  <ore-text class="series__hook" color="muted" size="xs">
                    {{ loreExcerpt(series.lore) }}
                  </ore-text>
                  <ore-text color="muted" size="xs">
                    {{ t('challengeCreate.expeditionCount', { count: series.expeditionCount }) }} ·
                    {{ t('challengeCreate.monsterCount', { count: series.monsters.length }) }}
                  </ore-text>
                </div>
              </div>
            </ore-card>
          </div>
        </section>

        <HunterPartyPicker v-model="hunterIds" :expansion-ids="expansionIds" />

        <ore-alert color="warning" size="sm" variant="flat" v-if="touched && partyError">
          {{ partyError }}
        </ore-alert>

      </form>

      <PhaseDock>
        <template #back>
          <PhaseBackButton to="campaigns" :label="t('common.back')" />
        </template>
        <PageHeaderAction icon="settings" kind="secondary" size="md" @click="setupOpen = true">
          {{ t('gameSetup.open') }}
        </PageHeaderAction>
        <ore-button color="primary" form="challenge-create" type="submit" variant="solid"
          :disabled="!!partyError || !seriesId || missing.length > 0" :icon-only="isPhone" 
          :label="t('challengeCreate.submit')" :rounded="isPhone ? 'full' : undefined">
          <ore-icon name="check" v-if="isPhone" />
          <template v-if="!isPhone">{{ t('challengeCreate.submit') }}</template>
        </ore-button>
      </PhaseDock>
    </div>

    <GameSetupDialog v-model:expansion-ids="expansionIds" v-model:name="name" :label="t('challengeCreate.title')"
      :name-label="t('challengeCreate.nameLabel')" :name-maxlength="CHALLENGE_NAME_MAX"
      :name-placeholder="suggestedName" :open="setupOpen" @close="setupOpen = false">
      <template #settings>
        <div class="stack" style="--stack-gap: var(--size-2)" v-if="seriesAllowsNightmare">
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

<style scoped>
.series-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
  gap: var(--size-4);
}

.series {
  --card-hover-shadow: var(--shadow-sm);
  --card-shadow: none;
}

.series--selected {
  --card-border-color: var(--p-gold-dim);
}

/* The series cards ride their cover art like the New Game mode cards: full-bleed image,
   copy anchored over the bottom readability gradient. */
.series__surface {
  position: relative;
  box-sizing: border-box;
  display: grid;
  align-content: end;
  min-height: 16rem;
  padding: var(--size-4);
  overflow: hidden;
  isolation: isolate;
}

.series__surface::before,
.series__surface::after {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: '';
}

.series__surface::before {
  z-index: -2;
  background:
    var(--art) var(--series-art-position, center) / cover no-repeat,
    var(--p-panel-sunken);
  transition: transform var(--p-motion) var(--p-ease);
}

.series__surface::after {
  z-index: -1;
  background: linear-gradient(180deg,
      transparent 18%,
      color-mix(in oklch, var(--p-panel) 32%, transparent) 42%,
      color-mix(in oklch, var(--p-panel) 92%, transparent) 68%,
      var(--p-panel) 100%);
}

/* The art zoom is this section's one authored motion, with the focus twin keeping keyboard
   parity with hover; the motion tokens zero it under reduced motion. */
.series:hover .series__surface::before,
.series:focus-visible .series__surface::before {
  transform: scale(1.035);
}

.series__copy {
  max-width: 52ch;
}

.series__title {
  --text-color: var(--p-text-strong);
}

/* The hook: the entry's opening line, clamped so the copy keeps its shape over the art. */
.series__hook {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}



@media (width < 640px) {
  .series__surface {
    min-height: 18rem;
  }

  .series__surface::after {
    background: linear-gradient(180deg,
        transparent 4%,
        color-mix(in oklch, var(--p-panel) 48%, transparent) 30%,
        color-mix(in oklch, var(--p-panel) 94%, transparent) 56%,
        var(--p-panel) 100%);
  }
}
</style>
