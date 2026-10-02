<script lang="ts" setup>
import type { HighlightPart } from '@vielzeug/scout';
import { dedupeEntries, findMatchRanges, highlight, rankEntries } from '@vielzeug/scout';
import { computed, ref, useId } from 'vue';
import { asset } from '../../../app/assets';
import { t, tp } from '../../../app/i18n';
import { keywordIndex } from '../../../app/search';
import {
  gameIcons,
  keywords,
  monsters,
  resources,
  SPECIAL_RULES,
  terrains,
} from '../../../content';
import type { ResourceCategory } from '../../../domain/types';
import { type ReferenceIconToken, splitIconTokens } from '../reference-text';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/input';
import '@vielzeug/refine/text';

interface RuleSearchEntry {
  id: string;
  label: string;
  parts: readonly string[];
  scope: string;
  text: string;
}

/** Table-side version of the Reference catalog: type a term, read its entry without leaving the board. */
const uid = useId();
const query = ref('');
const resourceScope = (category: ResourceCategory): string =>
  t(`manual.categories.${category}` as 'manual.categories.element' | 'manual.categories.material' | 'manual.categories.plant');
const paragraphParts = (text: string): string[] => {
  if (text.length < 180) return [text];
  return text.split(/(?<=[.!?])\s+(?=[A-Z“])/u).map((part) => part.trim()).filter(Boolean);
};
const makeEntry = (id: string, label: string, scope: string, parts: readonly string[]): RuleSearchEntry => ({
  id,
  label,
  parts,
  scope,
  text: parts.join(' '),
});
const all = computed<RuleSearchEntry[]>(() => {
  const entries = [
    ...keywords.map((item) =>
      makeEntry(`keyword-${item.id}`, item.name, item.scope ?? t('manual.rulesMeta'), paragraphParts(item.text)),
    ),
    ...gameIcons.map((item) =>
      makeEntry(
        `icon-${item.id}`,
        item.name,
        item.group === 'color' ? t('manual.iconMetaColor') : t('manual.iconMetaGeneral'),
        paragraphParts(item.text),
      ),
    ),
    ...Object.values(SPECIAL_RULES).map((item) =>
      makeEntry(`rule-${item.id}`, item.name, t('manual.rulesMeta'), paragraphParts(item.description)),
    ),
    ...monsters.map((item) => makeEntry(`monster-${item.id}`, item.name, item.element, paragraphParts(item.description))),
    ...terrains.map((item) => {
      const parts =
        item.rule.status === 'verified'
          ? [item.rule.timing, item.rule.condition, item.rule.effect, ...item.rule.details].filter(
              (part): part is string => Boolean(part),
            )
          : [item.rule.effect];
      return makeEntry(
        `terrain-${item.id}`,
        item.name,
        item.rule.timing ?? (item.rule.status === 'verified' ? t('manual.rulesMeta') : t('huntSetup.ruleUnavailable')),
        parts,
      );
    }),
    ...resources.map((item) =>
      makeEntry(
        `resource-${item.id}`,
        item.name,
        resourceScope(item.category),
        [t('manual.ledgerText', { name: item.name })],
      ),
    ),
  ];
  return dedupeEntries(entries).sort((a, b) => a.label.localeCompare(b.label));
});
const rankable = computed(() => all.value.map((entry) => ({ ...entry, meta: entry.scope })));
const fuzzyIds = computed(
  () => new Set(keywordIndex.search(query.value.trim(), { limit: 12 }).map((hit) => `keyword-${hit.item.id}`)),
);

const results = computed<RuleSearchEntry[]>(() => {
  const text = query.value.trim();
  if (!text) return all.value;
  return rankEntries(rankable.value, text, { fuzzyIds: fuzzyIds.value });
});

const onInput = (event: Event): void => {
  query.value = (event.target as HTMLInputElement).value;
};

const segments = (value: string) => highlight(value, findMatchRanges(value, query.value.trim()));
const descriptionSegments = (value: string): Array<ReferenceIconToken | HighlightPart> =>
  splitIconTokens(value).flatMap((segment): Array<ReferenceIconToken | HighlightPart> =>
    typeof segment === 'string'
      ? highlight(segment, findMatchRanges(segment, query.value.trim()))
      : [segment],
  );
</script>

<template>
  <section class="rs" :aria-labelledby="`${uid}-title`">
    <ore-text as="h3" class="rs__heading" size="sm" variant="heading" :id="`${uid}-title`">
      {{ t('ruleSearch.title') }}
    </ore-text>
    <ore-input
      class="rs__input"
      type="search"
      :aria-label="t('ruleSearch.inputLabel')"
      :placeholder="t('ruleSearch.placeholder')"
      :value="query"
      @input="onInput">
      <ore-icon aria-hidden="true" name="search" slot="prefix" />
    </ore-input>
    <ore-text aria-live="polite" class="rs__count" color="muted" size="xs" >
      {{ tp('ruleSearch.count', results.length) }}
    </ore-text>
    <ul class="rs__list list-plain">
      <li class="rs__item" v-for="entry in results" :key="entry.id">
        <ore-text as="h4" class="rs__name" size="sm" variant="heading">
          <template v-for="(segment, index) in segments(entry.label)" :key="index">
            <mark v-if="segment.highlighted">{{ segment.text }}</mark>
            <template v-else>{{ segment.text }}</template>
          </template>
          <ore-text as="span" class="rs__scope" color="muted" size="xs" v-if="entry.scope">{{ entry.scope }}</ore-text>
        </ore-text>
        <div class="rs__description">
          <ore-text class="rs__text" size="xs" v-for="(part, partIndex) in entry.parts" :key="partIndex">
            <template v-for="(segment, index) in descriptionSegments(part)" :key="index">
              <img
                class="rs__token rs__token--colored"
                v-if="'kind' in segment && segment.kind === 'icon' && segment.colored"
                :alt="segment.label"
                :src="asset(segment.colored)" />
              <span
                class="rs__token rs__token--mono"
                role="img"
                v-else-if="'kind' in segment && segment.kind === 'icon' && segment.icon"
                :aria-label="segment.label"
                :style="{ '--icon': `url(${asset(segment.icon)})` }" />
              <mark v-else-if="'highlighted' in segment && segment.highlighted">
                {{ segment.text }}
              </mark>
              <template v-else-if="'text' in segment">{{ segment.text }}</template>
            </template>
          </ore-text>
        </div>
      </li>
      <li class="rs__empty" v-if="results.length === 0">
        <ore-text color="muted" size="sm">{{ t('ruleSearch.empty', { query }) }}</ore-text>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.rs {
  --rs-tile-bg: var(--p-panel-sunken);
  --rs-tile-line: var(--p-line);
  --rs-list-max: 24rem;
  /* Hosts set `size` when the list must fill a grid cell instead of sizing it (its content is long). */
  --rs-list-contain: none;

  display: flex;
  flex-direction: column;
  gap: var(--size-3);
  min-width: 0;
}

.rs__heading {
  font-family: var(--p-heading);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--p-text-muted);
  text-transform: uppercase;
  letter-spacing: var(--p-tracking);
}

.rs__count {
  margin-block-start: calc(-1 * var(--size-1));
}

.rs__list {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: var(--size-2);
  min-block-size: 0;
  max-block-size: var(--rs-list-max);
  padding-block-end: var(--size-2);
  padding-inline-end: var(--size-1);
  contain: var(--rs-list-contain);
  overflow-y: auto;
  scrollbar-gutter: stable;
  border-block-end: var(--border) solid var(--rs-tile-line);
}

.rs__item {
  display: flex;
  flex-direction: column;
  gap: var(--size-1);
  min-width: 0;
  padding: var(--size-3);
  background: var(--rs-tile-bg);
  border: var(--border) solid var(--rs-tile-line);
  border-radius: var(--rounded-lg);
}

.rs__name {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-2);
  align-items: baseline;
  font-family: var(--p-heading);
  line-height: var(--leading-tight);
}

.rs__scope {
  font-weight: var(--font-normal);
}

.rs__text {
  line-height: var(--leading-snug);
}

.rs__description {
  display: grid;
  gap: var(--size-1-5);
}

.rs__name :where(mark),
.rs__text :where(mark) {
  color: inherit;
  background: color-mix(in srgb, var(--p-gold) 28%, transparent);
}

.rs__token {
  display: inline-block;
  width: 1.15em;
  height: 1.15em;
  vertical-align: -0.22em;
}

.rs__token--mono {
  background: currentcolor;
  mask: var(--icon) center / contain no-repeat;
}

.rs__token--colored {
  object-fit: contain;
}

.rs__empty {
  padding: var(--size-3);
  border: var(--border) dashed var(--rs-tile-line);
  border-radius: var(--rounded-lg);
}
</style>
