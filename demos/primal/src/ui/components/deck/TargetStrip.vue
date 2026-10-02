<script lang="ts" setup>
import { computed } from 'vue';
import { type MessageKey, t, tp } from '../../../app/i18n';
import { forgeById } from '../../../content';
import { deckAdvantages, EQUIPMENT_SLOTS } from '../../../domain/deck';
import type { EquipmentIds, EquipmentSlot, Monster } from '../../../domain/types';
import ResourceIcon from '../ResourceIcon.vue';
import '@vielzeug/refine/chip';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/text';

/** The hunt target and which worn pieces count as effective against it. */
const props = defineProps<{ equipment: EquipmentIds; monster: Monster }>();

const SLOT_LABEL: Record<EquipmentSlot, MessageKey> = {
  armor: 'party.slotArmor',
  helm: 'party.slotHelm',
  item: 'party.slotItem',
  weapon: 'party.slotWeapon',
};

const pieces = computed(() =>
  EQUIPMENT_SLOTS.map((slot) => {
    const piece = props.equipment[`${slot}Id`] ? forgeById(props.equipment[`${slot}Id`] as string) : undefined;
    const effective = !!piece?.element && props.monster.weaknesses.includes(piece.element);
    return { effective, element: piece?.element ?? null, name: piece?.name ?? null, slot, slotLabel: t(SLOT_LABEL[slot]) };
  }),
);
const effectiveCount = computed(() => pieces.value.filter((piece) => piece.effective).length);
const advantages = computed(() => deckAdvantages(effectiveCount.value));
</script>

<template>
  <section class="target" :aria-label="t('deck.targetTitle')">
    <div class="target__head">
      <div class="stack" style="--stack-gap: var(--size-1)">
        <ore-text variant="overline">{{ t('deck.targetTitle') }}</ore-text>
        <ore-text as="h3" size="sm" variant="heading">{{ monster.name }}</ore-text>
      </div>
      <div class="cluster" style="--cluster-gap: var(--size-1)">
        <span class="visually-hidden">{{ t('targetBoard.weakTo') }}</span>
        <ResourceIcon size="sm" v-for="id in monster.weaknesses" :key="id" :id="id" />
      </div>
    </div>

    <ul class="target__pieces" :aria-label="t('deck.effectiveEquipment')">
      <li class="target__piece" v-for="piece in pieces" :key="piece.slot" :class="{ 'target__piece--effective': piece.effective }">
        <ore-icon aria-hidden="true" :name="piece.effective ? 'check' : 'minus'" />
        <span class="target__slot">{{ piece.slotLabel }}</span>
        <span class="target__name">{{ piece.name ?? t('party.emptySlot', { slot: piece.slotLabel }) }}</span>
        <ResourceIcon size="sm" v-if="piece.element" :id="piece.element" />
        <span class="visually-hidden">{{ piece.effective ? t('deck.pieceEffective') : t('deck.pieceNotEffective') }}</span>
      </li>
    </ul>

    <div class="target__summary">
      <ore-chip size="sm" variant="flat" :color="effectiveCount ? 'success' : 'secondary'">
        {{ t('deck.effectiveCount', { count: effectiveCount, total: pieces.length }) }}
      </ore-chip>
      <ore-chip size="sm" variant="solid" :color="advantages ? 'primary' : 'secondary'">
        {{ tp('deck.advantagesGranted', advantages) }}
      </ore-chip>
      <ore-text color="muted" size="sm">{{ t('deck.advantagesRule') }}</ore-text>
    </div>
  </section>
</template>

<style scoped>
.target {
  display: grid;
  gap: var(--size-3);
  padding: var(--size-4);
  background: var(--p-panel-sunken);
  border: var(--border) solid var(--p-line);
  border-radius: var(--rounded-sm);
}

.target__head {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-2);
  align-items: flex-start;
  justify-content: space-between;
}

.target__pieces {
  display: grid;
  gap: var(--size-1-5);
  padding: 0;
  margin: 0;
  list-style: none;
}

.target__piece {
  display: grid;
  grid-template-columns: auto minmax(var(--size-16), auto) minmax(0, 1fr) auto;
  gap: var(--size-2);
  align-items: center;
  color: var(--p-text-muted);
}

.target__piece--effective {
  color: var(--p-text-strong);
}

.target__piece--effective ore-icon {
  color: var(--color-success);
}

.target__slot {
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: var(--p-tracking);
}

.target__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.target__summary {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-2);
  align-items: center;
}
</style>
