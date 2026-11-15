import type { SandboxLibrary } from './buildSandboxDocument';
import { referencedPackages } from './rewriteImports';

export interface LibraryRecord {
  dependencies: string[];
  globalName: string;
  id: string;
  iifeSource: string;
}

/**
 * Expands a set of package ids to each one plus its transitive @vielzeug dependencies,
 * dependencies before dependents. Registry entries already list their dependencies in
 * dependency-first topological order (resolveLoadOrder in scripts/generate-repl-registry.ts),
 * so concatenating them and keeping first occurrences yields a valid load order.
 */
export function expandDependencyOrder(ids: Iterable<string>, registry: Record<string, LibraryRecord>): string[] {
  const order: string[] = [];
  const seen = new Set<string>();

  const add = (id: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    order.push(id);
  };

  for (const id of ids) {
    const entry = registry[id];
    if (!entry) continue;
    for (const dep of entry.dependencies) add(dep);
    add(id);
  }

  return order;
}

/**
 * Builds the sandbox's library set for one run: the selected library's dependency chain
 * plus the chain of every other `@vielzeug/*` package the code imports. The sandbox only
 * exposes a `window.<Global>` for bundles it inlines, so a cross-package example (a forge
 * snippet rendering refine elements) needs refine's bundle loaded too, even while the
 * refine tab isn't selected.
 *
 * Throws for a package that isn't in the registry (typo, or a package excluded from the
 * REPL): executeReplCode routes this into the REPL's output panel, which beats the
 * cryptic `Cannot destructure property ... of window.X as it is undefined` the import
 * rewriter would otherwise produce.
 */
export function createLibraryResolver(params: {
  registry: Record<string, LibraryRecord>;
  selectedId: string;
  /** Temporal polyfill source (tempo's IIFE expects a top-level `Temporal` global,
   * which browsers don't provide natively). Prepended when tempo is in the load order. */
  temporalPolyfill?: string;
}): (jsCode: string) => SandboxLibrary[] {
  const { registry, selectedId, temporalPolyfill } = params;

  return (jsCode: string) => {
    const referenced = referencedPackages(jsCode);
    const unknown = referenced.filter((id) => !registry[id]);
    if (unknown.length > 0) {
      throw new Error(
        `Unknown @vielzeug package${unknown.length > 1 ? 's' : ''} in code: ${unknown
          .map((id) => `@vielzeug/${id}`)
          .join(', ')}. The REPL only loads published browser packages.`,
      );
    }

    const ids = expandDependencyOrder([selectedId, ...referenced], registry);
    const libraries = ids.map((id) => ({ globalName: registry[id].globalName, iifeSource: registry[id].iifeSource }));

    if (temporalPolyfill && ids.includes('tempo')) {
      return [{ globalName: '__temporalPolyfill', iifeSource: temporalPolyfill }, ...libraries];
    }

    return libraries;
  };
}
