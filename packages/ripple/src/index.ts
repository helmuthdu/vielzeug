// Public API — all exports for @vielzeug/ripple
// Internal implementation files (tracking.ts, execution-context.ts, reactive-base.ts,
// scheduling.ts) are intentionally NOT exported to keep the surface stable.
// Sub-path-only exports, kept out of this core entry point so they tree-shake cleanly:
// - @vielzeug/ripple/history  — storeWithHistory, HistoryEntry, StoreWithHistory, RippleInvalidHistoryError
// - @vielzeug/ripple/devtools — installDevTools, debugEffect, getDevToolsHook, and hook types
// - @vielzeug/ripple/ssr      — Node-only tracking isolation helpers

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
  LensPath,
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
