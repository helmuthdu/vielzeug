import type { RouteBranchDef, RouteRecord } from './types';

/**
 * HydrationOverride — lazy-resolved values for a single branch node.
 * Stored separately from the compiled RouteRecord so the record is never mutated.
 */
type HydrationOverride<TMeta, TComponent> = {
  component?: TComponent;
  dataFn?: RouteBranchDef['dataFn'];
  handler?: RouteBranchDef['handler'];
  meta?: TMeta;
};

type HydrationState<TMeta, TComponent> = {
  done: boolean;
  overrides: Map<number, HydrationOverride<TMeta, TComponent>>;
  work?: Promise<void>;
};

export type HydrationManager<TMeta = unknown, TComponent = unknown> = ReturnType<
  typeof createHydrationManager<TMeta, TComponent>
>;

export function createHydrationManager<TMeta = unknown, TComponent = unknown>() {
  const cache = new Map<RouteRecord, HydrationState<TMeta, TComponent>>();

  /**
   * Returns branchDefs merged with any lazy-resolved overrides.
   * Falls back to the original compiled defs when no overrides exist.
   */
  function effectiveDefs(record: RouteRecord<TMeta, TComponent>): readonly RouteBranchDef<TMeta, TComponent>[] {
    const state = cache.get(record);

    if (!state?.overrides.size) return record.branchDefs as readonly RouteBranchDef<TMeta, TComponent>[];

    return (record.branchDefs as readonly RouteBranchDef<TMeta, TComponent>[]).map((def, i) => {
      const override = state.overrides.get(i);

      return override ? { ...def, ...override } : def;
    });
  }

  /**
   * Resolves all lazy imports for the record.
   * All-or-nothing: overrides are committed only after every import succeeds.
   * On failure the cache entry is removed so the next navigation can retry.
   * Concurrent calls for the same record share the in-flight promise.
   */
  async function hydrate(record: RouteRecord<TMeta, TComponent>): Promise<void> {
    const hasLazy = record.branchDefs.some((d) => d.lazy != null);

    if (!hasLazy) return;

    let state = cache.get(record);

    if (state?.done) return;

    if (state?.work) {
      await state.work;

      return;
    }

    state = { done: false, overrides: new Map() };
    cache.set(record, state);

    const capturedState = state;

    type LazyMod = Awaited<ReturnType<NonNullable<RouteBranchDef<TMeta, TComponent>['lazy']>>>;

    const work = (async (): Promise<void> => {
      const lazyEntries = (record.branchDefs as readonly RouteBranchDef<TMeta, TComponent>[])
        .map((def, i) => ({ def, i }))
        .filter(({ def }) => def.lazy != null);

      const resolved: Array<{ index: number; mod: LazyMod }> = await Promise.all(
        lazyEntries.map(async ({ def, i }) => ({ index: i, mod: await def.lazy!() })),
      );

      for (const { index, mod } of resolved) {
        const override: HydrationOverride<TMeta, TComponent> = {};

        if (mod.handler !== undefined) override.handler = mod.handler;

        if (mod.data !== undefined) override.dataFn = mod.data;

        if (mod.component !== undefined) override.component = mod.component as TComponent;

        if (mod.meta !== undefined) override.meta = mod.meta as TMeta;

        capturedState.overrides.set(index, override);
      }

      capturedState.done = true;
      capturedState.work = undefined;
    })();

    state.work = work;

    try {
      await work;
    } catch (err) {
      cache.delete(record);
      throw err;
    }
  }

  return { effectiveDefs, hydrate };
}
