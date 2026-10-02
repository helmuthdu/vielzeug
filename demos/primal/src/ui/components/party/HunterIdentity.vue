<script lang="ts" setup>
import { asset } from '../../../app/assets';
import { weaponClassById } from '../../../content/index';
import type { Hunter } from '../../../domain/types';
import '@vielzeug/refine/text';

/**
 * The hunter's identity line: the weapon-class glyph masked over the surrounding text
 * color, the class overline, and the hunter's name. Born as the roster card's block; every
 * surface that names a hunter: the party load rows, the new-build picker, the forge bench :
 * wears the same line.
 */
defineProps<{
  /** Whose identity this line carries. */
  hunter: Hunter;
  /** Player seated as this hunter, when assigned. */
  playerName?: string;
  /** The rail treatment: the class line folds away, the glyph shrinks, the name truncates :
   *  and below the two-up width the text folds entirely, the glyph alone. */
  compact?: boolean;
}>();
</script>

<template>
  <div class="hunter-identity" :class="{ 'hunter-identity--compact': compact }">
    <span
      aria-hidden="true"
      class="hunter-identity__glyph"
      :style="{ '--weapon-icon': `url(${asset(weaponClassById(hunter.classId).icon)})` }"
    ></span>
    <div class="hunter-identity__text">
      <ore-text class="hunter-identity__class" size="xs" variant="overline">{{ weaponClassById(hunter.classId).name }}</ore-text>
      <div class="hunter-identity__name-line">
        <ore-text class="hunter-identity__name" size="sm" variant="heading" :truncate="compact || Boolean(playerName)">
          {{ hunter.name }}
        </ore-text>
        <span class="hunter-identity__player" v-if="playerName">{{ playerName }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hunter-identity {
  display: flex;
  gap: var(--size-2);
  align-items: center;
  min-width: 0;
  /* The line reads from the start even inside buttons, whose UA stylesheet centers text. */
  text-align: start;
}

.hunter-identity__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.hunter-identity__name-line {
  display: flex;
  gap: var(--size-1-5);
  align-items: baseline;
  min-width: 0;
}

.hunter-identity__name {
  flex: 1 1 auto;
  min-width: 0;
}

.hunter-identity__player {
  flex: 0 1 auto;
  max-width: 42%;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--text-xs);
  color: var(--p-text-muted);
  white-space: nowrap;
}

/* The class line folds away in the rail: eased, not cut, so the name slides up in place. */
.hunter-identity__class {
  max-height: 1.5rem;
  overflow: hidden;
  transition:
    max-height calc(var(--p-motion) * 1.5) var(--p-ease),
    opacity var(--p-motion) var(--p-ease);
}

/* The weapon glyphs are printed black silhouettes; the mask repaints them in the surrounding
   text color so they read on light and dark alike (the card-text mono pattern). The glyph
   spans the class line and the name line together: as tall as both, square by its art. */
.hunter-identity__glyph {
  flex: none;
  width: var(--size-8);
  height: var(--size-8);
  background: var(--hunter-identity-glyph-color, currentcolor);
  mask: var(--weapon-icon) center / contain no-repeat;
  transition:
    width calc(var(--p-motion) * 1.5) var(--p-ease),
    height calc(var(--p-motion) * 1.5) var(--p-ease);
}

/* ── The rail treatment ────────────────────────────────────────────────────
   The roster's docked line: glyph and name only, the class folded away. */
.hunter-identity--compact .hunter-identity__class {
  max-width: 0;
  max-height: 0;
  opacity: 0;
}

.hunter-identity--compact .hunter-identity__glyph {
  width: var(--size-6);
  height: var(--size-6);
}

@media (width < 760px) {
  .hunter-identity--compact .hunter-identity__text {
    display: none;
  }
}
</style>
