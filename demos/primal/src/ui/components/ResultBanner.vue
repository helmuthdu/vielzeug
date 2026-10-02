<script lang="ts" setup>
import { asset } from '../../app/assets';
import { t } from '../../app/i18n';
import ResultHero from './ResultHero.vue';
import '@vielzeug/refine/text';

/**
 * The one result banner every run mode wears on its result screen: the same content
 * grammar whether the run just won a chapter, its hunt failed, or the whole run
 * finished. An overline names the run's outcome, the heading states it, one muted
 * stats row carries the run's key figures, and the trophies close the banner: every
 * monster the run defeated as a small circular portrait row on a victory, or the
 * hunted beast's single trophy — rendered in gold for a won hunt without a kill list,
 * washed grey for a defeat, a plain cross when the beast left no trophy behind. A final
 * score renders as its own standardized block: the label beside the big figure. The
 * long-form story never lives here: the journal bands under the banner tell it.
 */
defineProps<{
  /** The hunted beast's trophy icon; a grey cross stands in when it is absent. */
  emblemIcon?: string;
  final?: boolean;
  defeatImages?: readonly string[];
  defeated?: boolean;
  image?: string;
  overline: string;
  /** The run's final score, rendered as the standardized block: the label beside the big figure. */
  score?: number | null;
  title: string;
  /** The heading's DOM id, so the surrounding section can label itself. */
  titleId?: string;
  /** Every monster trophy the run collected; replaces the emblem with the circular portrait row. */
  trophyIcons?: readonly string[];
}>();
</script>

<template>
  <ResultHero :defeat-images="defeatImages" :defeated="defeated" :final="final" :image="image">
    <ore-text variant="overline">{{ overline }}</ore-text>
    <ore-text as="h2" size="lg" variant="heading" :id="titleId">{{ title }}</ore-text>
    <div class="result-banner__score" v-if="score !== null && score !== undefined">
      <ore-text color="muted" size="sm">{{ t('victory.finalScore') }}</ore-text>
      <ore-text size="lg" variant="heading">{{ score }}</ore-text>
    </div>
    <div class="result-banner__stats" v-if="$slots.stats"><slot name="stats" /></div>
    <div class="result-banner__lead" v-if="$slots.lead"><slot name="lead" /></div>
    <div aria-hidden="true" class="result-banner__trophies" v-if="trophyIcons?.length">
      <span class="result-banner__trophy" v-for="icon in trophyIcons" :key="icon">
        <img alt="" :src="asset(icon)" />
      </span>
    </div>
    <div aria-hidden="true" class="result-banner__emblem" v-else-if="defeated || emblemIcon">
      <span v-if="defeated && !emblemIcon">×</span>
      <img
        alt="" v-else-if="emblemIcon" :class="{ 'result-banner__emblem-art--defeat': defeated }" :src="asset(emblemIcon)"/>
    </div>
  </ResultHero>
</template>

<style scoped>
/* The run's key figures: one muted row, the same type scale and rhythm on every
   result screen. */
.result-banner__stats {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-1) var(--size-3);
  align-items: center;
  color: var(--p-text-muted);
}

/* The optional one-line lead under the figures: a defeat's short note, never the story. */
.result-banner__lead {
  max-width: 65ch;
  line-height: 1.7;
  color: var(--p-text-muted);
}

/* The standardized final score: the label beside the big figure, the one grammar every
   score-bearing run mode wears on its result banner. */
.result-banner__score {
  display: flex;
  gap: var(--size-3);
  align-items: center;
  color: var(--p-text-muted);
}

/* The run's trophies: one small circular portrait per defeated monster, gold-ringed on
   the sunken panel like the poster's row. A victory wears the row in the emblem's place;
   a defeat keeps the single greyed beast. */
.result-banner__trophies {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-2);
  margin-top: var(--size-2);
}

.result-banner__trophy {
  display: grid;
  place-items: center;
  width: 3rem;
  height: 3rem;
  overflow: hidden;
  background: var(--p-panel-sunken);
  border: var(--border) solid var(--p-gold);
  border-radius: 50%;
}

.result-banner__trophy img {
  width: 72%;
  height: 72%;
  object-fit: contain;
}

.result-banner__emblem {
  display: grid;
  place-items: center;
  width: 5.5rem;
  height: 5.5rem;
  margin-top: var(--size-2);
  overflow: hidden;
  font-family: var(--p-heading);
  font-size: 3rem;
  color: var(--p-blood);
  background: color-mix(in oklch, var(--p-panel) 88%, transparent);
  border: var(--border) solid var(--p-line);
  border-radius: 50%;
}

.result-banner__emblem img {
  width: 72%;
  height: 72%;
  object-fit: contain;
}

.result-banner__emblem-art--defeat {
  opacity: 0.72;
  filter: grayscale(1) contrast(0.85);
}

@media (width < 760px) {
  .result-banner__emblem {
    width: 5rem;
    height: 5rem;
  }
}
</style>
