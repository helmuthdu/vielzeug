<script lang="ts" setup>
import { computed, onBeforeUnmount, onUnmounted, ref, watch } from 'vue';
import { t } from '../../../app/i18n';
import {
  duplicateLoadout,
  hasUnpublishedChanges,
  loadouts,
  notifyError,
  publishLoadout,
  removeLoadout,
  renameLoadout,
  setLoadoutEquipment,
  setLoadoutPotion,
  setLoadoutStrategy,
  settings,
  unpublishLoadout,
  updateLoadoutBuild,
} from '../../../app/store';
import { navigate, useReadable, useRouteParams } from '../../../app/vue-bridge';
import { enabledContent, forgeById, hunterById, potions, weaponClassById } from '../../../content/index';
import { eligibleEquipment, loadoutDeckContext } from '../../../domain/deck';
import { LOADOUT_NAME_MAX, LOADOUT_STRATEGY_MAX } from '../../../domain/loadout';
import type { EquipmentSlot, PotionSlot } from '../../../domain/types';
import ActionsMenu from '../../components/ActionsMenu.vue';
import ConfirmDialog from '../../components/ConfirmDialog.vue';
import BuildProfile from '../../components/deck/BuildProfile.vue';
import DeckEditor from '../../components/deck/DeckEditor.vue';
import LinkButton from '../../components/LinkButton.vue';
import PageHeader from '../../components/PageHeader.vue';
import PhaseDock from '../../components/PhaseDock.vue';
import PlayerBoard from '../../components/party/PlayerBoard.vue';
import ShareDialog from '../../components/share/ShareDialog.vue';
import { buildShareSubject, type ShareSubject } from '../../components/share/share-subject';
import '@vielzeug/refine/alert';
import '@vielzeug/refine/button';
import '@vielzeug/refine/button-group';
import '@vielzeug/refine/card';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/input';
import '@vielzeug/refine/switch';
import '@vielzeug/refine/text';
import '@vielzeug/refine/textarea';
import '@vielzeug/refine/tooltip';

/**
 * Edits one saved build against the owned boxes: the player board on top (any class-eligible piece, any
 * potion, no hunt target) and the action deck below. Board changes apply at once (a new weapon refits the
 * deck); deck edits are drafted until saved.
 */
const params = useRouteParams();
const all = useReadable(loadouts);
const owned = useReadable(settings);
const loadout = computed(() => all.value.find((entry) => entry.id === params.value.id));
const hunter = computed(() => (loadout.value ? hunterById(loadout.value.hunterId) : undefined));
const context = computed(() =>
  loadout.value && hunter.value
    ? loadoutDeckContext(owned.value.ownedExpansionIds, loadout.value, hunter.value)
    : undefined,
);
const equipment = computed(() => (hunter.value ? eligibleEquipment(owned.value.ownedExpansionIds, hunter.value) : []));
const ownedPotions = computed(() => enabledContent(potions, owned.value.ownedExpansionIds));
const weaponName = computed(() =>
  loadout.value?.equipment.weaponId ? forgeById(loadout.value.equipment.weaponId)?.name : undefined,
);

function run(action: () => unknown): void {
  try {
    action();
  } catch (error) {
    notifyError('toasts.actionNotPossible', error);
  }
}

function changeEquipment(slot: EquipmentSlot, equipmentId: string | null): void {
  const id = loadout.value?.id;
  if (id) run(() => setLoadoutEquipment(id, slot, equipmentId));
}

function changePotion(slot: PotionSlot, potionId: string | null): void {
  const id = loadout.value?.id;
  if (id) run(() => setLoadoutPotion(id, slot, potionId));
}

function saveDeck(deckCardIds: string[], masteryCardId: string): void {
  const current = loadout.value;
  if (current) updateLoadoutBuild(current.id, { ...current, deckCardIds, masteryCardId });
}

const renaming = ref(false);
const deleting = ref(false);
const draftName = ref('');
/** The share surface and the online status it reports, opened together. */
const sharing = ref<ShareSubject | null>(null);

// ---------------------------------------------------------------------------
// Online availability
// ---------------------------------------------------------------------------

/** Publishing state and drift, one switch in the left panel beside the player board. */
const publishingOnline = ref(false);
const published = computed(() => loadout.value?.catalogEntryId !== undefined);
const onlineDrift = computed(() => (loadout.value ? hasUnpublishedChanges(loadout.value) : false));

/** On publishes the current snapshot; off queues the no-orphan unpublish; drift updates. */
async function toggleOnline(next: boolean): Promise<void> {
  const id = loadout.value?.id;
  if (!id || publishingOnline.value) return;
  publishingOnline.value = true;
  try {
    if (next) await publishLoadout(id);
    else unpublishLoadout(id);
  } catch (error) {
    notifyError('toasts.actionNotPossible', error);
  } finally {
    publishingOnline.value = false;
  }
}

function manage(action: string): void {
  const current = loadout.value;
  if (!current) return;
  if (action === 'rename') {
    draftName.value = current.name;
    renaming.value = true;
  } else if (action === 'duplicate') {
    const copy = duplicateLoadout(current.id);
    if (copy) void navigate('buildEdit', { id: copy.id });
  } else if (action === 'share')
    sharing.value = buildShareSubject({ build: current, published: current.catalogEntryId !== undefined });
  else if (action === 'delete') deleting.value = true;
}

function confirmRename(): void {
  if (loadout.value && draftName.value.trim()) renameLoadout(loadout.value.id, draftName.value);
  renaming.value = false;
}

function confirmDelete(): void {
  if (loadout.value) removeLoadout(loadout.value.id);
  deleting.value = false;
  void navigate('builds');
}

// The dock's four densities, one row each: desktop shows every label, tablet
// landscape drops the draft pair's text, tablet portrait drops every utility's :
// and phones compact to the square rail with the arrow back.
function dockTier(): 'phone' | 'portrait' | 'landscape' | 'full' {
  const width = window.innerWidth;
  if (width < 640) return 'phone';
  if (width < 900) return 'portrait';
  if (width < 1280) return 'landscape';
  return 'full';
}
const tier = ref(dockTier());
const syncTier = () => {
  tier.value = dockTier();
};
window.addEventListener('resize', syncTier);
onUnmounted(() => window.removeEventListener('resize', syncTier));
const isPhone = computed(() => tier.value === 'phone');
const hideBuildText = computed(() => isPhone.value || tier.value === 'portrait');
const hideDraftText = computed(() => hideBuildText.value || tier.value === 'landscape');

/** One dock utility: icon, label, gate, and action, shared by the clusters and the phone tools menu. */
type DockTool = {
  color?: 'error';
  disabled?: boolean;
  icon: string;
  id: string;
  label: string;
  run: () => void;
};

/** The build's own utilities, one source for the desktop cluster and the phone's tools menu. */
const buildTools = computed<DockTool[]>(() => [
  {
    icon: 'pencil',
    id: 'rename',
    label: t('deck.rename'),
    run: () => manage('rename'),
  },
  {
    icon: 'copy',
    id: 'duplicate',
    label: t('deck.duplicate'),
    run: () => manage('duplicate'),
  },
  {
    icon: 'share-2',
    id: 'share',
    label: t('deck.share'),
    run: () => manage('share'),
  },
  {
    color: 'error' as const,
    icon: 'trash-2',
    id: 'delete',
    label: t('common.delete'),
    run: () => manage('delete'),
  },
]);

/** The deck-draft utilities: the desktop's second cluster, the tools menu's tail. */
const draftTools = computed<DockTool[]>(() => [
  {
    disabled: draftValid.value,
    icon: 'wand-2',
    id: 'auto-fit',
    label: t('deck.autoFit'),
    run: () => editor.value?.autoFit(),
  },
  {
    disabled: !dirty.value,
    icon: 'rotate-ccw',
    id: 'reset',
    label: t('deck.reset'),
    run: () => editor.value?.resetDraft(),
  },
]);

/** The phone actions menu's items and lookup: one pick runs one action. */
const phoneTools = computed(() => [...buildTools.value, ...draftTools.value]);

function runTool(value: string): void {
  phoneTools.value.find((tool) => tool.id === value)?.run();
}

const editor = ref<InstanceType<typeof DeckEditor> | null>(null);
const dirty = ref(false);
/** The draft's live validity: the dock's Save and Auto-fit follow it. */
const draftValid = computed(() => editor.value?.valid ?? false);
const strategyDraft = ref(loadout.value?.strategy ?? '');
let strategyTimer: ReturnType<typeof setTimeout> | undefined;

function saveStrategy(): void {
  if (strategyTimer) clearTimeout(strategyTimer);
  strategyTimer = undefined;
  const current = loadout.value;
  if (current && current.strategy !== strategyDraft.value.trim()) {
    run(() => setLoadoutStrategy(current.id, strategyDraft.value));
  }
}

function scheduleStrategySave(): void {
  if (strategyTimer) clearTimeout(strategyTimer);
  strategyTimer = setTimeout(saveStrategy, 500);
}

watch(
  () => loadout.value?.id,
  () => {
    saveStrategy();
    strategyDraft.value = loadout.value?.strategy ?? '';
  },
);

onBeforeUnmount(saveStrategy);</script>

<template>
  <div class="frame stack" v-if="loadout && hunter && context">
    <PageHeader art="/backgrounds/bg_build.webp"
      :eyebrow="t('deck.eyebrow', { class: weaponClassById(hunter.classId).name, hunter: hunter.name })"
      :subtitle="weaponName ? t('deck.subtitle', { weapon: weaponName }) : t('deck.noWeaponHint')"
      :title="loadout.name" />

    <!-- The editor's working span: the dock rides with it to the page's end. -->
    <div class="phase-flow" style="--phase-gap: var(--size-5)">
      <DeckEditor actions-in-dock ref="editor" :cards-hint="t('builds.cardsHint')" :context="context"
        :stored="loadout.deckCardIds" :stored-mastery-id="loadout.masteryCardId" @dirty="dirty = $event"
        @save="saveDeck">
        <template #side-start="{ deckCardIds, masteryCardId }">
          <ore-card class="board-card">
            <PlayerBoard compact :can-consume="false" :can-edit="true" :equipment="equipment" :hunter="hunter"
              :member="loadout" :monster="null" :potions="ownedPotions" @equip="changeEquipment"
              @equip-potion="changePotion">
              <template #hint>{{ t('builds.equipmentHint') }}</template>
            </PlayerBoard>
          </ore-card>

          <BuildProfile :build="{ deckCardIds, equipment: loadout.equipment, masteryCardId }" :hunter="hunter" />
        </template>

        <template #side-end>
          <section aria-labelledby="build-strategy-title" class="panel stack">
            <div class="card-title">
              <div>
                <ore-text as="h2" id="build-strategy-title" size="sm" variant="heading">{{ t('builds.strategy')
                  }}</ore-text>
                <ore-text color="muted" size="sm">{{ t('builds.strategyHint') }}</ore-text>
              </div>
            </div>
            <ore-textarea :aria-label="t('builds.strategy')" :maxlength="LOADOUT_STRATEGY_MAX"
              :placeholder="t('builds.strategyPlaceholder')" :rows="4" :value="strategyDraft" @input="
                strategyDraft = ($event.target as HTMLTextAreaElement).value;
              scheduleStrategySave();
              " />
          </section>

          <!-- Online availability: the persistent publish state, below the strategy it shares
               the rail with: the player writes the build, then decides who sees it. -->
          <section aria-labelledby="build-online-title" class="panel stack">
            <div class="card-title">
              <div>
                <ore-text as="h2" id="build-online-title" size="sm" variant="heading">{{ t('builds.availableOnline')
                  }}</ore-text>
                <ore-text color="muted" size="sm">{{ t('builds.publishHint') }}</ore-text>
              </div>
            </div>
            <ore-switch
              color="primary"
              :checked="published"
              :disabled="publishingOnline"
              @change="toggleOnline(($event.target as HTMLInputElement).checked)">
              {{ t('builds.published') }}
            </ore-switch>
            <div class="stack" style="--stack-gap: var(--size-2)" v-if="published && onlineDrift">
              <ore-alert color="warning" variant="bordered">{{ t('builds.unpublishedChanges') }}</ore-alert>
              <ore-button color="primary" fullwidth rounded="sm" size="sm" variant="solid" :disabled="publishingOnline"
                @click="toggleOnline(true)">
                <ore-icon name="globe" slot="prefix" />
                {{ t('builds.updateOnline') }}
              </ore-button>
            </div>
          </section>
        </template>
      </DeckEditor>

      <PhaseDock>
        <!-- The back rides the bar's leading flank: desktop's labeled link alone in the
             left corner, the phone's square glyph whose label rides its aria. -->
        <template #back>
          <ore-tooltip v-if="!isPhone" :content="t('builds.back')" :delay="400">
            <LinkButton to="builds" variant="ghost">
              <ore-icon name="arrow-left" slot="prefix" />
              {{ t('common.back') }}
            </LinkButton>
          </ore-tooltip>
          <LinkButton icon-only rounded="full" to="builds" variant="ghost" v-if="isPhone"
            :label="t('common.back')">
            <ore-icon name="arrow-left" />
          </LinkButton>
        </template>
        <!-- Phones: every dock action rides in the actions menu, the desktop's two clusters
             separated by a rule. Desktop: the build utilities and the deck-draft utilities
             read as two attached, labeled groups. -->
        <ActionsMenu v-if="isPhone" @select="runTool">
          <ore-menu-item v-for="tool in buildTools" :key="tool.id" :disabled="tool.disabled" :value="tool.id">
            <ore-icon slot="icon" :name="tool.icon" />
            {{ tool.label }}
          </ore-menu-item>
          <ore-menu-separator />
          <ore-menu-item v-for="tool in draftTools" :key="tool.id" :disabled="tool.disabled" :value="tool.id">
            <ore-icon slot="icon" :name="tool.icon" />
            {{ tool.label }}
          </ore-menu-item>
        </ActionsMenu>
        <template v-else>
          <ore-button-group attached variant="bordered">
            <ore-button v-for="tool in buildTools" :key="tool.id" :color="tool.color" :disabled="tool.disabled"
              :icon-only="hideBuildText" :label="tool.label" @click="tool.run">
              <ore-icon :name="tool.icon" :slot="hideBuildText ? null : 'prefix'" />
              <template v-if="!hideBuildText">{{ tool.label }}</template>
            </ore-button>
          </ore-button-group>
          <ore-button-group attached variant="bordered">
            <ore-button v-for="tool in draftTools" :key="tool.id" :disabled="tool.disabled" :icon-only="hideDraftText"
              :label="tool.label" @click="tool.run">
              <ore-icon :name="tool.icon" :slot="hideDraftText ? null : 'prefix'" />
              <template v-if="!hideDraftText">{{ tool.label }}</template>
            </ore-button>
          </ore-button-group>
        </template>
        <ore-button color="primary" variant="solid" :disabled="!dirty || !draftValid" :icon-only="isPhone"
          :label="t('deck.save')" :rounded="isPhone ? 'full' : undefined" @click="editor?.save()">
          <ore-icon name="save" :slot="isPhone ? null : 'prefix'" />
          <template v-if="!isPhone">{{ t('deck.save') }}</template>
        </ore-button>
      </PhaseDock>
    </div>

    <ConfirmDialog :confirm-disabled="!draftName.trim()" :confirm-label="t('common.save')" :open="renaming"
      :title="t('deck.renameTitle')" @cancel="renaming = false" @confirm="confirmRename">
      <form @submit.prevent="confirmRename">
        <ore-input fullwidth :label="t('deck.nameLabel')" :maxlength="LOADOUT_NAME_MAX" :value="draftName"
          @input="draftName = ($event.target as HTMLInputElement).value" />
      </form>
    </ConfirmDialog>

    <ConfirmDialog danger :confirm-label="t('common.delete')" :open="deleting" :title="t('deck.deleteTitle')"
      @cancel="deleting = false" @confirm="confirmDelete">
      <ore-text>{{ t('deck.deleteBody', { name: loadout.name }) }}</ore-text>
    </ConfirmDialog>

    <ShareDialog :subject="sharing" @close="sharing = null" />
  </div>

  <div class="frame stack" style="text-align: center; padding-block: var(--size-16); justify-items: center" v-else>
    <ore-text variant="overline">{{ t('builds.title') }}</ore-text>
    <ore-text as="h1" size="lg" variant="heading">{{ t('builds.noSuchBuild') }}</ore-text>
    <LinkButton to="builds" variant="bordered">{{ t('builds.back') }}</LinkButton>
  </div>
</template>

<style scoped>
.board-card {
  --card-padding: clamp(1rem, 2vw, 1.5rem);
}
</style>
