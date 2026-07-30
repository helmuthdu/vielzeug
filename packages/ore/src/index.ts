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
// conditionals, class/style maps, two-way form binding). Kept in the main entry alongside
// `html`/`define` rather than a separate sub-path: tree-shaking already means an unused export
// costs nothing in a bundled consumer, so splitting these off only adds an extra import line
// for functionality most components need on day one. Contrast with `@vielzeug/ore/directives`,
// which holds the genuinely niche/advanced pieces (`raw()` — security-sensitive HTML injection,
// `live()` — form-control-specific) plus the custom-directive authoring API.
export { classMap } from './directives/classMap';
export { each } from './directives/each';
export { model } from './directives/model';
export { styleMap } from './directives/styleMap';
export { when } from './directives/when';

export { css, type CSSResult } from './utils/css';

export { createId, createStableId, resetStableIdCounter } from './utils/id';
