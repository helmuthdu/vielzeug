import { computed } from '@vielzeug/ripple';
import { createHistoryForBase, createRouter, createRouteSignals, type RouteViewName } from '@vielzeug/wayfinder';

export type RouteName = RouteViewName<typeof routes>;

export const routes = {
  booking: { path: '/booking/:slug' },
  bookings: { path: '/bookings' },
  destination: { path: '/destinations/:slug' },
  explore: { path: '/explore' },
  hotel: { path: '/hotels/:slug' },
  profile: { path: '/profile' },
  root: { path: '/', redirect: { name: 'explore' } },
  search: { path: '/search' },
  settings: { path: '/settings' },
  trip: { path: '/trips/:id' },
  trips: { path: '/trips' },
} as const;

const base = import.meta.env.BASE_URL;

export const router = createRouter({ base, history: createHistoryForBase(base), routes });

const routeSignals = createRouteSignals(router);

// `root` always redirects, so the deepest match is never reported as 'root'.
export const activeRoute = computed(() => routeSignals.name.value as RouteName | null);
export const activeRouteParams = routeSignals.params;
export const activeRouteQuery = routeSignals.query;
