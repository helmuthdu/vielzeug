<script lang="ts" setup>
import { computed, nextTick, ref, watch } from 'vue';
import { asset } from '../../../app/assets';
import { t, tp } from '../../../app/i18n';
import { campaigns, notifyError, runCommand } from '../../../app/store';
import { useReadable } from '../../../app/vue-bridge';
import { campaignAggression, monsterById, monsterDamageFor, questById, questExpirationLabels } from '../../../content/index';
import { questExpirationChapter, questsByStatus } from '../../../domain/campaign';
import type { Quest, QuestStatus, ResourceId } from '../../../domain/types';
import MonsterInfo from '../MonsterInfo.vue';
import NightmareModeToggle from '../NightmareModeToggle.vue';
import ResourceIcon from '../ResourceIcon.vue';
import StanceTargets from '../StanceTargets.vue';
import '@vielzeug/refine/accordion';
import '@vielzeug/refine/accordion-item';
import '@vielzeug/refine/button';
import '@vielzeug/refine/card';
import '@vielzeug/refine/chip';
import '@vielzeug/refine/text';

const props = defineProps<{ campaignId: string }>();
const all = useReadable(campaigns);
const campaign = computed(() => all.value.find((entry) => entry.id === props.campaignId));
const activeQuest = computed(() =>
  campaign.value?.activeQuestId ? questById(campaign.value.activeQuestId) : undefined,
);
const choices = computed(() => {
  const current = campaign.value;
  if (!current) return [];
  const available = questsByStatus(current, 'available');
  if (activeQuest.value && !available.some((quest) => quest.id === activeQuest.value?.id))
    available.unshift(activeQuest.value);
  return available.sort((left, right) => left.number - right.number);
});
const completed = computed(() => (campaign.value ? questsByStatus(campaign.value, 'completed') : []));
const expired = computed(() => (campaign.value ? questsByStatus(campaign.value, 'expired') : []));
const inspectedQuestId = ref<string | null>(null);
const inspectedQuest = computed(() => (inspectedQuestId.value ? questById(inspectedQuestId.value) : undefined));
const inspectedMonster = computed(() =>
  inspectedQuest.value ? monsterById(inspectedQuest.value.monsterId) : undefined,
);
const currentAggression = computed(() => (campaign.value ? campaignAggression(campaign.value.chapter) : null));
const usesNightmare = computed(() => campaign.value?.nightmareVariant ?? false);
/** The box is on the table: the switch waits; otherwise it names what would enable it. */
const nightmareAvailable = computed(() => Boolean(campaign.value?.expansionIds.includes('nightmare')));

function setNightmare(on: boolean): void {
  try {
    runCommand('setSubjectNightmare', { id: props.campaignId, kind: 'campaign' }, on);
  } catch (error) {
    notifyError('toasts.actionNotPossible', error);
  }
}
const currentDamage = computed(() => {
  const monster = inspectedMonster.value;
  const aggression = currentAggression.value;
  if (!monster || aggression === null) return undefined;
  return monsterDamageFor(monster, aggression, usesNightmare.value) ?? monsterDamageFor(monster, aggression, false);
});
const detailRef = ref<HTMLElement | null>(null);
const boardHeadingRef = ref<HTMLElement | null>(null);
const questState = (id: string): QuestStatus | undefined =>
  campaign.value?.quests.find((state) => state.questId === id)?.status;
const expiresNextChapter = (quest: Quest): boolean =>
  campaign.value !== undefined && questExpirationChapter(campaign.value, quest.id) === campaign.value.chapter + 1;
const rewardEntries = (quest: Quest): [ResourceId, number][] =>
  Object.entries(quest.rewardResources).filter((entry): entry is [ResourceId, number] => typeof entry[1] === 'number' && entry[1] > 0);

watch(
  choices,
  (available) => {
    if (available.some((quest) => quest.id === inspectedQuestId.value)) return;
    const preferred = campaign.value?.activeQuestId;
    inspectedQuestId.value =
      preferred && available.some((quest) => quest.id === preferred) ? preferred : (available[0]?.id ?? null);
  },
  { immediate: true },
);

function inspect(quest: Quest): void {
  inspectedQuestId.value = quest.id;
  if (!window.matchMedia('(width < 960px)').matches) return;
  void nextTick(() => detailRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
}

function commit(): void {
  const quest = inspectedQuest.value;
  if (!quest) return;
  try {
    runCommand('commitCampaignQuest', { id: props.campaignId, kind: 'campaign' }, quest.id);
  } catch (error) {
    notifyError('questBoard.chooseError', error);
  }
}

function returnToBoard(): void {
  boardHeadingRef.value?.focus();
  boardHeadingRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
</script>

<template>
  <div class="quest-decision" v-if="campaign">
    <section aria-labelledby="available-quests-title" class="quest-board">
      <header class="quest-board__heading">
        <ore-text variant="overline">{{ t('questBoard.eyebrow') }}</ore-text>
        <ore-text as="h3" id="available-quests-title" size="lg" tabindex="-1" variant="heading" ref="boardHeadingRef">
          {{ t('questBoard.title') }}
        </ore-text>
        <div class="quest-board__subtitle-row">
          <div class="quest-board__tools">
            <!-- The Nightmare variant rides the board: flip it between quests, and the
                 briefing below re-reflects the stance damage the next fight prints. The
                 choice count reads beside the toggle, which opens the row. -->
            <NightmareModeToggle :checked="usesNightmare" :disabled="!nightmareAvailable" @change="setNightmare" />
            <ore-chip size="sm" variant="outline">{{ tp('questBoard.choicesCount', choices.length) }}</ore-chip>
          </div>
          <ore-text color="muted">{{ t('questBoard.subtitle') }}</ore-text>
        </div>
      </header>

      <div class="quest-board__grid" v-if="choices.length">
        <ore-card
          class="quest-choice"
          interactive
          padding="none"
          v-for="quest in choices"
          :key="quest.id"
          :aria-label="t('questBoard.inspectAria', { name: quest.name, number: quest.number })"
          :aria-pressed="inspectedQuestId === quest.id"
          :class="{
            'quest-choice--active': questState(quest.id) === 'active',
            'quest-choice--viewing': inspectedQuestId === quest.id,
          }"
          @activate="inspect(quest)">
          <div class="quest-choice__layout">
            <div class="quest-choice__art">
              <img alt="" :src="asset(monsterById(quest.monsterId)?.trophyIcon ?? '')" />
              <span class="quest-choice__number">{{ t('questBoard.questNumber', { number: quest.number }) }}</span>
            </div>
            <div class="quest-choice__body">
              <ore-text as="h4" size="sm" variant="heading">{{ quest.name }}</ore-text>
              <ore-text color="muted" size="sm">{{ monsterById(quest.monsterId)?.name ?? quest.monsterId }}</ore-text>
              <ore-text color="muted" size="xs">{{ monsterById(quest.monsterId)?.habitat }}</ore-text>
              <div class="quest-choice__states">
                <ore-chip color="info" size="sm" variant="flat" v-if="questState(quest.id) === 'active'">
                  {{ t('questBoard.active') }}
                </ore-chip>
                <ore-chip size="sm" variant="outline" v-else>{{ t('questBoard.available') }}</ore-chip>
                <ore-chip color="secondary" size="sm" variant="solid" v-if="inspectedQuestId === quest.id">
                  {{ t('common.viewing') }}
                </ore-chip>
                <ore-chip color="warning" size="sm" variant="bordered" v-if="expiresNextChapter(quest)">
                  {{ t('questBoard.expiresSoon') }}
                </ore-chip>
              </div>
            </div>
          </div>
        </ore-card>
      </div>

      <div class="quest-board__empty" v-else>
        <ore-text as="h4" size="sm" variant="heading">{{ t('questBoard.emptyTitle') }}</ore-text>
        <ore-text color="muted">{{ t('questBoard.emptyHint') }}</ore-text>
      </div>

      <ore-accordion
        class="quest-history"
        selection-mode="multiple"
        size="sm"
        variant="text"
        v-if="completed.length || expired.length">
        <ore-accordion-item v-if="completed.length">
          <span slot="title">{{ t('questBoard.completedQuests') }}</span>
          <ore-chip size="sm" slot="suffix" variant="flat">{{ completed.length }}</ore-chip>
          <ul class="quest-history__list list-plain">
            <li v-for="quest in completed" :key="quest.id">
              <img alt="" :src="asset(monsterById(quest.monsterId)?.trophyIcon ?? '')" />
              <span>{{ t('questBoard.questNumber', { number: quest.number }) }} · {{ quest.name }}</span>
              <ore-chip color="success" size="sm" variant="outline">{{ t('questBoard.completed') }}</ore-chip>
            </li>
          </ul>
        </ore-accordion-item>
        <ore-accordion-item v-if="expired.length">
          <span slot="title">{{ t('questBoard.expiredQuests') }}</span>
          <ore-chip size="sm" slot="suffix" variant="flat">{{ expired.length }}</ore-chip>
          <ul class="quest-history__list list-plain">
            <li v-for="quest in expired" :key="quest.id">
              <img alt="" :src="asset(monsterById(quest.monsterId)?.trophyIcon ?? '')" />
              <span>{{ t('questBoard.questNumber', { number: quest.number }) }} · {{ quest.name }}</span>
              <ore-chip color="warning" size="sm" variant="outline">{{ t('questBoard.expired') }}</ore-chip>
            </li>
          </ul>
        </ore-accordion-item>
      </ore-accordion>
    </section>

    <aside
      aria-labelledby="quest-briefing-title"
      class="quest-briefing"
      id="quest-briefing"
      tabindex="-1"
      ref="detailRef">
      <template v-if="inspectedQuest && inspectedMonster">
        <header class="quest-briefing__hero">
          <img alt="" :src="asset(inspectedMonster.trophyIcon)" />
          <div>
            <ore-text variant="overline">{{ t('questBoard.questNumber', { number: inspectedQuest.number }) }}</ore-text>
            <ore-text as="h3" id="quest-briefing-title" size="md" variant="heading">{{ inspectedQuest.name }}</ore-text>
            <ore-text color="muted">{{ inspectedMonster.name }} · {{ inspectedMonster.habitat }}</ore-text>
          </div>
        </header>

        <section class="quest-briefing__section">
          <ore-text variant="overline">{{ t('questBoard.briefing') }}</ore-text>
          <ore-text class="quest-briefing__story" size="sm">{{ inspectedQuest.introduction }}</ore-text>
        </section>

        <section class="quest-briefing__section quest-briefing__section--monster">
          <MonsterInfo :monster="inspectedMonster" />
        </section>

        <section class="quest-briefing__section" v-if="currentDamage">
          <StanceTargets :aggression="currentAggression" :damage="currentDamage" />
        </section>

        <section class="quest-briefing__section">
          <ore-text variant="overline">{{ t('questBoard.rewards') }}</ore-text>
          <div class="quest-briefing__rewards">
            <ResourceIcon
              size="sm"
              v-for="[id, count] in rewardEntries(inspectedQuest)"
              :key="id"
              :count="count"
              :id="id" />
          </div>
          <ul class="quest-briefing__list" v-if="inspectedQuest.rewards.length">
            <li v-for="reward in inspectedQuest.rewards" :key="reward">{{ reward }}</li>
          </ul>
        </section>

        <section class="quest-briefing__section" v-if="inspectedQuest.expires">
          <ore-text variant="overline">{{ t('questBoard.expiration') }}</ore-text>
          <div class="cluster" style="--cluster-gap: 0.3rem">
            <ore-chip size="sm" variant="flat" v-for="label in questExpirationLabels(inspectedQuest)" :key="label">
              {{ t('questBoard.begins', { label }) }}
            </ore-chip>
          </div>
          <ore-accordion
            class="quest-briefing__disclosure"
            size="sm"
            variant="text"
            v-if="inspectedQuest.expiration.text">
            <ore-accordion-item>
              <span slot="title">{{ t('questBoard.expirationConsequence') }}</span>
              <ore-text size="sm">{{ inspectedQuest.expiration.text }}</ore-text>
              <ul class="quest-briefing__list" v-if="inspectedQuest.expiration.effects.length">
                <li v-for="effect in inspectedQuest.expiration.effects" :key="effect">{{ effect }}</li>
              </ul>
            </ore-accordion-item>
          </ore-accordion>
        </section>

        <ore-accordion class="quest-briefing__disclosure" size="sm" variant="text">
          <ore-accordion-item>
            <span slot="title">{{ t('questBoard.campaignContext') }}</span>
            <ore-text size="sm">{{ inspectedQuest.unlock }}</ore-text>
          </ore-accordion-item>
        </ore-accordion>

        <div class="quest-briefing__actions">
          <ore-button class="quest-briefing__back" size="sm" variant="ghost" @click="returnToBoard">
            {{ t('questBoard.backToQuests') }}
          </ore-button>
          <ore-button color="secondary" variant="solid" @click="commit">
            {{
              questState(inspectedQuest.id) === 'active'
                ? t('questBoard.continueToPrep')
                : t('questBoard.chooseQuest', { number: inspectedQuest.number })
            }}
          </ore-button>
        </div>
      </template>
      <div class="quest-board__empty" v-else>
        <ore-text as="h3" id="quest-briefing-title" size="sm" variant="heading">{{ t('questBoard.selectQuest') }}</ore-text>
        <ore-text color="muted">{{ t('questBoard.selectQuestHint') }}</ore-text>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.quest-decision {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(20rem, 0.72fr);
  gap: 1.5rem;
  align-items: start;
}

.quest-board,
.quest-briefing,
.quest-history {
  display: grid;
  gap: 1rem;
  min-width: 0;
}

.quest-board__heading {
  display: grid;
  gap: var(--size-1-5);
  max-width: min(100%, calc(var(--size-96) * 2));
  padding-block: var(--size-1) var(--size-3);
}

.quest-board__subtitle-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-4);
  align-items: center;
  justify-content: space-between;
}

/* The row's leading tools: the Nightmare toggle opens the row, the choice count beside
   it; the hint closes the row at the far end. */
.quest-board__tools {
  display: flex;
  gap: var(--size-3);
  align-items: center;
}

.quest-board__heading ore-text[variant='heading'] {
  --text-letter-spacing: var(--tracking-normal);
  font-family: var(--font-serif);
}

.quest-board__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.quest-choice {
  --card-shadow: none;
  min-width: 0;
  overflow: visible;
}

.quest-choice.quest-choice--viewing[aria-pressed='true'] {
  --card-bg: light-dark(oklch(98% 0.005 28), oklch(19% 0.005 28));
  --card-shadow: none;
  --quest-state-border: color-mix(in oklch, var(--p-blood) 60%, transparent);
  --quest-state-border-width: var(--border);
}

.quest-choice--active:not(.quest-choice--viewing) {
  --card-bg: light-dark(oklch(98% 0.003 230), oklch(19% 0.003 230));
  --quest-state-border: color-mix(in oklch, var(--p-river) 60%, transparent);
  --quest-state-border-width: var(--border);
}

.quest-choice__layout {
  position: relative;
  display: grid;
  grid-template-rows: auto 1fr;
  height: 100%;
}

.quest-choice__layout::after {
  position: absolute;
  inset: 0;
  z-index: 2;
  box-sizing: border-box;
  pointer-events: none;
  content: '';
  border: var(--quest-state-border-width, 0) solid var(--quest-state-border, transparent);
}

.quest-choice__art {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 8rem;
  background: linear-gradient(155deg, var(--p-panel-raised), var(--p-panel-sunken));
  border-bottom: var(--border) solid var(--p-line);
}

.quest-choice__art img {
  width: 5.25rem;
  height: 5.25rem;
  object-fit: contain;
  filter: drop-shadow(var(--drop-shadow-sm));
}

.quest-choice__number {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  padding: 0.2rem 0.4rem;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--p-text-strong);
  background: color-mix(in oklch, var(--p-panel) 88%, transparent);
}

.quest-choice__body {
  display: grid;
  gap: 0.3rem;
  padding: 0.75rem;
}

.quest-choice__states {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  align-items: center;
  min-height: 1.75rem;
  padding-top: 0.35rem;
}

.quest-briefing {
  position: sticky;
  top: 5rem;
  padding: 1.25rem;
  scroll-margin-top: 1rem;
  background: var(--p-panel-sunken);
  border: var(--border) solid var(--p-line);
  border-radius: var(--rounded-sm);
}

.quest-briefing__hero {
  display: grid;
  grid-template-columns: 5rem minmax(0, 1fr);
  gap: 0.75rem;
  align-items: center;
}

.quest-briefing__hero img {
  width: 5rem;
  height: 5rem;
  object-fit: contain;
  filter: drop-shadow(var(--drop-shadow-sm));
}

.quest-briefing__section {
  display: grid;
  gap: 0.6rem;
  padding-top: 0.85rem;
  border-top: var(--border) solid var(--p-line);
}

.quest-briefing__section--monster {
  gap: var(--size-2);
}

.quest-briefing__story {
  line-height: 1.6;
}

.quest-briefing__rewards {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.quest-briefing__list {
  display: grid;
  gap: 0.3rem;
  padding-left: 1.1rem;
  margin: 0;
  font-size: 0.8rem;
  color: var(--p-text-muted);
}

.quest-briefing__actions {
  display: grid;
  gap: 0.5rem;
  padding-top: 1rem;
  border-top: var(--border) solid var(--p-line);
}

.quest-briefing__back {
  display: none;
}

.quest-history {
  --accordion-divider-color: transparent;
  padding-top: 0.75rem;
}

.quest-history ore-accordion-item,
.quest-briefing__disclosure ore-accordion-item {
  --accordion-item-details-padding: var(--size-2) 0;
  --accordion-item-summary-padding: var(--size-1) 0;
}

.quest-history__list {
  display: grid;
  gap: 0.4rem;
  padding-top: 0.5rem;
}

.quest-history__list li {
  display: grid;
  grid-template-columns: 2.5rem minmax(0, 1fr) auto;
  gap: 0.5rem;
  align-items: center;
  min-height: 3rem;
}

.quest-history__list img {
  width: 2.25rem;
  height: 2.25rem;
  object-fit: contain;
}

.quest-board__empty {
  display: grid;
  gap: 0.35rem;
  place-content: center;
  min-height: 8rem;
  text-align: center;
}

@media (width >= 1200px) {
  .quest-board__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (width < 960px) {
  .quest-decision {
    grid-template-columns: 1fr;
  }

  .quest-briefing {
    position: static;
  }

  .quest-briefing__back {
    display: block;
  }
}

@media (width < 560px) {
  .quest-board__grid {
    grid-template-columns: 1fr;
  }

  .quest-choice__layout {
    grid-template-rows: minmax(0, 1fr);
    grid-template-columns: 6.5rem minmax(0, 1fr);
  }

  .quest-choice__art {
    min-height: 100%;
    border-right: var(--border) solid var(--p-line);
    border-bottom: 0;
  }

  .quest-choice__art img {
    width: 4.5rem;
    height: 4.5rem;
  }

  .quest-choice__number {
    font-size: 0.65rem;
  }

  .quest-briefing {
    padding: 1rem;
  }

  .quest-briefing__actions ore-button {
    width: 100%;
  }
}
</style>
