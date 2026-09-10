import { createBrowserHistory, createHashHistory, createRouter } from '@vielzeug/wayfinder';

export type RouteName =
  | 'activity'
  | 'companies'
  | 'companyDetail'
  | 'contacts'
  | 'dashboard'
  | 'leads'
  | 'opportunities'
  | 'pipeline'
  | 'showcase';

const base = import.meta.env.BASE_URL;
const history = base === '/' ? createBrowserHistory() : createHashHistory({ base });

export const routeHref = (href: string): string => {
  if (base === '/') return href;

  const root = base.slice(0, -1);
  const route = href.startsWith(root) ? href.slice(root.length) || '/' : href;

  return `${base}#${route.startsWith('/') ? route : `/${route}`}`;
};

export const router = createRouter({
  base,
  history,
  routes: {
    activity: { path: '/activity' },
    companies: { path: '/companies' },
    companyDetail: { path: '/companies/:id' },
    contacts: { path: '/contacts' },
    dashboard: { path: '/' },
    leads: { path: '/leads' },
    opportunities: { path: '/opportunities' },
    pipeline: { path: '/pipeline' },
    showcase: { path: '/showcase' },
  },
});
