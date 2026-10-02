<script lang="ts" setup>
import { computed } from 'vue';
import { asset } from '../../app/assets';
import { t } from '../../app/i18n';
import { terrainById } from '../../content';
import type { BattlefieldObject, TerrainPlacement } from '../../domain/types';
import '@vielzeug/refine/chip';
import '@vielzeug/refine/text';

const props = withDefaults(
  defineProps<{
    battlefieldObjects?: readonly BattlefieldObject[];
    compact?: boolean;
    highlightedId?: string | null;
    label: string;
    terrain: readonly TerrainPlacement[];
  }>(),
  { battlefieldObjects: () => [], compact: false, highlightedId: null },
);
const emit = defineEmits<{ 'update:highlightedId': [id: string | null] }>();

const positions = computed(
  () =>
    [
      { id: 'rear', label: t('battlefield.back'), sectors: ['rear'] },
      { id: 'right-flank', label: t('battlefield.rightFlank'), sectors: ['right-flank'] },
      { id: 'front', label: t('battlefield.front'), sectors: ['front'] },
      { id: 'left-flank', label: t('battlefield.leftFlank'), sectors: ['left-flank'] },
      { id: 'edges', label: t('battlefield.edges'), sectors: ['edges'] },
    ] as const,
);
type Position = { id: string; label: string; sectors: readonly string[] };

const placementsFor = (position: Position) =>
  props.terrain
    .filter((placement) => position.sectors.includes(placement.sector as never))
    .map((placement) => ({ ...placement, terrain: terrainById(placement.terrainId) }));
const objectsFor = (position: Position) =>
  props.battlefieldObjects.filter((object) => position.sectors.includes(object.sector as never));
const setupFor = (position: Position): string[] => [
  ...placementsFor(position).map(
    (placement) => `${placement.terrain?.name ?? placement.terrainId} ×${placement.count}`,
  ),
  ...objectsFor(position).map((object) => `${object.name} ×${object.count}`),
];
</script>

<template>
  <div class="battlefield-map" :class="{ 'battlefield-map--compact': compact }">
    <fieldset class="battlefield-map__board">
      <legend class="visually-hidden">{{ label }}</legend>
      <img alt="" class="battlefield-map__art" :src="asset('/battle/battle_area.svg')" />
      <section
        class="battle-sector"
        v-for="position in positions"
        :key="position.id"
        :aria-label="position.label"
        :class="`battle-sector--${position.id}`">
        <ore-text class="visually-hidden" size="sm" weight="semibold">{{ position.label }}</ore-text>
        <div class="terrain-tokens">
          <template v-for="placement in placementsFor(position)" :key="`${placement.sector}-${placement.terrainId}`">
            <span class="terrain-token" v-if="compact">
              <img alt="" v-if="placement.terrain?.icon" :src="asset(placement.terrain.icon)" />
              <span class="terrain-token__fallback" v-else>
                {{ placement.terrain?.name.slice(0, 2).toUpperCase() ?? '?' }}
              </span>
              <ore-chip size="sm" variant="flat">
                {{ placement.terrain?.name ?? placement.terrainId }} ×{{ placement.count }}
              </ore-chip>
            </span>
            <a
              class="terrain-token"
              v-else
              :aria-describedby="`terrain-reference-${placement.terrainId}`"
              :class="{ 'terrain-token--highlighted': highlightedId === placement.terrainId }"
              :href="`#terrain-reference-${placement.terrainId}`"
              @blur="emit('update:highlightedId', null)"
              @focus="emit('update:highlightedId', placement.terrainId)"
              @mouseenter="emit('update:highlightedId', placement.terrainId)"
              @mouseleave="emit('update:highlightedId', null)">
              <img alt="" v-if="placement.terrain?.icon" :src="asset(placement.terrain.icon)" />
              <span class="terrain-token__fallback" v-else>
                {{ placement.terrain?.name.slice(0, 2).toUpperCase() ?? '?' }}
              </span>
              <ore-chip size="sm" variant="flat">
                {{ placement.terrain?.name ?? placement.terrainId }} ×{{ placement.count }}
              </ore-chip>
            </a>
          </template>
        </div>
        <div class="battlefield-objects" v-if="objectsFor(position).length">
          <span
            class="battlefield-object"
            v-for="object in objectsFor(position)"
            :key="object.id"
            :aria-label="`${object.name} ×${object.count}`">
            <span aria-hidden="true" class="battlefield-object__icons">
              <img alt="" v-for="index in object.count" :key="index" :src="asset(object.icon)" />
            </span>
            <span class="visually-hidden">{{ object.name }} ×{{ object.count }}</span>
          </span>
        </div>
      </section>
    </fieldset>

    <ul class="setup-list list-plain" v-if="!compact" :aria-label="t('battlefield.contents')">
      <li v-for="position in positions" :key="position.id">
        <ore-text size="sm" weight="semibold">{{ position.label }}</ore-text>
        <ore-text color="muted" size="sm">
          {{ setupFor(position).length ? setupFor(position).join(', ') : t('battlefield.clear') }}
        </ore-text>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.battlefield-map__board {
  position: relative;
  width: min(100%, 32rem);
  aspect-ratio: 1;
  padding: 0;
  margin: 0 auto;
  margin-block: var(--size-4);
  overflow: hidden;
  border: 0;
}

.battlefield-map__art {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.battle-sector {
  position: absolute;
  display: grid;
  gap: 0.25rem;
  justify-items: center;
}

.battle-sector--rear {
  top: 5%;
  left: 50%;
  transform: translateX(-50%);
}

.battle-sector--right-flank {
  top: 50%;
  right: 5%;
  transform: translateY(-50%);
}

.battle-sector--front {
  bottom: 5%;
  left: 50%;
  transform: translateX(-50%);
}

.battle-sector--left-flank {
  top: 50%;
  left: 5%;
  transform: translateY(-50%);
}

.battle-sector--edges {
  inset: 7%;
  pointer-events: none;
}

.battlefield-objects,
.battlefield-object,
.battlefield-object__icons {
  position: absolute;
  inset: 0;
}

.battlefield-object__icons img {
  position: absolute;
  width: 3rem;
  height: 3rem;
  object-fit: contain;
  filter: drop-shadow(var(--drop-shadow-sm));
}

.battlefield-object__icons img:nth-child(1) {
  top: 0;
  left: 0;
}

.battlefield-object__icons img:nth-child(2) {
  top: 0;
  right: 0;
}

.battlefield-object__icons img:nth-child(3) {
  right: 0;
  bottom: 0;
}

.battlefield-object__icons img:nth-child(4) {
  bottom: 0;
  left: 0;
}

.terrain-tokens {
  display: flex;
  gap: 0.3rem;
}

.battle-sector--right-flank .terrain-tokens,
.battle-sector--left-flank .terrain-tokens {
  flex-direction: column;
}

.terrain-token {
  display: grid;
  gap: 0.1rem;
  justify-items: center;
  min-width: 4.5rem;
  padding: 0.25rem;
  color: inherit;
  text-decoration: none;
  border-radius: var(--rounded-sm);
}

.terrain-token:focus-visible {
  outline: var(--border-2) solid var(--p-blood);
  outline-offset: var(--border-2);
}

.terrain-token--highlighted {
  background: var(--p-gold-faint);
  box-shadow: inset 0 0 0 var(--border) var(--p-line-strong);
}

.terrain-token ore-chip {
  --chip-bg: var(--p-panel);
  --chip-border-color: var(--p-line);
  --chip-color: var(--p-text-strong);
  --chip-font-size: 0.58rem;
  --chip-font-weight: var(--font-semibold);
  --chip-padding-x: 0.4rem;
  --chip-radius: var(--rounded-sm);
  font-family: var(--p-body);
  text-transform: none;
  letter-spacing: 0;
}

.terrain-token img,
.terrain-token__fallback {
  width: 3.25rem;
  height: 3.25rem;
  object-fit: contain;
  filter: drop-shadow(var(--drop-shadow-sm));
}

.terrain-token__fallback {
  display: grid;
  place-items: center;
  color: var(--p-text-muted);
  background: var(--p-panel-sunken);
  border: var(--border) solid var(--p-line);
  border-radius: 50%;
}

.setup-list {
  display: none;
}

.battlefield-map--compact .battlefield-map__board {
  width: min(100%, 18rem);
}

.battlefield-map--compact .terrain-token {
  min-width: 2.5rem;
  padding: 0.1rem;
}

.battlefield-map--compact .terrain-token img,
.battlefield-map--compact .terrain-token__fallback {
  width: 2rem;
  height: 2rem;
}

.battlefield-map--compact .terrain-token ore-chip {
  --chip-font-size: 0.52rem;
  --chip-padding-x: 0.25rem;
}

@media (width < 640px) {
  .battlefield-map__board {
    width: min(100%, 18rem);
  }

  .terrain-token {
    min-width: 3.25rem;
  }

  .terrain-token img,
  .terrain-token__fallback {
    width: 2.4rem;
    height: 2.4rem;
  }

  .terrain-token ore-chip {
    display: none;
  }

  .setup-list {
    display: grid;
    gap: 0;
  }

  .setup-list li {
    display: grid;
    grid-template-columns: 6rem minmax(0, 1fr);
    gap: 0.75rem;
    align-items: baseline;
    padding: 0.65rem 0;
    border-bottom: var(--border) solid var(--p-line);
  }
}
</style>
