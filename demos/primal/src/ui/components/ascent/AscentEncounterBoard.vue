<script lang="ts" setup>
import { computed } from 'vue';
import { asset } from '../../../app/assets';
import { t } from '../../../app/i18n';
import { ascents, notifyError, runCommand } from '../../../app/store';
import { useReadable } from '../../../app/vue-bridge';
import { monsterById, monsterDamageFor } from '../../../content/index';
import { ascentChapter, ascentMayAdjustDecks, ascentScenario } from '../../../domain/ascent';
import type { SubjectRef } from '../../../domain/types';
import { useSessionGuest } from '../../composables/use-session-guest';
import BattlefieldMap from '../BattlefieldMap.vue';
import MonsterInfo from '../MonsterInfo.vue';
import NightmareModeToggle from '../NightmareModeToggle.vue';
import ResourceIcon from '../ResourceIcon.vue';
import StanceTargets from '../StanceTargets.vue';
import '@vielzeug/refine/button';
import '@vielzeug/refine/chip';
import '@vielzeug/refine/text';

/**
 * The ascent's encounter step, the quest board's own grammar: the left column carries the
 * chapter tools — the Nightmare switch beside the fight's level — over the battlefield the
 * scenario and chapter terrain set; the right column is the drawn encounter's briefing,
 * the stance damage answering the switch, and the phase's actions (back to preparation,
 * begin the hunt).
 */
const props = defineProps<{ ascentId: string }>();
const emit = defineEmits<{ back: [] }>();

const all = useReadable(ascents);
const ascent = computed(() => all.value.find((entry) => entry.id === props.ascentId));
const subject = computed<SubjectRef | null>(
  () => (ascent.value ? { id: ascent.value.id, kind: 'ascent' as const } : null),
);
const monster = computed(() => (ascent.value?.pending ? monsterById(ascent.value.pending.monsterId) : undefined));
const scenario = computed(() => (ascent.value ? ascentScenario(ascent.value) : undefined));
const chapter = computed(() => (ascent.value ? ascentChapter(ascent.value) : undefined));
const deckWarning = computed(() => (ascent.value ? ascentMayAdjustDecks(ascent.value) : false));

/** The fight the chapter prints: the merged terrain the table sets, scenario first. */
const encounterTerrain = computed(() =>
  scenario.value && chapter.value ? [...scenario.value.terrain, ...(chapter.value.terrain ?? [])] : [],
);

/** The wound math the switch answers: the drawn monster at the chapter's level, the
 *  Nightmare variant's rows while the climb plays it, the printed standard otherwise. */
const encounterDamage = computed(() => {
  const current = ascent.value;
  const drawn = monster.value;
  if (!current || !drawn) return undefined;
  return (
    monsterDamageFor(drawn, current.chapter, current.nightmareVariant) ??
    monsterDamageFor(drawn, current.chapter, false)
  );
});

/** Guest gating: the host-only flow actions disable while this tab joined the session. */
const sessionGuest = useSessionGuest('ascent', () => ascent.value?.id);

/** The box is on the table: the switch waits; otherwise it names what would enable it. */
const nightmareAvailable = computed(() => Boolean(ascent.value?.expansionIds.includes('nightmare')));

function setNightmare(on: boolean): void {
  if (!subject.value) return;
  try {
    runCommand('setSubjectNightmare', subject.value, on);
  } catch (error) {
    notifyError('toasts.actionNotPossible', error);
  }
}

function beginHunt(): void {
  if (!subject.value) return;
  runCommand('beginAscentHunt', subject.value);
}
</script>

<template>
  <div class="encounter-decision" v-if="ascent">
    <section aria-labelledby="encounter-board-title" class="encounter-board">
      <header class="encounter-board__heading">
        <ore-text variant="overline">{{ t('ascentDetail.phase.encounter') }}</ore-text>
        <ore-text as="h3" id="encounter-board-title" size="lg" variant="heading">
          {{ t('ascentDetail.encounterTitle') }}
        </ore-text>
        <div class="encounter-board__subtitle-row">
          <div class="encounter-board__tools">
            <!-- The Nightmare variant rides the encounter: flip it here and the briefing's
                 stance damage re-reflects the rows the next fight prints. -->
            <NightmareModeToggle :checked="Boolean(ascent.nightmareVariant)" :disabled="!nightmareAvailable"
              @change="setNightmare" />
            <ore-chip size="sm" variant="outline">{{ t('questBoard.aggression', { level: ascent.chapter }) }}</ore-chip>
          </div>
          <ore-text color="muted">{{ t('ascentDetail.encounterHint') }}</ore-text>
        </div>
      </header>

      <template v-if="monster && scenario">
        <div class="encounter-board__battlefield">
          <BattlefieldMap
            :label="t('huntSetup.battlefieldAria', { name: monster.name })"
            :terrain="encounterTerrain" />
        </div>
      </template>
      <div class="encounter-board__empty" v-else>
        <ore-text as="h4" size="sm" variant="heading">{{ t('ascentDetail.encounterMissing') }}</ore-text>
        <ore-text color="muted">{{ t('ascentDetail.encounterMissingHint') }}</ore-text>
      </div>
    </section>

    <aside
      aria-labelledby="encounter-briefing-title"
      class="encounter-briefing"
      id="encounter-briefing"
      tabindex="-1">
      <template v-if="monster && scenario">
        <header class="encounter-briefing__hero">
          <img alt="" :src="asset(monster.trophyIcon)" />
          <div>
            <ore-text variant="overline">{{ t('ascentDetail.drawnEyebrow') }}</ore-text>
            <ore-text as="h3" id="encounter-briefing-title" size="md" variant="heading">{{ monster.name }}</ore-text>
            <ore-text color="muted">{{ scenario.name }} · {{ monster.habitat }} ·
              <ResourceIcon size="sm" :id="monster.element" />
            </ore-text>
          </div>
        </header>

        <section class="encounter-briefing__section">
          <ore-text variant="overline">{{ t('questBoard.briefing') }}</ore-text>
          <ore-text class="encounter-briefing__story" size="sm">{{ scenario.objective }}</ore-text>
          <ore-text color="muted" size="sm" v-if="deckWarning">{{ t('ascentDetail.deckWarning') }}</ore-text>
        </section>

        <section class="encounter-briefing__section encounter-briefing__section--monster">
          <MonsterInfo :monster="monster" />
        </section>

        <section class="encounter-briefing__section" v-if="encounterDamage">
          <StanceTargets :aggression="ascent.chapter" :damage="encounterDamage" />
        </section>

        <div class="encounter-briefing__actions">
          <ore-button size="sm" variant="ghost" @click="emit('back')">
            {{ t('ascentDetail.backToPreparation') }}
          </ore-button>
          <ore-button color="secondary" variant="solid" :disabled="sessionGuest" @click="beginHunt">
            {{ t('ascentDetail.beginHunt') }}
          </ore-button>
        </div>
      </template>
      <div class="encounter-board__empty" v-else>
        <ore-text as="h3" id="encounter-briefing-title" size="sm" variant="heading">
          {{ t('ascentDetail.encounterMissing') }}
        </ore-text>
        <ore-text color="muted">{{ t('ascentDetail.encounterMissingHint') }}</ore-text>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.encounter-decision {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(20rem, 0.72fr);
  gap: 1.5rem;
  align-items: start;
}

.encounter-board,
.encounter-briefing {
  display: grid;
  gap: 1rem;
  min-width: 0;
}

.encounter-board__heading {
  display: grid;
  gap: var(--size-1-5);
  max-width: min(100%, calc(var(--size-96) * 2));
  padding-block: var(--size-1) var(--size-3);
}

.encounter-board__subtitle-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-4);
  align-items: center;
  justify-content: space-between;
}

/* The row's leading tools: the Nightmare toggle opens the row, the fight's level beside
   it; the hint closes the row at the far end. */
.encounter-board__tools {
  display: flex;
  gap: var(--size-3);
  align-items: center;
}

.encounter-board__heading ore-text[variant='heading'] {
  --text-letter-spacing: var(--tracking-normal);
  font-family: var(--font-serif);
}

/* The battlefield the table sets: the encounter's own area, wider than the reference
   panel the hunt step carries, so the sectors read at arm's length. */
.encounter-board__battlefield {
  padding: var(--size-3);
  background: var(--p-panel-sunken);
  border: var(--border) solid var(--p-line);
  border-radius: var(--rounded-sm);
}

.encounter-board__battlefield .battlefield-map {
  margin-inline: auto;
}

.encounter-briefing {
  position: sticky;
  top: 5rem;
  padding: 1.25rem;
  scroll-margin-top: 1rem;
  background: var(--p-panel-sunken);
  border: var(--border) solid var(--p-line);
  border-radius: var(--rounded-sm);
}

.encounter-briefing__hero {
  display: grid;
  grid-template-columns: 5rem minmax(0, 1fr);
  gap: 0.75rem;
  align-items: center;
}

.encounter-briefing__hero img {
  width: 5rem;
  height: 5rem;
  object-fit: contain;
  filter: drop-shadow(var(--drop-shadow-sm));
}

.encounter-briefing__section {
  display: grid;
  gap: 0.6rem;
  padding-top: 0.85rem;
  border-top: var(--border) solid var(--p-line);
}

.encounter-briefing__section--monster {
  gap: var(--size-2);
}

.encounter-briefing__story {
  line-height: 1.6;
}

.encounter-briefing__actions {
  display: grid;
  gap: 0.5rem;
  padding-top: 1rem;
  border-top: var(--border) solid var(--p-line);
}

.encounter-board__empty {
  display: grid;
  gap: 0.35rem;
  place-content: center;
  min-height: 8rem;
  text-align: center;
}

@media (width < 960px) {
  .encounter-decision {
    grid-template-columns: 1fr;
  }

  .encounter-briefing {
    position: static;
  }
}

@media (width < 560px) {
  .encounter-briefing {
    padding: 1rem;
  }

  .encounter-briefing__actions ore-button {
    width: 100%;
  }
}
</style>
