export const description = 'Internationalization library with TypeScript support.';

export const loader = () => import('@vielzeug/lingua');

export const apiExports = ['createI18n'] as const;
