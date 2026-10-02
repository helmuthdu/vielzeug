import type { Readable } from '@vielzeug/ripple';
import { createMediaQuery } from '@vielzeug/sentinel';
import type { NavigateOptions, ResolvedQueryParams, RouteState } from '@vielzeug/wayfinder';
import { createRouteSignals } from '@vielzeug/wayfinder';
import { getCurrentScope, onMounted, onScopeDispose, type Ref, ref, type ShallowRef, shallowRef } from 'vue';
import { type RouteName, router } from './router';

/**
 * Mirrors a Ripple readable into a Vue shallow ref so templates can consume application state
 * without Vue components ever owning domain data. The subscription follows the component scope.
 */
export function useReadable<T>(source: Readable<T>): Readonly<ShallowRef<T>> {
  const state = shallowRef(source.peek());
  const unsubscribe = source.subscribe(() => {
    state.value = source.peek();
  });
  if (getCurrentScope()) onScopeDispose(unsubscribe);
  return state;
}

/**
 * Tracks a CSS media query as a Vue ref. Uses `@vielzeug/sentinel`'s `createMediaQuery` under the
 * hood. Evaluated on mount so server-less first renders and tests start from `false`; the
 * subscription and sentinel disposal follow the component scope.
 */
export function useMediaQuery(query: string): Readonly<Ref<boolean>> {
  const matches = ref(false);
  onMounted(() => {
    const sentinel = createMediaQuery(query);
    matches.value = sentinel.getSnapshot().matches;
    const unsubscribe = sentinel.subscribe(() => {
      matches.value = sentinel.getSnapshot().matches;
    });
    onScopeDispose(() => {
      unsubscribe();
      sentinel.dispose();
    });
  });
  return matches;
}

const routeSignals = createRouteSignals(router);

export const activeRouteName = routeSignals.name;
export const activeRouteParams = routeSignals.params;
export const activeRouteQuery = routeSignals.query;
export const routeSnapshot: Readable<RouteState> = routeSignals.state;

export const useRouteName = () => useReadable(activeRouteName);
export const useRouteParams = () => useReadable(activeRouteParams);
export const useRouteQuery = () => useReadable(activeRouteQuery);

export function navigate(
  name: RouteName,
  params?: Record<string, string>,
  query?: ResolvedQueryParams,
  options?: NavigateOptions,
): Promise<void> {
  return router.navigate({ name, params, query } as never, options);
}
