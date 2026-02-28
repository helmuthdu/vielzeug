/**
 * Core - Component System & Reactivity
 * Exports for @vielzeug/craftit/core
 */

export { define, type SetupFunction, type SetupResult } from './define';
export {
  createErrorBoundary,
  type ErrorBoundaryOptions,
  type ErrorInfo,
  errorBoundary,
  setGlobalErrorHandler,
} from './error-boundary';
export { type LazyOptions, lazy } from './lazy';
export { onMount, onUnmount, onUpdated } from './lifecycle';
export {
  batch,
  type Cleanup,
  type ComputedSignal,
  computed,
  deepEqual,
  effect,
  readonly,
  type Signal,
  shallowEqual,
  signal,
  untrack,
  watch,
} from './signal';
export {
  type ComponentProps,
  type DeepReadonly,
  type EnsureSignal,
  isComputedSignal,
  isReactive,
  isSignal,
  type Merge,
  type Reactive,
  type SetupReturnType,
  type TemplateValue,
  type UnwrapComputed,
  type UnwrapNestedRefs,
  type UnwrapReactive,
  type UnwrapSignal,
  type UnwrapSignals,
} from './types';
