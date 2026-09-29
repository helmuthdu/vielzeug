import { createHistoryForBase, createRouteSignals, createRouter } from '@vielzeug/wayfinder';

export type RouteNames =
  | 'admin'
  | 'cart'
  | 'catalog'
  | 'compare'
  | 'checkoutConfirmation'
  | 'checkoutPayment'
  | 'checkoutReview'
  | 'checkoutShipping'
  | 'modelConfigurator'
  | 'modelLanding'
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
  compare: { path: '/compare' },
  modelConfigurator: { path: '/models/:slug/configure' },
  modelLanding: { path: '/models/:slug' },
  orders: { path: '/orders' },
  root: { path: '/', redirect: { name: 'catalog' } },
  settings: { path: '/settings' },
} as const;

const base = import.meta.env.BASE_URL;

export const router = createRouter({ base, history: createHistoryForBase(base), routes });

const routeSignals = createRouteSignals(router);

export const activeRoute = routeSignals.name;
export const activeRouteParams = routeSignals.params;
export const activeRouteQuery = routeSignals.query;
