// Public API — all exports for @vielzeug/ripple
// Internal implementation files (tracking.ts, reactive-base.ts, scheduling.ts)
// are intentionally NOT exported to keep the surface stable.

export type {
  AsyncComputedOptions,
  AsyncComputedSignal,
  AsyncComputedState,
  AsyncEffectCallback,
  AsyncSubscription,
  BatchOptions,
  CleanupFn,
  ComputedSignal,
  EffectAsyncOptions,
  EffectCallback,
  EffectOptions,
  EffectScheduler,
  EqualityFn,
  PathValue,
  ReactiveOptions,
  ReadonlySignal,
  Scope,
  Signal,
  SignalOptions,
  Store,
  StoreWithHistory,
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
export { asyncScope, effect, effectAsync, onCleanup, scope } from './effect';

// Watch
export { watch } from './watch';

// Utilities
export { isComputed, isSignal, isStore, readonly, untrack } from './utilities';

// Async computed (F2)
export { asyncComputed } from './async-computed';

// Store with history / time-travel (F5)
export { storeWithHistory } from './store-history';

// DevTools (F3)
export { getDevToolsHook, getSignalName, installDevTools } from './devtools';
export type { RippleDevToolsHook } from './devtools';
