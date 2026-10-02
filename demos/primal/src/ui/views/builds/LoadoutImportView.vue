<script lang="ts" setup>
import { computed, ref } from 'vue';
import { asset } from '../../../app/assets';
import { type MessageKey, t } from '../../../app/i18n';
import { importLoadout, loadouts, notifyError, settings } from '../../../app/store';
import { navigate, useMediaQuery, useReadable, useRouteParams } from '../../../app/vue-bridge';
import { forgeById, forgeElementLabel, hunterById, hunterCards, potionById, weaponClassById } from '../../../content/index';
import { DECK_TYPES, deckTypeOf, loadoutDeckContext, sameBuild, validateDeck } from '../../../domain/deck';
import { PrimalDomainError } from '../../../domain/errors';
import { decodeLoadoutCode, type SharedBuild } from '../../../domain/loadout';
import type { EquipmentSlot, ForgeEquipment, Potion } from '../../../domain/types';
import LinkButton from '../../components/LinkButton.vue';
import PageHeader from '../../components/PageHeader.vue';
import PhaseBackButton from '../../components/PhaseBackButton.vue';
import PhaseDock from '../../components/PhaseDock.vue';
import '@vielzeug/refine/alert';
import '@vielzeug/refine/button';
import '@vielzeug/refine/card';
import '@vielzeug/refine/chip';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/text';

/**
 * Deep link for a shared build: decodes the code, previews the build, and only saves it to the
 * library when the player confirms. The gear reads as a mosaic of scans with no captions; tapping a
 * tile brings its stats up in the detail panel beside the board.
 */
const SLOT_LABEL: Record<EquipmentSlot, MessageKey> = {
  armor: 'party.slotArmor',
  helm: 'party.slotHelm',
  item: 'party.slotItem',
  weapon: 'party.slotWeapon',
};
/** Printed board order: weapon first as the anchor, then helm, armor and the trinket slot. */
const GEAR_SLOTS: readonly EquipmentSlot[] = ['weapon', 'helm', 'armor', 'item'];

const params = useRouteParams();
/** The dock's phone tiers: the commit action shrinks to its glyph circle. */
const isPhone = useMediaQuery('(width < 640px)');
const saved = useReadable(loadouts);
const owned = useReadable(settings);

const decoded = computed<{ build: SharedBuild } | { error: string }>(() => {
  try {
    return { build: decodeLoadoutCode(params.value.code ?? '') };
  } catch (error) {
    return { error: error instanceof PrimalDomainError ? t('deck.importInvalid') : t('deck.importUnknownHunter') };
  }
});
const build = computed(() => ('build' in decoded.value ? decoded.value.build : undefined));
const hunter = computed(() => (build.value ? hunterById(build.value.hunterId) : undefined));
const alreadySaved = computed(() =>
  build.value
    ? saved.value.find(
        (entry) => entry.hunterId === build.value?.hunterId && sameBuild(entry, build.value as SharedBuild),
      )
    : undefined,
);
/** The same legality report the build library shows, judged against the owned boxes. */
const report = computed(() =>
  build.value && hunter.value
    ? validateDeck(
        build.value.deckCardIds,
        loadoutDeckContext(owned.value.ownedExpansionIds, build.value, hunter.value),
      )
    : null,
);
/** One mosaic tile: the scan (or its absence), the slot it fills, and the underlying card for the detail panel. */
interface GearTile {
  artwork: string | null;
  /** Icon shown while the slot is empty, mirroring the party board. */
  emptyIcon: string;
  equipment?: ForgeEquipment;
  key: string;
  label: string;
  name: string | null;
  potion?: Potion;
  weapon: boolean;
}

/**
 * The gear mosaic: the weapon anchors the left column across both rows, the other worn slots fill
 * the top row and the three potion slots the bottom one. Empty slots stay visible so the board reads
 * as the fixed hunter loadout it mirrors.
 */
const gear = computed<GearTile[]>(() => {
  if (!build.value || !hunter.value) return [];
  const classIcon = weaponClassById(hunter.value.classId).icon;
  return [
    ...GEAR_SLOTS.map((slot) => {
      const id = build.value?.equipment[`${slot}Id`] ? (build.value.equipment[`${slot}Id`] as string) : undefined;
      const equipment = id ? forgeById(id) : undefined;
      return {
        artwork: equipment?.artwork ?? null,
        emptyIcon:
          slot === 'weapon' ? classIcon : slot === 'helm' ? '/icons/icon_helmet.svg' : `/icons/icon_${slot}.svg`,
        equipment,
        key: slot,
        label: t(SLOT_LABEL[slot]),
        name: equipment?.name ?? null,
        weapon: slot === 'weapon',
      };
    }),
    ...(build.value?.potionLoadoutIds ?? []).map((id, index) => {
      const potion = id ? potionById(id) : undefined;
      return {
        artwork: potion?.artwork ?? null,
        emptyIcon: '/icons/icon_potion.svg',
        key: `potion-${index}`,
        label: t('party.potionSlot', { index: index + 1 }),
        name: potion?.name ?? null,
        potion,
        weapon: false,
      };
    }),
  ];
});

const selectedKey = ref('weapon');
const selected = computed(() => gear.value.find((entry) => entry.key === selectedKey.value) ?? gear.value[0]);

const damageLabel = (damage: number | readonly [number, number]): string =>
  Array.isArray(damage) ? t('forge.damageNormalPiercing', { normal: damage[0], piercing: damage[1] }) : String(damage);

/** Everything the detail panel shows for the selected tile, normalised across equipment and potions. */
const detail = computed(() => {
  const entry = selected.value;
  if (!entry) return null;
  const equipment = entry.equipment;
  const potion = entry.potion;
  return {
    composition: equipment?.type === 'weapon' ? equipment.deckComposition : null,
    damage: equipment?.type === 'weapon' && equipment.damage !== null ? damageLabel(equipment.damage) : null,
    description: equipment?.description ?? potion?.description ?? null,
    element: equipment ? forgeElementLabel(equipment.element) : null,
    empty: !entry.artwork,
    health: equipment && (equipment.type === 'armor' || equipment.type === 'helm') ? equipment.health : null,
    key: entry.key,
    label: entry.label,
    level: equipment?.level ?? potion?.level ?? null,
    name: entry.name,
  };
});

/**
 * The deck as one table: each printed type carries its required/selected count and the cards picked
 * for it, so the composition and the card list read together instead of as two separate sections.
 */
const deckRows = computed(() => {
  const deck = report.value;
  if (!build.value || !hunter.value || !deck) return [];
  const byId = new Map(hunterCards(hunter.value).map((card) => [card.id, card]));
  const picked = build.value.deckCardIds.map((id) => byId.get(id)).filter((card) => card !== undefined);
  return DECK_TYPES.map((type) => ({
    cards: picked.filter((card) => deckTypeOf(card) === type),
    required: deck.required?.[type] ?? 0,
    selected: deck.selected[type],
    type,
  }));
});
const requiredTotal = computed(() =>
  report.value?.required ? Object.values(report.value.required).reduce((sum, count) => sum + count, 0) : 0,
);
const deckStatus = computed(() => {
  if (!report.value) return null;
  if (!report.value.required) return { color: 'warning', label: t('deck.statusNoWeapon') } as const;
  if (report.value.valid) return { color: 'success', label: t('deck.statusReady') } as const;
  return { color: 'error', label: t('deck.statusInvalid') } as const;
});

function save(): void {
  if (!build.value) return;
  try {
    const loadout = importLoadout(params.value.code ?? '');
    void navigate('buildEdit', { id: loadout.id }, undefined, { replace: true });
  } catch (error) {
    notifyError('deck.importInvalid', error);
  }
}
</script>

<template>
  <div class="frame stack">
    <PageHeader
      art="/backgrounds/bg_build.webp"
      :eyebrow="t('deck.importEyebrow')"
      :subtitle="build && hunter ? t('deck.importSubtitle', { hunter: hunter.name }) : undefined"
      :title="build?.name ?? t('deck.importTitle')" />

    <!-- The preview's working span: the dock rides with it to the page's end. -->
    <div class="phase-flow" style="--phase-gap: var(--size-5)" v-if="build && hunter">
    <ore-card padding="lg">
      <div class="stack">
        <div class="import__identity">
          <img alt="" class="import__portrait" :src="asset(hunter.artwork)" />
          <div class="stack" style="--stack-gap: var(--size-2)">
            <ore-text as="h2" size="md" variant="heading">{{ hunter.name }}</ore-text>
            <ore-chip size="sm" variant="flat">{{ weaponClassById(hunter.classId).name }}</ore-chip>
          </div>
        </div>

        <div class="import__overview">
          <div class="stack import__gear" style="--stack-gap: var(--size-2)">
            <ore-text as="h2" size="xs" variant="heading">{{ t('deck.equipmentTitle') }}</ore-text>
            <div class="import__mosaic">
              <button
                class="import__tile"
                type="button"
                v-for="entry in gear"
                :key="entry.key"
                :aria-label="entry.name ?? t('party.emptySlot', { slot: entry.label })"
                :aria-pressed="detail?.key === entry.key"
                :class="{ 'import__tile--weapon': entry.weapon }"
                @click="selectedKey = entry.key">
                <img alt="" v-if="entry.artwork" :src="asset(entry.artwork)" />
                <span
                  aria-hidden="true"
                  class="import__tile-empty"
                  v-else
                  :style="{ '--slot-icon': `url(${asset(entry.emptyIcon)})` }"></span>
              </button>
            </div>
            <ore-text color="muted" size="sm">{{ t('deck.importDetailHint') }}</ore-text>
          </div>

          <aside class="import__detail stack" style="--stack-gap: var(--size-3)" v-if="detail">
            <template v-if="!detail.empty">
              <ore-text variant="overline">{{ detail.label }}</ore-text>
              <ore-text as="h3" size="sm" variant="heading">{{ detail.name }}</ore-text>
              <div class="cluster" style="--cluster-gap: var(--size-1)">
                <ore-chip size="sm" variant="flat" v-if="detail.level !== null">
                  {{ t('party.levelShort') }} {{ detail.level }}
                </ore-chip>
                <ore-chip size="sm" variant="flat" v-if="detail.element">
                  {{ t('forge.element') }}: {{ detail.element }}
                </ore-chip>
                <ore-chip size="sm" variant="outline" v-if="detail.damage">
                  {{ t('forge.damageChip', { damage: detail.damage }) }}
                </ore-chip>
                <ore-chip size="sm" variant="outline" v-if="detail.health !== null">
                  {{ t('forge.healthChip', { health: detail.health }) }}
                </ore-chip>
              </div>
              <section class="stack" style="--stack-gap: var(--size-1)" v-if="detail.composition">
                <ore-text variant="overline">{{ t('forge.deckComposition') }}</ore-text>
                <div class="cluster" style="--cluster-gap: var(--size-1)">
                  <ore-chip color="error" size="sm" variant="solid">
                    {{ t('forge.deckAttack', { count: detail.composition.attack }) }}
                  </ore-chip>
                  <ore-chip color="info" size="sm" variant="solid">
                    {{ t('forge.deckManeuver', { count: detail.composition.maneuver }) }}
                  </ore-chip>
                  <ore-chip color="warning" size="sm" variant="solid">
                    {{ t('forge.deckParry', { count: detail.composition.parry }) }}
                  </ore-chip>
                  <ore-chip color="success" size="sm" variant="solid">
                    {{ t('forge.deckDodge', { count: detail.composition.dodge }) }}
                  </ore-chip>
                </div>
              </section>
              <section class="stack" style="--stack-gap: var(--size-1)" v-if="detail.description">
                <ore-text variant="overline">{{ t('forge.effect') }}</ore-text>
                <ore-text size="sm">{{ detail.description }}</ore-text>
              </section>
            </template>
            <ore-text color="muted" size="sm" v-else>{{ t('party.emptySlot', { slot: detail.label }) }}</ore-text>
          </aside>
        </div>

        <section class="import__deck stack" style="--stack-gap: var(--size-3)">
          <div class="import__deck-head">
            <ore-text as="h2" size="xs" variant="heading">{{ t('deck.cardsTitle') }}</ore-text>
            <span class="cluster" style="--cluster-gap: var(--size-2)" v-if="report">
              <ore-text class="import__deck-total" variant="heading">
                {{ report.size }}
                <span class="import__deck-of">/ {{ requiredTotal }}</span>
              </ore-text>
              <ore-chip size="sm" variant="flat" v-if="deckStatus" :color="deckStatus.color">
                {{ deckStatus.label }}
              </ore-chip>
            </span>
          </div>
          <div class="import__groups">
            <section class="import__group" v-for="row in deckRows" :key="row.type">
              <div class="import__group-head">
                <ore-text variant="overline">{{ t(`deck.type.${row.type}`) }}</ore-text>
                <span
                  class="import__group-count"
                  :class="{ 'import__group-count--off': row.selected !== row.required }">
                  {{ row.selected }}
                  <span class="import__deck-of">/{{ row.required }}</span>
                </span>
              </div>
              <ul class="import__cards">
                <li v-for="card in row.cards" :key="card.id">{{ card.name }}</li>
              </ul>
            </section>
          </div>
          <ore-text color="muted" size="sm" v-if="report && report.required">
            <template v-if="report.advantages">
              {{ t('deck.advantagesUsed', { total: report.advantages, used: report.advantagesUsed }) }}
            </template>
            <template v-else>{{ t('deck.advantagesNone') }}</template>
          </ore-text>
        </section>

        <ore-text color="muted" size="sm">{{ t('deck.importHint') }}</ore-text>
        <ore-text color="muted" size="sm" v-if="alreadySaved">
          {{ t('deck.importAlreadySaved', { name: alreadySaved.name }) }}
        </ore-text>
      </div>
    </ore-card>

    <!-- The decision bar: back to the library, the saved copy as a tool, the import as
         the commit action. -->
    <PhaseDock>
      <template #back>
        <PhaseBackButton to="builds" :label="t('builds.back')" />
      </template>
      <LinkButton
        color="secondary"
        to="buildEdit"
        variant="bordered"
        v-if="alreadySaved"
        :params="{ id: alreadySaved.id }">
        <ore-icon name="external-link" slot="prefix" />
        {{ t('deck.importOpenSaved', { name: alreadySaved.name }) }}
      </LinkButton>
      <ore-button
        color="primary"
        variant="solid"
        :icon-only="isPhone"
        :label="alreadySaved ? t('deck.importSaveCopy') : t('deck.importSave')"
        :rounded="isPhone ? 'full' : undefined"
        @click="save">
        <ore-icon name="download" :slot="isPhone ? null : 'prefix'" />
        <template v-if="!isPhone">{{ alreadySaved ? t('deck.importSaveCopy') : t('deck.importSave') }}</template>
      </ore-button>
    </PhaseDock>
    </div>

    <ore-card padding="lg" v-else>
      <div class="stack">
        <ore-alert color="error" variant="flat">
          {{ 'error' in decoded ? decoded.error : t('deck.importUnknownHunter') }}
        </ore-alert>
        <LinkButton to="builds" variant="bordered">{{ t('builds.back') }}</LinkButton>
      </div>
    </ore-card>
  </div>
</template>

<style scoped>
.import__identity {
  display: flex;
  gap: var(--size-4);
  align-items: center;
}

.import__portrait {
  width: var(--size-16);
  height: var(--size-16);
  object-fit: cover;
  border: var(--border) solid var(--p-line);
  border-radius: var(--rounded-sm);
}

/* Mosaic on the left, the selected piece's detail on the right; stacked in one column on phones. */
.import__overview {
  display: grid;
  gap: var(--size-6);
  align-items: start;
}

@media (min-width: 900px) {
  .import__overview {
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
  }
}

.import__mosaic {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--size-3);
}

/* Image-only tiles: square scans, no captions. The weapon anchors the left column across both rows. */
.import__tile {
  position: relative;
  display: block;
  aspect-ratio: 1;
  padding: 0;
  overflow: hidden;
  cursor: pointer;
  background: var(--p-panel-sunken);
  border: var(--border) solid var(--p-line);
  border-radius: var(--rounded-sm);
}

.import__tile img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.import__tile--weapon {
  grid-row: span 2;
  aspect-ratio: auto;
}

.import__tile[aria-pressed='true'] {
  border-color: var(--p-gold);
  box-shadow: 0 0 0 var(--border-2) var(--p-gold);
}

.import__tile:not([aria-pressed='true']):hover {
  border-color: var(--p-line-strong);
}

.import__tile-empty {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: var(--p-text-muted);
  background: var(--p-panel-sunken);
}

.import__tile-empty::after {
  width: var(--size-8);
  height: var(--size-8);
  content: '';
  background: currentcolor;
  opacity: 0.55;
  mask: var(--slot-icon) center / contain no-repeat;
}

.import__detail {
  align-content: start;
  padding: var(--size-4);
  background: var(--p-panel-sunken);
  border: var(--border) solid var(--p-line);
  border-radius: var(--rounded-md);
}

.import__deck-head {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-2);
  align-items: baseline;
  justify-content: space-between;
}

.import__deck-total {
  font-variant-numeric: tabular-nums;
}

.import__deck-of {
  font-weight: var(--font-normal);
  color: var(--p-text-muted);
}

.import__groups {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(var(--size-48), 1fr));
  gap: var(--size-4);
}

.import__group {
  display: grid;
  gap: var(--size-1);
  align-content: start;
}

/* The count sits right beside the type label it belongs to, not stranded at the column edge. */
.import__group-head {
  display: flex;
  gap: var(--size-2);
  align-items: baseline;
}

.import__group-count {
  font-size: var(--text-sm);
  font-variant-numeric: tabular-nums;
  color: var(--p-text-muted);
}

.import__group-count--off {
  font-weight: var(--font-semibold);
  color: var(--color-warning);
}

.import__cards {
  display: grid;
  gap: var(--size-1);
  padding: 0;
  margin: 0;
  font-size: var(--text-sm);
  list-style: none;
}
</style>
