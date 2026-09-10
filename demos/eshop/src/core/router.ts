import { computed, fromSubscribable } from '@vielzeug/ripple';
import type { RouteParams } from '@vielzeug/wayfinder';
import { createBrowserHistory, createHashHistory, createRouter } from '@vielzeug/wayfinder';

export type RouteNames =
  | 'admin'
  | 'cart'
  | 'catalog'
  | 'checkoutConfirmation'
  | 'checkoutPayment'
  | 'checkoutReview'
  | 'checkoutShipping'
  | 'modelDetail'
  | 'orders'
  | 'settings';

const routes = {
  admin: { path: '/admin' },
  cart: { path: '/cart' },
  catalog: { path: '/catalog' },
  checkoutConfirmation: { path: '/checkout/confirmation/:orderId' },
  checkoutPayment: { path: '/checkout/payment' },
  checkoutReview: { path: '/checkout/review' },
  checkoutShipping: { path: '/checkout/shipping' },
  modelDetail: { path: '/models/:slug' },
  orders: { path: '/orders' },
  root: { path: '/', redirect: { name: 'catalog' } },
  settings: { path: '/settings' },
} as const;

const base = import.meta.env.BASE_URL;
const history = base === '/' ? createBrowserHistory() : createHashHistory({ base });

export const router = createRouter({ base, history, routes });

// ── Reactive route (bridges wayfinder's subscribe()/getSnapshot() into a ripple signal via
// `fromSubscribable` — the same structural adapter pattern used by core/i18n.ts) ───────────────
// `router.getSnapshot()` alone is NOT ripple-reactive: reading it inside a `computed()` would
// compute once and never re-run, since it registers no tracked dependency.

const routeBinding = fromSubscribable<ReturnType<typeof router.getSnapshot>>({
  getSnapshot: () => router.getSnapshot(),
  subscribe: (listener) => router.subscribe(() => listener()),
});

export const activeRoute = computed(() => routeBinding.value.matches.at(-1)?.name ?? null);

export const activeRouteParams = computed<RouteParams>(() => routeBinding.value.matches.at(-1)?.params ?? {});

export const activeRouteQuery = computed(() => routeBinding.value.location.query);
