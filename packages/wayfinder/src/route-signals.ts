import { computed, fromSubscribable, type Readable } from '@vielzeug/ripple';

import type { Router } from './router';
import type { QueryParams, RouteName, RouteParams, RouteState, RouteTable } from './types';

/** Ripple readables mirroring a router's live location. */
export interface RouteSignals<TRoutes extends RouteTable = RouteTable> {
  /** Name of the deepest matched route; `null` while nothing matches (e.g. a not-found render). */
  readonly name: Readable<RouteName<TRoutes> | null>;
  /** Path params of the deepest matched route. */
  readonly params: Readable<RouteParams>;
  /** Raw parsed query params of the current location — always string values from URL parsing. */
  readonly query: Readable<QueryParams>;
  /** The full router state — subscribe or derive further computeds from it. */
  readonly state: Readable<RouteState>;
}

/**
 * Mirrors a router into ripple readables so templates and computeds react to navigation.
 *
 * `router.getSnapshot()` alone is NOT ripple-reactive: reading it inside a `computed()`
 * computes once and never re-runs, since it registers no tracked dependency. This bridge
 * wraps `subscribe()`/`getSnapshot()` with `fromSubscribable` once, for every consumer.
 */
export function createRouteSignals<TRoutes extends RouteTable>(router: Router<TRoutes>): RouteSignals<TRoutes> {
  const state = fromSubscribable<RouteState>({
    getSnapshot: () => router.getSnapshot(),
    subscribe: (listener) => router.subscribe(() => listener()),
  });

  return {
    name: computed(() => (state.value.matches.at(-1)?.name ?? null) as RouteName<TRoutes> | null),
    params: computed(() => state.value.matches.at(-1)?.params ?? {}),
    query: computed(() => state.value.location.query),
    state,
  };
}
