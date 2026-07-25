// Public API — all exports for @vielzeug/ripple
// Internal implementation files (tracking.ts, execution-context.ts, reactive-base.ts,
// scheduling.ts) are intentionally NOT exported to keep the surface stable.
// Snapshot-based store history/undo-redo (storeWithHistory) lives at the
// @vielzeug/ripple/history sub-path — not part of this core entry point.

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
  PathValue,
  Readable,
  Resource,
  ResourceOptions,
  ResourceState,
  Scope,
  Signal,
  SignalOptions,
  Store,
  Subscription,
  WatchOptions,
} from './types';

export {
  RippleComputedCycleError,
  RippleDisposedScopeError,
  RippleEnvironmentError,
  RippleError,
  RippleInfiniteLoopError,
  RippleInvalidCleanupError,
  RippleInvalidStoreError,
} from './errors';

// Core primitives
export { computed } from './computed';
export { signal } from './signal';
export { store } from './store';

// Effect system
export { batch } from './scheduling';
export { effect, effectAsync, onCleanup, scope, watch } from './effect';

// Utilities
export { isComputed, isReactive, isSignal, isStore, readonly, untrack } from './utilities';

// Async computed
export { resource } from './async-computed';

// DevTools — read-only access from core; install via @vielzeug/ripple/devtools
export { getDevToolsHook } from './devtools-hook';
