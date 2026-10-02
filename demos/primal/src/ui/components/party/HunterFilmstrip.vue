<script lang="ts" setup>
import { computed } from 'vue';
import { asset } from '../../../app/assets';
import { t } from '../../../app/i18n';
import { expansions, weaponClassById } from '../../../content/index';
import type { Hunter } from '../../../domain/types';
import '@vielzeug/refine/button';
import '@vielzeug/refine/carousel';
import '@vielzeug/refine/chip';
import '@vielzeug/refine/text';

const props = defineProps<{
  hunters: readonly Hunter[];
  label: string;
  modelValue: string;
  /** The party's member ids, when the strip browses a selection: each member's rail carries
   *  its join-order badge and the selected treatment, so membership reads at a glance. */
  selectedIds?: readonly string[];
}>();
const emit = defineEmits<{ 'update:modelValue': [hunterId: string] }>();

const activeIndex = computed(() =>
  Math.max(
    0,
    props.hunters.findIndex((hunter) => hunter.id === props.modelValue),
  ),
);
const orderOf = (hunterId: string): number | undefined => {
  const index = props.selectedIds?.indexOf(hunterId) ?? -1;
  return index === -1 ? undefined : index + 1;
};
const expansionName = (id: string) => expansions.find((expansion) => expansion.id === id)?.name ?? id;
/** Per-hero crop anchors for the collapsed rail. X anchors the art's X%-width point at the
 *  rail's X%: under the head, not the art's center (Zaraya's landscape spear pose keeps her
 *  head far left, Heleren leans left, the rest sit near the middle). Y anchors lower still, so
 *  the head rides the rail's clear band above the rotated label: inert under `cover` (the art
 *  drew at exactly the rail's height), live through the collapsed rule's vertical zoom. */
const RAIL_ART_POSITIONS: Record<string, string> = {
  daeron: '30% 36%',
  heleren: '25% -45%',
  karah: '53% 16%',
  mirah: '60% 40%',
  thoreg: '45% 12%',
  zaraya: '27% -25%',
};
const selectIndex = (index: number) => {
  const hunter = props.hunters[index];
  if (hunter) emit('update:modelValue', hunter.id);
};
const onChange = (event: Event) => selectIndex((event as CustomEvent<{ index: number }>).detail.index);
const move = (offset: number) => {
  if (!props.hunters.length) return;
  selectIndex((activeIndex.value + offset + props.hunters.length) % props.hunters.length);
};
</script>

<template>
  <div class="hunter-filmstrip">
    <ore-carousel
      class="hunter-filmstrip__carousel"
      color="primary"
      tabindex="0"
      variant="filmstrip"
      :label="label"
      :show-controls="false"
      :show-indicators="false"
      :slide-index="activeIndex"
      @change="onChange">
      <ore-carousel-slide
        v-for="(hunter, index) in hunters"
        :key="hunter.id"
        :aria-label="`${hunter.name}, ${weaponClassById(hunter.classId).name}`"
        @click="selectIndex(index)">
        <figure
          class="hunter-filmstrip__slide"
          :class="{ 'hunter-filmstrip__slide--selected': orderOf(hunter.id) !== undefined }"
          :style="{
            '--art': `url(${asset(hunter.artwork)})`,
            ...(RAIL_ART_POSITIONS[hunter.id] ? { '--rail-position': RAIL_ART_POSITIONS[hunter.id] } : {}),
          }">
          <div aria-hidden="true" class="hunter-filmstrip__rail">
            <span aria-hidden="true" class="hunter-filmstrip__rail-order" v-if="orderOf(hunter.id) !== undefined">
              {{ orderOf(hunter.id) }}
            </span>
            <span class="hunter-filmstrip__rail-label">
              <ore-text size="xs" variant="overline">{{ weaponClassById(hunter.classId).name }}</ore-text>
              <ore-text as="span" size="sm" variant="heading">{{ hunter.name }}</ore-text>
            </span>
            <span
              class="hunter-filmstrip__rail-icon"
              :style="{ '--weapon-icon': `url(${asset(weaponClassById(hunter.classId).icon)})` }"></span>
          </div>
          <figcaption class="hunter-filmstrip__caption">
            <slot name="active" :hunter="hunter">
              <ore-text variant="overline">{{ weaponClassById(hunter.classId).name }}</ore-text>
              <ore-text as="h3" size="lg" variant="heading">{{ hunter.name }}</ore-text>
              <ore-text size="sm">{{ hunter.title }} · {{ hunter.description }}</ore-text>
              <span class="cluster" style="--cluster-gap: 0.3rem; margin-top: 0.4rem">
                <ore-chip size="sm" variant="outline" v-for="tag in hunter.playstyle" :key="tag">{{ tag }}</ore-chip>
                <ore-chip color="secondary" size="sm" variant="outline" v-if="hunter.expansionId !== 'core'">
                  {{ expansionName(hunter.expansionId) }}
                </ore-chip>
              </span>
            </slot>
          </figcaption>
        </figure>
      </ore-carousel-slide>
    </ore-carousel>
    <div class="hunter-filmstrip__nav" v-if="hunters.length > 1">
      <ore-button size="sm" variant="ghost" :label="t('hunterFilmstrip.previous')" @click="move(-1)">←</ore-button>
      <ore-text size="sm">{{ activeIndex + 1 }} / {{ hunters.length }}</ore-text>
      <ore-button size="sm" variant="ghost" :label="t('hunterFilmstrip.next')" @click="move(1)">→</ore-button>
    </div>
  </div>
</template>

<style scoped>
.hunter-filmstrip {
  --hunter-rail-bg: linear-gradient(
    180deg,
    color-mix(in oklch, var(--color-contrast-50) 62%, transparent),
    color-mix(in oklch, var(--p-panel) 96%, transparent)
  );
  --hunter-rail-color: var(--p-text-strong);
  --hunter-rail-shadow: inset 0 0 0 1px var(--p-line-strong);
  --hunter-rail-text-shadow: none;
  --hunter-rail-weapon: var(--p-gold-dim);
  display: grid;
  gap: 0.5rem;
}

.hunter-filmstrip__carousel {
  --carousel-min-height: var(--hunter-filmstrip-height, 28rem);
  --carousel-filmstrip-inactive: 4.75rem;
  --carousel-radius: 0;
}

.hunter-filmstrip__slide {
  --art-position: 50% 0;
  --art-size: auto 100%;
  position: relative;
  display: grid;
  align-items: end;
  height: var(--hunter-filmstrip-height, 28rem);
  margin: 0;
  overflow: hidden;
  color: var(--p-text-strong);
  background:
    linear-gradient(
      180deg,
      transparent 42%,
      color-mix(in oklch, var(--p-panel) 72%, transparent) 78%,
      var(--p-panel) 100%
    ),
    var(--art) var(--art-position, 50% 12%) / var(--art-size, cover) no-repeat,
    var(--p-panel-sunken);
  border: 0;
  box-shadow: inset 0 0 0 1px var(--p-line);
}

.hunter-filmstrip__rail {
  display: none;
}

/* A member's rail reads as the app's pressed selection: the gold line plus the join-order
 * badge: a number, never colour alone. */
.hunter-filmstrip__slide--selected .hunter-filmstrip__rail {
  --hunter-rail-shadow: inset 0 0 0 2px var(--p-gold);
  --hunter-rail-weapon: var(--p-gold);
}

.hunter-filmstrip__slide--selected {
  box-shadow: inset 0 0 0 2px var(--p-gold);
}

ore-carousel-slide[aria-hidden='true'] {
  cursor: pointer;
}

ore-carousel-slide[aria-hidden='true'] .hunter-filmstrip__slide {
  --art-position: var(--rail-position, 50% 12%);
  /* Drawn taller than the rail so background-position Y has slack to crop through: under
     `cover` the art drew at exactly the rail's height and Y could not move anything. X
     anchors are unaffected: the art's X%-width point stays at the rail's X% at any zoom. */
  --art-size: auto var(--rail-zoom, 150%);
}

ore-carousel-slide[aria-hidden='true'] .hunter-filmstrip__rail {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: grid;
  place-items: center;
  overflow: hidden;
  color: var(--hunter-rail-color);
  background: var(--hunter-rail-bg);
  box-shadow: var(--hunter-rail-shadow);
}

.hunter-filmstrip__rail-label {
  position: absolute;
  top: 50%;
  left: 50%;
  display: flex;
  gap: 0.75rem;
  align-items: baseline;
  justify-content: center;
  width: 24rem;
  white-space: nowrap;
  text-shadow: var(--hunter-rail-text-shadow);
  transform: translate(-50%, -50%) rotate(-90deg);
}

.hunter-filmstrip__rail-icon {
  position: absolute;
  bottom: var(--size-3);
  left: 50%;
  width: var(--size-8);
  height: var(--size-8);
  color: var(--hunter-rail-weapon);
  background-color: currentcolor;
  -webkit-mask: var(--weapon-icon) center / contain no-repeat;
  mask: var(--weapon-icon) center / contain no-repeat;
  transform: translateX(-50%);
}

.hunter-filmstrip__rail-label ore-text:first-child {
  --text-color: var(--hunter-rail-weapon);
}

.hunter-filmstrip__rail-label ore-text:last-child {
  --text-color: var(--hunter-rail-color);
}

.hunter-filmstrip__rail-order {
  position: absolute;
  top: var(--size-2);
  left: 50%;
  z-index: 2;
  min-width: var(--size-5);
  padding-inline: var(--size-1);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--p-on-dark);
  text-align: center;
  background: var(--p-gold);
  border-radius: var(--rounded-full);
  transform: translateX(-50%);
}

.hunter-filmstrip__caption {
  --text-color: var(--p-text-strong);
  display: grid;
  gap: 0.15rem;
  min-height: 0;
  padding: 1.25rem;
  background: linear-gradient(
    180deg,
    transparent,
    color-mix(in oklch, var(--p-panel) 82%, transparent) 34%,
    var(--p-panel) 76%
  );
}

ore-carousel-slide[aria-hidden='true'] .hunter-filmstrip__caption {
  display: none;
}

/* The browsing controls stay reachable at every width: the carousel host itself is focusable
   (its arrow, Home and End keys take over from there) and this light-DOM pair gives pointer
   users the same step control. Targets stay at the 44px floor. */
.hunter-filmstrip__nav {
  display: flex;
  gap: var(--size-2);
  align-items: center;
  justify-content: space-between;
}

.hunter-filmstrip__nav ore-button {
  min-width: 2.75rem;
  min-height: 2.75rem;
}

@media (width < 640px) {
  .hunter-filmstrip__carousel {
    --carousel-min-height: var(--hunter-filmstrip-mobile-height, 26rem);
  }

  .hunter-filmstrip__slide {
    height: var(--hunter-filmstrip-mobile-height, 26rem);
  }

  ore-carousel-slide[aria-hidden='true'] {
    display: none;
  }
}
</style>
