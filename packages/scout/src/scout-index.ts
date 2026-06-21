import type { FieldDef, FieldMatch, ScoutIndexOptions, SearchConstraints, SearchResult } from './types';

import { warn } from './_warn';
import { findMatchRanges } from './highlight';
import { defaultStringify, tokenize } from './tokenize';
import { diceSimilarity, generateTrigrams } from './trigram';

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
   * Searches the index for `query` and returns results sorted by score descending.
   *
   * An empty `query` returns all indexed items with `score = 1`.
   * Results below `threshold` are excluded. At most `limit` results are returned.
   */
  search(query: string, options?: SearchConstraints): SearchResult<T>[];
}

function resolveFields<T>(defs: ReadonlyArray<FieldDef<T>>): FieldConfig<T>[] {
  return defs.map((def) => {
    if (typeof def === 'string') {
      return { field: def, stringify: defaultStringify, weight: 1 };
    }

    return {
      field: def.field,
      stringify: def.stringify ?? defaultStringify,
      weight: def.weight ?? 1,
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
 */
export function createIndex<T>(items: T[], options: ScoutIndexOptions<T>): ScoutIndex<T> {
  if (options.fields.length === 0) {
    warn('createIndex: at least one field is required. The index will be empty.');
  }

  const fields = resolveFields(options.fields);
  const maxWeight = fields.reduce((max, f) => Math.max(max, f.weight), 1);
  const defaultThreshold = options.threshold ?? 0.2;
  const defaultLimit = options.limit ?? 50;
  const defaultMinQueryLength = options.minQueryLength ?? 3;

  /** item → per-item record, preserves insertion order for `items` getter */
  const itemData = new Map<T, ItemRecord>();
  /** trigram → set of items that contain it */
  const invertedIndex = new Map<string, Set<T>>();

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
      const raw = (item as Record<string, unknown>)[field];
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

  function scoreCandidate(
    normalized: string,
    isShort: boolean,
    queryTrigrams: Set<string> | null,
    record: ItemRecord,
  ): number {
    let bestScore = 0;

    for (const { field, weight } of fields) {
      let fieldScore: number;

      if (isShort) {
        const raw = record.values.get(field) ?? '';

        fieldScore = raw.toLowerCase().includes(normalized) ? 1.0 : 0;
      } else {
        const itemTrigrams = record.trigrams.get(field);

        if (!itemTrigrams || itemTrigrams.size === 0) continue;

        fieldScore = diceSimilarity(queryTrigrams!, itemTrigrams);
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

  for (const item of items) {
    addItem(item);
  }

  return {
    add(item: T): void {
      if (itemData.has(item)) return;

      addItem(item);
    },

    get items(): readonly T[] {
      return [...itemData.keys()];
    },

    reindex(item: T): void {
      const record = itemData.get(item);

      if (!record) return;

      for (const { field, stringify } of fields) {
        const raw = (item as Record<string, unknown>)[field];
        const newText = stringify(raw);
        const oldText = record.values.get(field);

        if (newText === oldText) continue;

        const oldTrigrams = record.trigrams.get(field);

        if (oldTrigrams) removeFieldFromIndex(item, oldTrigrams);

        const normalized = tokenize(newText);
        const newTrigrams = normalized.length >= 1 ? generateTrigrams(normalized) : new Set<string>();

        record.trigrams.set(field, newTrigrams);
        record.values.set(field, newText);
        addFieldToIndex(item, newTrigrams);
      }
    },

    remove(item: T): void {
      const record = itemData.get(item);

      if (!record) return;

      for (const fieldTrigrams of record.trigrams.values()) {
        removeFieldFromIndex(item, fieldTrigrams);
      }

      itemData.delete(item);
    },

    search(query: string, options?: SearchConstraints): SearchResult<T>[] {
      const threshold = options?.threshold ?? defaultThreshold;
      const limit = options?.limit ?? defaultLimit;
      const minQueryLength = options?.minQueryLength ?? defaultMinQueryLength;

      if (!query.trim()) {
        return [...itemData.keys()].slice(0, limit).map((item) => ({ item, matches: [], score: 1 }));
      }

      const normalized = tokenize(query);
      const isShort = normalized.length < minQueryLength;
      const queryTrigrams = isShort ? null : getQueryTrigrams(normalized);
      const candidates = isShort ? containmentScan(normalized) : trigramCandidates(queryTrigrams!);
      const results: SearchResult<T>[] = [];

      for (const item of candidates) {
        const record = itemData.get(item);

        if (!record) continue;

        const score = scoreCandidate(normalized, isShort, queryTrigrams, record);

        if (score >= threshold) {
          const matches = computeMatches(normalized, record.values);

          results.push({ item, matches, score });
        }
      }

      return results.sort((a, b) => b.score - a.score).slice(0, limit);
    },

    get size(): number {
      return itemData.size;
    },
  };
}
