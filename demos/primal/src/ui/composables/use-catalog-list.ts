import { type CursorSource, type CursorSourceState, createCursorSource } from '@vielzeug/sourcerer';
import { getCurrentScope, onScopeDispose, shallowRef } from 'vue';
import type { CatalogEntry, CatalogPort, CatalogSort } from '../../domain/catalog';

/** The online list's filter state: free text, one hunter, one element, one ranking. */
export interface CatalogListParams {
  elementId: 'all' | string;
  hunterId: 'all' | string;
  search: string;
  sort: CatalogSort;
}

/**
 * Bridges the catalog port into a cursor-paginated Vue view: filtering, ranking and paging
 * are the backend's (sourcerer owns direction and request races), the component scope owns
 * the source's lifecycle. Params changes restart from the first page.
 */
export function useCatalogList(port: CatalogPort, params: CatalogListParams, pageSize = 10) {
  const source: CursorSource<CatalogEntry, CatalogListParams> = createCursorSource({
    load: async ({ after, pageSize: limit, params: current }) => {
      const page = await port.list({
        cursor: after,
        elementId: current.elementId === 'all' ? undefined : current.elementId,
        hunterId: current.hunterId === 'all' ? undefined : current.hunterId,
        limit,
        search: current.search.trim() || undefined,
        sort: current.sort,
      });
      return {
        items: [...page.entries],
        nextCursor: page.cursor ?? undefined,
        previousCursor: page.previous ?? undefined,
        totalItems: page.totalItems,
      };
    },
    pageSize,
    params,
  });
  const state = shallowRef<CursorSourceState<CatalogEntry, CatalogListParams>>(source.state);

  const unsubscribe = source.subscribe(() => {
    state.value = source.state;
  });

  if (getCurrentScope()) {
    onScopeDispose(() => {
      unsubscribe();
      source.dispose();
    });
  }

  void source.reload().catch(() => undefined);

  return { source, state };
}
