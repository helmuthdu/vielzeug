<script lang="ts" setup>
import { computed, nextTick, ref, watch } from 'vue';
import { asset } from '../../../app/assets';
import { t } from '../../../app/i18n';
import type { ResourceId } from '../../../domain/types';
import CardText from '../../components/CardText.vue';
import CardDetailDialog from '../../components/party/CardDetailDialog.vue';
import ResourceIcon from '../../components/ResourceIcon.vue';
import { isEquipment, type WorkshopModel } from './use-workshop';
import '@vielzeug/refine/button';
import '@vielzeug/refine/chip';
import '@vielzeug/refine/text';

const props = defineProps<{ workshop: WorkshopModel }>();

// Kind-narrowed views of the selected and current pieces, so templates read kind stats
// without null-trusting the union.
const selectedWeapon = computed(() => {
  const entry = props.workshop.selectedEntry;
  return entry && isEquipment(entry) && entry.type === 'weapon' ? entry : null;
});
const selectedWorn = computed(() => {
  const entry = props.workshop.selectedEntry;
  return entry && isEquipment(entry) && (entry.type === 'armor' || entry.type === 'helm') ? entry : null;
});
const currentWeapon = computed(() => {
  const current = props.workshop.currentEquipment;
  return current && current.type === 'weapon' ? current : null;
});
const currentWorn = computed(() => {
  const current = props.workshop.currentEquipment;
  return current && (current.type === 'armor' || current.type === 'helm') ? current : null;
});

const titleRef = ref<HTMLElement | null>(null);

// Mobile: selecting a family swaps the pane in, so move focus/scroll to the title.
watch(
  () => props.workshop.selectedItem?.key,
  async () => {
    if (!props.workshop.mobileDetail) return;
    await nextTick();
    if (window.matchMedia('(width < 720px)').matches) {
      titleRef.value?.scrollIntoView({ block: 'start' });
      titleRef.value?.focus();
    }
  },
);
</script>

<template>
  <article
    class="recipe-detail"
    v-if="workshop.selectedItem && workshop.selectedEntry"
    :class="{ 'recipe-detail--crafted': workshop.selectedEntry?.id === workshop.craftingPulse }"
  >
    <ore-button class="detail-back" size="sm" variant="ghost" @click="workshop.mobileDetail = false">
      {{ t('forge.recipeShelfBack') }}
    </ore-button>
    <header class="recipe-detail__header">
      <div class="stack" style="--stack-gap: 0.2rem">
        <ore-text variant="overline">
          {{
            isEquipment(workshop.selectedEntry)
              ? `${workshop.forgeTypeLabel(workshop.selectedEntry.type)} · ${workshop.discipline(workshop.selectedEntry)}`
              : t('forge.herbalistPotion')
          }}
        </ore-text>
        <ore-text as="h2" size="md" tabindex="-1" variant="heading" ref="titleRef">
          {{ workshop.selectedEntry.name }}
        </ore-text>
        <ore-text color="muted" size="sm">{{ workshop.expansionName(workshop.selectedEntry.expansionId) }}</ore-text>
      </div>
      <ore-chip variant="outline" :color="workshop.stateColor(workshop.selectedState)">
        {{ workshop.stateLabel[workshop.selectedState] }}
      </ore-chip>
    </header>

    <section class="upgrade-path" :aria-label="t('forge.upgradePath')">
      <ore-text variant="overline">{{ t('forge.upgradePath') }}</ore-text>
      <div class="upgrade-path__levels">
        <ore-button
          size="sm"
          v-for="levelEntry in workshop.selectedItem.entries"
          :key="levelEntry.id"
          :color="workshop.selectedEntry.id === levelEntry.id ? 'primary' : undefined"
          :disabled="Boolean(workshop.campaign && !workshop.codexMode && workshop.entryState(levelEntry) === 'locked')"
          :variant="
            workshop.selectedEntry.id === levelEntry.id
              ? 'solid'
              : workshop.entryState(levelEntry) === 'locked'
                ? 'ghost'
                : 'bordered'
          "
          @click="workshop.selectedLevel = levelEntry.level"
        >
          {{ t('forge.levelLabel', { level: levelEntry.level }) }}
          <template v-if="['owned', 'equipped', 'prepared'].includes(workshop.entryState(levelEntry))">
            · {{ t('forge.owned').toLowerCase() }}
          </template>
        </ore-button>
      </div>
    </section>

    <div class="recipe-detail__content">
      <ore-button
        class="card-scan"
        fullheight
        variant="text"
        @click="workshop.zoomedArt = { name: workshop.selectedEntry.name, src: asset(workshop.selectedEntry.artwork) }"
      >
        <span class="card-scan__content">
          <img :alt="t('forge.cardScanAlt', { name: workshop.selectedEntry.name })" :src="asset(workshop.selectedEntry.artwork)" />
          <span class="card-scan__hint">{{ t('forge.viewFullCard') }}</span>
        </span>
      </ore-button>

      <div class="recipe-facts stack" style="--stack-gap: 1rem">
        <section class="stack" style="--stack-gap: 0.35rem">
          <ore-text variant="overline">{{ t('forge.effect') }}</ore-text>
          <ore-text size="sm"><CardText :text="workshop.selectedEntry.description" /></ore-text>
        </section>

        <template v-if="isEquipment(workshop.selectedEntry)">
          <div
            class="cluster"
            style="--cluster-gap: 0.35rem"
            v-if="selectedWeapon || selectedWorn"
          >
            <ore-chip size="sm" variant="outline" v-if="selectedWeapon && selectedWeapon.damage !== null">
              {{ t('forge.damageChip', { damage: workshop.damageLabel(selectedWeapon.damage) }) }}
            </ore-chip>
            <ore-chip size="sm" variant="outline" v-if="selectedWorn && selectedWorn.health !== null">
              {{ t('forge.healthChip', { health: selectedWorn.health }) }}
            </ore-chip>
          </div>
          <section class="deck-composition" v-if="selectedWeapon?.deckComposition" :aria-label="t('forge.deckComposition')">
            <ore-text variant="overline">{{ t('forge.deckComposition') }}</ore-text>
            <div class="deck-composition__values">
              <ore-chip color="error" size="sm" variant="solid">
                {{ t('forge.deckAttack', { count: selectedWeapon.deckComposition.attack }) }}
              </ore-chip>
              <ore-chip color="info" size="sm" variant="solid">
                {{ t('forge.deckManeuver', { count: selectedWeapon.deckComposition.maneuver }) }}
              </ore-chip>
              <ore-chip color="warning" size="sm" variant="solid">
                {{ t('forge.deckParry', { count: selectedWeapon.deckComposition.parry }) }}
              </ore-chip>
              <ore-chip color="success" size="sm" variant="solid">
                {{ t('forge.deckDodge', { count: selectedWeapon.deckComposition.dodge }) }}
              </ore-chip>
            </div>
          </section>
        </template>

        <section class="stack" style="--stack-gap: 0.4rem" v-if="workshop.selectedCost">
          <ore-text variant="overline">{{ t('forge.recipeCost') }}</ore-text>
          <div class="requirements" v-if="workshop.anyPlantCost(workshop.selectedCost) === null">
            <ResourceIcon
              size="sm"
              v-for="[id, required] in Object.entries(workshop.displayedCost(workshop.selectedCost))"
              :key="id"
              :class="{ 'requirement--missing': workshop.campaign && workshop.resourceCount(id as ResourceId) < required }"
              :count="workshop.campaign ? undefined : required"
              :id="id"
              :owned="workshop.campaign ? workshop.resourceCount(id as ResourceId) : undefined"
              :required="workshop.campaign ? required : undefined"
            />
          </div>
          <ore-chip size="sm" variant="bordered" v-else>
            {{ t('forge.anyPlants') }}
            <strong>
              {{
                workshop.campaign
                  ? `${workshop.availablePlants()}/${workshop.anyPlantCost(workshop.selectedCost)}`
                  : `×${workshop.anyPlantCost(workshop.selectedCost)}`
              }}
            </strong>
          </ore-chip>
        </section>

        <section
          class="loadout-comparison stack"
          style="--stack-gap: 0.5rem"
          v-if="workshop.campaign && isEquipment(workshop.selectedEntry)"
        >
          <ore-text variant="overline">{{ t('forge.loadoutResult') }}</ore-text>
          <div class="comparison-headings">
            <span>
              <small>{{ t('forge.current') }}</small>
              <strong>{{ workshop.currentEquipment?.name ?? t('forge.emptySlot') }}</strong>
            </span>
            <span aria-hidden="true">→</span>
            <span>
              <small>{{ t('forge.afterCrafting') }}</small>
              <strong>{{ workshop.selectedEntry.name }}</strong>
            </span>
          </div>
          <div class="comparison-stats" v-if="selectedWeapon || selectedWorn">
            <span v-if="selectedWeapon && selectedWeapon.damage !== null">
              {{ t('forge.damage') }}
              <strong>
                {{ workshop.damageLabel(currentWeapon?.damage) }} → {{ workshop.damageLabel(selectedWeapon.damage) }}
              </strong>
            </span>
            <span v-if="selectedWorn && selectedWorn.health !== null">
              {{ t('forge.health') }}
              <strong>{{ currentWorn?.health ?? 'N/A' }} → {{ selectedWorn.health }}</strong>
            </span>
          </div>
          <div class="comparison-deck" v-if="selectedWeapon?.deckComposition">
            <ore-chip color="error" size="sm" variant="flat">
              {{ t('forge.deckAttack', { count: `${currentWeapon?.deckComposition?.attack ?? 'N/A'} → ${selectedWeapon.deckComposition.attack}` }) }}
            </ore-chip>
            <ore-chip color="info" size="sm" variant="flat">
              {{ t('forge.deckManeuver', { count: `${currentWeapon?.deckComposition?.maneuver ?? 'N/A'} → ${selectedWeapon.deckComposition.maneuver}` }) }}
            </ore-chip>
            <ore-chip color="warning" size="sm" variant="flat">
              {{ t('forge.deckParry', { count: `${currentWeapon?.deckComposition?.parry ?? 'N/A'} → ${selectedWeapon.deckComposition.parry}` }) }}
            </ore-chip>
            <ore-chip color="success" size="sm" variant="flat">
              {{ t('forge.deckDodge', { count: `${currentWeapon?.deckComposition?.dodge ?? 'N/A'} → ${selectedWeapon.deckComposition.dodge}` }) }}
            </ore-chip>
          </div>
        </section>
      </div>
    </div>
  </article>

  <!-- The recipe scan's zoom target: the click sets zoomedArt; the dialog shows it full size. -->
  <CardDetailDialog :card="null" :zoom="workshop.zoomedArt" @close="workshop.zoomedArt = null" />
</template>

<style scoped>
.recipe-detail {
  position: sticky;
  top: 6rem;
  display: grid;
  gap: 1rem;
  align-self: start;
  padding: 1.25rem;
  background: var(--p-panel);
}

.recipe-detail--crafted {
  animation: crafted 650ms ease-out;
}

.recipe-detail__header {
  display: flex;
  gap: 1rem;
  align-items: start;
  justify-content: space-between;
}

.detail-back {
  display: none;
}

.upgrade-path {
  display: grid;
  gap: 0.45rem;
  padding-block: 0.75rem;
  border-block: 1px solid var(--p-line);
}

.upgrade-path__levels {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.upgrade-path__levels ore-button[disabled] {
  opacity: 0.68;
}

.recipe-detail__content {
  display: grid;
  grid-template-columns: minmax(12rem, 0.72fr) minmax(16rem, 1fr);
  gap: 1.25rem;
  align-items: start;
}

.card-scan {
  --button-bg: var(--p-panel-sunken);
  width: 100%;
  min-height: 24rem;
  overflow: hidden;
  border: 1px solid var(--p-line);
}

.card-scan__content {
  display: grid;
  gap: 0.35rem;
  justify-items: center;
  width: 100%;
  padding: 0.75rem;
}

.card-scan img {
  display: block;
  width: 100%;
  height: 23rem;
  object-fit: contain;
}

.card-scan__hint {
  font-size: 0.72rem;
  color: var(--text-muted);
}

.deck-composition {
  display: grid;
  gap: 0.4rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--p-line);
}

.deck-composition__values {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.35rem;
}

.deck-composition__values ore-chip {
  width: 100%;
}

.requirements {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.requirement--missing {
  --chip-bg: light-dark(oklch(96% 0.012 26), oklch(22% 0.012 26));
  --chip-border-color: color-mix(in oklch, var(--color-error) 40%, transparent);
  --chip-color: var(--color-error);
}

.loadout-comparison {
  padding: 0.85rem;
  background: var(--p-panel-sunken);
  border: 1px solid var(--p-line);
}

.comparison-headings {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 0.65rem;
  align-items: center;
}

.comparison-headings span:not([aria-hidden]) {
  display: grid;
  gap: 0.15rem;
}

.comparison-headings small {
  color: var(--text-muted);
}

.comparison-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  font-size: 0.8rem;
}

.comparison-deck {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.35rem;
}

@keyframes crafted {
  0% {
    box-shadow: inset 0 0 0 2px color-mix(in oklch, var(--color-success) 70%, transparent);
  }
  100% {
    box-shadow: inset 0 0 0 2px transparent;
  }
}

@media (prefers-reduced-motion: reduce) {
  .recipe-detail--crafted {
    animation: none;
  }
}

@media (width < 980px) {
  .recipe-detail__content {
    grid-template-columns: 1fr;
  }

  .card-scan img {
    height: 20rem;
  }
}

@media (width < 720px) {
  .recipe-detail {
    position: static;
    display: none;
    padding: 1rem;
  }

  .detail-back {
    display: inline-flex;
    justify-self: start;
  }

  .card-scan img {
    height: 25rem;
  }
}
</style>
