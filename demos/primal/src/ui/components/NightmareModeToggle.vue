<script lang="ts" setup>
import { ref } from 'vue';
import { t } from '../../app/i18n';
import '@vielzeug/refine/button';
import '@vielzeug/refine/drawer';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/switch';
import '@vielzeug/refine/text';

/**
 * The Nightmare Mode switch every run surface shares: the bare toggle and its label, with the
 * printed explanation one tap away in a bottom drawer instead of a standing helper line.
 * The drawer names the enabling box while the run's shelves lack it.
 */
defineProps<{ checked: boolean; disabled?: boolean }>();
const emit = defineEmits<{ change: [on: boolean] }>();
const infoOpen = ref(false);

function onInfoChange(event: Event): void {
  if (event.target !== event.currentTarget) return;
  infoOpen.value = (event as CustomEvent<{ open: boolean }>).detail.open;
}
</script>

<template>
  <div class="nightmare-mode">
    <ore-switch color="error" size="sm" :checked="checked" :disabled="disabled"
      @change="emit('change', ($event.target as HTMLInputElement).checked)">
      {{ t('common.nightmareModeLabel') }}
    </ore-switch>
    <ore-button icon-only size="sm" variant="ghost" :label="t('common.nightmareInfoLabel')" @click="infoOpen = true">
      <ore-icon name="info" />
    </ore-button>
    <ore-drawer backdrop="blur" placement="bottom"
      style="--drawer-size: 28rem" :open="infoOpen" @open-change="onInfoChange">
      <!-- The rule sheet the terrain tokens read in, without its glyph: the mode's name as the
           sheet's title, its intro beneath, and the two printed special rules as the sheet's
           notes. The drawer's own chrome stays untitled, exactly as the terrain sheets' does. -->
      <article class="nightmare-rule">
        <ore-text as="h2" class="nightmare-rule__name" size="md" variant="heading">
          {{ t('common.nightmareModeLabel') }}
        </ore-text>
        <ore-text class="nightmare-rule__intro" color="muted" size="sm">
          {{ disabled ? t('common.nightmareHelperOff') : t('common.nightmareRuleIntro') }}
        </ore-text>
        <ul class="nightmare-rule__rules" v-if="!disabled">
          <li class="nightmare-rule__rule">
            <ore-text size="sm">{{ t('common.nightmareRuleStance') }}</ore-text>
          </li>
          <li class="nightmare-rule__rule">
            <ore-text size="sm">{{ t('common.nightmareRuleBehavior') }}</ore-text>
          </li>
        </ul>
      </article>
    </ore-drawer>
  </div>
</template>

<style scoped>
/* The bare toggle beside its information tap: one compact row, no standing helper. */
.nightmare-mode {
  display: flex;
  gap: var(--size-1);
  align-items: center;
}

/* The rule sheet reads as the terrain tokens' does, without their glyph: the title in
   the game's heading face, the intro beneath, and the printed rules in the centered
   column's notes list. */
.nightmare-rule {
  display: grid;
  gap: var(--size-3);
  max-width: 72ch;
  padding-block-end: var(--size-4);
  margin-inline: auto;
}

.nightmare-rule__name {
  font-family: var(--p-heading);
  line-height: var(--leading-tight);
}

.nightmare-rule__intro {
  line-height: var(--leading-snug);
}

.nightmare-rule__rules {
  display: grid;
  gap: var(--size-2);
  padding: 0;
  padding-inline-start: var(--size-5);
  margin: 0;
  list-style: disc;
}

.nightmare-rule__rule {
  padding-inline-start: var(--size-1);
  line-height: var(--leading-snug);
}
</style>
