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
  watchMultiple,
} from './core/signal';

// ============================================
// Template - HTML & JSX
// ============================================

// Directives
export type {
  Directive,
  EachDirective,
  LogDirective,
  PortalDirective,
  ShowDirective,
  WhenDirective,
} from './template/directives';
// HTML template
export { Fragment, html, renderTemplate, type TemplateResult } from './template/html';

// ============================================
// Composables - Reusable Logic
// ============================================

// Context (Provide/Inject)
export {
  type ComponentContext,
  createInjectionKey,
  getContext,
  hasInjection,
  type InjectionKey,
  inject,
  maybeGetContext,
  onCleanup,
  provide,
  runCleanups,
  setContext,
} from './composables/context';
// Form integration
export {
  bindFormField,
  type Form,
  type FormField,
  type FormFieldConfig,
  type FormFieldValue,
  useForm,
  useFormField,
  type ValidationRule,
  validators,
} from './composables/form';
// Props/Attributes
export { type PropOptions, prop, propBoolean, propJSON, propNumber } from './composables/props';
// Element refs
export { bindRef, isRef, type Ref, ref } from './composables/ref';

// Styling
export { css } from './composables/style';

// ============================================
// Development Tools
// ============================================

// Debug utilities (dev mode only)
export { createDebugLogger, debug } from './dev/debug';

// ============================================
// Testing
// ============================================

// Complete testing toolkit
export {
  // Types
  type ComponentFixture,
  cleanup,
  // Helpers
  createMockComponent,
  createTestContext,
  // Events
  fireEvent,
  // Mounting
  mount,
  runInContext,
  userEvent,
  // Waiting utilities
  waitFor,
  waitForElement,
  waitForElementToBeRemoved,
  waitForRef,
  waitForSignal,
} from './testing/render';
