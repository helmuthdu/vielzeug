// Public API — all exports for /ripple
// Internal implementation files (tracking.ts, helpers.ts, scheduling.ts)
// are intentionally NOT exported to keep the surface stable.

export type {
  AsyncEffectCallback,
  AsyncSubscription,
  BatchOptions,
  CleanupFn,
  ComputedSignal,
  EffectCallback,
  EffectOptions,
  EffectScheduler,
  EqualityFn,
  PathValue,
  ReactiveOptions,
  ReadonlySignal,
  Scope,
  Signal,
  Store,
  Subscription,
  WatchOptions,
} from './types';

export { StateError } from './error';
export type { StateErrorCode } from './error';

// Core primitives
export { signal } from './signal';
export { computed } from './computed';
export { store } from './store';

// Effect system
export { batch } from './scheduling';
export { effect, effectAsync, onCleanup, scope } from './effect';

// Watch
export { watch } from './watch';

// Utilities
export { isComputed, isSignal, isStore, readonly, untrack } from './utilities';
