<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { asset } from '../../../app/assets';
import { t, tp } from '../../../app/i18n';
import { hunterById, weaponClassById } from '../../../content';
import type { HunterCard } from '../../../domain/types';
import CardText from '../CardText.vue';
import CardDetailDialog from './CardDetailDialog.vue';
import '@vielzeug/refine/badge';
import '@vielzeug/refine/button';
import '@vielzeug/refine/button-group';
import '@vielzeug/refine/chip';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/text';

/**
 * The hunter-card body inside the shared detail dialog: scan (flippable for masteries), printed
 * facts and text, and the deck toggle: the same contract the dialog had before the split.
 */
const props = defineProps<{
  card: HunterCard | null;
  /** Ordered set the shown card belongs to; enables browsing. */
  cards?: readonly HunterCard[];
  /** Why the card cannot be toggled (campaign branch step), shown instead of the toggle. */
  lockedLabel?: string;
  /** The toggle picks one of many (mastery) rather than adding/removing from a set (deck). */
  radio?: boolean;
  /** Whether the shown card is in the deck draft; undefined hides the toggle. */
  selected?: boolean;
  /** Hides the deck toggle when inspecting a card outside an editing flow. */
  readOnly?: boolean;
  /** Art-only zoom: used when `card` is null. */
  zoom?: { name: string; src: string } | null;
}>();
const emit = defineEmits<{ close: []; show: [card: HunterCard]; toggle: [card: HunterCard] }>();

// Transcriptions mark hard line breaks as a trailing backslash before the newline.
const cardTextLines = (text: string | null) =>
  text
    ? text
        .split(/\\?\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
    : [];

/** "[weapon]" prints the owner's weapon class: every hero card id embeds its hunter. */
const weaponIcon = computed(() => {
  const id = props.card?.id ?? '';
  const hunter = id.startsWith('hero-') ? hunterById(id.split('-')[1] ?? '') : undefined;
  return hunter ? weaponClassById(hunter.classId).icon : undefined;
});

type MasteryFace = 'focused' | 'unfocused';
const MASTERY_FACES: readonly MasteryFace[] = ['unfocused', 'focused'];
/** Mastery cards are double-sided; the dialog shows one face at a time and lets the player flip it. */
const shownFace = ref<MasteryFace>('unfocused');
watch(
  () => props.card,
  () => {
    shownFace.value = 'unfocused';
  },
);

/** Preload the neighbouring scans so browsing never shows a blank frame. */
watch(
  () => [props.card, props.cards] as const,
  ([currentCard]) => {
    if (!currentCard || !props.cards) return;
    const position = props.cards.findIndex((entry) => entry.id === currentCard.id);
    if (position < 0) return;
    for (const neighbor of [props.cards[position - 1], props.cards[position + 1]]) {
      if (neighbor?.art) {
        const img = new Image();
        img.src = asset(neighbor.art);
      }
      if (neighbor?.artFocused) {
        const img = new Image();
        img.src = asset(neighbor.artFocused);
      }
    }
  },
  { immediate: true },
);

/** The A/R hotkeys arrive from the shell; this is where they mean add/remove. */
function onHotkey(want: boolean): void {
  const card = props.card;
  if (!card || props.selected === undefined || props.lockedLabel) return;
  // A radio card can only be picked, never dropped: R on a chosen mastery is a no-op.
  if (props.radio ? !props.selected && want : props.selected !== want) {
    emit('toggle', card);
  }
}

const canFlipCard = computed(() => {
  const card = props.card;
  return !!card?.art && !!card.unfocused && !!(card.artFocused || card.focused?.text);
});
const shownArt = computed(() => {
  const card = props.card;
  if (!card) return null;
  return shownFace.value === 'focused' && card.artFocused ? card.artFocused : card.art;
});
const faceLabel = (face: MasteryFace) => t(face === 'focused' ? 'party.cardFocused' : 'party.cardUnfocused');
function flipCard(): void {
  shownFace.value = shownFace.value === 'unfocused' ? 'focused' : 'unfocused';
}
</script>

<template>
  <CardDetailDialog
    :card="card"
    :cards="cards"
    :label="card?.name"
    :zoom="zoom"
    @close="emit('close')"
    @hotkey="onHotkey"
    @show="emit('show', $event as HunterCard)">
    <template #scan>
      <ore-button-group
        attached
        class="card-detail__faces"
        fullwidth
        rounded="sm"
        size="sm"
        v-if="canFlipCard"
        :label="t('party.cardFaceGroup')">
        <ore-button
          color="primary"
          v-for="face in MASTERY_FACES"
          :key="face"
          :aria-pressed="shownFace === face"
          :variant="shownFace === face ? 'solid' : 'bordered'"
          @click="shownFace = face">
          {{ faceLabel(face) }}
        </ore-button>
      </ore-button-group>
      <ore-button
        class="card-detail__scan card-detail__scan--flip"
        variant="ghost"
        v-if="canFlipCard"
        :label="t('party.cardFlipAria', { side: faceLabel(shownFace) })"
        @click="flipCard">
        <Transition mode="out-in" name="card-face">
          <img alt="" class="card-detail__image" decoding="async" :key="shownFace" :src="asset(shownArt ?? '')" />
        </Transition>
      </ore-button>
      <div class="card-detail__scan" v-else-if="shownArt">
        <img class="card-detail__image" decoding="async" :alt="t('party.cardAlt', { name: card?.name ?? '' })" :src="asset(shownArt)" />
      </div>
    </template>

    <template #default>
      <div class="card-detail__meta">
        <ore-badge color="primary" size="sm" variant="flat" v-if="card?.kind || card?.cardType">
          {{ card?.kind === 'mastery' ? t('party.mastery') : card?.cardType }}
        </ore-badge>
        <ore-badge size="sm" variant="flat" v-if="card?.subtype">{{ card.subtype }}</ore-badge>
        <ore-badge size="sm" variant="flat" v-if="card?.step !== 'S' && card?.step">
          {{ t('party.branchStep', { id: card.step[0], step: card.step[1] }) }}
        </ore-badge>
      </div>
      <dl class="card-detail__facts">
        <template v-if="card?.staminaCost !== null && card">
          <dt>{{ t('party.cardStaminaCost') }}</dt>
          <dd>{{ card.staminaCost }}</dd>
        </template>
        <template v-if="card?.staminaIcons !== null && card">
          <dt>{{ t('party.cardStaminaIcons') }}</dt>
          <dd>
            <img
              alt=""
              aria-hidden="true"
              class="card-detail__stamina-icon"
              decoding="sync"
              :src="asset('/icons/icon_stamina.svg')" />
            {{ card.staminaIcons }}
          </dd>
        </template>
        <template v-if="card?.trait">
          <dt>{{ t('party.cardTrait') }}</dt>
          <dd>{{ card.trait }}</dd>
        </template>
      </dl>
      <template v-if="card?.unfocused">
        <div class="card-detail__mastery" :class="{ 'card-detail__mastery--flip': canFlipCard }">
          <div class="card-detail__mastery-side" :class="{ 'is-shown': canFlipCard && shownFace === 'unfocused' }">
            <div class="card-detail__mastery-head">
              <ore-text variant="overline">{{ t('party.cardUnfocused') }}</ore-text>
              <ore-text color="muted" size="xs">{{ tp('party.cardFlipsAt', card.unfocused.counters) }}</ore-text>
            </div>
            <ore-text size="sm" v-for="(line, index) in cardTextLines(card.unfocused.text)" :key="`u${index}`">
              <CardText :text="line" :weapon-icon="weaponIcon" />
            </ore-text>
          </div>
          <div
            class="card-detail__mastery-side"
            v-if="card.artFocused || card.focused?.text"
            :class="{ 'is-shown': canFlipCard && shownFace === 'focused' }">
            <div class="card-detail__mastery-head">
              <ore-text variant="overline">{{ t('party.cardFocused') }}</ore-text>
            </div>
            <ore-text size="sm" v-for="(line, index) in cardTextLines(card.focused?.text ?? '')" :key="`f${index}`">
              <CardText :text="line" :weapon-icon="weaponIcon" />
            </ore-text>
            <ore-text color="muted" size="sm" v-if="!card.focused?.text">{{ t('party.cardSeeScan') }}</ore-text>
          </div>
        </div>
      </template>
      <div class="card-detail__text" v-else-if="card?.text">
        <ore-text size="sm" v-for="(line, index) in cardTextLines(card.text)" :key="index">
          <CardText :text="line" :weapon-icon="weaponIcon" />
        </ore-text>
      </div>
      <ore-text color="muted" size="sm" v-else>
        {{ card?.art ? t('party.cardSeeScan') : t('party.cardNoText') }}
      </ore-text>
      <div class="card-detail__faq" v-if="card?.faq">
        <ore-text variant="overline">{{ t('party.cardFaq') }}</ore-text>
        <ore-text size="sm" v-for="(line, index) in cardTextLines(card.faq)" :key="index">
          <CardText :text="line" :weapon-icon="weaponIcon" />
        </ore-text>
      </div>
    </template>

    <template #action>
      <template v-if="card && selected !== undefined && !props.readOnly">
        <ore-chip size="sm" variant="flat" v-if="lockedLabel">
          <ore-icon name="lock" slot="icon" />
          {{ lockedLabel }}
        </ore-chip>
        <ore-button
          color="primary"
          size="sm"
          v-else
          :aria-pressed="selected"
          :disabled="radio && selected"
          :label="t(radio && selected ? 'deck.selectedCardAria' : radio ? 'deck.selectCardAria' : selected ? 'deck.removeCardAria' : 'deck.addCardAria', { name: card.name })"
          :variant="selected ? 'bordered' : 'solid'"
          @click="emit('toggle', card)">
          <ore-icon
            slot="prefix"
            :name="radio ? (selected ? 'circle-dot' : 'circle') : selected ? 'minus' : 'plus'"
            :solid="radio && selected" />
          <span class="card-detail__label--long">
            {{ t(radio && selected ? 'deck.selectedCard' : radio ? 'deck.selectCard' : selected ? 'deck.removeCard' : 'deck.addCard') }}
          </span>
          <span class="card-detail__label--short">
            {{ t(radio && selected ? 'deck.selectedCard' : radio ? 'deck.selectCard' : selected ? 'deck.removeCardShort' : 'deck.addCardShort') }}
          </span>
        </ore-button>
      </template>
    </template>
  </CardDetailDialog>
</template>

<style scoped>
.card-detail__scan {
  display: grid;
  place-items: center;
  min-height: 0;
  aspect-ratio: 5 / 7;
  overflow: hidden;
  border-radius: var(--rounded-md);
}

.card-detail__scan .card-detail__image {
  max-width: 100%;
  max-height: 70dvh;
  object-fit: contain;
}

.card-detail__scan--flip {
  --button-padding: 0;
  --button-radius: var(--rounded-sm);
  display: block;
  cursor: pointer;
}

.card-detail__scan--flip::part(button) {
  height: auto;
  min-height: 0;
}

.card-detail__scan--flip::part(content) {
  display: grid;
  place-items: center;
  width: 100%;
  white-space: normal;
}

.card-detail__faces {
  width: 100%;
}

.card-face-enter-active,
.card-face-leave-active {
  transition:
    opacity var(--p-motion) ease,
    scale var(--p-motion) ease;
}

.card-face-enter-from,
.card-face-leave-to {
  opacity: 0;
  scale: 0.96;
}

.card-detail__meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-1-5);
}

.card-detail__facts {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--size-1) var(--size-3);
  margin: 0;
  font-size: var(--text-sm);
}

.card-detail__facts:empty {
  display: none;
}

.card-detail__facts dt {
  color: var(--p-text-muted);
}

.card-detail__facts dd {
  margin: 0;
  font-weight: var(--font-medium);
  color: var(--p-text-strong);
}

.card-detail__stamina-icon {
  display: inline-block;
  width: auto;
  height: var(--text-lg);
  margin-inline-end: var(--size-0-5);
  vertical-align: middle;
}

.card-detail__text,
.card-detail__faq,
.card-detail__mastery-side {
  display: grid;
  gap: var(--size-2);
}

.card-detail__text ::part(content),
.card-detail__faq ::part(content),
.card-detail__mastery-side ::part(content) {
  line-height: var(--leading-relaxed);
  text-wrap: pretty;
}

.card-detail__mastery {
  display: grid;
  gap: var(--size-3);
}

.card-detail__mastery-head {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-1) var(--size-2);
  align-items: baseline;
}

/* With a flippable scan, the side blocks mirror the shown face: shown is framed in gold, the other steps back. */
.card-detail__mastery--flip .card-detail__mastery-side {
  padding: var(--size-3);
  border-inline-start: var(--border-2) solid var(--p-line);
  border-radius: 0 var(--rounded-md) var(--rounded-md) 0;
  transition:
    border-color var(--p-motion),
    background var(--p-motion),
    opacity var(--p-motion);
}

.card-detail__mastery--flip .card-detail__mastery-side:not(.is-shown) {
  opacity: 0.55;
}

.card-detail__mastery--flip .card-detail__mastery-side.is-shown {
  background: var(--p-gold-faint);
  border-color: var(--p-gold);
}

.card-detail__faq {
  padding-block-start: var(--size-3);
  border-top: var(--border) solid var(--p-line);
}

.card-detail__label--short {
  display: none;
}

@media (width < 760px) {
  .card-detail__label--long {
    display: none;
  }

  .card-detail__label--short {
    display: inline;
  }
}
</style>
