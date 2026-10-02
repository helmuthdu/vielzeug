<script lang="ts" setup>
import { asset } from '../../../app/assets';
import { t, tp } from '../../../app/i18n';
import { isEquipment, type WorkshopModel } from './use-workshop';
import '@vielzeug/refine/badge';
import '@vielzeug/refine/button';
import '@vielzeug/refine/list';
import '@vielzeug/refine/list-item';
import '@vielzeug/refine/tab-item';
import '@vielzeug/refine/tabs';
import '@vielzeug/refine/text';

defineProps<{ workshop: WorkshopModel }>();
</script>

<template>
  <aside class="recipe-shelf" :aria-label="t('forge.recipeShelf')">
    <div class="recipe-shelf__heading">
      <div>
        <ore-text as="h2" size="sm" variant="heading">
          {{ workshop.codexMode ? t('forge.recipeCodex') : t('forge.availableWork') }}
        </ore-text>
        <ore-text aria-live="polite" color="muted" role="status" size="sm">
          {{ tp('forge.familyCount', workshop.shelfItems.length) }}
        </ore-text>
      </div>
      <div class="recipe-shelf__controls">
        <template v-if="workshop.campaign && !workshop.codexMode">
          <ore-tabs
            class="recipe-shelf__scope"
            density="compact"
            variant="ghost"
            :label="t('forge.scopeLabel')"
            :value="workshop.scope"
            @change="workshop.changeScope"
          >
            <ore-tab-item slot="tabs" value="craftable">{{ t('forge.scopeCraftable') }}</ore-tab-item>
            <ore-tab-item slot="tabs" value="owned">{{ t('forge.scopeOwned') }}</ore-tab-item>
            <ore-tab-item slot="tabs" value="all">{{ t('forge.scopeAll') }}</ore-tab-item>
          </ore-tabs>
          <button class="recipe-shelf__codex" type="button" @click="workshop.setCodexMode(true)">
            {{ t('forge.browseCodex') }}
          </button>
        </template>
        <button class="recipe-shelf__codex" type="button" v-else-if="workshop.campaign" @click="workshop.setCodexMode(false)">
          {{ t('forge.backToWorkshop') }}
        </button>
      </div>
    </div>
    <div class="recipe-groups" v-if="workshop.shelfItems.length">
      <section class="recipe-group" v-for="group in workshop.shelfGroups" :key="group.label">
        <ore-text variant="overline">{{ group.label }}</ore-text>
        <ore-list
          class="recipe-group__items"
          selectable
          size="sm"
          variant="plain"
          :value="workshop.selectedItem?.key ?? ''"
          @change="workshop.selectFamilyFromList"
        >
          <ore-list-item class="recipe-choice" v-for="item in group.items" :key="item.key" :value="item.key">
            <div class="recipe-choice__identity">
              <div class="recipe-choice__icon-wrap">
                <i
                  aria-hidden="true"
                  class="recipe-choice__icon"
                  :style="{ '--recipe-icon': `url(${asset(workshop.recipeIcon(item.entry))})` }"
                ></i>
                <ore-badge
                  class="recipe-choice__upgrade-badge"
                  color="primary"
                  size="xs"
                  variant="flat"
                  v-if="workshop.scope === 'craftable' && item.upgradeAvailable"
                  :label="t('forge.upgradeBadge')"
                >
                  {{ t('forge.upgradeBadge') }}
                </ore-badge>
              </div>
              <div class="recipe-choice__copy">
                <strong>
                  {{ item.name }}
                  <span class="visually-hidden" v-if="workshop.selectedItem?.key === item.key">{{ t('forge.selectedSuffix') }}</span>
                </strong>
                <span class="recipe-choice__description">
                  {{ isEquipment(item.entry) ? workshop.discipline(item.entry) : t('forge.potionMeta') }} · {{ t('forge.levelLabel', { level: item.entry.level }) }}
                </span>
              </div>
            </div>
            <span class="recipe-choice__state" slot="trailing" :data-state="item.state">
              {{
                workshop.selectedItem?.key === item.key
                  ? t('forge.stateSelected')
                  : item.state === 'locked'
                    ? workshop.lockReason(item.entry)
                    : workshop.stateLabel[item.state]
              }}
            </span>
          </ore-list-item>
        </ore-list>
      </section>
    </div>
    <div class="empty-shelf stack" v-else>
      <ore-text as="h3" size="sm" variant="heading">{{ t('forge.emptyShelfTitle') }}</ore-text>
      <ore-text color="muted" size="sm">{{ t('forge.emptyShelfHint') }}</ore-text>
      <ore-button size="sm" variant="bordered" v-if="workshop.campaign && !workshop.codexMode" @click="workshop.scope = 'all'">
        {{ t('forge.showAllRelevant') }}
      </ore-button>
    </div>
  </aside>
</template>

<style scoped>
.recipe-shelf {
  overflow: hidden;
  background: var(--p-panel-sunken);
  border-right: 1px solid var(--p-line);
}

.recipe-shelf__heading {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 0.75rem;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1rem;
  background: var(--p-panel);
  border-bottom: 1px solid var(--p-line);
}

.recipe-shelf__controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.75rem;
  align-items: center;
}

.recipe-shelf__controls ore-tabs {
  --tabs-indicator-color: var(--color-info);
}

.recipe-shelf__controls ore-tab-item {
  --tab-item-color: var(--p-text-muted);
  --tab-item-hover-bg: var(--p-panel-sunken);
  --tab-item-active-bg: var(--p-panel-sunken);
  --tab-item-active-color: var(--p-text-strong);
  --tab-item-active-shadow: inset 0 0 0 var(--border) var(--p-line-strong);
}

.recipe-shelf__codex {
  padding: 0.2rem 0.35rem;
  font-family: inherit;
  font-size: var(--text-xs);
  color: var(--p-text-muted);
  white-space: nowrap;
  cursor: pointer;
  background: none;
  border: none;
}

.recipe-shelf__codex:hover {
  color: var(--p-text);
  text-decoration: underline;
}

.recipe-groups,
.recipe-group,
.recipe-group__items {
  display: grid;
  gap: 0.55rem;
}

.recipe-groups {
  gap: 1.15rem;
  max-height: min(61dvh, 52rem);
  padding: 1rem;
  overflow-y: auto;
  scrollbar-gutter: stable;
  overscroll-behavior: contain;
}

.recipe-choice {
  --list-item-bg: transparent;
  min-height: 4.75rem;
}

.recipe-choice::part(row) {
  color: var(--p-text-strong);
  border: var(--border-2) solid transparent;
  border-radius: var(--rounded-sm);
}

.recipe-choice[selected]::part(row) {
  border-color: light-dark(var(--color-primary-content), var(--p-gold));
}

.recipe-choice__icon {
  width: 2.75rem;
  height: 2.75rem;
  color: var(--p-gold-dim);
  background: currentcolor;
  mask: var(--recipe-icon) center / contain no-repeat;
  transition: color var(--p-motion) var(--p-ease);
}

.recipe-choice__icon-wrap {
  position: relative;
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 3.75rem;
  height: 2.75rem;
  margin-inline: -0.5rem;
}

.recipe-choice__upgrade-badge {
  position: absolute;
  bottom: var(--size-0-5);
  left: 50%;
  z-index: 1;
  transform: translateX(calc(-50% + var(--size-1)));
}

.recipe-choice__identity {
  width: 100%;
  min-width: 0;
}

.recipe-choice__identity {
  display: flex;
  gap: var(--size-3);
  align-items: center;
}

.recipe-choice__copy {
  display: grid;
  gap: var(--size-0-5);
  min-width: 0;
}

.recipe-choice[selected] .recipe-choice__icon {
  color: light-dark(var(--color-primary-content), var(--p-gold));
}

.recipe-choice strong,
.recipe-choice__description {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recipe-choice strong {
  line-height: 1.2;
}

.recipe-choice__description {
  font-size: 0.72rem;
  color: var(--text-muted);
}

.recipe-choice__state {
  display: inline-flex;
  gap: 0.35rem;
  align-items: center;
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1.2;
  color: var(--p-text-muted);
  text-align: right;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  white-space: nowrap;
}

.recipe-choice__state::before {
  flex-shrink: 0;
  width: 0.45rem;
  height: 0.45rem;
  content: '';
  background: currentcolor;
  border-radius: 50%;
}

.recipe-choice__state[data-state='craftable'],
.recipe-choice__state[data-state='owned'],
.recipe-choice__state[data-state='equipped'],
.recipe-choice__state[data-state='prepared'] {
  color: var(--p-moss);
}

.recipe-choice__state[data-state='locked'],
.recipe-choice__state[data-state='missing'] {
  color: var(--p-gold-dim);
}

.empty-shelf {
  place-items: start;
  padding: 2rem 1rem;
}

@media (width < 720px) {
  .recipe-shelf {
    border-right: 0;
  }

  .recipe-groups {
    max-height: none;
    padding-right: 0;
    overflow-y: visible;
  }
}
</style>
