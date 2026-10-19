import type { QueryState, QueryToken, QueryTokenDef } from './query-bar-grammar';

/** An application-curated shortcut for one vocabulary option. */
export interface QueryQuickFilter extends QueryToken {
  label: string;
}

export type QueryBarLabels = {
  any: string;
  applied: string;
  apply: string;
  cancel: string;
  clear: string;
  clearFilter: string;
  filters: string;
  hiddenSelected: string;
  noMatch: string;
  noOptions: string;
  pending: string;
  quickFilters: string;
  reset: string;
  searchOptions: string;
  selected: string;
  selectedValues: string;
  showAll: string;
};

/** Component properties for `ore-query-bar`. */
export type OreQueryBarProps = {
  /** Show the field's own clear (×) button; it clears the free text only. */
  clearable?: boolean;
  /** Disable the whole bar: field, suggestions, and pill removal. */
  disabled?: boolean;
  /** Inline error under the field, e.g. a server-side search-length message. */
  error?: string;
  /** Helper text under the field. */
  helper?: string;
  /** Hide the visible label while keeping its accessible name. */
  'hide-label'?: boolean;
  /** Accessible name for the entry field. */
  label?: string;
  /** Localized labels; searchOptions/clearFilter use {filter}, selected/hiddenSelected use {count},
   * selectedValues uses {values}. */
  labels?: Partial<QueryBarLabels>;
  /** Field placeholder, typically the surface's search hint. */
  placeholder?: string;
  /** Curated single-filter toggles. Missing vocabulary options render disabled. */
  'quick-filters'?: QueryQuickFilter[];
  /** Border radius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full'. */
  rounded?: string;
  /** Component size: 'sm' | 'md' | 'lg'. */
  size?: string;
  /** Free text and distinct key/value tokens; single-selection keys accept at most one value.
   * External changes replace state; equivalent echoes preserve live composition. */
  state?: QueryState;
  /** Field variant: 'flat' | 'solid' | 'bordered' | 'outline' | 'ghost'. */
  variant?: string;
  /** The token vocabulary: which keys exist and which values each accepts. */
  vocabulary?: QueryTokenDef[];
};

export type OreQueryBarEvents = {
  /** The query changed: free text edited, a token committed, or a token removed. */
  change: void;
  /** Same as `change`; read the new query from the host's `state` property. */
  input: void;
  /** A querybar surface opened or closed. */
  'open-change': { open: boolean; reason: string; surface: 'suggestions' | 'filters' };
};

export type { QueryState, QueryToken, QueryTokenDef };
