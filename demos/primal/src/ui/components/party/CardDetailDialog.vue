<script lang="ts" setup>
import { createListNavigation, rescueFocus as rescueFocusTo } from '@vielzeug/focus';
import { computed, nextTick, ref, watch } from 'vue';
import { t } from '../../../app/i18n';
import '@vielzeug/refine/button';
import '@vielzeug/refine/dialog';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/text';
import '@vielzeug/refine/tooltip';

/** Anything the dialog can browse and show: hunter cards, equipment, potions. */
export interface DetailItem {
  id: string;
}

/**
 * The shared full-card dialog: the scan and body arrive through slots, everything around them :
 * browsing (footer buttons, arrow keys, touch swipes), the swipe transitions, focus rescue and
 * the art-only zoom: is one implementation every consumer benefits from. `card` selects the
 * shown item, `cards` the browsable set; the `scan` slot renders the visual column, the default
 * slot the facts, and the `action` slot the footer's commit control. Enter confirms that action.
 */
const props = defineProps<{
  /** The shown item; `null` with `zoom` set opens the art-only mode. */
  card: DetailItem | null;
  /** Ordered set the shown item belongs to; enables browsing. */
  cards?: readonly DetailItem[];
  /** Accessible name; falls back to the zoom name. */
  label?: string;
  /** Art-only zoom (slot scans, locked boards): used when `card` is null. */
  zoom?: { name: string; src: string } | null;
}>();
const emit = defineEmits<{
  close: [];
  /** Enter pressed: the consumer commits the action its action slot offers. */
  confirm: [];
  /** The add/remove hotkeys (A/R) pressed: the action slot's owner decides what they mean. */
  hotkey: [want: boolean];
  show: [card: DetailItem];
}>();

const index = computed(() =>
  props.card && props.cards ? props.cards.findIndex((entry) => entry.id === props.card?.id) : -1,
);
const neighbour = (offset: number): DetailItem | undefined =>
  index.value < 0 ? undefined : props.cards?.[index.value + offset];
function browse(offset: number): void {
  const next = neighbour(offset);
  if (next) {
    swipeDirection.value = offset > 0 ? 'next' : 'prev';
    emit('show', next);
  }
}
/**
 * Arrow browsing over the browsed set: horizontal and vertical arrows page through `cards`
 * (vertical too, so the page behind never scrolls while zoomed in) and Home/End jump to the
 * set's ends. The internal index is re-derived from the shown card before every keydown.
 */
const browseNavigation = createListNavigation<DetailItem>({
  getItems: () => props.cards ?? [],
  orientation: 'both',
});

function onKeydown(event: KeyboardEvent): void {
  if ((event.target as HTMLElement | null)?.closest('input, textarea, select')) return;
  if (event.key === ' ') {
    // Space closes: the counterpart of the grids' Space zoom-in. Handled in the capture phase
    // (see template) so the focused ore-button never sees it.
    event.preventDefault();
    event.stopPropagation();
    emit('close');
    return;
  }
  if (event.key === 'Enter' && props.card) {
    // Enter confirms the action the footer offers: the keys row promises it, and without this
    // the key falls through to whatever holds focus (a browse chevron pages to the next card).
    event.preventDefault();
    emit('confirm');
    return;
  }
  if (event.key === 'a' || event.key === 'A' || event.key === 'r' || event.key === 'R') {
    event.preventDefault();
    emit('hotkey', event.key.toLowerCase() === 'a');
    return;
  }
  browseNavigation.set(index.value);
  const result = browseNavigation.handleKeydown(event);
  if (result?.change) emit('show', result.change.item);
}

watch(
  () => props.card,
  (newCard) => {
    swipeOffset.value = 0;
    if (!newCard) {
      swipeDirection.value = null;
    }
  },
);

const browseGroup = ref<HTMLElement | null>(null);
/**
 * Browsing swaps the item, which can unmount or disable the focused element, and when the
 * browser removes a focused element, focus drops to `<body>`, where keydown never reaches the
 * dialog and every shortcut dies. The drop lands either when a browse button disables (same
 * tick) or when the leave transition removes the old item (later), so both the watcher and the
 * Transition's after-leave hook call this: the package's rescue hands focus to a footer browse
 * button, which survives every swap.
 */
function rescueFocus(): void {
  if (!open.value) return;
  const [previous, next] = browseGroup.value?.querySelectorAll<HTMLElement>('ore-button') ?? [];
  rescueFocusTo(index.value === 0 ? next : previous);
}
watch(
  () => props.card,
  () => {
    nextTick(rescueFocus);
  },
);
const open = computed(() => props.card != null || props.zoom != null);
const canBrowse = computed(() => props.cards !== undefined && index.value >= 0);

/**
 * Swipe left/right through the set while zoomed in: the touch counterpart of the arrow keys,
 * since a phone has no arrows and the browse buttons are small targets. Only touch/pen counts:
 * a mouse drag is a text selection, not a gesture. A swipe also swallows the click that follows
 * it, so brushing past an item never commits it.
 */
const swipeFrom = ref<{ x: number; y: number } | null>(null);
const swipeDirection = ref<'next' | 'prev' | null>(null);
const swipeOffset = ref(0);
const swiped = ref(false);
const swipeThreshold = 48;
const isTouch = (event: PointerEvent) => event.pointerType !== 'mouse';
const dialogEl = ref<HTMLElement | null>(null);

const isSwiping = computed(() => swipeFrom.value !== null && Math.abs(swipeOffset.value) > 0);
const dragStyle = computed(() => {
  if (!isSwiping.value) return undefined;
  const follow = Math.abs(swipeOffset.value) < 48 ? swipeOffset.value * 1.2 : swipeOffset.value;
  const capped = Math.max(-120, Math.min(120, follow));
  return {
    transform: `translate3d(${capped}px, 0, 0)`,
    transition: 'none',
  };
});

function lockDialogScroll(lock: boolean): void {
  const body = dialogEl.value?.shadowRoot?.querySelector<HTMLElement>('.body');
  if (!body) return;
  body.style.overflowY = lock ? 'hidden' : '';
  body.style.scrollbarWidth = lock ? 'none' : '';
  (body.style as CSSStyleDeclaration & { msOverflowStyle?: string }).msOverflowStyle = lock ? 'none' : '';
  const scrollbar = body.querySelector<HTMLElement>('.scrollbar');
  if (scrollbar) scrollbar.style.display = lock ? 'none' : '';
}

function onPointerDown(event: PointerEvent): void {
  swiped.value = false;
  swipeDirection.value = null;
  swipeOffset.value = 0;
  if (canBrowse.value && isTouch(event)) {
    event.preventDefault();
    swipeFrom.value = { x: event.clientX, y: event.clientY };
    lockDialogScroll(true);
    return;
  }
  swipeFrom.value = null;
  lockDialogScroll(false);
}
function onPointerMove(event: PointerEvent): void {
  const start = swipeFrom.value;
  if (!start || !isTouch(event)) return;
  const dx = event.clientX - start.x;
  const dy = event.clientY - start.y;
  if (Math.abs(dx) < Math.abs(dy) * 1.5) return;
  event.preventDefault();
  swipeOffset.value = dx;
  lockDialogScroll(true);
}
function onPointerCancel(): void {
  swipeFrom.value = null;
  swipeOffset.value = 0;
  lockDialogScroll(false);
}
function onPointerUp(event: PointerEvent): void {
  const start = swipeFrom.value;
  swipeFrom.value = null;
  if (!start || !isTouch(event)) {
    lockDialogScroll(false);
    return;
  }
  const dx = event.clientX - start.x;
  const dy = event.clientY - start.y;
  swipeOffset.value = 0;
  lockDialogScroll(false);
  // Horizontal must clearly dominate, so scrolling the body vertically never browses.
  if (Math.abs(dx) < swipeThreshold || Math.abs(dx) < Math.abs(dy) * 1.5) return;
  const next = neighbour(dx > 0 ? -1 : 1);
  if (!next) return;
  swipeDirection.value = dx > 0 ? 'prev' : 'next';
  swiped.value = true;
  emit('show', next);
}
function onSwipeClick(event: MouseEvent): void {
  if (!swiped.value) return;
  swiped.value = false;
  event.preventDefault();
  event.stopPropagation();
}
function onOpenChange(event: Event): void {
  if (!(event as CustomEvent<{ open: boolean }>).detail.open) {
    swipeDirection.value = null;
    emit('close');
  }
}
</script>

<template>
  <ore-dialog
    backdrop="blur"
    size="lg"
    ref="dialogEl"
    :class="{ 'is-swiping': isSwiping }"
    :label="label ?? zoom?.name ?? t('party.cardDetail')"
    :open="open"
    @click.capture="onSwipeClick"
    @keydown.capture="onKeydown"
    @open-change="onOpenChange"
    @pointercancel="onPointerCancel"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp">
    <div class="card-zoom" v-if="!card && zoom">
      <img class="card-zoom__image" decoding="async" :alt="t('party.cardAlt', { name: zoom.name })" :src="zoom.src" />
    </div>
    <div class="card-detail__stage" v-if="card">
      <Transition
        mode="out-in"
        :name="swipeDirection === 'prev' ? 'card-swipe-prev' : swipeDirection === 'next' ? 'card-swipe-next' : 'card-swipe'"
        @after-leave="rescueFocus">
        <div
          class="card-detail"
          :key="card.id"
          :class="{ 'card-detail--text-only': !$slots.scan }"
          :style="dragStyle">
          <div class="card-detail__visual" v-if="$slots.scan">
            <slot name="scan" />
          </div>
          <div class="card-detail__body">
            <slot />
          </div>
        </div>
      </Transition>
    </div>

    <div class="card-detail__footer" slot="footer">
      <div class="cluster card-detail__browse" v-if="card && index >= 0 && cards" ref="browseGroup">
        <ore-tooltip :content="t('party.cardPrevious')" :delay="400" >
          <ore-button
            icon-only
            size="sm"
            variant="ghost"
            :disabled="!neighbour(-1)"
            :label="t('party.cardPrevious')"
            @click="browse(-1)">
            <ore-icon name="chevron-left" />
          </ore-button>
        </ore-tooltip>
        <ore-text aria-live="polite" color="muted" size="sm">
          {{ t('party.cardPosition', { count: cards.length, index: index + 1 }) }}
        </ore-text>
        <ore-tooltip :content="t('party.cardNext')" :delay="400" >
          <ore-button
            icon-only
            size="sm"
            variant="ghost"
            :disabled="!neighbour(1)"
            :label="t('party.cardNext')"
            @click="browse(1)">
            <ore-icon name="chevron-right" />
          </ore-button>
        </ore-tooltip>
      </div>
      <div class="cluster card-detail__actions">
        <ore-button
          size="sm"
          :label="t('common.close')"
          :variant="$slots.action ? 'ghost' : 'solid'"
          @click="emit('close')">
          <ore-icon class="card-detail__label--short" name="x" slot="prefix" />
          <span class="card-detail__label--long">{{ t('common.close') }}</span>
        </ore-button>
        <slot name="action" />
      </div>
    </div>
  </ore-dialog>
</template>

<style scoped>
:deep(ore-dialog.is-swiping .body) {
  overflow: hidden;
  scrollbar-width: none;
}

:deep(ore-dialog.is-swiping .body::-webkit-scrollbar) {
  display: none;
}

.card-detail__footer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  gap: var(--size-3);
  align-items: center;
  width: 100%;
}

.card-detail__browse {
  --cluster-gap: var(--size-2);
  grid-column: 2;
  align-items: center;
  justify-content: center;
}

.card-detail__actions {
  grid-column: 3;
  justify-content: flex-end;
}

.card-detail__label--short {
  display: none;
}

.card-zoom {
  display: grid;
  place-items: center;
  min-height: 60dvh;
  /* Vertical scrolling stays the browser's; the horizontal axis belongs to swipe browsing. */
  touch-action: pan-y;
  background: var(--p-panel-sunken);
}

.card-zoom__image {
  max-width: 100%;
  max-height: 75dvh;
  object-fit: contain;
}

.card-detail__stage {
  position: relative;
  max-width: 100%;
  min-height: 50dvh;
  overflow: hidden;
}

.card-detail {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  gap: var(--size-5);
  align-items: start;
  touch-action: pan-y;
  transform: translateZ(0);
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
}

.card-detail--text-only {
  grid-template-columns: minmax(0, 1fr);
  max-width: 40rem;
}

.card-detail__visual {
  display: grid;
  gap: var(--size-3);
  min-width: 0;
}

.card-detail__body {
  display: grid;
  gap: var(--size-3);
  min-width: 0;
}

.card-swipe-enter-active,
.card-swipe-next-enter-active,
.card-swipe-prev-enter-active {
  transition:
    opacity 200ms cubic-bezier(0.16, 1, 0.3, 1),
    transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
  will-change: opacity, transform;
}

.card-swipe-leave-active,
.card-swipe-next-leave-active,
.card-swipe-prev-leave-active {
  transition:
    opacity 120ms cubic-bezier(0.4, 0, 1, 1),
    transform 130ms cubic-bezier(0.4, 0, 1, 1);
  will-change: opacity, transform;
}

.card-swipe-enter-from,
.card-swipe-leave-to {
  opacity: 0;
  transform: translate3d(0, 0, 0) scale(0.97);
}

.card-swipe-next-leave-to {
  opacity: 0;
  transform: translate3d(-54px, 0, 0) scale(0.96);
}

.card-swipe-next-enter-from {
  opacity: 0;
  transform: translate3d(54px, 0, 0) scale(0.97);
}

.card-swipe-prev-leave-to {
  opacity: 0;
  transform: translate3d(54px, 0, 0) scale(0.96);
}

.card-swipe-prev-enter-from {
  opacity: 0;
  transform: translate3d(-54px, 0, 0) scale(0.97);
}

@media (width < 760px) {
  .card-detail {
    grid-template-columns: minmax(0, 1fr);
  }

  .card-detail__footer {
    grid-template-columns: auto minmax(0, 1fr);
    gap: var(--size-2);
  }

  .card-detail__browse {
    --cluster-gap: var(--size-2);
    grid-column: 1;
  }

  .card-detail__actions {
    --cluster-gap: var(--size-2);
    grid-column: 2;
  }

  .card-detail__label--long {
    display: none;
  }

  .card-detail__label--short {
    display: inline;
  }
}
</style>
