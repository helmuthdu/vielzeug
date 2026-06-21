export const description = 'Publish/Subscribe event bus with async support.';

export const loader = () => import('@vielzeug/herald');

export const apiExports = ['createBus', 'BusDisposedError'] as const;
