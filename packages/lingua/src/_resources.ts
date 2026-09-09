import { type CompiledCatalog, compileCatalog } from './_catalog';
import { canonicalLocale } from './_locale';
import { LinguaMissingCatalogError } from './errors';
import type { Catalog, Catalogs, Locale, TranslationState } from './types';

type CatalogStoreOptions<C extends Catalog> = {
  readonly catalogs?: Catalogs<C>;
  readonly loadCatalog?: (locale: Locale) => Promise<C> | C;
};

/** One catalog state machine owns loaded catalogs and in-flight loading work. */
export function createCatalogStore<C extends Catalog>(options: CatalogStoreOptions<C>) {
  const loaded = new Map<Locale, { readonly catalog: C; readonly compiled: CompiledCatalog }>();
  const tasks = new Map<Locale, Promise<void>>();

  const hydrate = (locale: Locale, catalog: C): void => {
    loaded.set(canonicalLocale(locale), { catalog, compiled: compileCatalog(catalog) });
  };

  for (const [locale, catalog] of Object.entries(options.catalogs ?? {})) hydrate(locale, catalog);

  const load = async (requestedLocale: Locale): Promise<boolean> => {
    const locale = canonicalLocale(requestedLocale);

    if (loaded.has(locale)) return false;

    const existing = tasks.get(locale);

    if (existing) {
      await existing;

      return false;
    }

    if (!options.loadCatalog) {
      throw new LinguaMissingCatalogError(`No catalog source provided for locale "${locale}".`);
    }

    const task = Promise.resolve(options.loadCatalog(locale)).then(
      (catalog) => {
        hydrate(locale, catalog);
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
    hydrate,
    isLoaded(locale: Locale): boolean {
      return loaded.has(canonicalLocale(locale));
    },
    load,
    state(locale: Locale): TranslationState<C> {
      const catalogs: Catalogs<C> = {};

      for (const [loadedLocale, { catalog }] of loaded) catalogs[loadedLocale] = catalog;

      return { catalogs, locale, version: 4 };
    },
  };
}
