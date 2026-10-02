<script lang="ts" setup>
import { computed } from 'vue';
import { asset } from '../../../app/assets';
import { t, tp } from '../../../app/i18n';
import { useMediaQuery } from '../../../app/vue-bridge';
import { SKILL_STEPS, stepCardCount, stepCards } from '../../../content';
import { pendingUpgrades, type SkillProgress, type SkillStepStatus, stepStatus } from '../../../domain/skill-tree';
import type { Hunter, HunterCard, SkillBranchId, SkillStep } from '../../../domain/types';
import HunterCardTile from './HunterCardTile.vue';
import '@vielzeug/refine/badge';
import '@vielzeug/refine/button';
import '@vielzeug/refine/drawer';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/text';

/**
 * Sheet for one upgrade branch: both steps with the cards each adds to the hunter's pool. The upgrade
 * action for the step the hunt currently lets the player choose stays anchored in the drawer footer.
 */
const props = defineProps<{
  branch: SkillBranchId | null;
  canChoose: boolean;
  hunter: Hunter;
  member: SkillProgress;
}>();
const emit = defineEmits<{
  close: [];
  inspect: [card: HunterCard];
  upgrade: [branch: SkillBranchId, step: SkillStep];
}>();

const wide = useMediaQuery('(min-width: 768px)');

function onOpenChange(event: Event): void {
  if (event.target !== event.currentTarget) return;
  if (!(event as CustomEvent<{ open: boolean }>).detail.open) emit('close');
}

interface StepView {
  adds: string;
  cards: HunterCard[];
  note: string | null;
  status: SkillStepStatus;
  step: SkillStep;
}

const pending = computed(() => pendingUpgrades(props.member));

/** Why a locked step is locked: a missing prerequisite level, a granted upgrade waiting for Preparation, or no grant yet. */
function lockedNote(branch: SkillBranchId, step: SkillStep): string {
  if (props.member.skillTree[branch] + 1 !== step) return t('party.stepRequiresPrevious');
  return pending.value > 0 ? t('party.upgradeWaitPreparing') : t('party.stepRequiresGrant');
}

const steps = computed<StepView[]>(() => {
  if (!props.branch) return [];
  const branch = props.branch;
  return SKILL_STEPS.map((step) => {
    const status = stepStatus(props.member, branch, step, props.canChoose);
    return {
      adds: t(step === 1 ? 'party.stepAdds1' : 'party.stepAdds2'),
      cards: stepCards(props.hunter, branch, step),
      note: status === 'locked' ? lockedNote(branch, step) : null,
      status,
      step,
    };
  });
});

const availableStep = computed(() => steps.value.find((view) => view.status === 'available')?.step ?? null);
const addedCount = computed(() =>
  steps.value.filter((view) => view.status === 'unlocked').reduce((total, view) => total + stepCardCount(view.step), 0),
);

const statusLabel = (status: SkillStepStatus) =>
  status === 'unlocked'
    ? t('party.stepUnlocked')
    : status === 'available'
      ? t('party.stepAvailable')
      : t('party.stepLocked');

// Mirrors the branch track: unlocked is a filled gold dot, available an outlined one.
const statusColor = (status: SkillStepStatus): 'primary' | undefined => (status === 'locked' ? undefined : 'primary');
const statusVariant = (status: SkillStepStatus): 'flat' | 'solid' => (status === 'unlocked' ? 'solid' : 'flat');
const statusIcon = (status: SkillStepStatus) =>
  status === 'unlocked' ? 'check' : status === 'available' ? 'sparkles' : 'lock';

const placeholderCount = (step: SkillStep, cards: HunterCard[]) => Math.max(0, stepCardCount(step) - cards.length);

const fullyUpgraded = computed(() => steps.value.length > 0 && steps.value.every((s) => s.status === 'unlocked'));
const cardMask = computed(
  () =>
    `url(${asset(fullyUpgraded.value ? '/icons/icon_skill_card_focused_empty.svg' : '/icons/icon_skill_card_empty.svg')})`,
);
</script>

<template>
  <ore-drawer
    backdrop="blur"
    :label="branch ? t('party.branchSheetAria', { id: branch, name: hunter.name }) : undefined"
    :open="branch !== null"
    :placement="wide ? 'right' : 'bottom'"
    :style="{ '--drawer-size': wide ? '30rem' : 'min(48rem, 92dvh)' }"
    @open-change="onOpenChange">
    <template v-if="branch">
      <div class="sheet__head" slot="header">
        <span
          aria-hidden="true"
          class="sheet__id"
          :class="{ 'sheet__id--maxed': fullyUpgraded }"
          :style="{ '--card-mask': cardMask }">
          {{ branch }}
        </span>
        <div class="sheet__title">
          <ore-text as="h2" size="md" variant="heading">{{ t('party.branch', { id: branch }) }}</ore-text>
          <ore-text color="muted" size="sm">{{ hunter.name }}</ore-text>
        </div>
      </div>

      <article class="sheet">
        <section class="step" v-for="view in steps" :key="view.step" :data-status="view.status">
          <header class="step__head">
            <ore-text as="h3" class="step__name" size="sm" variant="heading">
              {{ t('party.step', { step: view.step }) }}
            </ore-text>
            <ore-badge size="xs" :color="statusColor(view.status)" :variant="statusVariant(view.status)">
              <ore-icon aria-hidden="true" size="11" :name="statusIcon(view.status)" />
              {{ statusLabel(view.status) }}
            </ore-badge>
          </header>
          <ore-text class="step__adds" color="muted" size="sm">{{ view.adds }}</ore-text>

          <div class="step__cards">
            <HunterCardTile
              v-for="card in view.cards"
              :key="card.id"
              :card="card"
              :muted="view.status === 'locked'"
              @inspect="emit('inspect', $event)" />
            <span
              class="step__blank"
              v-for="index in placeholderCount(view.step, view.cards)"
              :key="`blank-${index}`"
              :class="{ 'step__blank--muted': view.status === 'locked' }">
              {{ t('party.cardNoScan') }}
            </span>
          </div>

          <ore-text class="step__note" color="muted" size="sm" v-if="view.note">{{ view.note }}</ore-text>
        </section>
      </article>

      <div class="sheet__foot" slot="footer">
        <ore-text color="muted" size="sm">
          {{ tp('party.cardsAdded', addedCount) }}
          <template v-if="pending > 0"> · {{ tp('party.pendingUpgrades', pending) }}</template>
        </ore-text>
        <ore-button
          color="primary"
          fullwidth
          v-if="availableStep !== null"
          @click="emit('upgrade', branch, availableStep)">
          <ore-icon aria-hidden="true" name="arrow-up-circle" slot="prefix" />
          {{ t('party.upgradeTo', { step: availableStep }) }}
        </ore-button>
      </div>
    </template>
  </ore-drawer>
</template>

<style scoped>
.sheet {
  display: grid;
  gap: var(--size-5);
  padding-block-end: var(--size-2);
}

.sheet__head {
  display: flex;
  gap: var(--size-3);
  align-items: center;
  min-width: 0;
  white-space: normal;
}

.sheet__id {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: var(--size-10);
  height: var(--size-14);
  font-family: var(--p-heading);
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: light-dark(oklch(95% 0 0deg), oklch(90% 0 0deg));
  letter-spacing: 0.06em;
  background: light-dark(oklch(35% 0 0deg), oklch(42% 0 0deg));
  border: var(--border) solid transparent;
  border-radius: var(--rounded-sm);
  mask: var(--card-mask) center / contain no-repeat;
}

.sheet__id--maxed {
  color: light-dark(oklch(98% 0 0deg), oklch(25% 0 0deg));
  background: var(--p-gold);
  border-color: var(--p-gold-dim);
}

.sheet__title {
  display: grid;
  gap: var(--size-0-5);
  min-width: 0;
}

.sheet__title ::part(content) {
  font-family: var(--p-heading);
  line-height: var(--leading-tight);
}

.step {
  display: grid;
  gap: var(--size-2);
}

.step + .step {
  padding-block-start: var(--size-4);
  border-top: var(--border) solid var(--p-line);
}

.step__head {
  display: flex;
  gap: var(--size-2);
  align-items: center;
  justify-content: space-between;
}

.step__name ::part(content) {
  font-family: var(--p-heading);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.step__adds {
  margin-block-start: calc(-1 * var(--size-1));
}

/* Three cells so Level 1 (2 cards) and Level 2 (2 cards + mastery) render tiles at one size. */
.step__cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--size-2);
}

.step__blank {
  display: grid;
  place-items: center;
  aspect-ratio: 61 / 85;
  padding: var(--size-2);
  font-size: var(--text-xs);
  color: var(--p-text-muted);
  text-align: center;
  text-wrap: balance;
  border: var(--border) dashed var(--p-line);
  border-radius: var(--rounded-md);
}

.step__blank--muted {
  opacity: 0.6;
}

.step__note {
  font-style: italic;
}

.sheet__foot {
  display: grid;
  gap: var(--size-2);
  width: 100%;
}
</style>
