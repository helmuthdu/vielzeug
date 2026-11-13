import { ScoutConfigError } from './errors';
import { matchRanges } from './highlight';
import { defaultStringify, type Normalized, normalize } from './tokenize';
import { generateTrigrams, queryCoverage } from './trigram';
import type { FieldDef, FieldMatch, ScoutIndexOptions, SearchConstraints, SearchResult } from './types';

type FieldConfig<T> = {
  field: keyof T & string;
  stringify: (v: unknown) => string;
  weight: number;
};

/** One indexed field of a record: original text plus its shared normalized form. */
type FieldEntry = {
  norm: Normalized;
  raw: string;
};

type ItemRecord<T> = {
  /** The latest object stored for this key. */
  item: T;
  /** Per-field trigrams for scoring. */
  trigrams: Map<string, Set<string>>;
  /**
   * Trigrams of every field's normalized text joined into one record-level text, so a
   * multi-word query that spans fields ("alice smith" vs `first` + `last`) still covers
   * its full length. Contributes no highlight ranges: those stay per-field.
   */
  union: Set<string>;
  /** Per-field original and normalized text for matching and highlighting. */
  values: Map<string, FieldEntry>;
};

/**
 * A stateful, indexed search corpus. Created via `createIndex()`.
 *
 * Supports incremental `add()`, `remove()`, and `reindex()` operations: each patches
 * the trigram index in O(field_length) without a full rebuild.
 */
export interface ScoutIndex<T> {
  /**
   * Adds `item` to the index. If another object is already stored under `key(item)`, that
   * record adopts `item` and its changed fields are reindexed (no notification when nothing
   * changed); without a custom `key`, re-adding the same reference is a no-op.
   */
  add(item: T): void;
  /**
   * All items currently in the index, in insertion order: the latest object stored for each
   * key. Returns a fresh array on each access.
   */
  readonly items: readonly T[];
  /**
   * Stores `item` under `key(item)`, re-reads its field values, and rebuilds its index entry
   * in-place, only updating fields whose text changed. Preserves insertion order. With a
   * custom `key`, passing a fresh copy of the item is enough: the stored record adopts it.
   * No-op if the key is not in the index.
   */
  reindex(item: T): void;
  /**
   * Removes the item stored under `key(item)`.
   * No-op if the key is not in the index.
   */
  remove(item: T): void;
  /**
   * Removes the item stored under `key`. Returns whether an item was removed.
   * Use with a custom `key` to delete by id without fabricating a `T`.
   */
  removeKey(key: unknown): boolean;
  /**
   * Monotonically increasing counter, incremented after every changed `add()` / `remove()` /
   * `reindex()` / `setItems()` operation. Use as a cache-busting token when caching search
   * results outside the index: `toSearchMatcher()` uses it for this purpose.
   */
  readonly revision: number;
  /**
   * Searches the index for `query` and returns results sorted by score descending.
   *
   * An empty (or whitespace-only) `query` returns all indexed items with `score = 1`.
   * A `query` with no indexable content after normalization (e.g. punctuation-only) returns
   * no results. Results below `threshold` are excluded. At most `limit` results are returned.
   */
  search(query: string, options?: SearchConstraints): SearchResult<T>[];
  /**
   * Reconciles the index to `items` by key identity (reference identity by default).
   * Retained items adopt their incoming object and are reindexed, new keys are added,
   * missing keys are removed, and one mutation notification fires when indexed corpus or
   * field text changed — reconciling an equal corpus with fresh copies notifies nothing.
   * Duplicate references collapse to one item; two different objects sharing one key throw
   * `ScoutConfigError`.
   */
  setItems(items: readonly T[]): void;
  /** Number of items currently in the index. */
  readonly size: number;
  /**
   * Subscribes `listener` to be called after every changed `add()` / `remove()` / `reindex()`
   * / `setItems()` operation. No-ops: e.g. removing an unindexed item or reconciling an
   * unchanged corpus: do not fire it. Each changed `setItems()` reconciliation fires once.
   * Returns an unsubscribe function.
   *
   * Framework-agnostic extension point: `createSearch()` uses this internally to keep
   * its snapshot in sync with index mutations. Most callers won't need this directly.
   */
  subscribe(listener: () => void): () => void;
}

function requireFiniteInteger(value: number, name: string, minimum: number): number {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < minimum) {
    throw new ScoutConfigError(`${name} must be a finite integer greater than or equal to ${minimum}.`);
  }

  return value;
}

function requireFiniteNumber(value: number, name: string, minimum: number, maximum = Number.POSITIVE_INFINITY): number {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new ScoutConfigError(`${name} must be a finite number between ${minimum} and ${maximum}.`);
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
 * O(candidates): far faster than per-query Levenshtein for large corpora.
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
 * @throws {ScoutConfigError} If options use an invalid field or numeric configuration, or if
 * items with a `key` option contain two different items sharing the same key.
 */
export function createIndex<T>(items: readonly T[], options: ScoutIndexOptions<T>): ScoutIndex<T> {
  if (options.fields.length === 0) {
    throw new ScoutConfigError('createIndex: at least one field is required.');
  }

  const keyOf = options.key ?? ((item: T): unknown => item);

  const fields = resolveFields(options.fields);
  const maxWeight = fields.reduce((max, f) => Math.max(max, f.weight), 1);
  const minWeight = fields.reduce((min, f) => Math.min(min, f.weight), maxWeight);
  const defaultThreshold = requireFiniteNumber(options.threshold ?? 0.2, 'threshold', 0, 1);
  const defaultLimit = requireFiniteInteger(options.limit ?? 50, 'limit', 0);
  const defaultMinQueryLength = requireFiniteInteger(options.minQueryLength ?? 3, 'minQueryLength', 1);

  /** key → per-item record, preserves insertion order for `items` getter */
  const itemData = new Map<unknown, ItemRecord<T>>();
  /** trigram → set of keys that contain it */
  const invertedIndex = new Map<string, Set<unknown>>();
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

  function addFieldToIndex(key: unknown, fieldTrigrams: Set<string>): void {
    for (const trigram of fieldTrigrams) {
      let bucket = invertedIndex.get(trigram);

      if (!bucket) {
        bucket = new Set<unknown>();
        invertedIndex.set(trigram, bucket);
      }

      bucket.add(key);
    }
  }

  /** Maps every item by key, rejecting a batch where two different objects share one key. */
  function uniqueKeyMap(items: readonly T[]): Map<unknown, T> {
    const map = new Map<unknown, T>();

    for (const item of items) {
      const key = keyOf(item);
      const existing = map.get(key);

      if (existing !== undefined && existing !== item) {
        throw new ScoutConfigError('two different items share the same key.');
      }

      map.set(key, item);
    }

    return map;
  }

  function removeFieldFromIndex(key: unknown, fieldTrigrams: Set<string>): void {
    for (const trigram of fieldTrigrams) {
      const bucket = invertedIndex.get(trigram);

      if (bucket) {
        bucket.delete(key);

        if (bucket.size === 0) invertedIndex.delete(trigram);
      }
    }
  }

  function buildUnion(values: Map<string, FieldEntry>): Set<string> {
    const joined = [...values.values()]
      .map((entry) => entry.norm.text)
      .filter(Boolean)
      .join(' ');

    return joined.length >= 1 ? generateTrigrams(joined) : new Set<string>();
  }

  function addItem(item: T, key: unknown): void {
    const trigrams = new Map<string, Set<string>>();
    const values = new Map<string, FieldEntry>();

    for (const { field, stringify } of fields) {
      const text = stringify(item[field]);
      const norm = normalize(text);
      const fieldTrigrams = norm.text.length >= 1 ? generateTrigrams(norm.text) : new Set<string>();

      trigrams.set(field, fieldTrigrams);
      values.set(field, { norm, raw: text });
      addFieldToIndex(key, fieldTrigrams);
    }

    itemData.set(key, { item, trigrams, union: buildUnion(values), values });
  }

  /**
   * Performs a full linear scan over all items for short queries.
   * O(n × field_count): acceptable for small corpora; consider raising
   * `minQueryLength` on large datasets to avoid triggering this path.
   */
  function containmentScan(query: string): Set<unknown> {
    const result = new Set<unknown>();

    for (const [key, record] of itemData) {
      for (const entry of record.values.values()) {
        if (entry.norm.text.includes(query)) {
          result.add(key);
          break;
        }
      }
    }

    return result;
  }

  function trigramCandidates(queryTrigrams: Set<string>): Set<unknown> {
    const candidates = new Set<unknown>();

    for (const trigram of queryTrigrams) {
      const keys = invertedIndex.get(trigram);

      if (keys) {
        for (const key of keys) candidates.add(key);
      }
    }

    return candidates;
  }

  function scoreCandidate(normalized: string, queryTrigrams: Set<string> | null, record: ItemRecord<T>): number {
    let bestScore = 0;

    for (const { field, weight } of fields) {
      let fieldScore: number;

      if (queryTrigrams === null) {
        const norm = record.values.get(field)?.norm.text ?? '';

        fieldScore = norm.includes(normalized) ? 1.0 : 0;
      } else {
        const itemTrigrams = record.trigrams.get(field);

        if (!itemTrigrams || itemTrigrams.size === 0) continue;

        fieldScore = queryCoverage(queryTrigrams, itemTrigrams);
      }

      const weighted = fieldScore * (weight / maxWeight);

      if (weighted > bestScore) bestScore = weighted;
    }

    // Whole-record coverage, weighted by the smallest field weight: a query whose words
    // split across fields scores as well as if they sat in one field of that weight.
    if (queryTrigrams !== null) {
      const unionScore = queryCoverage(queryTrigrams, record.union) * (minWeight / maxWeight);

      if (unionScore > bestScore) bestScore = unionScore;
    }

    return bestScore;
  }

  function computeMatches(normalizedQuery: string, values: Map<string, FieldEntry>): FieldMatch<keyof T & string>[] {
    const matches: FieldMatch<keyof T & string>[] = [];

    for (const { field } of fields) {
      const entry = values.get(field);

      if (!entry) continue;

      const ranges = matchRanges(entry.norm, normalizedQuery);

      if (ranges.length > 0) matches.push({ field, ranges });
    }

    return matches;
  }

  function reindexStored(key: unknown, item: T): boolean {
    const record = itemData.get(key);

    if (!record) return false;

    record.item = item;

    let changed = false;
    // Postings map trigram -> keys across ALL fields, so removals are computed
    // as (old trigrams) minus (new trigrams over every field): deleting a
    // changed field's old trigrams directly would blind the record for
    // trigrams a sibling field still provides.
    const stale = new Set<string>();

    for (const fieldTrigrams of record.trigrams.values()) {
      for (const trigram of fieldTrigrams) stale.add(trigram);
    }

    for (const { field, stringify } of fields) {
      const newText = stringify(item[field]);

      if (newText === record.values.get(field)?.raw) continue;

      changed = true;

      const norm = normalize(newText);
      const newTrigrams = norm.text.length >= 1 ? generateTrigrams(norm.text) : new Set<string>();

      record.trigrams.set(field, newTrigrams);
      record.values.set(field, { norm, raw: newText });
    }

    if (changed) {
      record.union = buildUnion(record.values);

      const current = new Set<string>();

      for (const fieldTrigrams of record.trigrams.values()) {
        for (const trigram of fieldTrigrams) current.add(trigram);
      }

      addFieldToIndex(key, current);

      const dropped = new Set([...stale].filter((trigram) => !current.has(trigram)));

      removeFieldFromIndex(key, dropped);
    }

    return changed;
  }

  function removeStored(key: unknown): boolean {
    const record = itemData.get(key);

    if (!record) return false;

    for (const fieldTrigrams of record.trigrams.values()) {
      removeFieldFromIndex(key, fieldTrigrams);
    }

    itemData.delete(key);

    return true;
  }

  if (options.key) uniqueKeyMap(items);

  for (const item of items) {
    const key = keyOf(item);

    if (!itemData.has(key)) addItem(item, key);
  }

  const index: ScoutIndex<T> = {
    add(item: T): void {
      const key = keyOf(item);

      if (itemData.has(key)) {
        if (reindexStored(key, item)) notifyMutation();

        return;
      }

      addItem(item, key);
      notifyMutation();
    },

    get items(): readonly T[] {
      return [...itemData.values()].map((record) => record.item);
    },

    reindex(item: T): void {
      if (reindexStored(keyOf(item), item)) notifyMutation();
    },

    remove(item: T): void {
      if (removeStored(keyOf(item))) notifyMutation();
    },

    removeKey(key: unknown): boolean {
      if (!removeStored(key)) return false;

      notifyMutation();

      return true;
    },

    get revision(): number {
      return revision;
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
        return [...itemData.values()].slice(0, limit).map((record) => ({ item: record.item, matches: [], score: 1 }));
      }

      const normalized = normalize(query).text;

      // Query had no indexable content (e.g. punctuation-only): no match, not "match all".
      if (!normalized) return [];

      const isShort = normalized.length < minQueryLength;
      const queryTrigrams = isShort ? null : getQueryTrigrams(normalized);
      const candidates = queryTrigrams === null ? containmentScan(normalized) : trigramCandidates(queryTrigrams);
      const scored: { record: ItemRecord<T>; score: number }[] = [];

      for (const key of candidates) {
        const record = itemData.get(key);

        if (!record) continue;

        const score = scoreCandidate(normalized, queryTrigrams, record);

        if (score >= threshold) scored.push({ record, score });
      }

      // Highlight ranges only for the kept results: the range scan is O(field length) per
      // result, so it must not run for candidates that `limit` will drop anyway.
      return scored
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(({ record, score }) => ({ item: record.item, matches: computeMatches(normalized, record.values), score }));
    },

    setItems(items: readonly T[]): void {
      const incoming = uniqueKeyMap(items);

      let changed = false;

      for (const key of [...itemData.keys()]) {
        if (incoming.has(key)) continue;

        removeStored(key);
        changed = true;
      }

      for (const [key, item] of incoming) {
        if (!itemData.has(key)) {
          addItem(item, key);
          changed = true;
        } else if (reindexStored(key, item)) {
          changed = true;
        }
      }

      const currentKeys = [...itemData.keys()];
      const nextKeys = [...incoming.keys()];
      const orderChanged =
        currentKeys.length !== nextKeys.length || currentKeys.some((key, index) => key !== nextKeys[index]);

      if (orderChanged) {
        const records = new Map(nextKeys.map((key) => [key, itemData.get(key)!]));

        itemData.clear();

        for (const [key, record] of records) itemData.set(key, record);

        changed = true;
      }

      if (changed) notifyMutation();
    },

    get size(): number {
      return itemData.size;
    },

    subscribe(listener: () => void): () => void {
      mutationListeners.add(listener);

      return () => {
        mutationListeners.delete(listener);
      };
    },
  };

  return index;
}
