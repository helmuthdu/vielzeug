import type { Catalog, I18nState, LoadedResources, Locale, Resources } from './types';

import { type CompiledCatalog, compileCatalog, mergeCatalogs } from './_catalog';
import { canonicalLocale } from './_locale';
import { LinguaMissingResourceError } from './errors';

type LoadedResourceMap<C extends Catalog> = Map<
  Locale,
  Map<string, { readonly catalog: C; readonly compiled: CompiledCatalog }>
>;

/** One resource state machine owns static sources, lazy sources, and in-flight work. */
export function createResourceStore<C extends Catalog>(resources: Resources<C>) {
  const definitions = new Map<string, Map<Locale, C | (() => Promise<C>)>>();
  // Declaration order is merge precedence. Async completion order must never alter output.
  const resourceOrder = Object.keys(resources);
  const loaded: LoadedResourceMap<C> = new Map();
  const tasks = new Map<string, Promise<void>>();

  for (const [resource, sources] of Object.entries(resources)) {
    const normalized = new Map<Locale, C | (() => Promise<C>)>();

    for (const [locale, source] of Object.entries(sources)) normalized.set(canonicalLocale(locale), source);

    definitions.set(resource, normalized);
  }

  const add = (resource: string, locale: Locale, catalog: C): void => {
    let localeResources = loaded.get(locale);

    if (!localeResources) {
      localeResources = new Map();
      loaded.set(locale, localeResources);
    }

    localeResources.set(resource, { catalog, compiled: compileCatalog(catalog) });
  };

  for (const [resource, sources] of definitions) {
    for (const [locale, source] of sources) {
      if (typeof source !== 'function') add(resource, locale, source);
    }
  }

  const load = async (resource: string, requestedLocale: Locale): Promise<boolean> => {
    const locale = canonicalLocale(requestedLocale);

    if (loaded.get(locale)?.has(resource)) return false;

    const source = definitions.get(resource)?.get(locale);

    if (!source) {
      throw new LinguaMissingResourceError(`Resource "${resource}" has no source for locale "${locale}".`);
    }

    if (typeof source !== 'function') {
      add(resource, locale, source);

      return true;
    }

    const key = `${resource}:${locale}`;
    const existing = tasks.get(key);

    if (existing) {
      await existing;

      return false;
    }

    const task = source().then(
      (catalog) => {
        add(resource, locale, catalog);
        tasks.delete(key);
      },
      (error: unknown) => {
        tasks.delete(key);
        throw error;
      },
    );

    tasks.set(key, task);
    await task;

    return true;
  };

  return {
    catalogMap(): ReadonlyMap<Locale, CompiledCatalog> {
      const catalogs = new Map<Locale, CompiledCatalog>();

      for (const [locale, resourceCatalogs] of loaded) {
        const fragments = resourceOrder.flatMap((resource) => {
          const catalog = resourceCatalogs.get(resource);

          return catalog ? [catalog.compiled] : [];
        });

        catalogs.set(locale, mergeCatalogs(fragments));
      }

      return catalogs;
    },
    isLoaded(resource: string, locale: Locale): boolean {
      return loaded.get(canonicalLocale(locale))?.has(resource) ?? false;
    },
    load,
    state(locale: Locale): I18nState<C> {
      const stateResources: LoadedResources<C> = {};

      for (const [loadedLocale, resourceCatalogs] of loaded) {
        for (const [resource, { catalog }] of resourceCatalogs) {
          (stateResources[resource] ??= {})[loadedLocale] = catalog;
        }
      }

      return { locale, resources: stateResources, version: 2 };
    },
  };
}
