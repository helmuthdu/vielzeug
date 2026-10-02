<script lang="ts" setup>
import { createQuickLookGrid } from '@vielzeug/focus';
import { computed, ref, watch } from 'vue';
import { t } from '../../../app/i18n';
import { hunterCards, masteryCards } from '../../../content';
import { DECK_TYPES, type DeckContext, type DeckType, deckTypeOf, fitDeck, validateDeck } from '../../../domain/deck';
import type { HunterCard } from '../../../domain/types';
import HunterCardDetail from '../party/HunterCardDetail.vue';
import HunterCardTile from '../party/HunterCardTile.vue';
import DeckComposition from './DeckComposition.vue';
import ElementalAdvantageStrip from './ElementalAdvantageStrip.vue';
import '@vielzeug/refine/button';
import '@vielzeug/refine/chip';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/keyboard-key';
import '@vielzeug/refine/text';

/**
 * Drafts an action deck and the mastery card it plays against a context. Edits stay local until Save; the
 * draft follows the stored build whenever it changes underneath an untouched draft (session update, build
 * applied, weapon swap), and is always reset on a hunter or weapon change so a stale draft never survives a
 * new composition.
 */
const props = defineProps<{
  /** The page's phase dock carries the action row; the side panel keeps only the composition report. */
  actionsInDock?: boolean;
  /** Hint under the card list: what the pool is made of in this mode. */
  cardsHint: string;
  context: DeckContext;
  /** The build board carries staged equipment: the Save button commits it together with the deck. */
  staged?: boolean;
  locked?: boolean;
  /** The mastery the stored build plays. */
  storedMasteryId: string;
  stored: readonly string[];
}>();
const emit = defineEmits<{ dirty: [dirty: boolean]; save: [deckCardIds: string[], masteryCardId: string] }>();

const draftIds = ref<string[]>([...props.stored]);
const draftMasteryId = ref(props.storedMasteryId);
const sortedIds = (ids: readonly string[]) => [...ids].sort().join(',');

watch(
  () => [props.context.hunter.id, props.context.equipment.weaponId, props.stored, props.storedMasteryId] as const,
  ([hunterId, weaponId, stored, masteryId], previous) => {
    const untouched = previous === undefined || sortedIds(draftIds.value) === sortedIds(previous[2]);
    if (untouched || hunterId !== previous[0] || weaponId !== previous[1]) {
      draftIds.value = [...stored];
      draftMasteryId.value = masteryId;
    }
  },
);

const dirty = computed(
  () => sortedIds(draftIds.value) !== sortedIds(props.stored) || draftMasteryId.value !== props.storedMasteryId,
);
watch(dirty, (value) => emit('dirty', value), { immediate: true });

const report = computed(() => validateDeck(draftIds.value, props.context));
const selectedIds = computed(() => new Set(draftIds.value));

interface CardEntry {
  card: HunterCard;
  lockedLabel?: string;
}
const groups = computed(() => {
  const available = props.context.availableCardIds;
  const cards = hunterCards(props.context.hunter);
  return DECK_TYPES.map((type) => {
    const entries: CardEntry[] = cards
      .filter((card) => deckTypeOf(card) === type)
      .map((card) =>
        available.has(card.id)
          ? { card }
          : { card, lockedLabel: t('party.branchStep', { id: card.step[0], step: card.step.slice(1) }) },
      )
      .sort((a, b) => Number(!!a.lockedLabel) - Number(!!b.lockedLabel));
    return {
      entries,
      label: t(`deck.type.${type}`),
      required: report.value.required?.[type] ?? 0,
      selected: report.value.selected[type],
      type,
    };
  });
});

const masteryEntries = computed<CardEntry[]>(() =>
  masteryCards(props.context.hunter).map((card) =>
    props.context.availableMasteryIds.has(card.id)
      ? { card }
      : { card, lockedLabel: t('party.branchStep', { id: card.step[0], step: card.step.slice(1) }) },
  ),
);

/** A mastery is chosen like a radio: exactly one; an action card is in the deck draft or not. */
function isSelected(card: HunterCard): boolean {
  return card.kind === 'mastery' ? card.id === draftMasteryId.value : selectedIds.value.has(card.id);
}

function toggle(card: HunterCard): void {
  if (props.locked) return;
  if (card.kind === 'mastery') {
    if (props.context.availableMasteryIds.has(card.id)) draftMasteryId.value = card.id;
    return;
  }
  const isSelectedInDeck = selectedIds.value.has(card.id);
  if (!isSelectedInDeck && !props.context.availableCardIds.has(card.id)) return;
  draftIds.value = isSelectedInDeck ? draftIds.value.filter((id) => id !== card.id) : [...draftIds.value, card.id];
}

function autoFit(): void {
  if (!props.locked) draftIds.value = fitDeck(draftIds.value, props.context);
}

function save(): void {
  if (!props.locked && (dirty.value || props.staged) && report.value.valid) emit('save', [...draftIds.value], draftMasteryId.value);
}

/** Restores the stored draft: the row's reset. */
function resetDraft(): void {
  draftIds.value = [...props.stored];
}

/** The dock renders the action row; the draft's moves and state stay owned here. */
defineExpose({ autoFit, resetDraft, save, valid: computed(() => report.value.valid) });

const viewedCard = ref<HunterCard | null>(null);
/** Browse order in the dialog mirrors the grid: masteries first, then actions by type, available before locked. */
const browseCards = computed(() => [
  ...masteryEntries.value.map((entry) => entry.card),
  ...groups.value.flatMap((group) => group.entries.map((entry) => entry.card)),
]);
const viewedLock = computed(() =>
  [...masteryEntries.value, ...groups.value.flatMap((group) => group.entries)]
    .find((entry) => entry.card.id === viewedCard.value?.id)
    ?.lockedLabel,
);
const typeLabel = (type: DeckType) => t(`deck.type.${type}`);

/**
 * Keyboard drafting over the card grid: arrows and Home/End walk the tiles in browse order,
 * A/R add or remove the focused card, and Space zooms it open (Quick Look style). Enter keeps
 * toggling through the tile's own button. Captured so Space beats the button's toggle handler.
 * Tile order and browseCards are the same flat list, so one index serves both.
 */
const cardsSection = ref<HTMLElement | null>(null);
const tiles = (): HTMLElement[] => [...(cardsSection.value?.querySelectorAll<HTMLElement>('.editor__grid .tile') ?? [])];

/** Focus may sit on the tile's frame wrapper: resolve the tile it carries. */
const activeTileIndex = (): number => {
  const target = document.activeElement;
  if (!(target instanceof HTMLElement)) return -1;
  const tile =
    target.closest<HTMLElement>('.editor__grid .tile') ??
    target.closest<HTMLElement>('.tile-frame')?.querySelector<HTMLElement>('.tile') ??
    null;
  return tile ? tiles().indexOf(tile) : -1;
};

/** The grid's responsive column count, read from the rendered track list of the active tile's grid. */
const gridColumns = (): number => {
  const grid =
    document.activeElement instanceof HTMLElement ? document.activeElement.closest<HTMLElement>('.editor__grid') : null;
  const tracks = grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length : 0;
  return tracks || 1;
};

const quickLook = createQuickLookGrid({
  // Track-list columns, not the measured default: the groups' last rows are often partial,
  // and measuring row-mates there would under-step vertical moves.
  columns: gridColumns,
  getActiveIndex: activeTileIndex,
  getItems: tiles,
  loop: true,
  onInspect: (_item, index) => {
    const card = browseCards.value[index];
    if (card) viewedCard.value = card;
  },
});

function onCardsKeydown(event: KeyboardEvent): void {
  if (props.locked || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.key === 'a' || event.key === 'A' || event.key === 'r' || event.key === 'R') {
    const tile = activeTileIndex();
    const card = tile >= 0 ? browseCards.value[tile] : undefined;
    const want = event.key.toLowerCase() === 'a';
    // A mastery is a radio: it can only be picked, never dropped.
    if (card && (card.kind === 'mastery' ? !isSelected(card) && want : isSelected(card) !== want)) {
      event.preventDefault();
      toggle(card);
    }
    return;
  }
  // Arrows act only while focus sits on a tile: a key pressed elsewhere in the section must
  // not jump focus into the grid.
  if (activeTileIndex() >= 0) quickLook.handleKeydown(event);
}
</script>

<template>
  <div class="editor">
    <aside class="editor__side stack">
      <slot name="side-start" :deck-card-ids="draftIds" :mastery-card-id="draftMasteryId" />

      <ElementalAdvantageStrip v-if="!context.monster" :equipment="context.equipment" :hunt-pool="context.huntPool" />

      <section class="panel stack">
        <DeckComposition :conditional="!context.monster" :report="report" />
        <div class="cluster" v-if="!actionsInDock">
          <ore-button
            color="primary"
            variant="solid"
            :disabled="locked || (!dirty && !staged) || !report.valid"
            @click="save">
            <ore-icon name="save" slot="prefix" />
            {{ t('deck.save') }}
          </ore-button>
          <ore-button variant="bordered" :disabled="locked || report.valid" @click="autoFit">
            <ore-icon name="wand-2" slot="prefix" />
            {{ t('deck.autoFit') }}
          </ore-button>
          <ore-button variant="ghost" :disabled="!dirty" @click="resetDraft">{{ t('deck.reset') }}</ore-button>
        </div>
        <ore-text color="muted" size="sm" v-if="dirty && !report.valid">{{ t('deck.invalidHint') }}</ore-text>
      </section>

      <slot name="side-end" />
    </aside>

    <div class="editor__cards stack">
      <section aria-labelledby="deck-cards-title" class="stack" ref="cardsSection" @keydown.capture="onCardsKeydown">
        <div class="editor__keys">
          <ore-keyboard-shortcut aria-hidden="true">
            <ore-keyboard-key>↑</ore-keyboard-key>
            <ore-keyboard-key>↓</ore-keyboard-key>
            <ore-keyboard-key>←</ore-keyboard-key>
            <ore-keyboard-key>→</ore-keyboard-key>
          </ore-keyboard-shortcut>
          <ore-text color="muted" size="sm">{{ t('deck.keysMove') }}</ore-text>
          <ore-keyboard-shortcut aria-hidden="true">
            <ore-keyboard-key>A</ore-keyboard-key>
          </ore-keyboard-shortcut>
          <ore-text color="muted" size="sm">{{ t('deck.keysAdd') }} / {{ t('deck.keysSelect') }}</ore-text>
          <ore-keyboard-shortcut aria-hidden="true">
            <ore-keyboard-key>R</ore-keyboard-key>
          </ore-keyboard-shortcut>
          <ore-text color="muted" size="sm">{{ t('deck.keysRemove') }}</ore-text>
          <ore-keyboard-shortcut aria-hidden="true">
            <ore-keyboard-key>Space</ore-keyboard-key>
          </ore-keyboard-shortcut>
          <ore-text color="muted" size="sm">{{ t('deck.keysZoom') }}</ore-text>
        </div>
        <section aria-labelledby="deck-mastery-title" class="editor__group editor__group--major" >
          <div class="editor__section-head">
            <ore-text as="h2" id="deck-mastery-title" size="sm" variant="heading">{{ t('deck.masteryTitle') }}</ore-text>
            <ore-text color="muted" size="sm" variant="caption">{{ t('deck.masteryHint') }}</ore-text>
          </div>
          <div class="editor__grid">
            <HunterCardTile
              focused
              radio
              v-for="entry in masteryEntries"
              :key="entry.card.id"
              :card="entry.card"
              :locked-label="entry.lockedLabel"
              :selected="isSelected(entry.card)"
              @inspect="viewedCard = $event"
              @toggle="toggle" />
          </div>
        </section>
        <div class="editor__section-head">
          <ore-text as="h2" id="deck-cards-title" size="sm" variant="heading">{{ t('deck.cardsTitle') }}</ore-text>
          <ore-text color="muted" size="sm" variant="caption" >{{ cardsHint }}</ore-text>
        </div>
        <section class="editor__group" v-for="group in groups" :key="group.type" :aria-label="typeLabel(group.type)">
          <div class="editor__group-head">
            <ore-text as="h3" size="xs" variant="heading">{{ group.label }}</ore-text>
            <ore-chip size="sm" variant="flat" :color="group.selected === group.required ? 'success' : 'warning'">
              {{ group.selected }} / {{ group.required }}
            </ore-chip>
          </div>
          <div class="editor__grid">
            <HunterCardTile
              v-for="entry in group.entries"
              :key="entry.card.id"
              :card="entry.card"
              :locked-label="entry.lockedLabel"
              :selected="isSelected(entry.card)"
              @inspect="viewedCard = $event"
              @toggle="toggle" />
          </div>
        </section>
      </section>
    </div>
  </div>

  <HunterCardDetail
    :card="viewedCard"
    :cards="browseCards"
    :locked-label="viewedLock"
    :radio="viewedCard?.kind === 'mastery'"
    :selected="locked || !viewedCard ? undefined : isSelected(viewedCard)"
    :zoom="null"
    @close="viewedCard = null"
    @show="viewedCard = $event"
    @toggle="toggle" />
</template>

<style scoped>
.editor {
  display: grid;
  grid-template-columns: minmax(var(--size-80), 2fr) minmax(0, 3fr);
  gap: var(--size-6);
  align-items: start;
}

.editor__side {
  position: sticky;
  top: var(--size-20);
}

.panel,
.editor__side :deep(.panel) {
  padding: var(--size-4);
  background: var(--p-panel);
  border: var(--border) solid var(--p-line);
  border-radius: var(--rounded-sm);
}

.editor__group {
  display: grid;
  gap: var(--size-2);
}

/* The mastery grid is a top-level section, so its title keeps the stack gap the action titles use. */
.editor__group--major {
  gap: var(--size-5);
}

.editor__keys {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-2);
  align-items: center;
  padding-block-end: var(--size-2);
  color: var(--p-text-muted);
  border-block-end: var(--border) solid var(--p-line);
}

.editor__section-head {
  display: flex;
  flex-direction: column;
  gap: var(--size-1);
}

.editor__group-head {
  display: flex;
  gap: var(--size-2);
  align-items: center;
  padding-block-end: var(--size-1);
  border-block-end: var(--border) solid var(--p-line);
}

.editor__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--size-28), 1fr));
  gap: var(--size-2);
}

@media (max-width: 960px) {
  .editor {
    grid-template-columns: minmax(0, 1fr);
  }

  .editor__side {
    position: static;
  }

  /* The side column stacks equipment, advantages and composition to well over a screen tall, so the
     cards: the surface being drafted: come first. */
  .editor__cards {
    order: -1;
  }
}

/* Touch screens have no keyboard to show: tapping a tile and swiping the dialog cover the same moves. */
@media (max-width: 960px), (pointer: coarse) {
  .editor__keys {
    display: none;
  }
}
</style>
