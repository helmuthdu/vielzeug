<script lang="ts" setup>
/**
 * The ranking ladder: every printed tier as a cell, the reached one marked with the
 * selected-surface tint and `aria-current`. The compact track — the expedition sheet, the
 * Winds result — renders the tiers as one ascending chip row, the reached chip carrying the
 * check and the delta to the next tier up as its subline. A table that prints a flavor line
 * per tier (the Nightmare Hunter's Trial) renders as the detailed grid instead: one vertical
 * card per tier in its shade of the ladder's rising heat — cold gray at the lowest rank,
 * warming through gold and ember, full blood at the summit — with the name over the flavor
 * line and the points badge pinned at the card's foot, the climbed card telling its story
 * through the tint alone. Either way the ladder reads as an ascent: the lowest tier first,
 * the summit last, so the delta points along the reading direction at the chip still left
 * to climb.
 */
import { computed } from 'vue';
import { t, tp } from '../../../app/i18n';
import { type TrialRanking, trialRankHeat, trialRankLevel } from '../../../content/index';
import { nextRankingFor, rankingFor } from '../../../domain/trial-score';
import '@vielzeug/refine/badge';
import '@vielzeug/refine/icon';

const props = defineProps<{ rankings: readonly TrialRanking[]; total: number }>();

const reached = computed(() => rankingFor(props.rankings, props.total));
const next = computed(() => nextRankingFor(props.rankings, props.total));
const isReached = (tier: TrialRanking): boolean => reached.value?.name === tier.name;
/** Printed highest-first; the ladder climbs from the lowest tier to the summit. */
const ascending = computed(() => [...props.rankings].reverse());
/** A table that prints a flavor line per tier renders as the detailed grid; the others keep
 *  the compact chip track. A tier carries its line or names the level that owns it. */
const textFor = (tier: TrialRanking): string | undefined => tier.text ?? trialRankLevel(tier.name)?.text;
const detailed = computed(() => props.rankings.some((tier) => textFor(tier) !== undefined));
/** The printed table's top tier: the summit cell wears its heat at full strength. */
const isApex = (tier: TrialRanking): boolean => tier === props.rankings[0];

/** The tier's heat: its named level's place on the shared rank scale — every table that
 *  names the level shades it the same, from Rookie's cold gray to Nightmare's full blood,
 *  whatever subset the table prints. A table naming unknown levels falls back to its own
 *  climb. The grid paints it as rising temperature: the border, the points pill and the
 *  reached tint all read it. */
const heat = (tier: TrialRanking): string => {
  const level = trialRankHeat(tier.name);
  if (level !== undefined) return `${level}%`;
  const last = props.rankings.length - 1;
  return last === 0 ? '100%' : `${((last - props.rankings.indexOf(tier)) / last) * 100}%`;
};

/** The tier's points: its printed threshold; the bounded catch-all names any value lower than
 *  its ceiling; the free catch-all names what it always matches. */
const points = (tier: TrialRanking): string => {
  if (tier.maxScore !== undefined) return t('trialScore.tierBelow', { score: tier.maxScore });
  return tier.minScore === null ? t('trialScore.anyTotal') : t('trialScore.tierAt', { score: tier.minScore });
};

/** The climbed cell's subline: the delta to the next tier up; the summit's closing line. */
const climbed = (): string =>
  next.value ? tp('trialScore.moreTo', next.value.needed, { tier: next.value.name }) : t('trialScore.topReached');
</script>

<template>
  <ul class="ranking" :aria-label="t('trialScore.rankingTitle')" :class="{ 'ranking--grid': detailed }">
    <li
      class="ranking__tier"
      v-for="tier in ascending"
      :key="tier.name"
      :aria-current="isReached(tier) ? 'true' : undefined"
      :class="{ 'ranking__tier--apex': isApex(tier), 'ranking__tier--reached': isReached(tier) }"
      :style="{ '--tier-heat': heat(tier) }">
      <span class="ranking__name">
        <ore-icon aria-hidden="true" name="check" size="14" v-if="!detailed && isReached(tier)" />
        {{ tier.name }}
      </span>
      <span class="ranking__text" v-if="textFor(tier)">{{ textFor(tier) }}</span>
      <span class="ranking__sub" v-if="!detailed">{{ isReached(tier) ? climbed() : points(tier) }}</span>
      <ore-badge class="ranking__points" rounded="full" size="sm" v-if="detailed">{{ points(tier) }}</ore-badge>
    </li>
  </ul>
</template>

<style scoped>
.ranking {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-2);
  padding: 0;
  margin: 0;
  list-style: none;
}

/* The printed flavor lines turn the chip track into the detailed grid: one vertical card per
   tier, the whole table as a single ascending row — the ladder itself, lowest tier on the
   left, the summit on the right — wrapping down as cards stop fitting. */
.ranking--grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 7rem), 1fr));
  gap: var(--size-2);
}

/* The chips stretch to fill their row, so the ladder reads as one continuous track from the
   lowest tier to the summit: full width on desktop, filled rows when phones wrap them. */
.ranking__tier {
  display: grid;
  flex: 1 1 var(--size-32);
  gap: var(--size-1);
  padding: var(--size-2) var(--size-3);
  background: var(--p-panel-sunken);
  border: var(--border) solid var(--p-line);
  border-radius: var(--rounded-sm);
}

/* The ladder's rising heat: every tier carries its position on the climb, and the color
   follows it across two segments — cold gray into gold for the lower half, gold into blood
   for the upper half — so the middle tiers read as the temperature climbing: bronze, gold,
   amber, before the legends run red. */
.ranking__tier {
  --tier-heat: 0%;
  --tier-warm: color-mix(in oklch, var(--p-gold) clamp(0%, calc(var(--tier-heat) * 2), 100%), var(--p-text-muted));
  --tier-color: color-mix(
    in oklch,
    var(--p-blood) clamp(0%, calc((var(--tier-heat) - 50%) * 2), 100%),
    var(--tier-warm)
  );
}

/* The detailed grid's cell: a vertical card — a raised surface framed by its heat's color,
   the name over the flavor line, the points badge pinned at the foot. */
.ranking--grid .ranking__tier {
  display: flex;
  flex-direction: column;
  padding: var(--size-3);
  background: var(--p-panel-raised);
  border-color: var(--tier-color);
}

/* The summit: the printed table's top tier frames its band at full strength. */
.ranking--grid .ranking__tier--apex {
  border-width: calc(var(--border) * 2);
}

/* The reached tier reads as the app's pressed selection: the gold line plus a tinted surface,
   with the check carrying the meaning when colour alone cannot. */
.ranking__tier--reached {
  background: color-mix(in oklch, var(--p-gold-dim) 32%, var(--p-panel-sunken));
  border-color: var(--p-gold-dim);
}

/* The grid's reached cell presses in its own heat's shade; the quiet card carries no
   further marking — the tint and `aria-current` above name the climbed tier. */
.ranking--grid .ranking__tier--reached {
  background: color-mix(in oklch, var(--tier-color) 12%, transparent);
}

.ranking__name {
  display: flex;
  gap: var(--size-1);
  align-items: center;
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
}

/* The printed table sets its tier names in capitals, centered over the card; the grid cells
   mirror the sheet. The name block always reserves its tallest printed case — two lines —
   so the flavor lines start on one baseline across the row (the foot badges pin to the
   bottom on their own). */
.ranking--grid .ranking__name {
  display: block;
  min-height: 2em;
  line-height: 1.5;
  text-align: center;
  text-transform: uppercase;
}

/* The tier's points ride as a badge at the card's foot, centered under the flavor line and
   carrying the tier's heat like the border above it: the sheet's printed value. The tint
   mixes toward transparent — like --p-gold-faint — so the badge keeps its heat's own hue
   over the cell. */
.ranking__points {
  --badge-bg: color-mix(in oklch, var(--tier-color) 14%, transparent);
  --badge-color: var(--tier-color);
  --badge-border-color: transparent;
  align-self: center;
  margin-top: auto;
}

/* The summit's points stand solid, the printed card's filled apex badge. */
.ranking--grid .ranking__tier--apex .ranking__points {
  --badge-bg: var(--tier-color);
  --badge-color: var(--p-on-dark);
}

/* The tier's printed flavor line: the sheet's own words under the name, set small. */
.ranking__text {
  font-size: var(--text-xs);
  line-height: 1.5;
  color: var(--p-text-muted);
  text-align: center;
}

.ranking__sub {
  font-size: var(--text-xs);
  color: var(--p-text-muted);
}
</style>
