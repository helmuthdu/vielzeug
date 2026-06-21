export { toFilterPredicate, toSearchFn } from './adapters';
export { findMatchRanges, highlight, highlightField } from './highlight';
export { createReactiveSearch, createSearch } from './reactive';
export type { ReactiveSearch } from './reactive';
export type { ScoutIndex } from './scout-index';
export { createIndex } from './scout-index';
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
