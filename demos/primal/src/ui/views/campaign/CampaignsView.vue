<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { asset } from '../../../app/assets';
import { notify } from '../../../app/events';
import { timeAgo } from '../../../app/format';
import { t, tp } from '../../../app/i18n';
import { challenges, duplicateAscent, duplicateCampaign, recentAscents, recentCampaigns, removeSubject, restartChallenge, runCommand, startAscent } from '../../../app/store';
import { navigate, useReadable } from '../../../app/vue-bridge';
import { chapterByNumber, hunterById, monsterById, trialSeriesById } from '../../../content/index';
import { ASCENT_NAME_MAX } from '../../../domain/ascent';
import { huntersTrialCampaignOver } from '../../../domain/campaign';
import { CHALLENGE_EXPEDITIONS_TOTAL, challengeTotal } from '../../../domain/challenge';
import type { Ascent, Campaign, Challenge } from '../../../domain/types';
import ConfirmDialog from '../../components/ConfirmDialog.vue';
import LinkButton from '../../components/LinkButton.vue';
import PageHeader from '../../components/PageHeader.vue';
import PageHeaderAction from '../../components/PageHeaderAction.vue';
import PaginationControls from '../../components/PaginationControls.vue';
import RecordActions from '../../components/RecordActions.vue';
import SavedSessionCard from '../../components/SavedSessionCard.vue';
import { useLocalPagination } from '../../composables/use-local-pagination';
import '@vielzeug/refine/avatar';
import '@vielzeug/refine/button';
import '@vielzeug/refine/card';
import '@vielzeug/refine/chip';
import '@vielzeug/refine/grid';
import '@vielzeug/refine/input';
import '@vielzeug/refine/select';
import '@vielzeug/refine/text';

type RunKind = 'all' | 'campaign' | 'ascent' | 'winds';
type RunSort = 'recent' | 'oldest' | 'name';
type SavedRun =
  | {
      chapter: number;
      context: string;
      hunters: string[];
      id: string;
      kind: 'campaign';
      name: string;
      record: Campaign;
      status: { color: 'error' | 'primary' | 'success'; label: string };
      updatedAt: string;
    }
  | {
      chapter: number;
      context: string;
      hunters: string[];
      id: string;
      kind: 'ascent';
      name: string;
      record: Ascent;
      status: { color: 'error' | 'primary' | 'success'; label: string };
      updatedAt: string;
    }
  | {
      context: string;
      hunters: string[];
      id: string;
      kind: 'winds';
      name: string;
      record: Challenge;
      status: { color: 'error' | 'primary' | 'success'; label: string };
      updatedAt: string;
    };

const campaigns = useReadable(recentCampaigns);
const ascents = useReadable(recentAscents);
const winds = useReadable(challenges);
const query = ref('');
const filterKind = ref<RunKind>('all');
const filterHunterId = ref('all');
const sortBy = ref<RunSort>('recent');
const deleting = ref<Campaign | null>(null);
const deletingAscent = ref<Ascent | null>(null);
const deletingWinds = ref<Challenge | null>(null);
const renaming = ref<Campaign | Ascent | Challenge | null>(null);
const draftName = ref('');

const phaseKey: Record<Campaign['phase'], 'phases.hunt' | 'phases.preparing' | 'phases.questBoard' | 'phases.result'> = {
  hunt: 'phases.hunt',
  preparing: 'phases.preparing',
  'quest-board': 'phases.questBoard',
  result: 'phases.result',
};
const campaignStatus = (campaign: Campaign): { color: 'error' | 'primary' | 'success'; label: string } => {
  if (campaign.finalBattleWon) return { color: 'success', label: t('campaigns.complete') };
  if (huntersTrialCampaignOver(campaign)) return { color: 'error', label: t('campaigns.trialOver') };
  return { color: 'primary', label: t(phaseKey[campaign.phase]) };
};

function openRename(record: Campaign | Ascent | Challenge): void {
  renaming.value = record;
  draftName.value = record.name;
}

function confirmRename(): void {
  const target = renaming.value;
  const name = draftName.value.trim();
  if (!target || !name || name.length > ASCENT_NAME_MAX) return;
  const ref = { id: target.id, kind: target.kind };
  const renamed = runCommand('setSubjectName', ref, name);
  if (renamed) {
    notify(
      target.kind === 'ascent' ? 'toasts.ascentRenamed' : 'campaigns.renamed',
      'success',
      { values: { name } },
    );
  }
  renaming.value = null;
}

function confirmDelete(): void {
  if (deleting.value) removeSubject({ id: deleting.value.id, kind: 'campaign' });
  deleting.value = null;
}

function confirmDeleteAscent(): void {
  if (deletingAscent.value) removeSubject({ id: deletingAscent.value.id, kind: 'ascent' });
  deletingAscent.value = null;
}

function copy(campaign: Campaign): void {
  const next = duplicateCampaign(campaign.id);
  if (next) void navigate('campaignDashboard', { id: next.id });
}

function copyAscent(ascent: Ascent): void {
  const next = duplicateAscent(ascent.id);
  if (next) void navigate('ascentDetail', { id: next.id });
}

function restartAscent(ascent: Ascent): void {
  const next = startAscent('', ascent.hunters.map((member) => member.hunterId), ascent.expansionIds, ascent.nightmareVariant);
  void navigate('ascentDetail', { id: next.id });
}

function manage(campaign: Campaign, action: string): void {
  if (action === 'rename') openRename(campaign);
  else if (action === 'duplicate') copy(campaign);
  else if (action === 'delete') deleting.value = campaign;
}

function manageAscent(ascent: Ascent, action: string): void {
  if (action === 'rename') openRename(ascent);
  else if (action === 'duplicate') copyAscent(ascent);
  else if (action === 'restart') restartAscent(ascent);
  else if (action === 'delete') deletingAscent.value = ascent;
}

function restartWinds(run: Challenge): void {
  const next = restartChallenge(run.id);
  if (next) void navigate('challengeDetail', { id: next.id });
}

function manageWinds(run: Challenge, action: string): void {
  if (action === 'rename') openRename(run);
  else if (action === 'restart') restartWinds(run);
  else if (action === 'delete') deletingWinds.value = run;
}

function confirmDeleteWinds(): void {
  if (deletingWinds.value) removeSubject({ id: deletingWinds.value.id, kind: 'challenge' });
  deletingWinds.value = null;
}

function windsStatus(run: Challenge): { color: 'error' | 'primary' | 'success'; label: string } {
  if (run.status === 'finished') {
    return run.result === 'victory'
      ? { color: 'success', label: t('campaigns.windsWon') }
      : { color: 'error', label: t('campaigns.windsLost') };
  }
  return { color: 'primary', label: t('campaigns.windsRunning') };
}

/** The card's trophy art: the hunted monster, the last trophy, or the series' first monster. */
function windsMarker(run: Challenge): string | undefined {
  const hunted = monsterById(run.pending?.monsterId ?? run.defeatedMonsterIds.at(-1) ?? '');
  const first = monsterById(trialSeriesById(run.seriesId)?.monsters[0]?.monsterId ?? '');
  return hunted?.trophyIcon ?? first?.trophyIcon;
}

function ascentStatus(ascent: Ascent): { color: 'error' | 'primary' | 'success'; label: string } {
  if (ascent.status === 'finished') {
    return ascent.result === 'victory'
      ? { color: 'success', label: t('campaigns.ascentWon') }
      : { color: 'error', label: t('campaigns.ascentLost', { chapter: ascent.chapter }) };
  }
  return { color: 'primary', label: t(`ascentDetail.phase.${ascent.phase}`) };
}

const hunterOptions = computed(() => {
  const ids = new Set([
    ...campaigns.value.flatMap((campaign) => campaign.hunters.map((member) => member.hunterId)),
    ...ascents.value.flatMap((ascent) => ascent.hunters.map((member) => member.hunterId)),
    ...winds.value.flatMap((run) => run.hunters.map((member) => member.hunterId)),
  ]);
  return [...ids]
    .flatMap((id) => {
      const hunter = hunterById(id);
      return hunter ? [hunter] : [];
    })
    .sort((left, right) => left.name.localeCompare(right.name));
});

const runs = computed<SavedRun[]>(() => {
  const campaignRuns: SavedRun[] = campaigns.value.map((record) => ({
    chapter: record.chapter,
    context: t('campaigns.chapterContext', {
      chapter: record.chapter,
      title: chapterByNumber(record.chapter)?.title ?? t('campaigns.campaign'),
    }),
    hunters: record.hunters.map((member) => member.hunterId),
    id: record.id,
    kind: 'campaign',
    name: record.name,
    record,
    status: campaignStatus(record),
    updatedAt: record.updatedAt,
  }));
  const ascentRuns: SavedRun[] = ascents.value.map((record) => ({
    chapter: record.chapter,
    context: t('campaigns.ascentContext', {
      chapter: record.chapter,
      phase: t(`ascentDetail.phase.${record.phase}`),
    }),
    hunters: record.hunters.map((member) => member.hunterId),
    id: record.id,
    kind: 'ascent',
    name: record.name,
    record,
    status: ascentStatus(record),
    updatedAt: record.updatedAt,
  }));
  const windsRuns: SavedRun[] = winds.value.map((record) => ({
    context: t('campaigns.windsContext', {
      number: record.expeditionNumber,
      series: trialSeriesById(record.seriesId)?.name ?? '',
      total: CHALLENGE_EXPEDITIONS_TOTAL,
    }),
    hunters: record.hunters.map((member) => member.hunterId),
    id: record.id,
    kind: 'winds',
    name: record.name,
    record,
    status: windsStatus(record),
    updatedAt: record.updatedAt,
  }));
  const needle = query.value.trim().toLowerCase();
  return [...campaignRuns, ...ascentRuns, ...windsRuns]
    .filter((run) => filterKind.value === 'all' || run.kind === filterKind.value)
    .filter((run) => filterHunterId.value === 'all' || run.hunters.includes(filterHunterId.value))
    .filter((run) => {
      if (!needle) return true;
      const hunterNames = run.hunters.map((id) => hunterById(id)?.name ?? id).join(' ');
      return `${run.name} ${run.context} ${hunterNames} ${run.status.label}`.toLowerCase().includes(needle);
    })
    .sort((left, right) => {
      if (sortBy.value === 'name') return left.name.localeCompare(right.name);
      return sortBy.value === 'recent'
        ? right.updatedAt.localeCompare(left.updatedAt)
        : left.updatedAt.localeCompare(right.updatedAt);
    });
});

const hasFilters = computed(
  () => query.value.trim().length > 0 || filterKind.value !== 'all' || filterHunterId.value !== 'all',
);
const hasActiveControls = computed(() => hasFilters.value || sortBy.value !== 'recent');

const { source: runSource, state: runPageState } = useLocalPagination<SavedRun>(runs, 10);

// Filter changes produce a new list: return to the first page so the matches are visible.
watch([query, filterKind, filterHunterId, sortBy], () => runSource.first());
const selectValue = (event: Event) =>
  (event as CustomEvent<{ value: string }>).detail?.value ?? (event.target as HTMLSelectElement).value;

function clearFilters(): void {
  query.value = '';
  filterKind.value = 'all';
  filterHunterId.value = 'all';
  sortBy.value = 'recent';
}
</script>

<template>
  <div class="frame stack campaigns">
    <PageHeader
      art="/backgrounds/bg_campaign.webp"
      compact
      :eyebrow="t('campaigns.eyebrow')"
      :subtitle="t('campaigns.subtitle')"
      :title="t('campaigns.title')">
      <template #actions>
        <PageHeaderAction icon="plus" kind="primary" to="newGame">
          {{ t('campaigns.newGame') }}
        </PageHeaderAction>
      </template>
    </PageHeader>

    <div class="campaigns__tools">
      <ore-input
        rounded="sm"
        type="search"
        variant="bordered"
        :label="t('campaigns.searchLabel')"
        :placeholder="t('campaigns.searchPlaceholder')"
        :value="query"
        @input="query = ($event.target as HTMLInputElement).value" />
      <ore-select
        rounded="sm"
        variant="bordered"
        :label="t('campaigns.typeLabel')"
        :value="filterKind"
        @change="filterKind = selectValue($event) as RunKind">
        <option value="all">{{ t('campaigns.typeAll') }}</option>
        <option value="campaign">{{ t('campaigns.typeCampaign') }}</option>
        <option value="ascent">{{ t('campaigns.typeAscent') }}</option>
        <option value="winds">{{ t('campaigns.typeWinds') }}</option>
      </ore-select>
      <ore-select
        rounded="sm"
        variant="bordered"
        :label="t('campaigns.hunterLabel')"
        :value="filterHunterId"
        @change="filterHunterId = selectValue($event)">
        <option value="all">{{ t('campaigns.hunterAll') }}</option>
        <option v-for="hunter in hunterOptions" :key="hunter.id" :value="hunter.id">{{ hunter.name }}</option>
      </ore-select>
      <ore-select
        rounded="sm"
        variant="bordered"
        :label="t('campaigns.sortLabel')"
        :value="sortBy"
        @change="sortBy = selectValue($event) as RunSort">
        <option value="recent">{{ t('campaigns.sortRecent') }}</option>
        <option value="oldest">{{ t('campaigns.sortOldest') }}</option>
        <option value="name">{{ t('campaigns.sortName') }}</option>
      </ore-select>
    </div>

    <div class="campaigns__list-status">
      <ore-text aria-live="polite" color="muted" role="status" size="sm">
        {{ tp('campaigns.resultCount', runPageState.pagination.totalItems) }}
      </ore-text>
      <ore-button rounded="sm" size="sm" variant="ghost" v-if="hasActiveControls" @click="clearFilters">
        {{ t('campaigns.clearFilters') }}
      </ore-button>
    </div>

    <section aria-labelledby="runs-list-title">
      <h2 class="visually-hidden" id="runs-list-title">{{ t('campaigns.title') }}</h2>
      <ore-grid cols="1" gap="md" v-if="runPageState.items.length">
      <SavedSessionCard
        v-for="run in runPageState.items"
        :key="`${run.kind}:${run.id}`"
        :context="run.context"
        :last-label="
          run.kind === 'winds'
            ? t('campaigns.score', { score: challengeTotal(run.record) })
            : t('session.lastPlayed', { date: timeAgo(run.updatedAt) })
        "
        :title="run.name">
        <template #marker>
          <div class="save__chapter" v-if="run.kind !== 'winds'">
            <ore-text class="save__num" size="xl" variant="heading">{{ run.chapter }}</ore-text>
            <ore-text size="sm" variant="overline">{{ t('campaigns.chapter') }}</ore-text>
          </div>
          <img
            alt=""
            class="save__trophy"
            v-else-if="windsMarker(run.record)"
            :src="windsMarker(run.record)" />
        </template>
        <template #status>
          <span class="cluster" style="--cluster-gap: 0.4rem">
            <ore-chip size="sm" variant="outline">
              {{
                run.kind === 'campaign'
                  ? t('campaigns.typeCampaign')
                  : run.kind === 'ascent'
                    ? t('campaigns.typeAscent')
                    : t('campaigns.typeWinds')
              }}
            </ore-chip>
            <ore-chip size="sm" variant="solid" :color="run.status.color">{{ run.status.label }}</ore-chip>
          </span>
        </template>
        <template #meta>
          <span class="cluster" style="--cluster-gap: 0.35rem">
            <span class="visually-hidden">{{ t('campaigns.party') }}</span>
            <ore-avatar
              rounded="sm"
              size="sm"
              v-for="hunterId in run.hunters"
              :key="hunterId"
              :alt="hunterById(hunterId)?.name ?? hunterId"
              :src="asset(hunterById(hunterId)?.artwork ?? '')" />
          </span>
        </template>
        <template #actions>
          <LinkButton
            color="secondary"
            size="sm"
            to="campaignDashboard"
            variant="solid"
            v-if="run.kind === 'campaign'"
            :aria-label="t('campaigns.openAria', { name: run.name })"
            :params="{ id: run.id }">
            {{ t('campaigns.open') }}
          </LinkButton>
          <LinkButton
            color="secondary"
            size="sm"
            to="ascentDetail"
            variant="solid"
            v-else-if="run.kind === 'ascent'"
            :aria-label="t('campaigns.openAria', { name: run.name })"
            :params="{ id: run.id }">
            {{ t('campaigns.open') }}
          </LinkButton>
          <LinkButton
            color="secondary"
            size="sm"
            to="challengeDetail"
            variant="solid"
            v-else
            :aria-label="t('campaigns.openAria', { name: run.name })"
            :params="{ id: run.id }">
            {{ t('campaigns.open') }}
          </LinkButton>
          <RecordActions
            v-if="run.kind === 'campaign'"
            :actions="[
              { action: 'rename', icon: 'pencil', label: t('campaigns.rename') },
              { action: 'duplicate', icon: 'copy', label: t('campaigns.duplicate') },
              { action: 'delete', danger: true, icon: 'trash-2', label: t('campaigns.delete') },
            ]"
            @select="manage(run.record, $event)" />
          <RecordActions
            v-else-if="run.kind === 'ascent'"
            :actions="[
              { action: 'rename', icon: 'pencil', label: t('campaigns.rename') },
              ...(run.record.status === 'finished'
                ? [{ action: 'restart', icon: 'rotate-ccw', label: t(run.record.result === 'defeat' ? 'ascentDetail.retryAscent' : 'ascentDetail.restartAscent') }]
                : [{ action: 'duplicate', icon: 'copy', label: t('campaigns.duplicate') }]),
              { action: 'delete', danger: true, icon: 'trash-2', label: t('ascentDetail.deleteAscent') },
            ]"
            @select="manageAscent(run.record, $event)" />
          <RecordActions
            v-else
            :actions="[
              { action: 'rename', icon: 'pencil', label: t('campaigns.rename') },
              { action: 'restart', icon: 'rotate-ccw', label: t(run.record.result === 'defeat' ? 'challenge.retryRun' : run.record.status === 'finished' ? 'challenge.restartRun' : 'challenge.startFreshRun') },
              { action: 'delete', danger: true, icon: 'trash-2', label: t('challenge.deleteRun') },
            ]"
            @select="manageWinds(run.record, $event)" />
        </template>
      </SavedSessionCard>
      </ore-grid>
      <ore-card padding="xl" v-else-if="runPageState.pagination.totalItems === 0 && hasFilters">
        <div class="stack" style="justify-items: start; --stack-gap: 0.75rem">
          <ore-text as="h2" size="md" variant="heading">{{ t('campaigns.noRunsMatch') }}</ore-text>
        </div>
      </ore-card>
      <ore-card padding="xl" v-else-if="runPageState.pagination.totalItems === 0">
        <div class="stack" style="justify-items: start; --stack-gap: 0.75rem">
          <ore-text variant="overline">{{ t('campaigns.emptyRunsEyebrow') }}</ore-text>
          <ore-text as="h2" size="md" variant="heading">{{ t('campaigns.emptyRunsTitle') }}</ore-text>
          <ore-text color="muted">{{ t('campaigns.emptyRunsHint') }}</ore-text>
        </div>
      </ore-card>
    </section>

    <PaginationControls
      :pagination="runPageState.pagination"
      @page="(p) => runSource.goTo(p)" />

    <ConfirmDialog
      danger
      :confirm-label="t('campaigns.delete')"
      :open="deleting !== null"
      :title="t('campaigns.deleteTitle')"
      @cancel="deleting = null"
      @confirm="confirmDelete">
      <ore-text>
        {{ t('campaigns.deleteBody', { name: deleting?.name }) }}
      </ore-text>
    </ConfirmDialog>

    <ConfirmDialog
      danger
      :confirm-label="t('ascentDetail.deleteAscent')"
      :open="deletingAscent !== null"
      :title="t('ascentDetail.deleteTitle')"
      @cancel="deletingAscent = null"
      @confirm="confirmDeleteAscent">
      <ore-text>{{ t('ascentDetail.deleteBody') }}</ore-text>
    </ConfirmDialog>

    <ConfirmDialog
      danger
      :confirm-label="t('challenge.deleteRun')"
      :open="deletingWinds !== null"
      :title="t('challenge.deleteTitle')"
      @cancel="deletingWinds = null"
      @confirm="confirmDeleteWinds">
      <ore-text>{{ t('challenge.deleteBody', { name: deletingWinds?.name }) }}</ore-text>
    </ConfirmDialog>

    <ConfirmDialog
      :confirm-disabled="!draftName.trim() || draftName.trim().length > ASCENT_NAME_MAX"
      :confirm-label="t('campaigns.save')"
      :open="renaming !== null"
      :title="renaming?.kind === 'ascent' ? t('ascentDetail.renameTitle') : t('campaigns.renameTitle')"
      @cancel="renaming = null"
      @confirm="confirmRename">
      <form @submit.prevent="confirmRename">
        <ore-input
          fullwidth
          :label="
            renaming?.kind === 'ascent'
              ? t('ascentCreate.nameLabel')
              : renaming?.kind === 'challenge'
                ? t('challengeCreate.nameLabel')
                : t('campaignCreate.nameLabel')
          "
          :maxlength="ASCENT_NAME_MAX"
          :value="draftName"
          @input="draftName = ($event.target as HTMLInputElement).value" />
      </form>
    </ConfirmDialog>
  </div>
</template>

<style scoped>
.campaigns {
  --stack-gap: var(--size-8);
}

.save__chapter {
  display: grid;
  place-items: center;
  align-content: center;
}

.save__num {
  --text-color: var(--p-gold);
  line-height: 1;
}

.save__trophy {
  width: var(--session-marker-image-size, 4.5rem);
  height: var(--session-marker-image-size, 4.5rem);
  padding: var(--size-2);
  object-fit: contain;
}

.campaigns__tools {
  display: grid;
  grid-template-columns: minmax(14rem, 1.4fr) repeat(3, minmax(9rem, 0.7fr));
  gap: 0.65rem;
}

.campaigns__tools ore-input {
  --input-radius: var(--rounded-sm);
}

.campaigns__tools ore-select {
  --input-radius: var(--rounded-sm);
  --input-min-width: 0;
  --select-radius: var(--rounded-sm);
  --select-min-width: 0;
}

.campaigns__list-status {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-2);
  align-items: center;
  justify-content: space-between;
}

@media (width < 720px) {
  .campaigns {
    --stack-gap: var(--size-4);
  }

  .campaigns__tools {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .campaigns__tools ore-input {
    grid-column: 1 / -1;
  }
}
</style>
