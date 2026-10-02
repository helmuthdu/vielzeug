<script lang="ts" setup>
import { createGridNavigation } from '@vielzeug/focus';
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { asset } from '../../../app/assets';
import { t } from '../../../app/i18n';
import type { Hunter } from '../../../domain/types';
import HunterIdentity from './HunterIdentity.vue';
import '@vielzeug/refine/card';
import '@vielzeug/refine/chip';

/**
 * Portrait cards for choosing the active hunter; arrow keys move the selection like a radio group.
 * The section docks under the navbar for as long as its party workspace stays on screen: past the
 * roster's natural place in the flow the cards collapse into a rail of weapon icon and hunter
 * name, so switching hunters while working the board below never scrolls back up. On phones the
 * full cards lay out two-up in flow and dock as a rail of weapon glyphs.
 */
/** `invalidLabel` renames the not-ready chip where readiness means more than the deck. */
const props = defineProps<{
  deckStatus?: Record<string, boolean>;
  hunters: Hunter[];
  invalidLabel?: string;
  selectedId: string;
}>();
const emit = defineEmits<{ select: [hunterId: string] }>();

const roster = ref<HTMLElement | null>(null);
const sentinel = ref<HTMLElement | null>(null);
const cards = (): HTMLElement[] => [...(roster.value?.querySelectorAll<HTMLElement>('ore-card') ?? [])];

/** True while the section is pinned below the navbar: the cards render as the compact rail. */
const docked = ref(false);
let observer: IntersectionObserver | null = null;

onMounted(() => {
  const anchor = sentinel.value;
  const section = roster.value;
  if (!anchor || !section) return;
  // The sentinel stays at the section's natural place in the flow while the sticky section
  // travels, so it leaves the viewport exactly when the dock engages. rootMargin lowers the
  // observer's viewport to the dock line, taken from the section's own sticky offset.
  const offset = Number.parseFloat(getComputedStyle(section).top);
  const margin = `${Number.isFinite(offset) ? -offset : 0}px 0px 0px 0px`;
  observer = new IntersectionObserver(
    ([entry]) => {
      docked.value = !entry.isIntersecting;
    },
    { rootMargin: margin },
  );
  observer.observe(anchor);
});

onBeforeUnmount(() => observer?.disconnect());

/** The roster row reflows 5 → 2 → 1 cards; the media queries mirror its CSS. Docked, every
    hunter sits in the rail's single row instead. */
const columns = (): number => {
  if (docked.value) return Math.max(props.hunters.length, 1);
  if (window.matchMedia('(width < 360px)').matches) return 1;
  if (window.matchMedia('(width < 760px)').matches) return 2;
  return 5;
};

const navigation = createGridNavigation<HTMLElement>({
  columns,
  getActiveIndex: () => cards().indexOf(document.activeElement as HTMLElement),
  getItems: cards,
  loop: true,
});

function navigate(event: KeyboardEvent): void {
  const result = navigation.handleKeydown(event);
  if (result?.change) {
    result.change.item.focus();
    const hunter = props.hunters[result.change.index];
    if (hunter) emit('select', hunter.id);
  }
}
</script>

<template>
  <!-- The sentinel marks the roster's natural place in the flow; the sticky section travels within
       the surrounding .party-workspace while this marker stays put. -->
  <div aria-hidden="true" class="hunter-roster__sentinel" ref="sentinel" />
  <section
    class="hunter-roster"
    ref="roster"
    :aria-label="t('party.chooseHunter')"
    :class="{ 'hunter-roster--docked': docked }"
    @keydown="navigate">
    <ore-card
      class="hunter-roster__card"
      interactive
      v-for="hunter in hunters"
      :key="hunter.id"
      :aria-label="hunter.name"
      :aria-pressed="hunter.id === selectedId"
      :class="{ 'hunter-roster__card--invalid': deckStatus && deckStatus[hunter.id] === false }"
      @activate="emit('select', hunter.id)">
      <img alt="" class="hunter-roster__art" slot="media" :src="asset(hunter.artwork)" />
      <div class="hunter-roster__status-cluster">
        <ore-chip class="hunter-roster__status" color="primary" size="sm" variant="solid" v-if="hunter.id === selectedId">
          {{ t('common.selected') }}
        </ore-chip>
        <ore-chip
          class="hunter-roster__deck-status"
          color="error"
          size="sm"
          variant="solid"
          v-if="deckStatus && deckStatus[hunter.id] === false">
          {{ props.invalidLabel ?? t('deck.statusInvalid') }}
        </ore-chip>
      </div>
      <HunterIdentity :compact="docked" :hunter="hunter" />
    </ore-card>
  </section>
</template>

<style scoped>
/* The section pins below the app navbar while the .party-workspace around it: this roster plus
   the board it selects for: is on screen; the sentinel above it anchors the dock's flip. */
.hunter-roster {
  position: sticky;
  /* The floating tray keeps its distance from the navbar above: pinned, not flush. */
  top: calc(var(--navbar-height, var(--size-14)) + var(--size-3));
  z-index: var(--z-sticky, 1);
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: center;
  /* The dock's chrome eases in with the collapse: transparent and borderless until pinned. */
  padding: 0;
  /* The board below is the roster's working context: the pair reads as one workspace. */
  margin-block-end: var(--size-8);
  background-color: transparent;
  border: 0 solid transparent;
  transition:
    padding var(--p-motion) var(--p-ease),
    gap var(--p-motion) var(--p-ease),
    background-color calc(var(--p-motion) * 1.5) var(--p-ease),
    border calc(var(--p-motion) * 1.5) var(--p-ease),
    border-radius calc(var(--p-motion) * 1.5) var(--p-ease);
}

.hunter-roster__card {
  --card-shadow: none;
  --card-padding: var(--size-3);
  position: relative;
  /* Five seats to a row: the Mount Havoc party, and smaller parties sit centered at the
     same card size instead of stretching across the empty seats. */
  flex: 1 1 0;
  min-width: 0;
  max-width: calc((100% - 4 * 0.75rem) / 5);
}

.hunter-roster__card[aria-pressed='true'] {
  --card-bg: light-dark(oklch(97% 0.008 92), oklch(21% 0.006 92));
  --card-border-color: var(--p-gold-dim);
}

.hunter-roster__art {
  box-sizing: border-box;
  width: 100%;
  height: 9rem;
  padding: 0.35rem 0.35rem 0;
  object-fit: contain;
  object-position: center bottom;
  background: linear-gradient(180deg, var(--p-panel-sunken), color-mix(in oklch, var(--p-panel) 75%, transparent));
  filter: saturate(0.82);
  transition:
    height calc(var(--p-motion) * 1.5) var(--p-ease),
    padding calc(var(--p-motion) * 1.5) var(--p-ease);
}

/* Docked, the artwork folds flat: the transition turns the collapse into the dock's one settle. */
.hunter-roster--docked .hunter-roster__art {
  height: 0;
  min-height: 0;
  padding-block: 0;
}

.hunter-roster__card[aria-pressed='true'] .hunter-roster__art {
  filter: none;
}

.hunter-roster__card--invalid {
  --card-border-color: color-mix(in oklch, var(--color-error) 55%, var(--p-line));
}

.hunter-roster__card--invalid[aria-pressed='true'] {
  --card-border-color: var(--color-error);
}

.hunter-roster__status-cluster {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  align-items: flex-end;
  pointer-events: none;
}

/* ── The docked rail ─────────────────────────────────────────────────────
   Same cards, one working line: the artwork and status chips fold away and each hunter
   shrinks to their weapon glyph and name (the identity line's compact treatment). The tray
   hugs its pills: a floating bar pinned under the navbar, not a full-width strip, and
   never wraps: it scrolls horizontally past three members. */
.hunter-roster--docked {
  display: flex;
  flex-wrap: nowrap;
  gap: var(--size-3);
  align-items: stretch;
  /* safe: an overflowing rail keeps its start reachable, a centered one keeps the symmetry. */
  justify-content: safe center;
  width: fit-content;
  max-width: 100%;
  padding: var(--size-2);
  margin-inline: auto;
  overflow-x: auto;
  scrollbar-width: none;
  background: color-mix(in oklch, var(--p-canvas) 92%, transparent);
  border: var(--border) solid var(--p-line);
  border-radius: var(--rounded-full);
  backdrop-filter: blur(var(--blur-sm));
}

.hunter-roster--docked .hunter-roster__card {
  --card-padding: var(--size-2) var(--size-3);
  --card-radius: var(--rounded-full);
  flex: 0 0 auto;
  /* The tray hugs its pills; the seat-cap percentages would resolve against its fit-content
     width and crush them: the rail sizes from content alone. */
  max-width: none;
}

.hunter-roster--docked .hunter-roster__status-cluster {
  display: none;
}

/* ── Phones ────────────────────────────────────────────────────────────────
   In flow the roster is the full portrait cards, two-up (one-up on the narrowest
   phones); docked it folds to its weapon glyphs: the slim tray that frames the
   phase together with the action bar at the foot. */
@media (width < 760px) {
  .hunter-roster:not(.hunter-roster--docked) .hunter-roster__card {
    flex-basis: calc((100% - 2 * 0.75rem) / 2);
    max-width: none;
  }

  .hunter-roster.hunter-roster--docked .hunter-roster__card {
    --card-padding: var(--size-1-5);
    --card-radius: var(--rounded-full);
  }

  .hunter-roster.hunter-roster--docked .hunter-roster__art {
    display: none;
  }
}

@media (width < 360px) {
  .hunter-roster:not(.hunter-roster--docked) .hunter-roster__card {
    flex-basis: 100%;
  }

  .hunter-roster:not(.hunter-roster--docked) .hunter-roster__art {
    height: 5rem;
  }
}
</style>
