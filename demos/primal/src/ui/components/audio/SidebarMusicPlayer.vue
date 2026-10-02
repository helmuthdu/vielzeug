<script lang="ts" setup>
import { computed, ref } from 'vue';
import type { MusicTrack } from '../../../app/music';
import { useYouTubeAudio } from '../../composables/use-youtube-audio';

/**
 * The sidebar's compact music player: the audio bar's feature set in a mini widget:
 * seek (click and keyboard, chapter highlight), track list, repeat, and mute, plus the
 * art button that expands to the full bar.
 */
const {
  playing,
  ready,
  coverArt,
  currentTime,
  duration,
  currentTrack,
  title,
  tracks,
  isPlaylist,
  playlistIndex,
  repeatStart,
  muted,
  toggleRepeat,
  toggleMute,
  previousTrack,
  togglePlay,
  nextTrack,
  showPlayer,
  playTrack,
  seekTo,
  formatTime,
} = useYouTubeAudio();

const progress = computed(() => (duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0));
const timeLabel = computed(() =>
  isPlaylist.value
    ? `${playlistIndex.value + 1} / ${tracks.value.length}`
    : `${formatTime(currentTime.value)} / ${formatTime(duration.value)}`,
);
const seekValueText = computed(() =>
  isPlaylist.value
    ? `Track ${playlistIndex.value + 1} of ${tracks.value.length}`
    : `${formatTime(currentTime.value)} of ${formatTime(duration.value)}`,
);

/** The chapter the playhead sits in: highlighted on the bar (Spotify chapters). */
const currentSegment = computed(() => {
  if (duration.value <= 0 || !tracks.value.length) return null;
  const current = tracks.value.filter((t) => t.start <= currentTime.value).at(-1);
  if (!current) return null;
  const next = tracks.value[tracks.value.indexOf(current) + 1];
  const end = next?.start ?? duration.value;
  return {
    left: (current.start / duration.value) * 100,
    width: ((end - current.start) / duration.value) * 100,
  };
});

// ── Track list popover ─────────────────────────────────────────────────────────

const trackListOpen = ref(false);

/** Picking a track seeks and closes the list. */
function selectTrack(track: MusicTrack): void {
  playTrack(track);
  trackListOpen.value = false;
}

/** Syncs the popover's user-driven open/close (trigger click, outside click). */
function onTrackListOpenChange(event: Event): void {
  trackListOpen.value = (event as CustomEvent<{ open: boolean }>).detail.open;
}

// ── Seek interaction ────────────────────────────────────────────────────────────

/** Seeks proportionally from a pointer position within the bar. */
function seekFromClientX(clientX: number, bar: HTMLElement): void {
  const rect = bar.getBoundingClientRect();
  const fraction = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  seekTo(fraction * duration.value);
}

/** Clicking the bar seeks proportionally through its own width. */
function onBarClick(event: MouseEvent): void {
  seekFromClientX(event.clientX, event.currentTarget as HTMLElement);
}

// ── Scrubbing: drag the playhead ────────────────────────────────────────────────

const scrubbing = ref(false);

function onSeekPointerDown(event: PointerEvent): void {
  scrubbing.value = true;
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  seekFromClientX(event.clientX, event.currentTarget as HTMLElement);
}

function onSeekPointerMove(event: PointerEvent): void {
  if (!scrubbing.value) return;
  seekFromClientX(event.clientX, event.currentTarget as HTMLElement);
}

function onSeekPointerUp(): void {
  scrubbing.value = false;
}
</script>

<template>
  <div class="mini-player">
    <div class="mini-player__row">
      <button aria-label="Open player" class="mini-player__art-btn" type="button" @click="showPlayer">
        <img alt="" class="mini-player__art" :src="coverArt" />
        <!-- Now-playing equalizer: three gold bars on the thumbnail, still while paused. -->
        <span aria-hidden="true" class="mini-player__eq" :class="{ 'mini-player__eq--paused': !playing }">
          <span /><span /><span />
        </span>
      </button>

      <div class="mini-player__meta">
        <ore-popover placement="top" trigger="click" :open="trackListOpen" @open-change="onTrackListOpenChange">
          <button aria-label="Select track" class="mini-player__track" type="button" :aria-expanded="trackListOpen">
            <span class="mini-player__track-label">{{ currentTrack }}</span>
            <ore-icon aria-hidden="true" class="mini-player__track-caret" name="chevron-up" size="14" />
          </button>
          <div class="mini-player__tracklist" slot="content">
            <div class="mini-player__tracklist-header">
              <span class="mini-player__tracklist-count">{{ tracks.length }} tracks</span>
              <button
                class="mini-player__tracklist-repeat"
                type="button"
                :aria-pressed="repeatStart !== null"
                :class="{ 'mini-player__tracklist-repeat--on': repeatStart !== null }"
                @click="toggleRepeat">
                <ore-icon size="14" :name="repeatStart !== null ? 'repeat-1' : 'repeat'" />
                <span>{{ repeatStart !== null ? 'Repeating' : 'Repeat track' }}</span>
              </button>
            </div>
            <button
              class="mini-player__tracklist-item"
              type="button"
              v-for="track in tracks"
              :key="track.start"
              :aria-current="track.title === currentTrack || undefined"
              :class="{ 'mini-player__tracklist-item--current': track.title === currentTrack }"
              @click.stop="selectTrack(track)">
              <span class="mini-player__tracklist-time">{{
                isPlaylist ? `#${track.start + 1}` : formatTime(track.start)
              }}</span>
              <span class="mini-player__tracklist-title">{{ track.title }}</span>
            </button>
          </div>
        </ore-popover>
        <span class="mini-player__context">{{ title }} · {{ timeLabel }}</span>
      </div>
    </div>

    <div
      aria-label="Seek"
      class="mini-player__seek"
      role="slider"
      tabindex="0"
      :aria-valuemax="Math.round(duration)"
      :aria-valuemin="0"
      :aria-valuenow="Math.round(currentTime)"
      :aria-valuetext="seekValueText"
      @click="onBarClick"
      @keydown.arrow-left.prevent="seekTo(Math.max(0, currentTime - 5))"
      @keydown.arrow-right.prevent="seekTo(Math.min(duration, currentTime + 5))"
      @keydown.home.prevent="seekTo(0)"
      @keydown.end.prevent="seekTo(duration)"
      @keydown.page-up.prevent="seekTo(Math.min(duration, currentTime + 30))"
      @keydown.page-down.prevent="seekTo(Math.max(0, currentTime - 30))"
      @pointercancel="onSeekPointerUp"
      @pointerdown="onSeekPointerDown"
      @pointermove="onSeekPointerMove"
      @pointerup="onSeekPointerUp">
      <div
        aria-hidden="true"
        class="mini-player__segment"
        v-if="currentSegment"
        :style="{ left: `${currentSegment.left}%`, width: `${currentSegment.width}%` }" />
      <div class="mini-player__fill" :style="{ transform: `scaleX(${progress / 100})` }" />
      <span aria-hidden="true" class="mini-player__thumb" :style="{ left: `${progress}%` }" />
    </div>

    <div class="mini-player__controls">
      <ore-button
        aria-label="Repeat track"
        class="mini-player__repeat"
        icon-only
        size="sm"
        variant="ghost"
        :aria-pressed="repeatStart !== null"
        :class="{ 'mini-player__repeat--on': repeatStart !== null }"
        :disabled="!ready"
        @click="toggleRepeat">
        <ore-icon name="repeat-1" size="16" />
      </ore-button>

      <ore-button
        aria-label="Previous track"
        icon-only
        size="sm"
        variant="ghost"
        :disabled="!ready || !tracks.length"
        @click="previousTrack">
        <ore-icon name="skip-back" size="16" />
      </ore-button>

      <!-- The one always-live control: on phones the topbar's audio trigger is gone
           (the navbar collapses its end slot at the breakpoint) and this drawer widget
           is the player's only face: tapping play from nothing sends PLAY into the
           machine, which builds the player (or opens the consent banner first) and
           plays the moment it is ready. The pulse marks the not-yet-built state. -->
      <button
        class="mini-player__play"
        type="button"
        :aria-label="playing ? 'Pause' : 'Play'"
        :class="{ 'mini-player__play--loading': !ready }"
        @click="togglePlay">
        <ore-icon size="18" :name="playing ? 'pause' : 'play'" />
      </button>

      <ore-button
        aria-label="Next track"
        icon-only
        size="sm"
        variant="ghost"
        :disabled="!ready || !tracks.length"
        @click="nextTrack">
        <ore-icon name="skip-forward" size="16" />
      </ore-button>

      <button class="mini-player__mute" type="button" :aria-label="muted ? 'Unmute' : 'Mute'" :disabled="!ready" @click="toggleMute">
        <ore-icon size="16" :name="muted ? 'volume-x' : 'volume-2'" />
      </button>
    </div>

    <!-- Screen-reader announcements: track changes and play state. -->
    <span aria-live="polite" class="mini-player__sr">{{ playing ? 'Playing' : 'Paused' }}: {{ currentTrack }}</span>
  </div>
</template>

<style scoped>
/* The widget: one soft card: art-anchored header, a seek hairline, one centered
   control row in the audio bar's arrangement (repeat · prev · play · next · mute). */
.mini-player {
  display: flex;
  flex-direction: column;
  gap: var(--size-2-5);
  padding: var(--size-2-5);
  background: var(--p-panel);
  border: var(--border) solid color-mix(in oklch, var(--p-line) 55%, transparent);
  border-radius: var(--rounded-lg);
}

.mini-player__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  white-space: nowrap;
  clip: rect(0 0 0 0);
}

/* ── Header row: art anchors, track and context stack beside it ────────────── */

.mini-player__row {
  display: flex;
  gap: var(--size-2-5);
  align-items: center;
}

.mini-player__art-btn {
  position: relative;
  display: block;
  flex-shrink: 0;
  padding: 0;
  cursor: pointer;
  background: none;
  border: 0;
}

.mini-player__art {
  display: block;
  width: 44px;
  height: 44px;
  object-fit: cover;
  border: var(--border) solid color-mix(in oklch, var(--p-line) 55%, transparent);
  border-radius: var(--rounded-sm);
}

.mini-player__art-btn:focus-visible {
  outline: var(--border-2) solid var(--p-gold);
  outline-offset: var(--size-1);
  border-radius: var(--rounded-sm);
}

.mini-player__meta {
  display: flex;
  flex-direction: column;
  gap: var(--size-0-5);
  min-width: 0;
}

/* The track name is the widget's title: plain bold text, not a boxed pill.
   Clicking it opens the track list; hover confirms the affordance in gold. */
.mini-player__track {
  display: flex;
  gap: var(--size-1-5);
  align-items: center;
  min-width: 0;
  padding: 0;
  font-family: inherit;
  cursor: pointer;
  background: none;
  border: 0;
}

.mini-player__track:focus-visible {
  outline: var(--border-2) solid var(--p-gold);
  outline-offset: var(--size-1);
  border-radius: var(--rounded-sm);
}

.mini-player__track-label {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--p-text);
  white-space: nowrap;
  transition: color var(--p-motion) var(--p-ease);
}

/* The chevron is the explicit "opens the track list" cue: the same grammar the
   audio bar's track pill uses. */
.mini-player__track-caret {
  flex-shrink: 0;
  color: var(--p-text-muted);
  transition: color var(--p-motion) var(--p-ease);
}

.mini-player__track:hover .mini-player__track-label,
.mini-player__track:hover .mini-player__track-caret,
.mini-player__track:focus-visible .mini-player__track-label,
.mini-player__track:focus-visible .mini-player__track-caret {
  color: var(--p-gold);
}

/* Now-playing equalizer: a small dark badge with three gold bars, pinned to the
   thumbnail's corner: the canonical now-playing placement. Still while paused. */
.mini-player__eq {
  position: absolute;
  inset-block-end: var(--size-1);
  inset-inline-end: var(--size-1);
  display: inline-flex;
  gap: 2px;
  align-items: flex-end;
  height: 12px;
  padding-inline: 3px;
  background: color-mix(in oklab, black 55%, transparent);
  border-radius: var(--rounded-full);
}

.mini-player__eq span {
  width: 2px;
  height: 100%;
  background: var(--p-gold);
  border-radius: var(--rounded-full);
  transform-origin: bottom center;
  animation: mini-player-eq 1s ease-in-out infinite;
}

.mini-player__eq span:nth-child(2) {
  animation-delay: 0.25s;
}

.mini-player__eq span:nth-child(3) {
  animation-delay: 0.5s;
}

.mini-player__eq--paused span {
  transform: scaleY(0.3);
  animation: none;
}

/* The context line carries everything secondary: video title and elapsed time. */
.mini-player__context {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--text-xs);
  color: var(--p-text-muted);
  white-space: nowrap;
}

/* ── Seek hairline ───────────────────────────────────────────────────────────── */

.mini-player__seek {
  position: relative;
  width: 100%;
  height: 6px;
  cursor: pointer;
  background: color-mix(in oklch, var(--p-panel-sunken) 70%, transparent);
  border-radius: var(--rounded-full);
  transition: transform 160ms var(--p-ease);
}

/* Generous hover/tap hit area above the bar. */
.mini-player__seek::before {
  position: absolute;
  top: -8px;
  right: 0;
  bottom: -4px;
  left: 0;
  content: '';
}

/* The bar thickens via scaleY: a transform, not a layout height. The thumb's own
   scale keeps it circular under the parent scale (10 × 1.4 = 14). */
.mini-player__seek:hover,
.mini-player__seek:focus-visible {
  transform: scaleY(1.4);
}

.mini-player__seek:focus-visible {
  outline: var(--border-2) solid var(--p-gold);
  outline-offset: var(--size-1);
}

/* Chapter highlight: gold tint on the current chapter's segment. */
.mini-player__segment {
  position: absolute;
  top: 0;
  bottom: 0;
  background: color-mix(in oklch, var(--p-gold) 14%, transparent);
  border-radius: inherit;
  opacity: 0;
  transition: opacity 160ms var(--p-ease);
}

.mini-player__seek:hover .mini-player__segment,
.mini-player__seek:focus-visible .mini-player__segment {
  opacity: 1;
}

.mini-player__fill {
  position: absolute;
  inset: 0 auto 0 0;
  background: linear-gradient(to right, color-mix(in oklch, var(--p-gold) 72%, transparent), var(--p-gold));
  border-radius: var(--rounded-full);
  transform-origin: left center;
  transition: transform 0.4s linear;
}

/* Playhead dot: always visible on the thin line: the seek affordance. Sizing on hover
   comes from the parent's scaleY plus this scaleX, keeping the dot circular. */
.mini-player__thumb {
  position: absolute;
  top: 50%;
  width: 10px;
  height: 10px;
  background: var(--color-secondary);
  border: 2px solid var(--p-panel);
  border-radius: 50%;
  box-shadow: 0 0 8px color-mix(in oklch, var(--color-secondary) 60%, transparent);
  transform: translate(-50%, -50%);
  transition:
    left 0.4s linear,
    transform 160ms var(--p-ease);
}

.mini-player__seek:hover .mini-player__thumb,
.mini-player__seek:focus-visible .mini-player__thumb {
  transform: translate(-50%, -50%) scaleX(1.4);
}

/* ── Controls: one centered row in the audio bar's arrangement ──────────────── */

.mini-player__controls {
  display: flex;
  gap: var(--size-2);
  align-items: center;
  justify-content: center;
}

/* Play button: the audio bar's prominent circular accent. */
.mini-player__play {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  padding: 0;
  font-family: inherit;
  color: white;
  cursor: pointer;
  background: var(--color-secondary);
  border: none;
  border-radius: 50%;
  box-shadow:
    0 2px 12px color-mix(in oklch, var(--color-secondary) 30%, transparent),
    inset 0 0 0 1px color-mix(in oklch, var(--color-primary) 75%, black 25%);
  transition:
    transform 0.12s ease,
    background-color 0.2s ease;
}

.mini-player__play:hover:not(:disabled) {
  background: color-mix(in oklch, var(--color-secondary) 90%, white 10%);
}

.mini-player__play:active:not(:disabled) {
  transform: scale(0.92);
}

.mini-player__play:focus-visible {
  outline: var(--border-2) solid var(--p-gold);
  outline-offset: 2px;
}

.mini-player__play--loading {
  animation: mini-player-pulse 1.5s ease-in-out infinite;
}

.mini-player__repeat--on {
  --button-color: var(--p-gold);
  --button-hover-bg: color-mix(in oklch, var(--p-gold) 10%, transparent);
}

.mini-player__mute {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: var(--size-8);
  height: var(--size-8);
  padding: 0;
  font-family: inherit;
  color: var(--p-text-muted);
  cursor: pointer;
  background: none;
  border: none;
  border-radius: var(--rounded-sm);
  transition:
    color 0.15s ease,
    background-color 0.15s ease;
}

.mini-player__mute:hover:not(:disabled) {
  color: var(--p-text);
  background: color-mix(in oklch, var(--p-panel-sunken) 80%, transparent);
}

.mini-player__mute:focus-visible {
  outline: var(--border-2) solid var(--p-gold);
  outline-offset: 1px;
}

.mini-player__mute:disabled {
  cursor: default;
  opacity: 0.5;
}

/* ── Track list popover ────────────────────────────────────────────────────── */

.mini-player__tracklist {
  display: flex;
  flex-direction: column;
  gap: var(--size-1-5);
  width: min(16rem, calc(100vw - var(--size-8)));
  max-height: 18rem;
  padding: var(--size-1);
  overflow-y: auto;
}

.mini-player__tracklist-header {
  display: flex;
  gap: var(--size-2);
  align-items: center;
  justify-content: space-between;
  padding: var(--size-1) var(--size-2);
  border-bottom: var(--border) solid var(--p-line);
}

.mini-player__tracklist-count {
  font-size: var(--text-xs);
  font-variant-numeric: tabular-nums;
  color: var(--p-text-muted);
}

.mini-player__tracklist-repeat {
  display: flex;
  gap: var(--size-1-5);
  align-items: center;
  padding: var(--size-1) var(--size-2);
  font-family: inherit;
  font-size: var(--text-xs);
  color: var(--p-text-muted);
  cursor: pointer;
  background: none;
  border: 0;
  border-radius: var(--rounded-sm);
  transition: color var(--p-motion) var(--p-ease);
}

.mini-player__tracklist-repeat--on {
  color: var(--p-gold);
}

.mini-player__tracklist-item {
  display: flex;
  gap: var(--size-2);
  align-items: baseline;
  width: 100%;
  padding: var(--size-1) var(--size-2);
  font-family: inherit;
  text-align: start;
  cursor: pointer;
  background: none;
  border: 0;
  border-radius: var(--rounded-sm);
  transition: background-color var(--p-motion) var(--p-ease);
}

.mini-player__tracklist-item:hover {
  background: color-mix(in oklch, var(--p-gold) 8%, transparent);
}

.mini-player__tracklist-item--current {
  color: var(--p-gold);
  background: color-mix(in oklch, var(--p-gold) 10%, transparent);
}

.mini-player__tracklist-time {
  flex-shrink: 0;
  font-size: var(--text-xs);
  font-variant-numeric: tabular-nums;
  color: var(--p-text-muted);
}

.mini-player__tracklist-item--current .mini-player__tracklist-time {
  color: var(--p-gold);
}

.mini-player__tracklist-title {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--text-sm);
  white-space: nowrap;
}

/* ── Keyframes ───────────────────────────────────────────────────────────────── */

@keyframes mini-player-pulse {
  0%,
  100% {
    opacity: 0.45;
  }

  50% {
    opacity: 1;
  }
}

@keyframes mini-player-eq {
  0%,
  100% {
    transform: scaleY(0.3);
  }

  50% {
    transform: scaleY(1);
  }
}

/* The equalizer is decoration: it holds still under reduced motion (the paused
   bars), while the player's state stays legible through the play button. */
@media (prefers-reduced-motion: reduce) {
  .mini-player__eq span {
    transform: scaleY(0.3);
    animation: none;
  }
}

html[data-reduced-motion='true'] .mini-player__eq span {
  transform: scaleY(0.3);
  animation: none;
}
</style>
