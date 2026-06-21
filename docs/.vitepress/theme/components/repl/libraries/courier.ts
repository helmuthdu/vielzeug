export const description = 'Advanced HTTP client with caching, retries, mutations, and more.';

export const loader = () => import('@vielzeug/courier');

export const apiExports = ['createApi', 'createQuery', 'createMutation', 'createCourier', 'HttpError'] as const;
