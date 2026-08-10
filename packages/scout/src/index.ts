export { toFilterPredicate, toSearchMatcher } from './adapters';
export { ScoutConfigurationError, ScoutDisposedError, ScoutError } from './errors';
export { findMatchRanges, highlight, highlightField } from './highlight';
export { createReactiveSearch, createSearch } from './reactive';
export type { ReactiveSearch } from './reactive';
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
  SearchState,
} from './types';
