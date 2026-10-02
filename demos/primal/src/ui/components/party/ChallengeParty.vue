<script lang="ts" setup>
import { computed } from 'vue';
import { asset } from '../../../app/assets';
import { t } from '../../../app/i18n';
import { challenges, runCommand } from '../../../app/store';
import { useReadable } from '../../../app/vue-bridge';
import { forgeById, stepCardCount, weaponClassById } from '../../../content/index';
import { CHALLENGE_MAX_WOUNDS, challengePotions, challengeRewardPool } from '../../../domain/challenge';
import { challengeDeckContext, challengeEquipmentPool } from '../../../domain/deck';
import { carrierMonster } from '../../../domain/monster-state';
import type { ChallengeDraftSlot, ChallengeHunter, SubjectRef } from '../../../domain/types';
import { usePartyDeck } from '../../composables/use-party-deck';
import ConfirmDialog from '../ConfirmDialog.vue';
import BuildPickerDialog from '../deck/BuildPickerDialog.vue';
import ShareDialog from '../share/ShareDialog.vue';
import BranchSheet from './BranchSheet.vue';
import HunterCardDetail from './HunterCardDetail.vue';
import PlayerBoard from './PlayerBoard.vue';
import PlayerNameField from './PlayerNameField.vue';
import UpgradeTree from './UpgradeTree.vue';
import '@vielzeug/refine/counter';
import '@vielzeug/refine/text';

/**
 * The Winds series' party workspace, shaped like the ascent's preparation console: read the
 * selected hunter's profile: wound cards as the sheet's tracker, card-pool upgrades as its
 * skills: then edit their player board. During preparation the board drafts the sheet's starting
 * gear: each slot draws two level-1 cards and wears one, and the picker offers only the drawn
 * pair. During reward it spends the expedition's spoils: the defeated monster's element at the
 * fight's level, potions refilled per level.
 */
const props = defineProps<{ runId: string; selectedHunterId: string; showProfile: boolean }>();
const all = useReadable(challenges);
const run = computed(() => all.value.find((entry) => entry.id === props.runId));
const party = computed<readonly ChallengeHunter[]>(() => run.value?.hunters ?? []);
const subject: SubjectRef = { id: props.runId, kind: 'challenge' };

const {
  applyLoadout,
  autoFitDeck,
  canConsume,
  canEdit: editable,
  changeEquipment,
  changePotion,
  confirmUpgrade,
  consumePotion,
  context,
  equippedLoadout,
  openBranch,
  pendingUpgrade,
  pendingUpgradeCards,
  picking,
  report,
  requestUpgrade,
  selectedHunter,
  selectedMember,
  shareBuild,
  sharing,
  toggleCard,
  viewedCard,
  viewedCardLocked,
  viewedCardSelected,
} = usePartyDeck<ChallengeHunter>({
  canConsume: () => run.value?.phase === 'hunt',
  canEdit: () => run.value?.phase === 'preparing',
  canUpgrade: () => run.value?.phase === 'preparing',
  contextFor: (member, hunter) => (run.value ? challengeDeckContext(run.value, member, hunter) : undefined),
  // A later session wears the hunt's reward through the one-pick command, which enforces the
  // single card and the defeated-monster pool; the first session drafts from the dealt pair,
  // which the general wear path handles.
  equip: (member, slot, equipmentId) => {
    const current = run.value;
    if (current && current.expeditionNumber > 1 && equipmentId) {
      runCommand('takeChallengeEquipment', subject, member.hunterId, slot, equipmentId);
      return;
    }
    runCommand('equipEquipment', subject, member.hunterId, slot, equipmentId);
  },
  onUpgradeConfirmed: () => {
    openBranch.value = null;
  },
  party: () => party.value,
  selectedId: () => props.selectedHunterId,
  subject: () => subject,
});

/** A later session's preparation spends the hunt's one equipment reward; the first drafts instead. */
const spendsSpoils = computed(() => run.value?.phase === 'preparing' && run.value.expeditionNumber > 1);
/** Once the hunter has worn their one reward piece, the equipment slots close for the session. */
const equipmentLocked = computed(() => spendsSpoils.value && selectedMember.value?.equipmentRewardTaken === true);

/** The slots the sheet's draft covers: the order the picker lists the drawn pairs in. */
const DRAFT_SLOTS: readonly ChallengeDraftSlot[] = ['weapon', 'armor', 'helm'];

const equipment = computed(() => {
  const current = run.value;
  const hunter = selectedHunter.value;
  if (!current || !hunter) return [];
  // The first session drafts the sheet's starting gear from the dealt pair per slot: dealt
  // when the hunter joined and persisted with it, so the rest of the level-1 pool stays face
  // down and a reload re-deals nothing. A later session's preparation spends the last hunt's
  // spoils: the defeated monster's element at the current level, one card.
  if (current.phase === 'preparing') {
    if (current.expeditionNumber > 1) return challengeRewardPool(current, hunter);
    const pairs = selectedMember.value?.draftPairs;
    return DRAFT_SLOTS.flatMap((slot) =>
      (pairs?.[slot] ?? []).flatMap((id) => {
        const piece = forgeById(id);
        return piece ? [piece] : [];
      }),
    );
  }
  return challengeEquipmentPool(current.expansionIds, current.aggression, hunter);
});
const potions = computed(() => (run.value ? challengePotions(run.value) : []));
const huntTarget = computed(() => (run.value ? (carrierMonster(run.value) ?? null) : null));
/** Wounds are the sheet's tracker: gained in the fight, kept between expeditions until a bounty heals them. */
const woundsEditable = computed(() => run.value?.phase === 'hunt' || run.value?.phase === 'preparing');

function setWounds(event: Event): void {
  const member = selectedMember.value;
  if (!member || !woundsEditable.value) return;
  const { value } = (event as CustomEvent<{ value: number }>).detail;
  runCommand('setSubjectWounds', subject, member.hunterId, value);
}
</script>

<template>
  <div class="run-party stack" v-if="run && selectedMember && selectedHunter">
    <section aria-labelledby="run-selected-hunter-title" class="hunter-profile" v-if="props.showProfile">
      <div
        class="hunter-profile__art"
        :class="`hunter-profile__art--${selectedHunter.id}`"
        :style="{ '--art': `url(${asset(selectedHunter.artwork)})` }"></div>
      <div class="hunter-overview">
        <div>
          <ore-text variant="overline">{{ weaponClassById(selectedHunter.classId).name }}</ore-text>
          <ore-text as="h3" id="run-selected-hunter-title" size="md" variant="heading">
            {{ selectedHunter.name }}
          </ore-text>
          <ore-text color="muted" italic size="sm">{{ selectedHunter.title }}</ore-text>
        </div>
        <PlayerNameField :member="selectedMember" :subject="subject" />
        <ore-text class="hunter-overview__description" size="sm">{{ selectedHunter.description }}</ore-text>

        <section class="hunter-overview__section hunter-overview__skills">
          <UpgradeTree
            :can-choose="run.phase === 'preparing'"
            :hunter="selectedHunter"
            :member="selectedMember"
            @open="openBranch = $event">
            <template #aside-heading>
              <ore-text variant="overline">{{ t('challenge.woundsTitle') }}</ore-text>
            </template>
            <template #aside-description="{ color }">
              <ore-text size="sm" :color="color as 'muted' | undefined">{{ t('challenge.woundHint') }}</ore-text>
            </template>
            <template #aside>
              <div class="wound-card">
                <img alt="" class="wound-card__art" :src="asset('/backgrounds/bg_wound_card.svg')" />
                <ore-counter
                  class="wound-card__counter"
                  size="sm"
                  :hint="t('challenge.woundCardText')"
                  :label="t('challenge.woundCardTitle')"
                  :max="CHALLENGE_MAX_WOUNDS"
                  :readonly="!woundsEditable"
                  :value="selectedMember.woundCount"
                  @change="setWounds($event)" />
              </div>
            </template>
          </UpgradeTree>
        </section>
      </div>
    </section>

    <PlayerBoard
      :can-consume="canConsume"
      :can-edit="editable"
      :equipment="equipment"
      :equipment-pickable="!equipmentLocked"
      :hunter="selectedHunter"
      :loadout-name="equippedLoadout?.name"
      :member="selectedMember"
      :monster="huntTarget"
      :potions="potions"
      :report="report"
      @auto-fit="autoFitDeck"
      @consume="consumePotion"
      @equip="changeEquipment"
      @equip-potion="changePotion"
      @load="picking = true"
      @share="shareBuild">
      <template #hint>
        {{
          t(
            run.phase === 'hunt'
              ? 'challenge.partyConsumeHint'
              : spendsSpoils
                ? 'challenge.rewardBoardHint'
                : 'challenge.preparationBoardHint',
          )
        }}
      </template>
    </PlayerBoard>
  </div>

  <ShareDialog :subject="sharing" @close="sharing = null" />
  <BuildPickerDialog
    v-if="context && selectedMember"
    :context="context"
    :current="selectedMember"
    :hunter-id="selectedMember.hunterId"
    :open="picking"
    @apply="applyLoadout"
    @close="picking = false" />

  <HunterCardDetail
    :card="viewedCard"
    :locked-label="viewedCardLocked"
    :selected="viewedCardSelected"
    :zoom="null"
    @close="viewedCard = null"
    @toggle="toggleCard" />

  <BranchSheet
    v-if="run && selectedMember && selectedHunter"
    :branch="openBranch"
    :can-choose="run.phase === 'preparing'"
    :hunter="selectedHunter"
    :member="selectedMember"
    @close="openBranch = null"
    @inspect="viewedCard = $event"
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
</template>

<style scoped>
.run-party {
  --stack-gap: 2rem;
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
  min-height: 24rem;
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
  /* Auto track for the wounds column so the card can grow to its printed ratio; the
     upgrade tree takes the rest. */
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--size-6);
  align-content: center;
  min-width: 0;
  padding: 1.25rem;
}

.hunter-overview > :nth-child(-n + 3) {
  grid-column: 1 / -1;
}

.hunter-overview__skills {
  grid-column: 1 / -1;
}

/* One divider under the description, spanning both columns, instead of a border-top per
   section: two edges split by the column gap read as a cropped line. */
.hunter-overview__description {
  padding-bottom: 0.65rem;
  border-bottom: 1px solid var(--p-line);
}

.hunter-overview__section {
  display: grid;
  gap: 0.5rem;
  min-width: 0;
}

.wound-card {
  position: relative;
  width: 100%;
  height: auto;
  aspect-ratio: 570 / 758;
  margin-inline: auto;
}

.wound-card__art {
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border: var(--border) solid var(--p-line);
  border-radius: var(--rounded-sm);
}

.wound-card__counter {
  --color-error: var(--p-blood);
  --counter-bg: transparent;
  --counter-border-color: transparent;
  --counter-gap: var(--size-1);
  position: absolute;
  inset-inline: var(--size-2);
  top: var(--size-2);
}

.wound-card__counter::part(header) {
  justify-content: center;
}

@media (width < 900px) {
  .hunter-profile {
    grid-template-columns: 1fr;
  }
  .hunter-profile__art {
    min-height: 16rem;
    background:
      linear-gradient(180deg, transparent 68%, var(--p-panel-sunken)),
      var(--art) center top / cover no-repeat;
    background-position: 0% 0%, var(--hunter-art-portrait-position, center 25%);
  }
  .hunter-overview {
    grid-template-columns: auto minmax(0, 1fr);
    padding: 0.75rem;
  }
  .hunter-overview > :nth-child(-n + 2) {
    grid-column: 1 / -1;
  }
}

@media (width < 560px) {
  .hunter-overview {
    grid-template-columns: 1fr;
  }

  .hunter-overview > :nth-child(-n + 2) {
    grid-column: 1;
  }

  .wound-card {
    width: min(100%, 10rem);
    height: auto;
    aspect-ratio: 570 / 758;
  }
}
</style>
