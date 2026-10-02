<script lang="ts" setup>
import { computed } from 'vue';
import { asset } from '../../app/assets';
import { formatDuration } from '../../app/format';
import { t, tp } from '../../app/i18n';
import { useRouteParams } from '../../app/vue-bridge';
import { finalBattle, hunterById, monsterById, questById, scenarioById, trialSeriesById, weaponClassById } from '../../content';
import { PrimalDomainError } from '../../domain/errors';
import { decodeVictoryCode, type SharedVictory, victoryRank } from '../../domain/victory';
import LinkButton from '../components/LinkButton.vue';
import ResultHero from '../components/ResultHero.vue';
import { victoryModeLabel, victoryResultArt } from '../components/result-art';
import '@vielzeug/refine/button';
import '@vielzeug/refine/chip';
import '@vielzeug/refine/text';

/**
 * Deep link for a shared hunt record: decodes the code and shows the summary the sender shared:
 * the mode's result art, the party, and the stats the poster carries. It is a memento to read:
 * nothing is saved, and the call-to-actions point at starting a run of one's own.
 */
const params = useRouteParams();

const decoded = computed<{ victory: SharedVictory } | { error: string }>(() => {
  try {
    return { victory: decodeVictoryCode(params.value.code ?? '') };
  } catch (error) {
    if (error instanceof PrimalDomainError && error.message.includes('not supported')) {
      return { error: t('victory.importUnsupported') };
    }
    return { error: t('victory.importInvalid') };
  }
});

const victory = computed(() => ('victory' in decoded.value ? decoded.value.victory : undefined));
const monster = computed(() => (victory.value?.monsterId ? monsterById(victory.value.monsterId) : undefined));
const party = computed(() => (victory.value ? victory.value.hunterIds.flatMap((id) => hunterById(id) ?? []) : []));
const title = computed(() => victory.value?.name ?? monster.value?.name ?? t('victory.importTitle'));

/** The hunt's context line: what the poster draws as the eyebrow under the mode. */
const context = computed(() => {
  const current = victory.value;
  if (!current) return undefined;
  switch (current.mode) {
    case 'campaign-hunt':
      return current.questId ? (questById(current.questId)?.name ?? undefined) : undefined;
    case 'campaign-final':
      return monster.value?.name;
    case 'expedition':
      return current.scenarioId ? (scenarioById(current.scenarioId)?.name ?? undefined) : undefined;
    case 'challenge':
      return current.seriesId ? (trialSeriesById(current.seriesId)?.name ?? undefined) : undefined;
    case 'ascent':
      return current.chapter !== null ? t('victory.chapterChip', { number: current.chapter }) : undefined;
  }
});

/** One stat row entry: the label the result screens print for this number. */
interface StatEntry {
  key: string;
  value: string;
}

const stats = computed<StatEntry[]>(() => {
  const current = victory.value;
  if (!current) return [];
  const entries: StatEntry[] = [];
  if (current.chapter !== null && current.mode !== 'ascent') {
    entries.push({ key: 'victory.chapterChip', value: t('victory.chapterChip', { number: current.chapter }) });
  }
  if (current.mode === 'campaign-final' && current.endingId) {
    entries.push({
      key: 'victory.endingChip',
      value: finalBattle.endings[current.endingId].title,
    });
  }
  const kills = current.defeatedMonsterIds?.length ?? 0;
  if (current.mode === 'ascent' && kills > 0) {
    entries.push({ key: 'victory.trophiesChip', value: tp('victory.trophiesChip', kills, { count: kills }) });
  }
  if (current.finished && current.mode === 'ascent') {
    entries.push({ key: 'victory.summitChip', value: t('victory.summitChip') });
  }
  if (current.score !== null) {
    entries.push({ key: 'victory.scoreChip', value: t('victory.scoreChip', { score: current.score }) });
  }
  const rank = victoryRank(current);
  if (rank) entries.push({ key: 'victory.rankChip', value: rank });
  if (current.durationMs !== null) {
    entries.push({ key: 'victory.durationChip', value: t('victory.durationChip', { duration: formatDuration(current.durationMs) }) });
  }
  return entries;
});

/** The mode's own "start yours" target: the natural next step for whoever scans the code. */
const startTarget = computed(() => {
  switch (victory.value?.mode) {
    case 'campaign-hunt':
    case 'campaign-final':
      return { label: t('victory.startCampaign'), to: 'campaignCreate' as const };
    case 'expedition':
      return { label: t('victory.startExpedition'), to: 'expeditionCreate' as const };
    case 'challenge':
      return { label: t('victory.startChallenge'), to: 'challengeCreate' as const };
    case 'ascent':
      return { label: t('victory.startAscent'), to: 'ascentCreate' as const };
    default:
      return undefined;
  }
});
</script>

<template>
  <div class="frame stack" style="--stack-gap: var(--size-5)" v-if="victory">
    <ResultHero :final="victory.finished" :image="victoryResultArt(victory)">
      <ore-text variant="overline">{{ victoryModeLabel(victory.mode) }}</ore-text>
      <ore-text as="h1" size="lg" variant="heading">{{ title }}</ore-text>
      <ore-text color="muted" size="sm" v-if="context">{{ context }}</ore-text>
      <div aria-hidden="true" class="record__emblem" v-if="monster">
        <img alt="" :src="asset(monster.trophyIcon)" />
      </div>
    </ResultHero>

    <section aria-labelledby="record-party-title" class="stack" style="--stack-gap: var(--size-3)" v-if="party.length > 0" >
      <ore-text as="h3" id="record-party-title" size="sm" variant="heading">{{ t('victory.importParty') }}</ore-text>
      <ul class="record__party">
        <li class="record__hunter" v-for="hunter in party" :key="hunter.id">
          <img alt="" :src="asset(hunter.artwork)" />
          <ore-text size="sm" variant="heading">{{ hunter.name }}</ore-text>
          <ore-chip size="sm" variant="flat">{{ weaponClassById(hunter.classId).name }}</ore-chip>
        </li>
      </ul>
    </section>

    <section aria-labelledby="record-stats-title" class="stack" style="--stack-gap: var(--size-3)" v-if="stats.length > 0" >
      <ore-text as="h3" id="record-stats-title" size="sm" variant="heading">{{ t('victory.importStats') }}</ore-text>
      <div class="cluster" style="--cluster-gap: var(--size-2)">
        <ore-chip color="primary" size="sm" variant="solid" v-for="stat in stats" :key="stat.key">
          {{ stat.value }}
        </ore-chip>
      </div>
    </section>

    <div class="cluster" style="--cluster-gap: var(--size-2)" v-if="startTarget">
      <LinkButton color="primary" variant="solid" :to="startTarget.to">
        <ore-icon name="plus" slot="prefix" />
        {{ startTarget.label }}
      </LinkButton>
    </div>
  </div>

  <div class="frame stack" style="text-align: center; padding-block: 4rem; justify-items: center" v-else>
    <ore-text variant="overline">{{ t('victory.importEyebrow') }}</ore-text>
    <ore-text as="h1" size="lg" variant="heading">{{ t('victory.notFoundTitle') }}</ore-text>
    <ore-text color="muted" size="sm">{{ 'error' in decoded ? decoded.error : '' }}</ore-text>
  </div>
</template>

<style scoped>
.record__emblem {
  display: grid;
  place-items: center;
  width: 5.5rem;
  height: 5.5rem;
  margin-top: var(--size-2);
  overflow: hidden;
  background: color-mix(in oklch, var(--p-panel) 88%, transparent);
  border: var(--border) solid var(--p-line);
  border-radius: 50%;
}

.record__emblem img {
  width: 72%;
  height: 72%;
  object-fit: contain;
}

.record__party {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
  gap: var(--size-3);
  padding: 0;
  margin: 0;
  list-style: none;
}

.record__hunter {
  display: grid;
  gap: var(--size-1);
  justify-items: center;
  padding: var(--size-3);
  text-align: center;
  background: var(--p-panel-sunken);
  border: var(--border) solid var(--p-line);
  border-radius: var(--rounded-md);
}

.record__hunter img {
  width: 6rem;
  height: 6rem;
  object-fit: cover;
  object-position: top center;
  border-radius: var(--rounded-sm);
}
</style>
