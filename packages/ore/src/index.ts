export { OreApiError, OreError, type OreErrorPhase, OreInternalError, OreLifecycleError } from './errors';

export { define, prop } from './define';
export type { ComponentDefinition } from './component-types';
export type { InferProps, PropDef, PropInputDefs, PropsDef } from './props';

export { createContext, inject, injectStrict, provide, type InjectionKey } from './context';

export { useSlots, type ComponentSlots } from './slots';

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

export { html } from './template/instantiator';
export { type HTMLResult, ref, type Ref, type RefCallback } from './template/result';

// Near-universal template directives — used in most non-trivial components (lists,
// conditionals, and class/style maps. Kept in the main entry alongside
// `html`/`define` rather than a separate sub-path: tree-shaking already means an unused export
// costs nothing in a bundled consumer, so splitting these off only adds an extra import line
// for functionality most components need on day one. `unsafeHtml()` and `live()` remain here
// too: their explicit names make their specialized behavior clear without a second import path.
export { classMap } from './directives/classMap';
export { each } from './directives/each';
export { live, type LiveBinding } from './directives/live';
export { styleMap } from './directives/styleMap';
export { unsafeHtml } from './directives/unsafe-html';
export { when } from './directives/when';

export { useField, type FormFieldHandle, type FormFieldOptions } from './forms/field';

export { intersectionObserver } from './observers/intersection-observe';
export { mediaObserver } from './observers/media-observe';
export { mutationObserver, type MutationObserverValue } from './observers/mutation-observe';
export { resizeObserver } from './observers/resize-observe';

export { css, type CSSResult } from './utils/css';

export { createId, createStableId, resetStableIdCounter } from './utils/id';
