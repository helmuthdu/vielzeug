import type { RouteParams } from '@vielzeug/wayfinder';

import { flux, toSignal } from '@vielzeug/flux';
import { computed } from '@vielzeug/ripple';
import { createBrowserHistory, createRouter } from '@vielzeug/wayfinder';

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

export const router = createRouter({
  history: createBrowserHistory(),
  routes,
});

// ── Reactive route (bridges wayfinder's subscribe() into a ripple signal via flux — the same
// fromSubscribe-style producer pattern used by core/i18n.ts) ─────────────────────────────────
// `router.getSnapshot()` alone is NOT ripple-reactive: reading it inside a `computed()` would
// compute once and never re-run, since it registers no tracked dependency.

function currentSnapshot() {
  return router.getSnapshot();
}

const routeBinding = toSignal(
  flux<ReturnType<typeof currentSnapshot>>((observer) => {
    observer.next(currentSnapshot());

    return router.subscribe((state) => observer.next(state));
  }),
  { initial: currentSnapshot() },
);

export const activeRoute = computed(() => routeBinding.value.matches.at(-1)?.name ?? null);

export const activeRouteParams = computed<RouteParams>(() => routeBinding.value.matches.at(-1)?.params ?? {});
