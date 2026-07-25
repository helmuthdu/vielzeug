// Internal — not part of the public API.
// The translation algorithm: fallback-chain key lookup, plural-form selection, and
// interpolation. Extracted out of i18n.ts's factory closure so it has its own unit-test seam
// independent of the full `createI18n()` setup — mirrors `_catalog-store.ts`/`_namespace-store.ts`,
// which already got this treatment; this was the one piece of comparable complexity left inline.

import type { CatalogEntry, CatalogEntryData } from './_catalog';
import type { LocaleCaches } from './_chain';
import type { Locale, TpOptions, TranslateVars } from './i18n-types';

import { selectPluralForm } from './_chain';
import { devOnly, warn } from './_dev';
import { LinguaCountInVarsError, LinguaInvalidCountError } from './errors';
import { renderTemplate } from './template';

/** Only the read-side of `CatalogStore` this module needs — avoids importing its `M` generic. */
export type CatalogResolver = { resolve(loc: Locale): CatalogEntry | undefined };

export type TranslateContext = {
  readonly caches: LocaleCaches;
  readonly catalogStore: CatalogResolver;
  /** Active fallback chain, most-specific locale first (e.g. `['en-US', 'en']`). */
  readonly chain: readonly Locale[];
  readonly locale: Locale;
  readonly onMissingKey: (key: string, locale: Locale) => string;
  readonly onMissingVar: (varName: string, key: string, locale: Locale) => string;
};

// Single-pass entry lookup across the active fallback chain.
function findEntry(ctx: TranslateContext, key: string): CatalogEntryData | undefined {
  for (const candidate of ctx.chain) {
    const found = ctx.catalogStore.resolve(candidate)?.get(key);

    if (found !== undefined) return found;
  }

  return undefined;
}

// True if `base` exists as a plural branch prefix (e.g. `items` when only `items.one`/
// `items.other` are registered) anywhere in the fallback chain. Shared by `hasKey()` and
// `translate()`'s dev-mode miss diagnostic below — both need to distinguish "key genuinely
// doesn't exist" from "key exists, but only as a plural branch — you want tp(), not t()".
function isPluralBranch(ctx: TranslateContext, base: string): boolean {
  for (const candidate of ctx.chain) {
    const catalog = ctx.catalogStore.resolve(candidate);

    if (catalog?.prefixes.has(base)) return true;
  }

  return false;
}

/** True if `base` exists as a leaf key or a plural branch prefix, anywhere in the fallback chain. */
export function hasKey(ctx: TranslateContext, base: string): boolean {
  return findEntry(ctx, base) !== undefined || isPluralBranch(ctx, base);
}

function interpolate(
  ctx: TranslateContext,
  key: string,
  found: CatalogEntryData,
  vars: TranslateVars | undefined,
): string {
  return renderTemplate(found.compiled, vars, key, ctx.locale, ctx.onMissingVar);
}

export function translate(ctx: TranslateContext, key: string, vars?: TranslateVars): string {
  const found = findEntry(ctx, key);

  if (!found) {
    // has(key) returns true for a plural-branch-only key (no leaf entry), but t() can't resolve
    // one — the common `if (i18n.has(key)) i18n.t(key)` pattern silently returns the raw key in
    // that case, indistinguishable from a genuinely missing key without this warning.
    devOnly(() => {
      if (isPluralBranch(ctx, key)) {
        warn(
          `t('${key}') resolved to the missing-key fallback, but '${key}' exists as a plural branch — use tp('${key}', count) instead.`,
        );
      }
    });

    return ctx.onMissingKey(key, ctx.locale);
  }

  return interpolate(ctx, key, found, vars);
}

// Plural key priority: cardinal zero tries `.zero` override first, then the CLDR form, then
// `.other` as the final fallback. Ordinal / non-zero skips the `.zero` special case.
function pluralKeyPriority(base: string, form: string, count: number, ordinal: boolean): string[] {
  const keys: string[] = [];

  if (!ordinal && count === 0) keys.push(`${base}.zero`);

  if (form !== 'zero' || ordinal) keys.push(`${base}.${form}`);

  if (form !== 'other') keys.push(`${base}.other`);

  return keys;
}

export function translatePlural(ctx: TranslateContext, key: string, count: number, options?: TpOptions): string {
  if (!Number.isFinite(count)) {
    throw new LinguaInvalidCountError('`count` must be a finite number.');
  }

  const vars = options?.vars;
  const ordinal = options?.ordinal ?? false;

  if (vars && Object.hasOwn(vars, 'count')) {
    throw new LinguaCountInVarsError('`tp` does not allow `vars.count`; `count` is injected automatically.');
  }

  const mergedVars = vars ? { count, ...vars } : { count };

  // Walk the fallback chain locale-by-locale, selecting CLDR plural form using each locale's
  // own rules. This ensures cross-locale fallbacks produce grammatically correct forms.
  for (const candidate of ctx.chain) {
    const catalog = ctx.catalogStore.resolve(candidate);

    if (!catalog) continue;

    const form = selectPluralForm(candidate, count, ordinal, ctx.caches);
    const keys = pluralKeyPriority(key, form, count, ordinal);

    for (const k of keys) {
      const found = catalog.get(k);

      if (found !== undefined) return interpolate(ctx, k, found, mergedVars);
    }
  }

  return ctx.onMissingKey(key, ctx.locale);
}
