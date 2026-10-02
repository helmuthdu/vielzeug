<script lang="ts" setup>
/**
 * The app's one voice made visible: while a journal entry reads, its foot chip holds the
 * media slot the audio bar owns otherwise: the entry's source, the gold bars that hold
 * still while paused, and a stop that never scrolls out of reach. The bar conceals while
 * the chip shows (narration paused the music), and the chip leaves with the voice.
 */
import { t } from '../../app/i18n';
import { narration, stopNarration } from '../../app/narration';
import { useReadable } from '../../app/vue-bridge';
import '@vielzeug/refine/icon';

const active = useReadable(narration);
</script>

<template>
  <Transition name="narration-chip">
    <div class="narration-chip" v-if="active">
      <span aria-hidden="true" class="narration-chip__eq" :class="{ 'narration-chip__eq--paused': active.paused }" >
        <span /><span /><span />
      </span>
      <span class="narration-chip__source">{{ active.source }}</span>
      <button class="narration-chip__stop" type="button" :aria-label="t('journal.stopReading')" @click="stopNarration()">
        <ore-icon name="square" size="14" />
      </button>
    </div>
  </Transition>
</template>

<style scoped>
/* The media slot's reading presence: the audio bar's foot, borrowed while the chronicler
   speaks. Phones lift it clear of the sidebar's bottom nav. */
.narration-chip {
  position: fixed;
  inset-inline: 0;
  bottom: var(--phase-dock-media-bottom, var(--size-4));
  z-index: 89;
  display: flex;
  gap: var(--size-2);
  align-items: center;
  justify-content: center;
  width: fit-content;
  padding: var(--size-1-5) var(--size-2-5);
  margin-inline: auto;
  background: var(--p-panel);
  border: var(--border) solid var(--p-line);
  border-radius: var(--rounded-full);
  box-shadow: var(--shadow-md);
}

/* The gold bars: the reading's pulse, still while paused. */
.narration-chip__eq {
  display: inline-flex;
  gap: 2px;
  align-items: flex-end;
  height: 12px;
  color: var(--p-gold);
}

.narration-chip__eq span {
  width: 2px;
  height: 100%;
  background: currentcolor;
  border-radius: var(--rounded-full);
  transform-origin: bottom center;
  animation: narration-chip-eq 1s ease-in-out infinite;
}

.narration-chip__eq span:nth-child(2) {
  animation-delay: 0.25s;
}

.narration-chip__eq span:nth-child(3) {
  animation-delay: 0.5s;
}

.narration-chip__eq--paused span {
  transform: scaleY(0.3);
  animation: none;
}

.narration-chip__source {
  max-width: 24ch;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--p-text);
  white-space: nowrap;
}

.narration-chip__stop {
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
  border-radius: var(--rounded-full);
  transition: color 0.15s ease, background-color 0.15s ease;
}

.narration-chip__stop:hover {
  color: var(--p-text);
  background: var(--p-panel-sunken);
}

.narration-chip__stop:focus-visible {
  outline: var(--border-2) solid var(--p-gold);
  outline-offset: 1px;
}

@media (width < 640px) {
  .narration-chip {
    bottom: var(--phase-dock-media-bottom, calc(var(--sidebar-bottom-nav-height, 3.75rem) + var(--size-2)));
  }
}

@media (prefers-reduced-motion: reduce) {
  .narration-chip__eq span {
    transform: scaleY(0.3);
    animation: none;
  }
}

html[data-reduced-motion='true'] .narration-chip__eq span {
  transform: scaleY(0.3);
  animation: none;
}

/* Enter and leave above the phase dock instead of crossing it. */
.narration-chip-enter-active,
.narration-chip-leave-active {
  transition:
    transform var(--p-motion) var(--p-ease),
    opacity var(--p-motion) var(--p-ease);
}

.narration-chip-enter-from,
.narration-chip-leave-to {
  opacity: 0;
  transform: translateY(calc(0px - var(--size-3)));
}

@keyframes narration-chip-eq {
  0%,
  100% {
    transform: scaleY(0.3);
  }

  50% {
    transform: scaleY(1);
  }
}
</style>
