<script lang="ts" setup>
import { computed } from 'vue';
import { asset } from '../../../app/assets';
import { t } from '../../../app/i18n';
import CardText from '../CardText.vue';
import CardDetailDialog from './CardDetailDialog.vue';
import type { PickerEntry } from './SlotPicker.vue';
import '@vielzeug/refine/badge';
import '@vielzeug/refine/chip';
import '@vielzeug/refine/text';

/**
 * The full-card detail for one picker entry: the scan, level and element badges, the fact table
 * and the rules text: around the shared CardDetailDialog shell. The slot picker layers its warning
 * and equip action on top through the notice and action slots.
 */
const props = defineProps<{
  /** The shown entry; `null` closes. */
  card: PickerEntry | null;
  /** Ordered set the shown entry belongs to; enables browsing. */
  cards?: readonly PickerEntry[];
  /**
   * The currently equipped entry for the same slot. Facts render as current → candidate deltas
   * while a different piece is worn, so build decisions read at a glance.
   */
  compare?: PickerEntry | null;
  /** Marks the shown entry as the currently equipped one. */
  currentId?: string | null;
  /** Tooltip for effective badges, naming the hunt target. */
  effectiveTitle?: string;
  /** Accessible name; falls back to the entry name. */
  label?: string;
  /** The hunter's weapon-class icon, printed for "[weapon]" in the description. */
  weaponIcon?: string;
}>();
const emit = defineEmits<{ close: []; confirm: []; show: [entry: PickerEntry] }>();

const descriptionLines = computed(() =>
  props.card?.description
    ? props.card.description
        .split(/\\?\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
    : [],
);

const damageText = (damage: PickerEntry['damage']): string | null => {
  if (damage === undefined || damage === null) return null;
  // The piercing part prints as its icon beside the numbers, as on the card.
  return Array.isArray(damage) ? `${damage[0]} +${damage[1]}` : String(damage);
};

/** A candidate fact next to its equipped counterpart: "7 → 9" once a different piece is worn. */
const factDelta = (current: string | number | null | undefined, next: string | number | null): string | null => {
  if (next === null || next === undefined) return null;
  if (current === null || current === undefined || current === next) return String(next);
  return `${current} → ${next}`;
};

const damageLabel = computed(() => factDelta(damageText(props.compare?.damage), damageText(props.card?.damage)));
</script>

<template>
  <CardDetailDialog
    :card="card"
    :cards="cards"
    :label="label ?? card?.name"
    @close="emit('close')"
    @confirm="emit('confirm')"
    @show="emit('show', $event as PickerEntry)">
    <template #scan>
      <div class="picker-detail__scan" v-if="card">
        <img class="picker-detail__image" decoding="async" :alt="card.name" :src="asset(card.artwork)" />
      </div>
    </template>

    <template #default>
      <template v-if="card">
        <slot name="notice" />
        <div class="picker-detail__meta">
          <ore-badge size="sm" variant="flat" v-if="card.level">{{ t('party.levelShort') }} {{ card.level }}</ore-badge>
          <ore-badge size="sm" variant="flat" v-if="card.elementLabel">{{ card.elementLabel }}</ore-badge>
          <ore-badge color="success" size="sm" variant="flat" v-if="card.effective" :title="effectiveTitle" >
            {{ t('party.effectiveChip') }}
          </ore-badge>
          <ore-badge color="primary" size="sm" variant="flat" v-if="currentId !== undefined && card.id === currentId">
            {{ t('deck.equipped') }}
          </ore-badge>
        </div>
        <ore-text color="muted" size="xs" v-if="compare && compare.id !== card.id">
          {{ t('party.comparedTo', { name: compare.name }) }}
        </ore-text>
        <dl class="picker-detail__facts">
          <template v-if="card.health !== undefined && card.health !== null">
            <dt>{{ t('party.equipmentHealth') }}</dt>
            <dd>{{ factDelta(compare?.health, card.health) }}</dd>
          </template>
          <template v-if="damageLabel">
            <dt>{{ t('party.equipmentDamage') }}</dt>
            <dd class="picker-detail__damage">
              {{ damageLabel }}
              <!-- The piercing part prints as its icon, as on the card. -->
              <span
                class="picker-detail__pierce"
                role="img"
                v-if="Array.isArray(card.damage)"
                :aria-label="t('party.piercing')"
                :style="{ '--icon': `url(${asset('/icons/icon_pierce.svg')})` }" />
            </dd>
          </template>
        </dl>
        <!-- What the weapon asks of the deck: know the cost before committing the pick. -->
        <div class="picker-detail__composition" v-if="card.deckComposition">
          <ore-text variant="overline">{{ t('forge.deckComposition') }}</ore-text>
          <div class="cluster" style="--cluster-gap: var(--size-2)">
            <ore-chip color="error" size="sm" variant="solid">
              {{ t('forge.deckAttack', { count: card.deckComposition.attack }) }}
            </ore-chip>
            <ore-chip color="info" size="sm" variant="solid">
              {{ t('forge.deckManeuver', { count: card.deckComposition.maneuver }) }}
            </ore-chip>
            <ore-chip color="warning" size="sm" variant="solid">
              {{ t('forge.deckParry', { count: card.deckComposition.parry }) }}
            </ore-chip>
            <ore-chip color="success" size="sm" variant="solid">
              {{ t('forge.deckDodge', { count: card.deckComposition.dodge }) }}
            </ore-chip>
          </div>
        </div>
        <div class="picker-detail__text" v-if="descriptionLines.length">
          <ore-text size="sm" v-for="(line, lineIndex) in descriptionLines" :key="lineIndex">
            <CardText :text="line" :weapon-icon="weaponIcon" />
          </ore-text>
        </div>
        <ore-text color="muted" size="sm" v-else>{{ t('party.cardSeeScan') }}</ore-text>
      </template>
    </template>

    <template #action>
      <slot name="action" />
    </template>
  </CardDetailDialog>
</template>

<style scoped>
.picker-detail__scan {
  display: grid;
  place-items: center;
  overflow: hidden;
  background: var(--p-panel-sunken);
  border-radius: var(--rounded-md);
}

.picker-detail__image {
  max-width: 100%;
  max-height: 70dvh;
  object-fit: contain;
}

.picker-detail__meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-2);
}

.picker-detail__composition {
  display: grid;
  gap: var(--size-2);
}

.picker-detail__damage {
  display: inline-flex;
  gap: var(--size-0-5);
  align-items: center;
}

/* currentcolor through the mask keeps the icon legible in both themes. */
.picker-detail__pierce {
  width: 0.7em;
  height: 1.15em;
  background: currentcolor;
  mask: var(--icon) center / contain no-repeat;
}

.picker-detail__facts {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--size-1) var(--size-3);
  margin: 0;
}

.picker-detail__facts dt {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--p-text-muted);
  text-transform: uppercase;
  letter-spacing: var(--p-tracking);
}

.picker-detail__facts dd {
  margin: 0;
  font-size: var(--text-sm);
  font-variant-numeric: tabular-nums;
}

.picker-detail__text {
  display: grid;
  gap: var(--size-1);
}
</style>
