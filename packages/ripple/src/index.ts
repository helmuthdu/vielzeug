// Public API — all exports for @vielzeug/ripple
// Internal implementation files (tracking.ts, reactive-base.ts, scheduling.ts)
// are intentionally NOT exported to keep the surface stable.

export type {
  AsyncEffectCallback,
  AsyncSubscription,
  CleanupFn,
  Computed,
  ComputedOptions,
  DepInfo,
  EffectAsyncOptions,
  EffectCallback,
  EffectHandle,
  EffectOptions,
  EffectScheduler,
  EqualityFn,
  HistoryEntry,
  PathValue,
  Readable,
  ResourceOptions,
  ResourceState,
  Scope,
  Signal,
  SignalOptions,
  Store,
  StoreWithHistory,
  Subscription,
  WatchOptions,
} from './types';

export type { StateErrorCode } from './errors';
export { StateError } from './errors';

// Core primitives
export { computed } from './computed';
export { signal } from './signal';
export { store } from './store';

// Effect system
export { batch } from './scheduling';
export { effect, effectAsync, onCleanup, scope, watch } from './effect';

// Utilities
export { isComputed, isSignal, isStore, readonly, untrack } from './utilities';

// Async computed
export { asyncComputed as resource } from './async-computed';

// Store with history / time-travel
export { storeWithHistory } from './store-history';

// DevTools — read-only access from core; install via @vielzeug/ripple/devtools
export { getDevToolsHook } from './devtools-hook';
