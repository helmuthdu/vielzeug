export { toFilterPredicate, toSearchMatcher } from './adapters';
export {
  dedupeEntries,
  escapeRegExp,
  type RankableEntry,
  rankEntries,
  type SplitSegment,
  splitPattern,
} from './entries';
export { ScoutConfigError, ScoutDisposedError, ScoutError } from './errors';
export { findMatchRanges, highlight, highlightField } from './highlight';
export { createSearch } from './reactive';
export type { ScoutIndex } from './scout-index';
export { createIndex } from './scout-index';
export { segmentWords } from './segment';
export type {
  CreateSearchOptions,
  FieldDef,
  FieldMatch,
  HighlightPart,
  ScoutIndexOptions,
  SearchConstraints,
  SearchResult,
  SearchSnapshot,
  SearchState,
  SearchSubscribeOptions,
} from './types';
