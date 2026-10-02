<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from 'vue';

const dock = ref<HTMLElement | null>(null);
const stuck = ref(false);
let geometryObserver: ResizeObserver | null = null;

function syncMediaOffset(): void {
  const visibleDocks = [...document.querySelectorAll<HTMLElement>('.phase-dock')]
    .map((phaseDock) => ({ bounds: phaseDock.getBoundingClientRect(), phaseDock }))
    .filter(({ bounds, phaseDock }) =>
      phaseDock.getClientRects().length > 0 &&
      getComputedStyle(phaseDock).visibility !== 'hidden' &&
      bounds.bottom > 0 &&
      bounds.top < window.innerHeight,
    )
    .sort((a, b) => a.bounds.top - b.bounds.top);
  const phaseDock = visibleDocks[0];
  const rootStyle = document.documentElement.style;

  if (phaseDock) {
    // On phones the clock floats above the bar: the media chip must clear it too, so the
    // offset anchors to whichever top is higher, floating clock or bar itself.
    const floatingClock = phaseDock.phaseDock.querySelector<HTMLElement>('.phase-dock__center');
    const clockTop = floatingClock?.getClientRects().length
      ? floatingClock.getBoundingClientRect().top
      : Number.POSITIVE_INFINITY;
    const top = Math.min(phaseDock.bounds.top, clockTop);
    const offset = `calc(${window.innerHeight - top}px + var(--size-2))`;
    if (rootStyle.getPropertyValue('--phase-dock-media-bottom') !== offset) {
      rootStyle.setProperty('--phase-dock-media-bottom', offset);
    }
  } else {
    rootStyle.removeProperty('--phase-dock-media-bottom');
  }
}

function syncDock(): void {
  if (dock.value?.parentElement) {
    stuck.value = dock.value.parentElement.getBoundingClientRect().bottom > window.innerHeight;
  }
  syncMediaOffset();
}

onMounted(() => {
  window.addEventListener('scroll', syncDock, { passive: true });
  window.addEventListener('resize', syncDock);
  geometryObserver = new ResizeObserver(syncDock);
  if (dock.value) geometryObserver.observe(dock.value);
  if (dock.value?.parentElement) geometryObserver.observe(dock.value.parentElement);
  syncDock();
});

onUnmounted(() => {
  window.removeEventListener('scroll', syncDock);
  window.removeEventListener('resize', syncDock);
  geometryObserver?.disconnect();
  syncMediaOffset();
});

/**
 * The phase's action bar: the navbar's bottom twin. It pins flush at the viewport's foot while
 * its phase scrolls above it and releases at the section's end, so the phase's primary action
 * never scrolls out of reach. The bar carries actions only: no free text, state lives in the
 * surfaces above. The one non-action is the hunt clock, which may claim the bar's center place:
 * dead-center from the desktop width up, the bar's leading zone on every tablet tier, and a
 * centered row of its own on the phone: a place that leaves no gap when unclaimed.
 * On phones the actions read as one tool row, the iOS toolbar grammar: the flanking zones
 * (the back arrow circle when the phase has one, the commit action: the primary's verb glyph
 * circle, or the hunt's outcome circles: at the row's end) stretch equally so the tools sit
 * dead-center on the row's true middle. Every tool surface wears the row's pill shape, and
 * crowded docks carry theirs as the actions menu: a labeled pill that opens the phase's
 * actions upward over the dock as a grid of equal action cards, one pick runs one action.
 * While pinned the bar is a full-width toolbar flush to the viewport's foot; on phones
 * the released bar floats as a pill, detached from the viewport's edges with its own
 * border. The quest boards carry no bar: they commit straight from the selected card.
 * Sits inside a `.phase-flow` block: a sticky bar could never leave a grid track.
 */
</script>

<template>
  <div class="phase-dock" ref="dock" :class="{ 'phase-dock--stuck': stuck }">
    <div class="phase-dock__start">
      <slot name="back" />
    </div>
    <!-- The center place: the bar's clock position: dead-center on wide bars, the
         bar's leading zone on tablet tiers, a row of its own on phones. Unclaimed or
         empty, the place leaves no gap and the bar keeps its two-zone layout. -->
    <div class="phase-dock__center" v-if="$slots.center">
      <slot name="center" />
    </div>
    <div class="phase-dock__actions">
      <div class="phase-dock__back-mobile" v-if="$slots.back">
        <slot name="back" />
      </div>
      <slot />
    </div>
  </div>
</template>

<style scoped>
/* The bar mirrors the navbar at the viewport's foot: full width, flush, a hairline while pinned,
   the same canvas wash and blur. The wash and blur ride a ::before pseudo-element, not the
   host: backdrop-filter on the host would create a containing block for the dock's
   fixed-position descendants, trapping the actions menu's panel inside the dock and
   breaking its own backdrop-filter (the menu's frost could only sample the dock's
   interior, never the content behind it). */
.phase-dock {
  position: sticky;
  bottom: 0;
  z-index: var(--z-sticky, 1);
  box-sizing: border-box;
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-3);
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: var(--size-2) 0 max(var(--size-2), env(safe-area-inset-bottom));
  border-top: var(--border) solid transparent;
}

.phase-dock::before {
  position: absolute;
  inset: 0;
  z-index: -1;
  content: '';
  background: color-mix(in oklch, var(--p-canvas) 92%, transparent);
  backdrop-filter: blur(var(--blur-sm));
}

.phase-dock--stuck {
  border-top-color: var(--p-line);
}

.phase-dock__start {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-3);
  align-items: center;
  min-width: 0;
}

/* A start with no back action leaves no flex line at all: its empty box
   would otherwise still collect the dock's row gap. */
.phase-dock__start:empty {
  display: none;
}

/* The center place: the hunt clock's home. Below the desktop width (tablet portrait
   and landscape both) the clock leads the bar's left side with the actions trailing
   right: the base two-zone layout needs no help there. From the desktop width up the
   flanking zones balance around it: corner and actions each take an equal share of the
   row, so the clock sits dead-center whatever the flanks weigh; an empty start still
   flexes as the left flank's counterweight. A claimed center that renders empty falls
   back to the two-zone bar, leaving no gap behind. */
.phase-dock__center {
  flex: 0 0 auto;
  min-width: 0;
}

.phase-dock__center:empty {
  display: none;
}

@media (width >=1280px) {
  .phase-dock:has(.phase-dock__center:not(:empty)) .phase-dock__start {
    display: flex;
    flex: 1 1 0;
    min-width: 0;
  }

  .phase-dock:has(.phase-dock__center:not(:empty)) .phase-dock__actions {
    flex: 1 1 0;
    min-width: 0;
    margin-inline-start: 0;
  }
}

.phase-dock__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-2);
  align-items: center;
  justify-content: flex-end;
  margin-inline-start: auto;
}

/* A bar with no trailing actions: a finished hunt reduced to its boards :
   ends at the corner instead of collecting the row gap behind nothing. */
.phase-dock__actions:empty {
  display: none;
}

.phase-dock__back-mobile {
  display: none;
}

@media (width < 640px) {

  /* The phone tool row, the iOS toolbar grammar: the flanking zones stretch equally so the
     tools sit dead-center on the row's true middle whatever the flanks weigh (the desktop
     clock's grammar); the commit action: the primary's verb glyph, or the hunt's outcome
     pair: ends the row. The hunt clock floats above the bar as its own HUD chip. The
     sticky offset lifts the pinned bar above the viewport's foot so the pill floats. */
  .phase-dock {
    bottom: var(--size-2);
    flex-direction: column;
  }

  .phase-dock__start {
    display: none;
  }

  /* The phone clock floats above the bar as the fight's HUD: detached from the bar's
     canvas, hovering over the content a gap above the row. The zone passes pointers
     through to the content beneath; the chip carries its own. */
  .phase-dock__center {
    position: absolute;
    inset-inline: 0;
    bottom: calc(100% + var(--size-2));
    display: flex;
    justify-content: center;
    pointer-events: none;
  }

  .phase-dock__center> :deep(*) {
    pointer-events: auto;
  }

  .phase-dock__actions {
    flex: 0 0 auto;
    flex-wrap: nowrap;
    gap: var(--size-2);
    width: 100%;
    min-width: 0;
    margin-inline-start: 0;
  }

  .phase-dock__back-mobile {
    display: flex;
    flex: 1 1 0;
    justify-content: flex-start;
    min-width: 0;
  }

  /* The commit zone mirrors the back's stretch, so the tools center on the row's true middle
     whether the flank is a lone verb glyph or the outcome pair. A dock that carries nothing
     but the back keeps it on its left flank: the back wrapper never plays the commit zone. */
  .phase-dock__actions> :deep(:last-child:not(.phase-dock__back-mobile)) {
    flex: 1 1 0;
    justify-content: flex-end;
    min-width: 0;
  }

  /* A button as the commit zone would fill it: its inner box takes the whole flank, drawing
     a 127px pill around a 40px glyph. Release the inner box and the zone's end-alignment
     carries the natural circle. */
  .phase-dock__actions> :deep(:last-child:not(.phase-dock__back-mobile)::part(button)) {
    width: auto;
  }

  /* A row with no back keeps its leading flank as an empty spacer: the tools stay on the
     row's true middle either way. */
  .phase-dock__actions:not(:has(.phase-dock__back-mobile))::before {
    flex: 1 1 0;
    min-width: 0;
    content: '';
  }

  /* Stuck: the bar floats as a pill above the viewport's foot, inset from the edges
     like the iOS tab bar: detached from the walls while the phase scrolls beneath.
     When the content ends and the bar settles into the flow, it returns to the
     full-width bar. */
  .phase-dock--stuck {
    bottom: var(--size-2);
    width: auto;
    padding: var(--size-3);
    margin-inline: var(--size-3);
    border: var(--border) solid var(--p-line);
    border-radius: var(--rounded-full);
  }

  .phase-dock--stuck::before {
    border-radius: inherit;
  }

  /* Hunt phases carry their verdicts in the center slot (floating above as their own
     pill): the main pill hugs its content and centers, the fight console packed tight,
     instead of stretching edge to edge with flanking dead space. */
  .phase-dock--stuck:has(.phase-dock__center:not(:empty)) {
    width: fit-content;
    max-width: calc(100vw - var(--size-8));
    margin-inline: auto;
  }

  .phase-dock--stuck:has(.phase-dock__center:not(:empty)) .phase-dock__back-mobile {
    flex: 0 0 auto;
  }

  .phase-dock--stuck:has(.phase-dock__center:not(:empty)) .phase-dock__actions> :deep(:last-child) {
    flex: 0 0 auto;
  }

  .phase-dock--stuck:has(.phase-dock__center:not(:empty)) .phase-dock__actions:not(:has(.phase-dock__back-mobile))::before {
    display: none;
  }
}
</style>
