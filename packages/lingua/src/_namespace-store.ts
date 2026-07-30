// Internal — not part of the public API.
// Owns namespace factory registry, per-locale loaded markers, and in-flight namespace tasks.
//
// This store knows nothing about catalogs: it loads namespace messages and returns
// them. Merging them into the catalog (and only then marking the namespace loaded)
// is orchestrated by the i18n instance in `i18n.ts`.

import type { Locale, Messages } from './_catalog';

import { LinguaNamespaceMissingError, checkDisposed, checkDisposedAsync } from './errors';

export type { Locale } from './_catalog';
export type NamespaceFactory<M extends Messages = Messages> = (locale: Locale) => Promise<M>;

export type NamespaceStore<M extends Messages = Messages> = {
  /**
   * Remove loaded-markers for a locale across all namespaces.
   * Called by the i18n instance when a catalog is replaced.
   * Returns the list of namespace names whose markers were cleared.
   */
  clearLocale(loc: Locale): string[];
  dispose(): void;
  /** Returns true if the namespace has been loaded for the given locale. */
  isLoaded(ns: string, loc: Locale): boolean;
  /**
   * Load a namespace's messages for the given locale. Deduplicates concurrent in-flight
   * calls only — repeat-load suppression lives in the i18n instance (its `isLoaded`
   * check before calling); calling this directly after a completed load re-runs the factory.
   * Does NOT mark the namespace loaded — call `markLoaded()` after the messages have
   * been merged into the catalog, so a failed merge can't leave a false marker.
   */
  load(ns: string, loc: Locale): Promise<Messages>;
  /** Mark the namespace as loaded for the given locale. */
  markLoaded(ns: string, loc: Locale): void;
  /** Register a namespace factory. Idempotent — re-registration updates the factory for future loads. */
  registerNamespace(ns: string, factory: NamespaceFactory<M>): void;
  /** Seed from a parent instance (fork). Copies loaded markers; registry is shared by reference. */
  seedFrom(parent: NamespaceStore<M>): void;
  /** Snapshot of loaded markers for fork() */
  snapshotLoaded(): ReadonlyMap<string, ReadonlySet<string>>;
  /** Snapshot of the registry for fork() */
  snapshotRegistry(): ReadonlyMap<string, NamespaceFactory<M>>;
};

export function createNamespaceStore<M extends Messages = Messages>(disposed: () => boolean): NamespaceStore<M> {
  const registry = new Map<string, NamespaceFactory<M>>();
  // Two-level: Map<namespace, Set<locale>>
  const loaded = new Map<string, Set<string>>();
  const tasks = new Map<string, Map<string, Promise<Messages>>>();

  return {
    clearLocale(loc) {
      const cleared: string[] = [];

      for (const [ns, localeSet] of loaded.entries()) {
        if (localeSet.delete(loc)) cleared.push(ns);
      }

      return cleared;
    },

    dispose() {
      registry.clear();
      loaded.clear();
      tasks.clear();
    },

    isLoaded(ns, loc) {
      return loaded.get(ns)?.has(loc) ?? false;
    },

    load(ns, loc) {
      const early = checkDisposedAsync(disposed());

      if (early) return early;

      const factory = registry.get(ns);

      if (!factory) {
        return Promise.reject(
          new LinguaNamespaceMissingError(`Namespace '${ns}' is not registered. Call registerNamespace() first.`),
        );
      }

      const existing = tasks.get(ns)?.get(loc);

      if (existing) return existing;

      const task = factory(loc).then(
        (messages) => {
          tasks.get(ns)?.delete(loc);

          return messages as Messages;
        },
        (err: unknown) => {
          tasks.get(ns)?.delete(loc);
          throw err;
        },
      );

      if (!tasks.has(ns)) tasks.set(ns, new Map());

      tasks.get(ns)!.set(loc, task);

      return task;
    },

    markLoaded(ns, loc) {
      let localeSet = loaded.get(ns);

      if (!localeSet) {
        localeSet = new Set();
        loaded.set(ns, localeSet);
      }

      localeSet.add(loc);
    },

    registerNamespace(ns, factory) {
      checkDisposed(disposed());
      registry.set(ns, factory);
    },

    seedFrom(parent) {
      for (const [ns, factory] of parent.snapshotRegistry()) {
        registry.set(ns, factory);
      }

      for (const [ns, localeSet] of parent.snapshotLoaded()) {
        loaded.set(ns, new Set(localeSet));
      }
    },

    snapshotLoaded() {
      return loaded as ReadonlyMap<string, ReadonlySet<string>>;
    },

    snapshotRegistry() {
      return registry as ReadonlyMap<string, NamespaceFactory<M>>;
    },
  };
}
