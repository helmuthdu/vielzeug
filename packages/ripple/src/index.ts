export type {
  Cleanup,
  ComputedOptions,
  Disposable,
  EffectHandle,
  EffectOptions,
  Equality,
  ReactiveErrorContext,
  ReactiveEvent,
  ReactiveObserver,
  Readable,
  RippleOptions,
  Scope,
  Signal,
  SignalOptions,
  Unsubscribe,
} from './types';

export { RippleComputedCycleError, RippleDisposedScopeError, RippleError, RippleInfiniteLoopError } from './errors';
export { isReactive } from './runtime';

export { createRipple, type Ripple } from './_default';

import { defaultRipple } from './_default';

// `resource`/`createStore`/`watch` are deliberately NOT re-exported here — they're reachable
// only through their dedicated subpaths (`./async`, `./store`, `./watch`), so there's exactly
// one canonical import path per primitive instead of two that resolve to the same binding.
export const signal = defaultRipple.signal;
export const computed = defaultRipple.computed;
export const effect = defaultRipple.effect;
export const batch = defaultRipple.batch;
export const createScope = defaultRipple.createScope;
export const untrack = defaultRipple.untrack;
