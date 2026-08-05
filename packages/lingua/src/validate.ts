import type { Catalog, CatalogNode, Locale, PluralMessage } from './types';

import { compileCatalog } from './_catalog';
import { canonicalLocale } from './_locale';

export type ValidationIssue = {
  key: string;
  locale: Locale;
  missing: Intl.LDMLPluralRule;
};

function isPluralMessage(node: CatalogNode): node is PluralMessage {
  return typeof node === 'object' && node !== null && Object.hasOwn(node, 'plural');
}

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
