<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { catalog } from '../../../app/catalog';
import { notify } from '../../../app/events';
import { t, tp } from '../../../app/i18n';
import { loadouts, settings, unpublishLoadout } from '../../../app/store';
import { useReadable } from '../../../app/vue-bridge';
import { forgeById, hunters, resources, weaponClassById } from '../../../content/index';
import type { CatalogEntry } from '../../../domain/catalog';
import { catalogActions } from '../../../domain/catalog-policy';
import { loadoutDeckContext, validateDeck } from '../../../domain/deck';
import { decodeLoadoutCode } from '../../../domain/loadout';
import type { Hunter } from '../../../domain/types';
import BuildEmblem from '../../components/BuildEmblem.vue';
import DeckComposition from '../../components/deck/DeckComposition.vue';
import LinkButton from '../../components/LinkButton.vue';
import PaginationControls from '../../components/PaginationControls.vue';
import RecordActions from '../../components/RecordActions.vue';
import SavedSessionCard from '../../components/SavedSessionCard.vue';
import { useCatalogList } from '../../composables/use-catalog-list';
import '@vielzeug/refine/alert';
import '@vielzeug/refine/button';
import '@vielzeug/refine/card';
import '@vielzeug/refine/grid';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/input';
import '@vielzeug/refine/select';
import '@vielzeug/refine/skeleton';
import '@vielzeug/refine/text';

/**
 * The online half of the build library: every player's published snapshots, ranked and
 * paged by the catalog. Rows carry the same legality report as local builds (judged
 * against this device's owned boxes), the author's name, and the actions the policy
 * grants: like and open for anyone's build, unpublish for one's own.
 */
const owned = useReadable(settings);
/** The element filter's options: the same resource list the local library filters by. */
const elements = resources.filter((entry) => entry.category === 'element');
const filterHunterId = ref<'all' | string>('all');
const filterElement = ref<'all' | string>('all');
const search = ref('');
const sortBy = ref<'liked' | 'recent'>('recent');

const { source, state } = useCatalogList(catalog, {
  elementId: 'all',
  hunterId: 'all',
  search: '',
  sort: 'recent',
});

// Filter or ranking changes restart the ranked list from its first page.
watch([search, filterHunterId, filterElement, sortBy], () => {
  void source
    .setParams({ elementId: filterElement.value, hunterId: filterHunterId.value, search: search.value, sort: sortBy.value })
    .catch(() => undefined);
});

/** Optimistic like patches layered over the committed page: a like never reloads the list. */
const likePatches = ref(new Map<string, { likeCount: number; liked: boolean }>());
const likeBusy = ref(new Set<string>());

const principalId = catalog.identity()?.id;
const isOwn = (entry: CatalogEntry): boolean => entry.author.id === principalId;

/** The author line: named authors, else "You" for own entries, else an anonymous hunter. */
function authorName(entry: CatalogEntry): string {
  if (entry.author.name) return entry.author.name;
  return isOwn(entry) ? t('builds.authorYou') : t('builds.authorAnonymous');
}

interface OnlineRow {
  author: string;
  context: string;
  entry: CatalogEntry;
  hunter: Hunter | undefined;
  likeCount: number;
  liked: boolean;
  report: ReturnType<typeof validateDeck> | undefined;
}

/** One decorated row: the decoded snapshot judged against this device's owned boxes. */
const rows = computed<OnlineRow[]>(() =>
  state.value.items.map((entry) => {
    let hunter: Hunter | undefined;
    let report: ReturnType<typeof validateDeck> | undefined;
    let context = entry.name;
    let weaponName: string | undefined;
    try {
      const build = decodeLoadoutCode(entry.code);
      hunter = hunters.find((candidate) => candidate.id === build.hunterId);
      weaponName = build.equipment.weaponId ? forgeById(build.equipment.weaponId)?.name : undefined;
      if (hunter) {
        context = t('builds.hunterContext', {
          hunter: hunter.name,
          weapon: weaponName ?? t('deck.noWeapon'),
        });
        report = validateDeck(build.deckCardIds, loadoutDeckContext(owned.value.ownedExpansionIds, build, hunter));
      }
    } catch {
      /* a snapshot the catalog should not have shipped: it still opens and imports, reports stay off */
    }
    const patch = likePatches.value.get(entry.id);
    return {
      author: authorName(entry),
      context,
      entry,
      hunter,
      likeCount: patch?.likeCount ?? entry.likeCount,
      liked: patch?.liked ?? entry.liked,
      report,
    };
  }),
);

async function toggleLike(row: OnlineRow): Promise<void> {
  if (likeBusy.value.has(row.entry.id)) return;
  const next = { likeCount: Math.max(row.likeCount + (row.liked ? -1 : 1), 0), liked: !row.liked };
  likePatches.value.set(row.entry.id, next);
  likePatches.value = new Map(likePatches.value);
  likeBusy.value.add(row.entry.id);
  try {
    const entry = await (row.liked ? catalog.unlike(row.entry.id) : catalog.like(row.entry.id));
    likePatches.value.set(entry.id, { likeCount: entry.likeCount, liked: entry.liked });
  } catch {
    likePatches.value.delete(row.entry.id);
    notify('toasts.actionNotPossible', 'warning');
  } finally {
    likeBusy.value.delete(row.entry.id);
    likePatches.value = new Map(likePatches.value);
  }
}

/** The published entry belongs to a local build of ours: removing it unpublishes that build. */
function manage(row: OnlineRow, action: string): void {
  if (action !== 'unpublish') return;
  const loadout = loadouts.value.find((entry) => entry.catalogEntryId === row.entry.id);
  if (!loadout) return;
  unpublishLoadout(loadout.id);
  void source.reload().catch(() => undefined);
}

const selectValue = (event: Event): string =>
  (event as CustomEvent<{ value: string }>).detail?.value ?? (event.target as HTMLSelectElement).value;

/** Any filter or a non-default ranking: what the clear button resets. */
const hasActiveControls = computed(
  () =>
    search.value.trim() !== '' ||
    filterHunterId.value !== 'all' ||
    filterElement.value !== 'all' ||
    sortBy.value !== 'recent',
);

function clearFilters(): void {
  search.value = '';
  filterHunterId.value = 'all';
  filterElement.value = 'all';
  sortBy.value = 'recent';
}
</script>

<template>
  <div class="stack builds-online">
    <div class="builds__tools">
      <ore-input
        rounded="sm"
        type="search"
        variant="bordered"
        :label="t('builds.searchLabel')"
        :placeholder="t('builds.onlineSearchPlaceholder')"
        :value="search"
        @input="search = ($event.target as HTMLInputElement).value" />
      <ore-select
        rounded="sm"
        variant="bordered"
        :label="t('builds.filterLabel')"
        :value="filterHunterId"
        @change="filterHunterId = selectValue($event) as 'all' | string">
        <option value="all">{{ t('builds.filterAll') }}</option>
        <option v-for="hunter in hunters" :key="hunter.id" :value="hunter.id">
          {{ hunter.name }} · {{ weaponClassById(hunter.classId).name }}
        </option>
      </ore-select>
      <ore-select
        rounded="sm"
        variant="bordered"
        :label="t('forge.element')"
        :value="filterElement"
        @change="filterElement = selectValue($event) as 'all' | string">
        <option value="all">{{ t('forge.allElements') }}</option>
        <option v-for="entry in elements" :key="entry.id" :value="entry.id">{{ entry.name }}</option>
      </ore-select>
      <ore-select
        rounded="sm"
        variant="bordered"
        :label="t('builds.sortLabel')"
        :value="sortBy"
        @change="sortBy = selectValue($event) as 'liked' | 'recent'">
        <option value="recent">{{ t('builds.sortRecent') }}</option>
        <option value="liked">{{ t('builds.onlineSortLiked') }}</option>
      </ore-select>
    </div>

    <div class="builds__list-status">
      <ore-text aria-live="polite" color="muted" role="status" size="sm">
        {{ tp('builds.resultCount', state.pagination.totalItems ?? 0) }}
      </ore-text>
      <ore-button rounded="sm" size="sm" variant="ghost" v-if="hasActiveControls" @click="clearFilters">
        {{ t('builds.clearFilters') }}
      </ore-button>
    </div>

    <ore-alert variant="bordered" v-if="state.error" >{{ t('builds.publishUnreachable') }}</ore-alert>

    <div class="stack" v-else-if="state.loading && !state.items.length">
      <ore-skeleton class="builds-online__skeleton" v-for="index in 3" :key="index" />
    </div>

    <ore-card padding="xl" v-else-if="!state.items.length">
      <div class="stack" style="justify-items: start; --stack-gap: 0.75rem">
        <ore-text variant="overline">{{ t('builds.onlineEyebrow') }}</ore-text>
        <ore-text as="h3" size="md" variant="heading">{{ t('builds.onlineEmptyTitle') }}</ore-text>
        <ore-text color="muted">{{ t('builds.onlineEmptyHint') }}</ore-text>
      </div>
    </ore-card>

    <ore-grid cols="1" gap="md" v-else>
      <SavedSessionCard
        v-for="row in rows"
        :key="row.entry.id"
        :context="row.context"
        :last-label="`${t('builds.byAuthor', { author: row.author })} · ${tp('builds.likesCount', row.likeCount)}`"
        :title="row.entry.name">
        <template #marker>
          <BuildEmblem :hunter="row.hunter" />
        </template>
        <template #meta>
          <DeckComposition compact v-if="row.report" :report="row.report" />
        </template>
        <template #actions>
          <ore-button
            size="sm"
            :label="row.liked ? t('builds.unlike') : t('builds.likeAria', { name: row.entry.name })"
            :variant="row.liked ? 'solid' : 'bordered'"
            @click="toggleLike(row)">
            <ore-icon name="heart" slot="prefix" />
            {{ tp('builds.likesCount', row.likeCount) }}
          </ore-button>
          <LinkButton
            color="primary"
            size="sm"
            to="onlineBuild"
            variant="solid"
            :aria-label="t('builds.viewBuildAria', { name: row.entry.name })"
            :params="{ entry: row.entry.id }">
            {{ t('builds.viewBuild') }}
          </LinkButton>
          <RecordActions
            v-if="catalogActions(catalog.identity(), row.entry).includes('unpublish')"
            :actions="[{ action: 'unpublish', icon: 'eye-off', label: t('builds.unpublishOnline') }]"
            @select="manage(row, $event)" />
        </template>
      </SavedSessionCard>
    </ore-grid>

    <PaginationControls
      :pagination="state.pagination"
      @next="source.next().catch(() => undefined)"
      @previous="source.previous().catch(() => undefined)" />
  </div>
</template>

<style scoped>
.builds-online__skeleton {
  --skeleton-height: var(--size-16);
  --skeleton-width: 100%;
}
</style>
