<script lang="ts" setup>
/**
 * One mode's box requirement, in two weights. `locked` is the New Game card's quiet line :
 * the boxes the mode needs, so a player sees what to own before they tap. `inline` is the
 * create page's actionable banner: the boxes still missing from the shelf, each with its buy
 * link: shown only when the shelf cannot meet the requirement. Names resolve from the catalog;
 * the caller decides when to render this at all.
 */
import { t } from '../../../app/i18n';
import { expansionById } from '../../../content/index';
import type { ExpansionId } from '../../../domain/types';
import '@vielzeug/refine/alert';
import '@vielzeug/refine/button';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/text';

withDefaults(
  defineProps<{
    /** The boxes the mode needs. */
    required: readonly ExpansionId[];
    /** The needed boxes the shelf does not own. Empty when the mode is playable. */
    missing: readonly ExpansionId[];
    variant?: 'inline' | 'locked';
  }>(),
  { variant: 'inline' },
);

const nameOf = (id: ExpansionId): string => expansionById(id)?.name ?? id;
const names = (ids: readonly ExpansionId[]): string => ids.map(nameOf).join(', ');
const buyable = (id: ExpansionId): string | null => expansionById(id)?.purchaseUrl ?? null;
</script>

<template>
  <div class="req" :class="`req--${variant}`">
    <template v-if="variant === 'locked'">
      <ore-icon aria-hidden="true" name="lock" size="14" />
      <ore-text class="req__text" color="muted" size="xs">
        {{ t('expansionRequirement.needs', { boxes: names(required) }) }}
      </ore-text>
    </template>
    <ore-alert color="warning" size="sm" variant="flat" v-else >
      <ore-icon name="alert-triangle" slot="icon" />
      <div class="req__inline stack" style="--stack-gap: var(--size-2)">
        <ore-text size="sm">
          {{ t('expansionRequirement.missing', { boxes: names(missing) }) }}
        </ore-text>
        <div class="req__buys" v-if="missing.some((id) => buyable(id))">
          <ore-button
            color="primary"
            rel="noopener noreferrer"
            size="sm"
            target="_blank"
            variant="flat"
            v-for="id in missing.filter((entry) => buyable(entry))"
            :key="id"
            :href="buyable(id) ?? '#'"
            :label="t('expansionPicker.buyAria', { name: nameOf(id) })">
            <ore-icon name="shopping-cart" slot="prefix" />
            {{ t('expansionPicker.buy') }} {{ nameOf(id) }}
          </ore-button>
        </div>
      </div>
    </ore-alert>
  </div>
</template>

<style scoped>
.req--locked {
  display: inline-flex;
  gap: var(--size-1);
  align-items: center;
}

.req__buys {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-2);
}
</style>
