<script lang="ts" setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { asset } from '../../../app/assets';
import { t } from '../../../app/i18n';
import { campaigns, runCommand } from '../../../app/store';
import { useReadable } from '../../../app/vue-bridge';
import { forgeById, hunterById, potionById, resources, stepCardCount, weaponClassById } from '../../../content/index';
import { campaignDeckContext, campaignEquipmentPool } from '../../../domain/deck';
import { carrierMonster } from '../../../domain/monster-state';
import type { CampaignHunter, HunterCard, ResourceCategory, ResourceId, SkillBranchId, SubjectRef } from '../../../domain/types';
import { usePartyDeck } from '../../composables/use-party-deck';
import ConfirmDialog from '../ConfirmDialog.vue';
import BuildPickerDialog from '../deck/BuildPickerDialog.vue';
import ResourceIcon from '../ResourceIcon.vue';
import ShareDialog from '../share/ShareDialog.vue';
import BranchSheet from './BranchSheet.vue';
import HunterCardDetail from './HunterCardDetail.vue';
import PlayerBoard from './PlayerBoard.vue';
import UpgradeTree from './UpgradeTree.vue';
import '@vielzeug/refine/avatar';
import '@vielzeug/refine/button';
import '@vielzeug/refine/card';
import '@vielzeug/refine/dialog';
import '@vielzeug/refine/input';
import '@vielzeug/refine/select';
import '@vielzeug/refine/text';
import '@vielzeug/refine/textarea';
import '@vielzeug/refine/tooltip';

const props = defineProps<{ campaignId: string; modelValue?: string }>();
const emit = defineEmits<{ 'update:modelValue': [hunterId: string] }>();
const all = useReadable(campaigns);
const campaign = computed(() => all.value.find((entry) => entry.id === props.campaignId));
const party = computed<readonly CampaignHunter[]>(() => campaign.value?.hunters ?? []);
const selectedHunterId = ref(props.modelValue || '');
// Derived from the resolved campaign, not props.campaignId, so a same-route id change (the view is
// keyed by route name, so the instance survives /campaigns/:id -> /campaigns/:id) never runs a
// command against the previous campaign. Null until the campaign resolves, which every command guards on.
const subject = computed<SubjectRef | null>(() =>
  campaign.value ? { id: campaign.value.id, kind: 'campaign' } : null,
);
const openBranchTrigger = ref<HTMLElement | null>(null);
const resourceToAdd = ref('');
const saveState = ref<'error' | 'saved' | 'saving'>('saved');

const {
  applyLoadout,
  autoFitDeck,
  canConsume,
  canEdit: canPrepare,
  changeEquipment,
  changePotion,
  confirmUpgrade,
  consumePotion,
  context: deckContext,
  equippedLoadout,
  openBranch,
  pendingUpgrade,
  pendingUpgradeCards,
  picking,
  report: deckReport,
  requestUpgrade,
  selectedHunter,
  selectedMember,
  shareBuild,
  sharing,
  toggleCard,
  viewedCard,
  viewedCardLocked,
  viewedCardSelected,
} = usePartyDeck<CampaignHunter>({
  canConsume: () => campaign.value?.phase === 'hunt',
  canEdit: () => campaign.value?.phase === 'preparing',
  canUpgrade: () => campaign.value?.phase === 'preparing',
  contextFor: (member, hunter) => (campaign.value ? campaignDeckContext(campaign.value, member, hunter) : undefined),
  onUpgradeConfirmed: closeBranchSheet,
  party: () => party.value,
  selectedId: () => selectedHunterId.value,
  subject: () => subject.value,
});

watch(
  () => props.modelValue,
  (value) => {
    if (value && value !== selectedHunterId.value) {
      selectHunter(value);
    }
  },
);

const playerNameDraft = ref(selectedMember.value?.playerName ?? '');
const hunterNotesDraft = ref(selectedMember.value?.notes ?? '');

function openBranchSheet(branch: SkillBranchId): void {
  openBranchTrigger.value = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  openBranch.value = branch;
}
function closeBranchSheet(): void {
  openBranch.value = null;
  openBranchTrigger.value?.focus();
  openBranchTrigger.value = null;
}
function inspectCard(card: HunterCard): void {
  viewedCard.value = card;
}

const campaignResources = computed(() =>
  resources.filter((resource) => campaign.value?.expansionIds.includes(resource.expansionId)),
);
const campaignEquipment = computed(() =>
  campaign.value && selectedMember.value ? campaignEquipmentPool(campaign.value, selectedMember.value) : [],
);
const campaignPotions = computed(
  () => selectedMember.value?.potionInventoryIds.flatMap((id) => potionById(id) ?? []) ?? [],
);
const huntTarget = computed(() => (campaign.value ? (carrierMonster(campaign.value) ?? null) : null));
const resourceCategories = computed<Array<{ id: ResourceCategory; label: string }>>(() => [
  { id: 'element', label: t('party.categoryElement') },
  { id: 'material', label: t('party.categoryMaterial') },
  { id: 'plant', label: t('party.categoryPlant') },
]);

let profileTimer: ReturnType<typeof setTimeout> | undefined;
let profileDirty = false;

/** The next earned reward card waiting for its owner; the dialog stays open until the queue empties. */
const pendingReward = computed(() => {
  const rewardId = campaign.value?.unassignedRewards[0];
  if (rewardId === undefined) return null;
  const piece = forgeById(rewardId) ?? potionById(rewardId);
  return piece ? { art: piece.artwork, level: piece.level, name: piece.name, rewardId } : null;
});
const rewardHunters = computed(() =>
  party.value.map((member) => {
    const hunter = hunterById(member.hunterId);
    return {
      hunterId: member.hunterId,
      name: hunter?.name ?? member.hunterId,
      src: hunter ? asset(hunter.artwork) : '',
      weapon: hunter ? weaponClassById(hunter.classId).name : '',
    };
  }),
);
function assignReward(hunterId: string): void {
  const pending = pendingReward.value;
  const current = subject.value;
  if (pending === null || !current) return;
  runCommand('assignRewardCard', current, pending.rewardId, hunterId);
}

function saveProfile(): void {
  if (profileTimer) clearTimeout(profileTimer);
  profileTimer = undefined;
  const member = selectedMember.value;
  const current = subject.value;
  if (!profileDirty || !member || !current) return;
  // runCommand reports a domain refusal as a toast and returns undefined, so the save-status
  // reflects the command's own outcome instead of a swallowed throw that always read as saved.
  const saved = runCommand('updateHunterProfile', current, member.hunterId, {
    notes: hunterNotesDraft.value,
    playerName: playerNameDraft.value,
  });
  saveState.value = saved ? 'saved' : 'error';
  if (saved) profileDirty = false;
}

function scheduleProfileSave(): void {
  profileDirty = true;
  saveState.value = 'saving';
  if (profileTimer) clearTimeout(profileTimer);
  profileTimer = setTimeout(saveProfile, 500);
}

function selectHunter(hunterId: string): void {
  if (hunterId === selectedMember.value?.hunterId) return;
  saveProfile();
  selectedHunterId.value = hunterId;
  emit('update:modelValue', hunterId);
  playerNameDraft.value = selectedMember.value?.playerName ?? '';
  hunterNotesDraft.value = selectedMember.value?.notes ?? '';
}

const resourceCount = (id: ResourceId) => selectedMember.value?.resources[id] ?? 0;
function changeResource(resourceId: ResourceId, delta: number): void {
  const member = selectedMember.value;
  const current = subject.value;
  if (!member || !current) return;
  runCommand('adjustHunterResource', current, member.hunterId, resourceId, delta);
}

function addResource(): void {
  if (!resourceToAdd.value) return;
  changeResource(resourceToAdd.value as ResourceId, 1);
  resourceToAdd.value = '';
}

onBeforeUnmount(saveProfile);
</script>

<template>
  <ore-card class="party-console" v-if="campaign && selectedMember && selectedHunter">
    <div class="card-title" slot="header">
      <div>
        <ore-text variant="overline">{{ t('party.roster') }}</ore-text>
        <ore-text as="h2" size="sm" variant="heading">{{ t('party.hunters') }}</ore-text>
      </div>
      <span class="save-status">
        <ore-text aria-live="polite" role="status" variant="caption" :color="saveState === 'error' ? 'error' : 'muted'">
          {{
            saveState === 'saving' ? t('party.saving') : saveState === 'error' ? t('party.saveError') : t('party.saved')
          }}
        </ore-text>
        <ore-button size="sm" variant="ghost" v-if="saveState === 'error'" @click="saveProfile">
          {{ t('common.retry') }}
        </ore-button>
      </span>
    </div>

    <div class="hunter-workspace">
      <section aria-labelledby="selected-hunter-title" class="hunter-profile">
        <div
          class="hunter-profile__art"
          :class="`hunter-profile__art--${selectedHunter.id}`"
          :style="{ '--art': `url(${asset(selectedHunter.artwork)})` }"></div>
        <div class="hunter-overview">
          <div>
            <ore-text variant="overline">{{ weaponClassById(selectedHunter.classId).name }}</ore-text>
            <ore-text as="h3" id="selected-hunter-title" size="md" variant="heading">
              {{ selectedHunter.name }}
            </ore-text>
            <ore-text color="muted" italic size="sm">{{ selectedHunter.title }}</ore-text>
          </div>
          <ore-input
            :label="t('party.playerName')"
            :value="playerNameDraft"
            @input="
              playerNameDraft = ($event.target as HTMLInputElement).value;
              scheduleProfileSave();
            " />
          <ore-text size="sm">{{ selectedHunter.description }}</ore-text>

          <section class="hunter-overview__section hunter-overview__resources">
            <ore-text variant="overline">{{ t('party.heroResources') }}</ore-text>
            <div class="resource-add">
              <ore-select
                fullwidth
                hide-label
                :label="t('party.addResource')"
                :placeholder="t('party.chooseResource')"
                :value="resourceToAdd"
                @change="resourceToAdd = ($event.target as HTMLElement & { value: string }).value">
                <optgroup v-for="category in resourceCategories" :key="category.id" :label="category.label">
                  <option
                    v-for="resource in campaignResources.filter((entry) => entry.category === category.id)"
                    :key="resource.id"
                    :value="resource.id">
                    {{ resource.name }}
                  </option>
                </optgroup>
              </ore-select>
              <ore-button
                class="party-action party-action--accent"
                color="primary"
                icon-only
                size="sm"
                variant="flat"
                :disabled="!resourceToAdd"
                :label="t('party.addResourceAria')"
                @click="addResource">
                <span aria-hidden="true">+</span>
              </ore-button>
            </div>
            <div class="resource-list">
              <div
                class="resource-row"
                v-for="resource in campaignResources.filter((entry) => resourceCount(entry.id) > 0)"
                :key="resource.id">
                <ResourceIcon size="sm" :id="resource.id" />
                <ore-text aria-live="polite" class="resource-count" size="sm">
                  ×{{ resourceCount(resource.id) }}
                </ore-text>
                <ore-tooltip :content="t('party.removeResource', { hunter: selectedHunter.name, name: resource.name })" :delay="400" >
                  <ore-button
                    class="party-action"
                    icon-only
                    size="sm"
                    variant="ghost"
                    @click="changeResource(resource.id, -1)">
                    <span aria-hidden="true">−</span>
                    <span class="visually-hidden">
                      {{ t('party.removeResource', { hunter: selectedHunter.name, name: resource.name }) }}
                    </span>
                  </ore-button>
                </ore-tooltip>
                <ore-tooltip :content="t('party.addResourceTo', { hunter: selectedHunter.name, name: resource.name })" :delay="400" >
                  <ore-button
                    class="party-action"
                    icon-only
                    size="sm"
                    variant="ghost"
                    @click="changeResource(resource.id, 1)">
                    <span aria-hidden="true">+</span>
                    <span class="visually-hidden">
                      {{ t('party.addResourceTo', { hunter: selectedHunter.name, name: resource.name }) }}
                    </span>
                  </ore-button>
                </ore-tooltip>
              </div>
              <ore-text color="muted" size="sm" v-if="!campaignResources.some((entry) => resourceCount(entry.id) > 0)">
                {{ t('party.noResources') }}
              </ore-text>
            </div>
          </section>

          <section class="hunter-overview__section hunter-overview__skills">
            <UpgradeTree
              :can-choose="campaign.phase === 'preparing'"
              :hunter="selectedHunter"
              :member="selectedMember"
              @open="openBranchSheet" />
          </section>
        </div>
      </section>

      <PlayerBoard
        :can-consume="canConsume"
        :can-edit="canPrepare"
        :equipment="campaignEquipment"
        :hunter="selectedHunter"
        :loadout-name="equippedLoadout?.name"
        :member="selectedMember"
        :monster="huntTarget"
        :potions="campaignPotions"
        :report="deckReport"
        @auto-fit="autoFitDeck"
        @consume="consumePotion"
        @equip="changeEquipment"
        @equip-potion="changePotion"
        @load="picking = true"
        @share="shareBuild">
        <template v-if="!canPrepare" #hint >{{ t('party.loadoutHint') }}</template>
      </PlayerBoard>

      <section aria-labelledby="hunter-notes-title" class="hunter-notes">
        <ore-text as="h3" id="hunter-notes-title" size="sm" variant="heading">{{ t('party.hunterNotes') }}</ore-text>
        <ore-textarea
          :aria-label="t('party.hunterNotes')"
          :rows="4"
          :value="hunterNotesDraft"
          @input="
            hunterNotesDraft = ($event.target as HTMLTextAreaElement).value;
            scheduleProfileSave();
          " />
      </section>
    </div>
  </ore-card>

  <HunterCardDetail
    :card="viewedCard"
    :locked-label="viewedCardLocked"
    :selected="viewedCardSelected"
    :zoom="null"
    @close="viewedCard = null"
    @toggle="toggleCard" />
  <ShareDialog :subject="sharing" @close="sharing = null" />
  <BuildPickerDialog
    v-if="deckContext && selectedMember"
    :context="deckContext"
    :current="selectedMember"
    :hunter-id="selectedMember.hunterId"
    :open="picking"
    @apply="applyLoadout"
    @close="picking = false" />

  <BranchSheet
    v-if="campaign && selectedMember && selectedHunter"
    :branch="openBranch"
    :can-choose="campaign.phase === 'preparing'"
    :hunter="selectedHunter"
    :member="selectedMember"
    @close="closeBranchSheet"
    @inspect="inspectCard"
    @upgrade="requestUpgrade" />

  <ConfirmDialog
    :confirm-label="t('party.upgrade')"
    :open="pendingUpgrade !== null"
    :title="pendingUpgrade ? t('party.upgradeTitle', { id: pendingUpgrade.branch, step: pendingUpgrade.step }) : ''"
    @cancel="pendingUpgrade = null"
    @confirm="confirmUpgrade">
    <ore-text v-if="pendingUpgrade">
      {{
        pendingUpgradeCards.length === stepCardCount(pendingUpgrade.step)
          ? t('party.upgradeBody', {
              cards: pendingUpgradeCards.map((card) => card.name).join(', '),
              name: selectedHunter?.name,
            })
          : t('party.upgradeBodyGeneric', {
              adds: t(pendingUpgrade.step === 1 ? 'party.stepAdds1' : 'party.stepAdds2'),
              name: selectedHunter?.name,
            })
      }}
    </ore-text>
  </ConfirmDialog>

  <ore-dialog
    backdrop="blur"
    size="sm"
    :label="t('party.rewardAssignTitle')"
    :open="pendingReward !== null">
    <div class="reward-assign stack" style="--stack-gap: var(--size-4)" v-if="pendingReward" >
      <div class="reward-assign__scan">
        <img :alt="pendingReward.name" :src="asset(pendingReward.art)">
        <div>
          <ore-text size="sm" variant="overline">{{ t('party.rewardAssignTitle') }}</ore-text>
          <ore-text variant="heading">{{ pendingReward.name }}</ore-text>
          <ore-text color="muted" size="sm">{{ t('forge.lvShort', { level: pendingReward.level }) }}</ore-text>
        </div>
      </div>
      <ore-text color="muted" size="sm">{{ t('party.rewardAssignBody') }}</ore-text>
      <div class="reward-assign__hunters">
        <button
          type="button"
          v-for="hunter in rewardHunters"
          :key="hunter.hunterId"
          :aria-label="t('party.rewardAssignAria', { hunter: hunter.name, name: pendingReward.name })"
          @click="assignReward(hunter.hunterId)">
          <ore-avatar rounded="sm" :alt="hunter.name" :src="hunter.src" />
          <span class="reward-assign__name">
            {{ hunter.name }}
            <small>{{ hunter.weapon }}</small>
          </span>
        </button>
      </div>
    </div>
  </ore-dialog>
</template>

<style scoped>
.party-console {
  --card-padding: clamp(1rem, 2vw, 1.5rem);
}

.save-status {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.hunter-workspace {
  display: grid;
  gap: 2rem;
  min-width: 0;
}

.hunter-profile {
  display: grid;
  grid-template-columns: minmax(15rem, 0.7fr) minmax(0, 1.3fr);
  min-width: 0;
  overflow: hidden;
  background: var(--p-panel-sunken);
  border: 1px solid var(--p-line);
  border-radius: var(--rounded-md);
}

.hunter-profile__art {
  min-height: 36rem;
  background:
    linear-gradient(90deg, transparent 68%, var(--p-panel-sunken)),
    var(--art) center top / cover no-repeat;
}

.hunter-profile__art--zaraya {
  background-position: 20% top;
}

.hunter-profile__art--daeron {
  background-position: 0% 0%, 25% center;
}

.hunter-profile__art--heleren {
  background-position: 0% 0%, 40% top;
}

.hunter-overview {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.7rem 1rem;
  align-content: center;
  min-width: 0;
  padding: 1.25rem;
}

.hunter-overview > :nth-child(-n + 3) {
  grid-column: 1 / -1;
}

.hunter-overview__section {
  display: grid;
  gap: 0.5rem;
  min-width: 0;
  padding-top: 0.65rem;
  border-top: 1px solid var(--p-line);
}

.hunter-overview__resources {
  align-content: start;
}

.resource-add {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.5rem;
  align-items: end;
  padding-bottom: var(--size-4);
}

.resource-list {
  display: grid;
  gap: 0.35rem;
  max-height: 19rem;
  padding: 0.25rem 0.5rem 0.25rem 0.25rem;
  margin: -0.25rem;
  overflow-y: auto;
  scrollbar-gutter: stable;
}

.resource-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto auto;
  gap: 0.35rem;
  align-items: center;
  min-height: 2rem;
}

.hunter-overview__resources .resource-row {
  min-height: 2rem;
  padding-block: 0.15rem;
}

.resource-count {
  justify-self: end;
  min-width: 2rem;
}

.party-action {
  --button-padding: 0;
  width: 2.75rem;
  min-width: 2.75rem;
  height: 2.75rem;
  min-height: 2.75rem;
}

.hunter-overview__section ore-stats {
  --stats-bg: transparent;
  --stats-padding: 0;
}

.hunter-notes {
  display: grid;
  gap: 1rem;
}

@media (width < 760px) {
  .hunter-profile {
    grid-template-columns: 1fr;
  }
  .hunter-profile__art {
    min-height: 18rem;
    background:
      linear-gradient(180deg, transparent 68%, var(--p-panel-sunken)),
      var(--art) center top / cover no-repeat;
    background-position: 0% 0%, var(--hunter-art-portrait-position, center 25%);
  }
  .hunter-overview {
    grid-template-columns: 1fr;
    padding: 0.75rem;
  }
  .hunter-overview > :nth-child(-n + 3) {
    grid-column: 1;
  }
}

.reward-assign__scan {
  display: flex;
  gap: var(--size-4);
  align-items: center;
}

.reward-assign__scan img {
  width: var(--size-24);
  height: var(--size-24);
  border-radius: var(--rounded-sm);
}

.reward-assign__hunters {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
  gap: var(--size-2);
}

.reward-assign__hunters button {
  display: flex;
  gap: var(--size-2);
  align-items: center;
  padding: var(--size-2);
  font-family: inherit;
  cursor: pointer;
  background: var(--p-panel-sunken);
  border: var(--border-2) solid var(--p-line-strong);
  border-radius: var(--rounded-sm);
  transition: border-color var(--p-motion) var(--p-ease);
}

.reward-assign__hunters button:hover {
  border-color: var(--p-gold-dim);
}

.reward-assign__name {
  display: grid;
  font-weight: 600;
  text-align: start;
}

.reward-assign__name small {
  font-weight: 400;
  color: var(--p-text-muted);
}
</style>
