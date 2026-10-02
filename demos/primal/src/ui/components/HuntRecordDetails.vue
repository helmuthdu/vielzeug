<script lang="ts" setup>
import { t } from '../../app/i18n';
import { forgeById, hunterById, hunterCards, hunters } from '../../content';
import type { HuntRecord } from '../../domain/types';
import HuntTimeline from './HuntTimeline.vue';
import HunterIdentity from './party/HunterIdentity.vue';

defineProps<{
  layout?: 'responsive';
  record: HuntRecord;
}>();

const cardById = new Map(hunters.flatMap((hunter) => hunterCards(hunter).map((card) => [card.id, card] as const)));

function equipmentFor(hunter: HuntRecord['hunters'][number]): string[] {
  const equipment: Array<[string, string | null]> = [
    [t('party.slotWeapon'), hunter.equipment.weaponId],
    [t('party.slotHelm'), hunter.equipment.helmId],
    [t('party.slotArmor'), hunter.equipment.armorId],
    [t('party.slotItem'), hunter.equipment.itemId],
  ];

  return equipment.flatMap(([slot, id]) => (id ? [`${slot}: ${forgeById(id)?.name ?? id}`] : []));
}

const cardsFor = (hunter: HuntRecord['hunters'][number]) =>
  hunter.deckCardIds.map((id) => cardById.get(id)?.name ?? id).join(', ');
</script>

<template>
  <div class="hunt-record-layout" :class="{ 'hunt-record-layout--responsive': layout === 'responsive' }">
    <div class="hunt-record-layout__content">
      <div class="hunt-record-layout__timeline">
        <HuntTimeline :record="record" />
      </div>
      <ul class="hunt-record-details" :aria-label="t('chronicles.huntParty')">
    <li class="hunt-record-details__member" v-for="entry in record.hunters" :key="entry.hunterId">
      <HunterIdentity v-if="hunterById(entry.hunterId)" :hunter="hunterById(entry.hunterId)!" />
      <span v-else>{{ entry.hunterId }}</span>
      <dl class="hunt-record-details__facts">
        <div>
          <dt>{{ t('chronicles.huntEquipment') }}</dt>
          <dd>{{ equipmentFor(entry).join(', ') || t('chronicles.huntNoEquipment') }}</dd>
        </div>
        <div>
          <dt>{{ t('chronicles.huntActionCards') }}</dt>
          <dd>{{ cardsFor(entry) || t('chronicles.huntNoActionCards') }}</dd>
        </div>
        <div v-if="entry.masteryCardId">
          <dt>{{ t('party.mastery') }}</dt>
          <dd>{{ cardById.get(entry.masteryCardId)?.name ?? entry.masteryCardId }}</dd>
        </div>
      </dl>
    </li>
    <li class="hunt-record-details__empty" v-if="!record.hunters.length">
      {{ t('chronicles.durationEmptyParty') }}
    </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.hunt-record-layout__content {
  display: contents;
}

.hunt-record-layout--responsive {
  container-name: hunt-record;
  container-type: inline-size;
}

.hunt-record-layout--responsive .hunt-record-layout__content {
  display: flex;
  flex-direction: column;
  gap: var(--size-5);
  align-items: stretch;
}

.hunt-record-layout__timeline {
  min-width: 0;
}

.hunt-record-layout--responsive :deep(.hunt-timeline) {
  margin: 0;
}

.hunt-record-details {
  display: grid;
  gap: var(--size-2);
  padding: 0 var(--size-8);
  margin: var(--size-4) 0 0;
  list-style: none;
}

.hunt-record-details__member {
  display: grid;
  grid-template-columns: minmax(0, 0.65fr) minmax(0, 1.35fr);
  gap: var(--size-4);
  align-items: start;
  padding-block: var(--size-2);
  border-block-start: 1px solid var(--p-line);
}

.hunt-record-details__member:first-child {
  padding-block-start: 0;
  border-block-start: 0;
}

.hunt-record-details__facts {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-2) var(--size-5);
  margin: 0;
}

.hunt-record-details__facts > div {
  display: grid;
  gap: var(--size-0-5);
  min-width: 0;
}

.hunt-record-details__facts dt {
  font-size: var(--text-xs);
  color: var(--p-text-muted);
}

.hunt-record-details__facts dd {
  margin: 0;
  overflow-wrap: anywhere;
}

.hunt-record-details__empty {
  color: var(--p-text-muted);
}

@media (width < 640px) {
  .hunt-record-details__member {
    grid-template-columns: minmax(0, 1fr);
  }
}

.hunt-record-layout--responsive .hunt-record-details {
  align-content: start;
  min-width: 0;
  padding: 0;
  margin: 0;
}

.hunt-record-layout--responsive .hunt-record-details__member {
  display: flex;
  flex-direction: column;
  gap: var(--size-2);
}

@container hunt-record (min-width: 56rem) {
  .hunt-record-layout--responsive .hunt-record-layout__content {
    flex-direction: row;
    align-items: flex-start;
  }

  .hunt-record-layout--responsive .hunt-record-layout__timeline {
    flex: 1.2 1 0;
  }

  .hunt-record-layout--responsive .hunt-record-details {
    flex: 1 1 0;
  }
}
</style>
