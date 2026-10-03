/**
 * Entry ranking and segmentation for searchable reference lists: the presentation half of
 * search: a heterogeneous set of entries (glossary terms, rules, profiles) ordered by how
 * directly they match a typed query, plus segmentation helpers for rendering matched and
 * keyword-linked text.
 */

/** An entry a reference list ranks and renders: identified, labeled, with summary and body text. */
export interface RankableEntry {
  id: string;
  /** The entry's title: the primary match surface. */
  label: string;
  /** One-line context shown beside the label. */
  meta: string;
  /** The entry's body text. */
  text: string;
}

const Score = {
  Exact: 0,
  FuzzyOnly: 5,
  LabelContains: 2,
  LabelStart: 1,
  MetaContains: 3,
  TextContains: 4,
} as const;
type Score = (typeof Score)[keyof typeof Score];

export interface RankEntriesOptions {
  /**
   * Entry ids the fuzzy index already matched: offered as the last resort when no field
   * contains the query, so approximate hits still surface.
   */
  fuzzyIds?: ReadonlySet<string>;
}

/**
 * Orders entries by how directly they match `query`: exact label, then label prefix, label,
 * meta, text, and finally fuzzy-index hits (`fuzzyIds`) as last resort. Entries matching none
 * of these are dropped. Ties break alphabetically by label, then by body text.
 */
export function rankEntries<T extends RankableEntry>(
  entries: readonly T[],
  query: string,
  options: RankEntriesOptions = {},
): T[] {
  const lower = query.trim().toLowerCase();
  if (!lower) return [...entries];
  const fuzzyIds = options.fuzzyIds ?? new Set<string>();
  const scored: [Score, T][] = [];
  for (const entry of entries) {
    const label = entry.label.toLowerCase();
    const score =
      label === lower
        ? Score.Exact
        : label.startsWith(lower)
          ? Score.LabelStart
          : label.includes(lower)
            ? Score.LabelContains
            : entry.meta.toLowerCase().includes(lower)
              ? Score.MetaContains
              : entry.text.toLowerCase().includes(lower)
                ? Score.TextContains
                : fuzzyIds.has(entry.id)
                  ? Score.FuzzyOnly
                  : null;
    if (score !== null) scored.push([score, entry]);
  }
  return scored
    .sort((a, b) => a[0] - b[0] || a[1].label.localeCompare(b[1].label) || a[1].text.localeCompare(b[1].text))
    .map(([, entry]) => entry);
}

/** Drops entries whose label and body are identical to an earlier entry (alias rows). */
export function dedupeEntries<T extends { label: string; text: string }>(entries: readonly T[]): T[] {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = `${entry.label}\u0000${entry.text}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** One renderable piece of a text: matched a pattern, or plain. */
export interface SplitSegment {
  /** Piece matched the pattern and should render emphasized or linked. */
  matched?: boolean;
  text: string;
}

/** Splits `text` on `pattern` matches, marking the matched pieces; a null pattern keeps it whole. */
export function splitPattern(text: string, pattern: RegExp | null): SplitSegment[] {
  if (!pattern) return [{ text }];
  const segments: SplitSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    // Zero-length matches (optional-quantifier patterns) carry no text to emphasize.
    if (match[0].length === 0) continue;
    const start = match.index ?? 0;
    if (start > last) segments.push({ text: text.slice(last, start) });
    segments.push({ matched: true, text: match[0] });
    last = start + match[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last) });
  return segments.length ? segments : [{ text }];
}

const REGEXP_SPECIAL = /[.*+?^${}()|[\]\\]/g;

/** Escapes a literal so it can be embedded in a regular expression. */
export const escapeRegExp = (value: string): string => value.replace(REGEXP_SPECIAL, '\\$&');
