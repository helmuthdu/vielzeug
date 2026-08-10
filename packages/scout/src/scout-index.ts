import type { FieldDef, FieldMatch, ScoutIndexOptions, SearchConstraints, SearchResult } from './types';

import { registerIndexRevision } from './_index-state';
import { ScoutConfigurationError } from './errors';
import { findMatchRanges } from './highlight';
import { defaultStringify, tokenize } from './tokenize';
import { generateTrigrams, overlapSimilarity } from './trigram';

type FieldConfig<T> = {
  field: keyof T & string;
  stringify: (v: unknown) => string;
  weight: number;
};

type ItemRecord = {
  /** Per-field trigrams for scoring. */
  trigrams: Map<string, Set<string>>;
  /** Per-field original text for highlighting. */
  values: Map<string, string>;
};

/**
 * A stateful, indexed search corpus. Created via `createIndex()`.
 *
 * Supports incremental `add()`, `remove()`, and `reindex()` operations — each patches
 * the trigram index in O(field_length) without a full rebuild.
 */
export interface ScoutIndex<T> {
  /** All items currently in the index, in insertion order. */
  readonly items: readonly T[];
  /** Number of items currently in the index. */
  readonly size: number;
  /** Adds `item` to the index. No-op if the item is already indexed (by reference). */
  add(item: T): void;
  /**
   * Re-reads the item's current field values and rebuilds its index entry in-place,
   * only updating fields whose values have changed. Preserves insertion order.
   * No-op if the item is not in the index.
   */
  reindex(item: T): void;
  /**
   * Removes `item` from the index by reference equality.
   * No-op if the item is not in the index.
   */
  remove(item: T): void;
  /**
   * Reconciles the index to `items` by reference identity. Retained items are reindexed,
   * new items are added, missing items are removed, and one mutation notification fires
   * when indexed corpus or field values change. Duplicate references collapse to one item.
   */
  setItems(items: readonly T[]): void;
  /**
   * Searches the index for `query` and returns results sorted by score descending.
   *
   * An empty (or whitespace-only) `query` returns all indexed items with `score = 1`.
   * A `query` with no indexable content after normalization (e.g. punctuation-only) returns
   * no results. Results below `threshold` are excluded. At most `limit` results are returned.
   */
  search(query: string, options?: SearchConstraints): SearchResult<T>[];
  /**
   * Subscribes `listener` to be called after every changed `add()` / `remove()` / `reindex()`
   * / `setItems()` operation. No-ops — e.g. removing an unindexed item or reconciling an
   * unchanged corpus — do not fire it. Each changed `setItems()` reconciliation fires once.
   * Returns an unsubscribe function.
   *
   * Framework-agnostic extension point: `createSearch()` uses this internally to keep
   * reactive `results` in sync with index mutations. Most callers won't need this directly.
   */
  onMutate(listener: () => void): () => void;
}

function requireFiniteInteger(value: number, name: string, minimum: number): number {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < minimum) {
    throw new ScoutConfigurationError(`${name} must be a finite integer greater than or equal to ${minimum}.`);
  }

  return value;
}

function requireFiniteNumber(value: number, name: string, minimum: number, maximum = Number.POSITIVE_INFINITY): number {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new ScoutConfigurationError(`${name} must be a finite number between ${minimum} and ${maximum}.`);
  }

  return value;
}

function resolveFields<T>(defs: ReadonlyArray<FieldDef<T>>): FieldConfig<T>[] {
  return defs.map((def) => {
    if (typeof def === 'string') {
      return { field: def, stringify: defaultStringify, weight: 1 };
    }

    return {
      field: def.field,
      stringify: def.stringify ?? defaultStringify,
      weight: requireFiniteNumber(def.weight ?? 1, `weight for field "${def.field}"`, Number.MIN_VALUE),
    };
  });
}

/**
 * Builds a trigram inverted index over `items` for fast fuzzy search.
 *
 * Construction is O(corpus × field_length). Subsequent `search()` calls are
 * O(candidates) — far faster than per-query Levenshtein for large corpora.
 *
 * @example
 * ```ts
 * const index = createIndex(users, {
 *   fields: [{ field: 'name', weight: 2 }, 'email'],
 *   threshold: 0.3,
 *   limit: 20,
 * });
 *
 * const results = index.search('alice');
 * ```
 *
 * @throws {ScoutConfigurationError} If options use an invalid field or numeric configuration.
 */
export function createIndex<T>(items: T[], options: ScoutIndexOptions<T>): ScoutIndex<T> {
  if (options.fields.length === 0) {
    throw new ScoutConfigurationError('createIndex: at least one field is required.');
  }

  const fields = resolveFields(options.fields);
  const maxWeight = fields.reduce((max, f) => Math.max(max, f.weight), 1);
  const defaultThreshold = requireFiniteNumber(options.threshold ?? 0.2, 'threshold', 0, 1);
  const defaultLimit = requireFiniteInteger(options.limit ?? 50, 'limit', 0);
  const defaultMinQueryLength = requireFiniteInteger(options.minQueryLength ?? 3, 'minQueryLength', 1);

  /** item → per-item record, preserves insertion order for `items` getter */
  const itemData = new Map<T, ItemRecord>();
  /** trigram → set of items that contain it */
  const invertedIndex = new Map<string, Set<T>>();
  const mutationListeners = new Set<() => void>();
  let revision = 0;

  function notifyMutation(): void {
    revision++;

    for (const listener of mutationListeners) listener();
  }

  /** Single-entry cache for the most recent normalized query's trigrams (F2). */
  let cachedNormalized: string | null = null;
  let cachedTrigrams: Set<string> | null = null;

  function getQueryTrigrams(normalized: string): Set<string> {
    if (normalized === cachedNormalized && cachedTrigrams !== null) return cachedTrigrams;

    cachedNormalized = normalized;
    cachedTrigrams = generateTrigrams(normalized);

    return cachedTrigrams;
  }

  function addFieldToIndex(item: T, fieldTrigrams: Set<string>): void {
    for (const trigram of fieldTrigrams) {
      let bucket = invertedIndex.get(trigram);

      if (!bucket) {
        bucket = new Set<T>();
        invertedIndex.set(trigram, bucket);
      }

      bucket.add(item);
    }
  }

  function removeFieldFromIndex(item: T, fieldTrigrams: Set<string>): void {
    for (const trigram of fieldTrigrams) {
      const bucket = invertedIndex.get(trigram);

      if (bucket) {
        bucket.delete(item);

        if (bucket.size === 0) invertedIndex.delete(trigram);
      }
    }
  }

  function addItem(item: T): void {
    const trigrams = new Map<string, Set<string>>();
    const values = new Map<string, string>();

    for (const { field, stringify } of fields) {
      const raw = item[field];
      const text = stringify(raw);
      const normalized = tokenize(text);
      const fieldTrigrams = normalized.length >= 1 ? generateTrigrams(normalized) : new Set<string>();

      trigrams.set(field, fieldTrigrams);
      values.set(field, text);
      addFieldToIndex(item, fieldTrigrams);
    }

    itemData.set(item, { trigrams, values });
  }

  /**
   * Performs a full linear scan over all items for short queries.
   * O(n × field_count) — acceptable for small corpora; consider raising
   * `minQueryLength` on large datasets to avoid triggering this path.
   */
  function containmentScan(query: string): Set<T> {
    const result = new Set<T>();

    for (const [item, record] of itemData) {
      for (const value of record.values.values()) {
        if (value.toLowerCase().includes(query)) {
          result.add(item);
          break;
        }
      }
    }

    return result;
  }

  function trigramCandidates(queryTrigrams: Set<string>): Set<T> {
    const candidates = new Set<T>();

    for (const trigram of queryTrigrams) {
      const items = invertedIndex.get(trigram);

      if (items) {
        for (const item of items) candidates.add(item);
      }
    }

    return candidates;
  }

  function scoreCandidate(normalized: string, queryTrigrams: Set<string> | null, record: ItemRecord): number {
    let bestScore = 0;

    for (const { field, weight } of fields) {
      let fieldScore: number;

      if (queryTrigrams === null) {
        const raw = record.values.get(field) ?? '';

        fieldScore = raw.toLowerCase().includes(normalized) ? 1.0 : 0;
      } else {
        const itemTrigrams = record.trigrams.get(field);

        if (!itemTrigrams || itemTrigrams.size === 0) continue;

        fieldScore = overlapSimilarity(queryTrigrams, itemTrigrams);
      }

      const weighted = fieldScore * (weight / maxWeight);

      if (weighted > bestScore) bestScore = weighted;
    }

    return bestScore;
  }

  function computeMatches(query: string, values: Map<string, string>): FieldMatch<keyof T & string>[] {
    const matches: FieldMatch<keyof T & string>[] = [];

    for (const { field } of fields) {
      const text = values.get(field);

      if (!text) continue;

      const ranges = findMatchRanges(text, query);

      if (ranges.length > 0) matches.push({ field, ranges });
    }

    return matches;
  }

  function reindexItem(item: T): boolean {
    const record = itemData.get(item);

    if (!record) return false;

    let changed = false;

    for (const { field, stringify } of fields) {
      const newText = stringify(item[field]);
      const oldText = record.values.get(field);

      if (newText === oldText) continue;

      changed = true;

      const oldTrigrams = record.trigrams.get(field);

      if (oldTrigrams) removeFieldFromIndex(item, oldTrigrams);

      const normalized = tokenize(newText);
      const newTrigrams = normalized.length >= 1 ? generateTrigrams(normalized) : new Set<string>();

      record.trigrams.set(field, newTrigrams);
      record.values.set(field, newText);
      addFieldToIndex(item, newTrigrams);
    }

    return changed;
  }

  function removeItem(item: T): boolean {
    const record = itemData.get(item);

    if (!record) return false;

    for (const fieldTrigrams of record.trigrams.values()) {
      removeFieldFromIndex(item, fieldTrigrams);
    }

    itemData.delete(item);

    return true;
  }

  for (const item of items) {
    if (!itemData.has(item)) addItem(item);
  }

  const index: ScoutIndex<T> = {
    add(item: T): void {
      if (itemData.has(item)) return;

      addItem(item);
      notifyMutation();
    },

    get items(): readonly T[] {
      return [...itemData.keys()];
    },

    onMutate(listener: () => void): () => void {
      mutationListeners.add(listener);

      return () => {
        mutationListeners.delete(listener);
      };
    },

    reindex(item: T): void {
      if (reindexItem(item)) notifyMutation();
    },

    remove(item: T): void {
      if (removeItem(item)) notifyMutation();
    },

    search(query: string, options?: SearchConstraints): SearchResult<T>[] {
      const threshold = requireFiniteNumber(options?.threshold ?? defaultThreshold, 'threshold', 0, 1);
      const limit = requireFiniteInteger(options?.limit ?? defaultLimit, 'limit', 0);
      const minQueryLength = requireFiniteInteger(
        options?.minQueryLength ?? defaultMinQueryLength,
        'minQueryLength',
        1,
      );

      if (!query.trim()) {
        return [...itemData.keys()].slice(0, limit).map((item) => ({ item, matches: [], score: 1 }));
      }

      const normalized = tokenize(query);

      // Query had no indexable content (e.g. punctuation-only) — no match, not "match all".
      if (!normalized) return [];

      const isShort = normalized.length < minQueryLength;
      const queryTrigrams = isShort ? null : getQueryTrigrams(normalized);
      const candidates = queryTrigrams === null ? containmentScan(normalized) : trigramCandidates(queryTrigrams);
      const results: SearchResult<T>[] = [];

      for (const item of candidates) {
        const record = itemData.get(item);

        if (!record) continue;

        const score = scoreCandidate(normalized, queryTrigrams, record);

        if (score >= threshold) {
          const matches = computeMatches(normalized, record.values);

          results.push({ item, matches, score });
        }
      }

      return results.sort((a, b) => b.score - a.score).slice(0, limit);
    },

    setItems(items: readonly T[]): void {
      const incoming = new Set(items);
      const next = [...incoming];
      let changed = false;

      for (const item of [...itemData.keys()]) {
        if (incoming.has(item)) continue;

        removeItem(item);
        changed = true;
      }

      for (const item of next) {
        if (!itemData.has(item)) {
          addItem(item);
          changed = true;
        } else if (reindexItem(item)) {
          changed = true;
        }
      }

      const current = [...itemData.keys()];
      const orderChanged = current.length !== next.length || current.some((item, index) => item !== next[index]);

      if (orderChanged) {
        const records = new Map(next.map((item) => [item, itemData.get(item)!]));

        itemData.clear();

        for (const [item, record] of records) itemData.set(item, record);

        changed = true;
      }

      if (changed) notifyMutation();
    },

    get size(): number {
      return itemData.size;
    },
  };

  registerIndexRevision(index, () => revision);

  return index;
}
