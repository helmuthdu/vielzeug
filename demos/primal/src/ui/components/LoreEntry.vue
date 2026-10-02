<script lang="ts" setup>
/**
 * The journal excerpt: narrative copy as a game object rather than fine print. The band's
 * accordion header carries the account's source and its opening line beside the cover art,
 * and a quiet listen cue that becomes the gold bars while the entry is being read; the
 * expanded body re-reads the entry at a journal's measure: a drop cap, the closing
 * reflection set apart, the sentence being spoken gilded: with the speech player above the
 * prose. The player follows the table's chosen pace, resumes after interruptions and
 * collapse, and starts from the beginning after Stop. Narration pauses the music, and the
 * band carries no audio past its own collapse.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { asset } from '../../app/assets';
import { notify } from '../../app/events';
import { t } from '../../app/i18n';
import {
  clearNarrationPosition,
  loadNarrationPosition,
  narrationRate,
  releaseNarration,
  saveNarrationPosition,
  setNarrationPaused,
  setNarrationRate,
  startNarration,
} from '../../app/narration';
import { loreExcerpt, paceLore } from '../../content/lore';
import { pauseMusic } from '../composables/use-youtube-audio';
import '@vielzeug/refine/accordion';
import '@vielzeug/refine/accordion-item';
import '@vielzeug/refine/speech-player';
import { type SpeechPlayerElement, speechSentences } from '@vielzeug/refine/speech-player';
import '@vielzeug/refine/text';

const props = withDefaults(
  defineProps<{
    /** The entry's cover art, when the moment has one: a side band fading into the panel. */
    art?: string;
    /** CSS `object-position` for the cover art's crops. */
    artPosition?: string;
    /** The band header's hook: the entry's opening line, unless the moment carries its own
     *  authored standfirst (the ascent chapters' summaries). */
    excerpt?: string;
    /** The full journal text. */
    lore: string;
    /** The account's source: the series or challenge the entry belongs to. */
    overline: string;
  }>(),
  { artPosition: 'center' },
);

const excerpt = computed(() => props.excerpt ?? loreExcerpt(props.lore));
const dropCapArt = asset('/backgrounds/bg_lore_drop_cap.svg');

// The reading stream and the displayed body share one sentence list and one order, so
// the spoken sentence and the gilded sentence can never drift apart.
const sentences = computed(() => speechSentences(props.lore));
const paced = computed(() => paceLore(sentences.value));
const paragraphs = computed(() => {
  let index = 0;
  return paced.value.paragraphs.map((group) => group.map((text) => ({ index: index++, text })));
});
const closingIndex = computed(() => (paced.value.closing ? sentences.value.length - 1 : null));

const expanded = ref(false);
const reading = ref(false);
const paused = ref(false);
const currentSentence = ref<number | null>(null);
// Saved position for interruptions and collapsed entries; explicit Stop clears it.
const resumeAt = ref<number | undefined>(loadNarrationPosition(props.lore));
const speechRate = computed(() => narrationRate.value);

const speechPlayer = ref<SpeechPlayerElement | null>(null);
const root = ref<HTMLElement | null>(null);
let preservePositionOnStop = false;
/** `t()` reads the locale ref, so the labels re-render the moment the language flips. */
const speechLabels = computed(() => ({
  error: t('journal.speechInterrupted'),
  finished: t('journal.speechFinished'),
  pause: t('journal.pauseReading'),
  paused: t('journal.speechPaused'),
  read: t('journal.readAloud'),
  resume: t('journal.resumeReading'),
  resumed: t('journal.speechResumed'),
  speed: t('journal.speed'),
  speedFast: t('journal.speedFast'),
  speedNormal: t('journal.speedNormal'),
  speedSlow: t('journal.speedSlow'),
  started: t('journal.speechStarted'),
  stop: t('journal.stopReading'),
  stopped: t('journal.speechStopped'),
  unsupported: t('journal.speechUnavailable'),
}));

const stop = (preservePosition = false): void => {
  const player = speechPlayer.value;
  const state = player?.getAttribute('state');
  if (!player || (state !== 'playing' && state !== 'paused')) return;
  preservePositionOnStop = preservePosition;
  player.stop();
};

/** The reader claims the app's voice: the music pauses: nothing speaks over the chronicler. */
function onPlay(): void {
  pauseMusic();
  startNarration({ paused: false, source: props.overline, stop });
}

function onProgress(event: Event): void {
  const { sentence } = (event as CustomEvent<{ sentence: number }>).detail;
  currentSentence.value = sentence;
  resumeAt.value = sentence;
  saveNarrationPosition(props.lore, sentence);
}

/** The player Stop control clears the saved sentence so the next play starts over. */
function onStop(): void {
  currentSentence.value = null;
  if (!preservePositionOnStop) {
    clearNarrationPosition(props.lore);
    resumeAt.value = undefined;
  }
  preservePositionOnStop = false;
  releaseNarration();
}

function onEnd(): void {
  currentSentence.value = null;
  preservePositionOnStop = false;
  clearNarrationPosition(props.lore);
  resumeAt.value = undefined;
  releaseNarration();
}

function onError(): void {
  currentSentence.value = null;
  preservePositionOnStop = false;
  releaseNarration();
  notify('toasts.speechFailed', 'warning');
}

function onRateChange(event: Event): void {
  setNarrationRate((event as CustomEvent<{ rate: number }>).detail.rate);
}

function onExpand(): void {
  expanded.value = true;
  if (!props.art || !props.lore.trim() || !window.matchMedia('(width < 640px)').matches) return;
  requestAnimationFrame(() => {
    const player = speechPlayer.value;
    if (!player) return;
    const bounds = player.getBoundingClientRect();
    if (bounds.top >= 0 && bounds.bottom <= window.innerHeight) return;
    player.scrollIntoView({
      behavior: document.documentElement.dataset.reducedMotion === 'true' ? 'auto' : 'smooth',
      block: 'center',
    });
  });
}

/** Collapsing the band hides the player's controls: no audio may outlive its own controls. */
function onCollapse() {
  expanded.value = false;
  stop(true);
}

// The player's state carries reading and pause to the header cue and the foot chip; the
// observer is the one source for both, whatever moved the player.
let stateObserver: MutationObserver | null = null;

onMounted(() => {
  const player = speechPlayer.value;
  if (!player) return;
  const sync = (): void => {
    const state = player.getAttribute('state');
    reading.value = state === 'playing' || state === 'paused';
    paused.value = state === 'paused';
    setNarrationPaused(stop, paused.value);
  };
  stateObserver = new MutationObserver(sync);
  stateObserver.observe(player, { attributeFilter: ['state'] });
  sync();
});

onBeforeUnmount(() => {
  stateObserver?.disconnect();
  if (reading.value) releaseNarration();
});

// The reading follows the voice: the spoken sentence glides into view only once it has
// left it, so a reader scrolling along is never yanked. The app's reduced-motion choice
// rides along for the glide.
watch(currentSentence, (sentence) => {
  if (sentence === null) return;
  const spoken = root.value?.querySelector<HTMLElement>(`[data-sentence="${sentence}"]`);
  if (!spoken) return;
  const bounds = spoken.getBoundingClientRect();
  if (bounds.top >= 0 && bounds.bottom <= window.innerHeight) return;
  spoken.scrollIntoView({
    behavior: document.documentElement.dataset.reducedMotion === 'true' ? 'auto' : 'smooth',
    block: 'center',
  });
});
</script>

<template>
  <div class="lore-entry" ref="root" :class="{ 'lore-entry--expanded': expanded }">
    <div aria-hidden="true" class="lore-entry__art" v-if="art" :style="{ '--art-position': artPosition }">
      <img alt="" class="lore-entry__art-img" :src="asset(art)" />
    </div>
    <ore-accordion class="lore-entry__accordion" size="sm" variant="text">
      <ore-accordion-item @collapse="onCollapse" @expand="onExpand">
        <ore-text size="xs" slot="title" variant="overline">{{ overline }}</ore-text>
        <span class="lore-entry__excerpt" slot="subtitle">{{ excerpt }}</span>
        <!-- The narration cue: quiet while the band sleeps, the gold bars while it reads. -->
        <span aria-hidden="true" class="lore-entry__listen" slot="suffix">
          <ore-icon class="lore-entry__listen-icon" name="headphones" size="16" v-if="!reading" />
          <span class="lore-entry__eq" v-else :class="{ 'lore-entry__eq--paused': paused }" >
            <span /><span /><span />
          </span>
        </span>
        <div class="lore-entry__reading">
          <!-- The lore is transcribed English prose (game content stays English even under the
               German UI), so the reader speaks it with an English voice regardless of locale.
               The band is only a reader when there is something to read. -->
          <ore-speech-player
            class="lore-entry__speech"
            lang="en"
            v-if="lore.trim()"
            ref="speechPlayer"
            :labels="speechLabels"
            :rate="speechRate"
            :resume-at="resumeAt"
            :text="lore"
            @end="onEnd"
            @error="onError"
            @play="onPlay"
            @progress="onProgress"
            @rate-change="onRateChange"
            @stop="onStop"
          />
          <div class="lore-entry__body">
            <p v-for="(paragraph, group) in paragraphs" :key="group">
              <template v-for="sentence in paragraph" :key="sentence.index">
                <span
                  class="lore-entry__drop-cap lore-entry__sentence"
                  v-if="expanded && group === 0 && sentence.index === 0"
                  :class="{ 'lore-entry__sentence--spoken': sentence.index === currentSentence }"
                >
                  <svg
                    aria-hidden="true"
                    class="lore-entry__drop-cap-art"
                    viewBox="0 0 256 328">
                    <use fill="currentColor" :href="`${dropCapArt}#rect3`" />
                    <use fill="currentColor" :href="`${dropCapArt}#path1-8`" />
                  </svg>
                  <span class="lore-entry__drop-cap-letter">{{ sentence.text.slice(0, 1) }}</span>
                </span>
                <span
                  class="lore-entry__sentence"
                  :class="{ 'lore-entry__sentence--spoken': sentence.index === currentSentence }"
                  :data-sentence="sentence.index"
                >{{ `${expanded && group === 0 && sentence.index === 0 ? sentence.text.slice(1) : sentence.text} ` }}</span>
              </template>
            </p>
          </div>
          <p class="lore-entry__closing" v-if="closingIndex !== null">
            <span
              class="lore-entry__sentence lore-entry__sentence--closing"
              :class="{ 'lore-entry__sentence--spoken': closingIndex === currentSentence }"
              :data-sentence="closingIndex"> {{ paced.closing }} </span>
          </p>
        </div>
      </ore-accordion-item>
    </ore-accordion>
  </div>
</template>

<style scoped>
.lore-entry {
  display: flex;
  overflow: hidden;
  border-radius: inherit;
}

/* The cover art rides the band's start edge, fading into the panel toward the prose.
   The strip is cover-cropped to its column, and nothing here measures or mutates
   layout from script: the accordion's row animation is the band's only motion. */
.lore-entry__art {
  position: relative;
  flex: none;
  width: 7rem;
  overflow: hidden;
  background: var(--p-panel-sunken);
}

.lore-entry__art-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: var(--art-position, center);
}

.lore-entry__art::after {
  position: absolute;
  inset: 0;
  content: '';
  background: linear-gradient(
    90deg,
    transparent 55%,
    color-mix(in oklch, var(--p-panel) 55%, transparent) 78%,
    var(--p-panel) 100%
  );
}

/* Expanded, the strip opens into the plate: the painting beside the prose, cover-
   cropped to a fixed share of the band. The width snaps with the toggle and never
   animates: a second animated layout property beside the accordion's rows is the
   jank this pattern exists to avoid, and a fitted aspect would couple the column's
   width back to the prose's height mid-motion. */
@media (width >= 640px) {
  .lore-entry--expanded .lore-entry__art {
    width: min(40%, 22rem);
  }

  .lore-entry--expanded .lore-entry__art::after {
    background: linear-gradient(
      90deg,
      transparent 82%,
      color-mix(in oklch, var(--p-panel) 70%, transparent) 94%,
      var(--p-panel) 100%
    );
  }
}

.lore-entry__accordion {
  flex: 1;
  min-width: 0;
}

/* The band's header is the hook, not fine print: the excerpt reads as prose. Note the
   accordion's crossed var names: `--accordion-item-details-padding` styles the summary
   (the collapsed header) and `--accordion-item-summary-padding` the expanded content.
   The journal also opens on the app's motion, snappy and unstaggered: the row runs its
   duration alone, the fade starts with it, and the close collapses while fading instead of
   waiting out the accordion's default stagger. */
.lore-entry__accordion ore-accordion-item {
  --accordion-item-collapse-delay: 0ms;
  --accordion-item-details-padding: var(--size-3) var(--size-5);
  --accordion-item-expand-easing: var(--p-ease);
  --accordion-item-fade-delay: 0ms;
  --accordion-item-fade-duration: 120ms;
  --accordion-item-row-duration: 150ms;
  --accordion-item-subtitle-color: var(--p-text);
  --accordion-item-summary-padding: var(--size-2) var(--size-5) var(--size-4);
  --ease-spring: var(--p-ease);
}

.lore-entry__accordion ore-accordion-item::part(summary) {
  min-height: var(--size-20);
}

.lore-entry__accordion ore-accordion-item::part(header) {
  row-gap: var(--size-1);
}

/* The narration cue in the header's suffix: a hint, never a control. */
.lore-entry__listen {
  display: inline-flex;
  align-items: center;
  color: var(--p-text-muted);
}

.lore-entry__listen-icon {
  display: flex;
}

/* Now reading: the header wears the gold bars: the sound's source at a glance, the same
   grammar the music player's now-playing wears. They hold still while paused. */
.lore-entry__eq {
  display: inline-flex;
  gap: 2px;
  align-items: flex-end;
  height: 12px;
  color: var(--p-gold);
}

.lore-entry__eq span {
  width: 2px;
  height: 100%;
  background: currentcolor;
  border-radius: var(--rounded-full);
  transform-origin: bottom center;
  animation: lore-entry-eq 1s ease-in-out infinite;
}

.lore-entry__eq span:nth-child(2) {
  animation-delay: 0.25s;
}

.lore-entry__eq span:nth-child(3) {
  animation-delay: 0.5s;
}

.lore-entry__eq--paused span {
  transform: scaleY(0.3);
  animation: none;
}

/* The journal's measure: reading size in a column the eye can track. */
.lore-entry__body {
  max-width: 60ch;
  font-size: var(--text-base);
  color: var(--p-text);
}

/* The sentence the chronicler speaks: a soft gild that travels with the voice. */
.lore-entry__sentence {
  border-radius: var(--rounded-sm);
  transition: background-color var(--p-motion) var(--p-ease);
}

.lore-entry__sentence--spoken {
  background: color-mix(in oklch, var(--p-gold) 15%, transparent);
}

/* The reader rides the reading's head: the chronicler's voice lifted off the prose as a
   pill in the gold wash that marks everything the narration touches: the spoken sentence's
   gild, the header's gold bars, the active reading color. Its hover tone stays on the
   panel's sunken register, a step below the wash; the pill itself declares no elevation :
   one surface, borderless. */
.lore-entry__speech {
  --speech-player-hover-bg: var(--p-panel-sunken);
  --speech-player-active-color: var(--p-gold);
  padding: var(--size-1) var(--size-2);

  margin-block-end: var(--size-3);
  background: var(--p-gold-faint);
  border-radius: var(--rounded-full);
}

.lore-entry__body p + p {
  margin: var(--size-3) 0 0;
}

/* The ornamental frame holds the first character while the paragraph flows around it. */
.lore-entry__drop-cap {
  position: relative;
  float: left;
  display: grid;
  place-items: center;
  width: var(--size-32);
  aspect-ratio: 256 / 328;
  margin-block-end: var(--size-1);
  margin-inline-end: var(--size-2);
  font-family: var(--p-heading);
  font-size: var(--size-16);
  line-height: 1;
  color: var(--p-text-strong);
}

.lore-entry__drop-cap-art {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  color: var(--p-text-strong);
}

.lore-entry__drop-cap-letter {
  position: relative;
}

/* The closing reflection: display type, the entry's last word. */
.lore-entry__closing {
  max-width: 60ch;
  margin: var(--size-4) 0 0;
  font-family: var(--p-heading);
  font-size: var(--text-lg);
  color: var(--p-text-strong);
}

.lore-entry__closing .lore-entry__sentence--closing {
  font: inherit;
}

@media (width < 640px) {
  /* The art yields its side column for a top band, giving the prose the phone's width :
     as deep as the desktop side strip is wide, so the cover reads on the small screen. */
  .lore-entry {
    flex-direction: column;
  }

  .lore-entry__art {
    width: 100%;
    height: 7rem;
  }

  .lore-entry__art::after {
    background: linear-gradient(
      180deg,
      transparent 55%,
      color-mix(in oklch, var(--p-panel) 55%, transparent) 78%,
      var(--p-panel) 100%
    );
  }

  /* Expanded, the band opens into the plate: the painting above the prose, the phone's
     twin of the desktop side plate. The height snaps with the toggle like the desktop
     width does: no second animated layout property beside the accordion's rows. */
  .lore-entry--expanded .lore-entry__art {
    height: 14rem;
  }

  .lore-entry--expanded .lore-entry__art::after {
    background: linear-gradient(
      180deg,
      transparent 82%,
      color-mix(in oklch, var(--p-panel) 70%, transparent) 94%,
      var(--p-panel) 100%
    );
  }
}

/* The bars are the reading's state, not decoration: they hold still under reduced motion
   while the reading itself stays legible through the gilded sentence. */
@media (prefers-reduced-motion: reduce) {
  .lore-entry__eq span {
    transform: scaleY(0.3);
    animation: none;
  }
}

html[data-reduced-motion='true'] .lore-entry__eq span {
  transform: scaleY(0.3);
  animation: none;
}

@keyframes lore-entry-eq {
  0%,
  100% {
    transform: scaleY(0.3);
  }

  50% {
    transform: scaleY(1);
  }
}
</style>
