<script lang="ts" setup >
import {
  dedupeEntries,
  escapeRegExp,
  findMatchRanges,
  highlight,
  rankEntries,
  splitPattern,
} from '@vielzeug/scout';
import { createMeasurementCache, createVirtualizer, type MeasurementCache, type VirtualItem } from '@vielzeug/scroll';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch, watchPostEffect } from 'vue';
import { asset } from '../../app/assets';
import { type MessageKey, t, tp } from '../../app/i18n';
import { keywordIndex } from '../../app/search';
import { navigate, useRouteQuery } from '../../app/vue-bridge';
import {
  coloredCardTokens,
  gameIconArt,
  gameIcons,
  keywords,
  monsters,
  resources,
  SPECIAL_RULES,
  terrainRuleText,
  terrains,
} from '../../content';
import type { ResourceCategory } from '../../domain/types';
import PageHeader from '../components/PageHeader.vue';
import { splitIconTokens } from '../components/reference-text';
import '@vielzeug/refine/accordion';
import '@vielzeug/refine/accordion-item';
import '@vielzeug/refine/button';
import '@vielzeug/refine/card';
import '@vielzeug/refine/chip';
import '@vielzeug/refine/grid';
import '@vielzeug/refine/grid-item';
import '@vielzeug/refine/input';
import '@vielzeug/refine/text';

/** One searchable reference row: identified, labeled, with summary and body text. */
interface ManualSearchable {
  id: string;
  label: string;
  meta: string;
  text: string;
}

/** One renderable piece of a label or body paragraph. */
interface ManualSegment {
  /** Colored icon path: the card-type references, which keep their printed colors. */
  colored?: string;
  hit?: boolean;
  /** Monochrome icon path, painted in the text's color. */
  icon?: string;
  keyword?: boolean;
  /** The bracketed reference's name, kept as the glyph's accessible label. */
  label?: string;
  text?: string;
}

interface ManualEntry extends ManualSearchable {
  category: ManualCategory;
  /** Rulebook artwork for terrain tokens, monster trophies and resources. */
  icon?: string;
  /** Monochrome icon art, rendered as a mask in the text color: the theme-safe icon glyphs. */
  iconMono?: string;
  /** Namespaced per content source so ids that repeat across sources stay unique keys. */
  id: string;
  label: string;
  meta: string;
  /** Display lines: structured rule parts for terrain, a single paragraph otherwise. */
  parts: readonly string[];
  text: string;
}

const COLLAPSED_ROW_SIZE = 56;

const expanded = ref<ReadonlySet<string>>(new Set());
const scrollEl = ref<HTMLElement | null>(null);
const rows = shallowRef<readonly VirtualItem[]>([]);
const totalSize = shallowRef(0);
let virtualizer: ReturnType<typeof createVirtualizer> | null = null;
let measurementCache: MeasurementCache | null = null;
const ROUND_PHASE_KEYS = ['consume', 'monsterUpkeep', 'playerTurns', 'endOfRound'] as const;
const TURN_PHASE_KEYS = ['movement', 'playerAction', 'attrition', 'endOfTurn'] as const;
type ManualPhaseKey = (typeof ROUND_PHASE_KEYS)[number] | (typeof TURN_PHASE_KEYS)[number];
interface ManualPhase {
  hint: string;
  key: ManualPhaseKey;
  label: string;
}
const phaseList = (keys: readonly ManualPhaseKey[]): ManualPhase[] =>
  keys.map((key) => ({ hint: t(`manual.phaseHints.${key}`), key, label: t(`manual.roundPhases.${key}`) }));
const roundPhases = computed(() => phaseList(ROUND_PHASE_KEYS));
const turnPhases = computed(() => phaseList(TURN_PHASE_KEYS));

/** The manual's entry groups: the five content kinds plus the resource categories. */
type ManualCategory = 'Icon' | 'Keyword' | 'Monster' | 'Rule' | 'Terrain' | ResourceCategory;
const CATEGORY_KEY: Record<ManualCategory, MessageKey> = {
  element: 'manual.categories.element',
  Icon: 'manual.categories.icon',
  Keyword: 'manual.categories.keyword',
  Monster: 'manual.categories.monster',
  material: 'manual.categories.material',
  plant: 'manual.categories.plant',
  Rule: 'manual.categories.rule',
  Terrain: 'manual.categories.terrain',
};
const categoryLabel = (category: ManualCategory) => t(CATEGORY_KEY[category]);

const entries = computed<ManualEntry[]>(() =>
  dedupeEntries([
    ...keywords.map((item) => ({
      category: 'Keyword' as const,
      id: `keyword-${item.id}`,
      label: item.name,
      meta: item.scope ?? t('manual.rulesMeta'),
      parts: [item.text],
      text: item.text,
    })),
    ...gameIcons.map((item) => {
      // The icon table shows the glyph itself: colored art for the card types, a themed
      // monochrome mask for everything else the app carries.
      const art = gameIconArt[item.id];
      const colored = art !== undefined && coloredCardTokens[item.id] !== undefined;
      return {
        category: 'Icon' as const,
        icon: art !== undefined && colored ? asset(art) : undefined,
        iconMono: art !== undefined && !colored ? art : undefined,
        id: `icon-${item.id}`,
        label: item.name,
        meta: item.group === 'color' ? t('manual.iconMetaColor') : t('manual.iconMetaGeneral'),
        parts: [item.text],
        text: item.text,
      };
    }),
    ...Object.values(SPECIAL_RULES).map((item) => ({
      category: 'Rule' as const,
      id: `rule-${item.id}`,
      label: item.name,
      meta: t('manual.rulesMeta'),
      parts: [item.description],
      text: item.description,
    })),
    ...monsters.map((item) => ({
      category: 'Monster' as const,
      icon: asset(item.trophyIcon),
      id: `monster-${item.id}`,
      label: item.name,
      meta: item.element,
      parts: [item.description],
      text: item.description,
    })),
    ...terrains.map((item) => ({
      category: 'Terrain' as const,
      icon: item.icon ? asset(item.icon) : undefined,
      id: `terrain-${item.id}`,
      label: item.name,
      meta: item.rule.timing ?? (item.rule.status === 'verified' ? t('manual.rulesMeta') : t('huntSetup.ruleUnavailable')),
      parts: item.rule.status === 'verified' ? [item.rule.timing, item.rule.condition, item.rule.effect, ...item.rule.details].filter((part): part is string => Boolean(part)) : [item.rule.effect],
      text: terrainRuleText(item),
    })),
    ...resources.map((item) => {
      const text = t('manual.ledgerText', { name: item.name });
      return { category: item.category, icon: asset(item.icon), id: `resource-${item.id}`, label: item.name, meta: categoryLabel(item.category), parts: [text], text };
    }),
  ]),
);

/** Categories present in the catalog, in the order the entries list groups them. */
const categories = computed(() => [...new Set(entries.value.map((entry) => entry.category))]);

/** Longest keyword names first so "Stealthy beast" wins over "Stealth" inside body text. */
const keywordPattern = computed(() => {
  const names = [...keywords].sort((a, b) => b.name.length - a.name.length).map((item) => escapeRegExp(item.name));
  return new RegExp(`(${names.join('|')})`, 'g');
});
const keywordIdByName = new Map(keywords.map((item) => [item.name, `keyword-${item.id}`]));

const routeQuery = useRouteQuery();
const query = computed(() => {
  const raw = routeQuery.value.q;
  return typeof raw === 'string' ? raw : '';
});
const activeCategory = computed(() => {
  const raw = routeQuery.value.cat;
  return typeof raw === 'string' && raw ? raw : null;
});
const targetEntry = computed(() => {
  const raw = routeQuery.value.entry;
  return typeof raw === 'string' && raw ? raw : null;
});

const fuzzyIds = computed(() => new Set(keywordIndex.search(query.value.trim(), { limit: 12 }).map((hit) => `keyword-${hit.item.id}`)));

const matches = computed(() => {
  const text = query.value.trim();
  const ranked = text ? rankEntries(entries.value, text, { fuzzyIds: fuzzyIds.value }) : entries.value;
  return activeCategory.value ? ranked.filter((entry) => entry.category === activeCategory.value) : ranked;
});

const browsing = computed(() => !query.value.trim() && !activeCategory.value);

/** Windowed rows from the virtualizer, paired with their entry; grows by scrolling, not clicking. */
const virtualRows = computed(() =>
  rows.value.flatMap((row) => {
    const entry = matches.value[row.index];
    return entry ? [{ entry, start: row.start }] : [];
  }),
);

/** Default view browses the binder by section instead of one alphabetical dump. */
const browseGroups = computed(() =>
  categories.value.map((category) => ({
    category,
    entries: entries.value.filter((entry) => entry.category === category),
  })),
);

const openGroups = ref<ReadonlySet<string>>(new Set());

/** A deep-linked entry also throws open its section, or its row would stay inside a closed panel. */
const groupOpen = (group: { category: string; entries: readonly ManualEntry[] }) =>
  openGroups.value.has(group.category) ||
  (targetEntry.value !== null && group.entries.some((entry) => entry.id === targetEntry.value));

function onGroupExpand(event: Event, category: string): void {
  const open = (event.target as HTMLElement).hasAttribute('expanded');
  const next = new Set(openGroups.value);
  if (open) next.add(category);
  else next.delete(category);
  openGroups.value = next;
}

/** Near-misses for the empty state, straight from the fuzzy index. */
const didYouMean = computed(() => {
  if (query.value.trim() && !matches.value.length) {
    return keywordIndex
      .search(query.value.trim(), { limit: 3, threshold: 0.05 })
      .map((hit) => entries.value.find((entry) => entry.id === `keyword-${hit.item.id}`))
      .filter((entry): entry is ManualEntry => entry !== undefined);
  }
  return [];
});

function updateRoute(patch: Record<string, string | null>): void {
  const next: Record<string, string> = {};
  const raw = routeQuery.value;
  for (const key of ['q', 'cat', 'entry'] as const) {
    const current = raw[key];
    if (typeof current === 'string' && current) next[key] = current;
  }
  for (const [key, value] of Object.entries(patch)) {
    if (value) next[key] = value;
    else delete next[key];
  }
  // Same-route query sync: skip the router's page-wide view transition so typing stays instant.
  void navigate('manual', {}, next, { replace: true, viewTransition: false });
}

/** The accordion's own row duration: a reference jump waits it out, so its glide lands on
 *  the settled layout instead of chasing rows that are still opening around the target.
 *  Computed custom properties arrive normalized ("0.2s"), not as authored ("200ms"). */
function rowSettleMs(anchor?: HTMLElement | null): number {
  const raw = getComputedStyle(anchor ?? document.body).getPropertyValue('--accordion-item-row-duration').trim();
  const seconds = /^(\d*\.?\d+)s$/.exec(raw);
  if (seconds) return Number(seconds[1]) * 1000;
  const milliseconds = /^(\d*\.?\d+)ms$/.exec(raw);
  if (milliseconds) return Number(milliseconds[1]);
  return 200;
}

/** Reference jumps glide; the app's reduced-motion choice lands them instantly. */
function glideOrSnap(): ScrollBehavior {
  return document.documentElement.dataset.reducedMotion === 'true' ? 'auto' : 'smooth';
}

function focusEntry(id: string): void {
  expanded.value = new Set([...expanded.value, id]);
  void nextTick(() => {
    window.setTimeout(() => {
      const anchor = document.getElementById(`manual-entry-${id}`);
      // Browsing renders the accordion groups, not the virtualized list: the entry's own
      // anchor is the thing to scroll to; the hidden virtualizer would eat the call.
      if (browsing.value || !virtualizer) {
        anchor?.scrollIntoView({ behavior: glideOrSnap(), block: 'center' });
        return;
      }
      const index = matches.value.findIndex((entry) => entry.id === id);
      if (index !== -1) virtualizer.scrollToIndex(index, { align: 'center', behavior: glideOrSnap() });
      else anchor?.scrollIntoView({ behavior: glideOrSnap(), block: 'center' });
    }, rowSettleMs(document.getElementById(`manual-entry-${id}`)));
  });
}

function toggleEntry(id: string): void {
  const next = new Set(expanded.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  expanded.value = next;
}

// The scroll container stays mounted (v-show) so the virtualizer owns one element for its life.
// v-show means a hidden container reports a zero viewport and no resize event fires when it
// comes back, so every cycle re-reads the viewport before updating the result set.
// Stable identity: reads the live matches at call time, so the key-based measurement cache
// survives result changes instead of being cleared on every keystroke.
function itemKey(index: number): string | number {
  return matches.value[index]?.id ?? index;
}

function positionList(): void {
  // Read the reactive state before the guard: watchPostEffect only re-runs for
  // dependencies touched before its early return, and `virtualizer` is a plain let.
  const count = matches.value.length;
  const target = targetEntry.value;
  if (!virtualizer) return;
  virtualizer.remeasure();
  virtualizer.update({ count, getItemKey: itemKey });
  const index = target ? matches.value.findIndex((entry) => entry.id === target) : -1;
  if (index !== -1) {
    // The target's rows open around it while the page would already be gliding: wait out
    // the row duration, then glide, so the landing is on the settled layout.
    window.setTimeout(() => virtualizer?.scrollToIndex(index, { align: 'center', behavior: glideOrSnap() }), rowSettleMs());
  } else virtualizer.scrollToTop();
  // v-show's display change can land one frame after this post-effect, so the
  // measurements above may still see the hidden (zero) container. Re-check once
  // the browser has laid the new visibility out.
  requestAnimationFrame(() => virtualizer?.remeasure());
}

onMounted(() => {
  if (!scrollEl.value) return;
  measurementCache = createMeasurementCache();
  virtualizer = createVirtualizer(scrollEl.value, {
    autoMeasure: true,
    count: matches.value.length,
    estimateSize: COLLAPSED_ROW_SIZE,
    getItemKey: itemKey,
    measurementCache,
    onChange: (state) => {
      rows.value = state.items;
      totalSize.value = state.totalSize;
    },
    overscan: 6,
  });
  positionList();
});

onBeforeUnmount(() => {
  virtualizer?.dispose();
  virtualizer = null;
});

// Runs after the DOM settles: feed the virtualizer the new result set and position it :
// at a deep-linked entry when one is set, otherwise back at the top.
watchPostEffect(positionList);

// Deep links (?entry=…) open their entry; keyword links in bodies land here too.
watch(targetEntry, (id) => {
  if (id) focusEntry(id);
}, { immediate: true });

function onQuery(event: Event): void {
  const value = (event.target as HTMLInputElement).value;
  updateRoute({ entry: null, q: value || null });
}

function onCategory(category: string | null): void {
  updateRoute({ cat: category });
}

function clearQuery(): void {
  updateRoute({ q: null });
}

function onExpand(event: Event, id: string): void {
  const open = (event.target as HTMLElement).hasAttribute('expanded');
  const next = new Set(expanded.value);
  if (open) next.add(id);
  else next.delete(id);
  expanded.value = next;
}

function openEntry(nameOrId: string): void {
  const id = nameOrId.startsWith('keyword-') ? nameOrId : keywordIdByName.get(nameOrId);
  if (!id) return;
  if (targetEntry.value === id) focusEntry(id);
  else void navigate('manual', {}, { entry: id }, { viewTransition: false });
}

function segments(piece: string): ManualSegment[] {
  const needle = query.value.trim();
  return splitIconTokens(piece).flatMap((segment) =>
    typeof segment === 'string'
      ? splitPattern(segment, keywordPattern.value).flatMap((part) =>
          part.matched ? [{ keyword: true, text: part.text }] : highlightSegments(part.text, needle),
        )
      : [segment],
  );
}

/** Marks case-insensitive occurrences of the query as hits, using Scout's match ranges. */
function highlightSegments(text: string, rawQuery: string): ManualSegment[] {
  const needle = rawQuery.trim();
  if (!needle) return [{ text }];
  return highlight(text, findMatchRanges(text, needle)).map((part) => ({ hit: part.highlighted, text: part.text }));
}
</script>
<template>
  <div class="frame stack" style="--stack-gap: 1.5rem">
    <PageHeader :art="'/backgrounds/bg_story.webp'" :eyebrow="t('manual.eyebrow')" :subtitle="t('manual.subtitle')" :title="t('manual.title')" />

    <ore-grid align="start" areas="'side' 'manual'" areas-lg="'manual manual side'" cols="1" cols-lg="3" gap="lg" >
      <div style="grid-area: side">
        <ore-card aria-labelledby="phases-title">
          <div class="card-title" slot="header">
            <ore-text as="h2" id="phases-title" size="xs" variant="heading">{{ t('manual.phasesTitle') }}</ore-text>
          </div>
          <div class="stack" style="--stack-gap: 0.9rem">
            <div class="stack" style="--stack-gap: 0.5rem">
              <ore-text size="xs" variant="heading">{{ t('manual.round') }}</ore-text>
              <ol class="seq">
                <li class="seq__item" v-for="phase in roundPhases" :key="phase.key">
                  <span class="seq__label">{{ phase.label }}</span>
                  <span class="seq__hint">{{ phase.hint }}</span>
                </li>
              </ol>
            </div>
            <div class="stack" style="--stack-gap: 0.5rem">
              <ore-text size="xs" variant="heading">{{ t('manual.turn') }}</ore-text>
              <ol class="seq">
                <li class="seq__item" v-for="phase in turnPhases" :key="phase.key">
                  <span class="seq__label">{{ phase.label }}</span>
                  <span class="seq__hint">{{ phase.hint }}</span>
                </li>
              </ol>
              <ore-text color="muted" variant="caption">{{ t('manual.actionHint') }}</ore-text>
            </div>
          </div>
        </ore-card>
      </div>

      <ore-grid-item area="manual">
        <ore-card aria-labelledby="manual-title">
          <div class="card-title" slot="header" >
            <ore-text as="h2" id="manual-title" size="xs" variant="heading" >{{ t('manual.searchTitle') }}</ore-text>
            <ore-text aria-live="polite" class="manual__count" color="muted" variant="caption" >
              {{ browsing ? tp('manual.catalogCount', entries.length) : tp('manual.resultsCount', matches.length) }}
            </ore-text>
          </div>
          <div class="stack">
            <ore-input
              type="search"
              :aria-label="t('manual.inputLabel')"
              :placeholder="t('manual.placeholder')"
              :value="query"
              @input="onQuery"
              @keydown.escape="clearQuery" />
            <fieldset class="cluster manual__filters" style="--cluster-gap: 0.4rem; flex-wrap: wrap" :aria-label="t('manual.filterLabel')" >
              <ore-button
                class="manual__filter"
                size="sm"
                :aria-pressed="activeCategory === null"
                :label="t('manual.allCategories')"
                :variant="activeCategory === null ? 'solid' : 'ghost'"
                @click="onCategory(null)" >
                {{ t('manual.allCategories') }}
              </ore-button>
              <ore-button
                class="manual__filter"
                size="sm"
                v-for="category in categories"
                :key="category"
                :aria-pressed="activeCategory === category"
                :label="categoryLabel(category)"
                :variant="activeCategory === category ? 'solid' : 'ghost'"
                @click="onCategory(category)" >
                {{ categoryLabel(category) }}
              </ore-button>
            </fieldset>

            <div class="manual-scroll" v-show="!browsing" ref="scrollEl" >
              <div class="manual-sizer" :style="{ height: `${totalSize}px` }" >
                <div
                  class="manual-row"
                  v-for="{ entry, start } in virtualRows"
                  :key="entry.id"
                  :data-vz-key="entry.id"
                  :id="`manual-entry-${entry.id}`"
                  :style="{ transform: `translateY(${start}px)` }" >
                  <button
                    class="manual__head"
                    type="button"
                    :aria-expanded="expanded.has(entry.id)"
                    @click="toggleEntry(entry.id)" >
                    <img alt="" class="manual__icon" v-if="entry.icon" :src="entry.icon" />
<span aria-hidden="true" class="manual__glyph" v-else-if="entry.iconMono" :style="{ '--icon': `url(${asset(entry.iconMono)})` }" />
                    <ore-text class="manual__label" size="xs" variant="heading" >
                      <template v-for="(segment, index) in highlightSegments(entry.label, query)" :key="index" >
                        <mark v-if="segment.hit" >{{ segment.text }}</mark>
                        <template v-else >{{ segment.text }}</template>
                      </template>
                    </ore-text>
                    <ore-chip size="sm" variant="outline">{{ categoryLabel(entry.category) }}</ore-chip>
                    <ore-text class="manual__meta" color="muted" size="xs" v-if="entry.meta">{{ entry.meta }}</ore-text>
                  </button>
                  <div class="manual__body stack" style="--stack-gap: 0.25rem" v-if="expanded.has(entry.id)" >
                    <ore-text size="sm" v-for="(part, index) in entry.parts" :key="index" >
                      <template v-for="(segment, segIndex) in segments(part)" :key="segIndex" >
                        <mark v-if="segment.hit" >{{ segment.text }}</mark>
                        <button class="manual__keyword" type="button" v-else-if="segment.keyword" :aria-label="segment.text" @click="openEntry(segment.text!)" >{{ segment.text }}</button>
                        <img class="manual__token manual__token--colored" v-else-if="segment.colored" :alt="segment.label" :src="asset(segment.colored)" />
                        <span class="manual__token manual__token--mono" role="img" v-else-if="segment.icon" :aria-label="segment.label" :style="{ '--icon': `url(${asset(segment.icon)})` }" />
                        <template v-else >{{ segment.text }}</template>
                      </template>
                    </ore-text>
                  </div>
                </div>
              </div>
              <div class="manual__empty stack" style="--stack-gap: 0.5rem" v-if="!matches.length" >
                <ore-text color="muted" >{{ t('manual.empty', { query }) }}</ore-text>
                <fieldset class="cluster manual__means" style="--cluster-gap: 0.4rem; flex-wrap: wrap" v-if="didYouMean.length" :aria-label="t('manual.didYouMean')" >
                  <ore-text color="muted" variant="caption" >{{ t('manual.didYouMean') }}</ore-text>
                  <ore-button
                    class="manual__filter"
                    size="sm"
                    variant="ghost"
                    v-for="entry in didYouMean"
                    :key="entry.id"
                    :label="entry.label"
                    @click="openEntry(entry.id)" >
                    {{ entry.label }}
                  </ore-button>
                </fieldset>
              </div>
            </div>

            <ore-accordion
              class="manual-list"
              selection-mode="multiple"
              size="sm"
              variant="text"
              v-if="browsing" >
              <ore-accordion-item
                v-for="group in browseGroups"
                :key="group.category"
                :expanded="groupOpen(group)"
                @collapse="onGroupExpand($event, group.category)"
                @expand="onGroupExpand($event, group.category)" >
                <span class="cluster manual__head" slot="title" style="--cluster-gap: 0.5rem" >
                  <ore-text class="manual__label" size="xs" variant="heading" >{{ categoryLabel(group.category) }}</ore-text>
                  <ore-chip size="sm" variant="flat">{{ group.entries.length }}</ore-chip>
                </span>
                <ore-accordion selection-mode="multiple" size="sm" variant="text">
                  <ore-accordion-item
                    v-for="entry in group.entries"
                    :key="entry.id"
                    :expanded="expanded.has(entry.id)"
                    :id="`manual-entry-${entry.id}`"
                    @collapse="onExpand($event, entry.id)"
                    @expand="onExpand($event, entry.id)" >
                    <span class="cluster manual__head" slot="title" style="--cluster-gap: 0.5rem; flex-wrap: wrap" >
                      <img alt="" class="manual__icon" v-if="entry.icon" :src="entry.icon" />
<span aria-hidden="true" class="manual__glyph" v-else-if="entry.iconMono" :style="{ '--icon': `url(${asset(entry.iconMono)})` }" />
                      <ore-text class="manual__label" size="xs" variant="heading" >{{ entry.label }}</ore-text>
                      <ore-text class="manual__meta" color="muted" size="xs" v-if="entry.meta">{{ entry.meta }}</ore-text>
                    </span>
                    <span class="manual__body stack" style="--stack-gap: 0.25rem">
                      <ore-text size="sm" v-for="(part, index) in entry.parts" :key="index" >
                        <template v-for="(segment, segIndex) in segments(part)" :key="segIndex" >
                          <mark v-if="segment.hit" >{{ segment.text }}</mark>
                          <button class="manual__keyword" type="button" v-else-if="segment.keyword" :aria-label="segment.text" @click="openEntry(segment.text!)" >{{ segment.text }}</button>
                          <img class="manual__token manual__token--colored" v-else-if="segment.colored" :alt="segment.label" :src="asset(segment.colored)" />
                          <span class="manual__token manual__token--mono" role="img" v-else-if="segment.icon" :aria-label="segment.label" :style="{ '--icon': `url(${asset(segment.icon)})` }" />
                          <template v-else >{{ segment.text }}</template>
                        </template>
                      </ore-text>
                    </span>
                  </ore-accordion-item>
                </ore-accordion>
              </ore-accordion-item>
            </ore-accordion>
          </div>
        </ore-card>
      </ore-grid-item>
    </ore-grid>
  </div>
</template>

<style scoped>
/* The list only becomes its own scroll region once the two-column layout kicks in;
   on small screens it flows with the page so nested scrolling cannot trap touch. */
.manual-list {
  padding-right: 0;
  overflow-y: visible;
}

@media (min-width: 1024px) {
  .manual-list {
    max-height: 60dvh;
    padding-right: 0.25rem;
    overflow-y: auto;
  }
}

/* Search results are windowed by @vielzeug/scroll: the container is the scroll
   element, the sizer carries the full height, and each row is pinned by transform.
   Only mounted while searching (v-show), so browse mode keeps normal page flow. */
.manual-scroll {
  max-height: 60dvh;
  overflow-y: auto;
  overscroll-behavior: contain;
}

/* The chip groups are fieldsets (accessible grouping); strip the UA chrome.
   They sit in a .stack grid, so their margin must stay zero. */
.manual__filters,
.manual__means {
  min-inline-size: 0;
  padding: 0;
  margin: 0;
  border: 0;
}

.manual-sizer {
  position: relative;
  width: 100%;
}

.manual-row {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  border-bottom: 1px solid var(--p-line);
  will-change: transform;
}

.manual__head {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  width: 100%;
  padding: var(--size-3) var(--size-2);
  font: inherit;
  text-align: start;
  cursor: pointer;
  background: none;
  border: 0;
}

.manual__head:focus-visible {
  outline: var(--border-2) solid currentcolor;
  outline-offset: var(--border-2);
}

.manual__body {
  padding: 0 var(--size-2) var(--size-3);
}

.manual__icon {
  width: 1.4rem;
  height: 1.4rem;
  object-fit: contain;
  filter: drop-shadow(var(--drop-shadow-xs));
}

/* Monochrome icon-table glyphs paint in the text color, so they follow the theme. */
.manual__glyph {
  flex: none;
  width: 1.4rem;
  height: 1.4rem;
  background: currentcolor;
  filter: drop-shadow(var(--drop-shadow-xs));
  mask: var(--icon) center / contain no-repeat;
}

/* The rulebook's bracketed references, printed as the glyphs they stand for: the same
   inline grammar as card text: the icon replaces a word, so it tracks the text's size.
   The card-type references keep their printed colors; the rest mask into the text color. */
.manual__token {
  display: inline-block;
  width: 1.15em;
  height: 1.15em;
  vertical-align: -0.22em;
}

.manual__token--mono {
  background: currentcolor;
  mask: var(--icon) center / contain no-repeat;
}

.manual__token--colored {
  object-fit: contain;
}

.manual__label {
  --text-color: var(--p-gold);
}

.manual__label :where(mark),
.manual__body :where(mark) {
  color: inherit;
  background: color-mix(in srgb, var(--p-gold) 28%, transparent);
}

.manual__keyword {
  padding: 0;
  font: inherit;
  color: var(--p-gold);
  text-decoration: underline;
  text-decoration-color: var(--p-line-strong);
  text-underline-offset: 0.15em;
  cursor: pointer;
  background: none;
  border: 0;
}

.manual__meta {
  font-style: italic;
}

.manual__filter {
  --button-padding-block: 0.15rem;
  --button-padding-inline: var(--size-2);
}

.manual__empty {
  padding: var(--size-3) var(--size-2);
}

.seq {
  display: grid;
  gap: 0.6rem;
  padding: 0;
  margin: 0;
  list-style: none;
  counter-reset: seq;
}

.seq__item {
  display: grid;
  grid-template-rows: auto auto;
  grid-template-columns: auto 1fr;
  gap: 0.1rem 0.75rem;
  align-items: center;
  counter-increment: seq;
}

.seq__item::before {
  display: grid;
  grid-row: span 2;
  place-items: center;
  width: 1.6rem;
  height: 1.6rem;
  font-size: 0.75rem;
  color: var(--p-gold);
  content: counter(seq);
  border: 1px solid var(--p-line-strong);
}

.seq__label {
  font-family: var(--p-heading);
  font-size: 0.95rem;
  color: var(--p-text-strong);
}

.seq__hint {
  font-size: 0.8rem;
  line-height: 1.35;
  color: var(--p-text-muted);
}
</style>
