export const description = 'Routing library with nested routes and middleware support.';

export const loader = () => import('@vielzeug/wayfinder');

export const apiExports = [
  'createRouter',
  'createBrowserHistory',
  'createMemoryHistory',
  'redirectTo',
  'Router',
] as const;
