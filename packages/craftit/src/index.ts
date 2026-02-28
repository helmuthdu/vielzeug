/**
 * Craftit
 * Modern, lightweight web components with signals-based reactivity
 */

// ============================================
// Core - Component System & Reactivity
// ============================================

// Component definition
export { define, type SetupFunction, type SetupResult } from './core/define';

// Lifecycle hooks
export { onMount, onUnmount, onUpdated } from './core/lifecycle';

// Signals & Reactivity
export {
  signal,
  computed,
  readonly,
  effect,
  watch,
  watchMultiple,
  batch,
  untrack,
  shallowEqual,
  deepEqual,
  type Signal,
  type ComputedSignal,
  type Cleanup,
} from './core/signal';

// ============================================
// Template - HTML & JSX
// ============================================

// HTML template
export { html, renderTemplate, Fragment, type TemplateResult } from './template/html';

// Directives
export {
  type Directive,
  type WhenDirective,
  type EachDirective,
  type ShowDirective,
  type LogDirective,
  type PortalDirective,
} from './template/directives';

// ============================================
// Composables - Reusable Logic
// ============================================

// Element refs
export { ref, bindRef, isRef, type Ref } from './composables/ref';

// Props/Attributes
export { prop, propBoolean, propNumber, propJSON, type PropOptions } from './composables/props';

// Context (Provide/Inject)
export {
  createInjectionKey,
  provide,
  inject,
  hasInjection,
  getContext,
  maybeGetContext,
  setContext,
  onCleanup,
  runCleanups,
  type InjectionKey,
  type ComponentContext,
} from './composables/context';

// Form integration
export {
  useForm,
  useFormField,
  bindFormField,
  validators,
  type Form,
  type FormField,
  type FormFieldConfig,
  type FormFieldValue,
  type ValidationRule,
} from './composables/form';

// Styling
export { css } from './composables/style';

// ============================================
// Testing
// ============================================

// Test utilities (use with Vitest)
export {
  mount,
  createTestContext,
  type ComponentFixture,
} from './testing/render';


