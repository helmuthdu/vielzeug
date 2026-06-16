// Public API — all exports for @vielzeug/ripple
// Internal implementation files (tracking.ts, reactive-base.ts, scheduling.ts)
// are intentionally NOT exported to keep the surface stable.

export type {
  AsyncComputedOptions,
  AsyncComputedSignal,
  AsyncEffectCallback,
  AsyncScopeSetup,
  AsyncSubscription,
  CleanupFn,
  ComputedOptions,
  ComputedSignal,
  EffectAsyncOptions,
  EffectCallback,
  EffectOptions,
  EffectScheduler,
  EqualityFn,
  PathValue,
  ReadonlySignal,
  Scope,
  Signal,
  SignalOptions,
  Store,
  StoreWithHistory,
  Subscription,
  WatchOptions,
} from './types';

export { StateError, StateErrorCode } from './error';

// Core primitives
export { computed } from './computed';
export { signal } from './signal';
export { store } from './store';

// Effect system
export { batch } from './scheduling';
export { asyncScope, effect, effectAsync, onCleanup, scope, watch, withScope } from './effect';

// Utilities
export { isComputed, isSignal, isStore, readonly, selector, untrack } from './utilities';

// Async computed
export { asyncComputed } from './async-computed';

// Store with history / time-travel
export { storeWithHistory } from './store-history';

// DevTools — read-only access from core; install via @vielzeug/ripple/devtools
export { getDevToolsHook } from './devtools-hook';
