<script lang="ts" setup>
import { computed } from 'vue';
import { t } from '../../../../app/i18n';
import { campaigns, runCommand } from '../../../../app/store';
import { useReadable } from '../../../../app/vue-bridge';
import { forgeEquipment, hunterById, potionById } from '../../../../content/index';
import { campaignDeckContext, validateDeck } from '../../../../domain/deck';
import { carrierMonster } from '../../../../domain/monster-state';
import PlayerBoard from '../../../components/party/PlayerBoard.vue';

const props = defineProps<{ campaignId: string; selectedHunterId: string }>();
const all = useReadable(campaigns);
const campaign = computed(() => all.value.find((entry) => entry.id === props.campaignId));
const selectedMember = computed(() => {
  const members = campaign.value?.hunters ?? [];
  return members.find((member) => member.hunterId === props.selectedHunterId) ?? members[0];
});
const selectedHunter = computed(() => (selectedMember.value ? hunterById(selectedMember.value.hunterId) : undefined));
const deckContext = computed(() =>
  campaign.value && selectedMember.value && selectedHunter.value
    ? campaignDeckContext(campaign.value, selectedMember.value, selectedHunter.value)
    : undefined,
);
const deckReport = computed(() =>
  deckContext.value && selectedMember.value
    ? validateDeck(selectedMember.value.deckCardIds, deckContext.value)
    : undefined,
);
const equipment = computed(() =>
  selectedMember.value
    ? forgeEquipment.filter((entry) => selectedMember.value?.craftedEquipmentIds.includes(entry.id))
    : [],
);
const potions = computed(() => selectedMember.value?.potionInventoryIds.flatMap((id) => potionById(id) ?? []) ?? []);
const monster = computed(() => (campaign.value ? (carrierMonster(campaign.value) ?? null) : null));

function consumePotion(potionId: string): void {
  const current = campaign.value;
  const member = selectedMember.value;
  if (!current || !member) return;
  runCommand('consumePotion', { id: current.id, kind: 'campaign' }, member.hunterId, potionId);
}
</script>

<template>
  <PlayerBoard
    v-if="campaign && selectedMember && selectedHunter"
    :can-consume="true"
    :can-edit="false"
    :deck-route="{ params: { hunterId: selectedMember.hunterId, id: campaign.id }, to: 'campaignDeck' }"
    :equipment="equipment"
    :hunter="selectedHunter"
    :member="selectedMember"
    :monster="monster"
    :potions="potions"
    :report="deckReport"
    @consume="consumePotion">
    <template #hint>{{ t('party.loadoutHint') }}</template>
  </PlayerBoard>
</template>
