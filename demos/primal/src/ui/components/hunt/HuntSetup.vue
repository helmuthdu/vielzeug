<script lang="ts" setup>
import { computed, ref } from 'vue';
import { asset } from '../../../app/assets';
import { type MessageKey, t } from '../../../app/i18n';
import { terrainById } from '../../../content/index';
import type { AggressionLevel, BattlefieldObject, ElementId, Sector, SpecialRule, TerrainPlacement } from '../../../domain/types';
import AggressionMark from '../AggressionMark.vue';
import BattlefieldMap from '../BattlefieldMap.vue';
import ResourceIcon from '../ResourceIcon.vue';

const SECTOR_KEY: Record<Sector, MessageKey> = {
  edges: 'battlefield.edges',
  front: 'battlefield.front',
  'left-flank': 'battlefield.leftFlank',
  rear: 'battlefield.back',
  'right-flank': 'battlefield.rightFlank',
};

const sectorLabel = (sector: Sector): string => t(SECTOR_KEY[sector] ?? 'battlefield.edges');

import { type BoardRule, battlefieldObjectBoardRule, terrainBoardRule } from '../board/rules';
import TokenRuleDrawer from '../board/TokenRuleDrawer.vue';
import '@vielzeug/refine/button';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/text';
import '@vielzeug/refine/tooltip';

const props = defineProps<{
  battlefieldObjects?: readonly BattlefieldObject[];
  description?: string;
  eyebrow: string;
  habitat: string;
  monsterIcon: string;
  monsterMeta?: {
    aggression?: AggressionLevel;
    element: ElementId;
    weaknesses: readonly ElementId[];
  };
  monsterName: string;
  specialRules: readonly SpecialRule[];
  terrain: readonly TerrainPlacement[];
  title: string;
}>();

interface TerrainEntry {
  icon: string | null;
  id: string;
  name: string;
  placement: string;
  ruleEffect: string;
  ruleTiming: string | null;
  toBoardRule: () => BoardRule;
}

const terrainEntries = computed<TerrainEntry[]>(() => {
  const bySector = new Map<string, (Sector | null)[]>();
  for (const { sector, terrainId } of props.terrain) {
    bySector.set(terrainId, [...(bySector.get(terrainId) ?? []), sector]);
  }
  const terrainList: TerrainEntry[] = [...bySector].flatMap(([terrainId, sectors]) => {
    const terrain = terrainById(terrainId);
    if (!terrain) return [];
    return [
      {
        icon: terrain.icon,
        id: terrain.id,
        name: terrain.name,
        placement: sectors
          .map((s) => (s === null ? t('battlefield.anySector') : sectorLabel(s)))
          .join(', '),
        ruleEffect: terrain.rule.effect,
        ruleTiming: terrain.rule.timing ?? null,
        toBoardRule: () => terrainBoardRule(terrain),
      },
    ];
  });
  for (const object of props.battlefieldObjects ?? []) {
    if (!object.rule) continue;
    const rule = object.rule;
    terrainList.push({
      icon: object.icon,
      id: object.id,
      name: object.name,
      placement: '',
      ruleEffect: rule.effect,
      ruleTiming: rule.timing ?? null,
      toBoardRule: () => battlefieldObjectBoardRule(object.icon, object.name, rule),
    });
  }
  return terrainList;
});

const highlightedTerrainId = ref<string | null>(null);
const activeRule = ref<BoardRule | null>(null);
</script>

<template>
  <div class="hunt-layout">
    <header class="hunt-hero">
      <img class="hunt-hero__monster" :alt="monsterName" :src="asset(monsterIcon)" />
      <div class="hunt-hero__identity">
        <ore-text variant="overline">{{ eyebrow }}</ore-text>
        <ore-text as="h2" size="lg" variant="heading">{{ title }}</ore-text>
        <ore-text color="muted" size="sm" v-if="habitat">{{ habitat }}</ore-text>
        <ore-text class="hunt-hero__description" color="muted" size="sm" v-if="description">
          {{ description }}
        </ore-text>
        <dl class="hunt-meta" v-if="monsterMeta">
          <div>
            <dt>{{ t('targetBoard.element') }}</dt>
            <dd><ResourceIcon size="sm" :id="monsterMeta.element" /></dd>
          </div>
          <div v-if="monsterMeta.weaknesses.length">
            <dt>{{ t('targetBoard.weakTo') }}</dt>
            <dd class="cluster" style="--cluster-gap: 0.3rem">
              <ResourceIcon size="sm" v-for="id in monsterMeta.weaknesses" :key="id" :id="id" />
            </dd>
          </div>
          <div v-if="monsterMeta.aggression !== undefined">
            <dt>{{ t('challenge.aggression') }}</dt>
            <dd><AggressionMark size="sm" :level="monsterMeta.aggression" /></dd>
          </div>
        </dl>
        <slot name="meta"></slot>
      </div>
    </header>

    <div class="battle-panel stack" style="--stack-gap: 0.75rem">
      <ore-text variant="overline">{{ t('huntSetup.battlefieldLabel') }}</ore-text>
      <BattlefieldMap
        v-model:highlighted-id="highlightedTerrainId"
        :battlefield-objects="battlefieldObjects"
        :label="t('huntSetup.battlefieldAria', { name: monsterName })"
        :terrain="terrain" />
    </div>

    <section aria-labelledby="terrain-reference-title" class="terrain-reference">
      <ore-text as="h3" id="terrain-reference-title" size="xs" variant="overline">
        {{ t('huntSetup.quickReference') }}
      </ore-text>
      <ul class="terrain-reference__list list-plain" v-if="terrainEntries.length > 0">
        <li
          class="terrain-reference__item"
          v-for="entry in terrainEntries"
          :key="entry.id"
          :class="{ 'terrain-reference__item--highlighted': highlightedTerrainId === entry.id }"
          :id="`terrain-reference-${entry.id}`"
          @focusin="highlightedTerrainId = entry.id"
          @focusout="highlightedTerrainId = null"
          @mouseenter="highlightedTerrainId = entry.id"
          @mouseleave="highlightedTerrainId = null">
          <img alt="" class="terrain-reference__art" v-if="entry.icon" :src="asset(entry.icon)" />
          <span aria-hidden="true" class="terrain-reference__art terrain-reference__art--fallback" v-else>
            <ore-icon name="mountain" />
          </span>
          <div class="terrain-reference__body">
            <ore-text class="terrain-reference__name" size="sm" variant="heading">{{ entry.name }}</ore-text>
            <ore-text class="terrain-reference__where" color="muted" size="xs" v-if="entry.placement">{{ entry.placement }}</ore-text>
            <ore-text class="terrain-reference__effect" size="xs">
              <strong v-if="entry.ruleTiming">{{ entry.ruleTiming }} ·</strong>
              {{ entry.ruleEffect }}
            </ore-text>
          </div>
          <ore-tooltip :content="t('board.ruleLabel', { name: entry.name })" :delay="400" >
            <ore-button
            class="terrain-reference__rule"
            icon-only
            size="sm"
            variant="ghost"
            :label="t('board.ruleLabel', { name: entry.name })"
            @click="activeRule = entry.toBoardRule()">
            <ore-icon aria-hidden="true" name="info" />
          </ore-button>
          </ore-tooltip>
        </li>
      </ul>
      <ore-text class="terrain-reference__empty" color="muted" size="sm" v-else>
        {{ t('monsterBoard.openGround') }}
      </ore-text>
    </section>

    <TokenRuleDrawer :rule="activeRule" @close="activeRule = null" />

    <section aria-labelledby="scenario-rules-title" class="scenario-rules" v-if="specialRules.length">
      <ore-text as="h3" id="scenario-rules-title" size="xs" variant="overline">
        {{ t('huntSetup.scenarioRules', { count: specialRules.length }) }}
      </ore-text>
      <ul class="scenario-rules__list list-plain">
        <li class="scenario-rules__item" v-for="rule in specialRules" :key="rule.title">
          <span aria-hidden="true" class="scenario-rules__icon"><ore-icon name="scroll" /></span>
          <div class="scenario-rules__body">
            <ore-text class="scenario-rules__name" size="sm" variant="heading">{{ rule.title }}</ore-text>
            <ore-text class="scenario-rules__text" color="muted" size="xs">{{ rule.text }}</ore-text>
          </div>
        </li>
      </ul>
    </section>
  </div>

</template>

<style scoped>
.hunt-layout {
  display: grid;
  grid-template-areas:
    'hero hero hero'
    'terrain battle rules';
  grid-template-columns: minmax(16rem, 0.85fr) minmax(20rem, 1.3fr) minmax(16rem, 0.85fr);
  row-gap: 2.25rem;
  column-gap: 2rem;
  align-items: start;
}

.hunt-hero {
  position: relative;
  display: grid;
  grid-area: hero;
  grid-template-columns: 7rem minmax(0, 1fr);
  gap: 1rem;
  align-items: center;
  padding: 1rem;
  background: linear-gradient(120deg, var(--p-panel-sunken), var(--p-panel));
  border-radius: var(--rounded-md);
}

.hunt-hero__monster {
  width: 100%;
  max-height: 7rem;
  object-fit: contain;
}

.hunt-hero__identity {
  display: grid;
  gap: 0.25rem;
}

.hunt-hero__description {
  max-width: 68ch;
  padding-block: var(--size-1);
  line-height: var(--leading-normal);
}

/* The standard monster metadata line shared by every mode's hero. */
.hunt-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  margin: 0.3rem 0 0;
}

.hunt-meta > div {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.hunt-meta dt {
  font-family: var(--p-body);
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--p-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.hunt-meta dd {
  margin: 0;
}

.battle-panel {
  grid-area: battle;
  min-width: 0;
}

.terrain-reference {
  display: grid;
  grid-area: terrain;
  gap: 0.75rem;
  align-self: start;
  min-width: 0;
}

.terrain-reference__list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--size-3);
  max-height: 32rem;
  padding-right: 0.25rem;
  overflow-y: auto;
  scrollbar-gutter: stable;
  overscroll-behavior: contain;
}

.terrain-reference__item {
  display: flex;
  gap: var(--size-3);
  align-items: flex-start;
  min-width: 0;
  padding: var(--size-3);
  scroll-margin-top: 10rem;
  background: var(--p-panel);
  border: var(--border) solid var(--p-line);
  border-radius: var(--rounded-lg);
  transition:
    background var(--p-motion) var(--p-ease),
    border-color var(--p-motion) var(--p-ease);
}

.terrain-reference__item:target,
.terrain-reference__item--highlighted {
  background: var(--p-panel-sunken);
  border-color: var(--p-line-strong);
  box-shadow: inset 2px 0 var(--p-gold-dim);
}

.terrain-reference__art {
  flex-shrink: 0;
  width: var(--size-10);
  height: var(--size-10);
  object-fit: contain;
}

.terrain-reference__art--fallback {
  display: grid;
  place-items: center;
  color: var(--p-text-muted);
  background: var(--p-panel-sunken);
  border-radius: var(--rounded-md);
}

.terrain-reference__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--size-1);
  min-width: 0;
}

.terrain-reference__name {
  font-family: var(--p-heading);
  line-height: var(--leading-tight);
}

.terrain-reference__where {
  font-size: var(--text-xs);
}

.terrain-reference__effect {
  line-height: var(--leading-snug);
}

.terrain-reference__rule {
  flex-shrink: 0;
  margin-block-start: calc(-1 * var(--size-1));
  margin-inline-end: calc(-1 * var(--size-1));
}

.terrain-reference__empty {
  padding: var(--size-3);
  border: var(--border) dashed var(--p-line);
  border-radius: var(--rounded-lg);
}

.scenario-rules {
  display: grid;
  grid-area: rules;
  gap: 0.75rem;
  align-self: start;
  min-width: 0;
}

.scenario-rules__list {
  display: grid;
  gap: var(--size-3);
  max-height: 32rem;
  padding-right: 0.25rem;
  overflow-y: auto;
  scrollbar-gutter: stable;
  overscroll-behavior: contain;
}

.scenario-rules__item {
  display: flex;
  gap: var(--size-3);
  align-items: flex-start;
  min-width: 0;
  padding: var(--size-3);
  background: light-dark(oklch(97% 0.015 90), oklch(24% 0.012 90));
  border: var(--border) solid light-dark(oklch(80% 0.045 90), oklch(34% 0.025 90));
  border-radius: var(--rounded-lg);
}

.scenario-rules__icon {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: var(--size-10);
  height: var(--size-10);
  color: var(--color-warning);
  background: light-dark(oklch(93% 0.03 90), oklch(28% 0.018 90));
  border-radius: var(--rounded-md);
}

.scenario-rules__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--size-1);
  min-width: 0;
}

.scenario-rules__name {
  font-family: var(--p-heading);
  line-height: var(--leading-tight);
}

.scenario-rules__text {
  line-height: var(--leading-snug);
}

@media (width < 640px) {
  .hunt-layout {
    grid-template-areas:
      'hero'
      'battle'
      'terrain'
      'rules';
    grid-template-columns: 1fr;
    row-gap: 1.75rem;
  }

  .hunt-hero {
    grid-template-columns: 1fr;
  }

  .hunt-hero__monster {
    width: 5rem;
    height: 5rem;
  }

  .terrain-reference__list {
    max-height: none;
    padding-right: 0;
    overflow-y: visible;
  }

  .scenario-rules__list {
    max-height: none;
    padding-right: 0;
    overflow-y: visible;
  }
}

@media (width < 1024px) and (width >= 640px) {
  .hunt-layout {
    grid-template-areas:
      'hero hero'
      'battle battle'
      'terrain rules';
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    row-gap: 2rem;
    column-gap: 1.5rem;
  }

  .hunt-layout:not(:has(.scenario-rules)) {
    grid-template-areas:
      'hero'
      'battle'
      'terrain';
    grid-template-columns: 1fr;
  }
}
</style>
