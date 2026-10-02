<script lang="ts" setup>
import { computed, nextTick, ref, watch } from 'vue';
import { asset } from '../../../app/assets';
import { t, tp } from '../../../app/i18n';
import { expansions } from '../../../content/index';
import type { Monster } from '../../../domain/types';
import MonsterInfo from '../MonsterInfo.vue';
import ResourceIcon from '../ResourceIcon.vue';
import '@vielzeug/refine/button';
import '@vielzeug/refine/card';
import '@vielzeug/refine/chip';
import '@vielzeug/refine/text';

const props = defineProps<{
  modelValue: string | null;
  monsters: readonly Monster[];
}>();
const emit = defineEmits<{
  'update:modelValue': [monsterId: string];
  inspect: [monsterId: string];
}>();
const inspectedId = ref<string | null>(null);
const detailsRef = ref<HTMLElement | null>(null);
const inspected = computed(() => props.monsters.find((monster) => monster.id === inspectedId.value));
const expansionName = computed(
  () => expansions.find((expansion) => expansion.id === inspected.value?.expansionId)?.name ?? inspected.value?.expansionId,
);

watch(
  () => [props.modelValue, props.monsters] as const,
  () => {
    if (props.monsters.some((monster) => monster.id === inspectedId.value)) return;
    inspectedId.value = props.modelValue ?? props.monsters[0]?.id ?? null;
  },
  { immediate: true },
);

function inspect(monster: Monster): void {
  inspectedId.value = monster.id;
  emit('inspect', monster.id);
  if (!window.matchMedia('(width < 900px)').matches) return;
  void nextTick(() => detailsRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
}
</script>

<template>
  <div class="target-board">
    <section aria-labelledby="targets-title" class="target-board__list">
      <header class="target-board__heading">
        <ore-text variant="overline">{{ t('targetBoard.eyebrow') }}</ore-text>
        <ore-text as="h2" id="targets-title" size="lg" variant="heading">{{ t('targetBoard.chooseMonster') }}</ore-text>
        <div class="target-board__subtitle-row">
          <div class="target-board__tools">
            <!-- The row's leading tools: the expedition's Nightmare variant opens the row,
                 the target count beside it — the campaign's and the Winds' own grammar. -->
            <slot name="tools" />
            <ore-chip size="sm" variant="outline">{{ tp('targetBoard.choiceCount', monsters.length) }}</ore-chip>
          </div>
          <ore-text color="muted" size="sm">{{ t('targetBoard.subtitle') }}</ore-text>
        </div>
      </header>
      <div class="target-board__options">
        <ore-card
          class="target-option"
          interactive
          padding="none"
          v-for="monster in monsters"
          :key="monster.id"
          :aria-label="t('targetBoard.inspectAria', { name: monster.name })"
          :aria-pressed="inspectedId === monster.id"
          :class="{
            'target-option--selected': modelValue === monster.id,
            'target-option--viewing': inspectedId === monster.id,
          }"
          @activate="inspect(monster)">
          <div class="target-option__emblem" slot="media">
            <img alt="" loading="lazy" :src="asset(monster.trophyIcon)" />
          </div>
          <div class="target-option__body">
            <ore-text as="h3" size="xs" variant="heading">{{ monster.name }}</ore-text>
            <ore-text color="muted" size="xs">{{ monster.habitat }}</ore-text>
            <div class="target-option__states">
              <ResourceIcon size="sm" :id="monster.element" />
              <ore-chip color="info" size="sm" variant="flat" v-if="modelValue === monster.id">
                {{ t('common.selected') }}
              </ore-chip>
              <ore-chip color="secondary" size="sm" variant="solid" v-if="inspectedId === monster.id">
                {{ t('common.viewing') }}
              </ore-chip>
            </div>
          </div>
        </ore-card>
      </div>
    </section>

    <aside aria-labelledby="target-details-title" class="target-details" tabindex="-1" ref="detailsRef" >
      <template v-if="inspected">
        <header class="target-details__hero">
          <img alt="" :src="asset(inspected.trophyIcon)" />
          <div>
            <ore-text variant="overline">{{ t('targetBoard.briefing') }}</ore-text>
            <ore-text as="h2" id="target-details-title" size="md" variant="heading">{{ inspected.name }}</ore-text>
            <ore-text color="muted" size="sm">{{ inspected.habitat }}</ore-text>
          </div>
        </header>

        <section class="target-details__monster-info">
          <MonsterInfo :monster="inspected" />
        </section>

        <dl class="target-details__facts">
          <div>
            <dt>{{ t('targetBoard.box') }}</dt>
            <dd>{{ expansionName }}</dd>
          </div>
        </dl>

        <slot name="after-details" :monster="inspected" :selected="modelValue === inspected.id" />

        <slot name="selection-action" :monster="inspected" :selected="modelValue === inspected.id">
          <ore-button
            color="secondary"
            variant="solid"
            :disabled="modelValue === inspected.id"
            @click="emit('update:modelValue', inspected.id)">
            {{ modelValue === inspected.id ? t('targetBoard.targetSelected') : t('targetBoard.chooseTarget', { name: inspected.name }) }}
          </ore-button>
        </slot>
      </template>
    </aside>
  </div>
</template>

<style scoped>
.target-board {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(20rem, 0.72fr);
  gap: 1.5rem;
  align-items: start;
}

.target-board__list,
.target-details {
  display: grid;
  gap: 1rem;
  min-width: 0;
}

.target-board__heading {
  display: grid;
  gap: var(--size-1-5);
  padding-block: var(--size-1) var(--size-3);
}

.target-board__subtitle-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-4);
  align-items: center;
  justify-content: space-between;
}

/* The row's leading tools: the Nightmare toggle opens the row, the target count beside
   it; the hint closes the row at the far end. */
.target-board__tools {
  display: flex;
  gap: var(--size-3);
  align-items: center;
}

.target-board__heading ore-text[variant='heading'] {
  --text-letter-spacing: var(--tracking-normal);
  font-family: var(--font-serif);
}

.target-board__options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  max-height: 52rem;
  padding: var(--size-1);
  overflow-y: auto;
  scrollbar-gutter: stable;
}

.target-option {
  --card-shadow: none;
  overflow: visible;
}

.target-option.target-option--viewing[aria-pressed='true'] {
  --card-shadow: none;
}

.target-option--selected:not(.target-option--viewing) {
  --card-border-color: color-mix(in oklch, var(--p-river) 60%, transparent);
}

.target-option__emblem {
  display: grid;
  place-items: center;
  width: 100%;
  min-height: 8rem;
  background: var(--p-panel-sunken);
  border-bottom: var(--border) solid var(--p-line);
}

.target-option__emblem img {
  width: 5.25rem;
  height: 5.25rem;
  object-fit: contain;
  filter: drop-shadow(var(--drop-shadow-sm));
}

.target-option__body {
  display: grid;
  gap: 0.3rem;
  padding: 0.75rem;
}

.target-option__states {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  align-items: center;
  min-height: 1.75rem;
  padding-top: 0.35rem;
}

.target-details {
  position: sticky;
  top: 5rem;
  padding: var(--size-5);
  scroll-margin-top: 1rem;
  background: var(--p-panel-sunken);
  border: var(--border) solid var(--p-line);
  border-radius: var(--rounded-sm);
}

.target-details__hero {
  display: grid;
  grid-template-columns: 5rem minmax(0, 1fr);
  gap: var(--size-3);
  align-items: center;
}

.target-details__hero img {
  width: 5rem;
  height: 5rem;
  object-fit: contain;
  filter: drop-shadow(var(--drop-shadow-sm));
}

.target-details__monster-info {
  display: grid;
  gap: var(--size-2);
  padding-top: var(--size-3);
  border-top: var(--border) solid var(--p-line);
}

.target-details__facts {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
  padding-block: 1rem;
  margin: 0;
  border-block: var(--border) solid var(--p-line);
}

.target-details__facts div {
  display: grid;
  gap: 0.25rem;
}

.target-details__facts dt {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--p-text-muted);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
}

.target-details__facts dd {
  margin: 0;
  color: var(--p-text-strong);
}

.target-details > ore-button {
  justify-self: end;
}

@media (width >= 1200px) {
  .target-board__options {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (width < 900px) {
  .target-board {
    grid-template-columns: 1fr;
  }

  .target-board__options {
    max-height: 24rem;
  }

  .target-details {
    position: static;
  }
}

@media (width < 560px) {
  .target-board__options {
    grid-template-columns: 1fr;
  }
}

@media (width < 480px) {
  .target-details {
    padding: 1rem;
  }

  .target-details__hero,
  .target-details__facts {
    grid-template-columns: 1fr;
  }

  .target-details > ore-button {
    width: 100%;
  }
}
</style>
