// Internal — not part of the public API.
// Owns all locale → CatalogEntry state, loaders, and in-flight loading tasks.

import type { NamespaceStore } from './_namespace-store';

import { CatalogEntry, type Messages, flattenStrings } from './_catalog';
import { warn } from './_dev';
import { LinguaMissingLocaleError, checkDisposed, checkDisposedAsync } from './errors';

export type Locale = string;
export type Loader<M extends Messages = Messages> = () => Promise<M>;
export type LocaleSource<M extends Messages = Messages> = M | Loader<M>;

export type CatalogStore<M extends Messages = Messages> = {
  /** Direct access to the raw catalogs map (for SSR serialization). */
  readonly catalogs: ReadonlyMap<Locale, CatalogEntry>;
  dispose(): void;
  isLoaded(loc: Locale): boolean;
  isRegistered(loc: Locale): boolean;
  /** All registered locale keys in insertion order. */
  knownLocales(): readonly Locale[];
  /** Callback invoked whenever a catalog changes (drives bump/notify). */
  onChange: ((loc: Locale) => void) | undefined;
  /** Patch a locale catalog with additional flat messages (used by loadNamespace). */
  patch(loc: Locale, messages: Messages): Promise<void>;
  /** Direct access to the pending loaders map (for fork propagation). */
  readonly pendingLoaders: ReadonlyMap<Locale, Loader<M>>;
  /** Pre-load a locale catalog without switching. */
  preload(loc: Locale): Promise<void>;
  /** Register (or replace) a locale's source. Returns a Promise that resolves when the catalog is loaded. */
  register(loc: Locale, source: LocaleSource<M>, nsStore: NamespaceStore): Promise<void>;
  /** Resolve a compiled CatalogEntry for a locale (undefined if not loaded). */
  resolve(loc: Locale): CatalogEntry | undefined;
  /**
   * Seed the store with pre-compiled entries from a parent fork.
   * Called during fork() — compiled templates are shared by reference.
   */
  seedFrom(entries: ReadonlyMap<Locale, CatalogEntry>, loaderMap: ReadonlyMap<Locale, Loader<M>>): void;
};

export function createCatalogStore<M extends Messages = Messages>(disposed: () => boolean): CatalogStore<M> {
  const catalogs = new Map<Locale, CatalogEntry>();
  const loaders = new Map<Locale, Loader<M>>();
  const loadingTasks = new Map<Locale, Promise<void>>();
  const known = new Set<Locale>();

  let onChange: ((loc: Locale) => void) | undefined;

  const registerRaw = (normalized: Locale, flat: Map<string, string>): void => {
    let entry = catalogs.get(normalized);

    if (!entry) {
      entry = new CatalogEntry();
      catalogs.set(normalized, entry);
    }

    entry.setAll(flat);
  };

  const preload = (loc: Locale): Promise<void> => {
    const early = checkDisposedAsync(disposed());

    if (early) return early;

    if (catalogs.has(loc)) return Promise.resolve();

    const loader = loaders.get(loc);

    if (!loader) return Promise.reject(new LinguaMissingLocaleError(`Missing locale source for "${loc}".`));

    const existing = loadingTasks.get(loc);

    if (existing) return existing;

    const task = loader().then(
      (messages) => {
        if (loaders.get(loc) !== loader) return;

        loaders.delete(loc);
        registerRaw(loc, flattenStrings(messages));
        loadingTasks.delete(loc);
        onChange?.(loc);
      },
      (error: unknown) => {
        if (loaders.get(loc) === loader) loadingTasks.delete(loc);

        throw error;
      },
    );

    loadingTasks.set(loc, task);

    return task;
  };

  return {
    get catalogs() {
      return catalogs as ReadonlyMap<Locale, CatalogEntry>;
    },

    dispose() {
      catalogs.clear();
      loaders.clear();
      loadingTasks.clear();
      known.clear();
      onChange = undefined;
    },

    isLoaded(loc) {
      return catalogs.has(loc);
    },

    isRegistered(loc) {
      return known.has(loc);
    },

    knownLocales() {
      return [...known];
    },

    get onChange() {
      return onChange;
    },

    set onChange(fn: ((loc: Locale) => void) | undefined) {
      onChange = fn;
    },

    patch(loc, messages) {
      const early = checkDisposedAsync(disposed());

      if (early) return early;

      if (loaders.has(loc)) {
        return preload(loc).then(() => {
          if (disposed()) return;

          registerRaw(loc, flattenStrings(messages));
          known.add(loc);
          onChange?.(loc);
        });
      }

      registerRaw(loc, flattenStrings(messages));
      known.add(loc);
      onChange?.(loc);

      return Promise.resolve();
    },

    get pendingLoaders() {
      return loaders as ReadonlyMap<Locale, Loader<M>>;
    },

    preload,

    register(loc, source, nsStore) {
      checkDisposed(disposed());

      loadingTasks.delete(loc);
      known.add(loc);

      // Clear namespace loaded-markers for this locale so namespaces can be re-applied
      // after catalog replacement.
      const clearedNs = nsStore.clearLocale(loc);

      if (clearedNs.length > 0) {
        warn(
          `register('${loc}') cleared loaded namespace markers for: ${clearedNs.map((ns) => `'${ns}'`).join(', ')}. Call loadNamespace() again to reload.`,
        );
      }

      let loadPromise: Promise<void>;

      if (typeof source === 'function') {
        loaders.set(loc, source as Loader<M>);
        catalogs.delete(loc);
        loadPromise = preload(loc);
      } else {
        loaders.delete(loc);
        catalogs.delete(loc);
        registerRaw(loc, flattenStrings(source as M));
        loadPromise = Promise.resolve();
        onChange?.(loc);
      }

      return loadPromise;
    },

    resolve(loc) {
      return catalogs.get(loc);
    },

    seedFrom(entries, loaderMap) {
      for (const [loc, entry] of entries) {
        catalogs.set(loc, entry.clone());
        known.add(loc);
      }

      for (const [loc, loader] of loaderMap) {
        loaders.set(loc, loader);
        known.add(loc);
      }
    },
  };
}
