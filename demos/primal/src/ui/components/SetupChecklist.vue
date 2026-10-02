<script lang="ts" setup >
import { asset } from '../../app/assets';
import { type MessageKey, t } from '../../app/i18n';
import type { ChecklistItem, ChecklistSection } from '../../domain/expedition';
import '@vielzeug/refine/checkbox';
import '@vielzeug/refine/grid';
import '@vielzeug/refine/text';

defineProps<{ sections: ChecklistSection[] }>();

/** Sector names shown as the detail of a terrain row. */
const SECTOR_KEY: Record<string, MessageKey> = {
  edges: 'battlefield.edges',
  front: 'battlefield.front',
  'left-flank': 'battlefield.leftFlank',
  rear: 'battlefield.back',
  'right-flank': 'battlefield.rightFlank',
};

/**
 * Checklist rows by their normalised id. Rows absent here (terrain tiles, per-hunter
 * names, special rules, monster components) carry content-side text and stay verbatim.
 */
const ITEM_KEY: Record<string, MessageKey> = {
  attrition: 'setupChecklist.item.attrition',
  behavior: 'setupChecklist.item.behavior',
  board: 'setupChecklist.item.board',
  decks: 'setupChecklist.item.decks',
  equipment: 'setupChecklist.item.equipment',
  'first-player': 'setupChecklist.item.firstPlayer',
  miniature: 'setupChecklist.item.miniature',
  'monster-board': 'setupChecklist.item.monsterBoard',
  'round-marker': 'setupChecklist.item.roundMarker',
  stance: 'setupChecklist.item.stance',
  tokens: 'setupChecklist.item.tokens',
};

/** The helper line under a row; empty catalog entries keep the content-side detail. */
const DETAIL_KEY: Record<string, MessageKey> = {
  behavior: 'setupChecklist.detail.behavior',
  decks: 'setupChecklist.detail.decks',
  equipment: 'setupChecklist.detail.equipment',
  hunter: 'setupChecklist.detail.hunter',
  miniature: 'setupChecklist.detail.miniature',
  'monster-board': 'setupChecklist.detail.monsterBoard',
  stance: 'setupChecklist.detail.stance',
};

/** Strips the index suffix that makes repeated rows unique: terrain-2 → terrain. */
const baseOf = (id: string): string =>
  id.replace(/^terrain-\d+$/, 'terrain').replace(/^hunter-/, 'hunter').replace(/^rule-\d+$/, 'rule');

const sectionTitle = (section: ChecklistSection): string => t(`setupChecklist.section.${section.id}`);

const itemLabel = (item: ChecklistItem): string => {
  const baseId = baseOf(item.id);
  const key = ITEM_KEY[baseId];
  if (!key) return item.label;
  if (baseId === 'miniature' || baseId === 'monster-board') return t(key, { name: item.label.split(' ')[0] });
  if (baseId === 'stance') return t(key, { aggression: item.label.split(' ').pop() ?? '' });
  return t(key);
};

const itemDetail = (item: ChecklistItem): string | undefined => {
  if (!item.detail) return undefined;
  const baseId = baseOf(item.id);
  if (baseId === 'terrain') {
    const sector = SECTOR_KEY[item.detail];
    return sector ? t(sector) : item.detail;
  }
  const key = DETAIL_KEY[baseId];
  if (!key) return item.detail;
  const translated = baseId === 'hunter' ? t(key, { weapon: item.detail.split(' · ')[0] }) : t(key);
  return translated === '' ? item.detail : translated;
};
</script>

<template>
  <ore-grid align="start" gap="lg" min-col-width="17rem" responsive >
    <section class="stack" style="--stack-gap: 0.5rem; align-content: start" v-for="section in sections" :key="section.id" :aria-labelledby="`chk-${section.id}`" >
      <ore-text as="h3" class="checklist__title" size="xs" variant="heading" :id="`chk-${section.id}`">{{ sectionTitle(section) }}</ore-text>
      <ore-checkbox class="check" color="primary" v-for="item in section.items" :key="item.id" :helper="itemDetail(item)" >
        <span class="check__label">
          <i
            aria-hidden="true"
            class="glyph check__glyph"
            v-if="item.icon?.startsWith('/icons/icon_weapon_')"
            :style="{ '--glyph': `url(${asset(item.icon)})` }"></i>
          <img alt="" class="check__icon" v-else-if="item.icon" :src="asset(item.icon)" />
          {{ itemLabel(item) }}
        </span>
      </ore-checkbox>
    </section>
  </ore-grid>
</template>

<style scoped>
.checklist__title {
  padding-bottom: 0.4rem;
  border-bottom: 1px solid var(--p-line);
}

.check__label {
  display: inline-flex;
  gap: 0.5rem;
  align-items: center;
}

.check__glyph {
  width: 1.25rem;
  height: 1.25rem;
  color: var(--p-gold);
}

.check__icon {
  width: 1.5rem;
  height: 1.5rem;
  object-fit: contain;
}
</style>
