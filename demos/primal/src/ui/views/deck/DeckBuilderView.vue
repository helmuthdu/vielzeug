<script lang="ts" setup>
import { computed, onUnmounted, ref, watch } from 'vue';
import { t } from '../../../app/i18n';
import type { RouteName } from '../../../app/router';
import {
  ascents,
  campaigns,
  challenges,
  expeditions,
  loadouts,
  runCommand,
  saveHunterBuild,
  saveLoadout,
  updateLoadoutBuild,
} from '../../../app/store';
import { navigate, useReadable, useRouteName, useRouteParams, useRouteQuery } from '../../../app/vue-bridge';
import { enabledContent, forgeById, hunterById, potionById, potions as potionCatalog, weaponClassById } from '../../../content/index';
import { ascentEquipmentFor, ascentPotions } from '../../../domain/ascent';
import { challengePotions } from '../../../domain/challenge';
import {
  ascentDeckContext,
  campaignDeckContext,
  campaignEquipmentPool,
  challengeDeckContext,
  challengeEquipmentPool,
  type DeckContext,
  eligibleEquipment,
  expeditionDeckContext,
  sameBuild,
  validateDeck,
} from '../../../domain/deck';
import { expeditionPotions } from '../../../domain/expedition';
import { LOADOUT_NAME_MAX } from '../../../domain/loadout';
import { carrierMonster } from '../../../domain/monster-state';
import type {
  BoardBuild,
  EquipmentIds,
  EquipmentSlot,
  HunterLoadout,
  PotionLoadout,
  PotionSlot,
  SubjectRef,
} from '../../../domain/types';
import ActionsMenu from '../../components/ActionsMenu.vue';
import ConfirmDialog from '../../components/ConfirmDialog.vue';
import BuildPickerDialog from '../../components/deck/BuildPickerDialog.vue';
import DeckEditor from '../../components/deck/DeckEditor.vue';
import LinkButton from '../../components/LinkButton.vue';
import PageHeader from '../../components/PageHeader.vue';
import PhaseDock from '../../components/PhaseDock.vue';
import HunterRoster from '../../components/party/HunterRoster.vue';
import PartySection from '../../components/party/PartySection.vue';
import PlayerBoard from '../../components/party/PlayerBoard.vue';
import ShareDialog from '../../components/share/ShareDialog.vue';
import { buildShareSubject, type ShareSubject } from '../../components/share/share-subject';
import '@vielzeug/refine/alert';
import '@vielzeug/refine/button';
import '@vielzeug/refine/button-group';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/input';
import '@vielzeug/refine/text';
import '@vielzeug/refine/tooltip';

/**
 * The deck builder for a hunter on any subject's board. The shared player board sits in the
 * side column and changes equipment through the same slot picker as every board, and the saved-build
 * library is reached through Load / Save build.
 */
const params = useRouteParams();
const query = useRouteQuery();
const routeName = useRouteName();
const isCampaign = computed(() => routeName.value === 'campaignDeck');
const isAscent = computed(() => routeName.value === 'ascentDeck');
const isChallenge = computed(() => routeName.value === 'challengeDeck');
const isExpedition = computed(() => routeName.value === 'expeditionDeck');
const allAscents = useReadable(ascents);
const allCampaigns = useReadable(campaigns);
const allChallenges = useReadable(challenges);
const allExpeditions = useReadable(expeditions);
const savedLoadouts = useReadable(loadouts);
const ascent = computed(() => allAscents.value.find((entry) => entry.id === params.value.id));
const campaign = computed(() => allCampaigns.value.find((entry) => entry.id === params.value.id));
const challenge = computed(() => allChallenges.value.find((entry) => entry.id === params.value.id));
const expedition = computed(() => allExpeditions.value.find((entry) => entry.id === params.value.id));
const entity = computed(() =>
  isCampaign.value
    ? campaign.value
    : isAscent.value
      ? ascent.value
      : isChallenge.value
        ? challenge.value
        : expedition.value,
);
const party = computed(() =>
  (entity.value?.hunters ?? []).map((member) => hunterById(member.hunterId)).filter((entry) => entry !== undefined),
);
const hunter = computed(() => party.value.find((entry) => entry.id === params.value.hunterId));
const campaignMember = computed(() => campaign.value?.hunters.find((entry) => entry.hunterId === hunter.value?.id));
const expeditionMember = computed(() => expedition.value?.hunters.find((entry) => entry.hunterId === hunter.value?.id));
const ascentMember = computed(() => ascent.value?.hunters.find((entry) => entry.hunterId === hunter.value?.id));
const runMember = computed(() => challenge.value?.hunters.find((entry) => entry.hunterId === hunter.value?.id));
const member = computed(() =>
  isCampaign.value
    ? campaignMember.value
    : isAscent.value
      ? ascentMember.value
      : isChallenge.value
        ? runMember.value
        : expeditionMember.value,
);
const monster = computed(() => (entity.value ? (carrierMonster(entity.value) ?? null) : null));

// The creation wizard links its deck edits back to its own preparation step: the marker
// names the return route, and the back carries the record for the wizard to re-attach.
const backToCreate = computed(() => query.value.back === 'expeditionCreate' && isExpedition.value);
const backRoute = computed<RouteName>(() =>
  backToCreate.value
    ? 'expeditionCreate'
    : isCampaign.value
      ? 'campaignDashboard'
      : isAscent.value
        ? 'ascentDetail'
        : isChallenge.value
          ? 'challengeDetail'
          : 'expeditionDetail',
);
const backParams = computed(
  () => (backToCreate.value ? {} : { id: entity.value?.id ?? '' }) as Record<string, string>,
);
const backQuery = computed(() => (backToCreate.value ? { continue: entity.value?.id ?? '' } : undefined));
const deckRoute = computed<RouteName>(() =>
  isCampaign.value ? 'campaignDeck' : isAscent.value ? 'ascentDeck' : isChallenge.value ? 'challengeDeck' : 'expeditionDeck',
);
const locked = computed(() =>
  isCampaign.value
    ? campaign.value?.phase !== 'preparing'
    : isAscent.value
      ? ascent.value?.status === 'finished'
      : isChallenge.value
        ? challenge.value?.status === 'finished'
        : expedition.value?.status === 'played',
);
const lockReason = computed(() =>
  isCampaign.value
    ? t('deck.lockedCampaign')
    : isAscent.value || isChallenge.value
      ? t('deck.lockedAscent')
      : t('deck.lockedExpedition'),
);

const context = computed<DeckContext | undefined>(() => {
  if (!hunter.value) return undefined;
  if (isCampaign.value)
    return campaign.value && boardCampaignMember.value
      ? campaignDeckContext(campaign.value, boardCampaignMember.value, hunter.value)
      : undefined;
  if (isAscent.value)
    return ascent.value && boardAscentMember.value
      ? ascentDeckContext(ascent.value, boardAscentMember.value, hunter.value)
      : undefined;
  if (isChallenge.value)
    return challenge.value && boardRunMember.value
      ? challengeDeckContext(challenge.value, boardRunMember.value, hunter.value)
      : undefined;
  return expedition.value && boardExpeditionMember.value
    ? expeditionDeckContext(expedition.value, boardExpeditionMember.value, hunter.value)
    : undefined;
});

// Route carries a stale or out-of-party hunter id → land on the first party member.
watch(
  [entity, hunter],
  ([target]) => {
    if (target && party.value.length > 0 && !hunter.value) {
      void navigate(deckRoute.value, { hunterId: party.value[0]?.id ?? '', id: target.id }, undefined, {
        replace: true,
      });
    }
  },
  { immediate: true },
);

const currentBuild = computed<BoardBuild | undefined>(() =>
  boardMember.value
    ? {
      deckCardIds: boardMember.value.deckCardIds,
      equipment: boardMember.value.equipment,
      masteryCardId: boardMember.value.masteryCardId,
      potionLoadoutIds: boardMember.value.potionLoadoutIds,
    }
    : undefined,
);
const storedValid = computed(
  () => !!context.value && validateDeck(member.value?.deckCardIds ?? [], context.value).valid,
);
const dirty = ref(false);
/** The whole build is dirty: deck cards drafted, or equipment and potions staged on the board. */
const buildDirty = computed(() => dirty.value || stagedEquipment.value !== null || stagedPotions.value !== null);

const subject = computed<SubjectRef | null>(() =>
  entity.value
    ? {
      id: entity.value.id,
      kind: isCampaign.value
        ? 'campaign'
        : isAscent.value
          ? 'ascent'
          : isChallenge.value
            ? 'challenge'
            : 'expedition',
    }
    : null,
);

function saveDeck(ids: string[], masteryCardId: string): void {
  const ref = subject.value;
  const hunterId = hunter.value?.id;
  const current = member.value;
  if (!ref || !hunterId || !current || locked.value) return;
  saveHunterBuild(ref, hunterId, {
    deckCardIds: ids,
    equipment: stagedEquipment.value ?? current.equipment,
    masteryCardId,
    potionLoadoutIds: stagedPotions.value ?? current.potionLoadoutIds,
  });
  stagedEquipment.value = null;
  stagedPotions.value = null;
}

// ---------------------------------------------------------------------------
// Equipment: the shared player board in the side column; picks stage with the deck, and Save
// commits the whole build. The board, the deck context and the validity all follow the stage,
// so a staged weapon refits the deck exactly like a saved one.
// ---------------------------------------------------------------------------

const stagedEquipment = ref<EquipmentIds | null>(null);
const stagedPotions = ref<PotionLoadout | null>(null);
/** Equipment or potions staged on the board: the dock's Save commits them with the deck. */
const staged = computed(() => stagedEquipment.value !== null || stagedPotions.value !== null);

/** Overlays the staged equipment and potions onto a subject member, preserving its kind. */
function stagedOf<T extends BoardBuild & { potionLoadoutIds: PotionLoadout }>(current: T | undefined): T | undefined {
  if (!current || (!stagedEquipment.value && !stagedPotions.value)) return current;
  return {
    ...current,
    equipment: stagedEquipment.value ?? current.equipment,
    potionLoadoutIds: stagedPotions.value ?? current.potionLoadoutIds,
  };
}
const boardCampaignMember = computed(() => stagedOf(campaignMember.value));
const boardAscentMember = computed(() => stagedOf(ascentMember.value));
const boardExpeditionMember = computed(() => stagedOf(expeditionMember.value));
const boardRunMember = computed(() => stagedOf(runMember.value));
const boardMember = computed(() =>
  isCampaign.value
    ? boardCampaignMember.value
    : isAscent.value
      ? boardAscentMember.value
      : isChallenge.value
        ? boardRunMember.value
        : boardExpeditionMember.value,
);

// Switching hunters or subjects drops the stages, the same way the deck draft resets.
watch(
  () => [entity.value?.id, hunter.value?.id],
  () => {
    stagedEquipment.value = null;
    stagedPotions.value = null;
  },
);

function changeEquipment(slot: EquipmentSlot, equipmentId: string | null): void {
  const current = member.value;
  if (!current || locked.value) return;
  stagedEquipment.value = { ...(stagedEquipment.value ?? current.equipment), [`${slot}Id`]: equipmentId };
}

function changePotion(slot: PotionSlot, potionId: string | null): void {
  const current = member.value;
  if (!current || locked.value) return;
  const [first, second, third] = stagedPotions.value ?? current.potionLoadoutIds;
  stagedPotions.value = slot === 0 ? [potionId, second, third] : slot === 1 ? [first, potionId, third] : [first, second, potionId];
}

const equipment = computed(() => {
  const boardHunter = hunter.value;
  if (!boardHunter) return [];
  if (isCampaign.value) {
    return campaign.value && campaignMember.value ? campaignEquipmentPool(campaign.value, campaignMember.value) : [];
  }
  if (isAscent.value) return ascent.value ? ascentEquipmentFor(ascent.value, boardHunter) : [];
  if (isChallenge.value)
    return challenge.value
      ? challengeEquipmentPool(challenge.value.expansionIds, challenge.value.aggression, boardHunter)
      : [];
  return expedition.value ? eligibleEquipment(expedition.value.expansionIds, boardHunter, monster.value) : [];
});

const potions = computed(() => {
  if (isCampaign.value) {
    return campaignMember.value?.potionInventoryIds.flatMap((id) => potionById(id) ?? []) ?? [];
  }
  if (isAscent.value) return ascent.value ? ascentPotions(ascent.value) : [];
  if (isChallenge.value)
    return challenge.value ? challengePotions(challenge.value) : [];
  return expedition.value ? expeditionPotions(expedition.value) : [];
});

// ---------------------------------------------------------------------------
// Saved builds: the library is managed on the Builds page; here a build is loaded onto or saved from the board
// ---------------------------------------------------------------------------

const hunterLoadouts = computed(() => savedLoadouts.value.filter((entry) => entry.hunterId === hunter.value?.id));
const equippedLoadout = computed(() =>
  currentBuild.value
    ? hunterLoadouts.value.find((entry) => sameBuild(entry, currentBuild.value as BoardBuild))
    : undefined,
);
const picking = ref(false);
const savingLoadout = ref(false);
const loadoutName = ref('');
const sharing = ref<ShareSubject | null>(null);
const existingByName = computed(() => {
  const name = loadoutName.value.trim().toLowerCase();
  return name ? hunterLoadouts.value.find((entry) => entry.name.trim().toLowerCase() === name) : undefined;
});

function openSaveLoadout(): void {
  loadoutName.value = equippedLoadout.value?.name ?? '';
  savingLoadout.value = true;
}

function confirmSaveLoadout(): void {
  const build = currentBuild.value;
  const hunterId = hunter.value?.id;
  const name = loadoutName.value.trim();
  if (!build || !hunterId || !name) return;
  const existing = existingByName.value;
  if (existing) updateLoadoutBuild(existing.id, build);
  else saveLoadout(hunterId, name, build);
  savingLoadout.value = false;
}

function applyLoadout(loadout: HunterLoadout): void {
  const ref = subject.value;
  const hunterId = hunter.value?.id;
  if (!ref || !hunterId || locked.value) return;
  // A loaded build replaces everything at once, so the stages drop before it lands.
  stagedEquipment.value = null;
  stagedPotions.value = null;
  const applied = runCommand('applyLoadout', ref, hunterId, loadout) !== undefined;
  if (applied) picking.value = false;
}

function shareCurrent(): void {
  const build = currentBuild.value;
  if (!build || !hunter.value) return;
  sharing.value = buildShareSubject({
    build: { ...build, hunterId: hunter.value.id, name: equippedLoadout.value?.name ?? hunter.value.name },
  });
}

function selectHunter(hunterId: string): void {
  const target = entity.value;
  if (target && hunterId !== hunter.value?.id) void navigate(deckRoute.value, { hunterId, id: target.id });
}

// The dock renders the deck actions, so the editor's draft state is read through its expose.
const editor = ref<InstanceType<typeof DeckEditor> | null>(null);
/** The draft's live validity: the dock's Save and Auto-fit follow it. */
const draftValid = computed(() => editor.value?.valid ?? false);

const backLabel = computed(() =>
  backToCreate.value
    ? t('deck.backToPreparation')
    : isCampaign.value
      ? t('deck.backToCampaign')
      : isAscent.value
        ? t('deck.backToAscent')
        : isChallenge.value
          ? t('deck.backToChallenge')
          : t('deck.backToExpedition'),
);

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

/** The dock's library utilities, one source for the desktop cluster and the phone's tools menu. */
const buildTools = computed<DockTool[]>(() => [
  {
    disabled: locked.value,
    icon: 'library',
    id: 'load',
    label: t('deck.loadBuild'),
    run: () => {
      picking.value = true;
    },
  },
  {
    disabled: buildDirty.value || !storedValid.value,
    icon: 'bookmark-plus',
    id: 'save-loadout',
    label: t('deck.saveLoadout'),
    run: () => openSaveLoadout(),
  },
  {
    disabled: buildDirty.value || !storedValid.value,
    icon: 'share-2',
    id: 'share',
    label: t('deck.share'),
    run: () => shareCurrent(),
  },
]);

/** The dock's deck-draft utilities: the desktop's second cluster, the tools menu's tail. */
const draftTools = computed<DockTool[]>(() => [
  {
    disabled: locked.value || draftValid.value,
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

const weaponName = computed(() =>
  boardMember.value?.equipment.weaponId ? forgeById(boardMember.value.equipment.weaponId)?.name : undefined,
);

/** What the chapter level locks away: surfaced in the picker so the gate is visible, not silent. */
const hiddenEquipment = computed(() => {
  const current = ascent.value;
  const boardHunter = hunter.value;
  if (!isAscent.value || !current || !boardHunter) return [];
  return eligibleEquipment(current.expansionIds, boardHunter).filter((piece) => piece.level > current.chapter);
});
const hiddenPotions = computed(() => {
  const current = ascent.value;
  if (!isAscent.value || !current) return [];
  return enabledContent(potionCatalog, current.expansionIds).filter((potion) => potion.level > current.chapter);
});
const hiddenReason = computed(() =>
  isAscent.value && ascent.value ? t('deck.hiddenAboveChapter', { level: ascent.value.chapter }) : undefined,
);
</script>

<template>
  <div class="frame stack builder" v-if="entity && hunter && member && boardMember && context && currentBuild">
    <PageHeader art="/backgrounds/bg_build.webp"
      :eyebrow="t('deck.eyebrow', { class: weaponClassById(hunter.classId).name, hunter: hunter.name })"
      :subtitle="weaponName ? t('deck.subtitle', { weapon: weaponName }) : t('deck.noWeaponHint')"
      :title="t('deck.title')" />

    <!-- The party workspace: the roster and the editor it selects for: in one block-flow span:
         the roster's rail and the dock's bar both travel it while the builder scrolls. -->
    <PartySection heading-id="deck-party-title" :subtitle="t('deck.partyHint')" :title="t('deck.partyTitle')">
      <div class="phase-flow" style="--phase-gap: var(--size-5)">
        <HunterRoster :hunters="party" :selected-id="hunter.id" @select="selectHunter" />

        <ore-alert color="info" size="sm" variant="flat" v-if="locked">
          <ore-icon name="lock" slot="icon" />
          {{ lockReason }}
        </ore-alert>

        <DeckEditor actions-in-dock ref="editor" :cards-hint="isCampaign
          ? t('deck.cardsHintCampaign')
          : isAscent
            ? t('deck.cardsHintAscent')
            : t('deck.cardsHintExpedition')
          " :context="context" :locked="locked" :staged="staged" :stored="member.deckCardIds"
          :stored-mastery-id="member.masteryCardId" @dirty="dirty = $event" @save="saveDeck">
          <template #side-start>
            <PlayerBoard compact :can-consume="false" :can-edit="!locked" :equipment="equipment"
              :hidden-equipment="hiddenEquipment" :hidden-potions="hiddenPotions" :hidden-reason="hiddenReason"
              :hunter="hunter" :member="boardMember" :monster="monster" :potions="potions" @equip="changeEquipment"
              @equip-potion="changePotion" />
          </template>
        </DeckEditor>

        <PhaseDock>
          <!-- The back rides the bar's leading flank: desktop's labeled link alone in the
           left corner, the phone's square glyph whose label rides its aria. -->
          <template #back>
            <ore-tooltip v-if="!isPhone" :content="backLabel" :delay="400">
              <LinkButton variant="ghost" :params="backParams" :query="backQuery" :to="backRoute">
                <ore-icon name="arrow-left" slot="prefix" />
                {{ t('common.back') }}
              </LinkButton>
            </ore-tooltip>
            <LinkButton icon-only rounded="full" variant="ghost" v-if="isPhone" :label="t('common.back')"
              :params="backParams" :query="backQuery" :to="backRoute">
              <ore-icon name="arrow-left" />
            </LinkButton>
          </template>
          <!-- Phones: every dock action rides in the actions menu, the desktop's two clusters
           separated by a rule. Desktop: the library utilities and the deck-draft utilities
           read as two attached, labeled groups; the tablet tiers drop the text. -->
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
              <ore-button v-for="tool in buildTools" :key="tool.id" :disabled="tool.disabled" :icon-only="hideBuildText"
                :label="tool.label" @click="tool.run">
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
          <ore-button color="primary" variant="solid" :disabled="locked || (!dirty && !staged) || !draftValid"
            :icon-only="isPhone" :label="t('deck.save')" :rounded="isPhone ? 'full' : undefined"
            @click="editor?.save()">
            <ore-icon name="save" :slot="isPhone ? null : 'prefix'" />
            <template v-if="!isPhone">{{ t('deck.save') }}</template>
          </ore-button>
        </PhaseDock>
      </div>
    </PartySection>

    <BuildPickerDialog :context="context" :current="currentBuild" :hunter-id="hunter.id" :open="picking"
      @apply="applyLoadout" @close="picking = false" />

    <ConfirmDialog :confirm-disabled="!loadoutName.trim()"
      :confirm-label="existingByName ? t('deck.updateLoadout') : t('common.save')" :open="savingLoadout"
      :title="t('deck.saveLoadoutTitle')" @cancel="savingLoadout = false" @confirm="confirmSaveLoadout">
      <form class="stack" @submit.prevent="confirmSaveLoadout">
        <ore-input fullwidth :label="t('deck.nameLabel')" :maxlength="LOADOUT_NAME_MAX" :value="loadoutName"
          @input="loadoutName = ($event.target as HTMLInputElement).value" />
        <ore-text color="muted" size="sm" v-if="existingByName">
          {{ t('deck.replacesLoadout', { name: existingByName.name }) }}
        </ore-text>
      </form>
    </ConfirmDialog>

    <ShareDialog :subject="sharing" @close="sharing = null" />
  </div>

  <div class="frame stack" style="text-align: center; padding-block: var(--size-16); justify-items: center" v-else>
    <ore-text variant="overline">{{ t('deck.title') }}</ore-text>
    <ore-text as="h1" size="lg" variant="heading">
      {{ isCampaign ? t('common.noSuchCampaign') : isAscent ? t('common.noSuchAscent') : t('common.noSuchExpedition') }}
    </ore-text>
    <LinkButton variant="bordered" :to="isCampaign ? 'campaigns' : isAscent ? 'home' : 'expeditions'">
      {{ t('common.back') }}
    </LinkButton>
  </div>
</template>
