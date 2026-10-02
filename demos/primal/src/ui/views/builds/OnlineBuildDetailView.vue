<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { catalog } from '../../../app/catalog';
import { notify } from '../../../app/events';
import { t, tp } from '../../../app/i18n';
import { importLoadout, loadouts, notifyError, settings, unpublishLoadout } from '../../../app/store';
import { navigate, useMediaQuery, useReadable, useRouteParams } from '../../../app/vue-bridge';
import { forgeById, hunterById } from '../../../content/index';
import type { CatalogEntry } from '../../../domain/catalog';
import { catalogActions } from '../../../domain/catalog-policy';
import { loadoutDeckContext, sameBuild } from '../../../domain/deck';
import { decodeLoadoutCode, type SharedBuild } from '../../../domain/loadout';
import BuildProfile from '../../components/deck/BuildProfile.vue';
import DeckEditor from '../../components/deck/DeckEditor.vue';
import LinkButton from '../../components/LinkButton.vue';
import PageHeader from '../../components/PageHeader.vue';
import PhaseBackButton from '../../components/PhaseBackButton.vue';
import PhaseDock from '../../components/PhaseDock.vue';
import PlayerBoard from '../../components/party/PlayerBoard.vue';
import '@vielzeug/refine/alert';
import '@vielzeug/refine/button';
import '@vielzeug/refine/card';
import '@vielzeug/refine/chip';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/text';

/**
 * One published build from the online catalog, presented exactly like the local build page:
 * the same editor span with its side rails — board and strength profile on one side, the
 * community byline on the other — but locked, because this build belongs to another player.
 * Saving it to the library is the dock's commit action; the strategy notes are private and
 * never travel with a published snapshot.
 */
const params = useRouteParams();
const owned = useReadable(settings);
const saved = useReadable(loadouts);

const entry = ref<CatalogEntry | null>(null);
const failed = ref(false);
const likeBusy = ref(false);

watch(
  () => params.value.entry,
  async (entryId) => {
    likeBusy.value = false;
    entry.value = null;
    failed.value = typeof entryId !== 'string' || !entryId;
    if (failed.value) return;
    try {
      entry.value = await catalog.get(entryId);
    } catch {
      /* an unreachable catalog is indistinguishable from a removed entry here */
    }
    if (!entry.value) failed.value = true;
  },
  { immediate: true },
);

const build = computed<SharedBuild | undefined>(() => {
  if (!entry.value) return undefined;
  try {
    return decodeLoadoutCode(entry.value.code);
  } catch {
    return undefined;
  }
});
const hunter = computed(() => (build.value ? hunterById(build.value.hunterId) : undefined));
const context = computed(() =>
  build.value && hunter.value
    ? loadoutDeckContext(owned.value.ownedExpansionIds, build.value, hunter.value)
    : undefined,
);
const weaponName = computed(() =>
  build.value?.equipment.weaponId ? forgeById(build.value.equipment.weaponId)?.name : undefined,
);

const principalId = catalog.identity()?.id;
const isOwn = computed(() => entry.value !== null && entry.value.author.id === principalId);
const authorLabel = computed(() => {
  if (!entry.value?.author.name) return isOwn.value ? t('builds.authorYou') : t('builds.authorAnonymous');
  return entry.value.author.name;
});
const canUnpublish = computed(
  () => entry.value !== null && catalogActions(catalog.identity(), entry.value).includes('unpublish'),
);
const alreadySaved = computed(() =>
  build.value
    ? saved.value.find((loadout) => loadout.hunterId === build.value?.hunterId && sameBuild(loadout, build.value!))
    : undefined,
);

/** The like rides the dock beside the save: optimistic, reconciled by the catalog's answer. */
async function toggleLike(): Promise<void> {
  const meta = entry.value;
  if (!meta || likeBusy.value) return;
  likeBusy.value = true;
  entry.value = {
    ...meta,
    likeCount: Math.max(meta.likeCount + (meta.liked ? -1 : 1), 0),
    liked: !meta.liked,
  };
  try {
    entry.value = await (meta.liked ? catalog.unlike(meta.id) : catalog.like(meta.id));
  } catch {
    entry.value = meta;
    notify('toasts.actionNotPossible', 'warning');
  } finally {
    likeBusy.value = false;
  }
}

/** Saves the published snapshot as one of the player's own builds and opens it for editing. */
function save(): void {
  if (!entry.value) return;
  try {
    const loadout = importLoadout(entry.value.code);
    void navigate('buildEdit', { id: loadout.id }, undefined, { replace: true });
  } catch (error) {
    notifyError('deck.importInvalid', error);
  }
}

/** Removing one's own publication unpublishes the local build it came from. */
function removeOnline(): void {
  const id = entry.value?.id;
  if (!id) return;
  const local = loadouts.value.find((loadout) => loadout.catalogEntryId === id);
  if (!local) return;
  unpublishLoadout(local.id);
  void navigate('builds', undefined, { tab: 'online' });
}

/** The dock's phone tiers: the commit action shrinks to its glyph circle. */
const isPhone = useMediaQuery('(width < 640px)');
</script>

<template>
  <div class="frame stack" v-if="entry && build && hunter && context">
    <PageHeader
      art="/backgrounds/bg_build.webp"
      :eyebrow="t('builds.onlineAuthor', { author: authorLabel })"
      :subtitle="weaponName ? t('deck.subtitle', { weapon: weaponName }) : t('deck.noWeaponHint')"
      :title="build.name" />

    <!-- The editor's working span, locked: the same layout the local build page shows. -->
    <div class="phase-flow" style="--phase-gap: var(--size-5)">
      <DeckEditor
        actions-in-dock
        locked
        :cards-hint="t('builds.cardsHint')"
        :context="context"
        :stored="build.deckCardIds"
        :stored-mastery-id="build.masteryCardId">
        <template #side-start>
          <div class="stack" style="--stack-gap: var(--size-5)">
            <ore-card class="board-card">
              <PlayerBoard
                :can-consume="false"
                :can-edit="false"
                :equipment="[]"
                :hunter="hunter"
                :member="build"
                :monster="null"
                :potions="[]" />
            </ore-card>
            <BuildProfile
              :build="{ deckCardIds: build.deckCardIds, equipment: build.equipment, masteryCardId: build.masteryCardId }"
              :hunter="hunter" />
          </div>
        </template>

        <template #side-end>
          <!-- The community byline: this build's author and its likes. The strategy rail
               belongs to the author alone; a published snapshot never carries it. -->
          <section aria-labelledby="online-about-title" class="catalog-about stack">
            <div class="card-title">
              <div>
                <ore-text as="h2" id="online-about-title" size="sm" variant="heading">{{ t('builds.onlineEyebrow') }}</ore-text>
                <ore-text color="muted" size="sm">{{ t('builds.onlineAuthor', { author: authorLabel }) }}</ore-text>
              </div>
            </div>
            <ore-chip size="sm" variant="flat">{{ tp('builds.likesCount', entry.likeCount) }}</ore-chip>
          </section>
        </template>
      </DeckEditor>

      <PhaseDock>
        <template #back>
          <PhaseBackButton to="builds" :label="t('common.back')" :query="{ tab: 'online' }" />
        </template>
        <ore-button
          color="secondary"
          :disabled="likeBusy"
          :label="entry.liked ? t('builds.unlike') : t('builds.likeAria', { name: entry.name })"
          :variant="entry.liked ? 'solid' : 'bordered'"
          @click="toggleLike">
          <ore-icon name="heart" slot="prefix" />
          {{ tp('builds.likesCount', entry.likeCount) }}
        </ore-button>
        <LinkButton
          color="secondary"
          to="buildEdit"
          variant="bordered"
          v-if="alreadySaved"
          :params="{ id: alreadySaved.id }">
          <ore-icon name="external-link" slot="prefix" />
          {{ t('deck.importOpenSaved', { name: alreadySaved.name }) }}
        </LinkButton>
        <ore-button
          color="secondary"
          variant="bordered"
          v-if="canUnpublish"
          :label="t('builds.unpublishOnline')"
          @click="removeOnline">
          <ore-icon name="eye-off" slot="prefix" />
          {{ t('builds.unpublishOnline') }}
        </ore-button>
        <ore-button
          color="primary"
          variant="solid"
          :icon-only="isPhone"
          :label="alreadySaved ? t('deck.importSaveCopy') : t('deck.importSave')"
          :rounded="isPhone ? 'full' : undefined"
          @click="save">
          <ore-icon name="download" :slot="isPhone ? null : 'prefix'" />
          <template v-if="!isPhone">{{ alreadySaved ? t('deck.importSaveCopy') : t('deck.importSave') }}</template>
        </ore-button>
      </PhaseDock>
    </div>
  </div>

  <div class="frame stack" style="text-align: center; padding-block: var(--size-16); justify-items: center" v-else>
    <ore-text variant="overline">{{ t('builds.onlineEyebrow') }}</ore-text>
    <ore-text as="h1" size="lg" variant="heading">{{ t('builds.onlineMissing') }}</ore-text>
    <LinkButton to="builds" variant="bordered" :query="{ tab: 'online' }" >{{ t('common.back') }}</LinkButton>
  </div>
</template>

<style scoped>
.board-card {
  --card-padding: clamp(1rem, 2vw, 1.5rem);
}

.catalog-about {
  align-content: start;
  padding: var(--size-4);
  background: var(--p-panel-sunken);
  border: var(--border) solid var(--p-line);
  border-radius: var(--rounded-md);
}
</style>
