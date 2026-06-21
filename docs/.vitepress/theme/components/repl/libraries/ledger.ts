export const description = 'Async undo/redo command stack with serialised queueing and Ripple reactive signals.';

export const loader = () => import('@vielzeug/ledger');

export const apiExports = ['createLedger', 'compose'] as const;
