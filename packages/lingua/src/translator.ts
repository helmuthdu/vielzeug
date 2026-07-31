/**
 * Minimal static-catalog translator — resolution + interpolation + plurals on a
 * plain object, designed to be called once at module level alongside a component's
 * `translations` object. No subscriptions, no async loaders, no namespace registry,
 * no disposal: the catalog is static forever.
 *
 * Multi-locale consumers: this factory is deliberately single-locale. The upgrade
 * path is `createI18n()` (full runtime with locale chains and switching) — an
 * earlier shape-detection design (infer locale-ness from catalog shape) was
 * rejected: a nested `Messages` object like `{ en: { SAVE: ... } }` is ambiguous
 * between "locale map" and "namespace key", and mixed string|object tops break
 * any `all-strings vs all-objects` rule.
 */

import type { MessageBranchKeys, MessageLeafKeys, TpOptions, TpiOptions, TranslateVars } from './i18n-types';

import { CatalogEntry, type Messages, flattenStrings } from './_catalog';
import { validateCatalogInDev } from './_catalog-store';
import { canon, createLocaleCaches } from './_chain';
import {
  type TranslateContext,
  findPluralEntry,
  translate as translateIn,
  translatePlural as translatePluralIn,
  warnIfPluralBranch,
} from './_translate';
import { renderTemplateSegments } from './template';

export type CreateTranslatorOptions = {
  /** Locale driving CLDR plural selection for `tp()`. Must be a valid BCP 47 tag. Defaults to `'en'`. */
  locale?: string;
  /** Called when a translation key is missing. Defaults to returning the key itself. */
  onMissingKey?: (key: string, locale: string) => string;
  /** Called when an interpolation variable is absent. Defaults to keeping the `{var}` placeholder. */
  onMissingVar?: (varName: string, key: string, locale: string) => string;
};

export type Translator<T extends Messages> = {
  /** Resolve a leaf key and interpolate `{var}` tokens. Missing key returns the key string. */
  t(key: MessageLeafKeys<T>, vars?: TranslateVars): string;
  /**
   * Segmented interpolation: resolve a leaf key and return the template as a mixed
   * array of string segments and typed replacement values (components, elements).
   * Missing key returns `[key]`; a missing var keeps its `{placeholder}` segment.
   */
  ti<V>(key: MessageLeafKeys<T>, vars: Record<string, V>): Array<string | V>;
  /** Resolve a plural branch via CLDR rules for the configured locale. `count` is auto-injected. */
  tp(key: MessageBranchKeys<T>, count: number, options?: TpOptions): string;
  /**
   * Segmented plural interpolation: CLDR selection like `tp()`, segmented output like
   * `ti()`. `count` appears as a raw number segment. Missing branch returns
   * `[onMissingKey(key)]`.
   */
  tpi<V>(key: MessageBranchKeys<T>, count: number, options?: TpiOptions<V>): Array<string | number | V>;
};

export function createTranslator<T extends Messages>(catalog: T, options?: CreateTranslatorOptions): Translator<T> {
  const caches = createLocaleCaches();
  const locale = canon(options?.locale ?? 'en', caches);

  const entry = new CatalogEntry();

  entry.setAll(flattenStrings(catalog));
  validateCatalogInDev(locale, catalog);

  const ctx: TranslateContext = {
    caches,
    catalogStore: { resolve: () => entry },
    chain: [locale],
    locale,
    onMissingKey: options?.onMissingKey ?? ((key) => key),
    onMissingVar: options?.onMissingVar ?? ((varName) => `{${varName}}`),
  };

  return {
    t: (key, vars) => translateIn(ctx, String(key), vars),
    ti: (key, vars) => {
      const found = entry.get(String(key));

      if (!found) {
        warnIfPluralBranch(ctx, String(key));

        return [ctx.onMissingKey(String(key), locale)];
      }

      return renderTemplateSegments(found.compiled, vars, String(key), locale, ctx.onMissingVar);
    },
    tp: (key, count, options) => translatePluralIn(ctx, String(key), count, options),
    tpi: <V>(key: MessageBranchKeys<T>, count: number, options?: TpiOptions<V>) => {
      const found = findPluralEntry(ctx, String(key), count, options);

      if (!found) return [ctx.onMissingKey(String(key), locale)];

      const mergedVars: Record<string, V | number> = options?.vars ? { count, ...options.vars } : { count };

      return renderTemplateSegments(found.entry.compiled, mergedVars, found.key, locale, ctx.onMissingVar);
    },
  };
}
