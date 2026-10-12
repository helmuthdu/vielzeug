import type { QueryState, QueryToken, QueryTokenDef } from './query-bar-grammar';

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
  /** Field placeholder, typically the surface's search hint. */
  placeholder?: string;
  /** Border radius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full'. */
  rounded?: string;
  /** Component size: 'sm' | 'md' | 'lg'. */
  size?: string;
  /** The controlled query state. Omit for uncontrolled use; write a new object (with a
   *  different `tokens` array) to apply external changes such as deep-link presets. */
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
  /** The suggestion dropdown opened or closed. detail: { open, reason } */
  'open-change': { open: boolean; reason: string };
};

export type { QueryState, QueryToken, QueryTokenDef };
