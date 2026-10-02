<script lang="ts" setup>
import { computed, inject, ref, watchEffect } from 'vue';
import { asset } from '../../../app/assets';
import { t } from '../../../app/i18n';
import type { RouteName } from '../../../app/router';
import { patchSettings, runCommand, settings } from '../../../app/store';
import { navigate, useMediaQuery, useReadable } from '../../../app/vue-bridge';
import { hunterById, statusById, weaponClassById } from '../../../content/index';
import { hunterMaxHealth, isIdleHunterState } from '../../../domain/hunter-state';
import type { DepletedSlot, HunterCondition, HunterCounter, KoToken } from '../../../domain/types';
import BoardFooter from '../../components/board/BoardFooter.vue';
import { type BoardRule, statusBoardRule } from '../../components/board/rules';
import TokenRuleDrawer from '../../components/board/TokenRuleDrawer.vue';
import { type BoardChange, useBoardUndo } from '../../components/board/useBoardUndo';
import ConfirmDialog from '../../components/ConfirmDialog.vue';
import HunterBoardCard from '../../components/hunter-board/HunterBoardCard.vue';
import HunterCounters from '../../components/hunter-board/HunterCounters.vue';
import HunterGear from '../../components/hunter-board/HunterGear.vue';
import LinkButton from '../../components/LinkButton.vue';
import { useSubject } from '../../composables/use-subject';
import '@vielzeug/refine/button';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/tab-item';
import '@vielzeug/refine/tabs';
import '@vielzeug/refine/text';
import '@vielzeug/refine/tooltip';

const { fullscreen, toggleFullscreen } = inject('boardFullscreen') as {
  fullscreen: Readonly<import('vue').Ref<boolean>>;
  toggleFullscreen: () => void;
};

const {
  ascent,
  backRoute,
  campaign,
  entity,
  expedition,
  hunterBoardRoute,
  isAscent,
  isCampaign,
  lockReason,
  locked,
  monsterBoardRoute,
  params,
  subject,
} = useSubject();
const members = computed(() => entity.value?.hunters ?? []);
const party = computed(() =>
  members.value.map((member) => hunterById(member.hunterId)).filter((member) => member !== undefined),
);
const hunter = computed(() => party.value.find((entry) => entry.id === params.value.hunterId));
const member = computed(() => members.value.find((entry) => entry.hunterId === hunter.value?.id));
const playerNameOf = (hunterId: string): string | undefined =>
  isCampaign.value ? campaign.value?.hunters.find((entry) => entry.hunterId === hunterId)?.playerName : undefined;
const maxHealthOf = (hunterId: string): number | undefined => {
  const member = members.value.find((entry) => entry.hunterId === hunterId);
  return member ? hunterMaxHealth(member, entity.value?.hunterState[hunterId]?.depleted) : undefined;
};
/** The hunter's final knockout: the whole board, kit and portrait, reads spent. */
const isOut = (hunterId: string): boolean => entity.value?.hunterState[hunterId]?.knockedOut === 'dead';

const homeRoute = computed<RouteName>(() =>
  isCampaign.value ? 'campaigns' : isAscent.value ? 'ascentDetail' : 'expeditions',
);

// Phones show one board. Tablets show one hunter with their gear beside the board. From desktop width the
// user chooses: the whole party side by side, or one hunter with a large portrait and their gear.
const preferences = useReadable(settings);
const tablet = useMediaQuery('(min-width: 768px)');
const wide = useMediaQuery('(min-width: 1280px)');
/* Only the desktop focus grid puts the gear column in a stretching row; everywhere else the
  gear sizes itself from the card aspect, which is what the loadout grid does without fill. */
const gearStretches = useMediaQuery('(min-width: 1280px)');
const hunterLayout = computed(() => tablet.value && (!wide.value || preferences.value.hunterBoardLayout === 'hunter'));
const canConsume = computed(() =>
  isCampaign.value
    ? campaign.value?.phase === 'hunt'
    : isAscent.value
      ? ascent.value?.phase === 'hunt'
      : expedition.value?.status !== 'played',
);
const idle = computed(() => {
  const state = hunter.value ? entity.value?.hunterState[hunter.value.id] : undefined;
  return !state || isIdleHunterState(state);
});

const confirmClear = ref<string | null>(null);
const ruleFor = ref<BoardRule | null>(null);

// Route carries a stale or out-of-party hunter id → land on the first party member.
watchEffect(() => {
  const target = entity.value;
  if (target && party.value.length > 0 && !hunter.value) {
    void navigate(hunterBoardRoute.value, { hunterId: party.value[0].id, id: target.id }, undefined, { replace: true });
  }
});

function switchHunter(event: Event): void {
  const hunterId = (event.target as HTMLElement & { value?: string }).value;
  if (!entity.value || !hunterId || hunterId === hunter.value?.id) return;
  void navigate(hunterBoardRoute.value, { hunterId, id: entity.value.id });
}

function toggleLayout(): void {
  patchSettings({ hunterBoardLayout: preferences.value.hunterBoardLayout === 'hunter' ? 'party' : 'hunter' });
}



function consumePotion(potionId: string): void {
  const ref = subject.value;
  const current = member.value;
  if (!ref || !current || !canConsume.value) return;
  runCommand('consumePotion', ref, current.hunterId, potionId);
}

function apply(change: BoardChange): void {
  const ref = subject.value;
  if (!ref) return;
  switch (change.kind) {
    case 'counter':
      runCommand('adjustHunterCounter', ref, change.hunterId, change.counter, change.delta);
      return;
    case 'condition':
      runCommand('setHunterCondition', ref, change.hunterId, change.condition, change.active);
      return;
    default:
      return;
  }
}

const undo = useBoardUndo(apply);

// KO changes clear the whole board (the rules remove every token), so neither they nor a damage
// tap that knocks the hunter out can be undone through the single-track undo.
function edit(change: BoardChange): void {
  const token = (): KoToken | null =>
    'hunterId' in change ? (entity.value?.hunterState[change.hunterId]?.knockedOut ?? null) : null;
  const before = token();
  apply(change);
  if (before === token()) undo.record(change);
  else undo.drop();
}

function knockOut(hunterId: string, token: KoToken | null): void {
  const ref = subject.value;
  if (!ref) return;
  undo.drop();
  runCommand('setHunterKnockedOut', ref, hunterId, token);
}

function deplete(hunterId: string, slot: DepletedSlot, depleted: boolean): void {
  const ref = subject.value;
  if (!ref) return;
  undo.drop();
  runCommand('setHunterDepleted', ref, hunterId, slot, depleted);
}

const adjust = (hunterId: string, counter: HunterCounter, delta: number): void =>
  edit({ counter, delta, hunterId, kind: 'counter', name: statusById(counter)?.name ?? counter });

const toggle = (hunterId: string, condition: HunterCondition, active: boolean): void =>
  edit({ active, condition, hunterId, kind: 'condition', name: statusById(condition)?.name ?? condition });

// Hunter layout handlers: the template's v-if narrowing does not reach into event closures.
const adjustSelected = (counter: HunterCounter, delta: number): void => {
  if (hunter.value) adjust(hunter.value.id, counter, delta);
};
const toggleSelected = (condition: HunterCondition, active: boolean): void => {
  if (hunter.value) toggle(hunter.value.id, condition, active);
};
const knockOutSelected = (token: KoToken | null): void => {
  if (hunter.value) knockOut(hunter.value.id, token);
};
const depleteSelected = (slot: DepletedSlot, depleted: boolean): void => {
  if (hunter.value) deplete(hunter.value.id, slot, depleted);
};

function clear(): void {
  const hunterId = confirmClear.value;
  confirmClear.value = null;
  const ref = subject.value;
  if (!ref || !hunterId) return;
  undo.drop();
  runCommand('resetHuntState', ref, hunterId);
}
</script>

<template>
  <div class="board" v-if="entity && hunter" :class="hunterLayout ? 'board--hunter' : 'board--party'">
    <header class="board__top">
      <LinkButton
        class="board__back"
        size="sm"
        variant="ghost"
        :label="t('boards.backToHunt')"
        :params="{ id: entity.id }"
        :to="backRoute">
        <ore-icon aria-hidden="true" name="arrow-left" slot="prefix" />
        <span class="board__control-label">{{ t('boards.hunt') }}</span>
      </LinkButton>
      <ore-tabs
        class="board__switch"
        size="sm"
        variant="solid"
        v-if="party.length > 1"
        :label="t('boards.huntersLabel')"
        :value="hunter.id"
        @change="switchHunter">
        <ore-tab-item slot="tabs" v-for="member in party" :key="member.id" :value="member.id">
          <span
            aria-hidden="true"
            class="board-glyph board__tab-glyph"
            slot="prefix"
            :style="{ '--glyph': `url(${asset(weaponClassById(member.classId).icon)})` }" />
          <span class="board__tab-name">{{ member.name }}</span>
        </ore-tab-item>
      </ore-tabs>
      <div class="board__controls">
        <LinkButton
          class="board__control"
          color="secondary"
          size="sm"
          variant="bordered"
          :label="t('boards.monsterBoard')"
          :params="{ id: entity.id }"
          :to="monsterBoardRoute">
          <span aria-hidden="true" class="board-glyph" slot="prefix" style="--glyph: url(/icons/icon_rampage.svg)" />
          <span class="board__control-label">{{ t('boards.monsterBoard') }}</span>
        </LinkButton>
        <ore-button
          class="board__control board__layout"
          color="secondary"
          size="sm"
          variant="bordered"
          :aria-pressed="hunterLayout"
          :label="t(hunterLayout ? 'boards.layoutPartyAria' : 'boards.layoutHunterAria')"
          @click="toggleLayout">
          <ore-icon aria-hidden="true" slot="prefix" :name="hunterLayout ? 'layout-grid' : 'layout-panel-left'" />
          <span class="board__control-label">{{ t(hunterLayout ? 'boards.layoutParty' : 'boards.layoutHunter') }}</span>
        </ore-button>
        <ore-tooltip :content="t(fullscreen ? 'board.fullscreenExitAria' : 'board.fullscreenAria')" :delay="400">
          <ore-button
            class="board__control board__fullscreen"
            color="secondary"
            icon-only
            size="sm"
            variant="bordered"
            :aria-pressed="fullscreen"
            :label="t(fullscreen ? 'board.fullscreenExitAria' : 'board.fullscreenAria')"
            @click="toggleFullscreen">
            <ore-icon aria-hidden="true" :name="fullscreen ? 'minimize' : 'maximize'" />
          </ore-button>
        </ore-tooltip>
      </div>
    </header>

    <div class="board__focus" v-if="hunterLayout && member">
      <header class="board__identity">
        <span
          aria-hidden="true"
          class="board__tile"
          :style="{
            '--art': `url(${asset(hunter.artwork)})`,
            '--glyph': `url(${asset(weaponClassById(hunter.classId).icon)})`,
          }" />
        <div class="board__who">
          <ore-text as="h2" class="board__name" size="xl" variant="heading">{{ hunter.name }}</ore-text>
          <ore-text class="board__meta" color="muted" size="sm">
            <span>{{ hunter.title }}</span>
            <span>{{ weaponClassById(hunter.classId).name }}</span>
            <span v-if="playerNameOf(hunter.id)">{{ playerNameOf(hunter.id) }}</span>
          </ore-text>
        </div>
      </header>
      <div
        class="board__portrait"
        role="img"
        :aria-label="hunter.name"
        :class="[`board__portrait--${hunter.id}`, { 'board__portrait--out': isOut(hunter.id) }]"
        :style="{ '--art': `url(${asset(hunter.artwork)})` }" />
      <div class="board__card board__card--active board__board">
        <HunterBoardCard
          embedded
          :hide-counters="hunterLayout"
          :hunter="hunter"
          :lock-reason="lockReason"
          :locked="locked"
          :max-health="maxHealthOf(hunter.id)"
          :member="member"
          :player-name="playerNameOf(hunter.id)"
          :state="entity.hunterState[hunter.id]"
          @adjust="adjustSelected"
          @clear="confirmClear = hunter.id"
          @knock-out="knockOutSelected"
          @rule="ruleFor = $event"
          @toggle="toggleSelected" />
      </div>
      <div class="board__gear-col" v-if="member">
        <HunterCounters
          class="board__counters"
          v-if="hunterLayout"
          :hunter="hunter"
          :locked="locked"
          :member="member"
          :state="entity.hunterState[hunter.id]"
          @adjust="adjustSelected"
          @rule="ruleFor = statusBoardRule($event)" />
        <HunterGear
          class="board__gear"
          :can-consume="canConsume"
          :fill="gearStretches"
          :hunter="hunter"
          :member="member"
          :state="entity.hunterState[hunter.id]"
          @consume="consumePotion"
          @deplete="depleteSelected" />
      </div>
      <BoardFooter
        class="board__foot"
        :idle="idle"
        :lock-reason="lockReason"
        :locked="locked"
        @clear="confirmClear = hunter.id" />
    </div>

    <div class="board__table" v-else :style="{ '--party': party.length }">
      <div
        class="board__card"
        v-for="entry in party"
        :key="entry.id"
        :class="{ 'board__card--active': entry.id === hunter.id }">
        <HunterBoardCard
          embedded
          :hunter="entry"
          :lock-reason="lockReason"
          :locked="locked"
          :max-health="maxHealthOf(entry.id)"
          :member="members.find((m) => m.hunterId === entry.id)"
          :player-name="playerNameOf(entry.id)"
          :state="entity.hunterState[entry.id]"
          @adjust="(counter, delta) => adjust(entry.id, counter, delta)"
          @clear="confirmClear = entry.id"
          @knock-out="(token) => knockOut(entry.id, token)"
          @rule="ruleFor = $event"
          @toggle="(condition, active) => toggle(entry.id, condition, active)" />
        <HunterGear
          class="board__gear board__gear--mobile"
          v-if="entry.id === hunter.id && member"
          :can-consume="canConsume"
          :hunter="hunter"
          :member="member"
          :state="entity.hunterState[hunter.id]"
          @consume="consumePotion"
          @deplete="depleteSelected" />
        <BoardFooter
          class="board__foot board__foot--mobile"
          v-if="entry.id === hunter.id"
          :idle="idle"
          :lock-reason="lockReason"
          :locked="locked"
          @clear="confirmClear = entry.id" />
      </div>
    </div>

    <TokenRuleDrawer :rule="ruleFor" :weapon-icon="weaponClassById(hunter.classId).icon" @close="ruleFor = null" />

    <ConfirmDialog
      confirm-icon="eraser"
      danger
      :confirm-label="t('boards.clearLabel')"
      :open="confirmClear !== null"
      :title="t('boards.clearTitle')"
      @cancel="confirmClear = null"
      @confirm="clear">
      <ore-text size="sm">
        {{ t('boards.clearBody', { name: hunterById(confirmClear ?? '')?.name ?? t('boards.clearFallback') }) }}
      </ore-text>
    </ConfirmDialog>
  </div>

  <div class="frame stack board__missing" v-else>
    <ore-text variant="heading">{{ t('boards.missing') }}</ore-text>
    <LinkButton :to="homeRoute">{{ isCampaign ? t('boards.allCampaigns') : t('boards.allExpeditions') }}</LinkButton>
  </div>
</template>

<style scoped>
.board {
  --board-max: 560px;

  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: var(--size-5);
  width: 100%;
  max-width: var(--board-max);
  min-height: 100dvh;
  padding: var(--size-3) var(--size-4) calc(var(--size-10) + env(safe-area-inset-bottom));
  margin-inline: auto;
  touch-action: manipulation;
  background: var(--p-canvas);
}

/* Back link, hunter switcher centred, controls: the board's header. */
/* The hunter left the game: the portrait desaturates with the kit below it, at every width. */
.board__portrait--out {
  filter: grayscale(1);
}

.board__top {
  display: grid;
  grid-template-areas: 'back switch controls';
  grid-template-columns: 1fr auto 1fr;
  gap: var(--size-2);
  align-items: center;
}

.board__back {
  grid-area: back;
  justify-self: start;
}

.board__switch {
  grid-area: switch;
  justify-self: center;
}

.board__controls {
  display: flex;
  grid-area: controls;
  gap: var(--size-1-5);
  justify-self: end;
}

/* Phones and tablets: tabs show the weapon glyph alone; the names stay for assistive tech. */
@media (width < 1024px) {
  .board__tab-glyph {
    width: var(--size-5);
    height: var(--size-5);
  }

  .board__tab-name {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    white-space: nowrap;
    clip-path: inset(50%);
  }
}

/* Up to landscape tablet the control labels are hidden; icons stay. Fullscreen is desktop-only. */
@media (width < 1280px) {
  .board__control-label {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    white-space: nowrap;
    clip-path: inset(50%);
  }

  .board__fullscreen {
    display: none;
  }
}

/* The layout choice only exists where both layouts fit. */
.board__layout {
  display: none;
}

.board__table {
  display: grid;
  gap: var(--size-8);
}

.board__gear--mobile {
  margin-top: var(--size-6);
}

/* Equipment in the party table is mobile-only; tablet+ renders it in the gear column. */
@media (width >= 768px) {
  .board__gear--mobile {
    display: none;
  }
}

.board__card {
  display: none;
  min-width: 0;
  container: board / inline-size;
}

.board__card--active {
  display: block;
}

.board__foot--mobile {
  display: none;
}

/* Mobile: the table fills the viewport and the clear button rests at the bottom. */
@media (width < 768px) {
  .board__table {
    flex: 1;
  }

  .board__card--active {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .board__foot--mobile {
    display: flex;
    margin-top: var(--size-6);
  }
}

.board__missing {
  padding-block: var(--size-10);
}

.board-glyph {
  display: inline-block;
  flex-shrink: 0;
  width: var(--size-4);
  height: var(--size-4);
  background: currentcolor;
  mask: var(--glyph) center / contain no-repeat;
}

/* Tablet landscape: the hunter identity spans the top, with hero, board and gear in three columns. */
@media (768px <= width < 1280px) {
  .board {
    --board-max: 1200px;

    padding-inline: var(--size-5);
  }

  .board__focus {
    display: grid;
    grid-template-areas:
      'identity identity identity'
      'portrait board gear';
    grid-template-rows: auto minmax(0, 1fr);
    grid-template-columns: minmax(120px, 0.3fr) repeat(2, minmax(0, 0.85fr));
    gap: var(--size-4) var(--size-6);
    align-items: stretch;
    justify-content: center;
  }

  .board__identity {
    display: flex;
    grid-area: identity;
    gap: var(--size-3);
    align-items: center;
  }

  /* The tile trades the hero art for the weapon glyph: the portrait already shows the hero. */
  .board__tile {
    display: grid;
    flex-shrink: 0;
    place-items: center;
    width: var(--size-12);
    height: var(--size-12);
    background: var(--p-panel-sunken);
    border-radius: var(--rounded-md);
    box-shadow: var(--p-shadow);
  }

  .board__tile::before {
    width: var(--size-7);
    height: var(--size-7);
    content: '';
    background: currentcolor;
    mask: var(--glyph) center / contain no-repeat;
  }

  .board__who {
    flex: 1;
    min-width: 0;
  }

  .board__name {
    font-family: var(--p-display);
    font-size: var(--text-2xl);
    line-height: var(--leading-tight);
  }

  /* Facts read as one dotted line now that the row has the width. */
  .board__meta {
    display: flex;
    flex-direction: row;
    gap: var(--size-2);
  }

  .board__meta > * + *::before {
    margin-inline-end: var(--size-2);
    content: '·';
  }

  /* Hero art sized to fit alongside the board, fading toward the foot. */
  .board__portrait {
    display: block;
    grid-area: portrait;
    min-height: 0;
    background-image: var(--art);
    background-repeat: no-repeat;
    background-position: 50% top;
    background-size: cover;
    border: 1px solid var(--color-divider);
    border-radius: var(--rounded-xl);
  }

  .board__portrait--daeron {
    background-position: 30% top;
  }

  .board__portrait--mirah {
    background-position: 60% top;
  }

  .board__portrait--thoreg {
    background-position: 46% top;
  }

  .board__portrait--ljonar {
    background-position: 55% top;
  }

  .board__portrait--karah {
    background-position: 55% top;
  }

  .board__portrait--heleren {
    background-position: 25% top;
  }

  .board__portrait--zaraya {
    background-position: 25% top;
  }

  .board__portrait--drusk {
    background-position: 50% top;
  }

  .board__board {
    grid-area: board;
    min-width: 0;
  }

  .board__gear-col {
    display: flex;
    flex-direction: column;
    grid-area: gear;
    gap: var(--size-5);
    min-width: 0;
  }

  .board__foot {
    grid-area: portrait;
    align-self: end;
  }
}

/* Tablet portrait: the same two-column board and gear, with the hero portrait removed. */
@media (768px <= width < 1280px) and (orientation: portrait) {
  .board {
    --board-max: 960px;
  }

  .board__focus {
    grid-template-areas:
      'identity identity'
      'board gear'
      'foot foot';
    grid-template-rows: auto minmax(0, 1fr) auto;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--size-4) var(--size-4);
  }

  .board__tile {
    background: var(--art) center top / cover no-repeat;
  }

  .board__tile::before {
    display: none;
  }

  .board__portrait {
    display: none;
  }

  .board__foot {
    grid-area: foot;
    align-self: center;
    width: 100%;
    padding-top: var(--size-2);
  }
}

/* Desktop: party layout shows every hunter side by side (no switcher); hunter layout puts the identity row
   across the top like the monster board, then a column each for portrait, board and gear, with the footer
   resting on the portrait. */
@media (width >= 1280px) {
  .board {
    --board-card-max: 560px;
    --board-max: 1400px;

    padding-inline: var(--size-6);
  }

  .board__layout {
    display: inline-flex;
  }

  .board--party .board__switch {
    display: none;
  }

  .board__focus {
    display: grid;
    grid-template-areas:
      'identity identity identity'
      'portrait board gear';
    grid-template-rows: auto minmax(0, 1fr);
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--size-5) var(--size-6);
  }

  .board__identity {
    display: flex;
    grid-area: identity;
    gap: var(--size-3);
    align-items: center;
  }

  .board__tile {
    display: grid;
    flex-shrink: 0;
    place-items: center;
    width: var(--size-14);
    height: var(--size-14);
    background: var(--p-panel-sunken);
    border-radius: var(--rounded-md);
    box-shadow: var(--p-shadow);
  }

  .board__tile::before {
    width: var(--size-8);
    height: var(--size-8);
    content: '';
    background: currentcolor;
    mask: var(--glyph) center / contain no-repeat;
  }

  .board__who {
    flex: 1;
    min-width: 0;
  }

  .board__name {
    font-family: var(--p-display);
    font-size: var(--text-2xl);
    line-height: var(--leading-tight);
  }

  .board__meta {
    display: flex;
    flex-direction: row;
    gap: var(--size-2);
  }

  .board__meta > * + *::before {
    margin-inline-end: var(--size-2);
    content: '·';
  }

  .board__portrait {
    display: block;
    grid-area: portrait;
    min-height: 0;
    background-image: var(--art);
    background-repeat: no-repeat;
    background-position: 50% top;
    background-size: cover;
    mask:
      linear-gradient(90deg, transparent, #000 18% 82%, transparent), linear-gradient(180deg, #000 72%, transparent);
    mask-composite: intersect;
  }

  .board__portrait--daeron {
    background-position: 20% top;
  }

  .board__portrait--mirah {
    background-position: 54% top;
  }

  .board__portrait--thoreg {
    background-position: 58% top;
  }

  .board__portrait--ljonar {
    background-position: 50% top;
  }

  .board__portrait--karah {
    background-position: 44% top;
  }

  .board__portrait--heleren {
    background-position: 15% top;
  }

  .board__portrait--zaraya {
    background-position: 21% top;
  }

  .board__portrait--drusk {
    background-position: 41% top;
  }

  .board__board {
    grid-area: board;
    min-width: 0;
  }

  .board__gear-col {
    display: flex;
    flex-direction: column;
    grid-area: gear;
    gap: var(--size-5);
    min-width: 0;
  }

  .board__gear {
    flex: 1;
    min-height: 0;
  }

  .board__foot {
    grid-area: portrait;
    align-self: end;
  }

  /* One column per hunter so the whole party is always in view; the card compacts itself in narrow columns.
     Columns stop growing at the phone board width so small parties sit centred instead of stretching. */
  .board__table {
    grid-template-columns: repeat(var(--party), minmax(0, var(--board-card-max)));
    gap: var(--size-8) var(--size-6);
    justify-content: center;
  }

  .board__card {
    display: block;
  }
}
</style>
