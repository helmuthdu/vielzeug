import { createHistoryForBase, createRouter } from '@vielzeug/wayfinder';

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
const history = createHistoryForBase(base);

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
