export {
  OreApiError,
  OreError,
  type OreErrorPhase,
  OreInternalError,
  OreLifecycleError,
  OreTimeoutError,
} from './errors';

export { define, prop } from './define';
export type { ComponentDefinition } from './component-types';
export type { InferProps, PropDef, PropInputDefs, PropsDef } from './props';

export { createContext, inject, injectStrict, provide, type InjectionKey } from './context';

export { useSlots, type ComponentSlots } from './slots';

export { aria, type AriaConfig } from './aria';

export {
  bind,
  type BindOptions,
  type HostBindConfig,
  type HostBindFn,
  type HostBindingValue,
  type ReflectConfig,
} from './host-bind';

// Lifecycle hooks — plain functions, called during setup() or a composable it invokes.
export {
  getHost,
  onCleanup,
  onElement,
  onEvent,
  onFormReset,
  type OnFormResetCallback,
  onMounted,
  type OnMountedCallback,
  watchEffect,
} from './runtime';

export { useEmit, type EmitFn } from './utils/emit';

export { html } from './template';

export { css, type CSSResult } from './utils/css';

export { createId, createStableId, resetIdCounter } from './utils/id';

export { ref, type DirectiveResult, type HTMLResult, type Ref, type RefCallback } from './types/bindings';
