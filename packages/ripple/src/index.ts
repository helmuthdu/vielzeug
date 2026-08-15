export type { AsyncState, Resource, ResourceOptions } from './_async';
export { createRipple, type Ripple } from './_default';
export type { WatchOptions } from './_watch';
export {
  RippleComputedCycleError,
  RippleDisposedRuntimeError,
  RippleDisposedScopeError,
  RippleError,
  RippleInfiniteLoopError,
} from './errors';
export { isReactive } from './runtime';
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

import { defaultRipple } from './_default';

export const signal = defaultRipple.signal;
export const computed = defaultRipple.computed;
export const effect = defaultRipple.effect;
export const batch = defaultRipple.batch;
export const createScope = defaultRipple.createScope;
export const untrack = defaultRipple.untrack;
export const watch = defaultRipple.watch;
export const resource = defaultRipple.resource;
