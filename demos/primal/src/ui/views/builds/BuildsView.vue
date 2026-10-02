<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { notify } from '../../../app/events';
import { timeAgo } from '../../../app/format';
import { t, tp } from '../../../app/i18n';
import {
  ascents,
  campaigns,
  createLoadout,
  duplicateLoadout,
  expeditions,
  loadouts,
  notifyError,
  publishLoadout,
  removeLoadout,
  renameLoadout,
  runCommand,
  settings,
  unpublishLoadout,
} from '../../../app/store';
import { navigate, useReadable, useRouteQuery } from '../../../app/vue-bridge';
import { forgeById, hunterById, monsterById, resources, weaponClassById } from '../../../content/index';
import {
  ascentDeckContext,
  type BuildAvailability,
  buildAvailability,
  campaignDeckContext,
  expeditionDeckContext,
  loadoutDeckContext,
  validateDeck,
} from '../../../domain/deck';
import { LOADOUT_NAME_MAX, loadoutCodeFromText } from '../../../domain/loadout';
import { availableHunters } from '../../../domain/party';
import type { ElementId, GameMode, HunterLoadout } from '../../../domain/types';
import BuildEmblem from '../../components/BuildEmblem.vue';
import ConfirmDialog from '../../components/ConfirmDialog.vue';
import DeckComposition from '../../components/deck/DeckComposition.vue';
import LinkButton from '../../components/LinkButton.vue';
import PageHeader from '../../components/PageHeader.vue';
import PageHeaderAction from '../../components/PageHeaderAction.vue';
import PaginationControls from '../../components/PaginationControls.vue';
import HunterIdentity from '../../components/party/HunterIdentity.vue';
import RecordActions from '../../components/RecordActions.vue';
import SavedSessionCard from '../../components/SavedSessionCard.vue';
import ShareDialog from '../../components/share/ShareDialog.vue';
import { buildShareSubject, type ShareSubject } from '../../components/share/share-subject';
import { useLocalPagination } from '../../composables/use-local-pagination';
import BuildsOnlinePanel from './BuildsOnlinePanel.vue';
import '@vielzeug/refine/button';
import '@vielzeug/refine/card';
import '@vielzeug/refine/chip';
import '@vielzeug/refine/dialog';
import '@vielzeug/refine/grid';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/input';
import '@vielzeug/refine/list';
import '@vielzeug/refine/list-item';
import '@vielzeug/refine/qr-scanner';
import '@vielzeug/refine/select';
import '@vielzeug/refine/switch';
import '@vielzeug/refine/tab-item';
import '@vielzeug/refine/tabs';
import '@vielzeug/refine/text';

/**
 * The build library: every saved build on this device in one list, newest first, each marked with its
 * weapon class icon. Builds are created and edited here against the owned boxes and loaded onto campaign or
 * expedition boards from there.
 */
const all = useReadable(loadouts);
const owned = useReadable(settings);
const hunters = computed(() => availableHunters(owned.value.ownedExpansionIds));

const routeQuery = useRouteQuery();
// Library scope lives in the URL (`?tab=`): deep links pick the starting half, tab switches
// update the address in place (no new history entry), and back from a build's page returns
// to the half the player left.
const tab = computed<'local' | 'online'>(() => (routeQuery.value.tab === 'online' ? 'online' : 'local'));

const selectTab = (event: Event): void => {
  const value = (event as CustomEvent<{ value: string }>).detail?.value;
  if ((value === 'local' || value === 'online') && value !== tab.value)
    void navigate('builds', undefined, { tab: value }, { replace: true });
};

/** The page header follows the scope: the library's own words, or the community's. */
const headerEyebrow = computed(() => (tab.value === 'online' ? t('builds.onlineEyebrow') : t('builds.eyebrow')));
const headerSubtitle = computed(() => (tab.value === 'online' ? t('builds.onlineHint') : t('builds.subtitle')));

// ---------------------------------------------------------------------------
// Publish
// ---------------------------------------------------------------------------

/** Builds whose publish or unpublish call is still in flight: their switch stays inert. */
const publishing = ref(new Set<string>());

/** The row switch: on publishes the current snapshot, off queues the no-orphan unpublish. */
async function toggleOnline(loadout: HunterLoadout, next: boolean): Promise<void> {
  if (publishing.value.has(loadout.id)) return;
  publishing.value.add(loadout.id);
  try {
    if (next) await publishLoadout(loadout.id);
    else unpublishLoadout(loadout.id);
  } catch (error) {
    notifyError('toasts.actionNotPossible', error);
  } finally {
    publishing.value.delete(loadout.id);
  }
}

const elements = resources.filter((entry) => entry.category === 'element');

const query = ref('');
const filterHunterId = ref<'all' | string>('all');
const filterElement = ref<'all' | ElementId>('all');

// The chronicle's dossier links here with `?hunter=`: preset its filter and stop listening.
const stopHunterDeepLink = watch(
  () => routeQuery.value.hunter,
  (raw) => {
    if (typeof raw === 'string' && hunterById(raw)) {
      filterHunterId.value = raw;
      stopHunterDeepLink();
    }
  },
  { immediate: true },
);
const sortBy = ref<'recent' | 'oldest' | 'name'>('recent');
const rows = computed(() => {
  const needle = query.value.trim().toLowerCase();
  const filtered = [...all.value]
    .map((loadout) => {
      const hunter = hunterById(loadout.hunterId);
      const weapon = loadout.equipment.weaponId ? forgeById(loadout.equipment.weaponId) : undefined;
      return {
        elements: new Set(
          Object.values(loadout.equipment).flatMap((id) => {
            const piece = id ? forgeById(id) : undefined;
            return piece?.element ? [piece.element] : [];
          }),
        ),
        hunter,
        loadout,
        report: hunter
          ? validateDeck(loadout.deckCardIds, loadoutDeckContext(owned.value.ownedExpansionIds, loadout, hunter))
          : undefined,
        weapon,
      };
    })
    .filter((row) => {
      if (filterHunterId.value !== 'all' && row.loadout.hunterId !== filterHunterId.value) return false;
      if (filterElement.value !== 'all' && !row.elements.has(filterElement.value)) return false;
      if (!needle) return true;
      return `${row.loadout.name} ${row.hunter?.name ?? ''} ${row.weapon?.name ?? ''}`.toLowerCase().includes(needle);
    });
  return filtered.sort((left, right) => {
    if (sortBy.value === 'name') return left.loadout.name.localeCompare(right.loadout.name);
    return sortBy.value === 'recent'
      ? right.loadout.updatedAt.localeCompare(left.loadout.updatedAt)
      : left.loadout.updatedAt.localeCompare(right.loadout.updatedAt);
  });
});
const hasFilters = computed(
  () => query.value.trim().length > 0 || filterHunterId.value !== 'all' || filterElement.value !== 'all',
);
const hasActiveControls = computed(() => hasFilters.value || sortBy.value !== 'recent');

type BuildRow = {
  elements: Set<ElementId>;
  hunter: ReturnType<typeof hunterById>;
  loadout: HunterLoadout;
  report: ReturnType<typeof validateDeck> | undefined;
  weapon: ReturnType<typeof forgeById>;
};
const { source: buildSource, state: buildPageState } = useLocalPagination<BuildRow>(rows, 10);

// Filter changes produce a new list: return to the first page so the matches are visible
// (the source itself keeps the current page and only clamps overflow).
watch([query, filterHunterId, filterElement, sortBy], () => buildSource.first());

const selectValue = (event: Event) =>
  (event as CustomEvent<{ value: string }>).detail?.value ?? (event.target as HTMLSelectElement).value;

function clearFilters(): void {
  query.value = '';
  filterHunterId.value = 'all';
  filterElement.value = 'all';
  sortBy.value = 'recent';
}

// ---------------------------------------------------------------------------
// New build
// ---------------------------------------------------------------------------

const creating = ref(false);
const newBuildHunterId = ref('');
const newBuildName = ref('');
const createdId = ref('');

function openNewBuild(): void {
  newBuildHunterId.value = '';
  newBuildName.value = '';
  creating.value = true;
}

/** Creates the build in place: the list keeps focus, the new row pulses, and the toast carries Open. */
function confirmNewBuild(): void {
  if (!newBuildHunterId.value) return;
  const loadout = createLoadout(newBuildHunterId.value, newBuildName.value);
  creating.value = false;
  createdId.value = loadout.id;
  window.setTimeout(() => {
    if (createdId.value === loadout.id) createdId.value = '';
  }, 2000);
  notify('toasts.buildCreated', 'success', {
    actions: [{ key: 'common.open', onClick: () => void navigate('buildEdit', { id: loadout.id }) }],
    values: { name: loadout.name },
  });
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

const importing = ref(false);
const importText = ref('');

/** Hand the code to the shared preview route; it decodes, shows the build and only saves on confirm. */
function confirmImport(): void {
  const code = loadoutCodeFromText(importText.value);
  if (!code) return;
  importing.value = false;
  importText.value = '';
  void navigate('loadoutImport', { code });
}

/** A scanned QR carries the share link: route it through the same code extraction as pasted text. */
function onImportScan(event: Event): void {
  const code = loadoutCodeFromText((event as CustomEvent<{ value: string }>).detail.value);
  if (!code) return;
  importing.value = false;
  importText.value = '';
  void navigate('loadoutImport', { code });
}

// ---------------------------------------------------------------------------
// Manage
// ---------------------------------------------------------------------------

const renaming = ref<HunterLoadout | null>(null);
const deleting = ref<HunterLoadout | null>(null);
/** The share surface and the online status it reports, opened together. */
const sharing = ref<ShareSubject | null>(null);
const draftName = ref('');

function manage(loadout: HunterLoadout, action: string): void {
  if (action === 'load') loadingBuild.value = loadout;
  else if (action === 'rename') {
    draftName.value = loadout.name;
    renaming.value = loadout;
  } else if (action === 'duplicate') duplicateLoadout(loadout.id);
  else if (action === 'share')
    sharing.value = buildShareSubject({ build: loadout, published: loadout.catalogEntryId !== undefined });
  else if (action === 'delete') deleting.value = loadout;
}

function confirmRename(): void {
  if (!renaming.value || !draftName.value.trim()) return;
  renameLoadout(renaming.value.id, draftName.value);
  renaming.value = null;
}

function confirmDelete(): void {
  if (!deleting.value) return;
  removeLoadout(deleting.value.id);
  deleting.value = null;
}

// ---------------------------------------------------------------------------
// Load onto a board
// ---------------------------------------------------------------------------

const loadingBuild = ref<HunterLoadout | null>(null);
const allCampaigns = useReadable(campaigns);
const allExpeditions = useReadable(expeditions);
const allAscents = useReadable(ascents);

interface LoadTarget {
  availability: BuildAvailability;
  kind: GameMode;
  missing: number;
  name: string;
  ref: { id: string; kind: GameMode };
}

const kindLabel = (kind: GameMode): string =>
  t(
    kind === 'campaign' ? 'builds.kindCampaign' : kind === 'expedition' ? 'builds.kindExpedition' : 'builds.kindAscent',
  );

/** Every saved session whose party includes the build's hunter, priced against what it can supply. */
const loadTargets = computed<LoadTarget[]>(() => {
  const build = loadingBuild.value;
  if (!build) return [];
  const hunter = hunterById(build.hunterId);
  if (!hunter) return [];
  const targets: LoadTarget[] = [];
  const push = (kind: GameMode, id: string, name: string, availability: BuildAvailability): void => {
    targets.push({
      availability,
      kind,
      missing:
        availability.missingCardIds.length +
        availability.missingEquipmentIds.length +
        availability.missingPotionIds.length,
      name,
      ref: { id, kind },
    });
  };
  for (const campaign of allCampaigns.value) {
    const member = campaign.hunters.find((entry) => entry.hunterId === build.hunterId);
    if (member)
      push(
        'campaign',
        campaign.id,
        campaign.name,
        buildAvailability(build, campaignDeckContext(campaign, member, hunter)),
      );
  }
  for (const expedition of allExpeditions.value) {
    const member = expedition.hunters.find((entry) => entry.hunterId === build.hunterId);
    if (member) {
      const name = monsterById(expedition.monsterId ?? '')?.name ?? t('expeditions.unknownMonster');
      push(
        'expedition',
        expedition.id,
        name,
        buildAvailability(build, expeditionDeckContext(expedition, member, hunter)),
      );
    }
  }
  for (const ascent of allAscents.value) {
    const member = ascent.hunters.find((entry) => entry.hunterId === build.hunterId);
    if (member)
      push('ascent', ascent.id, ascent.name, buildAvailability(build, ascentDeckContext(ascent, member, hunter)));
  }
  return targets;
});

function confirmLoad(target: LoadTarget): void {
  const build = loadingBuild.value;
  if (!build || !target.availability.available) return;
  // applyLoadout is undoable in the store, so the toast carries Undo automatically.
  runCommand('applyLoadout', target.ref, build.hunterId, build);
  loadingBuild.value = null;
}

function onLoadDialogChange(event: Event): void {
  if (event.target !== event.currentTarget) return;
  if (!(event as CustomEvent<{ open: boolean }>).detail.open) loadingBuild.value = null;
}
</script>

<template>
  <div class="frame stack builds">
    <PageHeader
      art="/backgrounds/bg_builds.webp"
      compact
      :eyebrow="headerEyebrow"
      :subtitle="headerSubtitle"
      :title="t('builds.title')">
      <template #center>
        <ore-tabs color="primary" variant="frost" :label="t('builds.tabLabel')" :value="tab" @change="selectTab">
          <ore-tab-item slot="tabs" value="local">{{ t('builds.tabLocal') }}</ore-tab-item>
          <ore-tab-item slot="tabs" value="online">{{ t('builds.onlineTab') }}</ore-tab-item>
        </ore-tabs>
      </template>
      <template #actions>
        <PageHeaderAction icon="download" kind="secondary" @click="importing = true">
          {{ t('builds.import') }}
        </PageHeaderAction>
        <PageHeaderAction icon="plus" kind="primary" :disabled="!hunters.length" @click="openNewBuild">
          {{ t('builds.newBuild') }}
        </PageHeaderAction>
      </template>
    </PageHeader>

    <BuildsOnlinePanel v-if="tab === 'online'" />

    <template v-else>
    <div class="builds__tools">
      <ore-input
        rounded="sm"
        type="search"
        variant="bordered"
        :label="t('builds.searchLabel')"
        :placeholder="t('builds.searchPlaceholder')"
        :value="query"
        @input="query = ($event.target as HTMLInputElement).value" />
      <ore-select
        rounded="sm"
        variant="bordered"
        :label="t('builds.filterLabel')"
        :value="filterHunterId"
        @change="filterHunterId = selectValue($event)">
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
        @change="filterElement = selectValue($event) as 'all' | ElementId">
        <option value="all">{{ t('forge.allElements') }}</option>
        <option v-for="entry in elements" :key="entry.id" :value="entry.id">{{ entry.name }}</option>
      </ore-select>
      <ore-select
        rounded="sm"
        variant="bordered"
        :label="t('builds.sortLabel')"
        :value="sortBy"
        @change="sortBy = selectValue($event) as 'recent' | 'oldest' | 'name'">
        <option value="recent">{{ t('builds.sortRecent') }}</option>
        <option value="oldest">{{ t('builds.sortOldest') }}</option>
        <option value="name">{{ t('builds.sortName') }}</option>
      </ore-select>
    </div>

    <div class="builds__list-status">
      <ore-text aria-live="polite" color="muted" role="status" size="sm">
        {{ tp('builds.resultCount', buildPageState.pagination.totalItems) }}
      </ore-text>
      <ore-button rounded="sm" size="sm" variant="ghost" v-if="hasActiveControls" @click="clearFilters">
        {{ t('builds.clearFilters') }}
      </ore-button>
    </div>

    <section aria-labelledby="builds-list-title">
      <h2 class="visually-hidden" id="builds-list-title">{{ t('builds.title') }}</h2>
      <ore-grid cols="1" gap="md" v-if="buildPageState.items.length">
        <div
          v-for="row in buildPageState.items"
          :key="row.loadout.id"
          :class="{ 'builds__row--created': row.loadout.id === createdId }">
          <SavedSessionCard
            :context="
              t('builds.hunterContext', {
                hunter: row.hunter?.name ?? row.loadout.hunterId,
                weapon: row.weapon
                  ? `${row.weapon.name} · ${t('party.levelShort')} ${row.weapon.level}`
                  : t('deck.noWeapon'),
              })
            "
            :last-label="t('builds.updated', { date: timeAgo(row.loadout.updatedAt) })"
            :title="row.loadout.name">
            <template #status>
              <ore-switch
                color="primary"
                size="sm"
                :checked="row.loadout.catalogEntryId !== undefined"
                :disabled="publishing.has(row.loadout.id)"
                @change="toggleOnline(row.loadout, ($event.target as HTMLInputElement).checked)">
                {{ t('builds.published') }}
              </ore-switch>
            </template>
            <template #marker>
              <BuildEmblem :hunter="row.hunter" />
            </template>
            <template #meta>
              <DeckComposition compact v-if="row.report" :report="row.report" />
            </template>
            <template #actions>
              <LinkButton
                color="primary"
                size="sm"
                to="buildEdit"
                variant="solid"
                :aria-label="t('common.openAria', { name: row.loadout.name })"
                :params="{ id: row.loadout.id }">
                {{ t('common.open') }}
              </LinkButton>
              <RecordActions
                :actions="[
                  { action: 'load', icon: 'library', label: t('builds.loadOnto') },
                  { action: 'rename', icon: 'pencil', label: t('deck.rename') },
                  { action: 'duplicate', icon: 'copy', label: t('deck.duplicate') },
                  { action: 'share', icon: 'share-2', label: t('deck.share') },
                  { action: 'delete', danger: true, icon: 'trash-2', label: t('common.delete') },
                ]"
                @select="manage(row.loadout, $event)" />
            </template>
          </SavedSessionCard>
        </div>
      </ore-grid>

      <ore-card padding="xl" v-else-if="buildPageState.pagination.totalItems === 0 && hasFilters">
        <div class="stack" style="justify-items: start; --stack-gap: 0.75rem">
          <ore-text variant="overline">{{ t('builds.eyebrow') }}</ore-text>
          <ore-text as="h3" size="md" variant="heading">{{ t('builds.emptyNoMatch') }}</ore-text>
        </div>
      </ore-card>

      <ore-card padding="xl" v-else-if="buildPageState.pagination.totalItems === 0">
        <div class="stack" style="justify-items: start; --stack-gap: 0.75rem">
          <ore-text variant="overline">{{ t('builds.emptyEyebrow') }}</ore-text>
          <ore-text as="h3" size="md" variant="heading">{{ t('builds.emptyTitle') }}</ore-text>
          <ore-text color="muted">{{ t('builds.emptyHint') }}</ore-text>
          <ore-button
            color="primary"
            rounded="sm"
            size="sm"
            variant="solid"
            :disabled="!hunters.length"
            @click="openNewBuild">
            <ore-icon name="bookmark-plus" slot="prefix" />
            {{ t('builds.newBuild') }}
          </ore-button>
        </div>
      </ore-card>
    </section>

    <PaginationControls :pagination="buildPageState.pagination" @page="(p) => buildSource.goTo(p)" />
    </template>

    <ConfirmDialog
      size="md"
      :confirm-disabled="!newBuildHunterId"
      :confirm-label="t('builds.createBuild')"
      :open="creating"
      :title="t('party.chooseHunter')"
      @cancel="creating = false"
      @confirm="confirmNewBuild">
      <div class="stack" style="--stack-gap: 0.65rem">
        <fieldset class="hunter-picker" :aria-label="t('party.chooseHunter')">
          <button
            class="hunter-picker__row"
            type="button"
            v-for="hunter in hunters"
            :key="hunter.id"
            :aria-pressed="hunter.id === newBuildHunterId"
            @click="newBuildHunterId = hunter.id">
            <HunterIdentity :hunter="hunter" />
          </button>
        </fieldset>
        <ore-input
          fullwidth
          :label="t('builds.nameLabel')"
          :maxlength="LOADOUT_NAME_MAX"
          :placeholder="t('builds.namePlaceholder')"
          :value="newBuildName"
          @input="newBuildName = ($event.target as HTMLInputElement).value" />
      </div>
    </ConfirmDialog>

    <ConfirmDialog
      :confirm-disabled="!loadoutCodeFromText(importText)"
      :confirm-icon="'download'"
      :confirm-label="t('builds.importConfirm')"
      :open="importing"
      :title="t('builds.importTitle')"
      @cancel="importing = false"
      @confirm="confirmImport">
      <form class="stack" @submit.prevent="confirmImport">
        <ore-qr-scanner :active="importing" :label="t('builds.scanLabel')" @scan="onImportScan">
          <span slot="unsupported">{{ t('builds.scanUnsupported') }}</span>
        </ore-qr-scanner>
        <ore-input
          fullwidth
          :label="t('builds.importLabel')"
          :placeholder="t('builds.importPlaceholder')"
          :value="importText"
          @input="importText = ($event.target as HTMLInputElement).value" />
        <ore-text color="muted" size="sm">{{ t('deck.importHint') }}</ore-text>
      </form>
    </ConfirmDialog>

    <ConfirmDialog
      :confirm-disabled="!draftName.trim()"
      :confirm-label="t('common.save')"
      :open="renaming !== null"
      :title="t('deck.renameTitle')"
      @cancel="renaming = null"
      @confirm="confirmRename">
      <form @submit.prevent="confirmRename">
        <ore-input
          fullwidth
          :label="t('deck.nameLabel')"
          :maxlength="LOADOUT_NAME_MAX"
          :value="draftName"
          @input="draftName = ($event.target as HTMLInputElement).value" />
      </form>
    </ConfirmDialog>

    <ConfirmDialog
      danger
      :confirm-label="t('common.delete')"
      :open="deleting !== null"
      :title="t('deck.deleteTitle')"
      @cancel="deleting = null"
      @confirm="confirmDelete">
      <ore-text>{{ t('deck.deleteBody', { name: deleting?.name }) }}</ore-text>
    </ConfirmDialog>

    <ShareDialog :subject="sharing" @close="sharing = null" />

    <ore-dialog
      backdrop="blur"
      size="md"
      :label="t('builds.loadTitle', { name: loadingBuild?.name ?? '' })"
      :open="loadingBuild !== null"
      @open-change="onLoadDialogChange">
      <div class="load-picker stack" v-if="loadingBuild">
        <ore-text color="muted" size="sm">{{ t('builds.loadHint') }}</ore-text>
        <ore-list
          class="load-picker__list"
          v-if="loadTargets.length"
          :aria-label="t('builds.loadTitle', { name: loadingBuild.name })">
          <ore-list-item v-for="target in loadTargets" :key="`${target.ref.kind}:${target.ref.id}`">
            <div class="load-picker__row">
              <div class="load-picker__body">
                <span class="cluster" style="--cluster-gap: var(--size-2)">
                  <ore-text as="span" size="sm" variant="heading">{{ target.name }}</ore-text>
                  <ore-chip size="sm" variant="outline">{{ kindLabel(target.kind) }}</ore-chip>
                  <ore-chip color="warning" size="sm" variant="flat" v-if="target.missing">
                    {{ tp('deck.loadoutUnavailable', target.missing) }}
                  </ore-chip>
                </span>
              </div>
              <ore-button
                color="primary"
                size="sm"
                variant="solid"
                :aria-label="t('builds.loadAria', { name: loadingBuild.name })"
                :disabled="!target.availability.available"
                @click="confirmLoad(target)">
                {{ t('builds.loadOnto') }}
              </ore-button>
            </div>
          </ore-list-item>
        </ore-list>
        <ore-text color="muted" size="sm" v-else>
          {{ t('builds.loadNoTargets', { hunter: hunterById(loadingBuild.hunterId)?.name ?? loadingBuild.hunterId }) }}
        </ore-text>
        <div class="cluster" style="justify-content: flex-end">
          <ore-button size="sm" variant="bordered" @click="loadingBuild = null">{{ t('common.close') }}</ore-button>
        </div>
      </div>
    </ore-dialog>
  </div>
</template>

<style scoped>
.builds {
  --stack-gap: var(--size-8);
}

/* The tools row's grid lives in the shared theme: the online catalog renders it too. */

/* The result-count row's layout lives in the shared theme: the online catalog renders it too. */

/* Small weapon-and-name cards for choosing a hunter in the new-build dialog. */
.hunter-picker {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
  min-width: 0;
  padding: 0;
  margin: 0;
  border: 0;
}

.hunter-picker__row {
  --hunter-identity-glyph-color: var(--p-gold-dim);
  display: flex;
  gap: 0.6rem;
  align-items: center;
  min-width: 0;
  padding: 0.35rem 0.6rem;
  font-family: inherit;
  text-align: start;
  cursor: pointer;
  background: var(--p-panel-sunken);
  border: var(--border) solid transparent;
  border-radius: var(--rounded-sm);
  transition:
    background var(--p-motion) var(--p-ease),
    border-color var(--p-motion) var(--p-ease);
}

.hunter-picker__row:hover {
  background: color-mix(in oklch, var(--p-gold) 6%, var(--p-panel-sunken));
}

.hunter-picker__row[aria-pressed='true'] {
  --hunter-identity-glyph-color: light-dark(var(--color-primary-content), var(--p-gold));
  background: color-mix(in oklch, var(--p-gold) 10%, var(--p-panel));
  border-color: light-dark(var(--color-primary-content), var(--p-gold));
}

.builds__row--created {
  animation: build-created 2s ease-out;
}

@keyframes build-created {
  0% {
    box-shadow: inset 0 0 0 2px color-mix(in oklch, var(--color-success) 70%, transparent);
  }
  100% {
    box-shadow: inset 0 0 0 2px transparent;
  }
}

@media (prefers-reduced-motion: reduce) {
  .builds__row--created {
    animation: none;
  }
}

.load-picker__row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-3);
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.load-picker__body {
  min-width: 0;
}

.hunter-picker__icon {
  display: block;
  width: 3.5rem;
  height: 3.5rem;
  margin-inline: auto;
}

/* Stack the page's sections closer on narrow screens; the tools row's stacking rules
   live in the shared theme. */
@media (width < 720px) {
  .builds {
    --stack-gap: var(--size-4);
  }
}
/* Two columns stay readable when the dialog goes nearly full-width on phones. */
@media (width < 480px) {
  .hunter-picker {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
