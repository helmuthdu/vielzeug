import { compileCatalog, isPluralMessage } from './_catalog';
import { canonicalLocale } from './_locale';
import type { Catalog, CatalogNode, Catalogs, Locale } from './types';

export type ValidationIssue = {
  key: string;
  locale: Locale;
  missing: Intl.LDMLPluralRule;
};

export type CatalogComparison = {
  readonly missing: ReadonlyArray<{ key: string; locale: Locale }>;
  readonly extra: ReadonlyArray<{ key: string; locale: Locale }>;
};

/** Explicit tooling API. Runtime never loads validation code or emits asynchronous catalog warnings. */
export function validateCatalog(catalog: Catalog, locale: Locale): ValidationIssue[] {
  compileCatalog(catalog);

  const canonical = canonicalLocale(locale);
  const categories = new Intl.PluralRules(canonical).resolvedOptions().pluralCategories;
  const issues: ValidationIssue[] = [];

  const visit = (node: CatalogNode, key: string): void => {
    if (typeof node === 'string') return;

    if (isPluralMessage(node)) {
      for (const missing of categories) {
        if (!Object.hasOwn(node.plural, missing)) issues.push({ key, locale: canonical, missing });
      }

      return;
    }

    for (const [childKey, child] of Object.entries(node)) visit(child, key ? `${key}.${childKey}` : childKey);
  };

  for (const [key, node] of Object.entries(catalog)) visit(node, key);

  return issues;
}

/** Compares catalog key sets across locales. Reports keys missing in each target locale and keys present in targets but absent from the base. */
export function compareCatalogs<C extends Catalog>(catalogs: Catalogs<C>): CatalogComparison {
  const locales = Object.keys(catalogs);
  const keySets = new Map<Locale, Set<string>>();
  const missing: Array<{ key: string; locale: Locale }> = [];
  const extra: Array<{ key: string; locale: Locale }> = [];

  for (const locale of locales) {
    keySets.set(locale, new Set(compileCatalog(catalogs[locale]).keys()));
  }

  const base = locales[0];
  const baseKeys = keySets.get(base)!;

  for (const locale of locales) {
    if (locale === base) continue;
    const targetKeys = keySets.get(locale)!;

    for (const key of baseKeys) {
      if (!targetKeys.has(key)) missing.push({ key, locale });
    }

    for (const key of targetKeys) {
      if (!baseKeys.has(key)) extra.push({ key, locale });
    }
  }

  return { extra, missing };
}
