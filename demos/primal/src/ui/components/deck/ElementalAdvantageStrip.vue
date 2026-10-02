<script lang="ts" setup>
import { computed } from 'vue';
import { asset } from '../../../app/assets';
import { t, tp } from '../../../app/i18n';
import { coveredElements, huntMatchups } from '../../../domain/deck';
import type { EquipmentIds, Monster } from '../../../domain/types';
import ResourceIcon from '../ResourceIcon.vue';
import '@vielzeug/refine/chip';
import '@vielzeug/refine/text';

/**
 * Counterpart of TargetStrip for the target-less build library, where no monster decides the deck
 * budget. Two facts in the order the player weighs them: the hunts this equipment could exploit,
 * named and scored with what equipping it there would grant, and the elemental coverage that makes
 * those hunts reachable. The best matchup is the budget the editor allows, so the two never disagree.
 * Monster names are plain text rather than tooltip-only, so keyboard and touch can read them.
 */
const props = defineProps<{ equipment: EquipmentIds; huntPool: readonly Monster[] }>();

/** Past this many hunts the tail is noise: collapse it into a count. */
const maxRows = 6;

const matchups = computed(() => huntMatchups(props.equipment, props.huntPool));
const best = computed(() => matchups.value[0]?.advantages ?? 0);
const shown = computed(() => matchups.value.slice(0, maxRows));
const hidden = computed(() => matchups.value.length - shown.value.length);
const coverage = computed(() => coveredElements(props.equipment));
</script>

<template>
  <section class="advantage" :aria-label="t('deck.advantageTitle')">
    <div class="advantage__head">
      <ore-text variant="overline">{{ t('deck.advantageTitle') }}</ore-text>
      <ore-chip size="sm" variant="solid" :color="best ? 'primary' : 'secondary'">
        {{ tp('deck.advantageUpTo', best) }}
      </ore-chip>
    </div>

    <ul class="advantage__list" v-if="shown.length" :aria-label="t('deck.advantageMatchupList')">
      <li class="advantage__row" v-for="matchup in shown" :key="matchup.monster.id">
        <img
          class="advantage__trophy"
          loading="lazy"
          :alt="matchup.monster.name"
          :src="asset(matchup.monster.trophyIcon)" />
        <ore-text truncate :weight="matchup.advantages === best ? 'semibold' : 'normal'">
          {{ matchup.monster.name }}
        </ore-text>
        <ore-text color="muted" size="xs">{{ tp('deck.advantageGrant', matchup.advantages) }}</ore-text>
      </li>
    </ul>
    <ore-text color="muted" size="sm" v-else>{{ t('deck.advantageNone') }}</ore-text>
    <ore-text color="muted" size="xs" v-if="hidden > 0">{{ tp('deck.advantageMoreHunts', hidden) }}</ore-text>

    <div class="advantage__coverage" v-if="coverage.length">
      <ResourceIcon size="sm" v-for="entry in coverage" :key="entry.element" :count="entry.count" :id="entry.element" />
    </div>
  </section>
</template>

<style scoped>
.advantage {
  display: grid;
  gap: var(--size-3);
  padding: var(--size-4);
  background: var(--p-panel-sunken);
  border: var(--border) solid var(--p-line);
  border-radius: var(--rounded-sm);
}

.advantage__head {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-2);
  align-items: center;
  justify-content: space-between;
}

.advantage__list {
  display: grid;
  gap: var(--size-1);
  padding: var(--size-3) 0;
  margin: 0;
  list-style: none;
  border-block: var(--border) solid var(--p-line);
}

.advantage__row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: var(--size-2);
  align-items: center;
}

.advantage__trophy {
  width: 1.4rem;
  height: 1.4rem;
  object-fit: contain;
  filter: drop-shadow(var(--drop-shadow-xs));
}

.advantage__coverage {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-3);
  align-items: center;
}
</style>
