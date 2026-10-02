<script lang="ts" setup>
import '@vielzeug/refine/button';
import '@vielzeug/refine/button-group';
import '@vielzeug/refine/grid';
import '@vielzeug/refine/select';
import '@vielzeug/refine/text';
import { computed, ref } from 'vue';
import { type MessageKey, t, tp } from '../../app/i18n';
import { ascents, campaigns, challenges, expeditions } from '../../app/store';
import { useReadable } from '../../app/vue-bridge';
import { monsterById } from '../../content';
import {
  analyzeHunts,
  type ChroniclesMode,
  type ChroniclesPartySize,
  type ChroniclesSources,
  type ChroniclesSubject,
} from '../../domain/chronicles';
import type { Expedition } from '../../domain/types';
import LinkButton from '../components/LinkButton.vue';
import PageHeader from '../components/PageHeader.vue';
import ChronicleSection from './chronicles/ChronicleSection.vue';
import CreatureRankings from './chronicles/CreatureRankings.vue';
import { formatCount } from './chronicles/format';
import HunterCompany from './chronicles/HunterCompany.vue';
import PaceRankings from './chronicles/PaceRankings.vue';
import RecentHunts from './chronicles/RecentHunts.vue';
import RecordOverview from './chronicles/RecordOverview.vue';

const ascentRows = useReadable(ascents);
const campaignRows = useReadable(campaigns);
const challengeRows = useReadable(challenges);
const expeditionRows = useReadable(expeditions);
const selectedMode = ref<ChroniclesMode>('all');
const selectedPartySize = ref<ChroniclesPartySize>('all');
const modes: ChroniclesMode[] = ['all', 'campaign', 'expedition', 'ascent', 'challenge'];

/** An expedition is named by its monster: the journal's way back into a standalone hunt. */
const namedExpedition = (expedition: Expedition): ChroniclesSubject => ({
  huntHistory: expedition.huntHistory,
  id: expedition.id,
  name: (expedition.monsterId === null ? undefined : monsterById(expedition.monsterId)?.name) ?? expedition.id,
});
const sources = computed<ChroniclesSources>(() => ({
  ascents: ascentRows.value,
  campaigns: campaignRows.value,
  challenges: challengeRows.value,
  expeditions: expeditionRows.value.map(namedExpedition),
}));
const metrics = computed(() => analyzeHunts(sources.value, { mode: selectedMode.value, partySize: selectedPartySize.value }));
/** Every recorded hunt across modes, from the chapter counts the analysis always carries. */
const totalAttempts = computed(() =>
  metrics.value.byMode.ascent +
  metrics.value.byMode.campaign +
  metrics.value.byMode.challenge +
  metrics.value.byMode.expedition,
);

const MODE_KEYS: Record<ChroniclesMode, MessageKey> = {
  all: 'chronicles.mode.all',
  ascent: 'chronicles.mode.ascent',
  campaign: 'chronicles.mode.campaign',
  challenge: 'chronicles.mode.challenge',
  expedition: 'chronicles.mode.expedition',
};

/** The chapter divider carries each mode's hunt count, so the record's provenance shows before filtering. */
const modeCounts = computed(() =>
  modes.map((value) => ({
    count: value === 'all' ? totalAttempts.value : metrics.value.byMode[value],
    key: MODE_KEYS[value],
    label: t(MODE_KEYS[value]),
    value,
  })),
);
const modeLabel = computed(() => t(MODE_KEYS[selectedMode.value]));

/**
 * The party divider: fight length and every pace number swing with the table's size, so the
 * record can be read at one size alone. It appears only when the record holds more than one.
 */
const partyOptions = computed(() => {
  const entries = metrics.value.partyCounts;
  const total = entries.reduce((sum, { count }) => sum + count, 0);

  return [
    { count: total, label: t('chronicles.partyAll'), value: 'all' as ChroniclesPartySize },
    ...entries.map(({ count, size }) => ({
      count,
      label: tp('chronicles.partyUnit', size, { count: size }),
      value: size as ChroniclesPartySize,
    })),
  ];
});
const showPartyFilter = computed(() => metrics.value.partyCounts.length > 1);

/** The applied filters, announced politely: the record below answers to its dividers. */
const filterStatus = computed(() => {
  const count = formatCount(metrics.value.attempts);

  return selectedPartySize.value === 'all'
    ? t('chronicles.filterStatus', { count, mode: modeLabel.value })
    : t('chronicles.filterStatusParty', {
        count,
        mode: modeLabel.value,
        party: tp('chronicles.partyUnit', selectedPartySize.value, { count: selectedPartySize.value }),
      });
});

/** A record with no hunts may still belong to saved games; a device with none has no games to open. */
const hasGames = computed(
  () =>
    ascentRows.value.length +
      campaignRows.value.length +
      challengeRows.value.length +
      expeditionRows.value.length >
    0,
);

/**
 * An empty record always names a mode: a party option only exists while that size holds hunts
 * inside the current mode lens, so only the mode lens can empty the combined record.
 */
const emptyAtMode = computed(() => metrics.value.attempts === 0 && selectedMode.value !== 'all');
const emptyAtParty = computed(() => metrics.value.attempts === 0 && selectedPartySize.value !== 'all');

/** The phone's folio chips: the page stacks into several screens below the wide layout. */
const FOLIO_SECTIONS = [
  { id: 'chronicle-record', key: 'chronicles.record' },
  { id: 'chronicle-creatures', key: 'chronicles.creatures' },
  { id: 'chronicle-pace', key: 'chronicles.pace' },
  { id: 'chronicle-recent', key: 'chronicles.recentHunts' },
  { id: 'chronicle-hunters', key: 'chronicles.company' },
] as const;

function selectMode(mode: ChroniclesMode): void {
  selectedMode.value = mode;
}

function changeMode(event: Event): void {
  const value = (event.target as HTMLElement & { value?: string }).value;
  if (value && modes.includes(value as ChroniclesMode)) selectedMode.value = value as ChroniclesMode;
}

function selectPartySize(value: ChroniclesPartySize): void {
  selectedPartySize.value = value;
}

function changePartySize(event: Event): void {
  const value = (event.target as HTMLElement & { value?: string }).value;

  if (!value) return;
  selectedPartySize.value = value === 'all' ? 'all' : Number(value);
}

function showAllModes(): void {
  selectedMode.value = 'all';
}

function showAllPartySizes(): void {
  selectedPartySize.value = 'all';
}
</script>

<template>
  <div class="frame chronicle">
    <PageHeader art="/backgrounds/bg_campaign_log.webp" :eyebrow="t('chronicles.eyebrow')"
      :subtitle="t('chronicles.subtitle')" :title="t('chronicles.title')" />

    <template v-if="totalAttempts > 0">
      <p aria-live="polite" class="visually-hidden" role="status">{{ filterStatus }}</p>

      <nav class="chronicle-jumps" :aria-label="t('chronicles.jumpNavLabel')" >
        <a v-for="section in FOLIO_SECTIONS" :key="section.id" :href="`#${section.id}`">{{ t(section.key) }}</a>
      </nav>

      <div class="chronicle__desktop-filter">
        <ore-button-group
          attached
          class="chronicle__mode-filter"
          rounded="sm"
          :label="t('chronicles.filter')">
          <ore-button
            size="sm"
            variant="bordered"
            v-for="entry in modeCounts"
            :key="entry.value"
            :aria-pressed="selectedMode === entry.value ? 'true' : 'false'"
            @click="selectMode(entry.value)">
            {{ entry.label }}
            <span aria-hidden="true" class="chronicle__filter-count">{{ formatCount(entry.count) }}</span>
            <span class="visually-hidden">{{ t('chronicles.tabCount', { count: entry.count }) }}</span>
          </ore-button>
        </ore-button-group>
        <ore-button-group
          attached
          class="chronicle__party-filter"
          rounded="sm"
          v-if="showPartyFilter"
          :label="t('chronicles.partyFilter')">
          <ore-button
            size="sm"
            variant="bordered"
            v-for="entry in partyOptions"
            :key="String(entry.value)"
            :aria-pressed="selectedPartySize === entry.value ? 'true' : 'false'"
            @click="selectPartySize(entry.value)">
            {{ entry.label }}
            <span aria-hidden="true" class="chronicle__filter-count">{{ formatCount(entry.count) }}</span>
            <span class="visually-hidden">{{ t('chronicles.tabCount', { count: entry.count }) }}</span>
          </ore-button>
        </ore-button-group>
      </div>

      <div class="chronicle__mobile-filter">
        <ore-select fullwidth rounded="sm" variant="bordered" :label="t('chronicles.filter')" :value="selectedMode"
          @change="changeMode">
          <option v-for="entry in modeCounts" :key="entry.value" :value="entry.value">
            {{ entry.label }} · {{ tp('chronicles.huntUnit', entry.count, { count: formatCount(entry.count) }) }}
          </option>
        </ore-select>
        <ore-select fullwidth rounded="sm" variant="bordered" v-if="showPartyFilter"
          :label="t('chronicles.partyFilter')" :value="String(selectedPartySize)" @change="changePartySize">
          <option v-for="entry in partyOptions" :key="String(entry.value)" :value="String(entry.value)">
            {{ entry.label }} · {{ tp('chronicles.huntUnit', entry.count, { count: formatCount(entry.count) }) }}
          </option>
        </ore-select>
      </div>
    </template>

    <section class="chronicle__empty-state" v-if="metrics.attempts === 0">
      <ore-text as="h2" size="sm" variant="heading">
        {{ t(emptyAtMode ? 'chronicles.modeEmptyTitle' : 'chronicles.emptyTitle') }}
      </ore-text>
      <ore-text color="muted" size="sm">
        {{
          emptyAtMode
            ? t('chronicles.modeEmptyDescription', { count: totalAttempts })
            : t('chronicles.emptyDescription')
        }}
      </ore-text>
      <div class="cluster">
        <ore-button color="primary" variant="bordered" v-if="emptyAtMode" @click="showAllModes">
          {{ t('chronicles.showAllModes') }}
        </ore-button>
        <ore-button color="primary" variant="bordered" v-if="emptyAtParty" @click="showAllPartySizes">
          {{ t('chronicles.showAllParties') }}
        </ore-button>
        <template v-else>
          <LinkButton size="sm" to="newGame">{{ t('chronicles.startGame') }}</LinkButton>
          <LinkButton size="sm" to="campaigns" v-if="hasGames">{{ t('chronicles.openCampaigns') }}</LinkButton>
        </template>
      </div>
    </section>

    <template v-else>
      <RecordOverview :metrics="metrics" :mode="selectedMode" @select-mode="selectMode" />

      <ore-grid align="stretch" class="chronicle__rankings" cols="1" cols-lg="2" gap="lg">
        <ChronicleSection folio="II" id="chronicle-creatures" :intro="t('chronicles.creaturesIntro')" :label="t('chronicles.creatures')"
          :title="t('chronicles.creatures')">
          <CreatureRankings :monsters="metrics.monsters" />
        </ChronicleSection>

        <ChronicleSection folio="III" id="chronicle-pace" :intro="t('chronicles.paceIntro')" :label="t('chronicles.pace')"
          :title="t('chronicles.pace')">
          <PaceRankings :durations="metrics.durations" />
        </ChronicleSection>
      </ore-grid>

      <ChronicleSection class="chronicle__recent" folio="IV" id="chronicle-recent" :intro="t('chronicles.recentHuntsIntro')"
        :label="t('chronicles.recentHunts')" :title="t('chronicles.recentHunts')">
        <RecentHunts :records="metrics.recentHunts" />
      </ChronicleSection>

      <ChronicleSection folio="V" id="chronicle-hunters" :intro="t('chronicles.companyIntro')" :label="t('chronicles.company')"
        :title="t('chronicles.company')">
        <HunterCompany :by-hunter="metrics.byHunter" :hunter-counts="metrics.hunters" />
      </ChronicleSection>
    </template>
  </div>
</template>

<style scoped>
.chronicle {
  --prism-axis-color: var(--p-line-strong);
  --prism-bg: transparent;
  --prism-color-1: var(--p-gold);
  --prism-color-2: var(--p-blood);
  --prism-color-3: var(--p-river);
  --prism-color-4: var(--p-moss);
  --prism-font-family: var(--p-body);
  --prism-grid-color: var(--p-line);
  --prism-grid-opacity: 0.32;
  --prism-text-color: var(--p-text);
  --prism-text-color-secondary: var(--p-text-muted);
  padding-bottom: var(--size-12);
}

/* The phone's folio chips: hidden while the wide layout keeps the folios side by side. */
.chronicle-jumps {
  display: none;
  margin-bottom: var(--size-4);
}

@media (width < 1024px) {
  .chronicle-jumps {
    display: flex;
    gap: var(--size-2);
    padding-bottom: var(--size-1);
    overflow-x: auto;
    scrollbar-width: none;
  }
}

.chronicle-jumps a {
  display: inline-flex;
  flex: none;
  align-items: center;
  min-height: 2.75rem;
  padding: var(--size-1) var(--size-3);
  font-size: var(--text-sm);
  color: var(--p-text);
  text-decoration: none;
  background: var(--p-panel-sunken);
  border: var(--border) solid var(--p-line);
  border-radius: var(--rounded-full);
}

.chronicle-jumps a:hover,
.chronicle-jumps a:focus-visible {
  border-color: var(--p-gold);
}

.chronicle-jumps a:focus-visible {
  outline: 2px solid var(--p-gold);
  outline-offset: 2px;
}

/* The chapter dividers: quiet pressed buttons with the gold voice, no filter toolbar framing. */
.chronicle__desktop-filter {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-3);
  margin-bottom: var(--size-6);
}

.chronicle__mode-filter,
.chronicle__party-filter {
  --button-radius: var(--rounded-sm);
}

.chronicle__mobile-filter {
  display: none;
  margin-bottom: var(--size-5);
}

.chronicle__empty-state {
  display: grid;
  gap: var(--size-3);
  justify-items: start;
  padding-block: var(--size-8);
  border-top: 1px solid var(--p-line);
}

.chronicle__rankings {
  --chronicle-ranked-row-height: calc(var(--size-9) + var(--size-3) + var(--size-1) + var(--size-1-5));
  margin-top: var(--size-7);
}

.chronicle__rankings>* {
  margin-top: 0;
}

.chronicle__filter-count {
  margin-inline-start: var(--size-1-5);
  font-size: var(--text-xs);
  font-variant-numeric: tabular-nums;
  color: var(--p-text-muted);
}

/* The pressed segment keeps the count's register readable: the gold tint stays in the panel
   family, the same active treatment the pace picks and roster rows wear, and its text takes
   the page voice — the tint follows the theme, so the pair reads in both. */
.chronicle__desktop-filter ore-button[aria-pressed='true'] {
  --button-bg: color-mix(in oklch, var(--p-gold) 14%, var(--p-panel));
  --button-border-color: var(--p-gold);
  --button-color: var(--p-text);
}

.chronicle__desktop-filter ore-button[aria-pressed='true'] .chronicle__filter-count {
  color: var(--p-text);
}

/* The journal's inline subject link: gold voice, understated rule, one grammar wherever a
   record names the game or creature it belongs to. */
.chronicle :deep(.chronicle__subject-link) {
  color: var(--p-gold);
  text-decoration: underline;
  text-decoration-color: var(--p-line-strong);
  text-underline-offset: 0.15em;
}

.chronicle :deep(.chronicle__subject-link:hover),
.chronicle :deep(.chronicle__subject-link:focus-visible) {
  text-decoration-color: var(--p-gold);
}

/* The shared empty line and hunt-count pill, wherever a chapter surface repeats them. */
.chronicle :deep(.chronicle__empty) {
  padding-block: var(--size-4);
  margin: 0;
  color: var(--p-text-muted);
}

.chronicle :deep(.chronicle__roster-count) {
  display: inline-flex;
  justify-self: start;
  padding: var(--size-0-5) var(--size-2);
  font-size: var(--text-xs);
  font-variant-numeric: tabular-nums;
  color: var(--p-text-muted);
  white-space: nowrap;
  background: var(--p-panel-sunken);
  border-radius: var(--rounded-full);
}

@media (width < 640px) {
  .chronicle__desktop-filter {
    display: none;
  }

  .chronicle__mobile-filter {
    display: grid;
    gap: var(--size-2);
  }
}
</style>
