/**
 * Craftit
 * Modern, lightweight web components with signals-based reactivity
 */

// ============================================
// Core - Component System & Reactivity
// ============================================

// Component definition
export { define, type SetupFunction, type SetupResult } from './core/define';

// Error boundaries
export {
  errorBoundary,
  createErrorBoundary,
  setGlobalErrorHandler,
  type ErrorBoundaryOptions,
  type ErrorInfo,
} from './core/error-boundary';

// Lazy loading
export { lazy, preload, type LazyOptions } from './core/lazy';

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
} from './core/signal';

// TypeScript utilities
export {
  isSignal,
  isComputedSignal,
  isReactive,
  type UnwrapSignal,
  type UnwrapComputed,
  type UnwrapReactive,
  type UnwrapNestedRefs,
  type UnwrapSignals,
  type Reactive,
  type ComponentProps,
  type TemplateValue,
  type EnsureSignal,
  type SetupReturnType,
  type Merge,
  type RequiredKeys,
  type OptionalKeys,
  type KeysOfType,
  type DeepReadonly,
  type Mutable,
  type DeepMutable,
} from './core/types';

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
// Note: html object includes helper methods: html.classes(), html.style(), html.when(), html.each(), etc.
export { html, renderTemplate, type TemplateResult } from './template/html';
// Security & Sanitization
export {
  sanitizeHTML,
  escapeHTML,
  trustHTML,
  isTrustedHTML,
  sanitizeURL,
  sanitizeAttribute,
  sanitizeCSS,
  safe,
  stripHTML,
  SecurityPolicy,
  setSecurityPolicy,
  getSecurityPolicy,
  processValue,
  type TrustedHTML,
  type SecurityPolicyConfig,
} from './template/sanitize';

// ============================================
// Composables - Reusable Logic
// ============================================

// Context (Provide/Inject)
export {
  type ComponentContext,
  getContext,
  type InjectionKey,
  inject,
  onCleanup,
  provide,
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
export { type PropOptions, prop } from './composables/props';
// Element refs
export { type Ref, ref } from './composables/ref';
// Slots
export {
  slot,
  defaultSlot,
  getSlottedContent,
  hasSlotContent,
  getAssignedNodes,
  slotWithFallback,
  createSlots,
  onSlotChange,
  type SlotContent,
  type SlotConfig,
} from './composables/slots';
// Styling (with CSP support)
export { css, createStyleElement, type CSSResult } from './composables/style';

// ============================================
// Development Tools
// ============================================

// Debug utilities (dev mode only)
export { createDebugLogger, debug } from './dev/debug';
// Hot Module Replacement
export {
  enableHMR,
  registerHMR,
  unregisterHMR,
  reloadComponent,
  withHMR,
  preserveData,
} from './dev/hmr';

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
