import { computed, fromSubscribable } from '@vielzeug/ripple';
import type { RouteParams } from '@vielzeug/wayfinder';
import { createBrowserHistory, createHashHistory, createRouter } from '@vielzeug/wayfinder';

export type RouteName =
  | 'booking'
  | 'bookings'
  | 'destination'
  | 'explore'
  | 'hotel'
  | 'profile'
  | 'search'
  | 'settings'
  | 'trip'
  | 'trips';

const routes = {
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
const history = base === '/' ? createBrowserHistory() : createHashHistory({ base });

export const router = createRouter({ base, history, routes });
const routeBinding = fromSubscribable({
  getSnapshot: () => router.getSnapshot(),
  subscribe: (listener) => router.subscribe(() => listener()),
});
export const activeRoute = computed(() => routeBinding.value.matches.at(-1)?.name as RouteName | null);
export const activeRouteParams = computed<RouteParams>(() => routeBinding.value.matches.at(-1)?.params ?? {});
export const activeRouteQuery = computed(() => routeBinding.value.location.query);
