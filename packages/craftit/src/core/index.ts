/**
 * Core - Component System & Reactivity
 * Exports for @vielzeug/craftit/core
 */

export { define, type SetupFunction, type SetupResult } from './define';
export {
  errorBoundary,
  createErrorBoundary,
  setGlobalErrorHandler,
  type ErrorBoundaryOptions,
  type ErrorInfo,
} from './error-boundary';
export { onMount, onUnmount, onUpdated } from './lifecycle';
export { lazy, preload, type LazyOptions } from './lazy';
export {
  signal,
  computed,
  readonly,
  effect,
  watch,
  batch,
  untrack,
  shallowEqual,
  deepEqual,
  type Signal,
  type ComputedSignal,
  type Cleanup,
} from './signal';
export {
  isSignal,
  isComputedSignal,
  isReactive,
  type UnwrapSignal,
  type UnwrapComputed,
  type UnwrapReactive,
  type UnwrapNestedRefs,
  type UnwrapSignals,
  type Reactive,
  type ComponentProps,
  type TemplateValue,
  type EnsureSignal,
  type SetupReturnType,
  type Merge,
  type RequiredKeys,
  type OptionalKeys,
  type KeysOfType,
  type DeepReadonly,
  type Mutable,
  type DeepMutable,
} from './types';





