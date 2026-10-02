<script lang="ts" setup>
import { computed, useId } from 'vue';
import { asset } from '../../../app/assets';
import { type MessageKey, t } from '../../../app/i18n';
import {
  forgeById,
  type HunterStatusDefinition,
  hunterCardById,
  hunterStatuses,
  starterMastery,
  weaponClassById,
} from '../../../content';
import { isIdleHunterState } from '../../../domain/hunter-state';
import type {
  BoardBuild,
  Hunter,
  HunterBuild,
  HunterCondition,
  HunterCounter,
  HunterFightState,
  KoToken,
} from '../../../domain/types';
import BoardFooter from '../board/BoardFooter.vue';
import { type BoardRule, statusBoardRule } from '../board/rules';
import CardText from '../CardText.vue';
import '@vielzeug/refine/button';
import '@vielzeug/refine/chip';
import '@vielzeug/refine/counter';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/progress';
import '@vielzeug/refine/text';
import '@vielzeug/refine/tooltip';

/**
 * One hunter's fight board: damage band, mastery/weapon tracks, condition tiles, token tallies, clear action.
 * Pure presentation: every edit is emitted and the parent decides how to apply it.
 */
const props = defineProps<{
  /** Drop the name row and footer when the surrounding view renders them around the board. */
  embedded?: boolean;
  /** Suppress the mastery/weapon tallies when the focused-hunter view renders them in its separate counter column. */
  hideCounters?: boolean;
  hunter: Hunter;
  locked: boolean;
  lockReason: string;
  maxHealth?: number;
  member?: BoardBuild | HunterBuild;
  playerName?: string;
  state: HunterFightState;
}>();

const emit = defineEmits<{
  adjust: [counter: HunterCounter, delta: number];
  clear: [];
  knockOut: [token: KoToken | null];
  rule: [rule: BoardRule];
  toggle: [condition: HunterCondition, active: boolean];
}>();

const damage = hunterStatuses.find((status) => status.id === 'damage');
const conditions = hunterStatuses.filter(
  (status): status is HunterStatusDefinition & { kind: 'condition' } => status.kind === 'condition',
);
const conditionsBeforeKo = conditions.slice(0, 2);
const conditionsAfterKo = conditions.slice(2);
const koStatus = hunterStatuses.find((status) => status.id === 'knockedOut');
const tokens = hunterStatuses.filter(
  (status): status is HunterStatusDefinition & { kind: 'counter' } =>
    status.kind === 'counter' &&
    status.id !== 'damage' &&
    status.id !== 'item' &&
    status.id !== 'mastery' &&
    status.id !== 'weapon',
);

const uid = useId();
const weapon = computed(() => weaponClassById(props.hunter.classId).name);
const isDown = computed(() => props.state.knockedOut !== null);
const damageHint = computed(() => {
  if (props.state.knockedOut === 'dead') return t('board.koDeadHint');
  if (props.state.knockedOut === 'red') return t('board.koRedHint');
  if (props.state.knockedOut === 'black') return t('board.koBlackHint');
  if (props.maxHealth === undefined || !damage) return damage?.hint ?? '';
  return t('hunterBoard.maxHealth', { max: props.maxHealth });
});
const idle = computed(() => isIdleHunterState(props.state));
const counterValue = (status: HunterStatusDefinition): number => {
  const value = props.state[status.id];
  return typeof value === 'number' ? value : 0;
};
const conditionOn = (status: HunterStatusDefinition): boolean => props.state[status.id] === true;

type KoStage = 'none' | KoToken;
// The out-of-game token is final: clicking it changes nothing.
const KO_NEXT: Record<KoStage, KoToken | null> = { black: null, dead: 'dead', none: 'red', red: 'black' };
const KO_KEY: Record<KoStage, { aria: MessageKey; label: MessageKey }> = {
  black: { aria: 'board.koBlackAria', label: 'board.koBlack' },
  dead: { aria: 'board.koDeadAria', label: 'board.koDead' },
  none: { aria: 'board.koMarkAria', label: 'board.koMark' },
  red: { aria: 'board.koRedAria', label: 'board.koRed' },
};

const koStage = computed<KoStage>(() => props.state.knockedOut ?? 'none');
const koColor = computed<'error' | 'primary' | undefined>(() => {
  if (props.state.knockedOut === 'red' || props.state.knockedOut === 'dead') return 'error';
  return 'primary';
});
const koIcon = computed(() =>
  asset(props.state.knockedOut === 'black' ? '/tokens/token_ko_b.svg' : '/tokens/token_ko_a.svg'),
);
const koLabel = computed(() => t(KO_KEY[koStage.value].label));
const koAriaLabel = computed(() => t(KO_KEY[koStage.value].aria));

function onCycleKnockedOut(event: Event): void {
  if (props.locked) return;
  // ore-chip action mode dispatches a composed 'click' CustomEvent; the inner button's native click
  // also bubbles to the host. Ignore the native one so a single press cycles the KO token once.
  if (!(event as CustomEvent).detail?.originalEvent) return;
  emit('knockOut', KO_NEXT[koStage.value]);
}

const masteryCard = computed(() => {
  if (props.member?.masteryCardId) {
    return hunterCardById(props.hunter, props.member.masteryCardId);
  }
  return starterMastery(props.hunter);
});
const masteryGoal = computed(() => masteryCard.value?.unfocused?.counters ?? 2);
const masteryValue = computed(() => Math.min(props.state.mastery ?? 0, masteryGoal.value));
const isMasteryFocused = computed(() => (props.state.mastery ?? 0) >= masteryGoal.value && masteryGoal.value > 0);
/** Focused, the tally shows what the mastery does now: its focused text, not the path there. */
const masteryHint = computed(() => {
  const card = masteryCard.value;
  if (isMasteryFocused.value && card?.focused?.text) return card.focused.text;
  return card?.unfocused?.text ?? t('hunterBoard.focusAt', { count: masteryGoal.value });
});

const weaponPiece = computed(() => {
  const weaponId = props.member?.equipment.weaponId;
  return weaponId ? forgeById(weaponId) : undefined;
});
const weaponHint = computed(() => t('hunterBoard.weaponHint'));

const masteryStatus = computed<HunterStatusDefinition>(() => ({
  art: null,
  hint: isMasteryFocused.value ? t('party.cardFocused') : t('hunterBoard.focusAt', { count: masteryGoal.value }),
  icon: 'sparkles',
  id: 'mastery',
  keywordId: null,
  kind: 'counter',
  name: masteryCard.value?.name ?? t('hunterBoard.mastery'),
  rule: masteryCard.value
    ? [
        masteryCard.value.unfocused?.text
          ? `${t('party.cardUnfocused')}: ${masteryCard.value.unfocused.text}`
          : null,
        masteryCard.value.focused?.text ? `${t('party.cardFocused')}: ${masteryCard.value.focused.text}` : null,
      ]
        // The drawer prints each line as its own paragraph: the card's two faces
        // never share one run-on line.
        .filter(Boolean)
        .join('\n')
    : null,
}));

const weaponStatus = computed<HunterStatusDefinition>(() => ({
  art: null,
  hint: weaponHint.value,
  icon: 'swords',
  id: 'weapon',
  keywordId: null,
  kind: 'counter',
  name: weaponPiece.value?.name ?? weapon.value,
  rule: t('hunterBoard.weaponRule'),
}));

const itemPiece = computed(() => {
  const itemId = props.member?.equipment.itemId;
  const entry = itemId ? forgeById(itemId) : undefined;
  return entry?.type === 'item' ? entry : undefined;
});

/** Only the counter-carrying items (Lava Buckler, Tome of Creatures, Ancestors' Gift, Northern Star) show a tally. */
const itemHasCounters = computed(() => itemPiece.value?.counters === true);

const itemStatus = computed<HunterStatusDefinition>(() => ({
  art: null,
  hint: t('hunterBoard.itemHint'),
  icon: 'backpack',
  id: 'item',
  keywordId: null,
  kind: 'counter',
  name: itemPiece.value?.name ?? t('party.slotItem'),
  rule: itemPiece.value?.description ?? null,
}));

function onCounter(counter: HunterCounter, event: Event): void {
  if (props.locked) return;
  const { delta } = (event as CustomEvent<{ delta: number; value: number }>).detail;
  if (delta !== 0) emit('adjust', counter, delta);
}

function onCondition(status: HunterStatusDefinition, event: Event): void {
  if (status.kind !== 'condition' || props.locked) return;
  const { checked } = (event as CustomEvent<{ checked: boolean }>).detail;
  emit('toggle', status.id, checked);
}
</script>

<template>
  <article
    class="hb"
    :aria-label="t('board.boardAria', { name: hunter.name })"
    :class="{ 'hb--down': isDown, 'hb--hide-counters': hideCounters, 'hb--locked': locked, 'hb--out': state.knockedOut === 'dead' }">
    <header class="hb__identity" v-if="!embedded">
      <img alt="" class="hb__art" :src="asset(hunter.artwork)" />
      <div class="hb__who">
        <ore-text as="h2" class="hb__name" size="xl" variant="heading">{{ hunter.name }}</ore-text>
        <ore-text color="muted" size="sm">
          <span class="hb__meta">
            <span class="hb__weapon">{{ weapon }}</span>
            <span v-if="playerName">· {{ playerName }}</span>
          </span>
        </ore-text>
      </div>
    </header>

    <section class="hb__band hb__area-band" :aria-label="t('board.damage')">
      <img alt="" class="hb__band-art" :src="asset('/icons/icon_damage.svg')" />
      <!-- A knocked-out hunter cannot be targeted, so damage waits until they rise. -->
      <ore-counter
        class="hb__damage"
        color="error"
        size="lg"
        v-if="damage"
        :disabled="isDown"
        :hint="damageHint"
        :label="damage.name"
        :readonly="locked"
        :value="state.damage"
        @change="onCounter('damage', $event)">
        <ore-icon aria-hidden="true" slot="icon" :name="damage.icon" />
      </ore-counter>
    </section>

    <section class="hb__group hb__area-tracks" v-if="!hideCounters" :aria-label="t('hunterBoard.tracks')" >
      <ore-progress
        class="hb__track"
        size="md"
        :class="{ 'hb__track--focused': isMasteryFocused }"
        :label="`${state.mastery ?? 0} / ${masteryGoal}`"
        :max="masteryGoal"
        :segments="masteryGoal"
        :value="masteryValue"
        :value-text="t('hunterBoard.masteryOf', { max: masteryGoal, value: state.mastery ?? 0 })" />
      <div class="hb__counters-row">
        <div class="hb__tile">
          <ore-counter
            class="hb__tally hb__tally--mastery"
            :class="{ 'hb__tally--focused': isMasteryFocused, 'hb__tally--on': (state.mastery ?? 0) > 0 }"
            :disabled="isDown"
            :hint="masteryHint"
            :label="masteryCard?.name ?? t('hunterBoard.mastery')"
            :max="masteryGoal"
            :readonly="locked"
            :value="state.mastery ?? 0"
            @change="onCounter('mastery', $event)">
            <span
              aria-hidden="true"
              class="hb__glyph"
              slot="icon"
              :style="{ '--glyph': `url(${asset('/icons/icon_mastery.svg')})` }" />
            <!-- The mastery text prints its bracketed keywords as the icons they name, like
                 the card details in the deck builder and forge; the hint attr stays as the
                 text twin for the counter's aria-describedby. -->
            <span class="hb__mastery-hint" slot="hint">
              <CardText :text="masteryHint" />
            </span>
          </ore-counter>
          <!-- The tooltip is the positioned anchor: its :host is relative, so the rule
               class belongs on it, never on the button inside. -->
          <ore-tooltip
            class="hb__rule"
            v-if="masteryCard"
            :content="t('board.ruleLabel', { name: masteryCard.name })"
            :delay="400">
            <ore-button
              icon-only
              size="sm"
              variant="ghost"
              :label="t('board.ruleLabel', { name: masteryCard.name })"
              @click="emit('rule', statusBoardRule(masteryStatus))">
              <ore-icon aria-hidden="true" name="info" />
            </ore-button>
          </ore-tooltip>
        </div>
        <div class="hb__stack" :class="{ 'hb__stack--trio': itemHasCounters }">
          <div class="hb__tile">
            <ore-counter
              class="hb__tally hb__tally--weapon hb__tally--compact"
              :class="{ 'hb__tally--on': (state.weapon ?? 0) > 0 }"
              :disabled="isDown"
              :hint="weaponHint"
              :label="weaponPiece?.name ?? weapon"
              :readonly="locked"
              :value="state.weapon ?? 0"
              @change="onCounter('weapon', $event)">
              <span
                aria-hidden="true"
                class="hb__glyph"
                slot="icon"
                :style="{ '--glyph': `url(${asset(weaponClassById(hunter.classId).icon)})` }" />
            </ore-counter>
            <ore-tooltip
              class="hb__rule"
              v-if="weaponPiece"
              :content="t('board.ruleLabel', { name: weaponPiece.name })"
              :delay="400">
              <ore-button
                icon-only
                size="sm"
                variant="ghost"
                :label="t('board.ruleLabel', { name: weaponPiece.name })"
                @click="emit('rule', statusBoardRule(weaponStatus))">
                <ore-icon aria-hidden="true" name="info" />
              </ore-button>
            </ore-tooltip>
          </div>
          <div class="hb__tile" v-if="itemHasCounters">
            <ore-counter
              class="hb__tally hb__tally--item hb__tally--compact"
              :class="{ 'hb__tally--on': (state.item ?? 0) > 0 }"
              :disabled="isDown"
              :hint="t('hunterBoard.itemHint')"
              :label="itemPiece?.name ?? t('party.slotItem')"
              :readonly="locked"
              :value="state.item ?? 0"
              @change="onCounter('item', $event)">
              <span
                aria-hidden="true"
                class="hb__glyph"
                slot="icon"
                :style="{ '--glyph': `url(${asset('/icons/icon_item.svg')})` }" />
            </ore-counter>
            <ore-tooltip
              class="hb__rule"
              v-if="itemPiece"
              :content="t('board.ruleLabel', { name: itemPiece.name })"
              :delay="400">
              <ore-button
                icon-only
                size="sm"
                variant="ghost"
                :label="t('board.ruleLabel', { name: itemPiece.name })"
                @click="emit('rule', statusBoardRule(itemStatus))">
                <ore-icon aria-hidden="true" name="info" />
              </ore-button>
            </ore-tooltip>
          </div>
        </div>
      </div>
    </section>

    <section class="hb__group hb__area-conditions" :aria-labelledby="`${uid}-conditions`">
      <ore-text as="h3" class="hb__heading" size="sm" variant="heading" :id="`${uid}-conditions`">
        {{ t('board.conditions') }}
      </ore-text>
      <ul class="hb__conditions list-plain">
        <li class="hb__tile" v-for="status in conditionsBeforeKo" :key="status.id">
          <ore-chip
            class="hb__condition"
            color="primary"
            layout="stacked"
            mode="selectable"
            size="lg"
            :checked="conditionOn(status)"
            :disabled="locked || isDown"
            :value="status.id"
            :variant="conditionOn(status) ? 'solid' : 'bordered'"
            @change="onCondition(status, $event)">
            <img alt="" slot="icon" v-if="status.art" :src="asset(status.art)" />
            <ore-icon aria-hidden="true" slot="icon" v-else :name="status.icon" />
            {{ status.name }}
          </ore-chip>
          <ore-tooltip
            class="hb__rule"
            v-if="status.keywordId || status.rule"
            :content="t('board.ruleLabel', { name: status.name })"
            :delay="400">
            <ore-button
              icon-only
              size="sm"
              variant="ghost"
              :label="t('board.ruleLabel', { name: status.name })"
              @click="emit('rule', statusBoardRule(status))">
              <ore-icon aria-hidden="true" name="info" />
            </ore-button>
          </ore-tooltip>
        </li>
        <li class="hb__tile" v-if="koStatus">
          <ore-chip
            class="hb__condition hb__condition--ko"
            layout="stacked"
            mode="action"
            size="lg"
            :aria-label="koAriaLabel"
            :class="`hb__condition--ko-${koStage}`"
            :color="koColor"
            :disabled="locked"
            :value="'knockedOut'"
            :variant="isDown ? 'solid' : 'bordered'"
            @click="onCycleKnockedOut">
            <img alt="" slot="icon" :src="koIcon" />
            {{ koLabel }}
          </ore-chip>
          <ore-tooltip
            class="hb__rule"
            :content="t('board.ruleLabel', { name: koStatus.name })"
            :delay="400">
            <ore-button
              icon-only
              size="sm"
              variant="ghost"
              :label="t('board.ruleLabel', { name: koStatus.name })"
              @click="emit('rule', statusBoardRule(koStatus))">
              <ore-icon aria-hidden="true" name="info" />
            </ore-button>
          </ore-tooltip>
        </li>
        <li class="hb__tile" v-for="status in conditionsAfterKo" :key="status.id">
          <ore-chip
            class="hb__condition"
            color="primary"
            layout="stacked"
            mode="selectable"
            size="lg"
            :checked="conditionOn(status)"
            :disabled="locked || isDown"
            :value="status.id"
            :variant="conditionOn(status) ? 'solid' : 'bordered'"
            @change="onCondition(status, $event)">
            <img alt="" slot="icon" v-if="status.art" :src="asset(status.art)" />
            <ore-icon aria-hidden="true" slot="icon" v-else :name="status.icon" />
            {{ status.name }}
          </ore-chip>
          <ore-tooltip
            class="hb__rule"
            v-if="status.keywordId || status.rule"
            :content="t('board.ruleLabel', { name: status.name })"
            :delay="400">
            <ore-button
              icon-only
              size="sm"
              variant="ghost"
              :label="t('board.ruleLabel', { name: status.name })"
              @click="emit('rule', statusBoardRule(status))">
              <ore-icon aria-hidden="true" name="info" />
            </ore-button>
          </ore-tooltip>
        </li>
      </ul>
    </section>

    <section class="hb__group hb__area-tokens" :aria-labelledby="`${uid}-tokens`">
      <ore-text as="h3" class="hb__heading" size="sm" variant="heading" :id="`${uid}-tokens`">
        {{ t('board.tokens') }}
      </ore-text>
      <ul class="hb__tokens list-plain">
        <li class="hb__token" v-for="status in tokens" :key="status.id">
          <ore-counter
            class="hb__tally"
            :class="{ 'hb__tally--on': counterValue(status) > 0 }"
            :disabled="isDown"
            :hint="status.hint"
            :label="status.name"
            :readonly="locked"
            :value="counterValue(status)"
            @change="onCounter(status.id, $event)">
            <img alt="" slot="icon" v-if="status.art" :src="asset(status.art)" />
            <ore-icon aria-hidden="true" slot="icon" v-else :name="status.icon" />
          </ore-counter>
          <ore-tooltip
            class="hb__rule"
            v-if="status.keywordId || status.rule"
            :content="t('board.ruleLabel', { name: status.name })"
            :delay="400">
            <ore-button
              icon-only
              size="sm"
              variant="ghost"
              :label="t('board.ruleLabel', { name: status.name })"
              @click="emit('rule', statusBoardRule(status))">
              <ore-icon aria-hidden="true" name="info" />
            </ore-button>
          </ore-tooltip>
        </li>
      </ul>
    </section>

    <BoardFooter
      class="hb__foot"
      v-if="!embedded"
      :idle="idle"
      :lock-reason="lockReason"
      :locked="locked"
      @clear="emit('clear')" />
  </article>
</template>

<style scoped>
.hb {
  --hb-tile-bg: var(--p-panel-sunken);
  --hb-tile-line: var(--p-line);

  display: flex;
  flex-direction: column;
  gap: var(--size-6);
  min-width: 0;
  transition: opacity var(--p-motion) var(--p-ease);
}

/* Identity ------------------------------------------------------------- */

.hb__identity {
  display: flex;
  gap: var(--size-3);
  align-items: center;
}

.hb__art {
  flex-shrink: 0;
  width: var(--size-14);
  height: var(--size-14);
  object-fit: cover;
  object-position: top;
  border-radius: var(--rounded-md);
  box-shadow: var(--p-shadow);
}

.hb__who {
  flex: 1;
  min-width: 0;
}

.hb__name {
  font-family: var(--p-display);
  font-size: clamp(var(--text-lg), 6.5vw, var(--text-2xl));
  line-height: var(--leading-tight);
}

.hb__meta {
  display: flex;
  gap: var(--size-1);
  white-space: nowrap;
}

.hb__weapon {
  min-width: 0;
}

/* Damage band ---------------------------------------------------------- */

.hb__band {
  position: relative;
  padding: var(--size-4);
  overflow: hidden;
  color: var(--p-on-dark);
  background:
    radial-gradient(120% 140% at 100% 0%, color-mix(in oklch, var(--p-blood) 55%, transparent), transparent 60%),
    var(--p-cinematic-ink);
  border-radius: var(--rounded-xl);
  box-shadow: var(--shadow-md);
  isolation: isolate;
}

.hb__band-art {
  position: absolute;
  inset-block-start: 50%;
  inset-inline-end: calc(-1 * var(--size-8));
  z-index: -1;
  width: var(--size-40);
  height: var(--size-40);
  pointer-events: none;
  opacity: 0.18;
  translate: 0 -50%;
}

.hb__damage {
  --counter-bg: transparent;
  --counter-border-color: transparent;
  --counter-icon-size: var(--size-9);
  --counter-value-size: clamp(3.5rem, 18vw, 4.5rem);
  --counter-button-size: var(--size-14);
  --counter-gap: var(--size-6);
  --counter-radius: var(--rounded-full);

  display: flex;
  width: 100%;
}

.hb__damage::part(counter) {
  padding: 0;
}

.hb__damage::part(label),
.hb__damage::part(hint) {
  color: var(--p-on-dark);
}

.hb__damage::part(label) {
  font-family: var(--p-heading);
  font-size: var(--text-sm);
  text-transform: uppercase;
  letter-spacing: var(--p-tracking);
}

.hb__damage::part(hint) {
  opacity: 0.72;
}

.hb__damage::part(value) {
  font-family: var(--p-display);
  color: var(--p-on-dark);
}

.hb__damage::part(decrement-btn),
.hb__damage::part(increment-btn) {
  color: var(--p-on-dark);
  background: color-mix(in oklch, var(--p-on-dark) 14%, transparent);
  border: var(--border) solid color-mix(in oklch, var(--p-on-dark) 28%, transparent);
}

.hb__damage::part(increment-btn) {
  background: color-mix(in oklch, var(--p-blood) 70%, var(--p-cinematic-ink));
  border-color: color-mix(in oklch, var(--p-blood) 90%, var(--p-on-dark));
}

/* Groups --------------------------------------------------------------- */

.hb__group {
  display: flex;
  flex-direction: column;
  gap: var(--size-3);
}

.hb__track {
  --progress-fill: var(--color-contrast-500);
  --progress-track-bg: var(--color-contrast-200);
  width: 100%;
}

.hb__track--focused {
  --progress-fill: var(--color-primary);
}

/* The mastery tally keeps its full form; the weapon and item tallies stack beside it, compact.
   Both columns are definite (1fr): an auto column collapses, the counters size themselves in %. */
.hb__counters-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--size-3);
  align-items: stretch;
  container: tokens / inline-size;
}

.hb__stack {
  display: grid;
  gap: var(--size-1-5);
  align-content: start;
}

/* With all three tallies the stacked pair drops its hints: the label stays, the info button
   explains. Two tallies have the room and keep the full text. */
.hb__stack--trio .hb__tally--compact::part(hint) {
  display: none;
}

.hb__glyph {
  display: inline-block;
  width: var(--size-7);
  height: var(--size-7);
  background: currentcolor;
  mask: var(--glyph) center / contain no-repeat;
}

.hb__heading {
  font-family: var(--p-heading);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--p-text-muted);
  text-transform: uppercase;
  letter-spacing: var(--p-tracking);
}

.hb__conditions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--size-3);
}

.hb__conditions > li,
.hb__token,
.hb__tile {
  position: relative;
  display: flex;
  min-width: 0;
  container: tile / inline-size;
}

.hb__condition {
  --chip-icon-size: var(--size-9);
  --chip-radius: var(--rounded-lg);
  --chip-padding-y: var(--size-3);
  --chip-padding-x: var(--size-2);
  --chip-font-size: var(--text-xs);
  flex: 1;
  min-height: var(--size-24);

  /* Rings drawn on the host (the KO highlight) must follow the rounded chip inside it. */
  border-radius: var(--rounded-lg);
}

.hb__condition::part(chip-btn),
.hb__condition::part(chip) {
  width: 100%;
  height: 100%;
}

.hb__condition--ko-black {
  --chip-bg: var(--p-cinematic-ink);
  --chip-color: var(--p-on-dark);
  --chip-border-color: color-mix(in oklch, var(--p-on-dark) 45%, transparent);
}

/* The knockout calls for attention: a soft error pulse rings the chip while it sits red side up. */
@keyframes hb-ko-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 color-mix(in oklch, var(--color-error) 60%, transparent);
  }

  50% {
    box-shadow: 0 0 0 var(--size-1) color-mix(in oklch, var(--color-error) 18%, transparent);
  }
}

.hb__condition--ko-red {
  animation: hb-ko-pulse 1.8s var(--p-ease) infinite;
}

/* The final knockout stays loudly flagged: a steady error ring instead of the pulse. */
.hb__condition--ko-dead {
  box-shadow: 0 0 0 var(--border-2) var(--color-error-border);
}

@media (prefers-reduced-motion: reduce) {
  .hb__condition--ko-red {
    box-shadow: 0 0 0 var(--border-2) var(--color-error-border);
    animation: none;
  }
}

.hb__tokens {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--size-3);
  container: tokens / inline-size;
}

.hb__tally {
  --counter-bg: var(--hb-tile-bg);
  --counter-border-color: var(--hb-tile-line);
  --counter-icon-size: var(--size-8);

  flex: 1;
}

.hb__tally--on {
  --counter-border-color: var(--p-gold);
}

.hb__tally--on::part(value) {
  color: var(--p-gold);
}

.hb__tally--on .hb__glyph {
  color: var(--p-gold);
}

.hb__tally--mastery {
  --counter-border-color: var(--hb-tile-line);
}

.hb__tally--mastery .hb__glyph {
  color: var(--p-text-muted);
}

.hb__tally--mastery.hb__tally--on {
  --counter-border-color: var(--color-contrast-400);
}

.hb__tally--mastery.hb__tally--on::part(value) {
  color: var(--p-text-strong);
}

.hb__tally--mastery.hb__tally--on .hb__glyph {
  color: var(--p-text-strong);
}

.hb__tally--mastery.hb__tally--focused {
  --counter-bg: var(--color-primary);
  --counter-border-color: var(--color-primary);
  box-shadow: var(--shadow-sm);
}

.hb__tally--mastery.hb__tally--focused::part(counter) {
  color: var(--color-primary-contrast);
}

.hb__tally--mastery.hb__tally--focused::part(label),
.hb__tally--mastery.hb__tally--focused::part(value) {
  color: var(--color-primary-contrast);
}

.hb__tally--mastery.hb__tally--focused::part(hint),
.hb__tally--mastery.hb__tally--focused .hb__mastery-hint {
  color: color-mix(in oklch, var(--color-primary-contrast) 85%, transparent);
}

.hb__tally--mastery.hb__tally--focused::part(decrement-btn),
.hb__tally--mastery.hb__tally--focused::part(increment-btn) {
  color: var(--color-primary-contrast);
  background: color-mix(in oklch, var(--color-primary-contrast) 15%, transparent);
}

.hb__tally--mastery.hb__tally--focused::part(decrement-btn):hover:not(:disabled),
.hb__tally--mastery.hb__tally--focused::part(increment-btn):hover:not(:disabled) {
  background: color-mix(in oklch, var(--color-primary-contrast) 25%, transparent);
}

.hb__tally--mastery.hb__tally--focused .hb__glyph {
  color: var(--color-primary-contrast);
}

/* Info affordance sits in the tile's top corner, over the counter's header row. */
.hb__rule {
  position: absolute;
  inset-block-start: var(--size-1);
  inset-inline-end: var(--size-1);
  z-index: 1;
  color: var(--p-text-muted);
}

.hb__conditions .hb__rule {
  inset-block-start: 0;
  inset-inline-end: 0;
}

.hb__tile:has(.hb__tally--mastery.hb__tally--focused) .hb__rule {
  color: var(--color-primary-contrast);
}
.hb--out .hb__art {
  filter: grayscale(1);
}

.hb--down .hb__group {
  opacity: 0.55;
  filter: grayscale(0.7);
  transition:
    opacity var(--p-motion) var(--p-ease),
    filter var(--p-motion) var(--p-ease);
}

/* The knockout clears every other condition, so the row keeps its full weight while the rest of
   the board recedes: the highlighted KO chip leads the eye. */
.hb--down .hb__area-conditions {
  opacity: 1;
  filter: none;
}

.hb--down .hb__band {
  background:
    radial-gradient(120% 140% at 100% 0%, color-mix(in oklch, var(--p-on-dark) 12%, transparent), transparent 60%),
    var(--p-cinematic-ink);
}

@media (width < 440px) {
  .hb__conditions {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (width < 320px) {
  .hb__conditions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* Narrow token tiles (table-view columns, four-up rows): tighter tallies. */
@container tile (width < 200px) {
  .hb__tally {
    --counter-button-size: var(--size-10);
    --counter-gap: var(--size-2);
    --counter-value-size: var(--text-xl);
  }
}

/* Compact column (five hunters on a laptop): smaller art and tally, conditions and tokens one per row. */
@container board (width < 270px) {
  /* Name and one-line meta only, so every column's identity row is the same height. */
  .hb__art {
    display: none;
  }

  .hb__name {
    font-size: var(--text-xl);
  }

  .hb__weapon {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .hb__tokens {
    grid-template-columns: 1fr;
  }

  .hb__damage {
    --counter-value-size: var(--text-3xl);
    --counter-button-size: var(--size-10);
    --counter-gap: var(--size-3);
  }

  .hb__band-art {
    width: var(--size-28);
    height: var(--size-28);
  }

  .hb__conditions {
    grid-template-columns: 1fr;
  }
}

/* Tablet party cards: damage & tracks on the left, conditions & tokens on the right. */
@media (768px <= width < 1280px) {
  .hb:not(.hb--hide-counters) {
    display: grid;
    grid-template-areas:
      'identity identity'
      'band tracks'
      'conditions tokens'
      'foot foot';
    grid-template-rows: auto auto auto auto;
    grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
    gap: var(--size-3) var(--size-4);
    align-items: stretch;
  }

  .hb:not(.hb--hide-counters) .hb__identity {
    grid-area: identity;
  }

  .hb:not(.hb--hide-counters) .hb__area-band {
    display: flex;
    flex-direction: column;
    grid-area: band;
    justify-content: center;
    padding: var(--size-4) var(--size-5);
  }

  .hb:not(.hb--hide-counters) .hb__damage {
    --counter-value-size: var(--text-2xl);
    --counter-button-size: var(--size-12);
    --counter-gap: var(--size-4);
  }

  .hb:not(.hb--hide-counters) .hb__area-tracks {
    display: flex;
    flex-direction: column;
    grid-area: tracks;
    gap: var(--size-2-5);
  }

  .hb:not(.hb--hide-counters) .hb__area-conditions {
    grid-area: conditions;
  }

  .hb:not(.hb--hide-counters) .hb__conditions {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--size-2);
  }

  .hb:not(.hb--hide-counters) .hb__condition {
    --chip-icon-size: var(--size-7);
    --chip-padding-y: var(--size-2);
    --chip-padding-x: var(--size-1-5);
    min-height: var(--size-20);
  }

  .hb:not(.hb--hide-counters) .hb__area-tokens {
    display: flex;
    flex-direction: column;
    grid-area: tokens;
  }

  .hb:not(.hb--hide-counters) .hb__tokens {
    display: grid;
    flex: 1;
    grid-template-rows: repeat(2, minmax(0, 1fr));
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--size-2-5);
  }

  .hb:not(.hb--hide-counters) .hb__token {
    height: 100%;
  }

  .hb:not(.hb--hide-counters) .hb__tally {
    --counter-button-size: var(--size-11);
    --counter-gap: var(--size-2);
    --counter-value-size: var(--text-2xl);

    height: 100%;
  }

  .hb:not(.hb--hide-counters) .hb__foot {
    grid-area: foot;
  }
}
</style>
