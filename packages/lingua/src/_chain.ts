// Internal — not part of the public API.
// Locale chain building, canonicalization, and plural-rules selection.
// canon/chain caches are per-instance. The Intl.PluralRules cache is module-level
// (rules objects are immutable) — see getPluralRules().

import type { Locale } from './_catalog';

import { LinguaInvalidLocaleError } from './errors';

export type { Locale } from './_catalog';

// ─── Per-instance caches ──────────────────────────────────────────────────────

export type LocaleCaches = {
  canon: Map<string, string>;
  chain: Map<string, { chain: Locale[]; set: Set<Locale> }>;
};

export function createLocaleCaches(): LocaleCaches {
  return { canon: new Map(), chain: new Map() };
}

// ─── Canon ────────────────────────────────────────────────────────────────────

export function canon(locale: string, cache: LocaleCaches): string {
  const cached = cache.canon.get(locale);

  if (cached !== undefined) return cached;

  let canonical: string | undefined;

  try {
    [canonical] = Intl.getCanonicalLocales(locale);
  } catch {
    // Invalid BCP 47 tag — canonical stays undefined, guard below throws.
  }

  if (!canonical) throw new LinguaInvalidLocaleError(`Invalid BCP 47 locale tag: "${locale}".`);

  cache.canon.set(locale, canonical);

  return canonical;
}

// ─── Plural form selection ────────────────────────────────────────────────────

// Module-level cache for Intl.PluralRules: the rules objects are immutable (no state
// to leak across instances), and per-instance copies cost one PluralRules allocation
// per createI18n()/createTranslator() per locale — noticeable only at module-level
// adoption (many translators sharing a locale). canon/chain caches stay per-instance.
const pluralRulesCache = new Map<string, Intl.PluralRules>();

function getPluralRules(locale: Locale, ordinal: boolean): Intl.PluralRules {
  const key = `${locale}:${ordinal ? 'ordinal' : 'cardinal'}`;
  let rules = pluralRulesCache.get(key);

  if (!rules) {
    rules = new Intl.PluralRules(locale, { type: ordinal ? 'ordinal' : 'cardinal' });
    pluralRulesCache.set(key, rules);
  }

  return rules;
}

export function selectPluralForm(locale: Locale, count: number, ordinal: boolean): string {
  return getPluralRules(locale, ordinal).select(count);
}

// ─── Locale chain ─────────────────────────────────────────────────────────────

function buildLocaleChainRaw(locale: Locale, fallback: Locale[]): { chain: Locale[]; set: Set<Locale> } {
  const set = new Set<Locale>();

  for (const value of [locale, ...fallback]) {
    set.add(value);

    const parts = value.split('-');

    for (let i = parts.length - 1; i > 0; i--) {
      set.add(parts.slice(0, i).join('-'));
    }
  }

  return { chain: [...set], set };
}

/**
 * Build a locale fallback chain, memoized per `(locale, fallback)` key using a provided cache.
 * The cache is per-instance (lives on LocaleCaches) — no shared module-level state.
 */
export function buildLocaleChain(
  locale: Locale,
  fallback: Locale[],
  cache: LocaleCaches,
): { chain: Locale[]; set: Set<Locale> } {
  const key = fallback.length === 0 ? locale : `${locale}|${fallback.join(',')}`;
  const cached = cache.chain.get(key);

  if (cached) return cached;

  const result = buildLocaleChainRaw(locale, fallback);

  cache.chain.set(key, result);

  return result;
}
