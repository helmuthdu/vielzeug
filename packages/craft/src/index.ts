export { type CraftErrorPhase, CraftError } from './errors';

export { define, prop } from './define';
export type { ComponentDefinition, SetupContextBag } from './component-types';
export type { InferProps, PropDef, PropInputDefs, PropsDef } from './props';

export { createContext, inject, injectStrict, type InjectionKey } from './context';

export { type ComponentSlots } from './slots';

export { type HostBindConfig, type HostBindFn, type HostBindingValue, type ReflectConfig } from './host-bind';

export { html } from './template';
export { each } from './directives/each';
export { classMap } from './directives/classMap';
export { live, type LiveSignal } from './directives/live';
export { model } from './directives/model';
export { styleMap } from './directives/styleMap';
export { when } from './directives/when';
export { raw, setRawSanitizer } from './directives/raw';

export { css, type CSSResult } from './utils/css';

export { useField } from './form-field';
export { createFormContext, FORM_CONTEXT_KEY, type FormController, type FormFieldContext } from './form-context';
export { syncAria, type AriaConfig } from './aria';
export { createId, createStableId, resetIdCounter } from './utils/id';

export {
  ref,
  type DirectiveResult,
  type HTMLResult,
  type Ref,
  type RefCallback,
  type SpreadObject,
} from './types/bindings';

export { intersectionObserver, mediaObserver, mutationObserver, resizeObserver } from './observers';
