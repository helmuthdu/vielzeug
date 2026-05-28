// Public API — all exports for @vielzeug/stateit
// Internal implementation files (tracking.ts, helpers.ts, node.ts, scheduling.ts, config.ts)
// are intentionally NOT exported to keep the surface stable.

export type {
  AsyncEffectCallback,
  AsyncSubscription,
  CleanupFn,
  ComputedSignal,
  EffectCallback,
  EffectScheduler,
  EqualityFn,
  ReactiveOptions,
  ReadonlySignal,
  Scope,
  Signal,
  StateErrorCode,
  Store,
  Subscription,
  WatchOptions,
} from './types';

export { StateError } from './error';
export { configure } from './config';

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
export { isComputed, isSignal, isStore, memo, readonly, syncedSignal, tick, untrack } from './utilities';
