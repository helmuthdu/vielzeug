export const description = 'Web Worker pool abstraction with queuing, timeout, and more.';

export const loader = () => import('@vielzeug/familiar');

export const apiExports = ['createWorker', 'WorkerError'] as const;
