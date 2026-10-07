<script lang="ts" setup>
import { t } from '../../app/i18n';
import '@vielzeug/refine/button';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/menu';

/**
 * The dock's actions menu: the phone's action cluster as a grid of cards. Every phase
 * action is an action (Open Forge, Edit decks, Share build), so the menu wears the name;
 * the panel opens upward over the dock showing the whole set at once as equal-sized
 * cards, three per row, no scroller to fight for three-to-six actions. One pick runs
 * one action: the item's value is the pick. The menu's own keyboard pattern (arrows
 * walk, Enter runs, Esc closes) carries through unchanged.
 */
const emit = defineEmits<{ select: [value: string] }>();

function onSelect(event: Event): void {
  emit('select', (event as CustomEvent<{ value: string }>).detail.value);
}
</script>

<template>
  <ore-menu class="dock-actions-menu" placement="top" :label="t('dock.actionsLabel')" @select="onSelect">
    <ore-button rounded="xl" size="sm" slot="trigger" variant="ghost" :label="t('dock.actionsLabel')">
      {{ t('dock.actionsLabel') }}
      <ore-icon name="chevron-down" slot="suffix" />
    </ore-button>
    <slot />
  </ore-menu>
</template>

<style scoped>
/* The panel floats over arbitrary content carrying a grid of text: frost it denser
   than the canvas wash (refine's canvas token is 85% translucent) so the cards read
   over busy content, the dock bar's own recipe. */
.dock-actions-menu {
  --menu-panel-bg: color-mix(in oklch, var(--p-canvas) 94%, transparent);
}

/* The panel becomes the action grid: three equal columns of cards, the full set on
   screen at once (three to six actions: no scroller earns its keep here). An explicit
   width makes the 1fr tracks share it equally instead of following the content. */
.dock-actions-menu::part(panel) {
  box-sizing: border-box;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--size-1-5);
  width: min(21rem, calc(100vw - var(--size-4)));
  padding: var(--size-2);
}

/* A separator spans the grid's whole width, keeping the desktop's two clusters apart. */
.dock-actions-menu :deep(ore-menu-separator) {
  grid-column: 1 / -1;
}

/* Each action: an equal card, the glyph over its verb, centered, the label wrapping to
   two lines at most. The menu's own hover and focus states ride on top. The item parts
   live one boundary deeper than the panel: route through the item host. */
.dock-actions-menu :deep(ore-menu-item::part(item)) {
  flex-direction: column;
  gap: var(--size-1);
  align-items: center;
  justify-content: center;
  min-height: var(--size-20);
  padding: var(--size-2);
  text-align: center;
  white-space: normal;
  border: var(--border) solid var(--p-line);
  border-radius: var(--rounded-md);
}

.dock-actions-menu :deep(ore-menu-item::part(icon-slot)) {
  display: flex;
  justify-content: center;
}

/* The glyph is the card's face now that it rides on top: give it tile weight. */
.dock-actions-menu :deep(ore-menu-item ore-icon) {
  --ore-icon-size: var(--size-6);
}

.dock-actions-menu :deep(ore-menu-item::part(item-label)) {
  display: -webkit-box;
  flex: none;
  -webkit-box-orient: vertical;
  overflow: hidden;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  white-space: normal;
}
</style>
