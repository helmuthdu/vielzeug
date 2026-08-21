export type { ComponentDefinition } from './component-types';
export { createContext, type InjectionKey, inject, injectStrict, provide } from './context';
export { define, prop } from './define';
// Near-universal template directives — used in most non-trivial components (lists,
// conditionals, and class/style maps. Kept in the main entry alongside
// `html`/`define` rather than a separate sub-path: tree-shaking already means an unused export
// costs nothing in a bundled consumer, so splitting these off only adds an extra import line
// for functionality most components need on day one. `unsafeHtml()` and `live()` remain here
// too: their explicit names make their specialized behavior clear without a second import path.
export { classMap } from './directives/classMap';
export { each } from './directives/each';
export { type LiveBinding, live } from './directives/live';
export { styleMap } from './directives/styleMap';
export { unsafeHtml } from './directives/unsafe-html';
export { when } from './directives/when';
export { OreApiError, OreError, type OreErrorPhase, OreInternalError, OreLifecycleError } from './errors';
export { type FormFieldHandle, type FormFieldOptions, useField } from './forms/field';
export {
  type BindOptions,
  bind,
  type HostBindConfig,
  type HostBindFn,
  type HostBindingValue,
  type ReflectConfig,
} from './host-bind';
export type { InferProps, PropDef, PropInputDefs, PropsDef } from './props';
// Lifecycle hooks — plain functions, called during setup() or a composable it invokes.
export {
  getHost,
  type OnFormResetCallback,
  type OnMountedCallback,
  onCleanup,
  onElement,
  onEvent,
  onFormReset,
  onMounted,
  watchEffect,
} from './runtime';
export { type ComponentSlots, useSlots } from './slots';
export { html } from './template/instantiator';
export { type HTMLResult, type Ref, type RefCallback, ref } from './template/result';
export { type CSSResult, css } from './utils/css';
export { type EmitFn, useEmit } from './utils/emit';

export { createId, createStableId, resetStableIdCounter } from './utils/id';
