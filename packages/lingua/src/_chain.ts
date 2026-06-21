// Internal — not part of the public API.
// Locale chain building, canonicalization, and plural-rules selection.
// All caches are per-instance — no shared module-level state.

import { E, LinguaError } from './_errors';

export type Locale = string;

// ─── Per-instance caches ──────────────────────────────────────────────────────

export type LocaleCaches = {
  canon: Map<string, string>;
  chain: Map<string, { chain: Locale[]; set: Set<Locale> }>;
  plural: Map<string, Intl.PluralRules>;
};

export function createLocaleCaches(): LocaleCaches {
  return { canon: new Map(), chain: new Map(), plural: new Map() };
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

  if (!canonical) throw new LinguaError(E.INVALID_LOCALE, `Invalid BCP 47 locale tag: "${locale}".`);

  cache.canon.set(locale, canonical);

  return canonical;
}

// ─── Plural form selection ────────────────────────────────────────────────────

export function selectPluralForm(locale: Locale, count: number, ordinal: boolean, cache: LocaleCaches): string {
  const key = `${locale}:${ordinal ? 'ordinal' : 'cardinal'}`;
  let rules = cache.plural.get(key);

  if (!rules) {
    rules = new Intl.PluralRules(locale, { type: ordinal ? 'ordinal' : 'cardinal' });
    cache.plural.set(key, rules);
  }

  return rules.select(count);
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
