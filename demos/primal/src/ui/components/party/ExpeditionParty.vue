<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { asset } from '../../../app/assets';
import { t } from '../../../app/i18n';
import { expeditions } from '../../../app/store';
import { useReadable } from '../../../app/vue-bridge';
import { hunterById, weaponClassById } from '../../../content/index';
import { eligibleEquipment, expeditionDeckContext, validateDeck } from '../../../domain/deck';
import { expeditionPotions } from '../../../domain/expedition';
import { carrierMonster } from '../../../domain/monster-state';
import type { ExpeditionHunter, SubjectRef } from '../../../domain/types';
import { usePartyDeck } from '../../composables/use-party-deck';
import BuildPickerDialog from '../deck/BuildPickerDialog.vue';
import ShareDialog from '../share/ShareDialog.vue';
import HunterRoster from './HunterRoster.vue';
import PlayerBoard from './PlayerBoard.vue';
import PlayerNameField from './PlayerNameField.vue';
import '@vielzeug/refine/text';

/**
 * The expedition's party workspace: pick a hunter, then edit their player board. Expeditions are the full-hunter
 * sandbox: any class-eligible piece and any potion from the enabled boxes: editable until the result is recorded.
 */
const props = defineProps<{ deckQuery?: Record<string, string>; expeditionId: string; modelValue?: string }>();
const emit = defineEmits<{ 'update:modelValue': [hunterId: string] }>();
const all = useReadable(expeditions);
const expedition = computed(() => all.value.find((entry) => entry.id === props.expeditionId));
const party = computed<readonly ExpeditionHunter[]>(() => expedition.value?.hunters ?? []);
const partyHunters = computed(() => party.value.flatMap((member) => hunterById(member.hunterId) ?? []));
const selectedHunterId = ref(props.modelValue || '');
const subject: SubjectRef = { id: props.expeditionId, kind: 'expedition' };

const {
  applyLoadout,
  autoFitDeck,
  canEdit: editable,
  changeEquipment,
  changePotion,
  consumePotion,
  context,
  equippedLoadout,
  picking,
  report,
  selectedHunter,
  selectedMember,
  shareBuild,
  sharing,
} = usePartyDeck<ExpeditionHunter>({
  canConsume: () => expedition.value?.status !== 'played',
  canEdit: () => expedition.value?.status !== 'played',
  canUpgrade: () => false,
  contextFor: (member, hunter) =>
    expedition.value ? expeditionDeckContext(expedition.value, member, hunter) : undefined,
  party: () => party.value,
  selectedId: () => selectedHunterId.value,
  subject: () => subject,
});

watch(
  () => props.modelValue,
  (value) => {
    if (value && value !== selectedHunterId.value) selectHunter(value);
  },
);
/** One selection for every face of the party: the roster, the board below it, and the
 *  dock's deck link — the campaign's own shared-selection grammar. */
function selectHunter(hunterId: string): void {
  if (hunterId === selectedMember.value?.hunterId) return;
  selectedHunterId.value = hunterId;
  emit('update:modelValue', hunterId);
}

const equipment = computed(() =>
  expedition.value && selectedHunter.value
    ? eligibleEquipment(expedition.value.expansionIds, selectedHunter.value)
    : [],
);
const potions = computed(() => (expedition.value ? expeditionPotions(expedition.value) : []));
const huntTarget = computed(() => (expedition.value ? (carrierMonster(expedition.value) ?? null) : null));
const partyDeckStatus = computed<Record<string, boolean>>(() => {
  if (!expedition.value) return {};
  const map: Record<string, boolean> = {};
  for (const member of expedition.value.hunters) {
    const hunter = hunterById(member.hunterId);
    if (!hunter) continue;
    const ctx = expeditionDeckContext(expedition.value, member, hunter);
    map[member.hunterId] = validateDeck(member.deckCardIds, ctx).valid;
  }
  return map;
});
</script>

<template>
  <div class="expedition-party party-workspace" v-if="expedition && selectedMember && selectedHunter">
    <HunterRoster
      :deck-status="partyDeckStatus"
      :hunters="partyHunters"
      :selected-id="selectedHunter.id"
      @select="selectHunter" />

    <section
      aria-labelledby="expedition-selected-hunter-title"
      class="hunter-profile"
      v-if="expedition.status === 'draft'">
      <div
        class="hunter-profile__art"
        :class="`hunter-profile__art--${selectedHunter.id}`"
        :style="{ '--art': `url(${asset(selectedHunter.artwork)})` }"></div>
      <div class="hunter-overview">
        <div class="hunter-overview__identity">
          <ore-text variant="overline">{{ weaponClassById(selectedHunter.classId).name }}</ore-text>
          <ore-text as="h3" id="expedition-selected-hunter-title" size="md" variant="heading">
            {{ selectedHunter.name }}
          </ore-text>
          <ore-text color="muted" italic size="sm">{{ selectedHunter.title }}</ore-text>
        </div>
        <PlayerNameField :member="selectedMember" :subject="subject" />
        <ore-text class="hunter-overview__description" size="sm">{{ selectedHunter.description }}</ore-text>
      </div>
    </section>

    <PlayerBoard
      :can-consume="editable"
      :can-edit="editable"
      :deck-route="{
        params: { hunterId: selectedMember.hunterId, id: expedition.id },
        query: deckQuery,
        to: 'expeditionDeck',
      }"
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
      <template #hint>{{ t(editable ? 'expeditionDetail.partyHint' : 'deck.lockedExpedition') }}</template>
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
</template>

<style scoped>
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
  gap: var(--size-4);
  align-content: center;
  min-width: 0;
  padding: var(--size-6);
}

.hunter-overview__identity {
  display: grid;
  gap: var(--size-1);
}

.hunter-overview__description {
  padding-bottom: var(--size-3);
  border-bottom: 1px solid var(--p-line);
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
}

@media (width < 560px) {
  .hunter-overview {
    padding: var(--size-4);
  }
}
</style>
