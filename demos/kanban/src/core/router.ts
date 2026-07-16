import { createBrowserHistory, createRouter } from '@vielzeug/wayfinder';

export type RouteNames = 'analytics' | 'backlog' | 'board' | 'settings';

const routes = {
  analytics: { path: '/analytics' },
  backlog: { path: '/backlog' },
  board: { path: '/board' },
  root: { path: '/', redirect: { name: 'board' } },
  settings: { path: '/settings' },
} as const;

export const router = createRouter({
  history: createBrowserHistory(),
  routes,
});
