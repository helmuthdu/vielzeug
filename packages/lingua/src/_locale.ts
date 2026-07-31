import type { Locale } from './types';

import { LinguaInvalidLocaleError } from './errors';

const pluralRules = new Map<string, Intl.PluralRules>();

export function canonicalLocale(locale: string): Locale {
  try {
    const [canonical] = Intl.getCanonicalLocales(locale);

    if (canonical) return canonical;
  } catch {
    // Error below names the failed public input.
  }

  throw new LinguaInvalidLocaleError(`Invalid BCP 47 locale tag: "${locale}".`);
}

export function localeChain(locale: Locale, fallback: readonly Locale[]): readonly Locale[] {
  const chain = new Set<Locale>();

  for (const candidate of [locale, ...fallback]) {
    const parts = candidate.split('-');

    for (let length = parts.length; length > 0; length--) {
      chain.add(parts.slice(0, length).join('-'));
    }
  }

  return [...chain];
}

export function pluralCategory(locale: Locale, count: number, ordinal: boolean): Intl.LDMLPluralRule {
  const key = `${locale}:${ordinal ? 'ordinal' : 'cardinal'}`;
  let rules = pluralRules.get(key);

  if (!rules) {
    rules = new Intl.PluralRules(locale, { type: ordinal ? 'ordinal' : 'cardinal' });
    pluralRules.set(key, rules);
  }

  return rules.select(count);
}
