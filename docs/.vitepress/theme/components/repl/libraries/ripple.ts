export const description = 'Reactive state based on signals, with stores, derived state, and more.';

export const loader = () => import('@vielzeug/ripple');

export const apiExports = [
  'signal',
  'computed',
  'effect',
  'effectAsync',
  'watch',
  'batch',
  'untrack',
  'store',
  'readonly',
  'isSignal',
  'isComputed',
  'isStore',
  'onCleanup',
  'scope',
  'StateError',
] as const;
