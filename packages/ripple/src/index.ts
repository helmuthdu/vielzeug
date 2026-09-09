export type { AsyncState, Resource, ResourceOptions } from './_async';
export { createRipple, type Ripple } from './_default';
export type { BridgedReadable, FromSubscribableOptions } from './_subscribable';
export type { WatchOptions } from './_watch';
export {
  RippleComputedCycleError,
  RippleDisposedResourceError,
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
  Readable,
  RippleErrorContext,
  RippleErrorPolicy,
  RippleEvent,
  RippleOptions,
  Scope,
  Signal,
  SignalOptions,
  Subscribable,
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
export const fromSubscribable = defaultRipple.fromSubscribable;
