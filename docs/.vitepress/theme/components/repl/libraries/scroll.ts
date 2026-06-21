export const description = 'Virtual list engine for performant rendering of large datasets.';

export const loader = () => import('@vielzeug/scroll');

export const apiExports = ['createVirtualizer'] as const;
