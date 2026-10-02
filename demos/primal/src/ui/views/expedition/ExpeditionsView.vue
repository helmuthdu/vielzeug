<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { asset } from '../../../app/assets';
import { timeAgo } from '../../../app/format';
import { t, tp } from '../../../app/i18n';
import { expeditions, removeSubject, replayExpedition } from '../../../app/store';
import { navigate, useReadable } from '../../../app/vue-bridge';
import { hunterById, monsterById, scenarioById } from '../../../content/index';
import type { Expedition } from '../../../domain/types';
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

const all = useReadable(expeditions);
const deleting = ref<Expedition | null>(null);
const query = ref('');
const filterHunterId = ref('all');
const sortBy = ref<'recent' | 'oldest' | 'name'>('recent');
const hunterOptions = computed(() => {
  const ids = new Set(all.value.flatMap((expedition) => expedition.hunters.map((member) => member.hunterId)));
  return [...ids]
    .flatMap((id) => {
      const hunter = hunterById(id);
      return hunter ? [hunter] : [];
    })
    .sort((left, right) => left.name.localeCompare(right.name));
});
const list = computed(() =>
  [...all.value]
    .map((expedition) => ({
      expedition,
      monster: expedition.monsterId ? monsterById(expedition.monsterId) : undefined,
      scenario: expedition.scenarioId ? scenarioById(expedition.scenarioId) : undefined,
    }))
    .filter(({ expedition }) =>
      filterHunterId.value === 'all' || expedition.hunters.some((member) => member.hunterId === filterHunterId.value),
    )
    .filter(({ expedition, monster, scenario }) => {
      const needle = query.value.trim().toLowerCase();
      if (!needle) return true;
      const hunters = expedition.hunters.map(({ hunterId }) => hunterById(hunterId)?.name ?? hunterId).join(' ');
      return `${monster?.name ?? ''} ${scenario?.name ?? ''} ${hunters}`
        .toLowerCase()
        .includes(needle);
    })
    .sort((left, right) => {
      if (sortBy.value === 'name') {
        return (left.monster?.name ?? t('expeditions.unknownMonster')).localeCompare(
          right.monster?.name ?? t('expeditions.unknownMonster'),
        );
      }
      return sortBy.value === 'recent'
        ? right.expedition.updatedAt.localeCompare(left.expedition.updatedAt)
        : left.expedition.updatedAt.localeCompare(right.expedition.updatedAt);
    }),
);
const hasFilters = computed(() => query.value.trim().length > 0 || filterHunterId.value !== 'all');
const hasActiveControls = computed(() => hasFilters.value || sortBy.value !== 'recent');

type ExpeditionRow = { expedition: Expedition; monster: ReturnType<typeof monsterById>; scenario: ReturnType<typeof scenarioById> };
const { source, state: pageState } = useLocalPagination<ExpeditionRow>(list, 10);

// Filter changes produce a new list: return to the first page so the matches are visible.
watch([query, filterHunterId, sortBy], () => source.first());

const selectValue = (event: Event) =>
  (event as CustomEvent<{ value: string }>).detail?.value ?? (event.target as HTMLSelectElement).value;

function clearFilters(): void {
  query.value = '';
  filterHunterId.value = 'all';
  sortBy.value = 'recent';
}
const statusColor = (expedition: Expedition) =>
  expedition.result === 'victory' ? 'success' : expedition.result === 'defeat' ? 'error' : 'primary';
const statusLabel = (expedition: Expedition) => t(`expeditions.status.${expedition.result ?? expedition.status}`);

function manage(expedition: Expedition, action: string): void {
  if (action === 'replay') {
    const replay = replayExpedition(expedition.id);
    if (replay) void navigate('expeditionDetail', { id: replay.id });
  }
  if (action === 'delete') deleting.value = expedition;
}

function confirmDelete(): void {
  if (deleting.value) removeSubject({ id: deleting.value.id, kind: 'expedition' });
  deleting.value = null;
}
</script>

<template>
  <div class="frame stack expeditions">
    <PageHeader
      art="/backgrounds/bg_expedition.webp"
      compact
      :eyebrow="t('expeditions.eyebrow')"
      :subtitle="t('expeditions.subtitle')"
      :title="t('expeditions.title')">
      <template #actions>
        <PageHeaderAction icon="plus" kind="primary" to="expeditionCreate">
          {{ t('expeditions.newExpedition') }}
        </PageHeaderAction>
      </template>
    </PageHeader>

    <div class="expeditions__tools">
      <ore-input
        rounded="sm"
        type="search"
        variant="bordered"
        :label="t('expeditions.searchLabel')"
        :placeholder="t('expeditions.searchPlaceholder')"
        :value="query"
        @input="query = ($event.target as HTMLInputElement).value" />
      <ore-select
        rounded="sm"
        variant="bordered"
        :label="t('expeditions.hunterLabel')"
        :value="filterHunterId"
        @change="filterHunterId = selectValue($event)">
        <option value="all">{{ t('expeditions.hunterAll') }}</option>
        <option v-for="hunter in hunterOptions" :key="hunter.id" :value="hunter.id">{{ hunter.name }}</option>
      </ore-select>
      <ore-select
        rounded="sm"
        variant="bordered"
        :label="t('expeditions.sortLabel')"
        :value="sortBy"
        @change="sortBy = selectValue($event) as 'recent' | 'oldest' | 'name'">
        <option value="recent">{{ t('expeditions.sortRecent') }}</option>
        <option value="oldest">{{ t('expeditions.sortOldest') }}</option>
        <option value="name">{{ t('expeditions.sortName') }}</option>
      </ore-select>
    </div>

    <div class="expeditions__list-status">
      <ore-text aria-live="polite" color="muted" role="status" size="sm">
        {{ tp('expeditions.resultCount', pageState.pagination.totalItems) }}
      </ore-text>
      <ore-button rounded="sm" size="sm" variant="ghost" v-if="hasActiveControls" @click="clearFilters">
        {{ t('expeditions.clearFilters') }}
      </ore-button>
    </div>

    <section aria-labelledby="expeditions-list-title">
      <h2 class="visually-hidden" id="expeditions-list-title">{{ t('expeditions.title') }}</h2>
    <ore-grid cols="1" gap="md" v-if="pageState.items.length">
      <SavedSessionCard
        v-for="{ expedition, monster, scenario } in pageState.items"
        :key="expedition.id"
        :context="t('expeditions.context', { aggression: expedition.aggression ?? 'N/A', number: scenario?.number ?? 'N/A' })"
        :last-label="
          expedition.trialScore
            ? t('campaigns.score', { score: expedition.trialScore.total })
            : t('session.lastPlayed', { date: timeAgo(expedition.updatedAt) })
        "
        :title="monster?.name ?? t('expeditions.unknownMonster')">
        <template #marker>
          <img alt="" class="expedition-save__emblem" :src="asset(monster?.trophyIcon ?? '')" />
        </template>
        <template #status>
          <ore-chip size="sm" style="text-transform: capitalize" variant="solid" :color="statusColor(expedition)">
            {{ statusLabel(expedition) }}
          </ore-chip>
        </template>
        <template #meta>
          <span class="cluster" style="--cluster-gap: 0.25rem">
            <span class="visually-hidden">{{ t('campaigns.party') }}</span>
            <ore-avatar
              rounded="sm"
              size="sm"
              v-for="{ hunterId: id } in expedition.hunters"
              :key="id"
              :alt="hunterById(id)?.name ?? id"
              :src="asset(hunterById(id)?.artwork ?? '')" />
          </span>
        </template>
        <template #actions>
          <LinkButton
            color="secondary"
            size="sm"
            to="expeditionDetail"
            variant="solid"
            :aria-label="t('common.openAria', { name: monster?.name ?? t('expeditions.expeditionFallback') })"
            :params="{ id: expedition.id }">
            {{ t('common.open') }}
          </LinkButton>
          <RecordActions
            :actions="[
              ...(expedition.status === 'played'
                ? [{ action: 'replay', icon: 'rotate-ccw', label: t('expeditions.playAgain') }]
                : []),
              { action: 'delete', danger: true, icon: 'trash-2', label: t('common.delete') },
            ]"
            @select="manage(expedition, $event)" />
        </template>
      </SavedSessionCard>
    </ore-grid>

    <ore-card padding="xl" v-else-if="pageState.pagination.totalItems === 0 && hasFilters">
      <div class="stack" style="justify-items: start; --stack-gap: 0.75rem">
        <ore-text as="h2" size="md" variant="heading">{{ t('expeditions.noMatch') }}</ore-text>
      </div>
    </ore-card>

    <ore-card padding="xl" v-else-if="pageState.pagination.totalItems === 0">
      <div class="stack" style="justify-items: start; --stack-gap: 0.75rem">
        <ore-text variant="overline">{{ t('expeditions.emptyEyebrow') }}</ore-text>
        <ore-text as="h2" size="md" variant="heading">{{ t('expeditions.emptyTitle') }}</ore-text>
        <ore-text color="muted">{{ t('expeditions.emptyHint') }}</ore-text>
      </div>
    </ore-card>
    </section>

    <PaginationControls
      :pagination="pageState.pagination"
      @page="(p) => source.goTo(p)" />

    <ConfirmDialog
      danger
      :confirm-label="t('common.delete')"
      :open="deleting !== null"
      :title="t('expeditions.deleteTitle')"
      @cancel="deleting = null"
      @confirm="confirmDelete">
      <ore-text>{{ t('expeditions.deleteBody') }}</ore-text>
    </ConfirmDialog>
  </div>
</template>

<style scoped>
.expeditions {
  --stack-gap: var(--size-8);
}

.expeditions__tools {
  display: grid;
  grid-template-columns: minmax(14rem, 1.4fr) repeat(2, minmax(9rem, 0.7fr));
  gap: 0.65rem;
}

.expeditions__tools ore-input {
  --input-radius: var(--rounded-sm);
}

.expeditions__tools ore-select {
  --input-radius: var(--rounded-sm);
  --input-min-width: 0;
  --select-radius: var(--rounded-sm);
  --select-min-width: 0;
}

.expeditions__list-status {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-2);
  align-items: center;
  justify-content: space-between;
}

.expedition-save__emblem {
  object-fit: contain;
  filter: drop-shadow(var(--drop-shadow-sm));
}

@media (width < 720px) {
  .expeditions {
    --stack-gap: var(--size-4);
  }

  .expeditions__tools {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .expeditions__tools ore-input {
    grid-column: 1 / -1;
  }
}
</style>
