// Internal — not part of the public API.
// Owns all locale → CatalogEntry state, loaders, and in-flight loading tasks.
//
// This store knows nothing about namespaces: cross-store coordination (clearing
// namespace markers on catalog replacement, patching namespace messages in after
// a load) is orchestrated by the i18n instance in `i18n.ts`, which owns both
// stores. Data flow reads top-to-bottom in one file instead of zig-zagging
// through a store-to-store parameter or a patch callback.

import { CatalogEntry, type Locale, type Messages, flattenStrings } from './_catalog';
import { devOnly, warn } from './_dev';
import { LinguaMissingLocaleError, checkDisposed, checkDisposedAsync } from './errors';

export type { Locale } from './_catalog';
export type Loader<M extends Messages = Messages> = () => Promise<M>;
export type LocaleSource<M extends Messages = Messages> = M | Loader<M>;

// Dev-only feedback for the same catalog-authoring mistakes `validateCatalog()` (the CI/build
// tool at `@vielzeug/lingua/validate`) already catches — most projects never wire that up, so
// this gives the same signal for free, in the console the author is already watching, the
// moment a full catalog becomes available: at `createI18n({ catalogs })` construction, via
// `register()`, or once an async loader resolves. Not run for `patch()` — a namespace overlay is
// expected to add only a handful of keys, not a complete plural set.
//
// Dynamic import, not a static one: `validate.ts`'s own docs promise it stays out of production
// bundles. A static `import { validateCatalog } from './validate'` here would pull it into every
// consumer's main bundle. The dynamic import keeps validate.ts a genuinely separate,
// lazily-fetched chunk, and the whole call site is compiled out of production dist via the
// `__LINGUA_PROD__` define baked into the build (see vite.config.ts) — no consumer bundler
// config required.
export function validateCatalogInDev(loc: Locale, messages: Messages): void {
  devOnly(() => {
    void import('./validate').then(({ validateCatalog }) => {
      for (const w of validateCatalog(messages, loc)) {
        warn(`catalog('${loc}'): missing plural form '${w.form}' for key '${w.key}'.`);
      }
    });
  });
}

export type CatalogStore<M extends Messages = Messages> = {
  dispose(): void;
  isLoaded(loc: Locale): boolean;
  isRegistered(loc: Locale): boolean;
  /** All registered locale keys in insertion order. */
  knownLocales(): readonly Locale[];
  /** Callback invoked whenever a catalog changes (drives bump/notify). */
  onChange: ((loc: Locale) => void) | undefined;
  /** Patch a locale catalog with additional flat messages (used by loadNamespace). */
  patch(loc: Locale, messages: Messages): Promise<void>;
  /** Pre-load a locale catalog without switching. */
  preload(loc: Locale): Promise<void>;
  /** Register (or replace) a locale's source. Returns a Promise that resolves when the catalog is loaded. */
  register(loc: Locale, source: LocaleSource<M>): Promise<void>;
  /**
   * Clear all state and seed with the given entries in one operation.
   * Used by `restoreState()` — explicit replacement, not dispose-then-revive.
   */
  reset(entries: ReadonlyMap<Locale, CatalogEntry>): void;
  /** Resolve a compiled CatalogEntry for a locale (undefined if not loaded). */
  resolve(loc: Locale): CatalogEntry | undefined;
  /**
   * Seed the store with pre-compiled entries from a parent fork.
   * Called during fork() — compiled templates are shared by reference.
   */
  seedFrom(entries: ReadonlyMap<Locale, CatalogEntry>, loaderMap: ReadonlyMap<Locale, Loader<M>>): void;
  /** Snapshot of the raw catalogs map — used for SSR serialization (`getState()`) and fork seeding. */
  snapshotCatalogs(): ReadonlyMap<Locale, CatalogEntry>;
  /** Snapshot of the pending (not-yet-resolved) loaders map — used for fork seeding. */
  snapshotLoaders(): ReadonlyMap<Locale, Loader<M>>;
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

  const seed = (entries: ReadonlyMap<Locale, CatalogEntry>, loaderMap: ReadonlyMap<Locale, Loader<M>>): void => {
    for (const [loc, entry] of entries) {
      catalogs.set(loc, entry);
      known.add(loc);
    }

    for (const [loc, loader] of loaderMap) {
      loaders.set(loc, loader);
      known.add(loc);
    }
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
        validateCatalogInDev(loc, messages);
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

    preload,

    register(loc, source) {
      checkDisposed(disposed());

      loadingTasks.delete(loc);
      known.add(loc);

      let loadPromise: Promise<void>;

      if (typeof source === 'function') {
        loaders.set(loc, source as Loader<M>);
        catalogs.delete(loc);
        loadPromise = preload(loc);
      } else {
        loaders.delete(loc);
        catalogs.delete(loc);
        registerRaw(loc, flattenStrings(source as M));
        validateCatalogInDev(loc, source as M);
        loadPromise = Promise.resolve();
        onChange?.(loc);
      }

      return loadPromise;
    },

    reset(entries) {
      catalogs.clear();
      loaders.clear();
      loadingTasks.clear();
      known.clear();
      seed(entries, new Map());
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

    snapshotCatalogs() {
      return catalogs as ReadonlyMap<Locale, CatalogEntry>;
    },

    snapshotLoaders() {
      return loaders as ReadonlyMap<Locale, Loader<M>>;
    },
  };
}
