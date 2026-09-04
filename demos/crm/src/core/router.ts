import { createBrowserHistory, createRouter } from '@vielzeug/wayfinder';

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

export const router = createRouter({
  history: createBrowserHistory(),
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
