// Re-export all lifecycle and binding utilities
export {
  aria,
  effect,
  fire,
  handle,
  onCleanup,
  onError,
  onMount,
  watch,
  autoCleanup,
  currentRuntime,
  runtimeStack,
  type ComponentRuntime,
} from './runtime-lifecycle';
export {
  bindPropertyModel,
  hasWritableValueSetter,
  toReactiveBindingSource,
  type RegisterPropertyCleanup,
} from './runtime-bindings';
