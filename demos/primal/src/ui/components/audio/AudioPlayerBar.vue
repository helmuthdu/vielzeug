/** Track boundaries mapped onto the bar's width, with thin dividers marking each segment.
<script lang="ts" setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import type { MusicTrack } from '../../../app/music';
import { useYouTubeAudio } from '../../composables/use-youtube-audio';

/** Conceals the bar visually (the sidebar's mini player takes over) without stopping playback. */
const props = defineProps<{ concealed?: boolean }>();

const {
  open,
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
  hidePlayer,
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

/** The chapter under the playhead, highlighted on the bar (Spotify chapters). */
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

const trackNumber = computed(() => {
  const index = tracks.value.findIndex((t) => t.title === currentTrack.value);
  return index >= 0 ? `${index + 1} / ${tracks.value.length}` : '';
});

// ── Track list popover ─────────────────────────────────────────────────────────

const trackListOpen = ref(false);
const minimized = ref(false);

function minimize(): void {
  trackListOpen.value = false;
  minimized.value = true;
}

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

// ── Global media shortcut ───────────────────────────────────────────────────────

/**
 * Controls that consume Space: buttons activate, links follow, sliders step, and text fields type
 * a space. The guard walks the composed path instead of `event.target` because `ore-input` and the
 * other `ore-*` fields are custom elements with a shadow root, so the retargeted `event.target` is
 * the host, so a `closest()` check on it never reaches the inner `<input>` being typed into.
 */
const spaceOwners = 'input, textarea, select, button, a, [contenteditable], [role="slider"]';

function ownsSpace(event: KeyboardEvent): boolean {
  return event.composedPath().some((node) => node instanceof Element && node.closest(spaceOwners) !== null);
}

/** Space toggles playback while the bar is open, following the standard media-player key. */
function onGlobalKeydown(event: KeyboardEvent): void {
  if (event.key !== ' ') return;
  if (ownsSpace(event)) return;
  event.preventDefault();
  togglePlay();
}

watch(open, (isOpen) => {
  if (isOpen) document.addEventListener('keydown', onGlobalKeydown);
  else {
    document.removeEventListener('keydown', onGlobalKeydown);
    minimized.value = false;
  }
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onGlobalKeydown);
});
</script>

<template>
  <Transition name="audio-bar">
    <aside aria-label="Music player" class="audio-bar" v-if="open" :class="{ 'audio-bar--concealed': props.concealed, 'audio-bar--minimized': minimized }">
      <ore-button
        aria-label="Expand player"
        class="audio-bar__restore"
        icon-only
        size="sm"
        title="Expand player"
        variant="ghost"
        v-if="minimized"
        @click="minimized = false">
        <ore-icon name="headphones" size="16" />
      </ore-button>
      <div class="audio-bar__controls" v-else>
        <!-- Seek bar: visible at the top of the pill, above the controls. -->
        <div
          class="audio-bar__seek"
          role="slider"
          tabindex="0"
          :aria-label="'Seek'"
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
            class="audio-bar__segment"
            v-if="currentSegment"
            :style="{ left: `${currentSegment.left}%`, width: `${currentSegment.width}%` }" />
          <div class="audio-bar__fill" :style="{ width: `${progress}%` }" />
          <span
            class="audio-bar__divider"
            v-for="track in tracks.slice(tracks[0]?.start === 0 ? 1 : 0)"
            v-show="duration > 0"
            :key="track.start"
            :aria-hidden="true"
            :class="{ 'audio-bar__divider--dense': tracks.length > 12 }"
            :style="{ left: `${duration > 0 ? (track.start / duration) * 100 : 0}%` }"
            :title="track.title" />
          <span aria-hidden="true" class="audio-bar__thumb" :style="{ left: `${progress}%` }" />
        </div>

        <div class="audio-bar__center">
          <!-- Cover art: hover on pointer devices, tap on touch. -->
          <ore-popover placement="top" trigger="click">
            <button aria-label="Now playing details" class="audio-bar__art-btn" type="button">
              <img alt="" class="audio-bar__art" :src="coverArt" />
              <span aria-hidden="true" class="audio-bar__eq" :class="{ 'audio-bar__eq--paused': !playing }">
                <span /><span /><span />
              </span>
            </button>
            <div class="audio-bar__info" slot="content">
              <img alt="" class="audio-bar__info-art" :src="coverArt" />
              <div class="audio-bar__info-text">
                <span class="audio-bar__info-title">{{ title }}</span>
                <span class="audio-bar__info-track">
                  {{ currentTrack }}
                  <template v-if="trackNumber">· {{ trackNumber }}</template>
                </span>
                <span class="audio-bar__info-time">{{ timeLabel }}</span>
              </div>
            </div>
          </ore-popover>

          <ore-button
            aria-label="Previous track"
            icon-only
            size="sm"
            variant="ghost"
            :disabled="!ready || !tracks.length"
            @click="previousTrack">
            <ore-icon name="skip-back" size="16" />
          </ore-button>

          <!-- Always live like the mini player's play: the machine builds the player
               from the PLAY intent (or asks consent first) and plays on ready. -->
          <button
            class="audio-bar__play"
            type="button"
            :aria-label="playing ? 'Pause' : 'Play'"
            :class="{ 'audio-bar__play--loading': !ready }"
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

          <ore-button
            aria-label="Repeat track"
            class="audio-bar__repeat"
            icon-only
            size="sm"
            variant="ghost"
            :aria-pressed="repeatStart !== null"
            :class="{ 'audio-bar__repeat--on': repeatStart !== null }"
            :disabled="!ready"
            @click="toggleRepeat">
            <ore-icon name="repeat-1" size="16" />
          </ore-button>

          <!-- Current track name: pill-styled button that opens the track list. -->
          <ore-popover placement="top" trigger="click" :open="trackListOpen" @open-change="onTrackListOpenChange">
            <button aria-label="Select track" class="audio-bar__track" type="button" :aria-expanded="trackListOpen">
              <span class="audio-bar__track-label">{{ currentTrack }}</span>
              <span class="audio-bar__track-count" v-if="tracks.length > 1">{{ tracks.length }}</span>
              <ore-icon name="chevron-up" size="14" />
            </button>
            <div class="audio-bar__tracklist" slot="content">
              <!-- Header: track count + repeat toggle (the mobile access point). -->
              <div class="audio-bar__tracklist-header">
                <span class="audio-bar__tracklist-count">{{ tracks.length }} tracks</span>
                <button
                  class="audio-bar__tracklist-repeat"
                  type="button"
                  :aria-pressed="repeatStart !== null"
                  :class="{ 'audio-bar__tracklist-repeat--on': repeatStart !== null }"
                  @click="toggleRepeat">
                  <ore-icon size="14" :name="repeatStart !== null ? 'repeat-1' : 'repeat'" />
                  <span>{{ repeatStart !== null ? 'Repeating' : 'Repeat track' }}</span>
                </button>
              </div>
              <button
                class="audio-bar__tracklist-item"
                type="button"
                v-for="track in tracks"
                :key="track.start"
                :aria-current="track.title === currentTrack || undefined"
                :class="{ 'audio-bar__tracklist-item--current': track.title === currentTrack }"
                @click.stop="selectTrack(track)">
                <span class="audio-bar__tracklist-time">{{
                isPlaylist ? `#${track.start + 1}` : formatTime(track.start)
              }}</span>
                <span class="audio-bar__tracklist-title">{{ track.title }}</span>
              </button>
            </div>
          </ore-popover>

          <span class="audio-bar__time">{{ timeLabel }}</span>

          <button
            class="audio-bar__volume"
            type="button"
            :aria-label="muted ? 'Unmute' : 'Mute'"
            :disabled="!ready"
            @click="toggleMute">
            <ore-icon size="16" :name="muted ? 'volume-x' : 'volume-2'" />
          </button>

          <ore-button
            aria-label="Minimize player"
            class="audio-bar__minimize"
            icon-only
            size="sm"
            title="Minimize player"
            variant="ghost"
            @click="minimize">
            <ore-icon name="minimize" size="16" />
          </ore-button>

          <button aria-label="Close player" class="audio-bar__close" type="button" @click="hidePlayer">
            <ore-icon name="x" size="16" />
          </button>
        </div>
      </div>

      <!-- Screen-reader announcements: track changes and play state. -->
      <span aria-live="polite" class="audio-bar__sr">{{ playing ? 'Playing' : 'Paused' }}: {{ currentTrack }}</span>
    </aside>
  </Transition>
</template>

<style scoped>
.audio-bar {
  position: fixed;
  right: 0;
  bottom: var(--phase-dock-media-bottom, 0px);
  left: 0;
  z-index: 90;
  display: flex;
  justify-content: center;
  padding: 0 var(--size-4) var(--size-1);
  pointer-events: none;
}

.audio-bar--minimized {
  justify-content: flex-start;
}

.audio-bar__restore {
  --button-color: var(--p-text);
  --button-hover-bg: var(--p-panel-sunken);
  width: var(--size-11);
  height: var(--size-11);
  pointer-events: auto;
  background: color-mix(in oklch, var(--p-panel) 82%, transparent);
  border: var(--border) solid var(--p-line);
  border-radius: var(--rounded-full);
  box-shadow: var(--shadow-md);
  backdrop-filter: blur(var(--blur-lg));
}

.audio-bar__minimize {
  display: none;
}

@media (width >= 640px) {
  .audio-bar__minimize {
    display: inline-flex;
  }
}

.audio-bar__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  white-space: nowrap;
  clip: rect(0 0 0 0);
}

/* ── The pill: column layout. Controls row on top, seek bar below ──────────── */

.audio-bar__controls {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--size-1);
  max-width: calc(100vw - var(--size-8));
  padding: var(--size-1-5) var(--size-3) var(--size-2);
  margin-inline: auto;
  pointer-events: auto;
  background: color-mix(in oklch, var(--p-panel) 82%, transparent);
  border: var(--border) solid color-mix(in oklch, var(--p-line) 55%, transparent);
  border-radius: var(--rounded-xl);
  box-shadow:
    var(--shadow-lg),
    inset 0 1px 0 color-mix(in oklch, white 8%, transparent);
  backdrop-filter: blur(var(--blur-lg)) saturate(1.4);
}

.audio-bar__center {
  display: flex;
  gap: var(--size-2);
  align-items: center;
}

/* ── Cover art ──────────────────────────────────────────────────────────────── */

.audio-bar__art-btn {
  position: relative;
  display: block;
  flex-shrink: 0;
  padding: 0;
  cursor: pointer;
  background: none;
  border: 0;
}

.audio-bar__art {
  display: block;
  width: 32px;
  height: 32px;
  object-fit: cover;
  border: var(--border) solid color-mix(in oklch, var(--p-line) 60%, transparent);
  border-radius: var(--rounded-md);
}

.audio-bar__eq {
  position: absolute;
  inset-block-end: 2px;
  inset-inline-end: 2px;
  display: inline-flex;
  gap: 1px;
  align-items: flex-end;
  height: 10px;
  padding-inline: 2px;
  background: color-mix(in oklab, black 55%, transparent);
  border-radius: var(--rounded-full);
}

.audio-bar__eq span {
  width: 2px;
  height: 100%;
  background: var(--p-gold);
  border-radius: var(--rounded-full);
  transform-origin: bottom center;
  animation: audio-bar-eq 1s ease-in-out infinite;
}

.audio-bar__eq span:nth-child(2) {
  animation-delay: 0.25s;
}

.audio-bar__eq span:nth-child(3) {
  animation-delay: 0.5s;
}

.audio-bar__eq--paused span {
  transform: scaleY(0.3);
  animation: none;
}

@keyframes audio-bar-eq {
  0%,
  100% {
    transform: scaleY(0.3);
  }

  50% {
    transform: scaleY(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .audio-bar__eq span {
    transform: scaleY(0.3);
    animation: none;
  }
}

html[data-reduced-motion='true'] .audio-bar__eq span {
  transform: scaleY(0.3);
  animation: none;
}

.audio-bar__art-btn:focus-visible {
  outline: var(--border-2) solid var(--p-gold);
  outline-offset: var(--size-1);
  border-radius: var(--rounded-sm);
}

/* ── Cover-art popover content ──────────────────────────────────────────────── */

.audio-bar__info {
  display: flex;
  gap: var(--size-3);
  align-items: center;
  padding: var(--size-3);
}

.audio-bar__info-art {
  width: 64px;
  height: 64px;
  object-fit: cover;
  border: var(--border) solid var(--p-line);
  border-radius: var(--rounded-sm);
}

.audio-bar__info-text {
  display: flex;
  flex-direction: column;
  gap: var(--size-1);
}

.audio-bar__info-title {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--p-text);
  white-space: nowrap;
}

.audio-bar__info-track {
  font-size: var(--text-xs);
  color: var(--p-gold);
}

.audio-bar__info-time {
  font-size: var(--text-xs);
  font-variant-numeric: tabular-nums;
  color: var(--p-text-muted);
}

/* ── Play button: prominent circular accent ────────────────────────────────── */

.audio-bar__play {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  padding: 0;
  font-family: inherit;
  /* White icon on the primary color, the standard accent treatment. */
  color: white;
  cursor: pointer;
  background: var(--color-secondary);
  border: none;
  border-radius: 50%;
  /* The inset ring gives the circle definition against light panels;
     the outer glow lifts it from dark panels. */
  box-shadow:
    0 2px 12px color-mix(in oklch, var(--color-secondary) 30%, transparent),
    inset 0 0 0 1px color-mix(in oklch, var(--color-primary) 75%, black 25%);
  transition:
    transform 0.12s ease,
    background-color 0.2s ease;
}

.audio-bar__play:hover:not(:disabled) {
  background: color-mix(in oklch, var(--color-secondary) 90%, white 10%);
}

.audio-bar__play:active:not(:disabled) {
  transform: scale(0.92);
}

.audio-bar__play:focus-visible {
  outline: var(--border-2) solid var(--p-gold);
  outline-offset: 2px;
}

/* ── Volume and close buttons: quiet ghost-style actions ───────────────────── */

.audio-bar__volume,
.audio-bar__close {
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

.audio-bar__volume:hover:not(:disabled),
.audio-bar__close:hover {
  color: var(--p-text);
  background: color-mix(in oklch, var(--p-panel-sunken) 80%, transparent);
}

.audio-bar__volume:disabled {
  cursor: default;
  opacity: 0.4;
}

.audio-bar__volume:focus-visible,
.audio-bar__close:focus-visible {
  outline: var(--border-2) solid var(--p-gold);
  outline-offset: 1px;
}

/* ── Play button loading state ──────────────────────────────────────────────── */

.audio-bar__play--loading {
  animation: audio-bar-pulse 1.5s ease-in-out infinite;
}

@keyframes audio-bar-pulse {
  0%,
  100% {
    opacity: 0.45;
  }

  50% {
    opacity: 1;
  }
}

/* ── Repeat button active state ─────────────────────────────────────────────── */

.audio-bar__repeat--on {
  --button-color: var(--p-gold);
  --button-hover-bg: color-mix(in oklch, var(--p-gold) 10%, transparent);
}

/* ── Seek bar: visible, prominent, inside the pill below the controls ──────── */

.audio-bar__seek {
  position: relative;
  width: 100%;
  height: 6px;
  cursor: pointer;
  background: color-mix(in oklch, var(--p-panel-sunken) 70%, transparent);
  border-radius: var(--rounded-full);
  transition: height 160ms var(--p-ease);
}

/* Generous hover/tap hit area above the bar. */
.audio-bar__seek::before {
  position: absolute;
  top: -8px;
  right: 0;
  bottom: -4px;
  left: 0;
  content: '';
}

.audio-bar__seek:hover,
.audio-bar__seek:focus-visible {
  height: 10px;
}

.audio-bar__seek:focus-visible {
  outline: var(--border-2) solid var(--p-gold);
  outline-offset: var(--size-1);
}

/* Chapter highlight: gold tint on the current chapter's segment. */
.audio-bar__segment {
  position: absolute;
  top: 0;
  bottom: 0;
  background: color-mix(in oklch, var(--p-gold) 14%, transparent);
  border-radius: inherit;
  opacity: 0;
  transition: opacity 160ms var(--p-ease);
}

.audio-bar__seek:hover .audio-bar__segment,
.audio-bar__seek:focus-visible .audio-bar__segment {
  opacity: 1;
}

.audio-bar__fill {
  position: absolute;
  inset: 0 auto 0 0;
  background: linear-gradient(to right, color-mix(in oklch, var(--p-gold) 72%, transparent), var(--p-gold));
  border-radius: var(--rounded-full);
  transition: width 0.4s linear;
}

.audio-bar__divider {
  /* Pill colour, so each chapter reads as a break in both the track and the fill. */
  position: absolute;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--p-panel);
  transform: translateX(-1.5px);
}

.audio-bar__divider--dense {
  width: 2px;
  transform: translateX(-1px);
}

/* Playhead dot: always visible on the thin line, providing the seek affordance. */
.audio-bar__thumb {
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
    width 160ms var(--p-ease),
    height 160ms var(--p-ease),
    left 0.4s linear;
}

.audio-bar__seek:hover .audio-bar__thumb,
.audio-bar__seek:focus-visible .audio-bar__thumb {
  width: 14px;
  height: 14px;
}

/* ── Track name pill ────────────────────────────────────────────────────────── */

.audio-bar__track {
  display: flex;
  flex: 0 1 auto;
  gap: var(--size-1-5);
  align-items: center;
  justify-content: center;
  min-width: 0;
  max-width: 14rem;
  padding: var(--size-1) var(--size-2-5);
  font-family: inherit;
  cursor: pointer;
  background: var(--p-panel-sunken);
  border: var(--border) solid var(--p-line);
  border-radius: var(--rounded-full);
  transition: border-color var(--p-motion) var(--p-ease);
}

.audio-bar__track:hover,
.audio-bar__track:focus-visible {
  border-color: var(--p-gold);
}

.audio-bar__track:focus-visible {
  outline: var(--border-2) solid var(--p-gold);
  outline-offset: var(--size-1);
}

.audio-bar__track-label {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--p-text);
  white-space: nowrap;
}

/* ── Track count badge: small gold pill inside the track button ────────────── */

.audio-bar__track-count {
  flex-shrink: 0;
  padding: 0 var(--size-1-5);
  font-size: 10px;
  font-weight: var(--font-semibold);
  font-variant-numeric: tabular-nums;
  line-height: 1.4;
  color: var(--p-gold);
  background: color-mix(in oklch, var(--p-gold) 12%, transparent);
  border-radius: var(--rounded-full);
}

/* ── Track list popover ────────────────────────────────────────────────────── */

.audio-bar__tracklist {
  display: flex;
  flex-direction: column;
  gap: var(--size-1-5);
  min-width: 18rem;
  max-height: 20rem;
  padding: var(--size-1);
  overflow-y: auto;
}

.audio-bar__tracklist-header {
  display: flex;
  gap: var(--size-2);
  align-items: center;
  justify-content: space-between;
  padding: var(--size-1) var(--size-2);
  border-bottom: var(--border) solid var(--p-line);
}

.audio-bar__tracklist-count {
  font-size: var(--text-xs);
  font-variant-numeric: tabular-nums;
  color: var(--p-text-muted);
}

.audio-bar__tracklist-repeat {
  display: flex;
  gap: var(--size-1-5);
  align-items: center;
  padding: var(--size-1) var(--size-2);
  font-family: inherit;
  font-size: var(--text-xs);
  color: var(--p-text-muted);
  cursor: pointer;
  background: none;
  border: var(--border) solid var(--p-line);
  border-radius: var(--rounded-full);
}

.audio-bar__tracklist-repeat--on {
  color: var(--p-gold);
  border-color: var(--p-gold);
}

.audio-bar__tracklist-item {
  display: flex;
  gap: var(--size-2);
  align-items: baseline;
  padding: var(--size-1) var(--size-2);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  background: none;
  border: 0;
  border-radius: var(--rounded-sm);
}

.audio-bar__tracklist-item:hover,
.audio-bar__tracklist-item:focus-visible {
  background: var(--p-panel-sunken);
}

.audio-bar__tracklist-item:focus-visible {
  outline: var(--border-2) solid var(--p-gold);
  outline-offset: -2px;
}

.audio-bar__tracklist-item--current {
  background: color-mix(in oklch, var(--p-gold) 10%, transparent);
}

.audio-bar__tracklist-time {
  flex-shrink: 0;
  min-width: 3rem;
  font-size: var(--text-xs);
  font-variant-numeric: tabular-nums;
  color: var(--p-text-muted);
}

.audio-bar__tracklist-item--current .audio-bar__tracklist-time {
  color: var(--p-gold);
}

.audio-bar__tracklist-title {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--text-xs);
  color: var(--p-text);
  white-space: nowrap;
}

.audio-bar__tracklist-item--current .audio-bar__tracklist-title {
  font-weight: var(--font-semibold);
  color: var(--p-gold);
}

.audio-bar__time {
  flex-shrink: 0;
  font-size: var(--text-xs);
  font-variant-numeric: tabular-nums;
  color: var(--p-text-muted);
  white-space: nowrap;
}

/* ── Mobile ────────────────────────────────────────────────────────────────── */

/* Narrow desktop/tablet: time label collapses to current time only. */
@media (width < 800px) {
  .audio-bar__time {
    display: none;
  }
}

/* Mobile: the sidebar's bottom nav carries the mini-player widget, so the
   bar gives way entirely below the bottom-nav breakpoint. Declared after the
   base rule so source order wins without `!important`. */
@media (width < 640px) {
  .audio-bar {
    display: none;
  }
}

/* Coarse pointers: larger cover art, hover popovers suppressed (double-trigger fix). */
@media (pointer: coarse) {
  .audio-bar__art {
    width: calc(var(--size-10) - 2px);
    height: calc(var(--size-10) - 2px);
  }

  .audio-bar__art-btn {
    pointer-events: auto;
  }
}

/* Concealed while the sidebar's mini player is visible. */
.audio-bar--concealed {
  display: none;
}

/* Keep the player on the phase's media side while it enters and leaves. */
.audio-bar-enter-active,
.audio-bar-leave-active {
  transition:
    transform 200ms var(--p-ease),
    opacity 200ms var(--p-ease);
}

.audio-bar-enter-from,
.audio-bar-leave-to {
  opacity: 0;
  transform: translateY(-100%);
}
</style>
