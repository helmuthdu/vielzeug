<script lang="ts" setup>
import { computed, inject, ref } from 'vue';
import { t } from '../../../app/i18n';
import type { RouteName } from '../../../app/router';
import { runCommand } from '../../../app/store';
import {
  campaignAggression,
  monsterStatusById,
  terrainById,
} from '../../../content/index';
import { carrierMonster } from '../../../domain/monster-state';
import { liveTerrain } from '../../../domain/terrain';
import type { MonsterCounter, MonsterStance, MonsterToken, Sector } from '../../../domain/types';
import type { BoardRule } from '../../components/board/rules';
import TokenRuleDrawer from '../../components/board/TokenRuleDrawer.vue';
import { type BoardChange, useBoardUndo } from '../../components/board/useBoardUndo';
import ConfirmDialog from '../../components/ConfirmDialog.vue';
import HuntTimer from '../../components/hunt/HuntTimer.vue';
import LinkButton from '../../components/LinkButton.vue';
import MonsterBoardCard from '../../components/monster-board/MonsterBoardCard.vue';
import { useSubject } from '../../composables/use-subject';
import '@vielzeug/refine/button';
import '@vielzeug/refine/icon';
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
  subject,
} = useSubject();
const monster = computed(() => (entity.value ? carrierMonster(entity.value) : undefined));
const partySize = computed(() => entity.value?.hunters.length ?? 0);
const firstHunterId = computed(() => entity.value?.hunters[0]?.hunterId);
const aggression = computed(() =>
  isCampaign.value
    ? campaign.value
      ? campaignAggression(campaign.value.chapter)
      : null
    : isAscent.value
      ? (ascent.value?.chapter ?? null)
      : (expedition.value?.aggression ?? null),
);
// The board's live terrain: the printed placements with the fight's melts, removals and
// additions already applied.
const terrain = computed(() => (entity.value ? liveTerrain(entity.value) : []));

const homeRoute = computed<RouteName>(() => (isCampaign.value ? 'campaigns' : isAscent.value ? 'home' : 'expeditions'));

const confirmClear = ref(false);
const ruleFor = ref<BoardRule | null>(null);

function apply(change: BoardChange): void {
  const ref = subject.value;
  if (!ref) return;
  switch (change.kind) {
    case 'monster-counter':
      runCommand('adjustMonsterCounter', ref, change.counter, change.delta);
      return;
    case 'monster-token':
      runCommand('adjustMonsterToken', ref, change.token, change.delta);
      return;
    case 'terrain-restore':
      // Chips of one terrain are indistinguishable, so re-placing is an honest inversion.
      for (let chip = 0; chip < change.count; chip += 1) runCommand('placeTerrain', ref, change.sector, change.terrainId);
      return;
    default:
      return;
  }
}

const undo = useBoardUndo(apply);

function edit(change: BoardChange): void {
  apply(change);
  undo.record(change);
}

const adjust = (counter: MonsterCounter, delta: number): void =>
  edit({ counter, delta, kind: 'monster-counter', name: monsterStatusById(counter)?.name ?? counter });

const token = (token: MonsterToken, delta: number): void =>
  edit({ delta, kind: 'monster-token', name: monsterStatusById(token)?.name ?? token, token });

function confirmWound(): void {
  if (!subject.value) return;
  undo.drop();
  runCommand('confirmMonsterWound', subject.value);
}

function setStance(stance: MonsterStance): void {
  if (!subject.value) return;
  undo.drop();
  runCommand('setMonsterStance', subject.value, stance);
}

// Snapshot-free actions cannot be inverted through a delta; they drop any pending undo.
function unleash(): void {
  if (!subject.value) return;
  undo.drop();
  runCommand('unleashMonster', subject.value);
}

// Placing and melting are deliberate flips, not tally chatter: they clear any pending undo
// instead of recording one. A removal is destructive, so it carries the undo toast: the inverse
// re-places an identical chip, which is how the physical game would undo it too.
function placeTerrain(sector: Sector | null, terrainId: string): void {
  if (!subject.value) return;
  undo.drop();
  runCommand('placeTerrain', subject.value, sector, terrainId);
}

function removeTerrain(tokenId: string): void {
  const token = entity.value ? liveTerrain(entity.value).find((entry) => entry.id === tokenId) : undefined;
  if (!subject.value || !token) return;
  runCommand('removeTerrain', subject.value, tokenId);
  undo.record({
    count: 1,
    kind: 'terrain-remove',
    name: terrainById(token.terrainId)?.name ?? token.terrainId,
    sector: token.sector,
    terrainId: token.terrainId,
  });
}

function transformTerrain(tokenId: string): void {
  if (!subject.value) return;
  undo.drop();
  runCommand('transformTerrain', subject.value, tokenId);
}

function clear(): void {
  confirmClear.value = false;
  if (!subject.value) return;
  undo.drop();
  runCommand('resetMonsterState', subject.value);
}

const startTimer = (): void => {
  if (!subject.value) return;
  runCommand('startHuntTimer', subject.value);
};

const pauseTimer = (): void => {
  if (!subject.value) return;
  runCommand('pauseHuntTimer', subject.value);
};

const resetTimer = (): void => {
  if (!subject.value) return;
  runCommand('resetHuntTimer', subject.value);
};
</script>

<template>
  <div class="board" v-if="entity && monster">
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
      <HuntTimer
        class="board__timer"
        :timer="entity.huntTimer"
        @pause="pauseTimer"
        @reset="resetTimer"
        @start="startTimer" />
      <div class="board__controls">
        <LinkButton
          class="board__control"
          color="secondary"
          size="sm"
          variant="bordered"
          v-if="firstHunterId"
          :label="t('boards.hunterBoard')"
          :params="{ hunterId: firstHunterId, id: entity.id }"
          :to="hunterBoardRoute">
          <span aria-hidden="true" class="board-glyph" slot="prefix" style="--glyph: url(/icons/icon_hunter.svg)" />
          <span class="board__control-label">{{ t('boards.hunterBoard') }}</span>
        </LinkButton>
        <ore-tooltip :content="t(fullscreen ? 'board.fullscreenExitAria' : 'board.fullscreenAria')" :delay="400" >
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

    <div class="board__card">
      <MonsterBoardCard
        :aggression="aggression"
        :expansion-ids="entity.expansionIds"
        :lock-reason="lockReason"
        :locked="locked"
        :monster="monster"
        :party-size="partySize"
        :state="entity.monsterState"
        :terrain="terrain"
        @adjust="adjust"
        @clear="confirmClear = true"
        @confirm-wound="confirmWound"
        @place-terrain="placeTerrain"
        @remove-terrain="removeTerrain"
        @rule="ruleFor = $event"
        @stance="setStance"
        @token="token"
        @transform-terrain="transformTerrain"
        @unleash="unleash"/>
    </div>

    <TokenRuleDrawer :rule="ruleFor" @close="ruleFor = null" />

    <ConfirmDialog
      confirm-icon="eraser"
      danger
      :confirm-label="t('boards.clearLabel')"
      :open="confirmClear"
      :title="t('boards.clearTitle')"
      @cancel="confirmClear = false"
      @confirm="clear">
      <ore-text size="sm">
        {{ t('boards.monsterClearBody', { name: monster.name }) }}
      </ore-text>
    </ConfirmDialog>
  </div>

  <div class="frame stack board__missing" v-else-if="entity">
    <ore-text variant="heading">{{ t('boards.noMonster') }}</ore-text>
    <ore-text color="muted" size="sm">
      {{ isCampaign ? t('boards.noMonsterCampaign') : t('boards.noMonsterExpedition') }}
    </ore-text>
    <LinkButton :params="{ id: entity.id }" :to="backRoute">{{ t('boards.backToHunt') }}</LinkButton>
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

.board__top {
  display: grid;
  grid-template-areas: 'back timer controls';
  grid-template-columns: 1fr auto 1fr;
  gap: var(--size-2);
  align-items: center;
}

.board__back {
  grid-area: back;
  justify-self: start;
}

.board__timer {
  grid-area: timer;
  justify-self: center;
}

.board__controls {
  display: flex;
  grid-area: controls;
  gap: var(--size-1-5);
  justify-self: end;
}

.board__card {
  min-width: 0;
  container: board / inline-size;
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

/* Phones and compact screens: the control labels are hidden; icons stay. Fullscreen is desktop-only. */
@media (width < 1280px) {
  .board__fullscreen {
    display: none;
  }
}

@media (width < 640px) {
  .board__control-label {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    white-space: nowrap;
    clip-path: inset(50%);
  }
}

/* Tablet and up: the board widens so its sections can sit in one row; capped so ultrawide screens stay legible. */
@media (width >= 768px) {
  .board {
    --board-max: 1400px;

    padding-inline: var(--size-6);
  }
}
</style>
