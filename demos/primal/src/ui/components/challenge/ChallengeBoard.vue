<script lang="ts" setup>
import { computed, nextTick, ref, watch } from 'vue';
import { asset } from '../../../app/assets';
import { t, tp } from '../../../app/i18n';
import { challenges, notifyError, runCommand } from '../../../app/store';
import { useReadable } from '../../../app/vue-bridge';
import {
  monsterById,
  monsterDamageFor,
  trialBiomeArtwork,
  trialBiomeName,
  trialEncounterBiome,
} from '../../../content/index';
import { challengeAvailableMonsters } from '../../../domain/challenge';
import type { Monster, MonsterStanceDamage } from '../../../domain/types';
import MonsterInfo from '../MonsterInfo.vue';
import NightmareModeToggle from '../NightmareModeToggle.vue';
import '@vielzeug/refine/accordion';
import '@vielzeug/refine/accordion-item';
import '@vielzeug/refine/button';
import '@vielzeug/refine/card';
import '@vielzeug/refine/chip';
import '@vielzeug/refine/text';

/**
 * The Winds expedition choice, shaped like the campaign's quest board: the series' undefeated
 * monsters as choice cards on the left, the inspected monster's briefing: element, weaknesses,
 * stance damage at the run's aggression, and the expedition roll on the right. The die decides
 * the biome; confirming records the encounter and hands the phase to the fight.
 */
const props = defineProps<{ locked?: boolean; runId: string }>();
const all = useReadable(challenges);
const run = computed(() => all.value.find((entry) => entry.id === props.runId));
/** The box is on the table: the switch waits; otherwise it names what would enable it. */
const nightmareAvailable = computed(() => Boolean(run.value?.expansionIds.includes('nightmare')));

function setNightmare(on: boolean): void {
  try {
    runCommand('setSubjectNightmare', { id: props.runId, kind: 'challenge' }, on);
  } catch (error) {
    notifyError('toasts.actionNotPossible', error);
  }
}
const choices = computed(() => (run.value ? challengeAvailableMonsters(run.value) : []));
const defeated = computed(() =>
  (run.value?.defeatedMonsterIds ?? []).flatMap((id) => {
    const monster = monsterById(id);
    return monster ? [monster] : [];
  }),
);
const inspectedMonsterId = ref<string | null>(null);
const inspectedMonster = computed(() => (inspectedMonsterId.value ? monsterById(inspectedMonsterId.value) : undefined));
const dieFaces = [1, 2, 3, 4, 5, 6] as const;
type DieFace = (typeof dieFaces)[number];
const dieRoll = ref<DieFace | null>(null);
const faceOptions = computed(() => {
  const monster = inspectedMonster.value;
  if (!monster) return [];
  return dieFaces.flatMap((face) => {
    const biome = trialEncounterBiome(monster.id, face);
    return biome
      ? [{ art: asset(trialBiomeArtwork(biome)), biome, face, name: trialBiomeName(biome) }]
      : [];
  });
});
const selectedFace = computed(() => faceOptions.value.find(({ face }) => face === dieRoll.value));
const detailRef = ref<HTMLElement | null>(null);
const boardHeadingRef = ref<HTMLElement | null>(null);

const currentDamage = computed(() => {
  const monster = inspectedMonster.value;
  const aggression = run.value?.aggression;
  if (!monster || aggression === undefined) return undefined;
  // The stance rows follow the board's Nightmare toggle exactly as the campaign's quest
  // board does; a monster without printed Nightmare rows falls back to its standard ones.
  return monsterDamageFor(monster, aggression, run.value?.nightmareVariant) ?? monsterDamageFor(monster, aggression, false);
});
const stanceLabels = ['I', 'II', 'III', 'IV', 'V'] as const;
const stanceEntries = (row: MonsterStanceDamage | undefined) =>
  Object.entries(row?.stances ?? {}).map(([stance, damage]) => ({
    damage,
    label: stanceLabels[Number(stance) - 1],
  }));
const damageGlyphs = {
  perPlayer: { '--glyph': `url(${asset('/icons/icon_per_player.svg')})` },
  wound: { '--glyph': `url(${asset('/icons/icon_wound.svg')})` },
} as const;

// A new session resets the roll and keeps the first choice inspected, like the quest board.
watch(
  [choices, () => run.value?.expeditionNumber],
  ([available]) => {
    if (!available.some((entry) => entry.monsterId === inspectedMonsterId.value)) {
      inspectedMonsterId.value = available[0]?.monsterId ?? null;
    }
    dieRoll.value = null;
  },
  { immediate: true },
);

function inspect(monster: Monster): void {
  if (inspectedMonsterId.value !== monster.id) dieRoll.value = null;
  inspectedMonsterId.value = monster.id;
  if (!window.matchMedia('(width < 960px)').matches) return;
  void nextTick(() => detailRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
}

function rollDie(): void {
  dieRoll.value = (1 + Math.floor(Math.random() * 6)) as DieFace;
}

function commit(): void {
  if (!run.value || !inspectedMonsterId.value || dieRoll.value === null) return;
  try {
    runCommand(
      'rollChallengeEncounter',
      { id: run.value.id, kind: 'challenge' },
      inspectedMonsterId.value,
      dieRoll.value,
    );
  } catch (error) {
    notifyError('challenge.encounterError', error);
  }
}

function returnToBoard(): void {
  boardHeadingRef.value?.focus();
  boardHeadingRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
</script>

<template>
  <div class="expedition-decision" v-if="run">
    <section aria-labelledby="expedition-choices-title" class="expedition-board">
      <header class="expedition-board__heading">
        <ore-text variant="overline">{{ t('challenge.boardEyebrow') }}</ore-text>
        <ore-text as="h3" id="expedition-choices-title" size="lg" tabindex="-1" variant="heading" ref="boardHeadingRef">
          {{ t('challenge.boardTitle') }}
        </ore-text>
        <div class="expedition-board__subtitle-row">
          <div class="expedition-board__tools">
            <!-- The Nightmare variant rides the board: flip it between expeditions and the
                 score sheets carry it from the next fight on. The choice count reads beside
                 the toggle, which opens the row. -->
            <NightmareModeToggle :checked="run.nightmareVariant" :disabled="!nightmareAvailable || locked"
              @change="setNightmare" />
            <ore-chip size="sm" variant="outline">{{ tp('challenge.choiceCount', choices.length) }}</ore-chip>
          </div>
          <ore-text color="muted">{{ t('challenge.boardHint') }}</ore-text>
        </div>
      </header>

      <div class="expedition-board__grid" v-if="choices.length">
        <ore-card
          class="expedition-choice"
          interactive
          padding="none"
          v-for="entry in choices"
          :key="entry.monsterId"
          :aria-label="t('targetBoard.inspectAria', { name: monsterById(entry.monsterId)?.name ?? '' })"
          :aria-pressed="inspectedMonsterId === entry.monsterId"
          :class="{ 'expedition-choice--viewing': inspectedMonsterId === entry.monsterId }"
          @activate="monsterById(entry.monsterId) && inspect(monsterById(entry.monsterId)!)">
          <div class="expedition-choice__layout">
            <div class="expedition-choice__art">
              <img alt="" :src="asset(monsterById(entry.monsterId)?.trophyIcon ?? '')" />
            </div>
            <div class="expedition-choice__body">
              <ore-text as="h4" size="sm" variant="heading">{{ monsterById(entry.monsterId)?.name }}</ore-text>
              <ore-text color="muted" size="sm">{{ monsterById(entry.monsterId)?.habitat }}</ore-text>
              <div class="expedition-choice__states">
                <ore-chip size="sm" variant="outline">{{ t('questBoard.available') }}</ore-chip>
                <ore-chip color="secondary" size="sm" variant="solid" v-if="inspectedMonsterId === entry.monsterId">
                  {{ t('common.viewing') }}
                </ore-chip>
              </div>
            </div>
          </div>
        </ore-card>
      </div>

      <div class="expedition-board__empty" v-else>
        <ore-text as="h4" size="sm" variant="heading">{{ t('challenge.boardEmptyTitle') }}</ore-text>
        <ore-text color="muted">{{ t('challenge.boardEmptyHint') }}</ore-text>
      </div>

      <ore-accordion class="expedition-history" selection-mode="multiple" size="sm" variant="text" v-if="defeated.length">
        <ore-accordion-item>
          <span slot="title">{{ t('challenge.trophiesTitle') }}</span>
          <ore-chip size="sm" slot="suffix" variant="flat">{{ defeated.length }}</ore-chip>
          <ul class="expedition-history__list list-plain">
            <li v-for="monster in defeated" :key="monster.id">
              <img alt="" :src="asset(monster.trophyIcon)" />
              <span>{{ monster.name }}</span>
              <ore-chip color="success" size="sm" variant="outline">{{ t('questBoard.completed') }}</ore-chip>
            </li>
          </ul>
        </ore-accordion-item>
      </ore-accordion>
    </section>

    <aside
      aria-labelledby="expedition-briefing-title"
      class="expedition-briefing"
      id="expedition-briefing"
      tabindex="-1"
      ref="detailRef">
      <template v-if="inspectedMonster">
        <header class="expedition-briefing__hero">
          <img alt="" :src="asset(inspectedMonster.trophyIcon)" />
          <div>
            <ore-text variant="overline">{{ t('questBoard.briefing') }}</ore-text>
            <ore-text as="h3" id="expedition-briefing-title" size="md" variant="heading">
              {{ inspectedMonster.name }}
            </ore-text>
            <ore-text color="muted">{{ inspectedMonster.habitat }}</ore-text>
          </div>
        </header>

        <section class="expedition-briefing__section">
          <MonsterInfo :monster="inspectedMonster" />
        </section>

        <section class="expedition-briefing__section" v-if="currentDamage">
          <div class="expedition-briefing__damage-heading">
            <ore-text variant="overline">{{ t('questBoard.damagePerHunter') }}</ore-text>
            <ore-text color="muted" size="xs">{{ t('questBoard.damageHint') }}</ore-text>
            <div class="expedition-briefing__damage-tags">
              <ore-chip size="sm" variant="flat">
                {{ t('questBoard.aggression', { level: run.aggression }) }}
              </ore-chip>
              <ore-chip size="sm" variant="flat" :color="currentDamage.nightmare ? 'error' : undefined">
                {{ currentDamage.nightmare ? t('questBoard.nightmare') : t('questBoard.standard') }}
              </ore-chip>
            </div>
          </div>
          <div class="expedition-briefing__stance-targets">
            <article
              class="stance-target"
              v-for="target in stanceEntries(currentDamage)"
              :key="target.label"
              :aria-label="t('questBoard.stanceAria', { damage: target.damage, stance: target.label })">
              <div class="stance-target__stance">
                <ore-text color="muted" size="xs" variant="overline">
                  {{ t('questBoard.stance', { stance: target.label }) }}
                </ore-text>
              </div>
              <div class="stance-target__equation">
                <strong>{{ target.damage }}</strong>
                <span aria-hidden="true" class="stance-target__glyph stance-target__glyph--player" :style="damageGlyphs.perPlayer" />
                <span aria-hidden="true" class="stance-target__arrow">→</span>
                <span aria-hidden="true" class="stance-target__glyph stance-target__glyph--wound" :style="damageGlyphs.wound" />
              </div>
            </article>
          </div>
        </section>

        <section class="expedition-briefing__section">
          <div class="expedition-briefing__roll-heading">
            <ore-text variant="overline">{{ t('challenge.dieRollTitle') }}</ore-text>
            <ore-button size="sm" variant="bordered" @click="rollDie">{{ t('challenge.rollDie') }}</ore-button>
          </div>

          <fieldset class="expedition-briefing__faces">
            <legend class="visually-hidden">{{ t('challenge.dieRollTitle') }}</legend>
            <ore-card
              class="expedition-face"
              interactive
              padding="none"
              v-for="option in faceOptions"
              :key="option.face"
              :aria-label="t('challenge.biomeFaceAria', { biome: option.name, face: option.face })"
              :aria-pressed="dieRoll === option.face"
              :class="{ 'expedition-face--selected': dieRoll === option.face }"
              :style="{ '--biome-art': `url('${option.art}')` }"
              @activate="dieRoll = option.face">
              <div class="expedition-face__surface">
                <span class="expedition-face__number">{{ option.face }}</span>
              </div>
            </ore-card>
          </fieldset>

          <div class="expedition-face-legend" role="status">
            <ore-text class="expedition-face-legend__selection" size="sm" v-if="selectedFace">
              {{ t('challenge.rolledFace', { biome: selectedFace.name, face: selectedFace.face }) }}
            </ore-text>
            <ore-text color="muted" size="sm" v-else>{{ t('challenge.boardRollHint') }}</ore-text>
          </div>
        </section>

        <div class="expedition-briefing__actions">
          <ore-button class="expedition-briefing__back" size="sm" variant="ghost" @click="returnToBoard">
            {{ t('challenge.backToBoard') }}
          </ore-button>
          <ore-button color="secondary" variant="solid" :disabled="dieRoll === null || locked" @click="commit">
            {{ t('challenge.confirmEncounter') }}
          </ore-button>
        </div>
      </template>
      <div class="expedition-board__empty" v-else>
        <ore-text as="h3" id="expedition-briefing-title" size="sm" variant="heading">
          {{ t('challenge.boardEmptyTitle') }}
        </ore-text>
        <ore-text color="muted">{{ t('challenge.boardEmptyHint') }}</ore-text>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.expedition-decision {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(20rem, 0.72fr);
  gap: 1.5rem;
  align-items: start;
}

.expedition-board,
.expedition-briefing,
.expedition-history {
  display: grid;
  gap: 1rem;
  min-width: 0;
}

.expedition-board__heading {
  display: grid;
  gap: var(--size-1-5);
  max-width: min(100%, calc(var(--size-96) * 2));
  padding-block: var(--size-1) var(--size-3);
}

.expedition-board__subtitle-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-4);
  align-items: center;
  justify-content: space-between;
}

/* The row's leading tools: the Nightmare toggle opens the row, the choice count beside
   it; the hint closes the row at the far end. */
.expedition-board__tools {
  display: flex;
  gap: var(--size-3);
  align-items: center;
}

.expedition-board__heading ore-text[variant='heading'] {
  --text-letter-spacing: var(--tracking-normal);
  font-family: var(--font-serif);
}

.expedition-board__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

@media (width >= 1200px) {
  .expedition-board__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.expedition-choice {
  --card-shadow: none;
  min-width: 0;
  overflow: visible;
}

.expedition-choice.expedition-choice--viewing[aria-pressed='true'] {
  --card-bg: light-dark(oklch(98% 0.005 28), oklch(19% 0.005 28));
  --card-shadow: none;
  --expedition-state-border: color-mix(in oklch, var(--p-blood) 60%, transparent);
  --expedition-state-border-width: var(--border);
}

.expedition-choice__layout {
  position: relative;
  display: grid;
  grid-template-rows: auto 1fr;
  height: 100%;
}

.expedition-choice__layout::after {
  position: absolute;
  inset: 0;
  z-index: 2;
  box-sizing: border-box;
  pointer-events: none;
  content: '';
  border: var(--expedition-state-border-width, 0) solid var(--expedition-state-border, transparent);
}

.expedition-choice__art {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 8rem;
  background: linear-gradient(155deg, var(--p-panel-raised), var(--p-panel-sunken));
  border-bottom: var(--border) solid var(--p-line);
}

.expedition-choice__art img {
  width: 5.25rem;
  height: 5.25rem;
  object-fit: contain;
  filter: drop-shadow(var(--drop-shadow-sm));
}

.expedition-choice__body {
  display: grid;
  gap: 0.3rem;
  padding: 0.75rem;
}

.expedition-choice__states {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  align-items: center;
  min-height: 1.75rem;
  padding-top: 0.35rem;
}

.expedition-board__empty {
  display: grid;
  gap: var(--size-2);
  padding: var(--size-6);
  background: var(--p-panel-sunken);
  border-radius: var(--rounded-md);
}

.expedition-history__list {
  display: grid;
  gap: var(--size-2);
}

.expedition-history__list li {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-3);
  align-items: center;
}

.expedition-history__list img {
  width: var(--size-8);
  height: var(--size-8);
  object-fit: contain;
}

.expedition-briefing {
  position: sticky;
  top: 5rem;
  display: grid;
  gap: 0;
  padding: var(--size-5);
  scroll-margin-top: 1rem;
  background: var(--p-panel-sunken);
  border: var(--border) solid var(--p-line);
  border-radius: var(--rounded-sm);
}

.expedition-briefing__hero {
  display: grid;
  grid-template-columns: 5rem minmax(0, 1fr);
  gap: var(--size-3);
  align-items: center;
}

.expedition-briefing__hero img {
  width: 5rem;
  height: 5rem;
  object-fit: contain;
  filter: drop-shadow(var(--drop-shadow-sm));
}

.expedition-briefing__section {
  display: grid;
  gap: var(--size-2);
  padding-top: var(--size-3);
  padding-bottom: var(--size-3);
  border-top: var(--border) solid var(--p-line);
}

.expedition-briefing__damage-heading,
.expedition-briefing__damage-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-2);
  align-items: center;
}

.expedition-briefing__damage-heading {
  justify-content: space-between;
}

.expedition-briefing__stance-targets {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, var(--size-32)), 1fr));
  gap: var(--size-2);
}

.stance-target {
  display: grid;
  gap: var(--size-2);
  align-content: start;
  min-width: 0;
  padding: var(--size-3);
  background: var(--p-panel);
  border: var(--border) solid var(--p-line);
  border-radius: var(--rounded-sm);
}

.stance-target__stance {
  display: grid;
  gap: var(--size-0-5);
}

.stance-target__equation {
  display: flex;
  gap: var(--size-1-5);
  align-items: center;
  min-width: 0;
}

.stance-target__equation strong {
  font-family: var(--p-heading);
  font-size: var(--text-xl);
  color: var(--p-text-strong);
}

/* Token glyphs are masks in theme colors so they adapt to light and dark mode. */
.stance-target__glyph {
  display: inline-block;
  flex-shrink: 0;
  inline-size: var(--size-5);
  block-size: var(--size-5);
  background: currentcolor;
  mask: var(--glyph) center / contain no-repeat;
}

.stance-target__glyph--player {
  color: var(--p-text-muted);
}

.stance-target__glyph--wound {
  color: var(--p-blood);
}

.stance-target__arrow {
  color: var(--p-text-muted);
}

.expedition-briefing__roll {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-3);
  align-items: center;
}

.expedition-briefing__roll-heading {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-2);
  align-items: center;
  justify-content: space-between;
}

.expedition-briefing__faces {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: var(--size-1);
  width: 100%;
  min-width: 0;
  padding: 0;
  margin: 0;
  border: 0;
}

.expedition-face {
  --card-bg: var(--p-panel);
  --card-border-color: var(--p-line);
  --card-radius: var(--rounded-sm);
  --card-shadow: none;
  min-width: 0;
}

.expedition-face--selected {
  --card-border-color: var(--p-gold);
}

.expedition-face__surface {
  box-sizing: border-box;
  display: grid;
  place-items: center;
  width: 100%;
  aspect-ratio: 1;
  padding: var(--size-1);
  color: var(--p-text-strong);
  background-image:
    linear-gradient(180deg, color-mix(in oklch, var(--p-canvas) 4%, transparent), color-mix(in oklch, var(--p-canvas) 94%, transparent)),
    var(--biome-art);
  background-position: center;
  background-size: cover;
}

.expedition-face__number {
  font-family: var(--p-heading);
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  line-height: var(--leading-tight);
}

.expedition-face-legend {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  min-height: var(--size-8);
  text-align: center;
}

.expedition-face-legend__selection {
  --text-color: var(--p-text-strong);
  font-weight: var(--font-semibold);
}

.expedition-briefing__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-3);
  align-items: center;
  justify-content: space-between;
  padding-top: var(--size-4);
  border-top: var(--border) solid var(--p-line);
}

@media (width < 960px) {
  .expedition-decision {
    grid-template-columns: 1fr;
  }

  .expedition-briefing {
    position: static;
  }
}

@media (width < 560px) {
  .expedition-board__grid {
    grid-template-columns: 1fr;
  }
}
</style>
