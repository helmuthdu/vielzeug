/**
 * The query-bar grammar: one search language for a field that accepts free text and
 * `key:value` tokens together (GitHub's pull-request search is the reference UX).
 * A surface decides which keys exist and which values they accept by passing a
 * vocabulary; the bar turns committed tokens into removable pills and keeps free
 * text in the field.
 *
 * This module is pure: no DOM, no framework, no locale access. Consumers build a
 * vocabulary from their own lists (localized where the labels are localized), pass
 * it in, and consume the resulting state. Token keys are locale-stable (`author:`
 * stays `author:` in German) while the vocabulary's labels stay localized.
 *
 * Semantics:
 * - A complete `key:value` fragment resolves against the vocabulary (value or label,
 *   case-insensitive) and commits immediately — the bar moves it out of the field
 *   into a removable pill.
 * - Unknown keys and unresolved values degrade to free text, never errors.
 * - One value per key: a second token for the same key replaces the first in place.
 * - The last fragment is a draft while the caret is inside it: `author:al…` stays
 *   out of the free text so partial tokens never leak into the live search, and it
 *   drives the suggestion list instead.
 */

/** One selectable value of a token key. */
export interface QueryOption {
  label: string;
  value: string;
}

/** A vocabulary entry: the token key, its display name, and its accepted values. */
export interface QueryTokenDef {
  key: string;
  label: string;
  options: QueryOption[];
}

/** A committed `key:value` filter. */
export interface QueryToken {
  key: string;
  value: string;
}

/** The bar's whole state: free text plus committed tokens. */
export interface QueryState {
  text: string;
  tokens: QueryToken[];
}

/** A `key:…` fragment still being composed at the end of the field. */
export interface QueryDraft {
  key: string;
  valuePrefix: string;
}

/** What parsing extracted from the raw field content. */
export interface ParsedQuery {
  draft: QueryDraft | null;
  text: string;
  tokens: QueryToken[];
}

/** A suggestion the dropdown offers: pick a key to compose, or a value to commit. */
export type QuerySuggestion =
  | { key: string; kind: 'key'; label: string }
  | { key: string; kind: 'value'; label: string; value: string };

const TOKEN_SYNTAX = /^([a-z][a-z0-9-]*):(.*)$/i;

const lower = (value: string): string => value.toLowerCase();

function keyIndex(vocabulary: readonly QueryTokenDef[]): Map<string, QueryTokenDef> {
  return new Map(vocabulary.map((def) => [lower(def.key), def]));
}

/** Resolves a typed value against a key's options: exact, case-insensitive, by value or label. */
function resolveOption(def: QueryTokenDef, raw: string): QueryOption | undefined {
  const needle = lower(raw);
  return def.options.find((option) => lower(option.value) === needle || lower(option.label) === needle);
}

/** The trailing `key:…` fragment if it opens a known key, `null` for plain words. */
function draftOf(fragment: string, index: Map<string, QueryTokenDef>): QueryDraft | null {
  const match = TOKEN_SYNTAX.exec(fragment);
  if (!match) return null;
  const def = index.get(lower(match[1]));
  return def ? { key: def.key, valuePrefix: match[2] } : null;
}

/**
 * The trailing fragment as a draft: a known key whose value is still being composed.
 * A fragment that already resolves to a whole option is NOT a draft — typing
 * `author:alice` commits the token immediately instead of waiting for a space.
 */
function trailingDraft(input: string, fragments: string[], index: Map<string, QueryTokenDef>): QueryDraft | null {
  if (/\s$/.test(input)) return null;
  const candidate = draftOf(fragments[fragments.length - 1] ?? '', index);
  if (!candidate) return null;
  const def = index.get(lower(candidate.key));
  return def && resolveOption(def, candidate.valuePrefix) ? null : candidate;
}

/** One value per key: a second token replaces the first and keeps the pill's slot. */
export function commitToken(state: QueryState, key: string, value: string): QueryState {
  const tokens = [...state.tokens];
  const slot = tokens.findIndex((token) => token.key === key);
  if (slot >= 0) tokens[slot] = { key, value };
  else tokens.push({ key, value });
  return { text: state.text, tokens };
}

export function removeToken(state: QueryState, key: string): QueryState {
  return { text: state.text, tokens: state.tokens.filter((token) => token.key !== key) };
}

export function tokenValue(state: QueryState, key: string): string | undefined {
  return state.tokens.find((token) => token.key === key)?.value;
}

export const hasQueryFilters = (state: QueryState): boolean => state.text.trim() !== '' || state.tokens.length > 0;

/**
 * Splits a raw field into free text, committed tokens, and the trailing draft.
 * The draft only exists while the input does not end in whitespace and the last
 * fragment is an unfinished `key:…` — a finished fragment is either a token or text.
 */
export function parseQuery(input: string, vocabulary: readonly QueryTokenDef[]): ParsedQuery {
  const trimmed = input.trim();
  if (trimmed === '') return { draft: null, text: '', tokens: [] };

  const index = keyIndex(vocabulary);
  const fragments = trimmed.split(/\s+/);
  const draft = trailingDraft(input, fragments, index);
  const complete = draft ? fragments.slice(0, -1) : fragments;

  const text: string[] = [];
  const tokens: QueryToken[] = [];
  for (const fragment of complete) {
    const match = TOKEN_SYNTAX.exec(fragment);
    const def = match ? index.get(lower(match[1])) : undefined;
    const option = def && match ? resolveOption(def, match[2]) : undefined;
    if (def && option) {
      const slot = tokens.findIndex((token) => token.key === def.key);
      if (slot >= 0) tokens[slot] = { key: def.key, value: option.value };
      else tokens.push({ key: def.key, value: option.value });
    } else {
      text.push(fragment);
    }
  }
  return { draft, text: text.join(' '), tokens };
}

/**
 * The dropdown's offers for the current field:
 * - inside a `key:…` draft: that key's options whose value or label matches the prefix;
 * - otherwise: the vocabulary's keys whose name matches the word being typed, plus
 *   any option across all keys that reads like that word (so typing `ali` offers
 *   `author:Alice` directly — the tap-first path).
 */
export function suggestQuery(input: string, vocabulary: readonly QueryTokenDef[]): QuerySuggestion[] {
  const draft = parseQuery(input, vocabulary).draft;
  const matches = (needle: string, option: QueryOption): boolean =>
    lower(option.value).startsWith(needle) || lower(option.label).startsWith(needle);

  if (draft) {
    const def = keyIndex(vocabulary).get(lower(draft.key));
    if (!def) return [];
    const needle = lower(draft.valuePrefix);
    return def.options
      .filter((option) => matches(needle, option))
      .map((option) => ({ key: def.key, kind: 'value', label: option.label, value: option.value }));
  }

  // The word being typed: none once the field ends in whitespace (focus fresh on a
  // finished query), so the dropdown falls back to listing the vocabulary's keys.
  const fragment = /\s$/.test(input) || input.trim() === '' ? '' : (input.trim().split(/\s+/).pop() ?? '');
  const needle = lower(fragment);
  const keys: QuerySuggestion[] = vocabulary
    .filter((def) => lower(def.key).startsWith(needle) || lower(def.label).startsWith(needle))
    .map((def) => ({ key: def.key, kind: 'key', label: def.label }));
  const values: QuerySuggestion[] =
    needle === ''
      ? []
      : vocabulary.flatMap((def) =>
          def.options
            .filter((option) => matches(needle, option))
            .map((option) => ({ key: def.key, kind: 'value', label: option.label, value: option.value })),
        );
  return [...keys, ...values];
}
