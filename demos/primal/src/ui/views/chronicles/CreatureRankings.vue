<script lang="ts" setup>
import '@vielzeug/refine/rank-item';
import '@vielzeug/refine/rank-list';
import { computed, ref } from 'vue';
import { asset } from '../../../app/assets';
import { t } from '../../../app/i18n';
import { monsterById } from '../../../content';
import type { ChroniclesMonster } from '../../../domain/chronicles';
import RouteLink from '../../components/RouteLink.vue';
import { formatCount, formatRate, monsterName, monsterReference, page, standing, tail } from './format';
import ShowMoreButton from './ShowMoreButton.vue';

const props = defineProps<{ monsters: ChroniclesMonster[] }>();

const expanded = ref(false);
const creatureList = computed(() => (expanded.value ? props.monsters : page(props.monsters)));
const creatureTail = computed(() => tail(props.monsters));
</script>

<template>
  <div class="chronicle__creatures" v-if="monsters.length">
    <ore-rank-list class="chronicle__ranks chronicle__ranks--creatures" id="chronicle-creature-list">
      <ore-rank-item
        v-for="row in creatureList"
        :key="row.id"
        :style="{ '--chronicle-creature-victory-share': `${(row.victories / row.count) * 100}%` }"
        :value="row.count">
        <img
          alt=""
          class="chronicle__trophy"
          slot="leading"
          v-if="monsterById(row.id)?.trophyIcon"
          :src="asset(monsterById(row.id)?.trophyIcon ?? '')" />
        <!-- The creature's name doubles as its way back into the reference: the manual opens on its entry. -->
        <RouteLink
          class="chronicle__subject-link"
          v-if="monsterById(row.id)"
          v-bind="monsterReference(row.id)">
          {{ monsterName(row.id) }}
        </RouteLink>
        <template v-else>{{ monsterName(row.id) }}</template>
        <span slot="description">{{ standing(row.victories, row.defeats) }}</span>
        <span class="chronicle__creature-trailing" slot="trailing">
          <span class="chronicle__creature-count">{{ formatCount(row.count) }}</span>
          <span
            class="chronicle__creature-win-rate"
            :aria-label="t('chronicles.monsterWinRate', { rate: formatRate(row.victories / row.count) })">
            {{ formatRate(row.victories / row.count) }}
          </span>
        </span>
      </ore-rank-item>
    </ore-rank-list>
    <ShowMoreButton
      class="chronicle__creatures-more"
      controls="chronicle-creature-list"
      v-if="creatureTail.length"
      :expanded="expanded"
      :hidden-count="creatureTail.length"
      :label="
        t(
          expanded ? 'chronicles.showFewerCreatures' : 'chronicles.showMoreCreatures',
          expanded ? {} : { count: creatureTail.length },
        )
      "
      @toggle="expanded = !expanded" />
  </div>
  <p class="chronicle__empty" v-else>{{ t('chronicles.empty') }}</p>
</template>

<style scoped>
/* The ranked rows share one register: gold bars on the sunken track, folio-face numerals. */
.chronicle__ranks {
  --rank-bar-color: var(--p-gold);
  --rank-number-color: var(--p-gold);
  --rank-track-color: var(--p-panel-sunken);
  margin-top: var(--size-3);
}

.chronicle__ranks ore-rank-item::part(rank) {
  font-family: var(--p-heading);
}

.chronicle__ranks--creatures ore-rank-item {
  --rank-bar-color: linear-gradient(
    90deg,
    var(--p-gold) 0 var(--chronicle-creature-victory-share),
    var(--p-blood) var(--chronicle-creature-victory-share) 100%
  );
}

.chronicle__trophy {
  box-sizing: border-box;
  width: var(--size-9);
  height: var(--size-9);
  padding: var(--size-1);
  object-fit: contain;
  background: var(--p-panel-sunken);
  border: var(--border) solid var(--p-line);
  border-radius: var(--rounded-sm);
}

/* The creatures read as the page's centerpiece: the ranked rows span the full width, each
   carrying its trophy scan and its win/loss standing under the name. */
.chronicle__creatures {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--size-4);
  margin-top: var(--size-3);
}

.chronicle__creature-trailing {
  display: grid;
  grid-template-columns: minmax(4ch, max-content) minmax(4ch, max-content);
  gap: var(--size-3);
  justify-items: end;
  font-variant-numeric: tabular-nums;
}

.chronicle__creature-win-rate {
  color: var(--p-text-muted);
}
</style>
