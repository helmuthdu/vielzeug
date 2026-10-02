<script lang="ts" setup>
import { computed } from 'vue';
import { t } from '../../../app/i18n';
import HunterIdentity from '../../components/party/HunterIdentity.vue';
import ResourceIcon from '../../components/ResourceIcon.vue';
import type { WorkshopModel } from './use-workshop';
import '@vielzeug/refine/box';
import '@vielzeug/refine/button';
import '@vielzeug/refine/card';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/text';

const props = defineProps<{ workshop: WorkshopModel }>();

const categoryLabel = (category: 'element' | 'material' | 'plant'): string =>
  t(
    category === 'element'
      ? 'forge.categoryElement'
      : category === 'material'
        ? 'forge.categoryMaterial'
        : 'forge.categoryPlant',
  );

/** One resolved row per seat: the identity line, the player at the table, and the affordability
 *  dot against the selected recipe. */
const seats = computed(() => {
  const workshop = props.workshop;
  return (workshop.campaign?.hunters ?? []).map((member) => ({
    canCraft: workshop.seatCanCraft(member.hunterId),
    hunter: workshop.hunterById(member.hunterId),
    hunterId: member.hunterId,
    playerName: member.playerName,
  }));
});
</script>

<template>
  <ore-card class="resource-tray" padding="sm" v-if="workshop.campaign && workshop.selectedMember && workshop.selectedHunter">
    <fieldset class="bench" :aria-label="t('forge.craftingHunter')">
      <button
        class="bench__seat"
        type="button"
        v-for="seat in seats"
        :key="seat.hunterId"
        :aria-pressed="workshop.selectedMember.hunterId === seat.hunterId ? 'true' : 'false'"
        @click="workshop.selectedHunterId = seat.hunterId"
      >
        <HunterIdentity v-if="seat.hunter" :hunter="seat.hunter" :player-name="seat.playerName" />
        <span class="bench__seat-fallback" v-else>{{ seat.hunterId }}</span>
        <span
          aria-hidden="true"
          class="bench__seat-dot"
          :data-affordable="seat.canCraft ? 'true' : 'false'"
        ></span>
        <span class="visually-hidden">
          {{
            seat.canCraft
              ? t('forge.seatCanCraft', { name: workshop.selectedEntry?.name ?? '' })
              : t('forge.seatCannotCraft', { name: workshop.selectedEntry?.name ?? '' })
          }}
        </span>
      </button>
      <div class="bench__station">
        <span class="bench__station-label">
          {{ workshop.mode === 'forge' ? t('forge.modeForge') : t('forge.modeHerbalist') }}
          · {{ t('forge.lvShort', { level: workshop.activeWorkshopLevel }) }}
        </span>
        <span class="bench__station-hint">{{ t('forge.levelGating', { level: workshop.activeWorkshopLevel }) }}</span>
      </div>
      <ore-button
        aria-describedby="trade-unavailable"
        class="bench__trade"
        size="sm"
        variant="bordered"
        v-if="workshop.campaign.hunters.length > 1"
        :disabled="!workshop.defaultTrade"
        @click="workshop.openTrade"
      >
        <ore-icon name="arrow-right-left" size="14" slot="prefix" />
        {{ t('forge.trade') }}
      </ore-button>
    </fieldset>

    <section aria-labelledby="pouch-title" class="resource-wallet">
      <ore-text as="h3" id="pouch-title" variant="overline">{{ t('forge.pouch') }}</ore-text>
      <dl class="resource-wallet__groups">
        <template v-for="group in workshop.walletGroups" :key="group.category">
          <dt class="resource-wallet__category">{{ categoryLabel(group.category) }}</dt>
          <dd class="resource-wallet__group">
            <template v-for="resource in group.items" :key="resource.id">
              <span
                :class="{
                  'resource-wallet__item--missing': resource.count === 0,
                  'resource-wallet__item--pending': resource.spent > 0,
                }"
                :title="resource.spent > 0 ? `${resource.count} → ${resource.count - resource.spent}` : undefined"
              >
                <ResourceIcon size="sm" :count="resource.count - resource.spent" :id="resource.id" />
              </span>
              <span aria-hidden="true" class="resource-wallet__delta" v-if="resource.spent > 0">
                ← {{ resource.count }}
              </span>
            </template>
          </dd>
        </template>
      </dl>
      <ore-text color="muted" size="sm" v-if="!workshop.walletGroups.length">{{ t('forge.empty') }}</ore-text>
      <span
        class="resource-wallet__trade-reason"
        id="trade-unavailable"
        v-if="workshop.campaign.hunters.length > 1 && !workshop.defaultTrade"
      >
        {{ t('forge.tradeUnavailable') }}
      </span>
    </section>
  </ore-card>

  <ore-box padding="sm" variant="flat" v-else>
    <div class="cluster" style="justify-content: space-between">
      <div class="stack" style="--stack-gap: 0.2rem">
        <ore-text variant="overline">{{ t('forge.codex') }}</ore-text>
        <ore-text size="sm">{{ t('forge.codexHint') }}</ore-text>
      </div>
    </div>
  </ore-box>
</template>

<style scoped>
.resource-tray {
  box-sizing: border-box;
  min-width: 0;
}

.bench {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  align-items: stretch;
  min-width: 0;
  padding: 0;
  margin: 0;
  border: 0;
}

.bench__seat {
  display: inline-flex;
  flex: 1 1 0;
  gap: 0.5rem;
  align-items: center;
  min-width: 0;
  padding: 0.25rem 0.65rem 0.25rem 0.25rem;
  font-family: inherit;
  text-align: start;
  cursor: pointer;
  background: var(--p-panel-sunken);
  border: var(--border) solid transparent;
  border-radius: var(--rounded-sm);
  transition:
    background var(--p-motion) var(--p-ease),
    border-color var(--p-motion) var(--p-ease);
}

.bench__seat:hover {
  background: color-mix(in oklch, var(--p-gold) 6%, var(--p-panel-sunken));
}

/* The selected seat gilds the identity's glyph like the shelf's chosen recipe. */
.bench__seat[aria-pressed='true'] {
  --hunter-identity-glyph-color: light-dark(var(--color-primary-content), var(--p-gold));
  background: color-mix(in oklch, var(--p-gold) 10%, var(--p-panel));
  border-color: light-dark(var(--color-primary-content), var(--p-gold));
}

/* The rare fallback: a member whose hunter the library no longer knows. */
.bench__seat-fallback {
  font-size: var(--text-sm);
  font-weight: 600;
}

.bench__seat-dot {
  flex-shrink: 0;
  width: 0.55rem;
  height: 0.55rem;
  margin-left: auto;
  border-radius: 50%;
}

.bench__seat-dot[data-affordable='true'] {
  background: var(--p-moss);
}

.bench__seat-dot[data-affordable='false'] {
  border: var(--border-2) solid var(--p-text-muted);
}

.bench__station {
  display: grid;
  flex: 0 0 auto;
  gap: 0.15rem;
  align-self: center;
  justify-items: end;
  padding: 0 0.4rem;
}

.bench__station-label {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--p-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

.bench__station-hint {
  max-width: 12rem;
  font-size: var(--text-xs);
  color: var(--p-text-muted);
  text-align: end;
}

.bench__trade {
  flex: 0 0 auto;
  align-self: center;
}

.resource-wallet {
  display: grid;
  gap: 0.35rem;
  min-width: 0;
  margin-top: 0.65rem;
}

.resource-wallet__groups {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.3rem 0.75rem;
  align-items: center;
  margin: 0;
}

.resource-wallet__group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.45rem;
  align-items: center;
  margin: 0;
}

.resource-wallet__category {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--p-text-muted);
  text-align: end;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.resource-wallet__item--missing {
  opacity: 0.55;
}

.resource-wallet__item--pending {
  outline: 1px dashed var(--p-gold-dim);
  outline-offset: 2px;
  border-radius: var(--rounded-sm);
}

.resource-wallet__delta {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--p-gold-dim);
}

.resource-wallet__trade-reason {
  max-width: 16rem;
  font-size: var(--text-xs);
  color: var(--text-muted);
}

@media (width < 720px) {
  .bench__seat {
    flex-basis: calc(50% - 0.2rem);
  }

  .bench__station {
    flex: 0 1 auto;
    justify-items: start;
    padding-inline: 0.25rem;
  }

  .bench__station-hint {
    text-align: start;
  }
}
</style>
