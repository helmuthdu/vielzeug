<script lang="ts" setup>
import { computed } from 'vue';
import { asset } from '../../../app/assets';
import { t } from '../../../app/i18n';
import { ascents, runCommand } from '../../../app/store';
import { useReadable } from '../../../app/vue-bridge';
import { stepCardCount, weaponClassById } from '../../../content/index';
import { ASCENT_MAX_WOUNDS, ascentEquipmentFor, ascentPotions } from '../../../domain/ascent';
import { ascentDeckContext } from '../../../domain/deck';
import { carrierMonster } from '../../../domain/monster-state';
import type { AscentHunter, SubjectRef } from '../../../domain/types';
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
 * The ascent party workspace, shaped like the campaign console: read the selected hunter's profile
 *: with the carried wound cards where the campaign tracks hero resources and the card-pool
 * upgrades as its skills: then edit their player board. Equipment and potions are restricted to
 * the current chapter's level; the board is editable while the chapter is being prepared and
 * consumed from during its hunt.
 */
const props = defineProps<{ ascentId: string; selectedHunterId: string; showProfile: boolean }>();
const all = useReadable(ascents);
const ascent = computed(() => all.value.find((entry) => entry.id === props.ascentId));
const party = computed<readonly AscentHunter[]>(() => ascent.value?.hunters ?? []);
const subject = computed<SubjectRef>(() => ({ id: props.ascentId, kind: 'ascent' }));

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
} = usePartyDeck<AscentHunter>({
  canConsume: () => ascent.value?.phase === 'hunt',
  canEdit: () => ascent.value?.phase === 'preparing' || ascent.value?.phase === 'encounter',
  canUpgrade: () => ascent.value?.phase === 'preparing',
  contextFor: (member, hunter) => (ascent.value ? ascentDeckContext(ascent.value, member, hunter) : undefined),
  onUpgradeConfirmed: () => {
    openBranch.value = null;
  },
  party: () => party.value,
  selectedId: () => props.selectedHunterId,
  subject: () => subject.value,
});

const equipment = computed(() =>
  ascent.value && selectedHunter.value ? ascentEquipmentFor(ascent.value, selectedHunter.value) : [],
);
const potions = computed(() => (ascent.value ? ascentPotions(ascent.value) : []));
const huntTarget = computed(() => (ascent.value ? (carrierMonster(ascent.value) ?? null) : null));
/** Wounds are a preparation-phase tracker; the hunt itself is resolved on paper. */
const woundsEditable = computed(() => ascent.value?.phase === 'preparing');

function setWounds(event: Event): void {
  const member = selectedMember.value;
  if (!member || !woundsEditable.value) return;
  const { value } = (event as CustomEvent<{ value: number }>).detail;
  runCommand('setSubjectWounds', subject.value, member.hunterId, value);
}
</script>

<template>
  <div class="ascent-party stack" v-if="ascent && selectedMember && selectedHunter">
    <section aria-labelledby="ascent-selected-hunter-title" class="hunter-profile" v-if="props.showProfile">
      <div
        class="hunter-profile__art"
        :class="`hunter-profile__art--${selectedHunter.id}`"
        :style="{ '--art': `url(${asset(selectedHunter.artwork)})` }"></div>
      <div class="hunter-overview">
        <div>
          <ore-text variant="overline">{{ weaponClassById(selectedHunter.classId).name }}</ore-text>
          <ore-text as="h3" id="ascent-selected-hunter-title" size="md" variant="heading">
            {{ selectedHunter.name }}
          </ore-text>
          <ore-text color="muted" italic size="sm">{{ selectedHunter.title }}</ore-text>
        </div>
        <PlayerNameField :member="selectedMember" :subject="subject" />
        <ore-text class="hunter-overview__description" size="sm">{{ selectedHunter.description }}</ore-text>

        <section class="hunter-overview__section hunter-overview__skills">
          <UpgradeTree
            :can-choose="ascent.phase === 'preparing'"
            :hunter="selectedHunter"
            :member="selectedMember"
            @open="openBranch = $event">
            <template #aside-heading>
              <ore-text variant="overline">{{ t('ascentDetail.woundsTitle') }}</ore-text>
            </template>
            <template #aside-description="{ color }">
              <ore-text size="sm" :color="color as 'muted' | undefined">{{ t('ascentDetail.woundHint') }}</ore-text>
            </template>
            <template #aside>
              <div class="wound-card">
                <img alt="" class="wound-card__art" :src="asset('/backgrounds/bg_wound_card.svg')" />
                <ore-counter
                  class="wound-card__counter"
                  size="sm"
                  :hint="t('ascentDetail.woundCardText')"
                  :label="t('ascentDetail.woundCardTitle')"
                  :max="ASCENT_MAX_WOUNDS"
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
            editable
              ? 'ascentDetail.partyHint'
              : canConsume
                ? 'ascentDetail.partyConsumeHint'
                : 'ascentDetail.partyLockedHint',
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
    v-if="ascent && selectedMember && selectedHunter"
    :branch="openBranch"
    :can-choose="ascent.phase === 'preparing'"
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
.ascent-party {
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
