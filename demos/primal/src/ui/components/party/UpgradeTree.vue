<script lang="ts" setup>
import { computed } from 'vue';
import { asset } from '../../../app/assets';
import { t, tp } from '../../../app/i18n';
import { SKILL_BRANCH_IDS, SKILL_STEPS, stepCards } from '../../../content';
import { pendingUpgrades, type SkillProgress, type SkillStepStatus, stepStatus } from '../../../domain/skill-tree';
import type { Hunter, SkillBranchId } from '../../../domain/types';
import '@vielzeug/refine/badge';
import '@vielzeug/refine/button';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/text';

/**
 * Five-row overview of a hunter's card-pool upgrades (branches A–E, two steps each). Rows open the
 * branch sheet; the header says whether the hunt has granted an upgrade that still has to be chosen.
 * Works for every mode that grants skill points: the phase policy arrives as `canChoose`.
 */
const props = defineProps<{ canChoose: boolean; hunter: Hunter; member: SkillProgress }>();
const emit = defineEmits<{ open: [branch: SkillBranchId] }>();

const pending = computed(() => pendingUpgrades(props.member));
const lead = computed(() => {
  if (pending.value === 0) return t('party.upgradeWaitCampaign');
  return props.canChoose ? t('party.upgradeIntro') : t('party.upgradeWaitPreparing');
});

interface Row {
  available: boolean;
  fullyUpgraded: boolean;
  id: SkillBranchId;
  steps: SkillStepStatus[];
  summary: string;
}

const rows = computed<Row[]>(() =>
  SKILL_BRANCH_IDS.map((id) => {
    const progress = props.member.skillTree[id];
    const steps = SKILL_STEPS.map((step) => stepStatus(props.member, id, step, props.canChoose));
    const unlocked = SKILL_STEPS.filter((step) => progress >= step).flatMap((step) => stepCards(props.hunter, id, step));
    const count = props.hunter.skillTree
      .find((branch) => branch.id === id)
      ?.steps.slice(0, progress)
      .reduce((total, step) => total + step.cardCount, 0);
    const summary = unlocked.length
      ? unlocked.map((card) => card.name).join(' · ')
      : count
        ? tp('party.cardsAdded', count)
        : '';
    return { available: steps.includes('available'), fullyUpgraded: steps.every((s) => s === 'unlocked'), id, steps, summary };
  }),
);

const statusLabel = (status: SkillStepStatus) =>
  status === 'unlocked'
    ? t('party.stepUnlocked')
    : status === 'available'
      ? t('party.stepAvailable')
      : t('party.stepLocked');

const rowAria = (row: Row) =>
  t('party.branchAria', {
    id: row.id,
    steps: row.steps.map((status, index) => `${t('party.step', { step: index + 1 })} ${statusLabel(status)}`).join(', '),
  });
</script>

<template>
  <div class="upgrades" :class="{ 'upgrades--with-aside': $slots.aside }">
    <div class="upgrades__aside-heading" v-if="$slots['aside-heading']">
      <slot name="aside-heading" />
    </div>
    <div class="upgrades__head">
      <ore-text variant="overline">{{ t('party.upgrades') }}</ore-text>
      <ore-badge class="upgrades__pending" color="primary" size="sm" variant="solid" v-if="pending > 0">
        {{ tp('party.pendingUpgrades', pending) }}
      </ore-badge>
    </div>
    <div class="upgrades__aside-description" v-if="$slots['aside-description']">
      <slot name="aside-description" :color="pending > 0 && canChoose ? undefined : 'muted'" />
    </div>
    <ore-text class="upgrades__lead" size="sm" :color="pending > 0 && canChoose ? undefined : 'muted'">
      {{ lead }}
    </ore-text>

    <div class="upgrades__aside-card" v-if="$slots.aside">
      <slot name="aside" />
    </div>

    <ul class="upgrades__list">
      <li v-for="row in rows" :key="row.id">
        <ore-button
          class="branch"
          fullwidth
          variant="ghost"
          :class="{ 'branch--available': row.available }"
          :label="rowAria(row)"
          @click="emit('open', row.id)">
          <span aria-hidden="true" class="branch__row">
            <span
              class="branch__id"
              :class="{ 'branch__id--maxed': row.fullyUpgraded }"
              :style="{ '--card-mask': `url(${asset(row.fullyUpgraded ? '/icons/icon_skill_card_focused_empty.svg' : '/icons/icon_skill_card_empty.svg')})` }">
              {{ row.id }}
            </span>
            <span class="branch__track">
              <span class="branch__dot" v-for="(status, index) in row.steps" :key="index" :data-status="status">
                <ore-icon name="check" size="10" v-if="status === 'unlocked'" />
              </span>
            </span>
            <ore-badge class="branch__flag" color="primary" size="xs" variant="flat" v-if="row.available">
              {{ t('party.stepAvailable') }}
            </ore-badge>
            <span class="branch__summary" :class="{ 'branch__summary--empty': !row.summary }">
              {{ row.summary || t('party.branchEmpty') }}
            </span>
            <ore-icon class="branch__chevron" name="chevron-right" size="16" />
          </span>
        </ore-button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.upgrades {
  display: grid;
  gap: var(--size-2);
  min-width: 0;
}

.upgrades__head {
  display: flex;
  gap: var(--size-2);
  align-items: center;
  justify-content: space-between;
  min-height: var(--size-6);
}

.upgrades__pending {
  flex-shrink: 0;
}

.upgrades__lead {
  text-wrap: pretty;
}

.upgrades--with-aside {
  grid-template-rows: auto auto minmax(0, 1fr);
  grid-template-columns: minmax(0, 0.6fr) minmax(0, 1.2fr);
  row-gap: var(--size-2);
  column-gap: var(--size-5);
}

.upgrades__aside-heading {
  display: flex;
  grid-row: 1;
  grid-column: 1;
  align-items: center;
  min-width: 0;
  min-height: var(--size-6);
}

.upgrades--with-aside .upgrades__head {
  grid-row: 1;
  grid-column: 2;
}

.upgrades__aside-description {
  grid-row: 2;
  grid-column: 1;
  min-width: 0;
}

.upgrades--with-aside .upgrades__lead {
  grid-row: 2;
  grid-column: 2;
}

.upgrades__aside-card {
  display: grid;
  grid-row: 3;
  grid-column: 1;
  align-items: start;
  min-width: 0;
}

.upgrades__list {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--size-1);
  min-width: 0;
  padding: 0;
  margin: 0;
  list-style: none;
}

.upgrades--with-aside .upgrades__list {
  grid-row: 3;
  grid-column: 2;
}

.branch {
  --button-justify: stretch;
  --button-padding: var(--size-2) var(--size-2) var(--size-2) var(--size-1-5);
  --button-radius: var(--rounded-sm);
  --button-color: var(--p-text);
}

.branch::part(button) {
  height: auto;
  min-height: var(--size-11);
  white-space: normal;
}

.branch::part(content) {
  flex: 1;
  min-width: 0;
  white-space: normal;
}

.branch--available {
  --button-bg: var(--p-gold-faint);
  --button-border-color: color-mix(in oklch, var(--color-primary) 45%, transparent);
}

.branch__row {
  display: grid;
  grid-template-areas:
    'id track flag chevron'
    'id summary summary chevron';
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  gap: var(--size-1) var(--size-2-5);
  align-items: center;
  width: 100%;
  text-align: start;
}

.branch__id {
  display: grid;
  grid-area: id;
  place-items: center;
  width: var(--size-7);
  height: var(--size-11);
  font-family: var(--p-heading);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: light-dark(oklch(95% 0 0deg), oklch(90% 0 0deg));
  letter-spacing: 0.06em;
  background: light-dark(oklch(35% 0 0deg), oklch(42% 0 0deg));
  border: var(--border) solid transparent;
  border-radius: var(--rounded-sm);
  mask: var(--card-mask) center / contain no-repeat;
}

.branch__id--maxed {
  color: light-dark(oklch(98% 0 0deg), oklch(25% 0 0deg));
  background: var(--p-gold);
  border-color: var(--p-gold-dim);
}

.branch__track {
  --_dot: var(--size-4);
  position: relative;
  display: flex;
  grid-area: track;
  gap: var(--size-4);
  align-items: center;
  justify-self: start;
}

.branch__track::before {
  position: absolute;
  inset-inline: calc(var(--_dot) / 2);
  top: 50%;
  height: var(--border);
  content: '';
  background: var(--p-line-strong);
}

.branch__dot {
  position: relative;
  display: grid;
  place-items: center;
  width: var(--_dot);
  height: var(--_dot);
  color: var(--p-panel);
  background: var(--p-panel);
  border: var(--border-2) solid var(--p-line-strong);
  border-radius: var(--rounded-full);
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast);
}

.branch__dot[data-status='unlocked'] {
  background: var(--p-gold);
  border-color: var(--p-gold);
}

.branch__dot[data-status='available'] {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 var(--size-1) color-mix(in oklch, var(--color-primary) 25%, transparent);
}

.branch__flag {
  grid-area: flag;
  white-space: nowrap;
}

.branch__summary {
  grid-area: summary;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--text-xs);
  font-weight: var(--font-normal);
  line-height: var(--leading-snug);
  color: var(--p-text-muted);
  white-space: nowrap;
}

.branch__summary--empty {
  font-style: italic;
}

.branch__chevron {
  grid-area: chevron;
  color: var(--p-text-muted);
}

@media (width < 560px) {
  .upgrades--with-aside {
    grid-template-rows: auto auto auto auto auto auto;
    grid-template-columns: 1fr;
  }

  .upgrades__aside-heading {
    grid-row: 1;
    grid-column: 1;
  }

  .upgrades--with-aside .upgrades__head {
    grid-row: 4;
    grid-column: 1;
  }

  .upgrades__aside-description {
    grid-row: 2;
    grid-column: 1;
  }

  .upgrades--with-aside .upgrades__lead {
    grid-row: 5;
    grid-column: 1;
  }

  .upgrades__aside-card {
    grid-row: 3;
    grid-column: 1;
  }

  .upgrades--with-aside .upgrades__list {
    grid-row: 6;
    grid-column: 1;
  }
}

</style>
