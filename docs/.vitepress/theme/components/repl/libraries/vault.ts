export const description = 'Storage with schemas, TTL, and query building.';

export const loader = () => import('@vielzeug/vault');

export const apiExports = [
  'createLocalStorage',
  'createIndexedDB',
  'createMemory',
  'createSessionStorage',
  'table',
  'ttl',
] as const;
