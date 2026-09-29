import type { NamedNavigationTarget, PathParams, RoutePathByName } from '@vielzeug/wayfinder';
import { activeRouteQuery, type RouteName, router, type routes } from '../core/router';

type VoyageRoutes = typeof routes;

export const routeHref = <N extends RouteName>(
  name: N,
  params?: PathParams<RoutePathByName<VoyageRoutes, N>>,
): string => router.href(name, params);

export const navigate = <N extends RouteName>(name: N, params?: PathParams<RoutePathByName<VoyageRoutes, N>>): void => {
  // Safe: `params` is derived from the same `N`; TS just can't correlate a generic name with its
  // params inside one object literal.
  void router.navigate({ name, params } as NamedNavigationTarget<VoyageRoutes>);
};

/** For route names that only exist at runtime (restored chat actions, nav-item handlers). */
export const navigateDynamic = (name: RouteName, params?: Record<string, string>): void => {
  void router.navigate({ name, params } as NamedNavigationTarget<VoyageRoutes>);
};

export const tripRoute = (): void => navigate('trip', { id: 'japan-october' });

export const queryValue = (key: string): string => {
  const value = activeRouteQuery.value[key];
  return typeof value === 'string' ? value : '';
};
