import { type CompiledCatalog, compileCatalog } from './_catalog';
import { canonicalLocale } from './_locale';
import { LinguaMissingCatalogError } from './errors';
import type { Catalog, CatalogSources, LoadedCatalogs, Locale, TranslationState } from './types';

/** One catalog state machine owns static sources, lazy sources, and in-flight work. */
export function createCatalogStore<C extends Catalog>(sources: CatalogSources<C>) {
  const definitions = new Map<Locale, C | (() => Promise<C>)>();
  const loaded = new Map<Locale, { readonly catalog: C; readonly compiled: CompiledCatalog }>();
  const tasks = new Map<Locale, Promise<void>>();

  for (const [locale, source] of Object.entries(sources)) definitions.set(canonicalLocale(locale), source);

  const add = (locale: Locale, catalog: C): void => {
    loaded.set(locale, { catalog, compiled: compileCatalog(catalog) });
  };

  for (const [locale, source] of definitions) {
    if (typeof source !== 'function') add(locale, source);
  }

  const load = async (requestedLocale: Locale): Promise<boolean> => {
    const locale = canonicalLocale(requestedLocale);

    if (loaded.has(locale)) return false;

    const source = definitions.get(locale);

    if (!source) throw new LinguaMissingCatalogError(`Catalog has no source for locale "${locale}".`);

    if (typeof source !== 'function') {
      add(locale, source);

      return true;
    }

    const existing = tasks.get(locale);

    if (existing) {
      await existing;

      return false;
    }

    const task = source().then(
      (catalog) => {
        add(locale, catalog);
        tasks.delete(locale);
      },
      (error: unknown) => {
        tasks.delete(locale);
        throw error;
      },
    );

    tasks.set(locale, task);
    await task;

    return true;
  };

  return {
    catalogMap(): ReadonlyMap<Locale, CompiledCatalog> {
      return new Map([...loaded].map(([locale, { compiled }]) => [locale, compiled]));
    },
    isLoaded(locale: Locale): boolean {
      return loaded.has(canonicalLocale(locale));
    },
    load,
    state(locale: Locale): TranslationState<C> {
      const catalogs: LoadedCatalogs<C> = {};

      for (const [loadedLocale, { catalog }] of loaded) catalogs[loadedLocale] = catalog;

      return { catalogs, locale, version: 3 };
    },
  };
}
