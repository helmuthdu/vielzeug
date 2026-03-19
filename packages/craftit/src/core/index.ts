/** Core API for @vielzeug/craftit. */

// Signal primitives (re-exported from @vielzeug/stateit)
export * from '@vielzeug/stateit';

// Runtime lifecycle and reactive helpers
export { aria, effect, fire, handle, onCleanup, onError, onMount, watch } from './runtime';

// Base utilities
export { createFormIds, createId, escapeHtml, guard, toKebab } from './utils';

// Template and style primitives
export { css, type CSSResult } from './css';
export { html } from './template';

// Internal directive/building block types exposed as part of core
export {
  ref,
  refs,
  type Binding,
  type Directive,
  type HTMLResult,
  type Ref,
  type RefCallback,
  type Refs,
} from './internal';

// Component authoring API
export { createContext, inject, provide, syncContextProps, type InjectionKey } from './context';
export { type EmitFn } from './emitter';
export { defineField, type FormFieldCallbacks, type FormFieldHandle, type FormFieldOptions } from './form';
export {
  defineComponent,
  type BuildPropSchema,
  type DefineComponentOptions,
  type DefineComponentSetupContext,
} from './define';
export { prop, typed, type InferPropsSignals, type PropDef, type PropOptions } from './props';
export { reflect, type HostBindingValue, type ReflectConfig } from './reflect';
export { onSlotChange, type Slots } from './slots';
