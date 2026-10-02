<script lang="ts" setup>
import '@vielzeug/refine/button';
import '@vielzeug/refine/grid';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/text';
import { computed, ref } from 'vue';
import { asset } from '../../../app/assets';
import { t, tp } from '../../../app/i18n';
import { forgeById, hunterCards, hunters } from '../../../content';
import type { ChroniclesHunterLoadouts } from '../../../domain/chronicles';
import type { Hunter, HunterCard } from '../../../domain/types';
import LinkButton from '../../components/LinkButton.vue';
import HunterCardDetail from '../../components/party/HunterCardDetail.vue';
import HunterIdentity from '../../components/party/HunterIdentity.vue';
import PickerDetailDialog from '../../components/party/PickerDetailDialog.vue';
import { equipmentPickerEntry } from '../../components/party/picker-entry';
import SlotCard from '../../components/party/SlotCard.vue';
import type { PickerEntry } from '../../components/party/SlotPicker.vue';
import { formatCount, page, recordedEquipment, tail } from './format';
import ShowMoreButton from './ShowMoreButton.vue';

const props = defineProps<{
  count: number;
  hunter: Hunter;
  loadouts: ChroniclesHunterLoadouts | undefined;
}>();

const cardById = new Map(
  hunters.flatMap((hunter) => hunterCards(hunter).map((card) => [card.id, card] as const)),
);
const equipment = computed(() => recordedEquipment(props.loadouts, props.hunter));
const weapons = computed(() => equipment.value.filter(({ id }) => forgeById(id)?.type === 'weapon'));
const otherEquipment = computed(() => equipment.value.filter(({ id }) => forgeById(id)?.type !== 'weapon'));
const equipmentName = (id: string) => forgeById(id)?.name ?? id;
const equipmentArtwork = (id: string) => {
  const piece = forgeById(id);

  return piece ? asset(piece.artwork) : null;
};
const equipmentIcon = (id: string) => {
  const type = forgeById(id)?.type;

  if (type === 'weapon') return 'swords';
  if (type === 'armor' || type === 'helm') return 'shield';

  return 'package';
};
const equipmentDetailCards = computed<PickerEntry[]>(() =>
  equipment.value.flatMap(({ id }) => {
    const piece = forgeById(id);

    return piece ? [equipmentPickerEntry(piece, false, piece.type === 'weapon')] : [];
  }),
);

/** The hunter's own card ledger: inclusion count first, then catalog type. */
const cards = computed(() =>
  [...(props.loadouts?.cards ?? [])].sort((left, right) => {
    const byCount = right.count - left.count;
    if (byCount) return byCount;
    const byType = (cardById.get(left.id)?.cardType ?? '').localeCompare(cardById.get(right.id)?.cardType ?? '');
    return byType || left.id.localeCompare(right.id);
  }),
);
const cardPage = computed(() => page(cards.value));
const cardTail = computed(() => tail(cards.value));
const expandedCards = ref(false);
const cardList = computed(() => (expandedCards.value ? cards.value : cardPage.value));
const cardDetails = computed(() =>
  cards.value.flatMap(({ id }) => {
    const card = cardById.get(id);

    return card ? [card] : [];
  }),
);
const cardName = (id: string) => cardById.get(id)?.name ?? id;
const cardArtwork = (id: string) => {
  const artwork = cardById.get(id)?.art;

  return artwork ? asset(artwork) : null;
};
const cardCategory = (id: string) => {
  const card = cardById.get(id);

  return card?.kind === 'mastery' ? t('party.mastery') : card?.cardType;
};

const inspectingEquipment = ref<PickerEntry | null>(null);
const inspectingActionCard = ref<HunterCard | null>(null);
const inspectEquipment = (id: string) => {
  inspectingEquipment.value = equipmentDetailCards.value.find((entry) => entry.id === id) ?? null;
};
const inspectActionCard = (id: string) => {
  inspectingActionCard.value = cardDetails.value.find((card) => card.id === id) ?? null;
};
</script>

<template>
  <section aria-labelledby="chronicle-hunter-dossier-title" class="chronicle__dossier" id="chronicle-hunter-dossier">
    <header class="chronicle__dossier-header">
      <h3 class="visually-hidden" id="chronicle-hunter-dossier-title">{{ hunter.name }}</h3>
      <HunterIdentity :hunter="hunter" />
      <div class="chronicle__dossier-actions">
        <span class="chronicle__roster-count">
          {{ tp('chronicles.huntUnit', count, { count: formatCount(count) }) }}
        </span>
        <LinkButton size="sm" to="builds" :query="{ hunter: hunter.id }" >
          {{ t('chronicles.openBuilds') }}
        </LinkButton>
      </div>
    </header>
    <ore-grid align="start" class="chronicle__dossier-groups" cols="1" cols-md="2" gap="lg">
      <section class="chronicle__dossier-group" :aria-label="t('chronicles.hunterEquipment')">
        <ore-text class="chronicle__armory-overline" color="muted" size="xs">
          {{ t('chronicles.hunterEquipment') }}
        </ore-text>
        <div class="chronicle__equipment-layout" v-if="equipment.length">
          <div class="chronicle__equipment-kind">
            <ore-text class="chronicle__equipment-kind-title" color="muted" size="xs">
              {{ t('chronicles.equipmentWeapons') }}
            </ore-text>
            <ul class="chronicle__equipment-grid chronicle__equipment-grid--weapons">
              <li class="chronicle__equipment-tile" v-for="row in weapons" :key="row.id">
                <div class="chronicle__equipment-art chronicle__equipment-art--weapon">
                  <SlotCard :art="equipmentArtwork(row.id) ?? null" :empty-icon="equipmentIcon(row.id)"
                    :label="equipmentName(row.id)" :name="equipmentName(row.id)" @inspect="inspectEquipment(row.id)" />
                </div>
                <div class="chronicle__equipment-meta">
                  <span class="chronicle__equipment-name">{{ equipmentName(row.id) }}</span>
                  <span class="chronicle__loadout-count">{{ formatCount(row.count) }}</span>
                </div>
              </li>
            </ul>
          </div>
          <div class="chronicle__equipment-kind">
            <ore-text class="chronicle__equipment-kind-title" color="muted" size="xs">
              {{ t('chronicles.equipmentOther') }}
            </ore-text>
            <ul class="chronicle__equipment-grid chronicle__equipment-grid--other">
              <li class="chronicle__equipment-tile" v-for="row in otherEquipment" :key="row.id">
                <div class="chronicle__equipment-art">
                  <SlotCard :art="equipmentArtwork(row.id) ?? null" :empty-icon="equipmentIcon(row.id)"
                    :label="equipmentName(row.id)" :name="equipmentName(row.id)" @inspect="inspectEquipment(row.id)" />
                </div>
                <div class="chronicle__equipment-meta">
                  <span class="chronicle__equipment-name">{{ equipmentName(row.id) }}</span>
                  <span class="chronicle__loadout-count">{{ formatCount(row.count) }}</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
        <p class="chronicle__empty" v-else>
          {{ loadouts?.equipment.length ? t('chronicles.baseEquipmentOnly') : t('chronicles.empty') }}
        </p>
      </section>
      <section class="chronicle__dossier-group" :aria-label="t('chronicles.hunterCards')">
        <ore-text class="chronicle__armory-overline" color="muted" size="xs">
          {{ t('chronicles.hunterCards') }}
        </ore-text>
        <ul class="chronicle__action-cards" id="chronicle-action-card-list" v-if="cardList.length">
          <li class="chronicle__action-card-tile" v-for="row in cardList" :key="row.id">
            <ore-button class="chronicle__action-card-art" fullheight variant="text" :disabled="!cardById.has(row.id)"
              :label="t('party.viewCardAria', { name: cardName(row.id) })" @click="inspectActionCard(row.id)">
              <img alt="" class="chronicle__action-card-artwork" decoding="async" loading="lazy"
                v-if="cardArtwork(row.id)" :src="cardArtwork(row.id) ?? ''" />
              <ore-icon aria-hidden="true" name="copy" size="24" v-else />
            </ore-button>
            <div class="chronicle__action-card-meta">
              <div class="chronicle__action-card-title">
                <span class="chronicle__action-card-name">{{ cardName(row.id) }}</span>
                <span class="chronicle__loadout-count">{{ formatCount(row.count) }}</span>
              </div>
              <span class="chronicle__action-card-category" v-if="cardCategory(row.id)">
                {{ cardCategory(row.id) }}
              </span>
            </div>
          </li>
        </ul>
        <ShowMoreButton class="chronicle__cards-more" controls="chronicle-action-card-list" v-if="cardTail.length"
          :expanded="expandedCards" :hidden-count="cardTail.length" :label="t(
            expandedCards ? 'chronicles.showFewerActionCards' : 'chronicles.showMoreActionCards',
            expandedCards ? {} : { count: cardTail.length },
          )
            " @toggle="expandedCards = !expandedCards" />
        <p class="chronicle__empty" v-if="!cardPage.length">{{ t('chronicles.empty') }}</p>
      </section>
    </ore-grid>
  </section>

  <PickerDetailDialog :card="inspectingEquipment" :cards="equipmentDetailCards" :label="inspectingEquipment?.name"
    @close="inspectingEquipment = null" @show="inspectingEquipment = $event" />
  <HunterCardDetail :card="inspectingActionCard" :cards="cardDetails" :read-only="true"
    @close="inspectingActionCard = null" @show="inspectingActionCard = $event" />
</template>

<style scoped>
/* The dossier: one hunter, whole — their gear ledgers and their card shape, in the sunken
   panel under their row. */
.chronicle__dossier {
  display: grid;
  gap: var(--size-3);
  padding: var(--size-1);
  margin: 0;
  background: transparent;
}

.chronicle__dossier-header {
  display: flex;
  gap: var(--size-4);
  align-items: center;
  justify-content: space-between;
  min-width: 0;
}

.chronicle__dossier-header :deep(.hunter-identity) {
  min-width: 0;
}

.chronicle__dossier-actions {
  display: flex;
  flex: none;
  gap: var(--size-3);
  align-items: center;
}

.chronicle__dossier-groups {
  width: 100%;
}

.chronicle__dossier-group {
  min-width: 0;
}

.chronicle__dossier-group:first-child {
  padding-inline-end: var(--size-4);
}

.chronicle__armory-overline {
  display: block;
  padding-block-end: var(--size-2);
  margin-block-end: var(--size-2);
}

.chronicle__equipment-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--size-2);
  padding: 0;
  margin: var(--size-2) 0 0;
  list-style: none;
}

.chronicle__equipment-layout {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--size-3);
}

.chronicle__equipment-kind {
  min-width: 0;
}

.chronicle__equipment-kind-title {
  display: block;
  margin-block-end: var(--size-2);
}

.chronicle__equipment-tile {
  display: grid;
  gap: var(--size-1);
  align-content: start;
  min-width: 0;
}

.chronicle__equipment-art,
.chronicle__action-card-art {
  display: grid;
  place-items: center;
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  color: var(--p-gold);
  background: var(--p-panel-sunken);
  border-radius: var(--rounded-sm);
}

.chronicle__equipment-art--weapon {
  aspect-ratio: 2 / 3;
}

.chronicle__equipment-art :deep(.slot-card) {
  width: 100%;
  height: 100%;
  cursor: zoom-in;
}

.chronicle__action-card-artwork {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.chronicle__equipment-meta,
.chronicle__action-card-title {
  display: flex;
  gap: var(--size-2);
  align-items: center;
  justify-content: space-between;
  min-width: 0;
}

.chronicle__equipment-name,
.chronicle__action-card-name {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chronicle__loadout-count {
  flex: none;
  padding: var(--size-0-5) var(--size-2);
  font-size: var(--text-xs);
  font-variant-numeric: tabular-nums;
  color: var(--p-text-muted);
  background: var(--p-panel-sunken);
  border-radius: var(--rounded-full);
}

.chronicle__action-cards {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--size-2);
  padding: 0;
  margin: var(--size-2) 0 0;
  list-style: none;
}

.chronicle__action-card-tile {
  display: grid;
  gap: var(--size-1);
  align-content: start;
  min-width: 0;
}

.chronicle__action-card-art {
  --button-padding: 0;
  aspect-ratio: 160 / 223;
  padding: 0;
  cursor: zoom-in;
}

.chronicle__action-card-meta {
  display: grid;
  gap: var(--size-1);
  min-width: 0;
}

.chronicle__action-card-category {
  flex: none;
  padding: var(--size-0-5) var(--size-2);
  font-size: var(--text-xs);
  color: var(--p-text-muted);
  text-transform: uppercase;
  white-space: nowrap;
  background: var(--p-panel-sunken);
  border-radius: var(--rounded-full);
}

@media (width < 640px) {
  .chronicle__dossier-group:first-child {
    padding-inline-end: 0;
  }

  .chronicle__equipment-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .chronicle__action-cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--size-3);
  }
}
</style>
